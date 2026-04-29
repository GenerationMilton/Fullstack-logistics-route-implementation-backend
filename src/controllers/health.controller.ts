import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { healthQuerySchema } from "../dtos/health.dto";
import { HealthService } from "../services/health.service";
import { ValidationError } from "../utils/errors";

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  public registerRoutes(app: FastifyInstance): void {
    app.get(
      "/api/v1/health",
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const query = healthQuerySchema.parse(request.query);
          const result = this.healthService.getHealth(query.includeTimestamp);
          reply.status(200).send(result);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new ValidationError("Invalid query parameters", error.issues);
          }
          throw error;
        }
      },
    );
  }
}
