import { Prisma } from "@prisma/client";
import { parse } from "csv-parse";
import type { Readable } from "node:stream";
import type { TrackingAdapter } from "../adapters/tracking.adapter";
import { prisma } from "../db/prisma";
import type {
  CreateRouteBodyDto,
  ExportRoutesQueryDto,
  ListRoutesQueryDto,
  UpdateRouteBodyDto,
} from "../dtos/routes.dto";
import { parseCsvRow } from "../dtos/routes.dto";
import type { RouteWithCarrier } from "../repositories/route.repository";
import { RouteRepository } from "../repositories/route.repository";
import { AppError } from "../utils/errors";

const IMPORT_BATCH_SIZE = 50;
const EXPORT_MAX_ROWS = 50_000;

function serializeRoute(route: RouteWithCarrier) {
  return {
    id: route.id,
    originCity: route.originCity,
    destinationCity: route.destinationCity,
    distanceKm: Number(route.distanceKm),
    estimatedTimeHours: Number(route.estimatedTimeHours),
    vehicleType: route.vehicleType,
    carrierId: route.carrierId,
    carrier: route.carrier
      ? { id: route.carrier.id, name: route.carrier.name }
      : null,
    costUsd: Number(route.costUsd),
    status: route.status,
    createdAt: route.createdAt.toISOString(),
    disabledAt: route.disabledAt?.toISOString() ?? null,
    isDeleted: route.isDeleted,
  };
}

function escapeCsvCell(value: string | number): string {
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function handlePrismaNotFound(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    throw new AppError("Route not found", 404);
  }
  throw error;
}

export class RouteService {
  constructor(
    private readonly routeRepository: RouteRepository,
    private readonly trackingAdapter: TrackingAdapter,
  ) {}

  public async listRoutes(query: ListRoutesQueryDto) {
    const { data, total } = await this.routeRepository.list(query);
    return {
      total,
      page: query.page,
      limit: query.limit,
      data: data.map(serializeRoute),
    };
  }

  public async getRouteById(id: number) {
    const route = await this.routeRepository.findById(id);
    if (!route) {
      throw new AppError("Route not found", 404);
    }
    return serializeRoute(route);
  }

  public async createRoute(body: CreateRouteBodyDto) {
    const carrierId = await this.resolveCarrier(body.carrierId, body.carrierName);
    try {
      const route = await this.routeRepository.create({
        originCity: body.originCity,
        destinationCity: body.destinationCity,
        distanceKm: body.distanceKm,
        estimatedTimeHours: body.estimatedTimeHours,
        vehicleType: body.vehicleType,
        costUsd: body.costUsd,
        status: body.status,
        carrier: { connect: { id: carrierId } },
      });
      return serializeRoute(route);
    } catch (error) {
      handlePrismaNotFound(error);
    }
  }

  public async updateRoute(id: number, body: UpdateRouteBodyDto) {
    await this.ensureRouteExists(id);
    const carrierId = await this.resolveCarrier(body.carrierId, body.carrierName);
    try {
      const route = await this.routeRepository.update(id, {
        originCity: body.originCity,
        destinationCity: body.destinationCity,
        distanceKm: body.distanceKm,
        estimatedTimeHours: body.estimatedTimeHours,
        vehicleType: body.vehicleType,
        costUsd: body.costUsd,
        status: body.status,
        carrier: { connect: { id: carrierId } },
      });
      return serializeRoute(route);
    } catch (error) {
      handlePrismaNotFound(error);
    }
  }

  public async disableRoute(id: number) {
    await this.ensureRouteExists(id);
    try {
      const route = await this.routeRepository.softDisable(id);
      return serializeRoute(route);
    } catch (error) {
      handlePrismaNotFound(error);
    }
  }

