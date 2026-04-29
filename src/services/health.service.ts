import { HealthRecord, HealthRepository } from "../repositories/health.repository";

export class HealthService {
  constructor(private readonly healthRepository: HealthRepository) {}

  public getHealth(includeTimestamp: boolean): HealthRecord {
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
