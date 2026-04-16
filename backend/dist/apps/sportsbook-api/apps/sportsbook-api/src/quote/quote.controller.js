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
exports.QuoteController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const quote_service_1 = require("./quote.service");
const request_quote_dto_1 = require("./dto/request-quote.dto");
let QuoteController = class QuoteController {
    quoteService;
    constructor(quoteService) {
        this.quoteService = quoteService;
    }
    requestQuote(dto) {
        return this.quoteService.requestQuote(dto);
    }
};
exports.QuoteController = QuoteController;
__decorate([
    (0, common_1.Post)(),
    (0, throttler_1.Throttle)({ quote: { limit: 10, ttl: 60000 } }),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_quote_dto_1.RequestQuoteDto]),
    __metadata("design:returntype", void 0)
], QuoteController.prototype, "requestQuote", null);
exports.QuoteController = QuoteController = __decorate([
    (0, common_1.Controller)('quotes'),
    __metadata("design:paramtypes", [quote_service_1.QuoteService])
], QuoteController);
//# sourceMappingURL=quote.controller.js.map