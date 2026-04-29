import "dotenv/config";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { MockTrackingAdapter } from "./adapters/mock-tracking.adapter";
import { AuthController } from "./controllers/auth.controller";
import { HealthController } from "./controllers/health.controller";
import { RoutesController } from "./controllers/routes.controller";
import { prisma } from "./db/prisma";
import { registerCorrelationIdMiddleware } from "./middlewares/correlation-id.middleware";
import { registerErrorHandler } from "./middlewares/error-handler.middleware";
import { HealthRepository } from "./repositories/health.repository";
import { RouteRepository } from "./repositories/route.repository";
import { UserRepository } from "./repositories/user.repository";
import { registerSecurityPlugins } from "./security/register-security-plugins";
import { AuthService } from "./services/auth.service";
import { HealthService } from "./services/health.service";
import { RouteService } from "./services/route.service";
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

const routeRepository = new RouteRepository();
const trackingAdapter = new MockTrackingAdapter();
const routeService = new RouteService(routeRepository, trackingAdapter);
const routesController = new RoutesController(routeService);

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

    await app.register(fastifyMultipart, {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    });

    await prisma.$connect();

    healthController.registerRoutes(app);
    authController.registerRoutes(app);
    routesController.registerRoutes(app);

    await userRepository.bootstrapAdmin();
    await app.listen({ port, host });
    app.log.info(`Server running at http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
