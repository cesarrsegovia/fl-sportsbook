import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@sportsbook/prisma';

@Injectable()
export class ResultWatcherService implements OnModuleInit {
  private readonly logger = new Logger(ResultWatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('grading') private readonly gradingQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.processUngradedFinishedMatches();
  }

  @Cron('*/30 * * * * *')
  async processUngradedFinishedMatches(): Promise<void> {
    const events = await this.prisma.sportsbookEvent.findMany({
      where: {
        status: 'FINISHED',
        match: { status: 'FINISHED' },
        markets: {
          some: {
            selections: {
              some: {
                OR: [
                  {
                    quotes: {
                      some: {
                        ticket: {
                          status: 'CONFIRMED',
                          gradingRecord: null,
                        },
                      },
                    },
                  },
                  {
                    parlayLegs: {
                      some: {
                        outcome: null,
                        ticket: { status: 'CONFIRMED' },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      select: { id: true },
    });

    for (const event of events) {
      await this.gradingQueue.add(
        'grade-event',
        { eventId: event.id },
        {
          jobId: `grade-${event.id}`,
          removeOnComplete: true,
        },
      );
    }

    if (events.length > 0) {
      this.logger.log(`Enqueued ${events.length} events for grading`);
    }
  }

  async handleMatchUpdate(matchData: {
    id: string;
    status: string;
  }): Promise<void> {
    if (matchData.status !== 'FINISHED') return;

    const event = await this.prisma.sportsbookEvent.findUnique({
      where: { matchId: matchData.id },
    });

    if (event) {
      await this.gradingQueue.add(
        'grade-event',
        { eventId: event.id },
        {
          jobId: `grade-${event.id}`,
          removeOnComplete: true,
        },
      );
    }
  }
}
