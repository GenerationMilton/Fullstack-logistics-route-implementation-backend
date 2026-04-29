import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import { AuthController } from "./controllers/auth.controller";
import { HealthController } from "./controllers/health.controller";
import { registerCorrelationIdMiddleware } from "./middlewares/correlation-id.middleware";
import { registerErrorHandler } from "./middlewares/error-handler.middleware";
import { HealthRepository } from "./repositories/health.repository";
import { UserRepository } from "./repositories/user.repository";
import { registerSecurityPlugins } from "./security/register-security-plugins";
import { AuthService } from "./services/auth.service";
import { HealthService } from "./services/health.service";
import { env } from "./utils/env";
import { logger } from "./utils/logger";

const app = Fastify({
  logger,
});

registerCorrelationIdMiddleware(app);
registerErrorHandler(app);

const healthRepository = new HealthRepository();
const healthService = new HealthService(healthRepository);
const healthController = new HealthController(healthService);
const userRepository = new UserRepository();
const authService = new AuthService(userRepository, app);
const authController = new AuthController(authService);

const port = env.PORT;
const host = env.HOST;

async function start(): Promise<void> {
  try {
    await registerSecurityPlugins(app);

    await app.register(fastifyJwt, {
      secret: env.JWT_SECRET,
      sign: {
        expiresIn: env.JWT_EXPIRES_IN,
      },
    });

    await app.register(fastifyRateLimit, {
      global: false,
    });

    healthController.registerRoutes(app);
    authController.registerRoutes(app);

    await userRepository.bootstrapAdmin();
    await app.listen({ port, host });
    app.log.info(`Server running at http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
