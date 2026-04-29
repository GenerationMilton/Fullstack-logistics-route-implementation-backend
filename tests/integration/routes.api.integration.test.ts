import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { prisma as prismaClient } from "../../src/db/prisma";
import { buildApp } from "../../src/app/build-app";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIntegration = hasDatabase ? describe : describe.skip;

function multipartCsv(csv: string): { payload: string; contentType: string } {
  const boundary = `----testboundary${Date.now()}`;
  const payload =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="routes.csv"\r\n` +
    `Content-Type: text/csv\r\n\r\n` +
    csv +
    `\r\n--${boundary}--\r\n`;
  return {
    payload,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describeIntegration("HTTP API (integration)", () => {
  let app: FastifyInstance;
  let token: string;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = prismaClient;
    await prisma.$connect();
    const built = await buildApp({ logger: false });
    app = built.app;
    await built.userRepository.bootstrapAdmin();

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        username: process.env.ADMIN_USERNAME ?? "admin",
        password: process.env.ADMIN_PASSWORD ?? "admin_password_change_me",
      },
    });
    expect(login.statusCode).toBe(200);
    const body = login.json() as { token: string };
    token = body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.route.deleteMany();
    await prisma.carrier.deleteMany();
  });

  it("GET /api/v1/routes returns 200 with auth", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/routes",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { total: number; data: unknown[] };
    expect(body.total).toBe(0);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/v1/dashboard/summary returns aggregated payload", async () => {
    const carrier = await prisma.carrier.create({
      data: { name: "DashCarrier" },
    });
    await prisma.route.createMany({
      data: [
        {
          originCity: "Bogotá",
          destinationCity: "Medellín",
          distanceKm: 10,
          estimatedTimeHours: 1,
          vehicleType: "CAMION",
          carrierId: carrier.id,
          costUsd: 100,
          status: "ACTIVA",
          createdAt: new Date("2024-01-05T00:00:00.000Z"),
          isDeleted: false,
        },
        {
          originCity: "Barranquilla",
          destinationCity: "Cartagena",
          distanceKm: 15,
          estimatedTimeHours: 2,
          vehicleType: "CAMION",
          carrierId: carrier.id,
          costUsd: 300,
          status: "SUSPENDIDA",
          createdAt: new Date("2024-01-10T00:00:00.000Z"),
          isDeleted: false,
        },
      ],
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/summary?from=2024-01-01T00:00:00.000Z&to=2024-01-31T23:59:59.000Z",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      range: { from: string; to: string };
      totalsByStatus: Array<{ status: string; count: number }>;
      topExpensiveRoutes: Array<{ id: number; costUsd: number }>;
      activeHeatmapByRegion: Array<{ region: string; count: number }>;
    };
    expect(body.range.from).toBe("2024-01-01T00:00:00.000Z");
    expect(body.totalsByStatus.some((s) => s.status === "ACTIVA")).toBe(true);
    expect(body.topExpensiveRoutes[0]?.costUsd).toBe(300);
    expect(body.activeHeatmapByRegion.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/dashboard/summary returns 400 on invalid range", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard/summary?from=2024-02-01T00:00:00.000Z&to=2024-01-01T00:00:00.000Z",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/v1/routes then GET by id and PATCH disable", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/routes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        originCity: "Bogotá",
        destinationCity: "Medellín",
        distanceKm: 100,
        estimatedTimeHours: 2,
        vehicleType: "CAMION",
        costUsd: 200,
        status: "ACTIVA",
        carrierName: "TCC",
      },
    });
    expect(create.statusCode).toBe(201);
    const created = create.json() as { id: number };
    expect(created.id).toBeGreaterThan(0);

    const getOne = await app.inject({
      method: "GET",
      url: `/api/v1/routes/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getOne.statusCode).toBe(200);

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/v1/routes/${created.id}/disable`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(patch.statusCode).toBe(200);
    const disabled = patch.json() as { isDeleted: boolean };
    expect(disabled.isDeleted).toBe(true);
  });

  it("GET /api/v1/routes/active/track returns tracking payload", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/routes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        originCity: "X",
        destinationCity: "Y",
        distanceKm: 50,
        estimatedTimeHours: 1,
        vehicleType: "CAMION",
        costUsd: 80,
        status: "ACTIVA",
        carrierName: "CarrierA",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/routes/active/track",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { routes: { tracking: Record<string, unknown> }[] };
    expect(body.routes.length).toBeGreaterThanOrEqual(1);
    expect(body.routes[0]?.tracking.progressPercent).toBeDefined();
  });

  it("POST /api/v1/routes/import accepts CSV multipart", async () => {
    const csv =
      "id,origin_city,destination_city,distance_km,estimated_time_hours,vehicle_type,carrier,cost_usd,status,created_at\n" +
      "1,Bogotá,Cali,200,4,CAMION,TCC,150.00,ACTIVA,2024-01-05T08:00:00Z\n";
    const { payload, contentType } = multipartCsv(csv);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/routes/import",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": contentType,
      },
      payload,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      totalRows: number;
      imported: number;
      failed: number;
    };
    expect(body.totalRows).toBe(1);
    expect(body.imported).toBe(1);
    expect(body.failed).toBe(0);
  });

  it("GET /api/v1/routes with cursor returns page null (keyset mode)", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/routes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        originCity: "O1",
        destinationCity: "D1",
        distanceKm: 10,
        estimatedTimeHours: 1,
        vehicleType: "CAMION",
        costUsd: 50,
        status: "ACTIVA",
        carrierName: "C1",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/routes?cursor=1&limit=5",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { page: number | null; data: unknown[] };
    expect(body.page).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
  });
});
