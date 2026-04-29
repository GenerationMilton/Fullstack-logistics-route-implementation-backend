"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const build_app_1 = require("./app/build-app");
const prisma_1 = require("./db/prisma");
const env_1 = require("./utils/env");
async function start() {
    try {
        const { app, userRepository } = await (0, build_app_1.buildApp)();
        await prisma_1.prisma.$connect();
        await userRepository.bootstrapAdmin();
        await app.listen({ port: env_1.env.PORT, host: env_1.env.HOST });
        app.log.info(`Server running at http://${env_1.env.HOST}:${env_1.env.PORT}`);
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
}
void start();
