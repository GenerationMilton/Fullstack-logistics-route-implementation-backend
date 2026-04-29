import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";

const CORRELATION_HEADER = "x-correlation-id";

export function registerCorrelationIdMiddleware(app: FastifyInstance): void {
  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const correlationId =
        (request.headers[CORRELATION_HEADER] as string | undefined) ??
        randomUUID();

      request.headers[CORRELATION_HEADER] = correlationId;
      reply.header(CORRELATION_HEADER, correlationId);
    },
  );
}
