/**
 * @module ConfirmationWorker
 * @description Worker de BullMQ que verifica la confirmación on-chain de transacciones
 * de apuestas. Implementa un patrón de reintentos con backoff para esperar la
 * confirmación de la blockchain o rechazar tras agotar los intentos.
 */
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '@sportsbook/prisma';
import axios from 'axios';

/** Número máximo de intentos antes de rechazar el ticket */
const MAX_ATTEMPTS = 20;
/** Delay entre reintentos en milisegundos */
const RETRY_DELAY_MS = 6000;

/**
 * Worker que procesa jobs de confirmación de transacciones blockchain.
 *
 * Flujo de procesamiento:
 * 1. Consulta el recibo de la transacción vía JSON-RPC.
 * 2. Si no hay recibo y quedan intentos → re-encola con delay.
 * 3. Si no hay recibo y se agotaron intentos → marca como REJECTED.
 * 4. Si el recibo indica fallo (status: 0) → marca como REJECTED.
 * 5. Si el recibo indica éxito → marca como CONFIRMED con numero de bloque.
 *
 * En modo mock (`CHAIN_RPC_URL = 'mock'`), siempre retorna éxito.
 */
@Processor('confirmation')
export class ConfirmationWorker extends WorkerHost {
  private readonly logger = new Logger(ConfirmationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('confirmation') private readonly queue: Queue,
  ) {
    super();
  }

  /**
   * Procesa un job de confirmación de transacción.
   *
   * @param job - Job de BullMQ con datos del ticket y transacción
   * @param job.data.ticketId - ID del ticket a confirmar
   * @param job.data.txHash - Hash de la transacción a verificar
   * @param job.data.userId - ID del usuario propietario
   * @param job.data.attempt - Número de intento actual (1-indexed)
   */
  async process(
    job: Job<{
      ticketId: string;
      txHash: string;
      userId: string;
      attempt: number;
    }>,
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
        // Re-encolar con delay
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

      // Confirmado exitosamente
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

  /**
   * Actualiza el estado de un ticket en la base de datos.
   *
   * @param ticketId - ID del ticket a actualizar
   * @param status - Nuevo estado a asignar
   */
  private async updateTicket(ticketId: string, status: string) {
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: status as any },
    });
  }

  /**
   * Notifica al Sportsbook API sobre el cambio de estado del ticket
   * para broadcast vía WebSocket. Operación fire-and-forget.
   *
   * @param ticketId - ID del ticket
   * @param userId - ID del usuario
   * @param status - Nuevo estado
   */
  private notify(ticketId: string, userId: string, status: string) {
    const apiUrl = process.env.SPORTSBOOK_API_URL || 'http://127.0.0.1:3000';
    axios
      .post(`${apiUrl}/tickets/internal/notify`, { ticketId, userId, status })
      .catch((err) => this.logger.warn(`WS notify failed: ${err.message}`));
  }

  /**
   * Consulta el recibo de una transacción blockchain vía JSON-RPC
   * (`eth_getTransactionReceipt`).
   *
   * En modo mock, siempre retorna una confirmación exitosa en el bloque 12345.
   *
   * @param txHash - Hash de la transacción a consultar
   * @returns Recibo con status y blockNumber, o null si la transacción aún no se minó
   */
  private async getTransactionReceipt(txHash: string): Promise<{
    status: number;
    blockNumber: number;
  } | null> {
    if (!process.env.CHAIN_RPC_URL || process.env.CHAIN_RPC_URL === 'mock') {
      // Mock: siempre retorna éxito
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
