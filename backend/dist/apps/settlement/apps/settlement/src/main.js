"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const settlement_module_1 = require("./settlement.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(settlement_module_1.SettlementModule);
    await app.listen(process.env.PORT_SETTLEMENT ?? 3004);
}
bootstrap();
//# sourceMappingURL=main.js.map