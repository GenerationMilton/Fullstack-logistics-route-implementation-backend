"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z
    .object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    HOST: zod_1.z.string().default("0.0.0.0"),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    JWT_SECRET: zod_1.z.string().min(16, "JWT_SECRET must be at least 16 characters long"),
    JWT_EXPIRES_IN: zod_1.z.string().default("8h"),
    ADMIN_USERNAME: zod_1.z.string().default("admin"),
    ADMIN_PASSWORD: zod_1.z.string().min(8).default("admin_password_change_me"),
    BCRYPT_ROUNDS: zod_1.z.coerce.number().int().min(12).default(12),
    CORS_ALLOWED_ORIGINS: zod_1.z.string().optional(),
    TRACKING_ADAPTER: zod_1.z.enum(["mock", "soap"]).default("mock"),
    SOAP_TRACKING_WSDL: zod_1.z.string().url().optional(),
    SOAP_TRACKING_ENDPOINT: zod_1.z.string().url().optional(),
    SOAP_TRACKING_METHOD: zod_1.z.string().min(1).default("TrackRoute"),
})
    .superRefine((data, ctx) => {
    if (data.TRACKING_ADAPTER === "soap" && !data.SOAP_TRACKING_WSDL?.trim()) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "SOAP_TRACKING_WSDL is required when TRACKING_ADAPTER=soap",
            path: ["SOAP_TRACKING_WSDL"],
        });
    }
});
function parseCorsOrigins(raw) {
    if (!raw?.trim()) {
        return [];
    }
    return raw
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid environment configuration: ${errors}`);
}
const base = parsed.data;
const fromEnv = parseCorsOrigins(base.CORS_ALLOWED_ORIGINS);
let corsOrigins = fromEnv;
if (corsOrigins.length === 0) {
    if (base.NODE_ENV === "production") {
        throw new Error("CORS_ALLOWED_ORIGINS must list at least one explicit origin in production (comma-separated, no wildcard).");
    }
    corsOrigins = ["http://localhost:4200", "http://127.0.0.1:4200"];
}
exports.env = {
    ...base,
    corsOrigins,
};
