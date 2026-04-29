"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.roleMiddleware = roleMiddleware;
const errors_1 = require("../utils/errors");
async function authMiddleware(request, _reply) {
    await request.jwtVerify();
}
function roleMiddleware(allowedRoles) {
    return async (request, _reply) => {
        if (!request.user || !allowedRoles.includes(request.user.role)) {
            throw new errors_1.AppError("Forbidden", 403);
        }
    };
}
