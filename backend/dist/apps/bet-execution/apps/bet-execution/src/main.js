"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const bet_execution_module_1 = require("./bet-execution.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(bet_execution_module_1.BetExecutionModule);
    app.enableCors();
    await app.listen(process.env.PORT_BET_EXECUTION ?? 3002, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map