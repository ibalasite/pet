# EDD — Engineering Design Document
## pixel-pet-arena

DOC-ID: EDD-PIXEL-PET-ARENA-20260503
Status: DRAFT
Author: AI Generated (gendoc edd)
Created: 2026-05-03
Upstream: PRD-PIXEL-PET-ARENA-20260503, PDD-PIXEL-PET-ARENA-20260503, VDD-PIXEL-PET-ARENA-20260503, CONSTANTS-PIXEL-PET-ARENA-20260503

---

## §0. Business Constants (Key Values from CONSTANTS.md / constants.json)

The following constants are extracted directly from CONSTANTS-PIXEL-PET-ARENA-20260503 and govern all engineering decisions in this document.

| Constant | Value | Unit | Notes |
|---|---|---|---|
| PET_GENERATION_COMBINATIONS_MIN | 1,000,000,000 | combinations | Minimum unique pet generation combinations |
| PET_GENERATION_DIMENSIONS | 6 | dimensions | Attribute vector dimensions: body, head, color_palette, accessory, rarity_trait, pattern |
| PET_STAT_DEFAULT / MIN / MAX | 10 / 1 / 100 | points | speed, strength, stamina |
| PET_LEVEL_DEFAULT / MAX | 1 / 100 | level | FLOOR(training_actions / 10) |
| TRAINING_ACTIONS_PER_DAY | 3 | actions/day | Reset UTC 00:00 |
| TRAINING_NEGLECT_THRESHOLD | 3 | days | Triggers visual neglect state |
| ARENA_RATE_LIMIT_BATTLES_PER_HOUR | 10 | battles/hr (default) | Admin-tunable 1–50 |
| ARENA_MATCHMAKING_TIMEOUT | 30 | seconds | AI fallback offered |
| ARENA_MATCH_DURATION | 5–15 | seconds | Animation window |
| ARENA_BATTLE_OUTCOME_RANDOM_MODIFIER | ±15 | percent | Seeded random applied to Speed/Strength |
| ARENA_BATTLE_RECORDS_DISPLAY | 20 | battles | Last 20 shown publicly |
| LEADERBOARD_TOP_DISPLAY | 100 | pets | Public; admin sees 500 |
| LEADERBOARD_UPDATE_LAG_MAX | 30 | seconds | Redis → consistent |
| CLAIM_CODE_DIGITS | 6 | digits | One-time numeric code |
| CLAIM_CODE_EXPIRY | 15 | minutes | After generation |
| CLAIM_TOKEN_CLEANUP_TTL | 72 | hours | After creation or first use |
| PET_ACCESS_TOKEN_MIN_BYTES | 32 | bytes | URL-safe base64 random |
| CLAIM_TOKEN_MIN_ENTROPY | 32 | bytes | Cryptographically random |
| AUTH_RATE_LIMIT_CLAIM_ATTEMPTS_PER_HOUR | 5 | attempts/hr | Per email address |
| AUTH_RATE_LIMIT_CODE_ENTRY_ATTEMPTS | 10 | attempts/session | Per session |
| ADMIN_SESSION_INACTIVITY_EXPIRY | 4 | hours | Inactivity timeout |
| ADMIN_SESSION_ABSOLUTE_EXPIRY | 8 | hours | Regardless of activity |
| ADMIN_RATE_LIMIT_REQUESTS_PER_MINUTE | 100 | req/min | Per admin account |
| ADMIN_AUDIT_LOG_RETENTION | 2 | years | GDPR Art. 30 compliance |
| BOT_DETECTION_BATTLES_THRESHOLD | 50 | battles | Per 60-min rolling window (arena bot-detection system); BOT_DETECTION_WINDOW_MINUTES = 60 |
| LEADERBOARD_ADMIN_SUSPICIOUS_FLAG_BATTLES_PER_HOUR | 50 | battles/hr | Admin leaderboard UI suspicious-flag indicator (distinct purpose from bot detection) |
| HORIZONTAL_SCALE_CPU_THRESHOLD | 70 | percent | HPA scale-out trigger |
| DB_AUTOFAILOVER_TIME | 60 | seconds | PostgreSQL automated failover |
| SENDGRID_FAILOVER_CONSECUTIVE_FAILURES | 3 | failures | Switch to Nodemailer SMTP |
| NORMAL_OPERATION_RPS | 100 | RPS | Sustained |
| PEAK_OPERATION_RPS | 500 | RPS | Viral peak |
| PEAK_CONCURRENT_USERS | 2,000 | PCU | Arena events |
| DB_CONNECTION_POOL_MIN_CONNECTIONS | 20 | connections | PostgreSQL pool floor |
| CODE_MODULE_MAX_LINES | 800 | lines | Hard limit per module |
| CODE_FUNCTION_MAX_LINES | 50 | lines | Hard limit per function |
| AVAILABILITY | 99.9% | monthly | ≤43.8 min downtime/month |
| P99_API_LATENCY_READ | <200 | ms at 100 RPS | All read endpoints |
| P99_API_LATENCY_WRITE | <500 | ms at 100 RPS | Training, arena write endpoints |
| GDPR_EMAIL_DELETION_WINDOW | 7 | days | Email → SHA-256 hash |
| GDPR_EMAIL_HASHING_INTERNAL_SLA_HOURS | 24 | hours | Internal SLA for email hash completion |
| RARITY_COMMON_PERCENT / RARE / EPIC / LEGENDARY | 60 / 25 / 12 / 3 | percent | Default rarity drop weights; admin-tunable; four values must always sum to 100% |
| RARITY_MULTIPLIER_COMMON / RARE / EPIC / LEGENDARY | 1 / 2 / 4 / 8 | × | Applied in trade min-price formula: (pet_level × 100) + (rarity_multiplier × 500) |
| TRADE_TRANSACTION_FEE | 5 | percent | Platform fee on trades; within BRD-defined range of 5–10% (TRADE_FEE_RANGE_BRD_MIN_PERCENT = 5, TRADE_FEE_RANGE_BRD_MAX_PERCENT = 10) |
| FOOD_BUFF_RECORD_RETENTION | 30 | days | After expiry/consumption |
| MVP_BUDGET | 40,000 | USD | Hard constraint |

---

## §1. Executive Summary

**System Purpose**: pixel-pet-arena is an HTML5 browser-native SaaS platform where users discover, claim, train, and battle procedurally-generated pixel-art pets without creating a traditional account. The identity layer is a 6-digit OTP email claim that produces a 32-byte cryptographic URL token — users return via a bookmarked URL. A multi-mode arena, global leaderboard, and (post-MVP) marketplace complete the competitive loop.

**Tech Stack Decision**: The backend is Node.js with Fastify, chosen for its excellent TypeScript integration, schema-based validation via JSON Schema / Zod, and a plugin ecosystem well-suited to real-time concerns (WebSocket support, Redis adapters). Go (Fiber) was considered for the arena service due to higher concurrent goroutines, but at the projected peak of 500 RPS and 2,000 PCU the event loop model of Node.js with async/await is sufficient, and a single-language codebase reduces operational overhead within the MVP budget of $40,000. The frontend uses React + Vite + TypeScript. The admin portal uses Vue 3 + Element Plus + Vite — a deliberate stack separation that keeps the data-dense admin UI from coupling to the pixel-art game design system.

**Key Constraints**:
- Budget hard cap: $40,000 MVP (CONSTANTS MVP_BUDGET)
- No traditional user accounts — all identity through email OTP + URL token
- Phaser.js for game canvas rendering; React for UI chrome
- Availability SLO 99.9% monthly; peak 500 RPS; 2,000 PCU
- GDPR compliance required (email deletion within 7 days of request)
- COPPA: age-13 confirmation required; no marketing email without consent
- All numeric values sourced from CONSTANTS-PIXEL-PET-ARENA-20260503

---

## §2. System Architecture Overview

### §2.1 Component Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Client Layer (Browser)                                                         │
│                                                                                 │
│  ┌──────────────────────────────────┐   ┌─────────────────────────────────────┐│
│  │  Player App (React + Phaser.js)  │   │  Admin Portal (Vue 3 + Element Plus)││
│  │  Vite build / CDN (Vercel)        │   │  Vite build / CDN (Vercel)          ││
│  └─────────────┬────────────────────┘   └──────────────┬──────────────────────┘│
└────────────────┼──────────────────────────────────────┼─────────────────────────┘
                 │ HTTPS / REST                          │ HTTPS / REST (/admin)
                 ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  API Gateway / Load Balancer (Nginx or Vercel Edge)                             │
│  TLS termination, rate-limit headers forwarded, X-Real-IP passthrough           │
└───────────────────┬──────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
┌────────────────────┐  ┌────────────────────────┐
│  Game API Server   │  │  Admin API Server       │
│  Node.js / Fastify │  │  Node.js / Fastify      │
│  (≥2 replicas)     │  │  (1 replica, /admin ns) │
└────────┬───────────┘  └───────────┬─────────────┘
         │                          │
         │  (shared connections)    │
         ▼                          ▼
