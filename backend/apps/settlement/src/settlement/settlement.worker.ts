/**
 * @module SettlementWorker
 * @description Worker BullMQ que procesa jobs de liquidación de pagos.
 *
 * Escucha la cola `settlement` y procesa dos tipos de jobs:
 * - `execute-settlement`: Inicia la ejecución de un pago on-chain.
 * - `verify-settlement-tx`: Verifica la confirmación de una transacción de pago.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SettlementService } from './settlement.service';

@Processor('settlement')
export class SettlementWorker extends WorkerHost {
  constructor(private readonly settlementService: SettlementService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'execute-settlement') {
      const { settlementJobId } = job.data as { settlementJobId: string };
      await this.settlementService.executeSettlement(settlementJobId);
    }

    if (job.name === 'verify-settlement-tx') {
      const { settlementJobId, txHash, attempt } = job.data as {
        settlementJobId: string;
        txHash: string;
        attempt: number;
      };
      await this.settlementService.verifySettlementTx({
        settlementJobId,
        txHash,
        attempt,
      });
    }
  }
}
