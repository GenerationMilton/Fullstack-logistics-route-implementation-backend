"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const errors_1 = require("../utils/errors");
class AuthService {
    constructor(userRepository, app) {
        this.userRepository = userRepository;
        this.app = app;
    }
    async login(credentials) {
        const user = await this.userRepository.findByUsername(credentials.username);
        if (!user) {
            throw new errors_1.AppError("Invalid credentials", 401);
        }
        const isPasswordValid = await bcrypt_1.default.compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new errors_1.AppError("Invalid credentials", 401);
        }
        const token = await this.app.jwt.sign({
            sub: user.username,
            role: user.role,
        });
        return { token };
    }
}
exports.AuthService = AuthService;
