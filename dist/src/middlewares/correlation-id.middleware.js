"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCorrelationIdMiddleware = registerCorrelationIdMiddleware;
const crypto_1 = require("crypto");
const CORRELATION_HEADER = "x-correlation-id";
function registerCorrelationIdMiddleware(app) {
    app.addHook("onRequest", async (request, reply) => {
        const correlationId = request.headers[CORRELATION_HEADER] ??
            (0, crypto_1.randomUUID)();
        request.headers[CORRELATION_HEADER] = correlationId;
        reply.header(CORRELATION_HEADER, correlationId);
    });
}
