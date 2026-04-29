import { FastifyReply, FastifyRequest } from "fastify";
import { UserRole } from "../types/auth";
import { AppError } from "../utils/errors";

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  await request.jwtVerify();
}

export function roleMiddleware(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      throw new AppError("Forbidden", 403);
    }
  };
}
