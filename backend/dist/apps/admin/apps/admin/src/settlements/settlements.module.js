"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSettlementsModule = void 0;
const common_1 = require("@nestjs/common");
const settlements_service_js_1 = require("./settlements.service.js");
const settlements_controller_js_1 = require("./settlements.controller.js");
let AdminSettlementsModule = class AdminSettlementsModule {
};
exports.AdminSettlementsModule = AdminSettlementsModule;
exports.AdminSettlementsModule = AdminSettlementsModule = __decorate([
    (0, common_1.Module)({
        providers: [settlements_service_js_1.AdminSettlementsService],
        controllers: [settlements_controller_js_1.AdminSettlementsController],
    })
], AdminSettlementsModule);
//# sourceMappingURL=settlements.module.js.map