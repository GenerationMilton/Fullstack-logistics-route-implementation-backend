"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerErrorHandler = registerErrorHandler;
const errors_1 = require("../utils/errors");
function registerErrorHandler(app) {
    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof errors_1.AppError) {
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
    });
}
