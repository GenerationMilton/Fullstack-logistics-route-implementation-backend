import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";
import { env } from "../utils/env";

export async function registerSecurityPlugins(app: FastifyInstance): Promise<void> {
  await app.register(fastifyHelmet, {
    global: true,
    contentSecurityPolicy: false,
  });

  await app.register(fastifyCors, {
    origin: env.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "x-correlation-id"],
  });
}
