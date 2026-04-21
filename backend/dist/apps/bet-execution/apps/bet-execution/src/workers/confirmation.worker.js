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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ConfirmationWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationWorker = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const prisma_1 = require("@sportsbook/prisma");
const axios_1 = __importDefault(require("axios"));
const MAX_ATTEMPTS = 20;
const RETRY_DELAY_MS = 6000;
let ConfirmationWorker = ConfirmationWorker_1 = class ConfirmationWorker extends bullmq_1.WorkerHost {
    prisma;
    queue;
    logger = new common_1.Logger(ConfirmationWorker_1.name);
    constructor(prisma, queue) {
        super();
        this.prisma = prisma;
        this.queue = queue;
    }
    async process(job) {
        const { ticketId, txHash, userId, attempt } = job.data;
        try {
            const receipt = await this.getTransactionReceipt(txHash);
            if (!receipt) {
                if (attempt >= MAX_ATTEMPTS) {
                    await this.updateTicket(ticketId, 'REJECTED');
                    this.notify(ticketId, userId, 'REJECTED');
                    this.logger.warn(`Ticket ${ticketId} tx never confirmed after ${MAX_ATTEMPTS} attempts`);
                    return;
                }
                await this.queue.add('confirm-tx', { ticketId, txHash, userId, attempt: attempt + 1 }, { delay: RETRY_DELAY_MS });
                return;
            }
            if (receipt.status === 0) {
                await this.updateTicket(ticketId, 'REJECTED');
                this.notify(ticketId, userId, 'REJECTED');
                this.logger.warn(`Ticket ${ticketId} tx failed on-chain`);
                return;
            }
            await this.prisma.ticket.update({
                where: { id: ticketId },
                data: {
                    status: 'CONFIRMED',
                    blockNumber: receipt.blockNumber,
                    confirmedAt: new Date(),
                },
            });
            this.notify(ticketId, userId, 'CONFIRMED');
            this.logger.log(`Ticket ${ticketId} CONFIRMED at block ${receipt.blockNumber}`);
        }
        catch (error) {
            this.logger.error(`Error checking tx ${txHash}: ${error.message}`);
            if (attempt < MAX_ATTEMPTS) {
                await this.queue.add('confirm-tx', { ticketId, txHash, userId, attempt: attempt + 1 }, { delay: RETRY_DELAY_MS * 2 });
            }
        }
    }
    async updateTicket(ticketId, status) {
        await this.prisma.ticket.update({
            where: { id: ticketId },
            data: { status: status },
        });
    }
    notify(ticketId, userId, status) {
        const apiUrl = process.env.SPORTSBOOK_API_URL || 'http://127.0.0.1:3000';
        axios_1.default
            .post(`${apiUrl}/tickets/internal/notify`, { ticketId, userId, status })
            .catch((err) => this.logger.warn(`WS notify failed: ${err.message}`));
    }
    async getTransactionReceipt(txHash) {
        if (!process.env.CHAIN_RPC_URL || process.env.CHAIN_RPC_URL === 'mock') {
            return { status: 1, blockNumber: 12345 };
        }
        try {
            const { data } = await axios_1.default.post(process.env.CHAIN_RPC_URL, {
                jsonrpc: '2.0',
                method: 'eth_getTransactionReceipt',
                params: [txHash],
                id: 1,
            });
            const result = data?.result;
            if (!result)
                return null;
            return {
                status: parseInt(result.status, 16),
                blockNumber: parseInt(result.blockNumber, 16),
            };
        }
        catch {
            return null;
        }
    }
};
exports.ConfirmationWorker = ConfirmationWorker;
exports.ConfirmationWorker = ConfirmationWorker = ConfirmationWorker_1 = __decorate([
    (0, bullmq_1.Processor)('confirmation'),
    __param(1, (0, bullmq_1.InjectQueue)('confirmation')),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        bullmq_2.Queue])
], ConfirmationWorker);
//# sourceMappingURL=confirmation.worker.js.map