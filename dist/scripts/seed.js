"use strict";
/**
 * scripts/seed.ts
 *
 * Usage:
 * 1. Install dependencies:
 *    npm install pg csv-parse dotenv bcrypt
 *    npm install -D ts-node typescript @types/node
 *
 * 2. Run (development):
 *    npx ts-node scripts/seed.ts ./data/routes_dataset.csv
 *
 * 3. Or build and run:
 *    tsc
 *    node dist/scripts/seed.js ./data/routes_dataset.csv
 *
 * What it does:
 * - Connects to Postgres using DATABASE_URL from .env
 * - Upserts carriers
 * - Inserts routes (skips duplicates by id if present)
 * - Creates an admin user (if ADMIN_USERNAME/ADMIN_PASSWORD provided)
 * - Prints a summary
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parse_1 = require("csv-parse");
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || process.env.BCRYPT_ROUNDS || "12", 10);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin_password_change_me";
if (!DATABASE_URL) {
    console.error("DATABASE_URL not set in environment");
    process.exit(1);
}
function readAlias(row, keys, fallback = "") {
    const record = row;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.length > 0) {
            return value;
        }
    }
    return fallback;
}
async function main() {
    const client = new pg_1.Client({ connectionString: DATABASE_URL });
    await client.connect();
    // Ensure tables exist (minimal DDL if migrations not run)
    await ensureSchema(client);
    const csvPath = process.argv[2] || path_1.default.join(__dirname, "../data/routes_dataset.csv");
    if (!fs_1.default.existsSync(csvPath)) {
        console.error("CSV file not found:", csvPath);
        process.exit(1);
    }
    const parser = fs_1.default.createReadStream(csvPath).pipe((0, csv_parse_1.parse)({
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }));
    let total = 0;
    let inserted = 0;
    let skipped = 0;
    const errors = [];
    // Cache carriers to avoid repeated DB lookups
    const carrierCache = new Map();
    // Preload existing carriers
    const resCarriers = await client.query("SELECT id, name FROM carriers");
    for (const r of resCarriers.rows)
        carrierCache.set(r.name, r.id);
    // Prepare statements
    const upsertCarrierText = `
    INSERT INTO carriers (name)
    VALUES ($1)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
    const insertRouteText = `
    INSERT INTO routes
      (origin_city, destination_city, distance_km, estimated_time_hours, vehicle_type, carrier_id, cost_usd, status, created_at, is_deleted)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)
    RETURNING id
  `;
    let rowNumber = 1;
    for await (const record of parser) {
        total++;
        rowNumber++;
        try {
            // Basic validation
            const origin = readAlias(record, ["origin_city", "origin city"]).trim();
            const destination = readAlias(record, [
                "destination_city",
                "destination city",
            ]).trim();
            const distance = parseFloat(readAlias(record, ["distance_km", "distance km"], "0"));
            const estimated = parseFloat(readAlias(record, ["estimated_time_hours", "estimated time_hours"], "0"));
            const vehicle = readAlias(record, ["vehicle_type"]).trim();
            const carrierName = (record.carrier || "").trim();
            const cost = parseFloat(readAlias(record, ["cost_usd"], "0"));
            const status = (record.status || "").trim();
            const createdAt = readAlias(record, ["created_at", "created at"], new Date().toISOString());
            if (!origin || !destination)
                throw new Error("origin or destination missing");
            if (isNaN(distance) || distance <= 0)
                throw new Error("invalid distance_km");
            if (isNaN(estimated) || estimated <= 0)
                throw new Error("invalid estimated_time_hours");
            if (!vehicle)
                throw new Error("vehicle_type missing");
            if (!carrierName)
                throw new Error("carrier missing");
            if (isNaN(cost) || cost < 0)
                throw new Error("invalid cost_usd");
            if (!status)
                throw new Error("status missing");
            // Upsert carrier
            let carrierId = carrierCache.get(carrierName);
            if (carrierId === undefined) {
                const carrierRes = await client.query(upsertCarrierText, [carrierName]);
                const resolvedCarrierId = Number(carrierRes.rows[0]?.id);
                if (!Number.isInteger(resolvedCarrierId) || resolvedCarrierId <= 0) {
                    throw new Error("invalid carrier id returned from upsert");
                }
                carrierId = resolvedCarrierId;
                carrierCache.set(carrierName, carrierId);
            }
            if (carrierId === undefined) {
                throw new Error("failed to resolve carrier id");
            }
            // Insert route
            await client.query("BEGIN");
            await client.query(insertRouteText, [
                origin,
                destination,
                distance,
                estimated,
                vehicle,
                carrierId,
                cost,
                status,
                createdAt,
            ]);
            await client.query("COMMIT");
            inserted++;
        }
        catch (err) {
            await client.query("ROLLBACK").catch(() => { });
            skipped++;
            errors.push({ row: rowNumber, reason: err.message || String(err), raw: record });
        }
    }
    // Create admin user if not exists
    const adminRes = await client.query("SELECT id FROM users WHERE username = $1", [ADMIN_USERNAME]);
    if (adminRes.rowCount === 0) {
        const hashed = await bcrypt_1.default.hash(ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);
        await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", [ADMIN_USERNAME, hashed, "ADMIN"]);
        console.log(`Admin user created: ${ADMIN_USERNAME}`);
    }
    else {
        console.log("Admin user already exists");
    }
    console.log("Seed summary:");
    console.log({ total, inserted, skipped, errorsCount: errors.length });
    if (errors.length > 0) {
        console.log("Sample errors:", errors.slice(0, 10));
    }
    await client.end();
    process.exit(0);
}
async function ensureSchema(client) {
    // Minimal schema creation for dev if migrations not applied
    await client.query(`
    CREATE TABLE IF NOT EXISTS carriers (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
  `);
    await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN','OPERATOR')),
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
    await client.query(`
    CREATE TABLE IF NOT EXISTS routes (
      id SERIAL PRIMARY KEY,
      origin_city TEXT NOT NULL,
      destination_city TEXT NOT NULL,
      distance_km NUMERIC NOT NULL,
      estimated_time_hours NUMERIC NOT NULL,
      vehicle_type TEXT NOT NULL,
      carrier_id INT REFERENCES carriers(id),
      cost_usd NUMERIC NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      disabled_at TIMESTAMPTZ NULL,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_routes_origin ON routes(origin_city);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_routes_destination ON routes(destination_city);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_routes_vehicle ON routes(vehicle_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_routes_carrier ON routes(carrier_id);`);
}
main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
