import type { TrackingAdapter } from "../../src/adapters/tracking.adapter";
import type { ListRoutesQueryDto } from "../../src/dtos/routes.dto";
import { listRoutesQuerySchema } from "../../src/dtos/routes.dto";
import type { RouteWithCarrier } from "../../src/repositories/route.repository";
import { RouteService } from "../../src/services/route.service";

function makeRoute(overrides: Partial<RouteWithCarrier> = {}): RouteWithCarrier {
  return {
    id: 1,
    originCity: "A",
    destinationCity: "B",
    distanceKm: { toString: () => "10" } as never,
    estimatedTimeHours: { toString: () => "1" } as never,
    vehicleType: "CAMION",
    carrierId: 1,
    carrier: { id: 1, name: "C1" },
    costUsd: { toString: () => "100" } as never,
    status: "ACTIVA",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    disabledAt: null,
    isDeleted: false,
    ...overrides,
  };
}

describe("RouteService", () => {
  const tracking: TrackingAdapter = {
    trackRoute: jest.fn(),
  };

  it("listRoutes maps repository rows and offset pagination metadata", async () => {
    const route = makeRoute();
    const repo = {
      list: jest.fn().mockResolvedValue({
        data: [route],
        total: 1,
        nextCursor: null,
        hasMore: false,
      }),
    };

    const service = new RouteService(repo as never, tracking);
    const query = listRoutesQuerySchema.parse({ page: 1, limit: 20 });
    const result = await service.listRoutes(query);

    expect(repo.list).toHaveBeenCalledWith(query);
    expect(result.page).toBe(1);
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.data[0]?.originCity).toBe("A");
  });

  it("getRouteById throws when route missing", async () => {
    const repo = {
      list: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
    };
    const service = new RouteService(repo as never, tracking);
    await expect(service.getRouteById(999)).rejects.toThrow("Route not found");
  });

  it("getRouteById returns serialized route", async () => {
    const repo = {
      list: jest.fn(),
      findById: jest.fn().mockResolvedValue(makeRoute({ id: 5 })),
    };
    const service = new RouteService(repo as never, tracking);
    const result = await service.getRouteById(5);
    expect(result.id).toBe(5);
    expect(result.originCity).toBe("A");
  });

  it("listRoutes omits page when cursor mode", async () => {
    const repo = {
      list: jest.fn().mockResolvedValue({
        data: [makeRoute({ id: 2 })],
        total: 5,
        nextCursor: 2,
        hasMore: true,
      }),
    };
    const service = new RouteService(repo as never, tracking);
    const query = listRoutesQuerySchema.parse({
      cursor: 1,
      limit: 10,
    }) as ListRoutesQueryDto;
    const result = await service.listRoutes(query);
    expect(result.page).toBeNull();
    expect(result.nextCursor).toBe(2);
    expect(result.hasMore).toBe(true);
  });
});
