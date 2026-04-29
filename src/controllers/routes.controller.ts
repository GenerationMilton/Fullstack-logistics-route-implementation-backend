import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  createRouteBodySchema,
  exportRoutesQuerySchema,
  listRoutesQuerySchema,
  routeIdParamSchema,
  updateRouteBodySchema,
} from "../dtos/routes.dto";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.middleware";
import { RouteService } from "../services/route.service";
import { ValidationError } from "../utils/errors";

const readAccess = [authMiddleware, roleMiddleware(["ADMIN", "OPERATOR"])];
const adminOnly = [authMiddleware, roleMiddleware(["ADMIN"])];

export class RoutesController {
  constructor(private readonly routeService: RouteService) {}

  public registerRoutes(app: FastifyInstance): void {
    app.get(
      "/api/v1/routes",
      { preHandler: readAccess },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const query = listRoutesQuerySchema.parse(request.query);
          const result = await this.routeService.listRoutes(query);
          reply.status(200).send(result);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new ValidationError("Invalid query parameters", error.issues);
          }
          throw error;
        }
      },
    );

    app.get(
      "/api/v1/routes/active/track",
      { preHandler: readAccess },
      async (_request: FastifyRequest, reply: FastifyReply) => {
        const result = await this.routeService.getActiveRoutesWithTracking();
        reply.status(200).send(result);
      },
    );

    app.get(
      "/api/v1/routes/export",
      { preHandler: readAccess },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const query = exportRoutesQuerySchema.parse(request.query);
          const csv = await this.routeService.exportRoutesCsv(query);
          reply
            .header(
              "Content-Disposition",
              'attachment; filename="routes-export.csv"',
            )
            .type("text/csv; charset=utf-8")
            .status(200)
            .send(csv);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new ValidationError("Invalid query parameters", error.issues);
          }
          throw error;
        }
      },
    );

    app.post(
      "/api/v1/routes/import",
      { preHandler: adminOnly },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const file = await request.file();
        if (!file) {
          throw new ValidationError("CSV file is required (multipart field: file)");
        }
        const result = await this.routeService.importRoutesFromCsvStream(file.file);
        reply.status(200).send(result);
      },
    );

    app.post(
      "/api/v1/routes",
      { preHandler: adminOnly },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const body = createRouteBodySchema.parse(request.body);
          const route = await this.routeService.createRoute(body);
          reply.status(201).send(route);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new ValidationError("Invalid request body", error.issues);
          }
          throw error;
        }
      },
    );

    app.get(
      "/api/v1/routes/:id",
      { preHandler: readAccess },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const params = routeIdParamSchema.parse(request.params);
          const route = await this.routeService.getRouteById(params.id);
          reply.status(200).send(route);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new ValidationError("Invalid route id", error.issues);
          }
          throw error;
        }
      },
    );

    app.put(
      "/api/v1/routes/:id",
      { preHandler: adminOnly },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const params = routeIdParamSchema.parse(request.params);
          const body = updateRouteBodySchema.parse(request.body);
          const route = await this.routeService.updateRoute(params.id, body);
          reply.status(200).send(route);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new ValidationError("Invalid request", error.issues);
          }
          throw error;
        }
      },
    );

    app.patch(
      "/api/v1/routes/:id/disable",
      { preHandler: adminOnly },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const params = routeIdParamSchema.parse(request.params);
          const route = await this.routeService.disableRoute(params.id);
          reply.status(200).send(route);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new ValidationError("Invalid route id", error.issues);
          }
          throw error;
        }
      },
    );
  }
}
