import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { loginBodySchema } from "../dtos/auth.dto";
import { authMiddleware, roleMiddleware } from "../middlewares/auth.middleware";
import { AuthService } from "../services/auth.service";
import { ValidationError } from "../utils/errors";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public registerRoutes(app: FastifyInstance): void {
    app.post(
      "/api/v1/auth/login",
      {
        config: {
          rateLimit: {
            max: 5,
            timeWindow: "1 minute",
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const body = loginBodySchema.parse(request.body);
          const result = await this.authService.login(body);
          reply.status(200).send(result);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new ValidationError("Invalid request body", error.issues);
          }
          throw error;
        }
      },
    );

    app.get(
      "/api/v1/auth/me",
      {
        preHandler: [authMiddleware, roleMiddleware(["ADMIN", "OPERATOR"])],
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        reply.status(200).send({
          user: request.user,
        });
      },
    );
  }
}
