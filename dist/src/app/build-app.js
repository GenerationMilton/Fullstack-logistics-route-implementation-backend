"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const jwt_1 = __importDefault(require("@fastify/jwt"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const fastify_1 = __importDefault(require("fastify"));
const create_tracking_adapter_1 = require("../adapters/create-tracking-adapter");
const auth_controller_1 = require("../controllers/auth.controller");
const health_controller_1 = require("../controllers/health.controller");
const routes_controller_1 = require("../controllers/routes.controller");
const correlation_id_middleware_1 = require("../middlewares/correlation-id.middleware");
const error_handler_middleware_1 = require("../middlewares/error-handler.middleware");
const health_repository_1 = require("../repositories/health.repository");
const route_repository_1 = require("../repositories/route.repository");
const user_repository_1 = require("../repositories/user.repository");
const register_security_plugins_1 = require("../security/register-security-plugins");
const auth_service_1 = require("../services/auth.service");
const health_service_1 = require("../services/health.service");
const route_service_1 = require("../services/route.service");
const env_1 = require("../utils/env");
const logger_1 = require("../utils/logger");
async function buildApp(options) {
    const appOptions = options?.logger === false
        ? { logger: false }
        : { loggerInstance: logger_1.logger };
    const app = (0, fastify_1.default)(appOptions);
    (0, correlation_id_middleware_1.registerCorrelationIdMiddleware)(app);
    (0, error_handler_middleware_1.registerErrorHandler)(app);
    await (0, register_security_plugins_1.registerSecurityPlugins)(app);
    await app.register(jwt_1.default, {
        secret: env_1.env.JWT_SECRET,
        sign: {
            expiresIn: env_1.env.JWT_EXPIRES_IN,
        },
    });
    await app.register(rate_limit_1.default, {
        global: false,
    });
    await app.register(multipart_1.default, {
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
    });
    const healthRepository = new health_repository_1.HealthRepository();
    const healthService = new health_service_1.HealthService(healthRepository);
    const healthController = new health_controller_1.HealthController(healthService);
    const userRepository = new user_repository_1.UserRepository();
    const authService = new auth_service_1.AuthService(userRepository, app);
    const authController = new auth_controller_1.AuthController(authService);
    const routeRepository = new route_repository_1.RouteRepository();
    const trackingAdapter = (0, create_tracking_adapter_1.createTrackingAdapter)();
    const routeService = new route_service_1.RouteService(routeRepository, trackingAdapter);
    const routesController = new routes_controller_1.RoutesController(routeService);
    healthController.registerRoutes(app);
    authController.registerRoutes(app);
    routesController.registerRoutes(app);
    return { app, userRepository };
}
