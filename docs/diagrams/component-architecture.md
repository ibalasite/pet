# Component Architecture Diagram — pixel-pet-arena

## Overview

This diagram shows the full system component architecture: client-side SPA frontends served from
Vercel's global CDN, two Fastify API server processes on Railway, shared PostgreSQL and Redis data
stores, and external services (SendGrid / Nodemailer, GitHub Actions CI/CD, S3 backups).

The architecture is governed by six design principles from ARCH §1.1:
- **P1 Accountless Persistence** — 32-byte URL token as identity
- **P2 Dual-Store Authority** — Redis authoritative for leaderboard + rate limits; PostgreSQL for all durable data
- **P3 Monorepo, Single Language** — Node.js 20 LTS + TypeScript throughout backend
- **P4 Deliberate Stack Separation** — React + Phaser.js player app vs Vue 3 + Element Plus admin portal
- **P5 Fail-Closed Security** — OTP code entry is fail-closed on Redis unavailability
- **P6 GDPR by Architecture** — email stored as AES-256-GCM ciphertext + SHA-256 hash only

## Diagram

```mermaid
graph TB
    subgraph Actors["External Actors"]
        Guest["Guest Player\n(no token)"]
        Owner["Pet Owner\n(URL token)"]
        Competitor["Competitive Player\n(token + arena)"]
        Admin["Admin Operator\n(TOTP session)"]
    end

    subgraph CDN["CDN / Edge — Vercel"]
        PlayerApp["Player App\nReact 18 + Phaser.js 3\nVite 5 / TypeScript 5\nJS ≤ 300 KB gzipped (total_js_bundle_gzipped_kb = 300)"]
        AdminPortal["Admin Portal\nVue 3 + Element Plus\nVite 5 / TypeScript 5"]
    end

    subgraph Gateway["API Gateway / Load Balancer"]
        LB["Nginx / Vercel Edge\nTLS termination\nRate-limit header forward\nX-Real-IP passthrough"]
    end

    subgraph APILayer["API Layer — Railway (autoscale HPA at 70% CPU)"]
        GameAPI["Game API Server\nNode.js 20 LTS / Fastify 4\n≥ 2 replicas\n/api/v1/* routes\nPlugins: pets, claim, arena,\nleaderboard, marketplace, gdpr"]
        AdminAPI["Admin API Server\nNode.js 20 LTS / Fastify 4\n1 replica\n/admin/api/* routes\nPlugins: auth, roles, pets,\nbattles, leaderboard, config,\ngdpr, audit, dashboard"]
    end

    subgraph DataLayer["Data Layer"]
        subgraph PostgreSQL["PostgreSQL 15+ — Supabase"]
            PGPrimary["Primary Writer\nAll mutations"]
            PGReplica["Read Replica\nLeaderboard reads\nPublic pet pages\nAdmin list views"]
        end
        subgraph RedisStore["Redis 7+ — Upstash (serverless)"]
            RLCounters["Rate-limit counters\nrl:claim:{email_hash}\nrl:arena:{pet_id}\nrl:code_entry:{session_id}\nrl:admin:{admin_id}"]
            Leaderboard["Leaderboard sorted set\nleaderboard:global\n(ZADD / ZRANGE REV LIMIT)"]
            Matchmaking["Matchmaking queue\nmatchmaking:queue:RACE\nmatchmaking:queue:SUMO"]
            Sessions["Admin sessions\nsession:admin:{session_id}\nTTL 14400 s (4 h — admin_session_inactivity_expiry_hours = 4)"]
            TokenBL["Token blacklist\ntoken:blacklist:{token_hash}\nTTL 259200 s (72 h — claim_token_cleanup_ttl_hours = 72)"]
            ConfigCache["Config cache\nconfig:runtime\nTTL 300 s (5 min — config_cache_refresh_time_minutes = 5)"]
        end
    end

    subgraph External["External Services"]
        SendGrid["SendGrid v3 API\nPrimary email\nSPF + DKIM\nDelivery target ≥ 98%"]
        Nodemailer["Nodemailer SMTP\nFailover after 3\nconsecutive SendGrid\nfailures"]
        GitHubActions["GitHub Actions\nCI/CD pipeline\nTest → Build → Deploy"]
        S3["S3-compatible Storage\nPostgreSQL daily backups\nSupabase automated"]
    end

    %% Actor → Frontend
    Guest -->|HTTPS| PlayerApp
    Owner -->|HTTPS| PlayerApp
    Competitor -->|HTTPS| PlayerApp
    Admin -->|HTTPS| AdminPortal

    %% Frontend → Gateway
    PlayerApp -->|HTTPS REST /api/v1/*| LB
    AdminPortal -->|HTTPS REST /admin/api/*| LB

    %% Gateway → API Servers
    LB -->|REST /api/v1/*| GameAPI
    LB -->|REST /admin/api/*| AdminAPI

    %% API Servers → Data Layer
    GameAPI -->|reads + writes| PGPrimary
    GameAPI -->|reads| PGReplica
    GameAPI -->|rate limits| RLCounters
    GameAPI -->|ZADD / ZRANGE REV LIMIT| Leaderboard
    GameAPI -->|ZADD / ZPOPMIN| Matchmaking
    GameAPI -->|token blacklist check| TokenBL
    GameAPI -->|GET config| ConfigCache

    AdminAPI -->|reads + writes| PGPrimary
    AdminAPI -->|reads| PGReplica
    AdminAPI -->|admin sessions| Sessions
    AdminAPI -->|rate limits| RLCounters
    AdminAPI -->|ZRANGE top 500 (leaderboard_admin_view = 500) / ZREM banned pets| Leaderboard
    AdminAPI -->|PUT config (invalidate)| ConfigCache

    %% API → External
    GameAPI -->|send OTP emails| SendGrid
    GameAPI -.->|failover| Nodemailer
    AdminAPI -->|send admin emails| SendGrid

    %% Data layer internals
    PGPrimary -->|streaming replication| PGReplica
    PGPrimary -->|daily backup| S3

    %% CI/CD
    GitHubActions -->|deploy containers| GameAPI
    GitHubActions -->|deploy containers| AdminAPI
    GitHubActions -->|deploy static| CDN
```

