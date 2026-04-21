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
exports.AdminPromotionsController = void 0;
const common_1 = require("@nestjs/common");
const promotions_service_js_1 = require("./promotions.service.js");
let AdminPromotionsController = class AdminPromotionsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async list(status) {
        return this.svc.list(status);
    }
    async redemptions(id) {
        return this.svc.getRedemptions(id);
    }
    async create(dto, req) {
        return this.svc.create(dto, req.user.username);
    }
    async pause(id, body, req) {
        return this.svc.pause(id, body.reason, req.user.username);
    }
    async activate(id, body, req) {
        return this.svc.activate(id, body.reason, req.user.username);
    }
};
exports.AdminPromotionsController = AdminPromotionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id/redemptions'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "redemptions", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/pause'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "pause", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "activate", null);
exports.AdminPromotionsController = AdminPromotionsController = __decorate([
    (0, common_1.Controller)('admin/promotions'),
    __metadata("design:paramtypes", [promotions_service_js_1.AdminPromotionsService])
], AdminPromotionsController);
//# sourceMappingURL=promotions.controller.js.map