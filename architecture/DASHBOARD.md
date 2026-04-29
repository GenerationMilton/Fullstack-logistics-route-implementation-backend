
## 1. Backend step: implement dashboard summary endpoint

Implement `GET /api/v1/dashboard/summary?from=&to=` in the backend.

1. Route contract

- Method: `GET`
- Path: `/api/v1/dashboard/summary`
- Query params:
  - `from` (required, ISO8601)
  - `to` (required, ISO8601)
- Validation:
  - `from <= to`
  - date range max recommended window (for example 365 days)
- Response (example):

```json
{
  "range": { "from": "2024-01-01T00:00:00Z", "to": "2024-01-31T23:59:59Z" },
  "totalsByStatus": [
    { "status": "ACTIVA", "count": 58 },
    { "status": "INACTIVA", "count": 12 },
    { "status": "SUSPENDIDA", "count": 8 },
    { "status": "EN MANTENIMIENTO", "count": 5 }
  ],
  "topExpensiveRoutes": [
    { "id": 49, "originCity": "Bogotá", "destinationCity": "Leticia", "costUsd": 1250.0 }
  ],
  "activeHeatmapByRegion": [
    { "region": "Andina", "count": 21 },
    { "region": "Caribe", "count": 14 }
  ]
}
```

2. Backend design

- Controller: validate query params and map errors to semantic HTTP codes.
- Service: orchestrate aggregations and apply date filter.
- Repository: grouped counts by status, top 5 by `cost_usd`, active routes grouped by region.
- Mapping: define and maintain the city-to-region map in backend config (not in DB) for the simplified heatmap.

Suggested backend config shape:

```ts
// src/config/dashboardRegions.ts
export type RegionName = "Andina" | "Caribe" | "Pacifica" | "Orinoquia" | "Amazonia";

export const CITY_TO_REGION: Record<string, RegionName> = {
  "Bogotá": "Andina",
  "Medellín": "Andina",
  "Manizales": "Andina",
  "Pereira": "Andina",
  "Ibagué": "Andina",
  "Tunja": "Andina",
  "Bucaramanga": "Andina",
  "Cúcuta": "Andina",
  "Cali": "Pacifica",
  "Buenaventura": "Pacifica",
  "Pasto": "Pacifica",
  "Tumaco": "Pacifica",
  "Barranquilla": "Caribe",
  "Cartagena": "Caribe",
  "Santa Marta": "Caribe",
  "Valledupar": "Caribe",
  "Riohacha": "Caribe",
  "Montería": "Caribe",
  "Sincelejo": "Caribe",
  "Yopal": "Orinoquia",
  "Villavicencio": "Orinoquia",
  "San José del Guaviare": "Orinoquia",
  "Mocoa": "Amazonia",
  "Florencia": "Amazonia",
  "Leticia": "Amazonia"
};

export const UNKNOWN_REGION: RegionName = "Andina";
```

Implementation note: normalize city input (trim + case-insensitive + accent-safe) before lookup and use `UNKNOWN_REGION` fallback when not mapped.

3. Performance and reliability

- Add indexes used by aggregations (`created_at`, `status`, `cost_usd`).
- Keep query read-only and pageless (summary endpoint).
- Optional cache TTL (30-60s) for repeated dashboard requests.

4. Security and access

- Require JWT and role guard (`ADMIN`, `OPERATOR` can read).
- Reuse correlation-id logging in controller/service.

5. Tests

- Unit: date-range validator, service aggregation mapping.
- Integration: `GET /api/v1/dashboard/summary` happy path + invalid range.

6. Frontend consumption

- Dashboard page calls this endpoint on range change.
- Refresh charts without reloading and handle empty datasets gracefully.
