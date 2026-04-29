# Backend - Logistics Routes API

Backend API built with Fastify + TypeScript + Prisma + PostgreSQL.

## Features

- JWT authentication and role-based access (`ADMIN`, `OPERATOR`)
- Route CRUD with soft delete
- CSV bulk import (`/api/v1/routes/import`)
- Dashboard summary endpoint (`/api/v1/dashboard/summary`)
- Active route tracking adapter (mock/SOAP) with cache

## Requirements

- Node.js 20+
- Docker Desktop (recommended for local DB)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```bash
cp .env.example .env
```

3. Start infrastructure (Postgres + Redis):

```bash
docker compose up -d db redis
docker compose ps
```

4. Run migrations and seed:

```bash
npx prisma migrate deploy
npm run db:seed
```

## Run application

Development:

```bash
npm run dev
```

Build and run:

```bash
npm run build
npm run start
```

Base URL: `http://localhost:3000`

## Test and quality commands

```bash
npm test
npm run test:cov
npm run build
npm run lint
```

## API test instructions (Postman)

You can import:

- `docs/backend.postman_collection.json`

Suggested variables:

- `baseUrl = http://localhost:3000`
- `token` (set by login test script)
- `routeId` (set by create-route test script)

Recommended request flow:

1. `POST /api/v1/auth/login`
2. `GET /api/v1/dashboard/summary?from=...&to=...`
3. `GET /api/v1/routes`
4. `POST /api/v1/routes`
5. `GET /api/v1/routes/:id`
6. `PUT /api/v1/routes/:id`
7. `PATCH /api/v1/routes/:id/disable`
8. `GET /api/v1/routes/active/track`
9. `POST /api/v1/routes/import`
10. `GET /api/v1/routes/export`

## Key docs

- `docs/backend-documentation.md`
- `docs/api-docs.md`
- `docs/postman-examples.md`
- `docs/step10-11-validation.md`
