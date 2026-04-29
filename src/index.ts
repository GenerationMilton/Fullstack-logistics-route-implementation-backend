import "dotenv/config";
import { buildApp } from "./app/build-app";
import { prisma } from "./db/prisma";
import { env } from "./utils/env";

async function start(): Promise<void> {
  try {
    const { app, userRepository } = await buildApp();
    await prisma.$connect();
    await userRepository.bootstrapAdmin();
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server running at http://${env.HOST}:${env.PORT}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void start();
