import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters long"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().min(8).default("admin_password_change_me"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(12).default(12),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
});

function parseCorsOrigins(raw: string | undefined): string[] {
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
    throw new Error(
      "CORS_ALLOWED_ORIGINS must list at least one explicit origin in production (comma-separated, no wildcard).",
    );
  }
  corsOrigins = ["http://localhost:4200", "http://127.0.0.1:4200"];
}

export const env = {
  ...base,
  corsOrigins,
};
