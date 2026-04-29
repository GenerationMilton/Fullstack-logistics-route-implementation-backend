"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeIdParamSchema = exports.updateRouteBodySchema = exports.createRouteBodySchema = exports.exportRoutesQuerySchema = exports.listRoutesQuerySchema = exports.VEHICLE_TYPES = exports.ROUTE_STATUSES = void 0;
exports.normalizeVehicleType = normalizeVehicleType;
exports.normalizeStatus = normalizeStatus;
exports.parseCsvRow = parseCsvRow;
const zod_1 = require("zod");
exports.ROUTE_STATUSES = [
    "ACTIVA",
    "INACTIVA",
    "SUSPENDIDA",
    "EN MANTENIMIENTO",
];
exports.VEHICLE_TYPES = [
    "CAMION",
    "TRACTOMULA",
    "FURGONETA",
    "MOTO_CARGO",
];
function normalizeVehicleType(raw) {
    return raw.trim().replace(/\s+/g, "_").toUpperCase();
}
function normalizeStatus(raw) {
    return raw.trim().toUpperCase();
}
const sortBySchema = zod_1.z.enum([
    "origin_city",
    "destination_city",
    "distance_km",
    "estimated_time_hours",
    "vehicle_type",
    "cost_usd",
    "status",
    "created_at",
]);
exports.listRoutesQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    origin_city: zod_1.z.string().optional(),
    destination_city: zod_1.z.string().optional(),
    vehicle_type: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    carrier_id: zod_1.z.coerce.number().int().positive().optional(),
    sort_by: sortBySchema.default("created_at"),
    sort_order: zod_1.z.enum(["asc", "desc"]).default("desc"),
});
exports.exportRoutesQuerySchema = exports.listRoutesQuerySchema.omit({
    page: true,
    limit: true,
});
const vehicleTypeField = zod_1.z
    .string()
    .min(1)
    .transform(normalizeVehicleType)
    .pipe(zod_1.z.enum(exports.VEHICLE_TYPES));
const statusField = zod_1.z
    .string()
    .min(1)
    .transform(normalizeStatus)
    .pipe(zod_1.z.enum(exports.ROUTE_STATUSES));
exports.createRouteBodySchema = zod_1.z
    .object({
    originCity: zod_1.z.string().trim().min(1).max(100),
    destinationCity: zod_1.z.string().trim().min(1).max(100),
    distanceKm: zod_1.z.number().positive(),
    estimatedTimeHours: zod_1.z.number().positive(),
    vehicleType: vehicleTypeField,
    costUsd: zod_1.z.number().positive(),
    status: statusField,
    carrierId: zod_1.z.number().int().positive().optional(),
    carrierName: zod_1.z.string().trim().min(1).optional(),
})
    .refine((data) => data.carrierId !== undefined || Boolean(data.carrierName), {
    message: "Either carrierId or carrierName is required",
    path: ["carrierName"],
});
exports.updateRouteBodySchema = exports.createRouteBodySchema;
exports.routeIdParamSchema = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive(),
});
const csvRowSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    origin_city: zod_1.z.string().trim().min(1).max(100),
    destination_city: zod_1.z.string().trim().min(1).max(100),
    distance_km: zod_1.z.coerce.number().positive(),
    estimated_time_hours: zod_1.z.coerce.number().positive(),
    vehicle_type: zod_1.z
        .string()
        .min(1)
        .transform(normalizeVehicleType)
        .pipe(zod_1.z.enum(exports.VEHICLE_TYPES)),
    carrier: zod_1.z.string().trim().min(1),
    cost_usd: zod_1.z.coerce.number().positive(),
    status: zod_1.z
        .string()
        .min(1)
        .transform(normalizeStatus)
        .pipe(zod_1.z.enum(exports.ROUTE_STATUSES)),
    created_at: zod_1.z
        .string()
        .min(1)
        .transform((value) => new Date(value))
        .refine((date) => !Number.isNaN(date.getTime()), {
        message: "created_at must be a valid date",
    }),
});
function parseCsvRow(row) {
    const result = csvRowSchema.safeParse(row);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        errors: result.error.issues.map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`),
    };
}
