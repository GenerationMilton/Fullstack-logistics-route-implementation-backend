# API Docs

Base URL: `http://localhost:3000`  
Base path: `/api/v1`

## Authentication

### POST `/api/v1/auth/login`
- Auth: none
- Body:

```json
{
  "username": "admin",
  "password": "admin_password_change_me"
}
```

- Response `200`:

```json
{
  "token": "<jwt>"
}
```

### GET `/api/v1/auth/me`
- Auth: Bearer token (`ADMIN` or `OPERATOR`)
- Response `200`:

```json
{
  "user": {
    "sub": "admin",
    "role": "ADMIN",
    "iat": 1777469785,
    "exp": 1777498585
  }
}
```

## Health

### GET `/api/v1/health`
- Auth: none
- Query (optional): `includeTimestamp=true|false`
- Response `200`:

```json
{
  "status": "ok",
  "service": "backend-api"
}
```

## Dashboard

### GET `/api/v1/dashboard/summary`
- Auth: Bearer token (`ADMIN` or `OPERATOR`)
- Query:
  - `from` (required, ISO8601)
  - `to` (required, ISO8601)
- Validation:
  - `from <= to`
  - max range: 365 days
- Response `200`:

```json
{
  "range": {
    "from": "2024-01-01T00:00:00.000Z",
    "to": "2024-01-31T23:59:59.000Z"
  },
  "totalsByStatus": [
    { "status": "ACTIVA", "count": 1 },
    { "status": "SUSPENDIDA", "count": 1 }
  ],
  "topExpensiveRoutes": [
    {
      "id": 310,
      "originCity": "Barranquilla",
      "destinationCity": "Cartagena",
      "costUsd": 300
    }
  ],
  "activeHeatmapByRegion": [
    { "region": "Andina", "count": 1 }
  ]
}
```

## Routes

### GET `/api/v1/routes`
- Auth: Bearer token (`ADMIN` or `OPERATOR`)
- Query:
  - `page` (default `1`)
  - `limit` (default `20`, max `100`)
  - `cursor` (optional keyset mode)
  - `origin_city`, `destination_city`, `vehicle_type`, `status`, `carrier_id`
  - `sort_by`: `origin_city|destination_city|distance_km|estimated_time_hours|vehicle_type|cost_usd|status|created_at`
  - `sort_order`: `asc|desc`
- Response `200`:

```json
{
  "total": 1,
  "limit": 2,
  "data": [
    {
      "id": 308,
      "originCity": "O1",
      "destinationCity": "D1",
      "distanceKm": 10,
      "estimatedTimeHours": 1,
      "vehicleType": "CAMION",
      "carrierId": 20,
      "carrier": { "id": 20, "name": "C1" },
      "costUsd": 50,
      "status": "ACTIVA",
      "createdAt": "2026-04-29T13:36:02.948Z",
      "disabledAt": null,
      "isDeleted": false
    }
  ],
  "nextCursor": null,
  "hasMore": false,
  "page": 1
}
```

### GET `/api/v1/routes/:id`
- Auth: Bearer token (`ADMIN` or `OPERATOR`)
- Response `200`: route object (same shape as list item)

### POST `/api/v1/routes`
- Auth: Bearer token (`ADMIN`)
- Body:

```json
{
  "originCity": "Bogota",
  "destinationCity": "Cali",
  "distanceKm": 460,
  "estimatedTimeHours": 9,
  "vehicleType": "CAMION",
  "costUsd": 385,
  "status": "ACTIVA",
  "carrierName": "Servientrega"
}
```

- Response `201`: created route object

### PUT `/api/v1/routes/:id`
- Auth: Bearer token (`ADMIN`)
- Body: same shape as create
- Response `200`: updated route object

### PATCH `/api/v1/routes/:id/disable`
- Auth: Bearer token (`ADMIN`)
- Response `200`:

```json
{
  "id": 309,
  "originCity": "Bogota",
  "destinationCity": "Cali",
  "distanceKm": 460,
  "estimatedTimeHours": 9,
  "vehicleType": "CAMION",
  "carrierId": 21,
  "carrier": { "id": 21, "name": "Servientrega" },
  "costUsd": 385,
  "status": "ACTIVA",
  "createdAt": "2026-04-29T13:36:25.873Z",
  "disabledAt": "2026-04-29T13:36:25.911Z",
  "isDeleted": true
}
```

### POST `/api/v1/routes/import`
- Auth: Bearer token (`ADMIN`)
- Content-Type: `multipart/form-data`
- File field: `file` (CSV)
- Response `200`:

```json
{
  "totalRows": 100,
  "imported": 100,
  "failed": 0,
  "errors": []
}
```

### GET `/api/v1/routes/active/track`
- Auth: Bearer token (`ADMIN` or `OPERATOR`)
- Response `200`:

```json
{
  "routes": [
    {
      "route": { "id": 308, "originCity": "O1" },
      "tracking": {
        "routeList": "Route 308 (carrier 20)",
        "lastLocation": "Checkpoint-4",
        "progressPercent": 56,
        "etaMinutes": 44,
        "timestamp": "2026-04-29T13:36:25.897Z"
      }
    }
  ]
}
```

### GET `/api/v1/routes/export`
- Auth: Bearer token (`ADMIN` or `OPERATOR`)
- Query: same filter/sort fields as list (without pagination)
- Response `200`: CSV file (`text/csv`)

## Error format

Validation and app errors return:

```json
{
  "message": "Invalid request body",
  "details": [
    { "path": ["status"], "message": "Invalid option" }
  ]
}
```
