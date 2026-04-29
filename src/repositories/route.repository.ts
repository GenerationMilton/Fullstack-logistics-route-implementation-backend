import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import type { ExportRoutesQueryDto, ListRoutesQueryDto } from "../dtos/routes.dto";
import { normalizeStatus, normalizeVehicleType } from "../dtos/routes.dto";

const SORT_FIELD_MAP: Record<
  ListRoutesQueryDto["sort_by"],
  keyof Prisma.RouteOrderByWithRelationInput
> = {
  origin_city: "originCity",
  destination_city: "destinationCity",
  distance_km: "distanceKm",
  estimated_time_hours: "estimatedTimeHours",
  vehicle_type: "vehicleType",
  cost_usd: "costUsd",
  status: "status",
  created_at: "createdAt",
};

export function buildRouteFilterWhere(
  query: ListRoutesQueryDto | ExportRoutesQueryDto,
): Prisma.RouteWhereInput {
  const where: Prisma.RouteWhereInput = {
    isDeleted: false,
  };

  if (query.origin_city?.trim()) {
    where.originCity = {
      equals: query.origin_city.trim(),
      mode: "insensitive",
    };
  }

  if (query.destination_city?.trim()) {
    where.destinationCity = {
      equals: query.destination_city.trim(),
      mode: "insensitive",
    };
  }

  if (query.vehicle_type?.trim()) {
    where.vehicleType = normalizeVehicleType(query.vehicle_type.trim());
  }

  if (query.status?.trim()) {
    where.status = normalizeStatus(query.status.trim());
  }

  if (query.carrier_id !== undefined) {
    where.carrierId = query.carrier_id;
  }

  return where;
}

const routeInclude = { carrier: true } as const;

export type RouteWithCarrier = Prisma.RouteGetPayload<{
  include: typeof routeInclude;
}>;

export type DashboardStatusCountRow = {
  status: string;
  count: number;
};

export type DashboardExpensiveRouteRow = {
  id: number;
  originCity: string;
  destinationCity: string;
  costUsd: Prisma.Decimal;
};

export type DashboardActiveCityRow = {
  originCity: string;
};

export class RouteRepository {
  public async getTotalsByStatus(
    from: Date,
    to: Date,
  ): Promise<DashboardStatusCountRow[]> {
    const rows = await prisma.route.groupBy({
      by: ["status"],
      where: {
        isDeleted: false,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      _count: {
        _all: true,
      },
    });
    return rows.map((row) => ({
      status: row.status,
      count: row._count._all,
    }));
  }

  public async getTopExpensiveRoutes(
    from: Date,
    to: Date,
    limit = 5,
  ): Promise<DashboardExpensiveRouteRow[]> {
    return prisma.route.findMany({
      where: {
        isDeleted: false,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        originCity: true,
        destinationCity: true,
        costUsd: true,
      },
      orderBy: {
        costUsd: "desc",
      },
      take: limit,
    });
  }

  public async getActiveRouteCities(
    from: Date,
    to: Date,
  ): Promise<DashboardActiveCityRow[]> {
    return prisma.route.findMany({
      where: {
        isDeleted: false,
        status: "ACTIVA",
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        originCity: true,
      },
    });
  }

  public async list(query: ListRoutesQueryDto): Promise<{
    data: RouteWithCarrier[];
    total: number;
    nextCursor: number | null;
    hasMore: boolean;
  }> {
    const filterWhere = buildRouteFilterWhere(query);
    const total = await prisma.route.count({ where: filterWhere });

    if (query.cursor != null) {
      const where: Prisma.RouteWhereInput = {
        ...filterWhere,
        id: { gt: query.cursor },
      };
      const take = query.limit + 1;
      const rows = await prisma.route.findMany({
        where,
        take,
        orderBy: { id: "asc" },
        include: routeInclude,
      });
      const hasMore = rows.length > query.limit;
      const data = hasMore ? rows.slice(0, query.limit) : rows;
      const nextCursor =
        data.length > 0 ? data[data.length - 1]?.id ?? null : null;
      return { data, total, nextCursor, hasMore };
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;
    const prismaField = SORT_FIELD_MAP[query.sort_by];
    const orderBy: Prisma.RouteOrderByWithRelationInput = {
      [prismaField]: query.sort_order,
    };

    const data = await prisma.route.findMany({
      where: filterWhere,
      skip,
      take,
      orderBy,
      include: routeInclude,
    });

    const hasMore = skip + data.length < total;
    const nextCursor =
      hasMore && data.length > 0 ? data[data.length - 1]?.id ?? null : null;

    return { data, total, nextCursor, hasMore };
  }

  public async findManyForExport(
    query: ExportRoutesQueryDto,
    maxRows: number,
  ): Promise<RouteWithCarrier[]> {
    const where = buildRouteFilterWhere(query);
    const prismaField = SORT_FIELD_MAP[query.sort_by];
    const orderBy: Prisma.RouteOrderByWithRelationInput = {
      [prismaField]: query.sort_order,
    };

    return prisma.route.findMany({
      where,
      take: maxRows,
      orderBy,
      include: routeInclude,
    });
  }

  public async findById(id: number): Promise<RouteWithCarrier | null> {
    return prisma.route.findFirst({
      where: { id, isDeleted: false },
      include: routeInclude,
    });
  }

  public async findActiveRoutes(): Promise<RouteWithCarrier[]> {
    return prisma.route.findMany({
      where: {
        isDeleted: false,
        status: "ACTIVA",
      },
      include: routeInclude,
      orderBy: { id: "asc" },
    });
  }

  public async create(
    data: Prisma.RouteCreateInput,
  ): Promise<RouteWithCarrier> {
    return prisma.route.create({
      data,
      include: routeInclude,
    });
  }

  public async update(
    id: number,
    data: Prisma.RouteUpdateInput,
  ): Promise<RouteWithCarrier> {
    return prisma.route.update({
      where: { id },
      data,
      include: routeInclude,
    });
  }

  public async softDisable(id: number): Promise<RouteWithCarrier> {
    return prisma.route.update({
      where: { id },
      data: {
        isDeleted: true,
        disabledAt: new Date(),
      },
      include: routeInclude,
    });
  }

  public async upsertCarrierByName(name: string): Promise<{ id: number }> {
    return prisma.carrier.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true },
    });
  }

  public async createManyInTransaction(
    rows: Prisma.RouteUncheckedCreateInput[],
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.route.create({ data: row });
      }
    });
  }
}
