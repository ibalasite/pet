---
diagram: admin-c4-container
uml-type: C4 Container Diagram（Admin Portal）
source: docs/ARCH.md §2.2 + §3.4 ADR-004 + docs/ADMIN_IMPL.md §15 部署配置
generated: 2026-05-08T00:00:00Z
---

# Admin Portal C4 Container Diagram — pixel-pet-arena

> 來源：docs/ARCH.md §2.2 Admin Portal Architecture + §3.4 ADR-004 + docs/ADMIN_IMPL.md §15 Deployment

C4 Container 風格（Level 2）描述 Admin Portal 的 5 大 container 與其技術棧、通訊協定、安全邊界。

```mermaid
graph TD
    AdminUser["Admin User<br/>(role: super_admin /<br/>moderator / data_steward)<br/>browser session"]

    subgraph SecurityBoundary["Admin Security Boundary<br/>━━━━━━━━━━━━━━━━━━<br/>MFA(TOTP) + JWT Session +<br/>IP Whitelist + Audit Logging"]

        subgraph AdminFrontend["Admin Frontend Tier"]
            AdminSPA["Admin SPA<br/>━━━━━━━━━━━━━━━━━━<br/>Vue 3 + Element Plus<br/>+ TypeScript 5 + Vite 5<br/>━━━━━━━━━━━━━━━━━━<br/>Container: dist/ static files<br/>served by nginx :80"]
        end

        subgraph EdgeTier["Edge Tier"]
            Gateway["API Gateway<br/>━━━━━━━━━━━━━━━━━━<br/>nginx Ingress Controller<br/>(k8s ingress-nginx 1.10)<br/>━━━━━━━━━━━━━━━━━━<br/>Listens :443 (TLS 1.3 only)<br/>Routes /admin/api/* → Backend<br/>Enforces IP whitelist via<br/>nginx.ingress.kubernetes.io/<br/>whitelist-source-range"]
        end

        subgraph BackendTier["Application Tier"]
            Backend["Admin API Backend<br/>━━━━━━━━━━━━━━━━━━<br/>Node.js 20 LTS + Fastify 4<br/>+ TypeScript 5<br/>━━━━━━━━━━━━━━━━━━<br/>Container: api:sha-XXXXXXX<br/>Listens :3000 (HTTP intra-cluster)<br/>Routes mounted under /admin/api<br/>Replicas 2-10 (HPA on CPU 70%)"]
        end

        subgraph DataTier["Data Tier"]
            DB[("PostgreSQL 16<br/>━━━━━━━━━━━━━━━━━━<br/>StatefulSet, persistent volume<br/>━━━━━━━━━━━━━━━━━━<br/>Tables: admin_accounts,<br/>admin_audit_log,<br/>admin_user_roles, roles,<br/>permissions, role_permissions<br/>+ shared pet/arena tables<br/>Port :5432")]
            Redis[("Redis 7.2<br/>━━━━━━━━━━━━━━━━━━<br/>Deployment + Sentinel<br/>━━━━━━━━━━━━━━━━━━<br/>session:{tokenId} → AdminSession<br/>rate-limit counters<br/>Port :6379")]
        end
    end

    subgraph PlayerSide["Player-Facing Side<br/>(separate ingress, lower trust)"]
        PlayerSPA["Player App<br/>(React + Phaser.js)<br/>routes: /, /pet/:id, /arena"]
    end

    AdminUser -->|"1. HTTPS:443<br/>browser session<br/>+ httpOnly cookie<br/>+ X-CSRF-Token"| Gateway
    Gateway -->|"2. HTTP:80<br/>serves static<br/>(/admin/index.html, JS bundles)"| AdminSPA
    AdminSPA -->|"3. fetch /admin/api/*<br/>HTTPS:443 same-origin<br/>credentials: include"| Gateway
    Gateway -->|"4. HTTP:3000<br/>X-Forwarded-For,<br/>X-Real-IP"| Backend
    Backend -->|"5. TCP:5432<br/>PostgreSQL Wire Protocol<br/>+ TLS (cert-rotation)"| DB
    Backend -->|"6. TCP:6379<br/>Redis RESP3<br/>+ TLS (intra-cluster)"| Redis

    PlayerSPA -.->|"separate ingress<br/>does NOT pass<br/>Admin Security Boundary"| Gateway

    classDef secBoundary fill:#fff8e1,stroke:#f57f17,stroke-width:3px,stroke-dasharray:5 5
    classDef tier fill:#e1f5fe,stroke:#01579b
    classDef frontEnd fill:#e8f5e9,stroke:#1b5e20
    classDef backEnd fill:#fff3e0,stroke:#e65100
    classDef data fill:#fce4ec,stroke:#880e4f
    classDef external fill:#f3e5f5,stroke:#4a148c

    class SecurityBoundary secBoundary
    class AdminFrontend,EdgeTier,BackendTier,DataTier tier
    class AdminSPA frontEnd
    class Gateway,Backend backEnd
    class DB,Redis data
    class AdminUser,PlayerSPA external
```

