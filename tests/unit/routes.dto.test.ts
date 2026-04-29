import {
  createRouteBodySchema,
  listRoutesQuerySchema,
  normalizeStatus,
  normalizeVehicleType,
  parseCsvRow,
} from "../../src/dtos/routes.dto";

describe("normalizeVehicleType", () => {
  it("collapses spaces to underscores", () => {
    expect(normalizeVehicleType("MOTO CARGO")).toBe("MOTO_CARGO");
  });
});

describe("normalizeStatus", () => {
  it("trims and uppercases", () => {
    expect(normalizeStatus("  activa  ")).toBe("ACTIVA");
  });
});

describe("listRoutesQuerySchema", () => {
  it("applies defaults", () => {
    const q = listRoutesQuerySchema.parse({});
    expect(q.page).toBe(1);
    expect(q.limit).toBe(20);
    expect(q.sort_by).toBe("created_at");
    expect(q.sort_order).toBe("desc");
  });

  it("accepts optional cursor", () => {
    const q = listRoutesQuerySchema.parse({ cursor: "5", limit: "10" });
    expect(q.cursor).toBe(5);
    expect(q.limit).toBe(10);
  });
});

describe("createRouteBodySchema", () => {
  it("rejects when neither carrierId nor carrierName", () => {
    const result = createRouteBodySchema.safeParse({
      originCity: "A",
      destinationCity: "B",
      distanceKm: 1,
      estimatedTimeHours: 1,
      vehicleType: "CAMION",
      costUsd: 1,
      status: "ACTIVA",
    });
    expect(result.success).toBe(false);
  });

  it("accepts carrierName", () => {
    const result = createRouteBodySchema.safeParse({
      originCity: "A",
      destinationCity: "B",
      distanceKm: 1,
      estimatedTimeHours: 1,
      vehicleType: "CAMION",
      costUsd: 1,
      status: "ACTIVA",
      carrierName: "Acme",
    });
    expect(result.success).toBe(true);
  });
});

describe("parseCsvRow", () => {
  it("returns errors for invalid row", () => {
    const result = parseCsvRow({ origin_city: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("parses valid dataset-shaped row", () => {
    const result = parseCsvRow({
      origin_city: "Bogotá",
      destination_city: "Medellín",
      distance_km: "415.8",
      estimated_time_hours: "8.5",
      vehicle_type: "CAMION",
      carrier: "TCC",
      cost_usd: "320",
      status: "ACTIVA",
      created_at: "2024-01-05T08:00:00Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicle_type).toBe("CAMION");
      expect(result.data.created_at).toBeInstanceOf(Date);
    }
  });
});
