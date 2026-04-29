"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteService = void 0;
const client_1 = require("@prisma/client");
const csv_parse_1 = require("csv-parse");
const prisma_1 = require("../db/prisma");
const routes_dto_1 = require("../dtos/routes.dto");
const errors_1 = require("../utils/errors");
const IMPORT_BATCH_SIZE = 50;
const EXPORT_MAX_ROWS = 50_000;
function serializeRoute(route) {
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
function escapeCsvCell(value) {
    const stringValue = String(value);
    if (/[",\n\r]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}
function handlePrismaNotFound(error) {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025") {
        throw new errors_1.AppError("Route not found", 404);
    }
    throw error;
}
class RouteService {
    constructor(routeRepository, trackingAdapter) {
        this.routeRepository = routeRepository;
        this.trackingAdapter = trackingAdapter;
    }
    async listRoutes(query) {
        const { data, total } = await this.routeRepository.list(query);
        return {
            total,
            page: query.page,
            limit: query.limit,
            data: data.map(serializeRoute),
        };
    }
    async getRouteById(id) {
        const route = await this.routeRepository.findById(id);
        if (!route) {
            throw new errors_1.AppError("Route not found", 404);
        }
        return serializeRoute(route);
    }
    async createRoute(body) {
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
        }
        catch (error) {
            handlePrismaNotFound(error);
        }
    }
    async updateRoute(id, body) {
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
        }
        catch (error) {
            handlePrismaNotFound(error);
        }
    }
    async disableRoute(id) {
        await this.ensureRouteExists(id);
        try {
            const route = await this.routeRepository.softDisable(id);
            return serializeRoute(route);
        }
        catch (error) {
            handlePrismaNotFound(error);
        }
    }
    async getActiveRoutesWithTracking() {
        const activeRoutes = await this.routeRepository.findActiveRoutes();
        const routes = await Promise.all(activeRoutes.map(async (route) => {
            const courierId = String(route.carrierId ?? 0);
            const tracking = await this.trackingAdapter.trackRoute(courierId, String(route.id));
            return {
                route: serializeRoute(route),
                tracking,
            };
        }));
        return { routes };
    }
    async exportRoutesCsv(query) {
        const rows = await this.routeRepository.findManyForExport(query, EXPORT_MAX_ROWS);
        const header = "id,origin_city,destination_city,distance_km,estimated_time_hours,vehicle_type,carrier,cost_usd,status,created_at";
        const lines = rows.map((route) => [
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
        ].join(","));
        return [header, ...lines].join("\n");
    }
    async importRoutesFromCsvStream(stream) {
        const parser = stream.pipe((0, csv_parse_1.parse)({
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
        }));
        const errors = [];
        const batch = [];
        let lineNo = 1;
        let imported = 0;
        try {
            for await (const record of parser) {
                lineNo += 1;
                const parsed = (0, routes_dto_1.parseCsvRow)(record);
                if (!parsed.success) {
                    errors.push({ row: lineNo, errors: parsed.errors });
                    continue;
                }
                const row = parsed.data;
                const carrier = await this.routeRepository.upsertCarrierByName(row.carrier);
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
        }
        catch (error) {
            throw new errors_1.AppError(`CSV import failed: ${error instanceof Error ? error.message : String(error)}`, 400);
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
    async ensureRouteExists(id) {
        const route = await this.routeRepository.findById(id);
        if (!route) {
            throw new errors_1.AppError("Route not found", 404);
        }
    }
    async resolveCarrier(carrierId, carrierName) {
        if (carrierId !== undefined) {
            const carrier = await prisma_1.prisma.carrier.findUnique({
                where: { id: carrierId },
            });
            if (!carrier) {
                throw new errors_1.AppError("Carrier not found", 404);
            }
            return carrierId;
        }
        if (!carrierName?.trim()) {
            throw new errors_1.AppError("Either carrierId or carrierName is required", 400);
        }
        const carrier = await this.routeRepository.upsertCarrierByName(carrierName.trim());
        return carrier.id;
    }
}
exports.RouteService = RouteService;
