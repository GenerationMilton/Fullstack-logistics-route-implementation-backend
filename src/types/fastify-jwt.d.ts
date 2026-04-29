import "@fastify/jwt";
import { JwtPayload } from "./auth";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