## Container 清單

| Container | Technology | Port | Replicas | Notes |
|-----------|-----------|------|----------|-------|
| Admin SPA | Vue 3 + Element Plus + Vite 5 | nginx :80 | 1-2 | Static dist/, served from nginx alpine |
| API Gateway | nginx ingress-controller v1.10 | :443 (TLS 1.3) | 2 (DaemonSet equiv) | TLS termination, IP whitelist |
| Admin API Backend | Fastify 4 + Node.js 20 LTS | :3000 (HTTP intra) | 2-10 (HPA 70% CPU) | Same image as Player API; routes mounted under `/admin/api` |
| PostgreSQL | Postgres 16 (StatefulSet) | :5432 | Primary + Replica | Shared storage with Player side |
| Redis | Redis 7.2 (Deployment + Sentinel) | :6379 / :26379 | 1 master + 2 sentinels | Sessions + rate limit |

## 連線清單

| # | From | To | Protocol | Port | Auth | Notes |
|---|------|----|----------|------|------|-------|
| 1 | Browser | API Gateway | HTTPS | 443 | session cookie | TLS 1.3, HSTS preload |
| 2 | API Gateway | Admin SPA (nginx) | HTTP | 80 | none (intra-cluster) | static asset routing |
| 3 | Admin SPA | API Gateway | HTTPS | 443 | session cookie + CSRF | same-origin fetch |
| 4 | API Gateway | Admin API Backend | HTTP | 3000 | X-Forwarded-For | reverse proxy with header injection |
| 5 | Admin API Backend | PostgreSQL | TCP/TLS | 5432 | PG_PASSWORD via Secret | parameterized queries only |
| 6 | Admin API Backend | Redis | TCP/TLS | 6379 | REDIS_PASSWORD via Secret | RESP3 |

## Security Boundary（橘色虛框）

進入 Admin Security Boundary 必須通過以下 4 道閘門：

1. **MFA (TOTP)**：Login 階段強制驗證，secret AES-256-GCM 加密儲存
2. **JWT-style Session**：Server-side opaque token + Redis-stored claims, httpOnly cookie
3. **IP Whitelist**：nginx ingress 在 router 層先過濾（CIDR 範圍可由 Admin Portal 動態調整）
4. **Audit Logging**：所有 mutation 動作（POST/PUT/PATCH/DELETE）寫入 `admin_audit_log`

## 與 Player Side 的隔離

- 兩個 SPA（Admin / Player）部署為獨立 Service + Ingress（不同 hostname）
- 雖然共享同一個 API Backend image，但 routes 完全分離（`/api/v1/*` 對 Player，`/admin/api/*` 對 Admin）
- Token model 不同：Admin 用 server-side opaque session；Player 用 32-byte URL-safe base64 token
- DB 共用但表格按 BC 隔離；Admin 透過 `admin.*` permissions 存取 Player 資料
