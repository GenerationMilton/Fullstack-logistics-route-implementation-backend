
### Backend Implementation — Node.js + TypeScript (Step‑by‑step)
## 0 Overview

This guide details a modern and scalable implementation plan for a logistics route management system. It proposes a **microservices-based architecture** with a frontend in Angular 17+ and a backend written in Fastify. Database Implementation — PostgreSQL

Goal: Implement a secure, testable REST API (/api/v1) with layered architecture (controller → service → repository), DTO validation, JWT auth (8h), SOAP tracking adapter with 60s cache, CSV import, and centralized error handling. Use Fastify (recommended) or Express.

---

## 1. Project scaffold & dependencies
Initialize:

```
bash
mkdir backend && cd backend
npm init -y
npm install fastify fastify-cors fastify-helmet fastify-jwt pino pino-pretty
npm install prisma @prisma/client bcrypt node-cache multer csv-parse axios
npm install -D typescript ts-node-dev jest ts-jest @types/jest
npx tsc --init
```
Folder layout:

Code
```
src/
  controllers/
  services/
  repositories/
  adapters/         # TrackingAdapter
  dtos/             # zod schemas or class-validator DTOs
  middlewares/
  utils/
  index.ts
scripts/
  seed.ts
prisma/ or migrations/
tests/
```

---

## 2. Core architecture & patterns

Implement a Layering

1. Controllers: parse request, call services, return responses.

2. Services: business logic, transactions.

3. Repositories: DB access (Prisma client).

4. DTO validation

5. Use zod for request parsing and runtime validation.

6. Validate at controller boundary; return 400 with details on failure.

7. Error handling

8. Central errorHandler mapping custom errors to HTTP codes.

9. Logging

10. Use pino with correlation-id middleware.

---

## 3. Authentication & security

Implement aUser model

POST /api/v1/auth/login → validate credentials, bcrypt compare (cost ≥ 12), return JWT with role claim and 8h expiry.

Middlewares

authMiddleware verifies JWT and attaches user.

roleMiddleware checks user.role.

rateLimitMiddleware for login (5 attempts/min per IP).


---

## 4. Security

helmet for headers, explicit CORS allowlist, no secrets in code.


---

## 5. Routes API endpoints

Implement the Endpoints to project 

GET /api/v1/routes — filters, sorting, pagination (limit default 20).

GET /api/v1/routes/:id

POST /api/v1/routes

PUT /api/v1/routes/:id

PATCH /api/v1/routes/:id/disable — soft disable (is_deleted=true, disabled_at=now()).

POST /api/v1/routes/import — CSV upload.

GET /api/v1/routes/active/track — aggregated tracking info for active routes.

GET /api/v1/routes/export — filtered CSV export (bonus).

Pagination response shape

json
```
{
  "total": 123,
  "page": 1,
  "limit": 20,
  "data": [ ... ]
}
```


---


## 6. CSV import implementation

Accept multipart file via multer.

Stream parse with csv-parse.

For each row:

Validate DTO.

Upsert carrier into carriers table.

Map and prepare route record.

Collect per-row errors.

Insert valid rows in a transaction (batch).

Return summary:

json
```
{ "totalRows": 100, "imported": 95, "failed": 5, "errors": [ { "row": 3, "errors": ["invalid cost"] } ] }
```


---

## 7. TrackingAdapter (SOAP abstraction)

### Interface

ts
```
interface TrackResponse {
  routeList: string;
  lastLocation: string;
  progressPercent: number;
  etaMinutes: number;
  timestamp: string;
}
interface TrackingAdapter { trackRoute(courierId: string, routeId: string): Promise<TrackResponse>; }
```
### Implementations

MockAdapter: returns deterministic or randomized stubbed responses for dev/tests.

SoapAdapter: uses strong-soap or soap client to call legacy SOAP; normalize response.

Cache

Wrap calls with node-cache or Redis TTL 60s keyed by track:{courierId}:{routeId}.


---

## 8. Caching & performance
Cache SOAP responses for 60 seconds.

