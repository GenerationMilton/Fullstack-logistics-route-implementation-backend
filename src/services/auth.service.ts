import bcrypt from "bcrypt";
import { FastifyInstance } from "fastify";
import { LoginBodyDto } from "../dtos/auth.dto";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../utils/errors";

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly app: FastifyInstance,
  ) {}

  public async login(credentials: LoginBodyDto): Promise<{ token: string }> {
    const user = await this.userRepository.findByUsername(credentials.username);
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    const token = await this.app.jwt.sign({
      sub: user.username,
      role: user.role,
    });

    return { token };
  }
}