  public async getActiveRoutesWithTracking() {
    const activeRoutes = await this.routeRepository.findActiveRoutes();
    const routes = await Promise.all(
      activeRoutes.map(async (route) => {
        const courierId = String(route.carrierId ?? 0);
        const tracking = await this.trackingAdapter.trackRoute(
          courierId,
          String(route.id),
        );
        return {
          route: serializeRoute(route),
          tracking,
        };
      }),
    );
    return { routes };
  }

  public async exportRoutesCsv(query: ExportRoutesQueryDto): Promise<string> {
    const rows = await this.routeRepository.findManyForExport(
      query,
      EXPORT_MAX_ROWS,
    );
    const header =
      "id,origin_city,destination_city,distance_km,estimated_time_hours,vehicle_type,carrier,cost_usd,status,created_at";
    const lines = rows.map((route) =>
      [
        route.id,
        escapeCsvCell(route.originCity),
        escapeCsvCell(route.destinationCity),
        escapeCsvCell(Number(route.distanceKm)),
        escapeCsvCell(Number(route.estimatedTimeHours)),
        escapeCsvCell(route.vehicleType),
        escapeCsvCell(route.carrier?.name ?? ""),
        escapeCsvCell(Number(route.costUsd)),
        escapeCsvCell(route.status),
        escapeCsvCell(route.createdAt.toISOString()),
      ].join(","),
    );
    return [header, ...lines].join("\n");
  }

  public async importRoutesFromCsvStream(stream: Readable): Promise<{
    totalRows: number;
    imported: number;
    failed: number;
    errors: { row: number; errors: string[] }[];
  }> {
    const parser = stream.pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }),
    );

    const errors: { row: number; errors: string[] }[] = [];
    const batch: Prisma.RouteUncheckedCreateInput[] = [];
    let lineNo = 1;
    let imported = 0;

    try {
      for await (const record of parser) {
        lineNo += 1;
        const parsed = parseCsvRow(record as Record<string, unknown>);
        if (!parsed.success) {
          errors.push({ row: lineNo, errors: parsed.errors });
          continue;
        }

        const row = parsed.data;
        const carrier = await this.routeRepository.upsertCarrierByName(
          row.carrier,
        );

        batch.push({
          originCity: row.origin_city,
          destinationCity: row.destination_city,
          distanceKm: row.distance_km,
          estimatedTimeHours: row.estimated_time_hours,
          vehicleType: row.vehicle_type,
          carrierId: carrier.id,
          costUsd: row.cost_usd,
          status: row.status,
          createdAt: row.created_at,
          isDeleted: false,
        });

        if (batch.length >= IMPORT_BATCH_SIZE) {
          const toFlush = batch.splice(0, IMPORT_BATCH_SIZE);
          await this.routeRepository.createManyInTransaction(toFlush);
          imported += toFlush.length;
        }
      }
    } catch (error) {
      throw new AppError(
        `CSV import failed: ${error instanceof Error ? error.message : String(error)}`,
        400,
      );
    }

    if (batch.length > 0) {
      await this.routeRepository.createManyInTransaction(batch);
      imported += batch.length;
    }

    const totalRows = Math.max(0, lineNo - 1);

    return {
      totalRows,
      imported,
      failed: errors.length,
      errors,
    };
  }

  private async ensureRouteExists(id: number): Promise<void> {
    const route = await this.routeRepository.findById(id);
    if (!route) {
      throw new AppError("Route not found", 404);
    }
  }

  private async resolveCarrier(
    carrierId?: number,
    carrierName?: string,
  ): Promise<number> {
    if (carrierId !== undefined) {
      const carrier = await prisma.carrier.findUnique({
        where: { id: carrierId },
      });
      if (!carrier) {
        throw new AppError("Carrier not found", 404);
      }
      return carrierId;
    }

    if (!carrierName?.trim()) {
      throw new AppError("Either carrierId or carrierName is required", 400);
    }

    const carrier = await this.routeRepository.upsertCarrierByName(
      carrierName.trim(),
    );
    return carrier.id;
  }
}
