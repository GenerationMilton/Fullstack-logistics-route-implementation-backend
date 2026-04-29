"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSecurityPlugins = registerSecurityPlugins;
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const env_1 = require("../utils/env");
async function registerSecurityPlugins(app) {
    await app.register(helmet_1.default, {
        global: true,
        contentSecurityPolicy: false,
    });
    await app.register(cors_1.default, {
        origin: env_1.env.corsOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Authorization", "Content-Type", "x-correlation-id"],
    });
}