## Notes

- **Autoscale trigger**: Horizontal Pod Autoscaler fires at 70% CPU
  (`horizontal_scale_cpu_threshold_percent = 70`). Game API runs ≥ 2 replicas; Admin API runs 1
  replica (lower traffic).
- **PostgreSQL failover**: Automated failover target is 60 seconds
  (`db_autofailover_time_seconds = 60`). Connection pool: min 20 connections
  (`db_connection_pool_min_connections = 20`), max 50 (`db_connection_pool_max_connections = 50`).
- **Redis degradation posture**: If Upstash Redis is unavailable, the leaderboard falls back to a
  direct PostgreSQL read (degraded, not outage — ARCH P2, NFR-AVAIL-05). Rate-limit counters are
  fail-open (logged as alert) except OTP code entry, which is fail-closed.
- **Bundle budgets**: Player App JS ≤ 300 KB gzipped (`total_js_bundle_gzipped_kb = 300`),
  CSS ≤ 50 KB gzipped (`total_css_bundle_gzipped_kb = 50`). Phaser.js is
  dynamically imported to avoid blocking the initial claim-flow bundle.
- **Peak capacity**: 500 RPS (`peak_operation_rps = 500`), 2,000 PCU
  (`peak_concurrent_users = 2,000`). Normal operation: 100 RPS
  (`normal_operation_rps = 100`), 2,000–5,000 DAU
  (`normal_operation_dau_min = 2000`, `normal_operation_dau_max = 5000`).
- **Availability SLO**: 99.9% monthly (`availability_monthly_percent = 99.9`), equivalent to
  ≤ 43.8 minutes downtime/month (`availability_max_downtime_minutes_per_month = 43.8`).
