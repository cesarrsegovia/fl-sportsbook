"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const grading_module_1 = require("./grading.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(grading_module_1.GradingModule);
    app.enableCors();
    await app.listen(process.env.PORT_GRADING ?? 3003);
}
bootstrap();
//# sourceMappingURL=main.js.map