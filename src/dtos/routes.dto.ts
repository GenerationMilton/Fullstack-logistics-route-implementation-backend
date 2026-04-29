import { z } from "zod";

export const ROUTE_STATUSES = [
  "ACTIVA",
  "INACTIVA",
  "SUSPENDIDA",
  "EN MANTENIMIENTO",
] as const;

export const VEHICLE_TYPES = [
  "CAMION",
  "TRACTOMULA",
  "FURGONETA",
  "MOTO_CARGO",
] as const;

export function normalizeVehicleType(raw: string): string {
  return raw.trim().replace(/\s+/g, "_").toUpperCase();
}

export function normalizeStatus(raw: string): string {
  return raw.trim().toUpperCase();
}

const sortBySchema = z.enum([
  "origin_city",
  "destination_city",
  "distance_km",
  "estimated_time_hours",
  "vehicle_type",
  "cost_usd",
  "status",
  "created_at",
]);

export const listRoutesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** When set, returns the next page using stable `id ASC` order (offset fields are ignored). */
  cursor: z.coerce.number().int().positive().optional(),
  origin_city: z.string().optional(),
  destination_city: z.string().optional(),
  vehicle_type: z.string().optional(),
  status: z.string().optional(),
  carrier_id: z.coerce.number().int().positive().optional(),
  sort_by: sortBySchema.default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export type ListRoutesQueryDto = z.infer<typeof listRoutesQuerySchema>;

export const exportRoutesQuerySchema = listRoutesQuerySchema.omit({
  page: true,
  limit: true,
  cursor: true,
});

export type ExportRoutesQueryDto = z.infer<typeof exportRoutesQuerySchema>;

const MAX_DASHBOARD_WINDOW_DAYS = 365;

export const dashboardSummaryQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .superRefine((value, ctx) => {
    if (value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "`from` must be earlier than or equal to `to`",
        path: ["from"],
      });
      return;
    }
    const windowMs = value.to.getTime() - value.from.getTime();
    const maxWindowMs = MAX_DASHBOARD_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (windowMs > maxWindowMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Date range cannot exceed ${MAX_DASHBOARD_WINDOW_DAYS} days`,
        path: ["to"],
      });
    }
  });

export type DashboardSummaryQueryDto = z.infer<typeof dashboardSummaryQuerySchema>;

const vehicleTypeField = z
  .string()
  .min(1)
  .transform(normalizeVehicleType)
  .pipe(z.enum(VEHICLE_TYPES));

const statusField = z
  .string()
  .min(1)
  .transform(normalizeStatus)
  .pipe(z.enum(ROUTE_STATUSES));

export const createRouteBodySchema = z
  .object({
    originCity: z.string().trim().min(1).max(100),
    destinationCity: z.string().trim().min(1).max(100),
    distanceKm: z.number().positive(),
    estimatedTimeHours: z.number().positive(),
    vehicleType: vehicleTypeField,
    costUsd: z.number().positive(),
    status: statusField,
    carrierId: z.number().int().positive().optional(),
    carrierName: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) => data.carrierId !== undefined || Boolean(data.carrierName),
    {
      message: "Either carrierId or carrierName is required",
      path: ["carrierName"],
    },
  );

export type CreateRouteBodyDto = z.infer<typeof createRouteBodySchema>;

export const updateRouteBodySchema = createRouteBodySchema;
export type UpdateRouteBodyDto = z.infer<typeof updateRouteBodySchema>;

export const routeIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type RouteIdParamDto = z.infer<typeof routeIdParamSchema>;

const csvRowSchema = z.object({
  id: z.string().optional(),
  origin_city: z.string().trim().min(1).max(100),
  destination_city: z.string().trim().min(1).max(100),
  distance_km: z.coerce.number().positive(),
  estimated_time_hours: z.coerce.number().positive(),
  vehicle_type: z
    .string()
    .min(1)
    .transform(normalizeVehicleType)
    .pipe(z.enum(VEHICLE_TYPES)),
  carrier: z.string().trim().min(1),
  cost_usd: z.coerce.number().positive(),
  status: z
    .string()
    .min(1)
    .transform(normalizeStatus)
    .pipe(z.enum(ROUTE_STATUSES)),
  created_at: z
    .string()
    .min(1)
    .transform((value) => new Date(value))
    .refine((date) => !Number.isNaN(date.getTime()), {
      message: "created_at must be a valid date",
    }),
});

export type CsvRouteRow = z.infer<typeof csvRowSchema>;

export function parseCsvRow(
  row: Record<string, unknown>,
): { success: true; data: CsvRouteRow } | { success: false; errors: string[] } {
  const result = csvRowSchema.safeParse(row);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "row"}: ${issue.message}`,
    ),
  };
}
