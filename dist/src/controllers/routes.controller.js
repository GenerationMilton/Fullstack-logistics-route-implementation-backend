"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutesController = void 0;
const zod_1 = require("zod");
const routes_dto_1 = require("../dtos/routes.dto");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const errors_1 = require("../utils/errors");
const readAccess = [auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleMiddleware)(["ADMIN", "OPERATOR"])];
const adminOnly = [auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleMiddleware)(["ADMIN"])];
class RoutesController {
    constructor(routeService) {
        this.routeService = routeService;
    }
    registerRoutes(app) {
        app.get("/api/v1/routes", { preHandler: readAccess }, async (request, reply) => {
            try {
                const query = routes_dto_1.listRoutesQuerySchema.parse(request.query);
                const result = await this.routeService.listRoutes(query);
                reply.status(200).send(result);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    throw new errors_1.ValidationError("Invalid query parameters", error.issues);
                }
                throw error;
            }
        });
        app.get("/api/v1/routes/active/track", { preHandler: readAccess }, async (_request, reply) => {
            const result = await this.routeService.getActiveRoutesWithTracking();
            reply.status(200).send(result);
        });
        app.get("/api/v1/routes/export", { preHandler: readAccess }, async (request, reply) => {
            try {
                const query = routes_dto_1.exportRoutesQuerySchema.parse(request.query);
                const csv = await this.routeService.exportRoutesCsv(query);
                reply
                    .header("Content-Disposition", 'attachment; filename="routes-export.csv"')
                    .type("text/csv; charset=utf-8")
                    .status(200)
                    .send(csv);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    throw new errors_1.ValidationError("Invalid query parameters", error.issues);
                }
                throw error;
            }
        });
        app.post("/api/v1/routes/import", { preHandler: adminOnly }, async (request, reply) => {
            const file = await request.file();
            if (!file) {
                throw new errors_1.ValidationError("CSV file is required (multipart field: file)");
            }
            const result = await this.routeService.importRoutesFromCsvStream(file.file);
            reply.status(200).send(result);
        });
        app.post("/api/v1/routes", { preHandler: adminOnly }, async (request, reply) => {
            try {
                const body = routes_dto_1.createRouteBodySchema.parse(request.body);
                const route = await this.routeService.createRoute(body);
                reply.status(201).send(route);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    throw new errors_1.ValidationError("Invalid request body", error.issues);
                }
                throw error;
            }
        });
        app.get("/api/v1/routes/:id", { preHandler: readAccess }, async (request, reply) => {
            try {
                const params = routes_dto_1.routeIdParamSchema.parse(request.params);
                const route = await this.routeService.getRouteById(params.id);
                reply.status(200).send(route);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    throw new errors_1.ValidationError("Invalid route id", error.issues);
                }
                throw error;
            }
        });
        app.put("/api/v1/routes/:id", { preHandler: adminOnly }, async (request, reply) => {
            try {
                const params = routes_dto_1.routeIdParamSchema.parse(request.params);
                const body = routes_dto_1.updateRouteBodySchema.parse(request.body);
                const route = await this.routeService.updateRoute(params.id, body);
                reply.status(200).send(route);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    throw new errors_1.ValidationError("Invalid request", error.issues);
                }
                throw error;
            }
        });
        app.patch("/api/v1/routes/:id/disable", { preHandler: adminOnly }, async (request, reply) => {
            try {
                const params = routes_dto_1.routeIdParamSchema.parse(request.params);
                const route = await this.routeService.disableRoute(params.id);
                reply.status(200).send(route);
            }
            catch (error) {
                if (error instanceof zod_1.ZodError) {
                    throw new errors_1.ValidationError("Invalid route id", error.issues);
                }
                throw error;
            }
        });
    }
}
exports.RoutesController = RoutesController;
