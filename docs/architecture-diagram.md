# Architecture Diagram

Mermaid diagrams below are ready to paste into draw.io (`Arrange -> Insert -> Advanced -> Mermaid`).

## Backend Architecture (Current)

```mermaid
flowchart LR
  Client[Frontend / API Consumer]

  subgraph FastifyApp[Backend Fastify App]
    Security[Security Plugins\nHelmet + CORS + JWT + RateLimit + Multipart]
    Middleware[Middlewares\nCorrelation ID + Error Handler + Auth/Role]

    subgraph Controllers[Controllers]
      HealthCtrl[HealthController]
      AuthCtrl[AuthController]
      RoutesCtrl[RoutesController]
    end

    subgraph Services[Services]
      HealthSvc[HealthService]
      AuthSvc[AuthService]
      RouteSvc[RouteService]
    end

    subgraph Repositories[Repositories]
      HealthRepo[HealthRepository]
      UserRepo[UserRepository\nin-memory bootstrap admin]
      RouteRepo[RouteRepository]
    end

    subgraph Adapters[Tracking Adapters]
      AdapterFactory[createTrackingAdapter]
      CachedAdapter[CachedTrackingAdapter\nTTL 60s]
      MockAdapter[MockTrackingAdapter]
      SoapAdapter[SoapTrackingAdapter]
    end
  end

  subgraph DataInfra[Data / Infra]
    Prisma[Prisma Client]
    Postgres[(PostgreSQL)]
    Redis[(Redis - optional)]
    SOAP[(Legacy SOAP Service / Mock)]
  end

  Client --> Security --> Middleware
  Middleware --> HealthCtrl --> HealthSvc --> HealthRepo
  Middleware --> AuthCtrl --> AuthSvc --> UserRepo
  Middleware --> RoutesCtrl --> RouteSvc --> RouteRepo --> Prisma --> Postgres

  RouteSvc --> AdapterFactory --> CachedAdapter
  CachedAdapter --> MockAdapter
  CachedAdapter --> SoapAdapter --> SOAP
  CachedAdapter -. optional ext cache .-> Redis
```

## Frontend Architecture (Current Angular Build)

```mermaid
flowchart LR
  User[User]

  subgraph AngularApp[Angular Frontend]
    Router[Angular Router\nStandalone + Lazy Routes]
    AppCfg[app.config.ts\nprovideRouter + HttpClient]
    Shell[ShellComponent\nTop Navigation + Global Toast]

    subgraph SecurityAndCrossCutting[Security & Cross-cutting]
      AuthGuard[authGuard]
      RoleGuard[roleGuard]
      AuthInterceptor[authInterceptor\nBearer + x-correlation-id]
      ErrorInterceptor[errorInterceptor\n401 logout + 5xx handling]
      CorrelationSvc[CorrelationIdService]
      FeedbackSvc[UiFeedbackService]
    end

    subgraph Pages[Feature Pages]
      LoginPage[Login Page]
      RoutesPage[Routes List + Route Form + CSV Import]
      DashboardPage[Dashboard Home]
      MonitorPage[Monitoring Home]
    end

    subgraph State[State Layer]
      AuthState[AuthService\nSignal token + user]
      DashboardState[DashboardStateService\nBehaviorSubject]
      MonitoringState[MonitoringStateService\nBehaviorSubject]
      CacheState[RoutesCacheService\nlocalStorage dataset cache]
    end

    subgraph DataLayer[Data Layer]
      ApiClient[ApiService + HttpClient]
      AuthServiceFE[AuthService]
      RoutesServiceFE[RoutesService]
      DashboardServiceFE[DashboardService]
      MonitoringServiceFE[MonitoringService]
    end

    Shared[Shared Components\nServerTable + StatusDistribution + HeatmapGrid]
  end

  subgraph BackendAPI[Backend API]
    AuthAPI[/POST /api/v1/auth/login\nGET /api/v1/auth/me/]
    RoutesAPI[/GET/POST/PUT/PATCH /api/v1/routes\nPOST /api/v1/routes/import/]
    DashAPI[/GET /api/v1/dashboard/summary/]
    TrackAPI[/GET /api/v1/routes/active/track/]
  end

  User --> Router
  AppCfg --> Router
  AppCfg --> AuthInterceptor
  AppCfg --> ErrorInterceptor

  Router --> LoginPage
  Router --> AuthGuard
  AuthGuard --> Shell
  Router --> Shell
  Shell --> FeedbackSvc
  Shell --> RoutesPage
  Shell --> DashboardPage
  Shell --> MonitorPage
  RoleGuard --> RoutesPage

  LoginPage --> AuthServiceFE --> ApiClient --> AuthAPI
  RoutesPage --> RoutesServiceFE --> ApiClient --> RoutesAPI
  DashboardPage --> DashboardServiceFE --> ApiClient --> DashAPI
  MonitorPage --> MonitoringServiceFE --> ApiClient --> TrackAPI

  Pages --> Shared
  AuthServiceFE --> AuthState
  DashboardPage --> DashboardState
  MonitorPage --> MonitoringState
  RoutesPage --> CacheState
  DashboardPage --> CacheState
  MonitorPage --> CacheState
  AuthInterceptor --> CorrelationSvc
```
