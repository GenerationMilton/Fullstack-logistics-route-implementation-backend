# Backend Documentation

## 1) Project Overview

Backend API for logistics route management, built with Fastify + TypeScript + Prisma (PostgreSQL).

Main capabilities:
- JWT authentication with role-based authorization (`ADMIN`, `OPERATOR`).
- Route CRUD with soft delete.
- CSV bulk import for routes.
- Active routes tracking via `TrackingAdapter` abstraction (mock/SOAP) with cache.
- Centralized error handling, CORS + Helmet security, and correlation-id per request.

Base API path: `/api/v1`

---

## 2) Stack & Technologies

- Runtime: Node.js + TypeScript
- HTTP framework: Fastify
- ORM: Prisma
- Database: PostgreSQL
- Validation: Zod
- Security: `@fastify/jwt`, `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`
- File upload: `@fastify/multipart`
- CSV parsing: `csv-parse`
- Tracking cache: `node-cache`
- Logging: `pino` + `pino-pretty`
- Testing: Jest + Fastify `inject`

---

## 3) Architecture

Layered architecture:
- **Controllers**: HTTP parsing/validation and response mapping.
- **Services**: business logic and orchestration.
- **Repositories**: Prisma data access.
- **Adapters**: external tracking integration (`TrackingAdapter`).
- **Middlewares**: auth/roles, centralized errors, correlation id.

Relevant folders:
- `src/controllers`
- `src/services`
- `src/repositories`
- `src/adapters`
- `src/dtos`
- `src/middlewares`
- `src/security`

---

## 4) Environment Variables

Use `.env.example` as template:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL`
- `HOST`, `PORT`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `BCRYPT_ROUNDS`
- `CORS_ALLOWED_ORIGINS`
- `TRACKING_ADAPTER` (`mock` or `soap`)
- `SOAP_TRACKING_WSDL`, `SOAP_TRACKING_ENDPOINT`, `SOAP_TRACKING_METHOD` (SOAP mode)

---

## 5) Run Instructions

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npm run db:generate
```

Run migration:

```bash
npm run db:migrate
```

Seed routes dataset:

```bash
npm run db:seed
```

Start development server:

```bash
npm run dev
```

Build + run production:

```bash
npm run build
npm run start
```

Default URL:
- `http://localhost:3000`

---

## 6) Docker Desktop Database Initialization

Use Docker Desktop to run local infrastructure:

```bash
docker compose up -d db redis
docker compose ps
```

Expected database endpoint:
- host: `localhost`
- port: `5432`
- db: `trackroute`
- user: `postgres`
- password: `postgres`

Then initialize schema + data:

```bash
npm run db:migrate
npm run db:seed
```

Stop containers:

```bash
docker compose down
```

---

## 7) Prisma / Database

Current schema includes:
- `carriers`
- `routes`

`routes` highlights:
- Soft delete fields: `is_deleted`, `disabled_at`
- FK: `carrier_id -> carriers.id`
- Indexes: `origin_city`, `destination_city`, `status`, `vehicle_type`, `carrier_id`

Migration is available at:
- `prisma/migrations/20250428220000_init/migration.sql`

---

## 8) Authentication & Authorization

### Login
- Endpoint: `POST /api/v1/auth/login`
- Body:

```json
{
  "username": "admin",
  "password": "admin_password_change_me"
}
```

- Returns JWT token signed with configured expiration (default `8h`).
- Login endpoint has rate limiting (5 requests/minute per IP).

### Roles
- `ADMIN`: read/write routes endpoints.
- `OPERATOR`: read-only routes endpoints.

Protected endpoints require `Authorization: Bearer <token>`.

---

## 9) Implemented APIs

### Health
- `GET /health`

### Auth
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Routes
- `GET /api/v1/routes` (filters, sort, pagination)
- `GET /api/v1/routes/:id`
- `POST /api/v1/routes`
- `PUT /api/v1/routes/:id`
- `PATCH /api/v1/routes/:id/disable`
- `POST /api/v1/routes/import` (CSV multipart field `file`)
- `GET /api/v1/routes/active/track`
- `GET /api/v1/routes/export` (CSV)

---

## 10) Tracking Adapter

Contract:
- `trackRoute(courierId: string, routeId: string): Promise<TrackResponse>`

