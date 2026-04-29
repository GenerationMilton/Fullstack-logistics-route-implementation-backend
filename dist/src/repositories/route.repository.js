"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteRepository = void 0;
const prisma_1 = require("../db/prisma");
const routes_dto_1 = require("../dtos/routes.dto");
const SORT_FIELD_MAP = {
    origin_city: "originCity",
    destination_city: "destinationCity",
    distance_km: "distanceKm",
    estimated_time_hours: "estimatedTimeHours",
    vehicle_type: "vehicleType",
    cost_usd: "costUsd",
    status: "status",
    created_at: "createdAt",
};
function buildWhereFromListQuery(query) {
    const where = {
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
        where.vehicleType = (0, routes_dto_1.normalizeVehicleType)(query.vehicle_type.trim());
    }
    if (query.status?.trim()) {
        where.status = (0, routes_dto_1.normalizeStatus)(query.status.trim());
    }
    if (query.carrier_id !== undefined) {
        where.carrierId = query.carrier_id;
    }
    return where;
}
const routeInclude = { carrier: true };
class RouteRepository {
    async list(query) {
        const where = buildWhereFromListQuery(query);
        const skip = (query.page - 1) * query.limit;
        const take = query.limit;
        const prismaField = SORT_FIELD_MAP[query.sort_by];
        const orderBy = {
            [prismaField]: query.sort_order,
        };
        const [data, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.route.findMany({
                where,
                skip,
                take,
                orderBy,
                include: routeInclude,
            }),
            prisma_1.prisma.route.count({ where }),
        ]);
        return { data, total };
    }
    async findManyForExport(query, maxRows) {
        const where = buildWhereFromListQuery(query);
        const prismaField = SORT_FIELD_MAP[query.sort_by];
        const orderBy = {
            [prismaField]: query.sort_order,
        };
        return prisma_1.prisma.route.findMany({
            where,
            take: maxRows,
            orderBy,
            include: routeInclude,
        });
    }
    async findById(id) {
        return prisma_1.prisma.route.findFirst({
            where: { id, isDeleted: false },
            include: routeInclude,
        });
    }
    async findActiveRoutes() {
        return prisma_1.prisma.route.findMany({
            where: {
                isDeleted: false,
                status: "ACTIVA",
            },
            include: routeInclude,
            orderBy: { id: "asc" },
        });
    }
    async create(data) {
        return prisma_1.prisma.route.create({
            data,
            include: routeInclude,
        });
    }
    async update(id, data) {
        return prisma_1.prisma.route.update({
            where: { id },
            data,
            include: routeInclude,
        });
    }
    async softDisable(id) {
        return prisma_1.prisma.route.update({
            where: { id },
            data: {
                isDeleted: true,
                disabledAt: new Date(),
            },
            include: routeInclude,
        });
    }
    async upsertCarrierByName(name) {
        return prisma_1.prisma.carrier.upsert({
            where: { name },
            create: { name },
            update: {},
            select: { id: true },
        });
    }
    async createManyInTransaction(rows) {
        if (rows.length === 0) {
            return;
        }
        await prisma_1.prisma.$transaction(async (tx) => {
            for (const row of rows) {
                await tx.route.create({ data: row });
            }
        });
    }
}
exports.RouteRepository = RouteRepository;
