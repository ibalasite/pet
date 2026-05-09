---
diagram: component
uml-type: 元件圖（Component Diagram）
source: docs/EDD.md §4.5.8
generated: 2026-05-10T00:50:00Z
---

# Component Diagram

系統由五大區塊組成：Client（Player React + Phaser、Admin Vue、Vite 構建）、API Server（Fastify Auth/RateLimit 中介、Routes 與 UseCase 集成）、Worker（GDPR / cleanup / snapshot 背景作業）、Data Tier（PostgreSQL / Redis）以及 External（SendGrid、Vercel CDN）。

```mermaid
graph TB
    subgraph "Client"
        PR["Player React App (Phaser canvas)"]
        AV["Admin Vue App"]
        Vite["Vite Build"]
    end

    subgraph "API Server (Fastify)"
        Auth["AuthMiddleware"]
        RateMW["RateLimitMiddleware"]
        Routes["Game Routes"]
        AdminRoutes["Admin Routes"]
        UCs["Use Cases (Application)"]
        Domain["Domain Services"]
    end

    subgraph "Worker"
        WJobs["Background Jobs (GDPR / cleanup / snapshot)"]
    end

    subgraph "Data Tier"
        PG["PostgreSQL"]
        Redis["Redis"]
    end

    subgraph "External"
        SG["SendGrid"]
        CDN["Vercel CDN"]
    end

    PR --> Vite
    AV --> Vite
    Vite --> CDN
    CDN --> Auth
    Auth --> RateMW
    RateMW --> Routes
    RateMW --> AdminRoutes
    Routes --> UCs
    AdminRoutes --> UCs
    UCs --> Domain
    UCs --> PG
    UCs --> Redis
    UCs --> SG
    WJobs --> PG
    WJobs --> Redis
    WJobs --> SG
```

> 兩 Frontend SPA 共用 Vite 建構並由 Vercel CDN 分發；API 與 Worker 分離部署，Worker 不暴露 HTTP，僅消費 DB / Redis / 外部服務。
