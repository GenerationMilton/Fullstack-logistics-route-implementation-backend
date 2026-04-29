"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthRepository = void 0;
class HealthRepository {
    getBaseHealth() {
        return {
            status: "ok",
            service: "backend-api",
        };
    }
}
exports.HealthRepository = HealthRepository;
