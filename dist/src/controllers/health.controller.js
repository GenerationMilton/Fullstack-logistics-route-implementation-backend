"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const zod_1 = require("zod");
const health_dto_1 = require("../dtos/health.dto");
const errors_1 = require("../utils/errors");
class HealthController {
    constructor(healthService) {
        this.healthService = healthService;
    }
    registerRoutes(app) {
        app.get("/api/v1/health", async (request, reply) => {
            try {
                const query = health_dto_1.healthQuerySchema.parse(request.query);
                const result = this.healthService.getHealth(query.includeTimestamp);
                reply.status(200).send(result);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    throw new errors_1.ValidationError("Invalid query parameters", error.issues);
                }
                throw error;
            }
        });
    }
}
exports.HealthController = HealthController;
