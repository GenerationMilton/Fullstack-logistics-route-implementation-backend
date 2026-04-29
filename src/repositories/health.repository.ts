export interface HealthRecord {
  status: "ok";
  service: string;
  timestamp?: string;
}

export class HealthRepository {
  public getBaseHealth(): Omit<HealthRecord, "timestamp"> {
    return {
      status: "ok",
      service: "backend-api",
    };
  }
}
