"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
class HealthService {
    constructor(healthRepository) {
        this.healthRepository = healthRepository;
    }
    getHealth(includeTimestamp) {
        const baseHealth = this.healthRepository.getBaseHealth();
        if (!includeTimestamp) {
            return baseHealth;
        }
        return {
            ...baseHealth,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.HealthService = HealthService;
