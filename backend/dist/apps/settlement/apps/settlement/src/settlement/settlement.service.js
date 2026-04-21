"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SettlementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const axios_1 = require("@nestjs/axios");
const prisma_1 = require("@sportsbook/prisma");
const rxjs_1 = require("rxjs");
let SettlementService = SettlementService_1 = class SettlementService {
    prisma;
    http;
    settlementQueue;
    logger = new common_1.Logger(SettlementService_1.name);
    MAX_ATTEMPTS = parseInt(process.env.MAX_SETTLEMENT_ATTEMPTS || '5');
    constructor(prisma, http, settlementQueue) {
        this.prisma = prisma;
        this.http = http;
        this.settlementQueue = settlementQueue;
    }
    async executeSettlement(settlementJobId) {
        const job = await this.prisma.settlementJob.findUnique({
            where: { id: settlementJobId },
            include: { ticket: true },
        });
        if (!job) {
            this.logger.error(`SettlementJob ${settlementJobId} not found`);
            return;
        }
        if (job.status === 'CONFIRMED') {
            this.logger.warn(`SettlementJob ${settlementJobId} already CONFIRMED, skipping`);
            return;
        }
        if (job.status === 'MANUAL_INTERVENTION') {
            this.logger.warn(`SettlementJob ${settlementJobId} in MANUAL_INTERVENTION, skipping`);
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
            this.logger.error(`SettlementJob ${settlementJobId} moved to MANUAL_INTERVENTION`);
            await this.broadcastTicketUpdate(job.ticketId, job.toWallet, 'SETTLEMENT_FAILED');
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
            this.logger.error(`DUPLICATE PAYOUT PREVENTED: idempotencyKey ${job.idempotencyKey}`);
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
            await this.settlementQueue.add('verify-settlement-tx', { settlementJobId, txHash, attempt: 1 }, { delay: 5000 });
        }
        catch (error) {
            this.logger.error(`Settlement tx failed for job ${settlementJobId}:`, error?.message);
            await this.prisma.settlementJob.update({
                where: { id: settlementJobId },
                data: { status: 'FAILED' },
            });
        }
    }
    async verifySettlementTx(params) {
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
            await this.settlementQueue.add('verify-settlement-tx', { settlementJobId, txHash, attempt: attempt + 1 }, { delay: 6000 });
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
        this.logger.log(`Settlement CONFIRMED: job ${settlementJobId}, tx ${txHash}`);
        await this.broadcastTicketUpdate(settlementJob.ticketId, settlementJob.toWallet, 'SETTLED');
    }
    async sendPayoutTransaction(params) {
        if (!process.env.CHAIN_RPC_URL ||
            process.env.CHAIN_RPC_URL === 'mock') {
            const fakeTxHash = `0x${params.idempotencyKey.substring(0, 62)}`;
            this.logger.log(`[MOCK] Payout tx: ${fakeTxHash} → ${params.toWallet} (${params.amount})`);
            return fakeTxHash;
        }
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(process.env.CHAIN_RPC_URL);
        const wallet = new ethers.Wallet(process.env.SETTLEMENT_WALLET_PRIVATE_KEY, provider);
        const data = `0x${Buffer.from(params.idempotencyKey).toString('hex')}`;
        const tx = await wallet.sendTransaction({
            to: params.toWallet,
            value: 0n,
            data,
        });
        return tx.hash;
    }
    async getTransactionReceipt(txHash) {
        if (!process.env.CHAIN_RPC_URL ||
            process.env.CHAIN_RPC_URL === 'mock') {
            return { status: 1, blockNumber: 99999 };
        }
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(process.env.CHAIN_RPC_URL);
        return provider.getTransactionReceipt(txHash);
    }
    async broadcastTicketUpdate(ticketId, userId, status) {
        try {
            await (0, rxjs_1.firstValueFrom)(this.http.post(`http://localhost:${process.env.PORT_SPORTSBOOK_API || 3000}/internal/broadcast-ticket`, { ticketId, userId, status }));
        }
        catch {
        }
    }
};
exports.SettlementService = SettlementService;
exports.SettlementService = SettlementService = SettlementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)('settlement')),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        axios_1.HttpService,
        bullmq_2.Queue])
], SettlementService);
//# sourceMappingURL=settlement.service.js.map