DB indexes on origin_city, destination_city, status, vehicle_type, carrier_id.

Consider cursor-based pagination for large datasets.

---

## 9. Testing
Unit tests: RouteService, TrackingAdapter, DTO validations (target ≥70% coverage).

Integration tests: at least 5 endpoints (GET /api/v1/routes, POST /api/v1/routes, POST /api/v1/routes/import, PATCH /api/v1/routes/:id/disable, GET /api/v1/routes/active/track).

Use Jest and supertest (or Fastify inject) for endpoint tests.


---

## 10. Scripts & developer commands

npm run dev — start dev server (ts-node-dev).

npm run migrate — run migrations (Prisma or chosen tool).

npm run seed -- ./data/routes_dataset.csv — seed DB.

npm run test — run tests.

npm run lint — run ESLint.


---

## 11. Deliverables (backend)

README.md with run instructions.

.env.example.

scripts/seed.ts and data/routes_dataset.csv.

api-docs.md (endpoints, DTOs).

SOAP mock and TrackingAdapter implementations.

Tests and coverage reports.


---

## 12. Resume of technical requirements

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

## Routes Dataset

```
id,origin_city,destination_city,distance_km,estimated_time_hours,vehicle_type,carrier,cost_usd,status,created_at
1,Bogotá,Medellín,415.8,8.5,CAMION,TCC,320.00,ACTIVA,2024-01-05T08:00:00Z
2,Medellín,Cali,418.9,9.0,TRACTOMULA,Servientrega,350.00,ACTIVA,2024-01-06T09:00:00Z
3,Cali,Barranquilla,1050,18.0,TRACTOMULA,Coordinadora,480.00,ACTIVA,2024-01-07T07:30:00Z
4,Bogotá,Bucaramanga,395,7.5,CAMION,TCC,295.00,ACTIVA,2024-01-08T06:00:00Z
5,Barranquilla,Cartagena,120,2.5,FURGONETA,Depresa,95.00,ACTIVA,2024-01-08T10:00:00Z
6,Medellín,Pereira,178.3,5.5,FURGONETA,Envía,140.00,ACTIVA,2024-01-09T08:00:00Z
7,Bogotá,Villavicencio,88.0,4.0,CAMION,TCC,110.00,ACTIVA,2024-01-09T11:00:00Z
8,Cali,Pasto,254,6.0,CAMION,Coordinadora,210.00,INACTIVA,2024-01-10T07:00:00Z
9,Bucaramanga,Cúcuta,195,3.0,FURGONETA,Servientrega,150.00,ACTIVA,2024-01-10T09:30:00Z
10,Bogotá,Manizales,290,5.5,CAMION,TCC,230.00,ACTIVA,2024-01-11T08:00:00Z
11,Medellín,Santa Marta,730,13.0,TRACTOMULA,DHL Colombia,610.00,ACTIVA,2024-01-11T06:00:00Z
12,Barranquilla,Santa Marta,95,2.0,FURGONETA,Depresa,85.00,ACTIVA,2024-01-12T09:00:00Z
13,Bogotá,Cúcuta,585,11.0,TRACTOMULA,TCC,495.00,SUSPENDIDA,2024-01-12T07:00:00Z
14,Cali,Ibagué,200,4.0,CAMION,TCC,180.00,ACTIVA,2024-01-13T08:30:00Z
15,Pereira,Armenia,47.1,1.0,MOTO_CARGO,Envía,38.00,ACTIVA,2024-01-13T10:00:00Z
16,Pereira,Bogotá,290.5,5.0,CAMION,TCC,240.00,ACTIVA,2024-01-14T07:00:00Z
17,Medellín,Turbo,340,8.0,CAMION,Servientrega,275.00,ACTIVA,2024-01-14T09:00:00Z
18,Cartagena,Montería,145,4.0,CAMION,Depresa,120.00,ACTIVA,2024-01-15T08:00:00Z
19,Bogotá,Neiva,300,6.0,CAMION,TCC,245.00,INACTIVA,2024-01-15T10:30:00Z
20,Cali,Popayán,130,2.5,FURGONETA,Envía,104.00,ACTIVA,2024-01-16T07:30:00Z
21,Medellín,Manizales,195,3.0,CAMION,Servientrega,158.00,ACTIVA,2024-01-16T08:00:00Z
22,Bogotá,Tunja,148,3.0,FURGONETA,TCC,118.00,ACTIVA,2024-01-17T09:00:00Z
23,Barranquilla,Valledupar,285,5.0,CAMION,Depresa,200.00,ACTIVA,2024-01-17T07:00:00Z
24,Bucaramanga,Bogotá,395,7.5,TRACTOMULA,TCC,320.00,ACTIVA,2024-01-18T06:00:00Z
25,Cali,Buenaventura,115,2.5,CAMION,FedEx Colombia,95.00,ACTIVA,2024-01-18T10:00:00Z
26,Bogotá,Armenia,290,5.0,CAMION,TCC,235.00,ACTIVA,2024-01-19T08:00:00Z
27,Medellín,Bogotá,415,8.5,TRACTOMULA,Coltransa,390.00,ACTIVA,2024-01-19T07:00:00Z
28,Pasto,Ibagué,254,6.0,CAMION,Envía,210.00,EN MANTENIMIENTO,2024-01-20T09:00:00Z
29,Cartagena,Bogotá,1030,18.5,TRACTOMULA,Servientrega,860.00,ACTIVA,2024-01-20T06:00:00Z
30,Cúcuta,Bucaramanga,135,4.0,FURGONETA,Envía,158.00,ACTIVA,2024-01-21T08:30:00Z
31,Bogotá,Florencia,435,9.0,CAMION,TCC,355.00,ACTIVA,2024-01-21T07:00:00Z
32,Medellín,Quibdó,290,7.0,CAMION,Coordinadora,245.00,SUSPENDIDA,2024-01-22T09:00:00Z
33,Barranquilla,Montería,310,6.5,CAMION,Deprisa,240.00,ACTIVA,2024-01-22T08:00:00Z
34,Bogotá,Yopal,355,7.0,CAMION,TCC,285.00,ACTIVA,2024-01-23T07:30:00Z
35,Cali,Medellín,418,9.0,TRACTOMULA,Envía,470.00,ACTIVA,2024-01-23T16:00:00Z
36,Pereira,Medellín,178,3.5,FURGONETA,Envía,180.00,ACTIVA,2024-01-24T10:00:00Z
37,Manizales,Bogotá,185,4.0,CAMION,TCC,232.00,ACTIVA,2024-01-24T08:00:00Z
38,Ibagué,Cali,200,4.0,CAMION,Coordinadora,190.00,INACTIVA,2024-01-25T07:00:00Z
39,Santa Marta,Barranquilla,95,2.5,FURGONETA,Deprisa,78.00,ACTIVA,2024-01-25T09:30:00Z
40,Bogotá,Sincelejo,510,9.5,TRACTOMULA,TCC,495.00,ACTIVA,2024-01-26T06:00:00Z
41,Medellín,Cúcuta,580,11.0,TRACTOMULA,Envía,490.00,ACTIVA,2024-01-26T07:00:00Z
42,Cali,Neiva,245,5.0,CAMION,Coordinadora,215.00,ACTIVA,2024-01-27T06:00:00Z
43,Bogotá,Riohacha,1040,19.0,TRACTOMULA,TCC,935.00,ACTIVA,2024-01-27T06:00:00Z
44,Barranquilla,Medellín,710,9.0,CAMION,DHL Colombia,315.00,EN MANTENIMIENTO,2024-01-28T09:00:00Z
45,Barranquilla,Bogotá,1000,18.0,TRACTOMULA,FedEx Colombia,840.00,ACTIVA,2024-01-28T06:00:00Z
46,Pasto,Bogotá,630,13.0,TRACTOMULA,Envía,520.00,ACTIVA,2024-01-29T07:00:00Z
47,Cartagena,Montería,120,2.5,MOTO CARGO,Deprisa,50.00,ACTIVA,2024-01-29T10:00:00Z
48,Cali,Popayán,140,2.5,FURGONETA,Envía,105.00,SUSPENDIDA,2024-01-30T06:00:00Z
49,Bogotá,Leticia,1590,30.0,TRACTOMULA,TCC,1250.00,ACTIVA,2024-01-31T08:00:00Z
50,Medellín,Apartadó,265,5.5,TRACTOMULA,TCC,680.00,ACTIVA,2024-02-01T07:00:00Z
51,Bogotá,Arica,840,15.0,CAMION,Servientrega,215.00,ACTIVA,2024-02-01T07:00:00Z
52,Cali,Tumaco,300,7.0,CAMION,Coordinadora,248.00,ACTIVA,2024-02-01T09:00:00Z
53,Medellin,Rionegro,42,1.0,MOTO CARGO,Envia,35.00,ACTIVA,2024-02-01T10:30:00Z
54,Barranquilla,Sincelejo,200,4.0,FURGONETA,Deprisa,160.00,ACTIVA,2024-02-02T08:00:00Z
55,Bogotá,Popayán,425,8.0,CAMION,TCC,340.00,ACTIVA,2024-02-03T07:00:00Z
56,Manizales,Valledupar,340,7.0,CAMION,Envia,272.00,ACTIVA,2024-02-03T09:00:00Z
57,Cali,Bogotá,460,9.0,TRACTOMULA,Servientrega,385.00,ACTIVA,2024-02-04T06:00:00Z
58,Medellin,Monteria,450,9.0,TRACTOMULA,TCC,375.00,ACTIVA,2024-02-04T07:00:00Z
59,Bogotá,Medellin,410,8.0,TRACTOMULA,Coordinadora,505.00,ACTIVA,2024-02-05T06:00:00Z
60,Cartagena,Sincelejo,240,5.0,CAMION,FedEx Colombia,192.00,ACTIVA,2024-02-05T09:00:00Z
61,Pereira,Cali,220,4.5,CAMION,Envia,178.00,ACTIVA,2024-02-06T08:00:00Z
62,Manizales,Medellin,188,3.5,CAMION,TCC,150.00,ACTIVA,2024-02-06T10:00:00Z
63,Bogotá,Mocoa,600,12.5,TRACTOMULA,Envia,505.00,EN MANTENIMIENTO,2024-02-07T07:00:00Z
64,Bogotá,Bogotá,586,11.0,TRACTOMULA,Coordinadora,495.00,ACTIVA,2024-02-07T06:00:00Z
65,Santa Marta,Valledupar,185,3.5,FURGONETA,Deprisa,148.00,ACTIVA,2024-02-08T09:00:00Z
66,Bogotá,Tunja,148,3.0,CAMION,TCC,120.00,ACTIVA,2024-02-08T08:30:00Z
67,Medellin,Barrancabermeja,195,4.0,CAMION,FedEx Colombia,158.00,ACTIVA,2024-02-09T07:00:00Z
68,Cali,Bucaramanga,600,11.5,TRACTOMULA,TCC,490.00,SUSPENDIDA,2024-02-10T07:30:00Z
69,Bogotá,San José del Guaviare,580,12.0,TRACTOMULA,TCC,480.00,ACTIVA,2024-02-10T08:00:00Z
70,Barranquilla,Riohacha,290,6.0,CAMION,Servientrega,232.00,ACTIVA,2024-02-10T08:00:00Z
71,Pereira,Bogotá,290,5.5,CAMION,Envia,238.00,ACTIVA,2024-02-11T07:00:00Z
72,Pasto,Popayán,125,2.5,FURGONETA,Coordinadora,100.00,ACTIVA,2024-02-11T10:00:00Z
73,Bogotá,Medellin,415,7.5,TRACTOMULA,TCC,342.00,ACTIVA,2024-02-12T09:00:00Z
74,Cali,Manizales,265,5.0,CAMION,Servientrega,212.00,ACTIVA,2024-02-13T06:00:00Z
75,Medellin,Barranquilla,740,13.5,TRACTOMULA,Servientrega,622.00,ACTIVA,2024-02-13T07:00:00Z
76,Bogotá,Cartagena,1030,18.5,TRACTOMULA,TCC,865.00,ACTIVA,2024-02-14T06:00:00Z
77,Bogotá,Cartagena,1030,18.5,TRACTOMULA,TCC,865.00,ACTIVA,2024-02-14T06:00:00Z
78,Cúcuta,Medellín,580,11.0,TRACTOMULA,Coordinadora,488.00,ACTIVA,2024-02-14T07:00:00Z
79,Barranquilla,Cartagena,120,2.5,CAMION,Deprisa,98.00,ACTIVA,2024-02-15T09:00:00Z
80,Bogotá,Cali,460,9.0,TRACTOMULA,Servientrega,385.00,ACTIVA,2024-02-15T06:00:00Z
81,Medellín,Neiva,430,8.5,TRACTOMULA,TCC,360.00,ACTIVA,2024-02-16T07:00:00Z
82,Cali,Cartagena,1070,19.0,TRACTOMULA,FeDex Colombia,900.00,EN MANTENIMIENTO,2024-02-16T06:00:00Z
83,Bogotá,Barrancabermeja,310,6.0,CAMION,Coordinadora,248.00,ACTIVA,2024-02-17T08:00:00Z
84,Pereira,Manizales,50,1.0,MOTO_CARGO,Envía,40.00,ACTIVA,2024-02-17T10:30:00Z
85,Medellín,Ibagué,350,7.0,CAMION,TCC,290.00,ACTIVA,2024-02-18T07:00:00Z
86,Cali,Armenia,130,2.5,FURGONETA,Coordinadora,105.00,ACTIVA,2024-02-18T09:00:00Z
87,Bogotá,Montería,500,9.5,TRACTOMULA,Servientrega,420.00,ACTIVA,2024-02-19T06:00:00Z
88,Barranquilla,Montería,310,6.5,TRACTOMULA,ML Colombia,260.00,SUSPENDIDA,2024-02-19T07:00:00Z
89,Pasto,Medellín,810,16.0,TRACTOMULA,TCC,680.00,ACTIVA,2024-02-20T06:00:00Z
90,Cúcuta,Barranquilla,780,14.5,TRACTOMULA,Coordinadora,635.00,ACTIVA,2024-02-20T07:00:00Z
91,Bogotá,Buenaventura,530,10.0,TRACTOMULA,FeDex Colombia,445.00,ACTIVA,2024-02-21T06:00:00Z
92,Medellín,Pasto,870,17.0,TRACTOMULA,TCC,730.00,ACTIVA,2024-02-21T07:00:00Z
93,Cali,Santa Marta,1100,20.0,TRACTOMULA,TCC,820.00,INACTIVA,2024-02-22T06:00:00Z
94,Bogotá,Santa Marta,975,17.5,TRACTOMULA,Coordinadora,820.00,ACTIVA,2024-02-23T06:00:00Z
95,Medellín,Barranquilla,495,9.5,TRACTOMULA,DHL Colombia,415.00,ACTIVA,2024-02-23T06:00:00Z
96,Pereira,Tunja,340,6.5,CAMION,TCC,272.00,ACTIVA,2024-02-23T08:00:00Z
97,Manizales,Cali,126,2.0,CAMION,Envía,212.00,ACTIVA,2024-02-24T07:00:00Z
98,Bogotá,Valledupar,1060,19.5,TRACTOMULA,Servientrega,892.00,ACTIVA,2024-02-24T06:00:00Z
99,Medellín,Florencia,560,11.0,TRACTOMULA,TCC,470.00,EN MANTENIMIENTO,2024-02-25T07:00:00Z
100,Cali,Barranquilla,1050,18.0,TRACTOMULA,FeDex Colombia,882.00,ACTIVA,2024-02-25T06:00:00Z
```

---