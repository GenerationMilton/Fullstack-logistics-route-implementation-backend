export type UserRole = "ADMIN" | "OPERATOR";

export interface AuthUser {
  id: number;
  username: string;
  passwordHash: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
}