┌────────────────────────────────────────────────┐
│  Data Layer                                    │
│                                                │
│  ┌─────────────────────┐  ┌──────────────────┐ │
│  │  PostgreSQL 15+     │  │  Redis 7+         │ │
│  │  Primary (writer)   │  │  (Upstash/Railway)│ │
│  │  Read Replica       │  │  Leaderboard sets │ │
│  │  (Supabase/Railway) │  │  Rate limit ctrs  │ │
│  │  Auto-failover 60s  │  │  Session tokens   │ │
│  └─────────────────────┘  │  Matchmaking queue│ │
│                            └──────────────────┘ │
└────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│  External Services         │
│  SendGrid (email primary)  │
│  Nodemailer SMTP (fallback)│
│  S3-compatible (DB backups)│
└────────────────────────────┘
```

### §2.2 Deployment Model

- **Player App**: Static assets built by Vite and served via Vercel CDN (global edge). No SSR required; purely client-side SPA with REST API calls.
- **Admin Portal**: Same Vercel project, separate route prefix or subdomain (`admin.pixel-pet-arena.com`). Deployed as a separate Vite application.
- **API Server**: Containerized Node.js / Fastify on Railway (initial) or Fly.io. Minimum 2 replicas for HA. Horizontal autoscale at 70% CPU (HORIZONTAL_SCALE_CPU_THRESHOLD = 70%).
- **PostgreSQL**: Supabase managed PostgreSQL 15+. Primary writer + 1 read replica. Automated failover target 60 seconds (DB_AUTOFAILOVER_TIME = 60s). Daily backups to S3-compatible storage.
- **Redis**: Upstash Redis (serverless, pay-per-request) or Railway Redis. Used for leaderboard sorted sets, rate-limit counters, claim token blacklist, and matchmaking queue.
- **Email**: SendGrid v3 API primary. Nodemailer SMTP fallback activates on 3 consecutive SendGrid failures (SENDGRID_FAILOVER_CONSECUTIVE_FAILURES = 3).

---

## §3. Technology Stack

### §3.1 Backend Language & Framework

語言/框架（lang_stack）: Node.js 20 LTS + Fastify 4

Rationale: Fastify provides JSON Schema-based route validation out of the box (eliminating a middleware dependency), achieves ~30% lower overhead than Express at equivalent concurrency, has a mature plugin ecosystem for Redis, JWT, rate-limiting, and CORS, and shares TypeScript types cleanly with frontend domain models. At the projected load of 500 RPS peak and 2,000 PCU, Node.js async I/O is sufficient without the operational complexity of a Go microservice split. Both API server and admin server are Node.js / Fastify instances — separate processes sharing database credentials via environment variables.

### §3.2 Frontend Framework

**Player App**: React 18 + TypeScript 5 + Vite 5
- Phaser.js 3 for HTML5 Canvas game rendering (sprite animation, interaction physics)
- TanStack Query v5 for server state (cache, deduplication, optimistic updates)
- Zustand for ephemeral UI state (arena mode selection, claim flow step, toast queue)
- React Hook Form for claim form (email input, code entry)
- URLSearchParams for leaderboard filter/page state
- `image-rendering: pixelated` on all canvas and sprite elements

### §3.3 Database

**Primary**: PostgreSQL 15+ (Supabase managed)
- Stores all durable data: pets, claim tokens, training logs, arena matches, leaderboard snapshots, food buffs, trade records, admin users, audit log
- Read replica for leaderboard and public pet page queries (NFR-SCALE-03)
- Connection pool minimum 20 connections (DB_CONNECTION_POOL_MIN_CONNECTIONS = 20)
- Automated failover target 60 seconds (DB_AUTOFAILOVER_TIME = 60s)
- JSONB for extensible pet generation metadata (sprite seed attributes)

### §3.4 Cache / Session

**Redis 7+** (Upstash or Railway)
- Leaderboard sorted sets (ZRANGEBYSCORE, ZADD operations); authoritative source, PostgreSQL is durable backup
- Rate-limit counters: arena battles per pet per hour (TTL = 1 hour); email claim attempts per email per hour
- Pet access token blacklist (replaced pet access tokens — e.g. after recovery flow; TTL = 72 hours per CLAIM_TOKEN_CLEANUP_TTL)
- Arena matchmaking queue (Redis Sorted Set; score = enqueue epoch — see §4.8)
- Config cache: runtime parameter values refreshed every 5 minutes (CONFIG_CACHE_REFRESH_TIME = 5 min)
- Fallback: if Redis unavailable, leaderboard falls back to direct PostgreSQL read (degraded, not outage — NFR-AVAIL-05)
- Admin sessions stored server-side in Redis with 4h inactivity / 8h absolute expiry

### §3.5 Email Service

**Primary**: SendGrid API v3
- Transactional email only: claim password delivery, access-link recovery
- SPF + DKIM configured; spam complaint rate target <0.1% (CONSTANTS)
- Delivery SLO P90 ≤60 seconds (NFR-PERF-10)
- Retry queue: 3 retries over 15 minutes on delivery failure (EMAIL_DELIVERY_FAILURE_RETRIES = 3; EMAIL_DELIVERY_RETRY_WINDOW_MINUTES = 15)

**Fallback**: Nodemailer + SMTP
- Activates automatically after 3 consecutive SendGrid failures (SENDGRID_FAILOVER_CONSECUTIVE_FAILURES = 3)
- Pre-configured SMTP credentials stored in environment variables
- Vendor migration window: 14 days (VENDOR_MIGRATION_PLAN_DAYS = 14)

### §3.6 Hosting / Infrastructure

| Component | Service | Notes |
|---|---|---|
| Frontend (Player + Admin) | Vercel | Global CDN, automatic deploys from main branch |
| API servers | Railway | Containerized Node.js; autoscale at 70% CPU |
| PostgreSQL | Supabase | Managed PostgreSQL 15+, read replica, S3 backup |
| Redis | Upstash | Serverless Redis, pay-per-request, low-latency |
| CI/CD | GitHub Actions | Test → build → deploy pipeline |
| Container registry | GitHub Container Registry (ghcr.io) | Docker images for API servers |

Monthly cost at DAU ≤5,000: $50–$200 (SERVER_COST_DAU5K_MONTHLY range from CONSTANTS).

### §3.7 Admin Portal Stack

**Frontend**: Vue 3 (Composition API) + Element Plus component library + Vite 5 + TypeScript 5

Rationale for Vue 3 + Element Plus: The admin portal is data-dense (tables, forms, pagination, modals) — Element Plus provides a mature, production-grade data table with built-in sorting, filtering, and pagination that would require significant custom code in React. Vue 3's reactivity system is well-suited to form-heavy admin CRUD interfaces. Keeping the admin portal on a separate stack prevents the pixel-art CSS design system from bleeding into admin UI and enables independent deployment.

**Backend**: Same Node.js / Fastify API server, but requests arrive at `/admin/*` prefix with admin session authentication middleware applied. Admin-specific endpoints are defined in a separate Fastify plugin registered under the `/admin` prefix.

---

## §4. Data Models

All models are PostgreSQL tables unless noted. Field types use PostgreSQL notation.

### §4.1 Pet

```
Table: pets
──────────────────────────────────────────────────────
id               UUID         PRIMARY KEY DEFAULT gen_random_uuid()
seed             BIGINT       NOT NULL UNIQUE  -- procedural generation seed; globally unique
rarity           VARCHAR(10)  NOT NULL  CHECK (rarity IN ('COMMON','RARE','EPIC','LEGENDARY'))
pet_name         VARCHAR(64)  NOT NULL  -- Auto-generated from species + color combination at row creation time (seed-derived)
stat_speed       SMALLINT     NOT NULL DEFAULT 10  CHECK (stat_speed BETWEEN 1 AND 100)
stat_strength    SMALLINT     NOT NULL DEFAULT 10  CHECK (stat_strength BETWEEN 1 AND 100)
stat_stamina     SMALLINT     NOT NULL DEFAULT 10  CHECK (stat_stamina BETWEEN 1 AND 100)
level            SMALLINT     NOT NULL DEFAULT 1   CHECK (level BETWEEN 1 AND 100)
total_training_actions  INTEGER NOT NULL DEFAULT 0
last_trained_at  TIMESTAMPTZ  NULL      -- Updated on every training action; NULL if never trained; used for neglect detection
owner_token_hash VARCHAR(64)  NULL      -- SHA-256 hash of the pet access token; NULL = unclaimed
claimed_at       TIMESTAMPTZ  NULL
is_banned        BOOLEAN      NOT NULL DEFAULT FALSE
banned_reason    TEXT         NULL      CHECK (char_length(banned_reason) <= 500)
banned_at        TIMESTAMPTZ  NULL
created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
generation_meta  JSONB        NOT NULL DEFAULT '{}'  -- {body, head, color_palette, accessory, rarity_trait, pattern}
claim_identity_id UUID        NULL REFERENCES claim_identities(id) ON DELETE SET NULL -- Set at claim time; enables GDPR erasure lookup after claim_codes purge
reserved_until    TIMESTAMPTZ NULL      -- Set to NOW()+24h when pet is generated for guest preview; NULL for claimed pets; used by cleanup job
──────────────────────────────────────────────────────
INDEXES:
  idx_pets_rarity           ON pets(rarity)
  idx_pets_claimed_at       ON pets(claimed_at) WHERE claimed_at IS NOT NULL
  idx_pets_is_banned        ON pets(is_banned) WHERE is_banned = TRUE
  idx_pets_owner_token_hash ON pets(owner_token_hash) WHERE owner_token_hash IS NOT NULL
  idx_pets_last_trained_at  ON pets(last_trained_at) WHERE last_trained_at IS NOT NULL
  idx_pets_seed             ON pets(seed) -- unique, supports uniqueness check on generation
  idx_pets_claim_identity   ON pets(claim_identity_id) WHERE claim_identity_id IS NOT NULL
  idx_pets_reserved_until   ON pets(reserved_until) WHERE reserved_until IS NOT NULL  -- cleanup job target
```

Notes:
- The raw pet access token (32-byte base64 string) is NEVER stored; only the SHA-256 hash is stored. The token is transmitted once at claim time via URL.
- `level` is derived from `FLOOR(total_training_actions / PET_LEVEL_FORMULA_DIVISOR)` capped at 100; the column is updated on each training action commit.
- Seed collision on generation: application retries up to 3 times (PET_SEED_COLLISION_MAX_RETRIES = 3) before returning an error.
- **Unclaimed pet cleanup**: A background job (scheduled every 6 hours) deletes pets where `reserved_until < NOW() AND owner_token_hash IS NULL`. The 24-hour reservation window is pending CONSTANTS addition (TBD: `PET_RESERVATION_TTL_HOURS`). On claim, `reserved_until` is set to NULL.

### §4.2 User / Email (ClaimIdentity)

```
Table: claim_identities
──────────────────────────────────────────────────────
id               UUID         PRIMARY KEY DEFAULT gen_random_uuid()
email_hash       VARCHAR(64)  NOT NULL  -- SHA-256 of lowercased email; PII minimization
email_encrypted  BYTEA        NULL      -- AES-256-GCM encrypted email; set to NULL 7 days after deletion request
deletion_requested_at TIMESTAMPTZ NULL
created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
──────────────────────────────────────────────────────
INDEXES:
  idx_claim_identities_email_hash  ON claim_identities(email_hash) UNIQUE
```

Notes:
- Raw email is only held in memory during the claim transaction and in SendGrid delivery. The database stores only the encrypted form and the hash for lookup.
- On GDPR deletion request: `email_encrypted` is set to NULL, `deletion_requested_at` recorded. Background job replaces with hash-only record within 7 days (GDPR_EMAIL_DELETION_WINDOW = 7 days; system completes within 24 hours per GDPR_EMAIL_HASHING_INTERNAL_SLA_HOURS).
- IP addresses are never stored raw; hashed IP retained 90 days for abuse monitoring (IP_ADDRESS_LOG_RETENTION_DAYS = 90 days).

### §4.3 ClaimCode (OTP Token)

```
Table: claim_codes
──────────────────────────────────────────────────────
id               UUID         PRIMARY KEY DEFAULT gen_random_uuid()
pet_id           UUID         NOT NULL REFERENCES pets(id) ON DELETE CASCADE
email_hash       VARCHAR(64)  NOT NULL
code_hash        VARCHAR(64)  NOT NULL  -- SHA-256 of 6-digit OTP; never stored plaintext
expires_at       TIMESTAMPTZ  NOT NULL  -- NOW() + 15 minutes (CLAIM_CODE_EXPIRY)
used_at          TIMESTAMPTZ  NULL
attempts         SMALLINT     NOT NULL DEFAULT 0
created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
──────────────────────────────────────────────────────
INDEXES:
  idx_claim_codes_pet_id       ON claim_codes(pet_id)
  idx_claim_codes_email_hash   ON claim_codes(email_hash)
  idx_claim_codes_expires_at   ON claim_codes(expires_at)  -- for cleanup job
```

Notes:
- Code is a 6-digit numeric OTP (CLAIM_CODE_DIGITS = 6) generated with `crypto.randomInt(100000, 1000000)`. Only the hash is stored.
- Claim records are deleted by a background job 72 hours after creation or first use, whichever is later (CLAIM_TOKEN_CLEANUP_TTL = 72 hours).
- **Attempt tracking**: Redis key `rl:code_entry:{session_id}` (TTL 900s) is the authoritative rate-limit enforcer (10 attempts per session). The DB `attempts` column is informational only — incremented on each verify call for audit purposes but NOT used for enforcement. On Redis unavailability, code entry is blocked (fail-closed) to prevent bypass.

### §4.4 ArenaMatch

```
Table: arena_matches
──────────────────────────────────────────────────────
id               UUID         PRIMARY KEY DEFAULT gen_random_uuid()
pet_a_id         UUID         NOT NULL REFERENCES pets(id) ON DELETE RESTRICT  -- challenger; pet row retained for audit integrity
pet_b_id         UUID         NULL REFERENCES pets(id) ON DELETE SET NULL  -- NULL if AI opponent or if pet row removed
is_ai_opponent   BOOLEAN      NOT NULL DEFAULT FALSE
mode             VARCHAR(10)  NOT NULL CHECK (mode IN ('RACE','SUMO'))
winner_pet_id    UUID         NULL REFERENCES pets(id) ON DELETE SET NULL  -- NULL if draw (tie-break prevents this) or pet removed
random_seed      BIGINT       NOT NULL  -- seeded random for ±15% modifier reproducibility
stat_delta_a     SMALLINT     NOT NULL DEFAULT 0  -- net stat value used for pet_a after buff
stat_delta_b     SMALLINT     NOT NULL DEFAULT 0
duration_seconds SMALLINT     NOT NULL CHECK (duration_seconds BETWEEN 5 AND 15), -- CONSTANTS: arena_match_duration_min/max_seconds
battle_log       JSONB        NOT NULL DEFAULT '[]'  -- structured event sequence for replay
completed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
──────────────────────────────────────────────────────
INDEXES:
  idx_arena_matches_pet_a_id      ON arena_matches(pet_a_id)
  idx_arena_matches_pet_b_id      ON arena_matches(pet_b_id)
  idx_arena_matches_completed_at  ON arena_matches(completed_at)
  idx_arena_matches_winner        ON arena_matches(winner_pet_id)
  idx_arena_matches_pet_a_history ON arena_matches(pet_a_id, completed_at DESC)
  idx_arena_matches_pet_b_history ON arena_matches(pet_b_id, completed_at DESC)
```

Notes:
- Battle outcome uses a seeded random modifier ±15% (ARENA_BATTLE_OUTCOME_RANDOM_MODIFIER = 15%). The `random_seed` field enables deterministic replay.
- The last 20 battles per pet are shown publicly (ARENA_BATTLE_RECORDS_DISPLAY = 20); query uses `ORDER BY completed_at DESC LIMIT 20`.

### §4.5 TrainingLog

```
Table: training_logs
──────────────────────────────────────────────────────
id               UUID         PRIMARY KEY DEFAULT gen_random_uuid()
pet_id           UUID         NOT NULL REFERENCES pets(id) ON DELETE CASCADE
training_type    VARCHAR(10)  NOT NULL CHECK (training_type IN ('RUN','STRENGTH','STAMINA'))
stat_delta       SMALLINT     NOT NULL CHECK (stat_delta BETWEEN 1 AND 3)
stat_after       SMALLINT     NOT NULL
completed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
──────────────────────────────────────────────────────
INDEXES:
  idx_training_logs_pet_id        ON training_logs(pet_id)
  idx_training_logs_completed_at  ON training_logs(pet_id, completed_at DESC)
```

Notes:
- 3 training actions per day per pet (TRAINING_ACTIONS_PER_DAY = 3); the count of today's actions (UTC) is computed as `COUNT(*) WHERE pet_id = ? AND completed_at >= UTC_DATE`.
- The stat delta per action is a uniformly random integer in [1, 3] points (TRAINING_STAT_POINTS_MIN = 1, TRAINING_STAT_POINTS_MAX = 3); no formula linking delta to pet level exists in CONSTANTS.

### §4.6 LeaderboardSnapshot

```
Table: leaderboard_snapshots
──────────────────────────────────────────────────────
id               UUID         PRIMARY KEY DEFAULT gen_random_uuid()
snapshot_time    TIMESTAMPTZ  NOT NULL
entries          JSONB        NOT NULL  -- array of top 500 entries: [{rank, pet_id, pet_name, score, win_rate, rarity, level}]
──────────────────────────────────────────────────────
INDEXES:
  idx_leaderboard_snapshots_time  ON leaderboard_snapshots(snapshot_time DESC)
```

Notes:
- Snapshot stores top 500 pets (LEADERBOARD_SNAPSHOT_RETENTION_TOP_N = 500). Retention is rolling 12 months (LEADERBOARD_SNAPSHOT_RETENTION_MONTHS = 12 months).
- Live leaderboard is authoritative from Redis sorted set. Snapshots are the durable backup used for historical reporting.
- Score formula: `win_rate × battles_played × level_multiplier` (ARENA_SCORE_FORMULA from CONSTANTS).

### §4.7 FoodBuff

```
Table: food_buffs
──────────────────────────────────────────────────────
id               UUID         PRIMARY KEY DEFAULT gen_random_uuid()
pet_id           UUID         NOT NULL REFERENCES pets(id) ON DELETE CASCADE
food_type        VARCHAR(50)  NOT NULL
buff_stat        VARCHAR(10)  NOT NULL CHECK (buff_stat IN ('speed','strength','stamina'))
magnitude        SMALLINT     NOT NULL CHECK (magnitude > 0)
is_permanent     BOOLEAN      NOT NULL DEFAULT FALSE
expires_at       TIMESTAMPTZ  NULL      -- NULL for permanent buffs
consumed_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
record_expires_at TIMESTAMPTZ NOT NULL  -- consumed_at + 30 days (FOOD_BUFF_RECORD_RETENTION)
──────────────────────────────────────────────────────
INDEXES:
  idx_food_buffs_pet_id         ON food_buffs(pet_id)
  idx_food_buffs_record_expires ON food_buffs(record_expires_at)  -- for cleanup job
```

**Illustrative buff magnitudes** (from CONSTANTS multipliers section, for UI/doc purposes):
- Temporary buff example: +5 stat points for 24 hours (FOOD_BUFF_EXAMPLE_TEMP_AMOUNT_STAT_POINTS = 5; FOOD_BUFF_EXAMPLE_TEMP_DURATION_HOURS = 24)
- Permanent buff example: +3 stat points permanently (FOOD_BUFF_EXAMPLE_PERM_AMOUNT_STAT_POINTS = 3)
These are illustrative defaults — actual magnitudes are configurable via POST /api/v1/pet/:petId/feed request body.

### §4.8 Redis Key Patterns

The following are Redis key patterns (not PostgreSQL tables):

```
redis_key: rl:claim:{email_hash}         TTL: 3600s   Value: attempt count (≤5); enforces AUTH_RATE_LIMIT_CLAIM_ATTEMPTS_PER_HOUR = 5
redis_key: rl:claim:cooldown:{email_hash} TTL: 60s    Value: "1"; set when MAX_ATTEMPTS_REACHED (count = AUTH_RATE_LIMIT_CLAIM_ATTEMPTS_PER_HOUR = 5); CLAIM_EMAIL_RETRY_COOLDOWN_SECONDS = 60; HTTP 429 with Retry-After: 60 while key exists
redis_key: rl:arena:{pet_id}             TTL: 3600s   Value: battle count (≤10 default); TTL = ARENA_RATE_LIMIT_COUNTER_WINDOW_HOURS × 3600 = 3600s (ARENA_RATE_LIMIT_COUNTER_WINDOW_HOURS = 1)
redis_key: rl:code_entry:{session_id}    TTL: 900s    Value: attempt count (≤10)
redis_key: rl:code_entry:cooldown:{session_id} TTL: 60s  Value: "1"; set when MAX_ATTEMPTS_REACHED (AUTH_RATE_LIMIT_CODE_ENTRY_ATTEMPTS = 10); HTTP 429 with Retry-After: 60 while key exists
redis_key: config:runtime                TTL: 300s    Value: JSON blob of current runtime config
redis_key: leaderboard:global            NO TTL       Sorted set; score = arena_score; member = pet_id
redis_key: matchmaking:queue:{mode}      NO TTL       Redis Sorted Set (ZADD score=enqueue_epoch; ZRANGEBYSCORE for stale entry cleanup); entries older than ARENA_MATCHMAKING_TIMEOUT+15s (≈45s) are considered stale and skipped by the consumer. Entry format: `"{petId}:{enqueue_epoch_ms}"`. Consumer validates entry age before pairing and discards stale entries silently.
redis_key: rl:admin_login:{ip_hash}      TTL: 900s    Value: attempt count; enforces pre-auth IP rate limit (10 attempts per 15 min — §6.3)
redis_key: rl:admin:{admin_id}           TTL: 60s     Value: request count; enforces ADMIN_RATE_LIMIT_REQUESTS_PER_MINUTE = 100 per authenticated admin account
redis_key: session:admin:{session_id}    TTL: 14400s  Value: JSON { adminId, role, createdAt (ISO), absExpiry: createdAt+28800s }; TTL=14400s enforces inactivity; absExpiry field validated on each request for 8h absolute cap
redis_key: token:blacklist:{token_hash}  TTL: 259200s Value: "1"; used to invalidate replaced pet access tokens; TTL = 72h (CLAIM_TOKEN_CLEANUP_TTL = 72h)
```

### §4.9 AdminUser

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| username | VARCHAR(64) | NOT NULL UNIQUE | Display name for audit log |
| password_hash | TEXT | NOT NULL | bcrypt, min 12 rounds |
| totp_secret_encrypted | TEXT | NULL | Encrypted TOTP secret (set via POST /admin/api/auth/totp/setup before first authenticated login) |
| totp_backup_codes_hash | JSONB | NULL | Array of SHA-256 hashes of the 10 single-use backup codes; entry removed on use; NULL until TOTP enrollment |
| role | VARCHAR(32) | NOT NULL DEFAULT 'moderator' | 'super_admin' \| 'moderator' \| 'read_only' |
| last_login_at | TIMESTAMPTZ | NULL | |
| failed_attempts | SMALLINT | NOT NULL DEFAULT 0 | Reset on success |
| locked_until | TIMESTAMPTZ | NULL | Lockout expiry timestamp; non-NULL and in future means account is temporarily locked after repeated failed_attempts |
| deactivated_at | TIMESTAMPTZ | NULL | Soft-delete timestamp; non-NULL means account is permanently deactivated and login is blocked |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes**: idx_admin_users_username ON admin_users(username)
**Note**: Admin accounts are never hard-deleted (audit log FK requires the row to remain). "Deletion" is a soft deactivation: set `deactivated_at = NOW()`. The `DELETE /admin/api/roles/:adminId` endpoint performs a soft deactivate, not a SQL DELETE.

### §4.10 AuditLogs

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGSERIAL | PK | Sequential for log ordering |
| admin_id | UUID | NULL REFERENCES admin_users(id) ON DELETE RESTRICT | Actor; NULL for failed logins with unknown username |
| action | VARCHAR(128) | NOT NULL | e.g., 'pet.ban', 'config.arena_rate_limit' |
| target_type | VARCHAR(64) | NULL | 'pet' \| 'arena_match' \| 'leaderboard_entry' \| 'config_runtime' \| 'config_economy' \| 'gdpr_request' \| 'admin_user' |
| target_id | TEXT | NULL | UUID or key of affected entity |
| detail | JSONB | NULL | Action-specific payload |
| ip_address_hash | VARCHAR(64) | NULL | SHA-256 hash of raw IP; raw IP never stored per §4.2/§6.5; retained 90 days (IP_ADDRESS_LOG_RETENTION_DAYS = 90) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Retention**: ADMIN_AUDIT_LOG_RETENTION = 2 years.
**Indexes**: idx_audit_logs_created_at ON audit_logs(created_at DESC); idx_audit_logs_admin_id ON audit_logs(admin_id, created_at DESC)

### §4.11 TradeRecord (Phase 3 — FF_MARKETPLACE)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| listing_id | UUID | NOT NULL REFERENCES marketplace_listings(id) ON DELETE RESTRICT | Originating listing; immutable audit trail — listing row must be retained |
| pet_id | UUID | NOT NULL REFERENCES pets(id) ON DELETE RESTRICT | Pet traded (denormalised from listing for fast anti-flip queries) |
| seller_token_hash | TEXT | NOT NULL | Hashed access token of seller |
| buyer_token_hash | TEXT | NOT NULL | Hashed access token of buyer |
| price_credits | INTEGER | NOT NULL CHECK (price_credits > 0) | Food credits |
| fee_credits | INTEGER | NOT NULL CHECK (fee_credits >= 0) | 5% platform fee: floor(price_credits * 0.05); may be 0 for price_credits < 20 |
| listed_at | TIMESTAMPTZ | NOT NULL | |
| completed_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Indexes**: idx_trade_records_listing ON trade_records(listing_id); idx_trade_records_pet ON trade_records(pet_id); idx_trade_records_completed ON trade_records(completed_at DESC)

### §4.12 MarketplaceListing (Phase 3 — FF_MARKETPLACE)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | Used as listingId in API |
| pet_id | UUID | NOT NULL REFERENCES pets(id) ON DELETE RESTRICT | Pet being listed; a listed pet cannot be deleted while an active listing exists |
| seller_token_hash | TEXT | NOT NULL | Hashed seller access token (ownership verification) |
| price_credits | INTEGER | NOT NULL CHECK (price_credits > 0) | Asking price in food credits |
| status | VARCHAR(16) | NOT NULL DEFAULT 'active' | 'active' \| 'cancelled' \| 'sold' |
| listed_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | When the listing was created |
| expires_at | TIMESTAMPTZ | NULL | Optional expiry; NULL = no expiry |
| completed_at | TIMESTAMPTZ | NULL | Set when status transitions to 'sold' or 'cancelled' |

**Indexes**: idx_marketplace_listings_status ON marketplace_listings(status) WHERE status = 'active'; idx_marketplace_listings_pet ON marketplace_listings(pet_id); idx_marketplace_listings_listed_at ON marketplace_listings(listed_at DESC); `CREATE UNIQUE INDEX idx_marketplace_listings_active_pet ON marketplace_listings(pet_id) WHERE status = 'active'` — prevents duplicate concurrent active listings per pet at DB level

**Note**: Anti-flip rule (MARKETPLACE_TRADE_ANTIFLIP_PROTECTION_DAYS = 7) is enforced by checking `completed_at > NOW() - INTERVAL '7 days'` on the pet's most recent completed trade in trade_records before accepting a new listing. `completed_at` (purchase timestamp) is used — not `listed_at` — because the protection window begins when the buyer takes ownership.

**Min-price formula**: `price_credits ≥ (pet_level × TRADE_MIN_PRICE_FORMULA_LEVEL_COEFF) + (rarity_multiplier × TRADE_MIN_PRICE_FORMULA_RARITY_COEFF)` where TRADE_MIN_PRICE_FORMULA_LEVEL_COEFF = 100, TRADE_MIN_PRICE_FORMULA_RARITY_COEFF = 500, and rarity_multiplier values are: Common = 1, Rare = 2, Epic = 4, Legendary = 8 (RARITY_MULTIPLIER_COMMON/RARE/EPIC/LEGENDARY).

### §4.13 GdprRequest

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | Returned as jobId in API response |
| claim_identity_id | UUID | NOT NULL REFERENCES claim_identities(id) ON DELETE RESTRICT | Data subject (email identity); a single erasure covers all pets under this identity; RESTRICT prevents identity deletion before all GDPR requests are resolved |
| initiating_pet_id | UUID | NULL REFERENCES pets(id) ON DELETE SET NULL | Pet whose token authenticated the self-service submission; NULL for admin-initiated requests |
| request_type | VARCHAR(32) | NOT NULL | 'erasure' \| 'data_access' \| 'restrict_processing' \| 'object_leaderboard' \| 'rectification' — CHECK (request_type IN ('erasure','data_access','restrict_processing','object_leaderboard','rectification')) |
| status | VARCHAR(32) | NOT NULL DEFAULT 'pending' | 'pending' \| 'processing' \| 'completed' \| 'failed' |
| submitted_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| completed_at | TIMESTAMPTZ | NULL | |
| admin_notes | TEXT | NULL | Filled by admin on completion |

**Indexes**: idx_gdpr_requests_identity ON gdpr_requests(claim_identity_id, submitted_at DESC); idx_gdpr_requests_status ON gdpr_requests(status, submitted_at)

---

## §5. API Design

All player-facing API routes use `/api/v1/` prefix. Backward compatibility maintained for at least 1 major version (API_BACKWARD_COMPAT_VERSIONS = 1) per PRD NFR-MAINT-06. Deprecated API versions receive 90-day advance notice before removal (API_DEPRECATION_NOTICE_DAYS = 90). Admin routes are prefixed `/admin/api`. All responses use the envelope format:

```json
{
  "success": true | false,
  "data": { ... } | null,
  "error": null | { "code": "ERROR_CODE", "message": "Human-readable message" },
  "meta": { "total": number, "page": number, "limit": number }  // pagination only
}
```

HTTP status codes: 200 (success), 201 (created), 202 (async job accepted, returns jobId), 400 (bad request), 401 (unauthenticated), 403 (forbidden), 404 (not found), 408 (request timeout — matchmaking), 409 (conflict), 429 (rate limited), 500 (server error).

**Global error defaults (applies to ALL endpoints unless overridden)**: All authenticated endpoints return HTTP 401 `UNAUTHORIZED` for missing/invalid tokens. All write endpoints return HTTP 404 `NOT_FOUND` for unknown resource IDs. All endpoints return HTTP 400 `VALIDATION_ERROR` for schema violations. Admin mutation endpoints return HTTP 403 `FORBIDDEN` for insufficient role. Admin config write endpoints return HTTP 400 `OUT_OF_RANGE` when a parameter exceeds the CONSTANTS-defined admin-tunable range. `POST /admin/api/roles` returns HTTP 409 `CONFLICT` on duplicate username. Admin login returns HTTP 403 `ACCOUNT_LOCKED` when `locked_until > NOW()`.

**Player-facing endpoints — additional error defaults**: `POST /api/v1/claim` returns HTTP 404 `PET_NOT_FOUND` for unknown petId and HTTP 400 `AGE_CONFIRMATION_REQUIRED` if `ageConfirmed` is false. `POST /api/v1/pet/:petId/train` returns HTTP 403 `NOT_OWNER` for non-owner token. `POST /api/v1/arena/enter` returns HTTP 403 `PET_BANNED` for banned pets.

### §5.1 Auth / Claim Flow Endpoints

#### POST /api/v1/claim
Auth: None (rate-limited by email)
Description: Initiate the claim flow — sends 6-digit code to email.
Request: `{ email: string, petId: string, ageConfirmed: boolean }`
Response: `{ claimId: string, expiresAt: ISO8601 }`
Rate limit: 5 attempts/hour per email (AUTH_RATE_LIMIT_CLAIM_ATTEMPTS_PER_HOUR = 5). On breach: HTTP 429 with `Retry-After: 60` (CLAIM_EMAIL_RETRY_COOLDOWN_SECONDS = 60); Redis key `rl:claim:cooldown:{email_hash}` TTL 60s blocks further attempts during cooldown window.
Error: `{ code: "ALREADY_CLAIMED" }` if pet is already owned.

#### POST /api/v1/claim/verify
Auth: None (rate-limited by session)
Description: Verify 6-digit OTP and return the pet access token.
Request: `{ claimId: string, code: string }`
Response: `{ petToken: string, petId: string, petUrl: string }`
Rate limit: 10 attempts per session (AUTH_RATE_LIMIT_CODE_ENTRY_ATTEMPTS = 10). HTTP 429 after breach; 60-second cooldown.
Error codes: `INVALID_CODE`, `CODE_EXPIRED`, `MAX_ATTEMPTS_REACHED`.

#### POST /api/v1/claim/recover
Auth: None
Description: Send a recovery 6-digit code to a previously claimed pet's email address. On successful code verification via POST /api/v1/claim/verify (recovery path), the following atomic transaction executes: (i) generate new 32-byte `owner_token_hash`; (ii) write old hash to Redis `token:blacklist:{old_token_hash}` TTL=259200s (72h); (iii) replace `pets.owner_token_hash` with new hash; (iv) mark claim code `used_at`. The blacklist write ensures in-flight requests using the old token are rejected even if they arrive at the auth middleware concurrently.
Request: `{ email: string, petId: string }`
Response: `{ claimId: string, expiresAt: ISO8601 }` — always returned regardless of whether email/petId combination is found (prevents enumeration); the claimId is functional only when the email matches a claimed pet.
HTTP Response: 200 (always, including no-match case for anti-enumeration)
Errors: HTTP 400 `VALIDATION_ERROR` for malformed `email` or `petId` UUID.
Rate limit: Inherits AUTH_RATE_LIMIT_CLAIM_ATTEMPTS_PER_HOUR = 5 per email.

### §5.2 Pet Endpoints

#### GET /api/v1/pets/random
Auth: None
Description: Generate a new unclaimed random pet for guest display. Public endpoint — no authentication required; generates a guest-preview pet for display.
Request: `{}` (no body)
Response: `{ petId, seed, rarity, petName, stats: {speed, strength, stamina, level}, generationMeta, reservedUntil: ISO8601 }`
Notes: Does not persist a ClaimCode; pet is reserved in DB but ownership is unset. `reservedUntil` = `NOW() + 24h` (TBD: `PET_RESERVATION_TTL_HOURS` constant) — client should display countdown to encourage timely claiming.

#### GET /api/v1/pet/:petId
Auth: Optional (pet token in `Authorization: Bearer <token>` or `?token=` query param — used to verify ownership for write-access pages)
Description: Fetch pet data including stats, rarity, and level.
Response: `{ id, seed, rarity, petName, stats: {speed, strength, stamina, level}, isOwner: boolean, claimedAt, isNeglected: boolean }`
Notes: `isNeglected` is true if `pets.last_trained_at IS NULL OR NOW() - pets.last_trained_at > INTERVAL '3 days'` (TRAINING_NEGLECT_THRESHOLD = 3 days). Computed from the denormalized `last_trained_at` column on the pets row (no JOIN required).

#### POST /api/v1/pet/:petId/train
Auth: Required (pet owner token)
Request: `{ trainingType: 'RUN' | 'STRENGTH' | 'STAMINA' }`
Response: `{ updatedStats: {speed, strength, stamina, level}, statDelta: number, actionsRemainingToday: number }`
Errors: HTTP 400 if 3 actions already used today; HTTP 400 with `STAT_AT_MAXIMUM` if target stat = 100 (PET_STAT_MAX = 100).

#### POST /api/v1/pet/:petId/feed
Auth: Required (pet owner token)
Request: `{ buffType: string, stat: 'speed' | 'strength' | 'stamina', magnitude: number, isPermanent?: boolean }`
Response: `{ updatedStats: {speed, strength, stamina}, buffApplied: { stat, magnitude, isPermanent, expiresAt } }`
Errors: HTTP 400 if stat already at maximum; HTTP 422 if magnitude or buffType fails validation against admin-configured ranges.

### §5.3 Arena Endpoints

#### POST /api/v1/arena/enter
Auth: Required (pet owner token)
Request: `{ petId: string, mode: 'RACE' | 'SUMO', acceptAI?: boolean }`
Description: Enqueues pet in matchmaking queue (Redis). Waits up to 30 seconds (ARENA_MATCHMAKING_TIMEOUT) for an opponent. Returns battle result synchronously (HTTP long-poll) or AI result if no opponent found and `acceptAI: true`.
Response: `{ matchId: string, result: 'WIN' | 'LOSS', opponentPetId: string | null, isAiOpponent: boolean, statDelta: number, newLeaderboardScore?: number }`
Tie-breaking: If both pets have equal effective stats after the ±15% modifier, the challenger (pet with the earlier enqueue timestamp in the sorted set) wins. This is deterministic and derived from the enqueue epoch score.
Timeout (no opponent, `acceptAI: false` or omitted): HTTP 408 `{ code: "MATCHMAKING_TIMEOUT", message: "No opponent found within 30 seconds. Try again or enable AI opponent." }`. Pet's rate-limit counter is NOT incremented on timeout.
Rate limit: 10 battles/hour per pet by default (ARENA_RATE_LIMIT_BATTLES_PER_HOUR = 10); HTTP 429 + `Retry-After` header on breach.

#### GET /api/v1/arena/match/:matchId
Auth: None (public battle record)
Response: `{ matchId, mode, petA: PetSummary, petB: PetSummary, winnerId, battleLog, completedAt }`
Note: `winnerId` maps to `arena_matches.winner_pet_id`; null when no winner (should not occur after tie-break rule is applied).

#### GET /api/v1/arena/history/:petId
Auth: None (public — last 20 battles per pet are shown publicly per CONSTANTS ARENA_BATTLE_RECORDS_DISPLAY = 20)
Description: Last 20 battles for a pet.
Response: `{ petId, battles: [{matchId, mode, opponentId, result, completedAt}], summary: {wins, losses, winRate} }`

### §5.4 Leaderboard Endpoints

#### GET /api/v1/leaderboard
Auth: None
Query params: `?rarity=COMMON|RARE|EPIC|LEGENDARY&page=1&limit=100`
Response: `{ entries: [{rank, petId, petName, rarity, level, score, winRate}], lastUpdated: ISO8601, total: number }`
Notes: Top 100 for public (LEADERBOARD_TOP_DISPLAY = 100). Update lag ≤30 seconds (LEADERBOARD_UPDATE_LAG_MAX = 30s). Source: Redis sorted set.

#### GET /api/v1/leaderboard/rank/:petId
Auth: None
Response: `{ petId, rank: number | null, score: number }`
Notes: Null rank if pet is not on the leaderboard (banned or insufficient battles).

### §5.5 Admin Endpoints

All admin endpoints require admin session cookie (httpOnly, SameSite=Strict). Rate limit: 100 requests/minute per admin account (ADMIN_RATE_LIMIT_REQUESTS_PER_MINUTE = 100). All mutations write to the audit log.

**Role access summary**: `super_admin` has full access to all endpoints. `moderator` has access to all `Moderator+` endpoints (pet management, leaderboard, battles, suspicious activity, email monitor, analytics, dashboard). `read_only` has read-only (GET) access to dashboard, pet list, leaderboard, battle records, email monitor, and analytics — no mutations, no config changes, no GDPR actions, no role management.

#### POST /admin/api/auth/login
Auth: None (TOTP + password)
Request: `{ username: string, password: string, totpCode?: string }`
Response: Sets session cookie (4h inactivity / 8h absolute — ADMIN_SESSION_INACTIVITY_EXPIRY / ADMIN_SESSION_ABSOLUTE_EXPIRY)

#### POST /admin/api/auth/totp/setup
Auth: Setup token (see enrollment flow below)
Request: `{ setupToken: string, password: string }` (password re-confirmation required)
Response: `{ otpAuthUrl: string, backupCodes: string[] }` — otpAuthUrl is a `otpauth://totp/...` URI for QR scan
Description: **First-login TOTP enrollment flow**: (1) Client POSTs credentials without `totpCode`; server detects `totp_secret_encrypted IS NULL`, returns HTTP 403 `{ code: "TOTP_SETUP_REQUIRED", setupToken: "<signed-short-lived-JWT>" }`. (2) Client calls this endpoint with `setupToken` + password confirmation — no admin session exists yet. (3) Server validates setupToken signature and password, generates TOTP secret, stores encrypted in `admin_users.totp_secret_encrypted`, returns provisioning URI + 10 backup codes (hashes stored in `totp_backup_codes_hash`). (4) Admin scans QR, then performs a standard login with `totpCode` to establish a session. The `setupToken` is a signed JWT (short-lived, 15 minutes, HS256 with server secret) containing the adminId — it is not a session and grants only access to this setup endpoint.

#### POST /admin/api/auth/logout
Auth: Admin session
Description: Invalidate admin session; writes logout event to audit log

#### GET /admin/api/roles
Auth: Admin session (Super Admin)
Description: List admin users and roles

#### POST /admin/api/roles
Auth: Admin session (Super Admin)
Description: Create admin user (username, role, temp password)

#### DELETE /admin/api/roles/:adminId
Auth: Admin session (Super Admin)
Description: Soft-deactivate admin account — sets `deactivated_at = NOW()` (no SQL DELETE; audit log FK requires row retention). Login is immediately blocked for the target account.
Response: `{ success: true, auditLogId: string }`

#### POST /admin/api/roles/:adminId/totp/reset
Auth: Admin session (Super Admin)
Description: Reset TOTP for an admin account — clears `totp_secret_encrypted` and `totp_backup_codes_hash`, forcing the target admin through the TOTP enrollment flow on next login. Writes a `admin_user` audit record. Used when an admin loses their authenticator device.
Response: `{ success: true, auditLogId: string }`

#### GET /admin/api/pets
Auth: Admin session (Moderator+ or Read Only)
Query: `?page=1&limit=20&search=<petId|emailHash>&rarity=&isBanned=`
Response: `{ pets: [{id, ownerEmailMasked, rarity, level, battlesPlayed, winRate, isBanned, createdAt}], total, page, limit }`
Notes: Search by pet ID or exact SHA-256 email hash (fragment search is not possible — emails are stored as AES-256-GCM ciphertext; only hash-indexed lookup is supported). Returns up to 1 million records in ≤2 seconds (ADMIN_SEARCH_RESPONSE_TIME = 2s).

#### POST /admin/api/pets/:petId/ban
Auth: Admin session (Moderator+)
Request: `{ reason: string (max 500 chars) }`
Response: `{ success: true, auditLogId: string }`
Notes: Pet removed from leaderboard within 5 minutes of ban (LEADERBOARD_BAN_REFLECTION_TIME = 5 min).

#### POST /admin/api/pets/:petId/unban
Auth: Admin session (Moderator+)
Request: `{ reason: string }`
Response: `{ success: true, auditLogId: string }`

#### GET /admin/api/leaderboard
Auth: Admin session (Moderator+ or Read Only)
Response: Top 500 pets (LEADERBOARD_ADMIN_VIEW = 500) with suspicious flags for pets exceeding the leaderboard suspicious-flag threshold (LEADERBOARD_ADMIN_SUSPICIOUS_FLAG_BATTLES_PER_HOUR = 50 battles/hr).

#### GET /admin/api/config/runtime
Auth: Admin session (Super Admin)
Response: `{ arenaRateLimit, rarityWeights: {common, rare, epic, legendary}, arenaMatchmakingTimeout, ... }`

#### PUT /admin/api/config/runtime
Auth: Admin session (Super Admin)
Request: Runtime parameter updates (validated against admin-tunable ranges from CONSTANTS)
Response: `{ success: true }` — takes effect within 5 minutes (CONFIG_CACHE_REFRESH_TIME = 5 min).

#### GET /admin/api/config/economy
Auth: Admin session (Super Admin)
Response: `{ foodBuffMultiplierMin, foodBuffMultiplierMax, arenaEntryCostDefault, arenaEntryCostMax, arenaEntryCooldownMin, arenaEntryCooldownMax }` — current economy configuration values.

#### PUT /admin/api/config/economy
Auth: Admin session (Super Admin)
Request: Economy parameter updates (food buff multiplier range 0.5×–5.0× — FOOD_BUFF_MULTIPLIER_ADMIN_MIN/MAX; arena entry cost 0–10 credits — ARENA_ENTRY_COST_FOOD_CREDITS_DEFAULT/ADMIN_MAX; arena entry cooldown 0–60 min — ARENA_ENTRY_COOLDOWN_ADMIN_MIN/MAX_MINUTES)
Response: `{ success: true }` — takes effect within 5 minutes (CONFIG_CACHE_REFRESH_TIME = 5 min).

#### GET /admin/api/dashboard
Auth: Admin session (Moderator+ or Read Only)
Response: `{ claimedPetsToday, activeBattlesToday, pendingGdprRequests, dailyActiveUsers, errorRateLast5Min, emailDeliveryRate, systemStatus: "healthy"|"degraded"|"down" }`
Description: Real-time dashboard summary — all values from Redis counters and PostgreSQL aggregates.

#### GET /admin/api/battles
Auth: Admin session (Moderator+ or Read Only)
Query: `?page=1&limit=20&from=ISO8601&to=ISO8601&petId=&flagged=true|false`
Response: `{ battles: [{matchId, petAId, petBId, winnerId, outcome, duration, completedAt, isFlagged}], total, page, limit }`
Description: Battle Records list view — paginated; last ARENA_BATTLE_RECORDS_DISPLAY = 20 shown by default.

#### GET /admin/api/suspicious
Auth: Admin session (Moderator+)
Response: `{ suspiciousPets: [{petId, battlesLastHour, winRate, flagCount, lastFlaggedAt}] }`
Description: Pets exceeding BOT_DETECTION_BATTLES_THRESHOLD = 50 battles per 60-minute window.

#### GET /admin/api/email/monitor
Auth: Admin session (Moderator+ or Read Only)
Response: `{ emailsSentLast24h, deliverySuccessRate, bounceRate, spamComplaintRate, failoverActive: boolean }`
Description: Email delivery health monitor — delivery rate, bounce/spam stats from SendGrid webhook logs.

#### GET /admin/api/analytics
Auth: Admin session (Moderator+ or Read Only)
Query: `?from=ISO8601&to=ISO8601&metric=dau|claims|arena_battles|leaderboard_uvs`
Response: `{ metric, dataPoints: [{date, value}], summary: { total, average, peak } }`
Description: Product analytics — DAU, claim funnel, arena engagement, leaderboard unique visitors.

#### GET /admin/api/gdpr
Auth: Admin session (Super Admin)
Query: `?page=1&limit=20&status=pending|processing|completed|failed&type=erasure|data_access|restrict_processing|object_leaderboard|rectification`
Response: `{ requests: [{id, requestType, status, submittedAt, completedAt, adminNotes}], total, page, limit }`
Description: List all GDPR requests in the gdpr_requests table for the admin GDPR Queue module.

#### POST /admin/api/gdpr/delete
Auth: Admin session (Super Admin)
Request: `{ emailHash: string, reason: string (max 500 chars — ADMIN_MODERATION_REASON_MAX_CHARS) }`
Response: `{ jobId: string, estimatedCompletion: ISO8601 }`
Notes: Email → SHA-256 hash within 24 hours (GDPR_EMAIL_HASHING_INTERNAL_SLA_HOURS); reported compliant within 7 days (GDPR_EMAIL_DELETION_WINDOW). `reason` is stored in `gdpr_requests.admin_notes` on row creation.

#### PATCH /admin/api/gdpr/:requestId
Auth: Admin session (Super Admin)
Description: Update the status of a non-erasure GDPR request (data_access, restrict_processing, object_leaderboard, rectification). Used by the admin GDPR Queue module to transition requests through their lifecycle. For rectification, admin fulfills by updating the subject's claim_identities.email_encrypted field, then marks status completed.
Request: `{ status: "processing" | "completed" | "failed", adminNotes?: string (max 500 chars) }`
Response: `{ success: true, requestId: string, status: string, updatedAt: ISO8601 }`
Notes: `admin_notes` is written to `gdpr_requests.admin_notes`. Audit log entry created on each transition. Erasure requests are processed via POST /admin/api/gdpr/delete, not this endpoint. Error: HTTP 400 `WRONG_REQUEST_TYPE` if the target `request_type = 'erasure'`.

#### POST /admin/api/battles/:matchId/flag
Auth: Admin session (Moderator+)
Request: `{ reason: string (max 500 chars) }`
Description: Flag a battle as suspicious; writes to audit log; increments bot_detection counter

#### DELETE /admin/api/battles/:matchId/flag
Auth: Admin session (Moderator+)
Request: `{ reason: string (max 500 chars) }`
Description: Remove a flag from a battle; reason recorded in audit log

#### GET /admin/api/audit
Auth: Admin session (Super Admin)
Query: `?page=1&limit=50&from=ISO8601&to=ISO8601&actorId=&action=`
Response: Audit log entries; search any 12-month window in ≤3 seconds (ADMIN_AUDIT_LOG_SEARCH_RESPONSE_TIME = 3s).

### §5.6 GDPR Self-Service Endpoints

No persistent accounts exist — players identify via pet token. GDPR requests are submitted via the pet token endpoint.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/gdpr/request` | Pet token | Submit a GDPR request (erasure / data-access / restrict-processing / object-leaderboard / rectification) |
| `GET` | `/api/v1/gdpr/request/status?jobId=<uuid>` | Pet token | Check status of a specific GDPR request by jobId |

**Request body** (`POST /api/v1/gdpr/request`):
```json
{ "type": "erasure" | "data_access" | "restrict_processing" | "object_leaderboard" | "rectification" }
```
Auth: `Authorization: Bearer <petToken>` header (same pattern as all other authenticated player endpoints). The server resolves the token hash to the `pets` row, then reads `pets.claim_identity_id` to identify the GDPR data subject and create a `gdpr_requests` row scoped to that `claim_identities` record.

**Response** (`POST /api/v1/gdpr/request`): HTTP 202 `{ jobId: string, message: string }`

**Response** (`GET /api/v1/gdpr/request/status?jobId=<uuid>`): HTTP 200 `{ jobId, requestType, status, submittedAt, completedAt | null }`. The server validates that the authenticating pet token's `claim_identity_id` matches the `gdpr_requests.claim_identity_id` for the given jobId before returning the status (prevents cross-identity status polling).

**SLAs** (from CONSTANTS):
- Erasure: `GDPR_EMAIL_DELETION_WINDOW = 7 days`
- Data access/portability: `GDPR_DATA_ACCESS_RESPONSE_DAYS = 30`
- Restrict processing: `GDPR_RESTRICT_PROCESSING_RESPONSE_HOURS = 24`
- Object leaderboard: `GDPR_OBJECT_LEADERBOARD_RESPONSE_BUSINESS_DAYS = 5` — the subject's pet entries are removed from the public leaderboard within 5 business days of request (admin-reviewed; the leaderboard objection right is not absolute under GDPR Art. 21 but is resolved in 5 business days as policy)
- Rectification: `GDPR_EMAIL_RECTIFICATION_RESPONSE_HOURS = 24` — email encrypted field updated within 24 hours of request; applies when the user needs to correct stored email data

Requests are queued and processed by the admin portal GDPR module. Confirmation sent to the email on file (if not yet erased).

### §5.7 Marketplace Endpoints (Phase 3 — FF_MARKETPLACE required)

Write endpoints require pet access token auth. `GET /listings` is public (unauthenticated browsing). Active only when `FF_MARKETPLACE=true`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/marketplace/listings` | Public | Browse active listings (paginated, sort by price/rarity/level) |
| `POST` | `/api/v1/marketplace/listings` | Pet token | Create listing (min price enforced: level × 100 + rarity_multiplier × 500; 7-day anti-flip check on last completed trade — MARKETPLACE_TRADE_ANTIFLIP_PROTECTION_DAYS = 7) |
| `DELETE` | `/api/v1/marketplace/listings/:listingId` | Pet token (owner only) | Cancel own listing |
| `POST` | `/api/v1/marketplace/listings/:listingId/buy` | Pet token | Purchase listing; 5% fee deducted from seller proceeds |
| `GET` | `/api/v1/marketplace/history/:petId` | Pet token | Trade history for a pet (private — trade prices are commercial-in-confidence; intentionally differs from public arena battle history) |

**Fee**: TRADE_TRANSACTION_FEE = 5% deducted from seller, credited to platform. This rate is within the BRD-defined acceptable range: TRADE_FEE_RANGE_BRD_MIN_PERCENT = 5% to TRADE_FEE_RANGE_BRD_MAX_PERCENT = 10%. Future fee adjustments must remain within this range.
**Anti-flip**: MARKETPLACE_TRADE_ANTIFLIP_PROTECTION_DAYS = 7 days between purchase and re-listing.
**Rate limit**: Inherits arena/pet rate limits; no separate marketplace rate limit in CONSTANTS.

---

## §6. Security Design

### §6.1 Pet Access Token Model

The pet access token is a 32-byte cryptographically random value encoded as URL-safe base64 (minimum entropy: 32 bytes — PET_ACCESS_TOKEN_MIN_BYTES = 32). It is:
- Generated once at successful claim completion using `crypto.randomBytes(32)`
- Transmitted exactly once in the URL reveal screen at `/claim` completion
- Never stored in plaintext in the database — only its SHA-256 hash is stored in `pets.owner_token_hash`
- Passed on subsequent requests via `Authorization: Bearer <token>` header or `?token=` query parameter
- Verified by hashing the received value and comparing to `owner_token_hash`
- Revocable by admin: setting `owner_token_hash = NULL` immediately invalidates access

Token recovery: Users who lose their URL may request a new access link via POST `/api/v1/claim/recover`. A new 6-digit claim code is sent; on verification, a new 32-byte token is issued and the old hash is replaced atomically.

### §6.2 Claim Code Flow

1. User submits email and pet ID to `POST /api/v1/claim`
2. System checks rate limit: ≤5 attempts/hour per email (AUTH_RATE_LIMIT_CLAIM_ATTEMPTS_PER_HOUR = 5)
3. 6-digit numeric OTP generated with `crypto.randomInt(100000, 1000000)`
4. OTP hash (SHA-256) stored in `claim_codes` with `expires_at = NOW() + 15min` (CLAIM_CODE_EXPIRY = 15 min)
5. Email dispatched via SendGrid containing ONLY the 6-digit code — no clickable URLs (mitigates email client pre-scanning attacks documented in IDEA.md §8.1 R1)
6. User manually enters code in browser; verified against hash
7. On valid entry: atomic DB transaction — (a) upsert `claim_identities` row for the email_hash (creating if first claim, matching if re-claiming same email), (b) set `pets.claim_identity_id = claim_identities.id`, (c) generate 32-byte pet access token, store SHA-256 hash in `pets.owner_token_hash`, (d) set `pets.claimed_at = NOW()`, (e) mark claim code `used_at`, (f) set `pets.reserved_until = NULL`
8. Claim code records deleted by background job 72 hours after creation or first use, whichever is later (CLAIM_TOKEN_CLEANUP_TTL = 72 hours)
9. Rate limit on code entry: 10 attempts per session (AUTH_RATE_LIMIT_CODE_ENTRY_ATTEMPTS = 10); 60-second cooldown on breach

### §6.3 Admin Authentication

- Credentials: username + bcrypt password hash (work factor ≥12) + TOTP (RFC 6238, 6-digit, 30-second window)
- Session: server-side Redis session with httpOnly + SameSite=Strict cookie
- Inactivity expiry: 4 hours (ADMIN_SESSION_INACTIVITY_EXPIRY = 4h)
- Absolute expiry: 8 hours regardless of activity (ADMIN_SESSION_ABSOLUTE_EXPIRY = 8h)
- Rate limit: 100 requests/minute per admin account (ADMIN_RATE_LIMIT_REQUESTS_PER_MINUTE = 100) — applies to authenticated sessions only
- **Pre-authentication rate limit**: `POST /admin/api/auth/login` is rate-limited by IP address: 10 attempts per 15 minutes; HTTP 429 on breach. Redis key: `rl:admin_login:{ip_hash}` TTL 900s. (Constants TBD: `ADMIN_LOGIN_IP_RATE_LIMIT_ATTEMPTS`, `ADMIN_LOGIN_IP_RATE_LIMIT_WINDOW_SECONDS`)
- **Account lockout**: After 10 consecutive `failed_attempts` on a valid username, the account is locked for 30 minutes (`deactivated_at` is NOT used for lockout — a separate `locked_until TIMESTAMPTZ NULL` column is set). Login returns HTTP 403 `{ code: "ACCOUNT_LOCKED", unlockedAt: ISO8601 }`. Lockout resets on successful login. (Constants TBD: `ADMIN_LOGIN_LOCKOUT_THRESHOLD`, `ADMIN_LOGIN_LOCKOUT_DURATION_MINUTES`)
- All admin auth events (login, logout, failed attempt) written to audit log
- **First-login TOTP enrollment**: New admin accounts have `totp_secret_encrypted = NULL`. On first login attempt (correct username+password but no TOTP secret), the login endpoint returns HTTP 403 `{ code: "TOTP_SETUP_REQUIRED", setupToken: "<signed-short-lived-JWT>" }`. The admin client uses this `setupToken` to call `POST /admin/api/auth/totp/setup` (no session exists yet — setup token is the auth mechanism). After TOTP setup, the admin performs a standard login with `totpCode` to establish a session. All subsequent logins require a valid `totpCode`. There is no path to an authenticated session without completing TOTP enrollment.

### §6.4 Rate Limiting Summary

| Endpoint / Feature | Limit | Window | Storage | HTTP Response |
|---|---|---|---|---|
| Email claim initiation | 5 | per hour per email | Redis TTL 3600s | HTTP 429 + Retry-After |
| Claim code entry | 10 | per session | Redis TTL 900s | HTTP 429 + 60s cooldown |
| Arena battles per pet | 10 (default; 1–50 admin) | per hour per pet | Redis TTL 3600s | HTTP 429 + Retry-After |
| Admin login (pre-auth, per IP) | 10 (TBD constant) | per 15 minutes per IP | Redis TTL 900s | HTTP 429 |
| Admin portal requests | 100 | per minute per admin | Redis TTL 60s | HTTP 429 |
| Health endpoint | No limit | — | N/A | 200 always |

All rate limit keys are stored in Redis. The Redis counter TTL equals the window duration. On TTL expiry the counter resets automatically. If Redis is unavailable, rate limiting degrades gracefully (counters not enforced — logged as an alert).

### §6.5 GDPR / Data Handling Summary

- **Data minimization**: Only email hash + encrypted email stored. Raw email never written to database or logs.
- **Right to erasure**: Email encrypted field nulled within 24 hours of request; SHA-256 hash retained for anti-re-registration. All pets belonging to the erased identity are removed from the `leaderboard:global` Redis sorted set (`ZREM leaderboard:global <pet_id>` for each pet) as part of the erasure job. Full compliance SLA: 7 days (GDPR_EMAIL_DELETION_WINDOW = 7 days).
- **Right of access / portability**: JSON export of pet data, battle records, training logs delivered within 30 days (GDPR_DATA_ACCESS_RESPONSE_DAYS = 30 / GDPR_DATA_PORTABILITY_RESPONSE_DAYS = 30).
- **Right to restrict processing**: Applied within 24 hours (GDPR_RESTRICT_PROCESSING_RESPONSE_HOURS = 24).
- **Right to object (leaderboard)**: Pet entries removed from public leaderboard within 5 business days of request (GDPR_OBJECT_LEADERBOARD_RESPONSE_BUSINESS_DAYS = 5). On fulfillment, `ZREM leaderboard:global <pet_id>` executed for each pet belonging to the identity. Admin-reviewed; objection is not absolute under GDPR Art. 21 but resolved as policy.
- **Right to rectification (Art. 16)**: Email encrypted field updated within 24 hours of request (GDPR_EMAIL_RECTIFICATION_RESPONSE_HOURS = 24). Applies when data subject needs to correct stored email data.
- **IP addresses**: Hashed on ingress; raw IP never written. Retained 90 days (IP_ADDRESS_LOG_RETENTION_DAYS = 90 days).
- **COPPA**: Age-13 confirmation checkbox required on claim form; label text: "I confirm I am at least 13 years old" (PRD §5 US-AUTH-001 AC-003-8). Minors not targeted.
- **Audit log**: All admin actions logged for 2 years (ADMIN_AUDIT_LOG_RETENTION = 2 years).
- **CAN-SPAM**: All emails are transactional; no marketing email without separate opt-in consent.
- **GDPR FK lookup**: The `pets.claim_identity_id` FK enables the GDPR self-service endpoint to locate the `claim_identities` row for a given pet token without depending on the ephemeral `claim_codes` table (purged after CLAIM_TOKEN_CLEANUP_TTL = 72h).

---

## §7. Non-Functional Requirements Implementation

### §7.1 SLO Targets

| Metric | Target | Source |
|---|---|---|
| Availability | 99.9% monthly (≤43.8 min downtime) | CONSTANTS §4 |
| P99 API Latency (read) | <200 ms at 100 RPS | CONSTANTS §4 |
| P99 API Latency (write) | <500 ms at 100 RPS | CONSTANTS §4 |
| FCP | <1.5 seconds | CONSTANTS §4 |
| LCP | <2.5 seconds | CONSTANTS §4 |
| CLS | <0.1 | CONSTANTS §4 |
| INP | <200 ms | CONSTANTS §4 |
| Pet animation frame rate | ≥30 FPS sustained | CONSTANTS §4 |
| Pet canvas render on load | ≤2 seconds | CONSTANTS §4 |
| Pet interaction response | ≤200 ms | CONSTANTS §4 |
| Arena battle result E2E | <2 seconds | CONSTANTS §4 |
| Leaderboard update lag | ≤30 seconds | CONSTANTS §4 |
| Email delivery P90 | ≤60 seconds | CONSTANTS §4 |
| Error rate | <1% per 5-minute window | CONSTANTS §4 |

### §7.2 Performance Strategy

**API layer**:
- Fastify's JSON serialization via `fast-json-stringify` for schema-defined responses
- TanStack Query client-side caching (30-second stale time globally)
- Leaderboard served from Redis sorted set (O(log N) ZRANGEBYSCORE operations)
- Public pet pages use read replica for SELECT queries (NFR-SCALE-03)
- Connection pool min 20 connections (DB_CONNECTION_POOL_MIN_CONNECTIONS = 20); pool managed by `pg` with `max: 50`

**CDN / Frontend**:
- Vite code splitting: Phaser.js dynamically imported to avoid blocking the claim flow bundle
- JS bundle budget: <300 KB gzipped (CONSTANTS §4 bundle limit — App page type)
- CSS bundle budget: <50 KB gzipped
- `font-display: swap` for both fonts (Press Start 2P + Inter)
- Preload only Press Start 2P (above-fold); Inter loads async
- `image-rendering: pixelated` on sprite canvas; no oversized source images
- AVIF/WebP for any raster assets with fallbacks

**Database**:
- All high-frequency read paths (leaderboard, public pet) use read replica
- Composite indexes on `(pet_id, completed_at DESC)` for training log and battle history queries
- `EXPLAIN ANALYZE` gate in CI for any new query touching tables >10k rows

### §7.3 Scalability

- **Horizontal scaling**: API server replicas autoscale at 70% CPU (HORIZONTAL_SCALE_CPU_THRESHOLD = 70%). Railway autoscaling or Kubernetes HPA.
- **Peak load**: 500 RPS sustained, 2,000 PCU arena events (PEAK_OPERATION_RPS / PEAK_CONCURRENT_USERS from CONSTANTS).
- **Arena matchmaking**: Redis Sorted Set queue (score = enqueue epoch); consumer uses ZRANGEBYSCORE to pop the oldest eligible entry. Stale entries (>45s old = ARENA_MATCHMAKING_TIMEOUT + 15s buffer) are discarded before pairing to prevent ghost matches from abandoned connections. Supports 100 concurrent match entries without degradation (ARENA_MATCHMAKING_CONCURRENT_ENTRIES = 100).
- **Leaderboard**: Redis sorted set as authoritative real-time source; PostgreSQL snapshot as durable backup. Update lag ≤30 seconds.
- **Pet generation concurrency**: 1,000 concurrent pet generations complete within 10 seconds (PET_GENERATION_CONCURRENT_BATCH = 1,000; PET_GENERATION_CONCURRENT_BATCH_TIME = 10s).
- **Database**: Primary writer handles all mutations. Read replica handles leaderboard, public pet pages, and admin list views. Connection pool allows burst to 50 connections.

---

## §8. Frontend Architecture

### §8.1 Component Hierarchy

```
App
├── Layout
│   ├── NavBar (hasPetToken prop drives "My Pet" visibility)
│   └── Router (React Router v6)
│       ├── LandingPage (/)
│       │   ├── PetCanvas (Phaser.js instance — isolated in PetCanvasEngine)
│       │   ├── RarityHint
│       │   ├── ClaimCTA
│       │   └── SocialProofCounter
│       ├── ClaimPage (/claim)
│       │   └── ClaimFlow (compound)
│       │       ├── ClaimEmailForm (React Hook Form)
│       │       ├── ClaimCodeForm (React Hook Form)
│       │       └── URLReveal
│       ├── PetPage (/pet/:petId)
│       │   ├── PetCanvas
│       │   ├── RarityBadge
│       │   ├── StatsPanel → StatBar ×3
│       │   ├── TrainingEntry
│       │   ├── FoodInventory → FoodItem ×N
│       │   ├── ArenaEntry
│       │   └── NeglectedState (conditional)
│       ├── TrainingPage (/pet/:petId/train)
│       │   ├── TrainingActions → TrainingActionCard ×3
│       │   ├── StatChangeIndicator (visible for 2 seconds after training action — TRAINING_STAT_DISPLAY_DURATION_SECONDS = 2)
│       │   ├── DailyResetTimer
│       │   └── TrainingStreak
│       ├── BattleRecordsPage (/pet/:petId/records)
│       │   ├── PetSummaryCard
│       │   └── BattleHistoryTable (last 20 — ARENA_BATTLE_RECORDS_DISPLAY = 20)
│       ├── ArenaPage (/arena)
│       │   ├── ModeSelector (RACE / SUMO)
│       │   ├── MatchmakingQueue
│       │   └── BattleAnimation (Phaser.js scene)
│       ├── BattleResultPage (/arena/result/:battleId)
│       │   └── BattleResultCard (WIN / LOSS variants)
│       ├── LeaderboardPage (/leaderboard)
│       │   ├── RarityFilter
│       │   ├── LeaderboardTable → LeaderboardRow ×100
│       │   └── OwnerRankBanner (if pet token present)
│       └── MarketplacePage (/marketplace — FF_MARKETPLACE only)
```

### §8.2 State Management Approach

Per PDD §13.4, the frontend uses four tiers:

| Tier | Library | Scope | Examples |
|---|---|---|---|
| Server state | TanStack Query v5 | Remote API data; `staleTime: 30_000` | Pet stats, leaderboard, battle history |
| Client state | Zustand | Ephemeral UI; single store with slices | Arena mode, claim flow step, toast queue |
| URL state | URLSearchParams / route segments | Shareable / bookmarkable state | Leaderboard rarity filter, page number |
| Form state | React Hook Form | Controlled inputs with Zod validation | ClaimEmailForm, ClaimCodeForm |

Cache invalidation rules:
- `usePet` cache invalidated on successful `submitTraining` or `useFood` mutation
- `useLeaderboard` refetches every 30 seconds via TanStack Query `refetchInterval`
- Admin portal (Vue 3) uses Pinia for state management — see §9.1; no cache is shared between player app and admin portal

### §8.3 Pixel Art Rendering

- **Engine**: Phaser.js 3 embedded as a React component via `PetCanvasEngine` class
- **Canvas API**: `image-rendering: pixelated` + `image-rendering: crisp-edges` CSS applied to the canvas element
- **Sprite sheets**: 32×32px per frame (provisional — see §14 OQ-E01 for resolution; implementation passes `SPRITE_RESOLUTION_PX` as a config constant to avoid hard-coding), PNG format with transparency.
- **Animation loop**: `requestAnimationFrame` via Phaser's internal scene update; target ≥30 FPS sustained on mid-range devices (NFR-PERF-07)
- **Procedural generation**: Pet seed → 6-dimension attribute vector (body, head, color_palette, accessory, rarity_trait, pattern) → sprite sheet frame selection. Seed is stored in `pets.seed`; rendering is deterministic from seed. Combination space ≥1,000,000,000 (PET_GENERATION_COMBINATIONS_MIN). Rarity is assigned via weighted random at generation time: Common 60%, Rare 25%, Epic 12%, Legendary 3% (RARITY_COMMON/RARE/EPIC/LEGENDARY_PERCENT); weights are admin-tunable via runtime config but must always sum to 100%.
- **Reduced motion**: `prefers-reduced-motion: reduce` detection — static sprite replaces animation loop; no particle effects.
- **Fallback**: If WebGL unavailable, Canvas 2D fallback rendering with static sprite image.
- **Phaser.js isolation**: Only `PetCanvasEngine` imports Phaser. No other component or hook may import Phaser directly.

### §8.4 Accessibility Requirements

WCAG 2.1 AA compliance enforced in the player app:

| Requirement | Target | Constant |
|---|---|---|
| Focus indicator contrast | ≥3:1 | A11Y_FOCUS_CONTRAST_RATIO = 3:1 |
| Normal text contrast | ≥4.5:1 | A11Y_TEXT_CONTRAST_NORMAL = 4.5:1 |
| Large text contrast (≥18pt or bold ≥14pt) | ≥3:1 | A11Y_TEXT_CONTRAST_LARGE = 3:1 |
| OTP countdown warning | Display when ≤2 minutes remain | A11Y_CLAIM_CODE_WARNING_BEFORE_EXPIRY_MINUTES = 2 |

The claim flow displays a visible warning with sufficient contrast when the 6-digit OTP has ≤2 minutes remaining (A11Y_CLAIM_CODE_WARNING_BEFORE_EXPIRY_MINUTES). Reduced-motion media query respected in §8.3. All interactive elements have ARIA labels.

### §8.5 Build Toolchain

| Tool | Version | Role |
|---|---|---|
| Vite | 5.x | Build tool, HMR, code splitting |
| TypeScript | 5.x | Type safety across player app |
| React | 18.x | UI framework |
| Phaser.js | 3.x | Game canvas engine (dynamically imported) |
| TanStack Query | 5.x | Server state management |
| Zustand | 4.x | Client state management |
| React Hook Form | 7.x | Form state |
| Zod | 3.x | Runtime schema validation (shared with backend) |
| Playwright | 1.x | E2E tests, visual regression at 320/768/1024/1440px |
| Vitest | 1.x | Unit and integration tests |

---

## §9. Admin Portal Architecture

### §9.1 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | Vue 3 (Composition API) | Deliberate separation from player app |
| UI component library | Element Plus | Data tables, forms, pagination, modals |
| Build tool | Vite 5 + TypeScript 5 | Same version parity as player app |
| HTTP client | Axios | With request/response interceptors for session expiry |
| State management | Pinia | Vue-native, Composition API compatible |
| Charts (analytics) | ECharts (via vue-echarts) | Battle trends, claim funnel, DAP metrics |

The admin portal is deployed as a separate Vite application. It shares backend API infrastructure with the player app but connects only to `/admin/api/*` endpoints. Admin sessions are Redis-backed server-side sessions with httpOnly cookies — no JWT tokens used for admin auth to reduce token exposure risk.

### §9.2 Key Admin Features

| Module | Route | Key Functionality | Role Required |
|---|---|---|---|
| Dashboard | /admin/dashboard | Real-time DAP, battles/hour, claim funnel, GDPR queue | Moderator+ / Read Only |
| Pet Management | /admin/pets | Paginated list, search by ID/email, ban/unban with reason | Moderator+ / Read Only (GET only) |
| Leaderboard | /admin/leaderboard | Top 500 view, suspicious flag indicators, remove/restore | Moderator+ / Read Only (GET only) |
| Battle Records | /admin/battles | Flag suspicious matches, view battle logs | Moderator+ / Read Only (GET only) |
| Suspicious Activity | /admin/suspicious | Auto-flagged pets (>50 battles/60min), triage queue | Moderator+ |
| GDPR Queue | /admin/gdpr | Process all GDPR requests (erasure, data access, restrict processing, object leaderboard, rectification), audit trail | Super Admin |
| Runtime Config | /admin/config/runtime | Arena rate limits, rarity weights, matchmaking timeout | Super Admin |
| Economy Config | /admin/config/economy | Food buff multipliers (0.5×–5.0×), arena entry cost/cooldown | Super Admin |
| Email Monitor | /admin/email | SendGrid delivery status, bounce rates, spam complaints | Moderator+ / Read Only |
| Analytics | /admin/analytics | DAP trend, claim conversion, retention cohorts | Moderator+ / Read Only |
| Audit Log | /admin/audit | Full immutable audit trail, 2-year retention | Super Admin |
| Roles | /admin/roles | Admin account management, TOTP reset | Super Admin |

### §9.3 Admin-Specific Security

- **Rate limit**: 100 requests/minute per admin account (ADMIN_RATE_LIMIT_REQUESTS_PER_MINUTE = 100), separately tracked from player API
- **Session security**: Redis server-side session; httpOnly + SameSite=Strict cookies; 4h inactivity / 8h absolute expiry
- **Audit log**: Every create/update/delete/moderation action generates an audit record with actor ID, action type, target entity, reason, and timestamp. Retention: 2 years (ADMIN_AUDIT_LOG_RETENTION = 2 years). Search response for any 12-month window: ≤3 seconds (ADMIN_AUDIT_LOG_SEARCH_RESPONSE_TIME = 3s).
- **Moderation reason field**: Max 500 characters, required for all ban/unban/flag actions (ADMIN_MODERATION_REASON_MAX_CHARS = 500)
- **TOTP**: RFC 6238 required for admin login; 6-digit, 30-second window; backup codes generated on setup
- **IP allowlist**: Admin portal optionally restricted to operator IP ranges via environment variable configuration
- **Performance**: Pages load in ≤3 seconds with up to 1 million pet records (ADMIN_PAGE_LOAD_TIME = 3s); single moderator can handle 100 moderation actions/day without degradation (ADMIN_DAILY_MODERATION_ACTIONS_CAPACITY = 100)

---

## §10. Infrastructure & Deployment

### §10.1 Environment Strategy

| Environment | Purpose | Database | Redis | Notes |
|---|---|---|---|---|
| `development` | Local development | PostgreSQL (Docker Compose) | Redis (Docker Compose) | `.env.local`; hot reload via Vite |
| `staging` | Pre-production validation | Supabase staging project | Upstash staging | Auto-deployed on `main` branch merge |
| `production` | Live serving | Supabase production | Upstash production | Manual promotion from staging |

Environment variables managed via Vercel environment settings and Railway secret management. No secrets in source code or Docker images.

### §10.2 Docker / Container Approach

```dockerfile
# API Server Dockerfile (simplified)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
```

- Multi-stage build to minimize image size (<150 MB target)
- Non-root user in runtime stage
- Health check endpoint: `GET /health` must respond in ≤500 ms (HEALTH_CHECK_RESPONSE_TIME = 500ms)
- Container registry: GitHub Container Registry (ghcr.io)
- Resource limits: 512 MB RAM, 0.5 CPU per replica baseline; autoscale up to 2 GB / 2 CPU

### §10.3 CI/CD Overview

```
GitHub Actions Pipeline:
  on: push to main / pull_request

  jobs:
    test:
      - pnpm install
      - pnpm run type-check
      - pnpm run lint
      - pnpm run test:unit (Vitest)
      - pnpm run test:integration (Vitest + test DB)

    build:
      needs: test
      - pnpm run build (Vite)
      - docker build + push to ghcr.io

    deploy-staging:
      needs: build
      on: push to main
      - Deploy API to Railway (staging)
      - pnpm run db:migrate --env staging (node-pg-migrate; idempotent; runs pending migrations only)
      - Deploy frontend to Vercel (staging)
      - Run smoke tests (Playwright)

    deploy-production:
      needs: deploy-staging
      on: manual approval (GitHub Environments)
      - Deploy to production
      - pnpm run db:migrate --env production
      - Run smoke tests
      - Notify Slack channel
```

### §10.4 Database Backup & Failover

- **Automated failover**: PostgreSQL failover to read replica within 60 seconds (DB_AUTOFAILOVER_TIME = 60s)
- **Maintenance windows**: Maximum 2 hours/month (DB_MAINTENANCE_WINDOW_MAX = 2 hours); 48-hour advance notice required (DB_MAINTENANCE_NOTICE = 48 hours)
- **Backup schedule**: Daily full backup to S3-compatible storage (Supabase automated); point-in-time recovery enabled
- **Redis persistence**: Upstash provides built-in persistence; leaderboard sorted sets are reconstructed from PostgreSQL snapshots on full Redis flush (fallback path tested in staging)
- **Vendor migration plan**: Documented 14-day migration plan for PostgreSQL hosting (to AWS RDS) and email provider (to AWS SES / Mailgun) per VENDOR_MIGRATION_PLAN_DAYS = 14

---

## §11. Error Handling & Observability

### §11.1 Error Response Format

All API errors follow the envelope format:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Arena rate limit reached. You can enter again in 23 minutes.",
    "retryAfter": 1380
  }
}
```

Standard error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `ALREADY_CLAIMED`, `INVALID_CODE`, `CODE_EXPIRED`, `MAX_ATTEMPTS_REACHED`, `STAT_AT_MAXIMUM`, `RATE_LIMIT_EXCEEDED`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_SERVER_ERROR`.

Error messages follow the PDD §10.1 tone of voice — specific and actionable, never generic.

**Production error sanitization**: In production (`NODE_ENV=production`), the Fastify error handler must strip `stack`, `code` (internal), and any internal path/detail fields from HTTP 500 responses before serialization. Only `code` (public error code), `message` (user-safe), and optional `retryAfter` are returned.

### §11.2 Logging Strategy

- **Structured logging**: All logs emitted as JSON via `pino` (Fastify's native logger)
- **Log levels**: ERROR (unhandled exceptions), WARN (rate limit breaches, Redis unavailable), INFO (request lifecycle, claim events), DEBUG (disabled in production)
- **Correlation ID**: `X-Request-Id` header generated at API gateway; threaded through all log entries for a request
- **PII in logs**: Email addresses NEVER written to logs; only email_hash may appear. IP addresses written as hashed values only.
- **Log shipping**: Structured JSON logs → Railway log drain → external log aggregator (Datadog or equivalent)
- **Log retention**: Hot storage 90 days; cold archive 2 years for audit trail (IP_ADDRESS_LOG_RETENTION_DAYS = 90 for IP log data; ADMIN_AUDIT_LOG_RETENTION = 2 years for audit log data)
- **Analytics event retention**: Analytics events hot tier: 90 days (ANALYTICS_EVENT_HOT_RETENTION_DAYS = 90); cold archive: 2 years (ANALYTICS_EVENT_COLD_ARCHIVE_YEARS = 2). Analytics events are distinct from operational logs — they capture product behavioral data for the GET /admin/api/analytics dashboard.
- **PII email retention after deletion**: After a GDPR erasure request, email encrypted field is nulled within 24 hours; SHA-256 hash retained for anti-re-registration (PII_EMAIL_RETENTION_POST_DELETE_DAYS = 7 aligns with GDPR_EMAIL_DELETION_WINDOW_DAYS = 7 — these two constants represent the same policy, with the latter being the primary reference)

### §11.3 Alert Thresholds

| Alert | Threshold | Window | Channel | Source |
|---|---|---|---|---|
| API error rate | >1% of requests | 5 minutes | PagerDuty + Slack | CONSTANTS OBSERVABILITY_ERROR_RATE_ALERT_WINDOW |
| P99 latency breach | >1,000 ms any endpoint | 5 minutes | Slack | CONSTANTS OBSERVABILITY_LATENCY_ALERT_THRESHOLD |
| Email delivery failure | >2% SendGrid failure | 30 minutes | PagerDuty | CONSTANTS OBSERVABILITY_EMAIL_FAILURE_ALERT_WINDOW |
| Leaderboard update lag | >60 seconds | — | Slack | CONSTANTS OBSERVABILITY_LEADERBOARD_LAG_ALERT (note: constant value is 60s; SLO target is 30s — alert fires after 2× SLO breach; recommend aligning constant to 30s in a future CONSTANTS revision) |
| Pet claim rate drop | <5 claims/hour for 2h | 2 hours | Slack | CONSTANTS OBSERVABILITY_PET_CLAIMS_DROP_THRESHOLD |
| Arena battle rate drop | <10 battles/hour for 2h | 2 hours | Slack | CONSTANTS OBSERVABILITY_ARENA_BATTLES_DROP_THRESHOLD |
| Redis memory usage | >80% | — | Slack | CONSTANTS INFRA_REDIS_ALERT_THRESHOLD |
| DB connection pool | >80% utilized | — | Slack | CONSTANTS INFRA_DB_POOL_ALERT_THRESHOLD |

Metrics collected via Prometheus exporters on API servers and Redis. Dashboard in Grafana.

---

## §12. Testing Strategy

### §12.1 Unit Test Targets

- Minimum coverage: 80% of all business logic modules (CONSTANTS `unit_test_coverage_min_percent` = 80%)
- Test framework: Vitest (shared between player app and API server)
- No module exceeds 800 lines (CODE_MODULE_MAX_LINES = 800); no function exceeds 50 lines (CODE_FUNCTION_MAX_LINES = 50) — enforced via ESLint `max-lines` and `max-lines-per-function` rules
- Priority modules for unit testing: pet generation algorithm (seed → attributes), battle outcome calculation (seeded ±15% modifier), claim code OTP generation/verification, rate-limit logic, GDPR email hashing workflow

### §12.2 Integration Test Plan

| Test Area | Approach | Tools |
|---|---|---|
| API route handlers | Fastify `inject()` for in-process HTTP testing against test PostgreSQL instance | Vitest + `@fastify/inject` |
| Claim flow end-to-end | POST /api/v1/claim → verify email send → POST /api/v1/claim/verify → assert token | Vitest + Nodemailer test inbox |
| Arena battle calculation | Submit two pets to `/api/v1/arena/enter`; assert winner determinism for same seeds | Vitest |
| Rate limiting | Exceed limit, assert HTTP 429 + Retry-After; assert counter resets after TTL | Vitest + Redis test instance |
| GDPR deletion (admin) | Trigger deletion via POST /admin/api/gdpr/delete, run background job, assert email_encrypted = NULL | Vitest + test PostgreSQL |
| GDPR self-service request | POST /api/v1/gdpr/request with valid pet token: assert 202 + jobId; with invalid token: assert 401; assert request queued in GDPR processing table | Vitest + test PostgreSQL |
| Leaderboard consistency | Update pet stats, run arena, assert leaderboard rank updated within 30s | Vitest + Redis test instance |

### §12.3 E2E Test Plan

- Framework: Playwright
- Breakpoints tested: 320, 768, 1024, 1440px (per testing.md visual regression rules)
- Both dark mode (primary) and light mode (secondary variant) tested

| Test Scenario | Assertions | Breakpoints |
|---|---|---|
| Guest lands on homepage, interacts with pet | Pet canvas visible; claim CTA appears; FCP <1.5s | 320, 768, 1440 |
| Full claim flow: email → code → URL reveal | No axe-core critical violations; claim code input accessible | 375, 1024 |
| Pet owner trains pet | Stat increments; "+X Speed" indicator visible; training count decrements | 768, 1440 |
| Arena entry with rate limit | Rate limit banner shows with countdown; button re-enables on timer expiry | 1024 |
| Leaderboard filter by rarity | URL params update; table rows filtered; owner rank highlighted | 1440 |
| Visual regression | Screenshots at all breakpoints vs. baseline | 320, 768, 1024, 1440 |
| Keyboard navigation | Tab order through all P0 flows; no focus traps | 1440 |
| Reduced motion | `prefers-reduced-motion: reduce` — static sprites, no particles | 1024 |

---

## §13. Implementation Phases

### §13.1 Phase 1 — Core (Claim, Pet Generation, Basic Display)

**Goal**: Validate the email claim → unique URL token → persistent pet access loop. Corresponds to Alpha milestone.

**Scope**:
- Pet generation service: seed → 6-dimension attribute vector → sprite selection; uniqueness guarantee via DB seed check (max 3 retries — PET_SEED_COLLISION_MAX_RETRIES = 3)
- PostgreSQL schema: `pets`, `claim_identities`, `claim_codes`, `admin_users`, `audit_logs`, `gdpr_requests` tables (GDPR compliance is a legal obligation from Phase 1, not a GA feature)
- API endpoints: `GET /api/v1/pets/random`, `POST /api/v1/claim`, `POST /api/v1/claim/verify`, `POST /api/v1/claim/recover`, `GET /api/v1/pet/:petId`, `GET /api/v1/leaderboard` (Phase 1 implementation: direct PostgreSQL query on pets/arena_matches; Redis sorted set deferred to Phase 2)
- Email delivery: SendGrid integration + Nodemailer SMTP fallback
- Frontend: Landing page (PetCanvas + ClaimCTA), Claim page (ClaimFlow compound component), Pet page (PetCanvas + StatsPanel + RarityBadge)
- Rate limiting: Redis-backed claim attempts (5/hr) and code entry (10/session)
- Basic leaderboard: PostgreSQL-only (Redis sorted set deferred to Phase 2)
- Admin portal: Login + basic pet list view (Moderator role only)

**Exit criteria**:
- 20 invited alpha testers successfully claim and access their pets. Claim conversion rate ≥7% (CLAIM_CONVERSION_ALPHA_GO_PERCENT = 7%).
- Core pet display: PetCanvas renders claimed pet with correct sprite, stats, and level.
- Basic leaderboard: Top 100 leaderboard returns correct data from seeded test data (no live battles required in Phase 1 — arena is Phase 2 scope).

> **Note**: Basic arena is Phase 2 scope — Phase 1 validates claim flow, pet display, and leaderboard data pipeline only.

### §13.2 Phase 2 — Arena + Leaderboard (Beta)

**Goal**: Validate competitive engagement loop. Corresponds to Beta milestone.

**Scope**:
- PostgreSQL schema: `training_logs`, `arena_matches`, `food_buffs`, `leaderboard_snapshots` tables
- Training system: `POST /api/v1/pet/:petId/train`; 3 actions/day limit; stat increment 1–3 points; neglect state detection (3-day threshold — TRAINING_NEGLECT_THRESHOLD = 3 days)
- Food buff system: FoodBuff table; `/api/v1/pet/:petId/feed`
- Arena matchmaking: Redis queue; 30-second timeout; AI fallback; battle calculation with seeded ±15% modifier
- Arena API: `POST /api/v1/arena/enter`, `GET /api/v1/arena/match/:id`, `GET /api/v1/arena/history/:petId`
- Leaderboard: Redis sorted set (authoritative) + PostgreSQL snapshots; `GET /api/v1/leaderboard`; ≤30s update lag
- Arena rate limiting: Redis counter 10 battles/hr per pet (ARENA_RATE_LIMIT_BATTLES_PER_HOUR = 10)
- Bot detection: Auto-flag pets >50 battles/60-min rolling window (BOT_DETECTION_BATTLES_THRESHOLD = 50)
- Frontend: Arena page, Battle result page, Leaderboard page, Battle records page, Training page
- Admin portal: Leaderboard management, suspicious activity dashboard, runtime config tuning

**Exit criteria**: 50 daily arena battles (ARENA_BATTLES_BETA_GA_MIN_PER_DAY = 50 battles/day). Day-7 retention ≥25% (DAY_7_RETENTION_TARGET_PERCENT = 25%). 500 beta users via itch.io + Discord rollout (BETA_AUDIENCE_APPROX = 500).

### §13.3 Phase 3 — Marketplace + Admin Full Feature (GA)

**Goal**: Enable P2P pet trading and complete admin portal. Corresponds to General Availability milestone.

**Scope**:
- PostgreSQL schema: `trade_records`, `marketplace_listings` tables
- Marketplace: Feature flag `FF_MARKETPLACE` enabled when DAU sustains >1,000 for 2 weeks (DAU_MARKETPLACE_TRIGGER = 1,000)
- Trade system: Pet listing, offer submission, acceptance; 5% platform fee (TRADE_TRANSACTION_FEE = 5%); min price formula: `(pet_level × 100) + (rarity_multiplier × 500)`; anti-flip 7-day cooldown (MARKETPLACE_TRADE_ANTIFLIP_PROTECTION_DAYS = 7 days)
- Admin portal: Full GDPR deletion workflow, game economy configuration (food buff multipliers 0.5×–5.0×, arena entry cost/cooldown), email delivery monitor, analytics dashboard, audit log, role management
- Performance hardening: Lighthouse CI gate (LCP <2.5s, FCP <1.5s, CLS <0.1); load testing at 500 RPS
- Security hardening: CSP header with nonce-based script policy; full OWASP Top 10 review

**Exit criteria**: DAU ≥2,000 sustained (DAU_12_MONTH_TARGET = 2,000). Marketplace monthly GMV ≥$10,000 (MONTHLY_GMV_TARGET_USD = 10,000). All admin GDPR workflows operational.

---

## §14. Open Questions / TBD Items

| # | Question | Impact | Owner | Status |
|---|---|---|---|---|
| OQ-E01 | Sprite resolution: 16×16px (NES-era, simpler generation) vs 32×32px (more expressive)? Affects PetCanvasEngine, sprite sheet production, and canvas scaling logic. **Provisional resolution**: Proceed with 32×32px sprites for Phase 1. Revisit at Phase 2 design review with UX/art team input. Implementation MUST use `SPRITE_RESOLUTION_PX = 32` config constant throughout (no hard-coded values). This closes the immediate Phase 1 blocker while preserving the ability to scale to 64×64 without code changes. | Architecture (PDD OQ-D01) | Engineering + Design | PROVISIONALLY RESOLVED (Phase 2 review) |
| OQ-E02 | Arena matchmaking: HTTP long-poll (simpler, works everywhere) vs WebSocket (lower latency, higher complexity)? The 30-second matchmaking timeout fits HTTP long-poll; WebSocket may be needed if real-time battle animations require bidirectional events. | API complexity, infrastructure | Engineering | OPEN |
| OQ-E03 | Admin portal deployment: Same Vercel project with route-based separation (`/admin`) vs. separate subdomain (`admin.pixel-pet-arena.com`)? Subdomain offers stricter cookie isolation and CSP separation. | Security, deployment | Engineering | OPEN |
| OQ-E04 | Pet ownership transfer mechanism: If a user deletes their email account, can they transfer pet ownership to a new email? Current design requires the pet to become unclaimed (GDPR erasure). Is an ownership-transfer endpoint needed pre-GDPR-deletion? | Data model, GDPR flow | Engineering + Legal | OPEN |
| OQ-E05 | Battle result Open Graph card generation: Static HTML page as OG preview (simpler) vs. server-rendered image (requires Puppeteer/Cloudflare browser, better social preview)? (PDD OQ-D06) | Infrastructure, performance | Engineering + Design | OPEN |
| OQ-E06 | Redis persistence strategy: Upstash provides durability by default. If leaderboard Redis is flushed, full rebuild from PostgreSQL snapshots could take >30 seconds during peak load. Define an explicit rebuild SLA and test it. | Availability | Engineering | OPEN |
| OQ-E07 | Feature flag implementation: Simple environment-variable-based flags sufficient for MVP (`FF_MARKETPLACE`, `FF_ARENA_SUMO`, `FF_ADMIN_PORTAL`)? Or invest in a LaunchDarkly/Flagsmith integration for runtime toggles? | Operations | Engineering + PM | OPEN |
| OQ-E08 | Sumo arena mode battle calculation: The CONSTANTS define `ARENA_BATTLE_OUTCOME_RANDOM_MODIFIER` as covering both Race (Speed-based) and Sumo (Strength-based). Confirm the stat selection logic: Race uses Speed, Sumo uses Strength, modifier ±15% applied to selected stat. Document edge cases when both stats are equal. | Domain logic | Engineering | OPEN |

---

*This EDD is the authoritative engineering specification for pixel-pet-arena. All implementation decisions, schema designs, and API contracts must reference and comply with this document. Numeric values are sourced exclusively from CONSTANTS-PIXEL-PET-ARENA-20260503. Conflicts between this EDD and upstream PDD/VDD/PRD shall be resolved by filing an ECR (Engineering Change Request) against the relevant upstream document.*
