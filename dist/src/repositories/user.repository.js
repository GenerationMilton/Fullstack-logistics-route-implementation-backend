"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const env_1 = require("../utils/env");
class UserRepository {
    constructor() {
        this.usersByUsername = new Map();
    }
    async bootstrapAdmin() {
        const passwordHash = await bcrypt_1.default.hash(env_1.env.ADMIN_PASSWORD, env_1.env.BCRYPT_ROUNDS);
        const adminUser = {
            id: 1,
            username: env_1.env.ADMIN_USERNAME,
            passwordHash,
            role: "ADMIN",
        };
        this.usersByUsername.set(adminUser.username, adminUser);
    }
    async findByUsername(username) {
        return this.usersByUsername.get(username) ?? null;
    }
}
exports.UserRepository = UserRepository;
