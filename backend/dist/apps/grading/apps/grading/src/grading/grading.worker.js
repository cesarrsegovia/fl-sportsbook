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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingWorker = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const grading_service_1 = require("./grading.service");
let GradingWorker = class GradingWorker extends bullmq_1.WorkerHost {
    gradingService;
    constructor(gradingService) {
        super();
        this.gradingService = gradingService;
    }
    async process(job) {
        if (job.name === 'grade-event') {
            const { eventId } = job.data;
            await this.gradingService.gradeEvent(eventId);
        }
    }
};
exports.GradingWorker = GradingWorker;
exports.GradingWorker = GradingWorker = __decorate([
    (0, bullmq_1.Processor)('grading'),
    __metadata("design:paramtypes", [grading_service_1.GradingService])
], GradingWorker);
//# sourceMappingURL=grading.worker.js.map