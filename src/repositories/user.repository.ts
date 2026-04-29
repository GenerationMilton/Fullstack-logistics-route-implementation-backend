import bcrypt from "bcrypt";
import { env } from "../utils/env";
import { AuthUser } from "../types/auth";

export class UserRepository {
  private usersByUsername = new Map<string, AuthUser>();

  public async bootstrapAdmin(): Promise<void> {
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);

    const adminUser: AuthUser = {
      id: 1,
      username: env.ADMIN_USERNAME,
      passwordHash,
      role: "ADMIN",
    };

    this.usersByUsername.set(adminUser.username, adminUser);
  }

  public async findByUsername(username: string): Promise<AuthUser | null> {
    return this.usersByUsername.get(username) ?? null;
  }
}
