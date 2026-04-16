import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '@sportsbook/prisma';
import axios from 'axios';

const MAX_ATTEMPTS = 20;
const RETRY_DELAY_MS = 6000;

@Processor('confirmation')
export class ConfirmationWorker extends WorkerHost {
  private readonly logger = new Logger(ConfirmationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('confirmation') private readonly queue: Queue,
  ) {
    super();
  }

  async process(
    job: Job<{ ticketId: string; txHash: string; userId: string; attempt: number }>,
  ): Promise<void> {
    const { ticketId, txHash, userId, attempt } = job.data;

    try {
      const receipt = await this.getTransactionReceipt(txHash);

      if (!receipt) {
        if (attempt >= MAX_ATTEMPTS) {
          await this.updateTicket(ticketId, 'REJECTED');
          this.notify(ticketId, userId, 'REJECTED');
          this.logger.warn(
            `Ticket ${ticketId} tx never confirmed after ${MAX_ATTEMPTS} attempts`,
          );
          return;
        }
        // Re-queue
        await this.queue.add(
          'confirm-tx',
          { ticketId, txHash, userId, attempt: attempt + 1 },
          { delay: RETRY_DELAY_MS },
        );
        return;
      }

      if (receipt.status === 0) {
        await this.updateTicket(ticketId, 'REJECTED');
        this.notify(ticketId, userId, 'REJECTED');
        this.logger.warn(`Ticket ${ticketId} tx failed on-chain`);
        return;
      }

      // Confirmed
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'CONFIRMED',
          blockNumber: receipt.blockNumber,
          confirmedAt: new Date(),
        },
      });
      this.notify(ticketId, userId, 'CONFIRMED');
      this.logger.log(
        `Ticket ${ticketId} CONFIRMED at block ${receipt.blockNumber}`,
      );
    } catch (error) {
      this.logger.error(`Error checking tx ${txHash}: ${error.message}`);
      if (attempt < MAX_ATTEMPTS) {
        await this.queue.add(
          'confirm-tx',
          { ticketId, txHash, userId, attempt: attempt + 1 },
          { delay: RETRY_DELAY_MS * 2 },
        );
      }
    }
  }

  private async updateTicket(ticketId: string, status: string) {
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: status as any },
    });
  }

  private notify(ticketId: string, userId: string, status: string) {
    const apiUrl =
      process.env.SPORTSBOOK_API_URL || 'http://127.0.0.1:3000';
    axios
      .post(`${apiUrl}/tickets/internal/notify`, { ticketId, userId, status })
      .catch((err) =>
        this.logger.warn(`WS notify failed: ${err.message}`),
      );
  }

  private async getTransactionReceipt(txHash: string): Promise<{
    status: number;
    blockNumber: number;
  } | null> {
    if (!process.env.CHAIN_RPC_URL || process.env.CHAIN_RPC_URL === 'mock') {
      // Mock: always returns success
      return { status: 1, blockNumber: 12345 };
    }

    try {
      const { data } = await axios.post(process.env.CHAIN_RPC_URL, {
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      });

      const result = data?.result;
      if (!result) return null;

      return {
        status: parseInt(result.status, 16),
        blockNumber: parseInt(result.blockNumber, 16),
      };
    } catch {
      return null;
    }
  }
}
