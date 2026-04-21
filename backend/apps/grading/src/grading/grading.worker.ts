/**
 * @module GradingWorker
 * @description Worker BullMQ que procesa jobs de calificación de eventos.
 *
 * Escucha la cola `grading` y delega el procesamiento al `GradingService`
 * cuando recibe un job de tipo `grade-event`.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GradingService } from './grading.service';

@Processor('grading')
export class GradingWorker extends WorkerHost {
  constructor(private readonly gradingService: GradingService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'grade-event') {
      const { eventId } = job.data as { eventId: string };
      await this.gradingService.gradeEvent(eventId);
    }
  }
}