Implementations:
- `MockTrackingAdapter`: deterministic mocked tracking for local/testing.
- `SoapTrackingAdapter`: SOAP client wrapper with payload normalization.

Caching:
- `CachedTrackingAdapter` wraps adapter responses with TTL cache.
- Key format: `track:{courierId}:{routeId}`.
- Current TTL configured in factory: 60 seconds.

---

## 11) How to Test in Postman

1. Login:
   - `POST {{baseUrl}}/api/v1/auth/login`
   - Save `token` from response.

2. Set Authorization:
   - Type: Bearer Token
   - Token: `{{token}}`

3. Recommended flow:
   - `GET /api/v1/routes`
   - `POST /api/v1/routes` (ADMIN)
   - `GET /api/v1/routes/:id`
   - `PUT /api/v1/routes/:id` (ADMIN)
   - `PATCH /api/v1/routes/:id/disable` (ADMIN)
   - `GET /api/v1/routes/active/track`
   - `POST /api/v1/routes/import` with `form-data` file field named `file`
   - `GET /api/v1/routes/export`

Postman variables suggestion:
- `baseUrl = http://localhost:3000`
- `token = <jwt>`
- `routeId = <created route id>`

---

## 12) Testing (Automated)

Run tests:

```bash
npm test
```

Run coverage:

```bash
npm run test:cov
```

Current status when this document was generated:
- 7 test suites passed
- 1 integration suite skipped in environments without DB setup

---

## 13) Step 0 to Step 9 Verification (architecture/SKILL.md)

Legend:
- ✅ Implemented
- ⚠️ Partially implemented / gap

### Step 0 — Overview goal
- ✅ REST API under `/api/v1`, layered architecture, validation, auth, tracking adapter, cache, CSV import, centralized errors are present.

### Step 1 — Scaffold & dependencies
- ✅ Core dependencies are installed and used.
- ✅ `scripts/seed.ts` is implemented and imports `data/routes_dataset.csv`.

### Step 2 — Core architecture & patterns
- ✅ Controllers/services/repositories implemented.
- ✅ DTO validation via Zod at controller boundaries.
- ✅ Centralized error handler.
- ✅ Structured logger (`pino`) and correlation-id middleware.

### Step 3 — Authentication & security
- ✅ `POST /api/v1/auth/login` implemented with bcrypt compare and JWT.
- ✅ `authMiddleware` + `roleMiddleware` implemented.
- ✅ Login rate limit implemented.
- ⚠️ User persistence model is in-memory (`UserRepository` map), not Prisma/PostgreSQL table.

### Step 4 — Security
- ✅ Helmet enabled.
- ✅ Explicit CORS allowlist (no wildcard by default in production).
- ✅ Secrets sourced from env.

### Step 5 — Routes API endpoints
- ✅ Endpoints required in Step 5 are implemented, including import, track, and export.
- ✅ Pagination response includes `total`, `limit`, `data` and supports `page` (offset mode).
- ℹ️ Also supports cursor pagination (`nextCursor`, `hasMore`).

### Step 6 — CSV import
- ✅ Multipart CSV upload implemented.
- ✅ Stream parsing, row validation, carrier upsert, batch insertion with transaction, summary with per-row errors.
- ⚠️ Uses Fastify multipart instead of Multer (functionally equivalent for Fastify stack).

### Step 7 — TrackingAdapter (SOAP abstraction)
- ✅ Interface and adapter abstraction implemented.
- ✅ Mock and SOAP adapters available.
- ✅ SOAP payload normalization implemented.

### Step 8 — Caching & performance
- ✅ Tracking responses cached with 60s TTL.
- ✅ DB indexes added in Prisma schema/migration.
- ✅ Cursor-based pagination considered and implemented as optional mode.

### Step 9 — Testing
- ✅ Unit tests for RouteService, DTOs, Tracking adapters, filters, errors.
- ✅ Integration tests include required endpoints.
- ⚠️ Coverage threshold `>= 70%` is not enforced/configured as a hard gate in test config.

---

## 14) Current Gaps / Recommendations

1. Implement persistent `User` model in Prisma and move auth users from in-memory map to DB.
2. Keep `docker compose` + `db:migrate` + `db:seed` as the standard local bootstrap flow.
3. Optionally enforce coverage threshold in Jest config.
4. Add/update root `README.md` with architecture decisions and assumptions if required by deliverables.
