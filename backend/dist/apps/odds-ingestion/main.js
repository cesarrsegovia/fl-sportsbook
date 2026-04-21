"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const odds_ingestion_module_1 = require("./odds-ingestion.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(odds_ingestion_module_1.OddsIngestionModule);
    await app.listen(process.env.PORT_ODDS_INGESTION ?? 3001, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map