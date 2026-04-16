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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTicketsController = void 0;
const common_1 = require("@nestjs/common");
const tickets_service_js_1 = require("./tickets.service.js");
let AdminTicketsController = class AdminTicketsController {
    ticketsService;
    constructor(ticketsService) {
        this.ticketsService = ticketsService;
    }
    async findAll(status, userId, league, dateFrom, dateTo, page, limit) {
        return this.ticketsService.findAll({
            status,
            userId,
            league,
            dateFrom,
            dateTo,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
    }
    async findOne(ticketId) {
        return this.ticketsService.findOne(ticketId);
    }
    async manualGrade(ticketId, body, req) {
        await this.ticketsService.manualGrade(ticketId, body.outcome, body.reason, req.user.username);
        return { success: true };
    }
    async voidTicket(ticketId, body, req) {
        return this.ticketsService.voidTicket(ticketId, body.reason, req.user.username);
    }
};
exports.AdminTicketsController = AdminTicketsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('userId')),
    __param(2, (0, common_1.Query)('league')),
    __param(3, (0, common_1.Query)('dateFrom')),
    __param(4, (0, common_1.Query)('dateTo')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminTicketsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':ticketId'),
    __param(0, (0, common_1.Param)('ticketId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminTicketsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':ticketId/grade'),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminTicketsController.prototype, "manualGrade", null);
__decorate([
    (0, common_1.Patch)(':ticketId/void'),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminTicketsController.prototype, "voidTicket", null);
exports.AdminTicketsController = AdminTicketsController = __decorate([
    (0, common_1.Controller)('admin/tickets'),
    __metadata("design:paramtypes", [tickets_service_js_1.AdminTicketsService])
], AdminTicketsController);
//# sourceMappingURL=tickets.controller.js.map