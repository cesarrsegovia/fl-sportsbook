"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const admin_module_js_1 = require("./admin.module.js");
async function bootstrap() {
    const app = await core_1.NestFactory.create(admin_module_js_1.AdminModule);
    app.enableCors({
        origin: [
            'http://localhost:5174',
            'http://127.0.0.1:5174',
            process.env.ADMIN_FRONTEND_URL,
        ].filter(Boolean),
    });
    const port = process.env.PORT_ADMIN ?? 3005;
    await app.listen(port, '0.0.0.0');
    console.log(`Admin app running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map