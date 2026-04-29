import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import { createTrackingAdapter } from "../adapters/create-tracking-adapter";
import { AuthController } from "../controllers/auth.controller";
import { HealthController } from "../controllers/health.controller";
import { RoutesController } from "../controllers/routes.controller";
import { registerCorrelationIdMiddleware } from "../middlewares/correlation-id.middleware";
import { registerErrorHandler } from "../middlewares/error-handler.middleware";
import { HealthRepository } from "../repositories/health.repository";
import { RouteRepository } from "../repositories/route.repository";
import { UserRepository } from "../repositories/user.repository";
import { registerSecurityPlugins } from "../security/register-security-plugins";
import { AuthService } from "../services/auth.service";
import { HealthService } from "../services/health.service";
import { RouteService } from "../services/route.service";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

export type BuiltApp = {
  app: FastifyInstance;
  userRepository: UserRepository;
};

export async function buildApp(options?: {
  /** Pass `false` to silence logs in tests. */
  logger?: boolean;
}): Promise<BuiltApp> {
  const appOptions: FastifyServerOptions =
    options?.logger === false
      ? { logger: false }
      : { loggerInstance: logger };
  const app = Fastify(appOptions);

  registerCorrelationIdMiddleware(app);
  registerErrorHandler(app);

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

  const healthRepository = new HealthRepository();
  const healthService = new HealthService(healthRepository);
  const healthController = new HealthController(healthService);
  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository, app);
  const authController = new AuthController(authService);

  const routeRepository = new RouteRepository();
  const trackingAdapter = createTrackingAdapter();
  const routeService = new RouteService(routeRepository, trackingAdapter);
  const routesController = new RoutesController(routeService);

  healthController.registerRoutes(app);
  authController.registerRoutes(app);
  routesController.registerRoutes(app);

  return { app, userRepository };
}
