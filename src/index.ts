import Fastify from "fastify";
import { HealthController } from "./controllers/health.controller";
import { registerCorrelationIdMiddleware } from "./middlewares/correlation-id.middleware";
import { registerErrorHandler } from "./middlewares/error-handler.middleware";
import { HealthRepository } from "./repositories/health.repository";
import { HealthService } from "./services/health.service";
import { logger } from "./utils/logger";

const app = Fastify({
  logger,
});

registerCorrelationIdMiddleware(app);
registerErrorHandler(app);

const healthRepository = new HealthRepository();
const healthService = new HealthService(healthRepository);
const healthController = new HealthController(healthService);

healthController.registerRoutes(app);

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

async function start(): Promise<void> {
  try {
    await app.listen({ port, host });
    app.log.info(`Server running at http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
