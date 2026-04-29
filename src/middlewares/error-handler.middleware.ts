import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../utils/errors";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    (error: FastifyError | AppError, _request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send({
          message: error.message,
          details: error.details,
        });
        return;
      }

      app.log.error(error);
      reply.status(500).send({
        message: "Internal server error",
      });
    },
  );
}
