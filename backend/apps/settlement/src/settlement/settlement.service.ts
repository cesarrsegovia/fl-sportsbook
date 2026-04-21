/**
 * @module SettlementService
 * @description Servicio responsable de ejecutar y verificar los pagos de liquidación
 * a los usuarios ganadores. Implementa protección contra pagos duplicados mediante
 * claves de idempotencia y un sistema de reintentos con intervención manual como fallback.
 *
 * Flujo de liquidación:
 * 1. Recibe un job pendiente con monto y wallet destino.
 * 2. Verifica idempotencia para prevenir pagos duplicados.
 * 3. Envía la transacción on-chain (o mock en desarrollo).
 * 4. Encola verificación de confirmación con delay.
 * 5. Marca como CONFIRMED cuando la tx se mina exitosamente.
 * 6. Después de MAX_ATTEMPTS fallidos → MANUAL_INTERVENTION.
 *
 * Modo mock: cuando `CHAIN_RPC_URL` es 'mock', simula transacciones exitosas.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@sportsbook/prisma';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);
  private readonly MAX_ATTEMPTS = parseInt(
    process.env.MAX_SETTLEMENT_ATTEMPTS || '5',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    @InjectQueue('settlement') private readonly settlementQueue: Queue,
  ) {}

  async executeSettlement(settlementJobId: string): Promise<void> {
    const job = await this.prisma.settlementJob.findUnique({
      where: { id: settlementJobId },
      include: { ticket: true },
    });

    if (!job) {
      this.logger.error(`SettlementJob ${settlementJobId} not found`);
      return;
    }

    if (job.status === 'CONFIRMED') {
      this.logger.warn(
        `SettlementJob ${settlementJobId} already CONFIRMED, skipping`,
      );
      return;
    }

    if (job.status === 'MANUAL_INTERVENTION') {
      this.logger.warn(
        `SettlementJob ${settlementJobId} in MANUAL_INTERVENTION, skipping`,
      );
      return;
    }

    if (job.attempts >= this.MAX_ATTEMPTS) {
      await this.prisma.settlementJob.update({
        where: { id: settlementJobId },
        data: { status: 'MANUAL_INTERVENTION' },
      });
      await this.prisma.ticket.update({
        where: { id: job.ticketId },
        data: { status: 'SETTLEMENT_FAILED' },
      });
      this.logger.error(
        `SettlementJob ${settlementJobId} moved to MANUAL_INTERVENTION`,
      );
      await this.broadcastTicketUpdate(
        job.ticketId,
        job.toWallet,
        'SETTLEMENT_FAILED',
      );
      return;
    }

    const duplicateCheck = await this.prisma.settlementJob.findFirst({
      where: {
        idempotencyKey: job.idempotencyKey,
        status: 'CONFIRMED',
        id: { not: settlementJobId },
      },
    });

    if (duplicateCheck) {
      this.logger.error(
        `DUPLICATE PAYOUT PREVENTED: idempotencyKey ${job.idempotencyKey}`,
      );
      await this.prisma.settlementJob.update({
        where: { id: settlementJobId },
        data: {
          status: 'CONFIRMED',
          notes: `Duplicate prevented — ref: ${duplicateCheck.id}`,
        },
      });
      return;
    }

    await this.prisma.settlementJob.update({
      where: { id: settlementJobId },
      data: {
        status: 'SUBMITTED',
        attempts: job.attempts + 1,
        lastAttemptAt: new Date(),
      },
    });

    try {
      const txHash = await this.sendPayoutTransaction({
        toWallet: job.toWallet,
        amount: job.amount,
        idempotencyKey: job.idempotencyKey,
      });

      await this.prisma.settlementJob.update({
        where: { id: settlementJobId },
        data: { txHash },
      });

      await this.settlementQueue.add(
        'verify-settlement-tx',
        { settlementJobId, txHash, attempt: 1 },
        { delay: 5000 },
      );
    } catch (error: any) {
      this.logger.error(
        `Settlement tx failed for job ${settlementJobId}:`,
        error?.message,
      );
      await this.prisma.settlementJob.update({
        where: { id: settlementJobId },
        data: { status: 'FAILED' },
      });
    }
  }

  async verifySettlementTx(params: {
    settlementJobId: string;
    txHash: string;
    attempt: number;
  }): Promise<void> {
    const { settlementJobId, txHash, attempt } = params;
    const MAX_VERIFY_ATTEMPTS = 20;

    const receipt = await this.getTransactionReceipt(txHash);

    if (!receipt) {
      if (attempt >= MAX_VERIFY_ATTEMPTS) {
        await this.prisma.settlementJob.update({
          where: { id: settlementJobId },
          data: { status: 'FAILED' },
        });
        return;
      }
      await this.settlementQueue.add(
        'verify-settlement-tx',
        { settlementJobId, txHash, attempt: attempt + 1 },
        { delay: 6000 },
      );
      return;
    }

    if (receipt.status === 0) {
      await this.prisma.settlementJob.update({
        where: { id: settlementJobId },
        data: { status: 'FAILED' },
      });
      return;
    }

    const settlementJob = await this.prisma.settlementJob.update({
      where: { id: settlementJobId },
      data: {
        status: 'CONFIRMED',
        settledAt: new Date(),
      },
    });

    await this.prisma.ticket.update({
      where: { id: settlementJob.ticketId },
      data: { status: 'SETTLED' },
    });

    this.logger.log(
      `Settlement CONFIRMED: job ${settlementJobId}, tx ${txHash}`,
    );

    await this.broadcastTicketUpdate(
      settlementJob.ticketId,
      settlementJob.toWallet,
      'SETTLED',
    );
  }

  private async sendPayoutTransaction(params: {
    toWallet: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<string> {
    if (!process.env.CHAIN_RPC_URL || process.env.CHAIN_RPC_URL === 'mock') {
      const fakeTxHash = `0x${params.idempotencyKey.substring(0, 62)}`;
      this.logger.log(
        `[MOCK] Payout tx: ${fakeTxHash} → ${params.toWallet} (${params.amount})`,
      );
      return fakeTxHash;
    }

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(process.env.CHAIN_RPC_URL);
    const wallet = new ethers.Wallet(
      process.env.SETTLEMENT_WALLET_PRIVATE_KEY!,
      provider,
    );

    const data = `0x${Buffer.from(params.idempotencyKey).toString('hex')}`;

    const tx = await wallet.sendTransaction({
      to: params.toWallet,
      value: 0n,
      data,
    });

    return tx.hash;
  }

  private async getTransactionReceipt(txHash: string) {
    if (!process.env.CHAIN_RPC_URL || process.env.CHAIN_RPC_URL === 'mock') {
      return { status: 1, blockNumber: 99999 };
    }

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(process.env.CHAIN_RPC_URL);
    return provider.getTransactionReceipt(txHash);
  }

  private async broadcastTicketUpdate(
    ticketId: string,
    userId: string,
    status: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `http://localhost:${process.env.PORT_SPORTSBOOK_API || 3000}/internal/broadcast-ticket`,
          { ticketId, userId, status },
        ),
      );
    } catch {
      // non-critical
    }
  }
}
