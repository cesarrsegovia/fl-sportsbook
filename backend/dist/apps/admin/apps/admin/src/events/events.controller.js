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
exports.AdminEventsController = void 0;
const common_1 = require("@nestjs/common");
const events_service_js_1 = require("./events.service.js");
let AdminEventsController = class AdminEventsController {
    eventsService;
    constructor(eventsService) {
        this.eventsService = eventsService;
    }
    async findAll(status, league, page, limit) {
        return this.eventsService.findAll({
            status,
            league,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
    }
    async suspendEvent(eventId, body, req) {
        return this.eventsService.suspendEvent(eventId, body.reason, req.user.username);
    }
    async reactivateEvent(eventId, body, req) {
        return this.eventsService.reactivateEvent(eventId, body.reason, req.user.username);
    }
    async suspendMarket(marketId, body, req) {
        return this.eventsService.suspendMarket(marketId, body.reason, req.user.username);
    }
    async reactivateMarket(marketId, body, req) {
        return this.eventsService.reactivateMarket(marketId, body.reason, req.user.username);
    }
    async setMarketOdds(marketId, body, req) {
        return this.eventsService.setMarketOdds(marketId, body.legs, body.reason, req.user.username);
    }
};
exports.AdminEventsController = AdminEventsController;
__decorate([
    (0, common_1.Get)('events'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('league')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)('events/:eventId/suspend'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEventsController.prototype, "suspendEvent", null);
__decorate([
    (0, common_1.Patch)('events/:eventId/reactivate'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEventsController.prototype, "reactivateEvent", null);
__decorate([
    (0, common_1.Patch)('markets/:marketId/suspend'),
    __param(0, (0, common_1.Param)('marketId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEventsController.prototype, "suspendMarket", null);
__decorate([
    (0, common_1.Patch)('markets/:marketId/reactivate'),
    __param(0, (0, common_1.Param)('marketId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEventsController.prototype, "reactivateMarket", null);
__decorate([
    (0, common_1.Patch)('markets/:marketId/odds'),
    __param(0, (0, common_1.Param)('marketId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEventsController.prototype, "setMarketOdds", null);
exports.AdminEventsController = AdminEventsController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [events_service_js_1.AdminEventsService])
], AdminEventsController);
//# sourceMappingURL=events.controller.js.map