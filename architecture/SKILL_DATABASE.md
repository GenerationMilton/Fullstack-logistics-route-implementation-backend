
### Database Implementation — PostgreSQL (Step‑by‑step)

## 0 Overview

This guide details a modern and scalable implementation plan for a logistics route management system. It proposes a **microservices-based architecture** with a frontend in Angular 17+ and a backend written in Fastify. Database Implementation — PostgreSQL

Goal: Design a normalized, indexed PostgreSQL schema for routes, carriers, and users; provide reproducible migrations and a seed script that loads the provided CSV dataset.

---

## 1. Choice & justification

PostgreSQL: structured data, strong indexing, transactions, and analytical queries for dashboards. Use it for referential integrity and efficient filtering.

---

## 2. Schema (SQL)
Carriers

sql
CREATE TABLE carriers (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);
Users

sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','OPERATOR')),
  created_at TIMESTAMPTZ DEFAULT now()
);
Routes

sql
CREATE TABLE routes (
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

---

## 3. Indexes
sql
CREATE INDEX idx_routes_origin ON routes(origin_city);
CREATE INDEX idx_routes_destination ON routes(destination_city);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_routes_vehicle ON routes(vehicle_type);
CREATE INDEX idx_routes_carrier ON routes(carrier_id);

---

## 4. Migrations & tools
Use Prisma Migrate or node-pg-migrate.

Keep migrations in prisma/migrations or migrations/.

Provide npm run migrate script.

---

## 5. Seed script (seed.ts)
Read data/routes_dataset.csv using streaming parser.

For each row:

Validate fields (origin, destination, numeric checks, enums).

Upsert carrier into carriers.

Insert route if not duplicate (use unique constraint or check).

Wrap inserts in transaction batches for performance.

Print summary: Inserted X routes, Skipped Y invalid rows.

---

## 6. Import validation rules

origin_city, destination_city: non-empty, max length 100.

distance_km, estimated_time_hours, cost_usd: numeric and positive.

vehicle_type: enum (CAMION, TRACTOMULA, FURGONETA, MOTO_CARGO, etc).

status: enum (ACTIVA, INACTIVA, SUSPENDIDA, EN MANTENIMIENTO).

created_at: ISO timestamp parseable.

---

## 7. Backup & local dev
Provide docker-compose.yml with Postgres service and volume.

Commands:

bash
```
docker-compose up -d db
npm run migrate
npm run seed -- ./data/routes_dataset.csv
pg_dump -U postgres -h localhost -p 5432 trackroute > dump.sql
psql -U postgres -h localhost -p 5432 trackroute < dump.sql
```
---

## 8. Dashboard queries (examples)
Total routes by state:

sql
```
SELECT status, COUNT(*) FROM routes WHERE is_deleted = false GROUP BY status;
Top 5 most expensive routes:
```
sql
```
SELECT id, origin_city, destination_city, cost_usd FROM routes WHERE is_deleted = false ORDER BY cost_usd DESC LIMIT 5;
```
---

## 9. Deliverables (DB)

Migrations folder.

scripts/seed.ts.

data/routes_dataset.csv.

.env.example with DB connection variables.

README with DB setup instructions.

docker-compose.yml

```
yaml
version: "3.8"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-trackroute}
    volumes:
      - db_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: ["redis-server", "--save", "60", "1"]

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    ports:
      - "4000:4000"
    volumes:
      - ./backend:/usr/src/app
    command: npm run dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "4200:4200"
    volumes:
      - ./frontend:/usr/src/app
    command: npm run start

  soap-mock:
    image: node:20
    working_dir: /usr/src/app
    volumes:
      - ./soap-mock:/usr/src/app
    command: ["node", "index.js"]
    ports:
      - "5000:5000"

volumes:
  db_data:
  redis_data:
.env.example
Código
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=trackroute
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# Backend
PORT=4000
NODE_ENV=development
JWT_SECRET=replace_with_secure_random_value
JWT_EXPIRES_IN=8h
BCRYPT_SALT_ROUNDS=12

# Redis (optional)
REDIS_HOST=redis
REDIS_PORT=6379

# SOAP mock / external
SOAP_ENDPOINT=http://soap-mock:5000/mock/track
SOAP_CACHE_TTL_SECONDS=60

# Rate limiting
LOGIN_RATE_LIMIT_POINTS=5
LOGIN_RATE_LIMIT_DURATION=60

# Logging
LOG_LEVEL=info

# Frontend
FRONTEND_URL=http://localhost:4200
CORS_ALLOWED_ORIGINS=http://localhost:4200

# Admin user (seed)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin_password_change_me
```

---

## 10. Resume of technical requirements

## Functional Requirements

### RF-01 Route Management (CRUD)

1. List all routes with pagination (20 records per page)
2. Filter by origin city, destination city, vehicle type, state, and carrier.
3. Create a new route with all required fields validated.
4. Edit an existing route.

Disable (soft delete) a route; physical deletion is not allowed.

### RF-02 - Real-Time Monitoring

For each active route, use the SOAP tracking service and display:

*Last vehicle position (coordinates or approximate city)
*Percentage of route completed

*ETA (Estimated Time of Arrival) Updated
The panel should refresh automatically every 30 seconds without reloading the page

### RF-03 - Indicators Dashboard

*Total routes by state (bar or donut chart)
* Top 5 most expensive routes.

*Heat map of active routes by region (this can be a simplified visual component if a real map is not integrated).

*Date filter for the analysis range.

### RF-04 Authentication and Authorization

*Login with username and password. Use JWT with an 8-hour expiration.

*Two roles: OPERATOR (read-only) and ADMIN (read+write)
*Protect all backend endpoints with authorization middleware
*Protect frontend routes with Angular Guards (frontend requirement; listed here for full-scope alignment).


### RF-05 - Bulk Route Import

*Endpoint `POST /api/v1/routes/import` that receives a CSV file (use the provided dataset)
*Validate each row before persisting; respond with a summary: `{ imported: N, failed: M, errors: [...] }`

---
## Technical Requirements

### Backend requirements

1. Layered structure: controller, service, repository.
2. DTOs with input validation (use zod or class-validator).
3. Centralized error handling with semantic HTTP status codes.
4. SOAP service integration through a `TrackingAdapter` abstraction; the rest of the system must not depend directly on SOAP details.
5. Caching strategy for SOAP responses (TTL of 60 seconds).
6. Environment variables for all credentials and sensitive configuration (`.env` + `.env.example`).
7. Structured logs with correlation-id on each request (pino or winston).


### Security

1. Passwords hashed with bcrypt (with a factor >=12)
2. Validation and sanitization of all inputs in the backend
3. HTTP security headers (use Helmet)
4. Explicitly configured CORS; avoid permissive wildcard policies in production.
5. Rate limiting on the login endpoint (max. 5 attempts per minute per IP)
6. Do not hardcode secrets; all secrets should be stored in environment variables.


## Mock SOAP Trace Service

Implement the mock as you prefer (SOAP server with strong - soap, in the test adapter). The expected code is:

Request
```
<TrackRouteRequest>
    <routeId>string</routeId>
</TrackRouteRequest>
```

Response
```
<TrackRouteResponse>
    <routeId>string</routeId>
    <lasLocation>string</lasLocation>
    <progressPercent>number</progressPercent>
    <etaMinutes>number</etaMinutes>
    <timestamp>ISO8601</timestamp>
</TrackRouteResponse>

```
---
## Bonus (Backend & frontend)

1. Export the filtered route list to CSV from the frontend.

2. WebSockets for real-time updates of the monitoring panel (instead of 30-second polling).

3. Functional Docker Compose that launches the backend, frontend, and database with a single `docker-compose` command.

4. Basic CI pipeline (GitHub actions) that runs lint and tests on every push.

5. Cursor-based pagination instead of offset-based pagination to improve performance on large tables.

---

### Testing

| type: Unit |
| coverage |  > 70% backend services |
| examples | RouteService, TrackingAdapter, DTO validations

| type: Integration |
| coverage | at least 5 endpoints |
| examples | GET /api/v1/routes, POST /api/v1/routes, POST /api/v1/routes/import, PATCH /api/v1/routes/:id/disable, GET /api/v1/routes/active/track

| type: Frontend |
| coverage | less than 2 components |
| examples | Routest table(pagination and filters), creating form

---

## Deliverables

1. README.md in the project root directory containing:
*Instructions for setting up the local environment (docker-compose)
*Required environment variables (reference .env.example)
*Architectural decisions made and justification.

*Assumptions made during development.

2. DOCUMENTACION_IA.md in the project root directory.

3. Postman collection for testing the endpoints.

4. Seed script with the provided dataset.

---

