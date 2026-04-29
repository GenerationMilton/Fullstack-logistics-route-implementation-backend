# Postman Examples

## Environment variables

- `baseUrl`: `http://localhost:3000`
- `token`: (set after login)
- `routeId`: (set after create route)

## 1) Login

- Method: `POST`
- URL: `{{baseUrl}}/api/v1/auth/login`
- Body (raw JSON):

```json
{
  "username": "admin",
  "password": "admin_password_change_me"
}
```

Tests tab script:

```javascript
const json = pm.response.json();
pm.environment.set("token", json.token);
```

## 2) List routes

- Method: `GET`
- URL: `{{baseUrl}}/api/v1/routes?limit=20&page=1`
- Header: `Authorization: Bearer {{token}}`

## 2.1) Dashboard summary

- Method: `GET`
- URL: `{{baseUrl}}/api/v1/dashboard/summary?from=2024-01-01T00:00:00.000Z&to=2024-01-31T23:59:59.000Z`
- Header: `Authorization: Bearer {{token}}`

## 3) Create route (ADMIN)

- Method: `POST`
- URL: `{{baseUrl}}/api/v1/routes`
- Header: `Authorization: Bearer {{token}}`
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

Tests tab script:

```javascript
const json = pm.response.json();
pm.environment.set("routeId", json.id);
```

## 4) Get by id

- Method: `GET`
- URL: `{{baseUrl}}/api/v1/routes/{{routeId}}`
- Header: `Authorization: Bearer {{token}}`

## 5) Update route (ADMIN)

- Method: `PUT`
- URL: `{{baseUrl}}/api/v1/routes/{{routeId}}`
- Header: `Authorization: Bearer {{token}}`
- Body:

```json
{
  "originCity": "Bogota",
  "destinationCity": "Medellin",
  "distanceKm": 415,
  "estimatedTimeHours": 8.5,
  "vehicleType": "TRACTOMULA",
  "costUsd": 390,
  "status": "ACTIVA",
  "carrierName": "Coltransa"
}
```

## 6) Disable route (soft delete)

- Method: `PATCH`
- URL: `{{baseUrl}}/api/v1/routes/{{routeId}}/disable`
- Header: `Authorization: Bearer {{token}}`

## 7) Active track

- Method: `GET`
- URL: `{{baseUrl}}/api/v1/routes/active/track`
- Header: `Authorization: Bearer {{token}}`

## 8) Export CSV

- Method: `GET`
- URL: `{{baseUrl}}/api/v1/routes/export?status=ACTIVA&sort_by=created_at&sort_order=desc`
- Header: `Authorization: Bearer {{token}}`

## 9) Import CSV (multipart)

- Method: `POST`
- URL: `{{baseUrl}}/api/v1/routes/import`
- Header: `Authorization: Bearer {{token}}`
- Body type: `form-data`
  - key: `file` (type: File)
  - value: select `data/routes_dataset.csv`

Expected response:

```json
{
  "totalRows": 100,
  "imported": 100,
  "failed": 0,
  "errors": []
}
```
