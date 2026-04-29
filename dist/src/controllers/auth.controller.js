"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const zod_1 = require("zod");
const auth_dto_1 = require("../dtos/auth.dto");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const errors_1 = require("../utils/errors");
class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    registerRoutes(app) {
        app.post("/api/v1/auth/login", {
            config: {
                rateLimit: {
                    max: 5,
                    timeWindow: "1 minute",
                },
            },
        }, async (request, reply) => {
            try {
                const body = auth_dto_1.loginBodySchema.parse(request.body);
                const result = await this.authService.login(body);
                reply.status(200).send(result);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    throw new errors_1.ValidationError("Invalid request body", error.issues);
                }
                throw error;
            }
        });
        app.get("/api/v1/auth/me", {
            preHandler: [auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleMiddleware)(["ADMIN", "OPERATOR"])],
        }, async (request, reply) => {
            reply.status(200).send({
                user: request.user,
            });
        });
    }
}
exports.AuthController = AuthController;
