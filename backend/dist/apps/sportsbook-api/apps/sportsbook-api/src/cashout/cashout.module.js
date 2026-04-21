"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashoutModule = void 0;
const common_1 = require("@nestjs/common");
const cashout_service_1 = require("./cashout.service");
const cashout_controller_1 = require("./cashout.controller");
let CashoutModule = class CashoutModule {
};
exports.CashoutModule = CashoutModule;
exports.CashoutModule = CashoutModule = __decorate([
    (0, common_1.Module)({
        controllers: [cashout_controller_1.CashoutController],
        providers: [cashout_service_1.CashoutService],
        exports: [cashout_service_1.CashoutService],
    })
], CashoutModule);
//# sourceMappingURL=cashout.module.js.map