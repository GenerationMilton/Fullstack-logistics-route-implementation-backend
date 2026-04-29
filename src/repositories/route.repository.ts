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

function buildWhereFromListQuery(
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

export class RouteRepository {
  public async list(
    query: ListRoutesQueryDto,
  ): Promise<{ data: RouteWithCarrier[]; total: number }> {
    const where = buildWhereFromListQuery(query);
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;
    const prismaField = SORT_FIELD_MAP[query.sort_by];
    const orderBy: Prisma.RouteOrderByWithRelationInput = {
      [prismaField]: query.sort_order,
    };

    const [data, total] = await prisma.$transaction([
      prisma.route.findMany({
        where,
        skip,
        take,
        orderBy,
        include: routeInclude,
      }),
      prisma.route.count({ where }),
    ]);

    return { data, total };
  }

  public async findManyForExport(
    query: ExportRoutesQueryDto,
    maxRows: number,
  ): Promise<RouteWithCarrier[]> {
    const where = buildWhereFromListQuery(query);
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
