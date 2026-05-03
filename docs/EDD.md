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
| PET_GENERATION_COMBINATIONS_MIN | 1,000,000,000 | combinations | 6-dimension procedural generation |
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
| BOT_DETECTION_BATTLES_THRESHOLD | 50 | battles | Per 60-min rolling window |
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
| TRADE_TRANSACTION_FEE | 5 | percent | Platform fee on trades |
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
- Claim token blacklist (used/expired tokens; TTL = 72 hours per CLAIM_TOKEN_CLEANUP_TTL)
- Arena matchmaking queue (Redis List or Pub/Sub)
- Config cache: runtime parameter values refreshed every 5 minutes (CONFIG_CACHE_REFRESH_TIME = 5 min)
- Fallback: if Redis unavailable, leaderboard falls back to direct PostgreSQL read (degraded, not outage — NFR-AVAIL-05)
- Admin sessions stored server-side in Redis with 4h inactivity / 8h absolute expiry

### §3.5 Email Service

**Primary**: SendGrid API v3
- Transactional email only: claim password delivery, access-link recovery
- SPF + DKIM configured; spam complaint rate target <0.1% (CONSTANTS)
- Delivery SLO P90 ≤60 seconds (NFR-PERF-10)
- Retry queue: 3 retries over 15 minutes on delivery failure

**Fallback**: Nodemailer + SMTP
- Activates automatically after 3 consecutive SendGrid failures
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
stat_speed       SMALLINT     NOT NULL DEFAULT 10  CHECK (stat_speed BETWEEN 1 AND 100)
stat_strength    SMALLINT     NOT NULL DEFAULT 10  CHECK (stat_strength BETWEEN 1 AND 100)
stat_stamina     SMALLINT     NOT NULL DEFAULT 10  CHECK (stat_stamina BETWEEN 1 AND 100)
level            SMALLINT     NOT NULL DEFAULT 1   CHECK (level BETWEEN 1 AND 100)
total_training_actions  INTEGER NOT NULL DEFAULT 0
owner_token_hash VARCHAR(64)  NULL      -- SHA-256 hash of the pet access token; NULL = unclaimed
claimed_at       TIMESTAMPTZ  NULL
is_banned        BOOLEAN      NOT NULL DEFAULT FALSE
banned_reason    TEXT         NULL      CHECK (char_length(banned_reason) <= 500)
banned_at        TIMESTAMPTZ  NULL
created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
generation_meta  JSONB        NOT NULL DEFAULT '{}'  -- {body, head, color_palette, accessory, rarity_trait, pattern}
──────────────────────────────────────────────────────
INDEXES:
  idx_pets_rarity           ON pets(rarity)
  idx_pets_claimed_at       ON pets(claimed_at) WHERE claimed_at IS NOT NULL
  idx_pets_is_banned        ON pets(is_banned) WHERE is_banned = TRUE
  idx_pets_owner_token_hash ON pets(owner_token_hash) WHERE owner_token_hash IS NOT NULL
  idx_pets_seed             ON pets(seed) -- unique, supports uniqueness check on generation
```

Notes:
- The raw pet access token (32-byte base64 string) is NEVER stored; only the SHA-256 hash is stored. The token is transmitted once at claim time via URL.
- `level` is derived from `FLOOR(total_training_actions / PET_LEVEL_FORMULA_DIVISOR)` capped at 100; the column is updated on each training action commit.
- Seed collision on generation: application retries up to 3 times (PET_SEED_COLLISION_MAX_RETRIES = 3) before returning an error.

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
- On GDPR deletion request: `email_encrypted` is set to NULL, `deletion_requested_at` recorded. Background job replaces with hash-only record within 7 days (GDPR_EMAIL_DELETION_WINDOW = 7 days; system completes within 24 hours per GDPR_EMAIL_HASHING_INTERNAL_SLA).
- IP addresses are never stored raw; hashed IP retained 90 days for abuse monitoring (IP_ADDRESS_LOG_RETENTION = 90 days).

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
- Code is a 6-digit numeric OTP (CLAIM_CODE_DIGITS = 6) generated with `crypto.randomInt(100000, 999999)`. Only the hash is stored.
- Claim records are deleted by a background job 72 hours after creation or first use (CLAIM_TOKEN_CLEANUP_TTL = 72 hours).

### §4.4 ArenaMatch

```
Table: arena_matches
──────────────────────────────────────────────────────
id               UUID         PRIMARY KEY DEFAULT gen_random_uuid()
pet_a_id         UUID         NOT NULL REFERENCES pets(id)
pet_b_id         UUID         NOT NULL REFERENCES pets(id)  -- NULL if AI opponent
is_ai_opponent   BOOLEAN      NOT NULL DEFAULT FALSE
mode             VARCHAR(10)  NOT NULL CHECK (mode IN ('RACE','SUMO'))
winner_pet_id    UUID         NULL REFERENCES pets(id)
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
- The stat delta per action is 1–3 points (TRAINING_STAT_POINTS_MIN/MAX), based on current pet level.

### §4.6 LeaderboardSnapshot

```
Table: leaderboard_snapshots
──────────────────────────────────────────────────────
id               UUID         PRIMARY KEY DEFAULT gen_random_uuid()
snapshot_time    TIMESTAMPTZ  NOT NULL
entries          JSONB        NOT NULL  -- array of top 500 entries: [{rank, pet_id, score, win_rate, rarity, level}]
──────────────────────────────────────────────────────
INDEXES:
  idx_leaderboard_snapshots_time  ON leaderboard_snapshots(snapshot_time DESC)
```

Notes:
- Snapshot stores top 500 pets (LEADERBOARD_SNAPSHOT_TOP_N = 500). Retention is rolling 12 months (LEADERBOARD_SNAPSHOT_RETENTION = 12 months).
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

### §4.8 ClaimCode (Redis — ephemeral rate-limit counters)

The following are Redis key patterns (not PostgreSQL tables):

```
redis_key: rl:claim:{email_hash}         TTL: 3600s   Value: attempt count (≤5)
redis_key: rl:arena:{pet_id}             TTL: 3600s   Value: battle count (≤10 default)
redis_key: rl:code_entry:{session_id}    TTL: 900s    Value: attempt count (≤10)
redis_key: config:runtime                TTL: 300s    Value: JSON blob of current runtime config
redis_key: leaderboard:global            NO TTL       Sorted set; score = arena_score; member = pet_id
redis_key: matchmaking:queue:{mode}      NO TTL       Redis List (LPUSH / BRPOP)
redis_key: session:admin:{session_id}    TTL: 14400s  Value: admin user info JSON
```

---

## §5. API Design

All player-facing API routes use `/api/v1/` prefix. Backward compatibility maintained for at least 1 major version per PRD NFR-MAINT-06. Admin routes are prefixed `/admin/api`. All responses use the envelope format:

```json
{
  "success": true | false,
  "data": { ... } | null,
  "error": null | { "code": "ERROR_CODE", "message": "Human-readable message" },
  "meta": { "total": number, "page": number, "limit": number }  // pagination only
}
```

HTTP status codes: 200 (success), 201 (created), 400 (bad request), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limited), 500 (server error).

### §5.1 Auth / Claim Flow Endpoints

#### POST /api/v1/claim
Auth: None (rate-limited by email)
Description: Initiate the claim flow — sends 6-digit code to email.
Request: `{ email: string, petId: string, ageConfirmed: boolean }`
Response: `{ claimId: string, expiresAt: ISO8601 }`
Rate limit: 5 attempts/hour per email (AUTH_RATE_LIMIT_CLAIM_ATTEMPTS_PER_HOUR = 5). Returns HTTP 429 on breach.
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
Description: Send an access-link recovery email to a previously claimed pet.
Request: `{ email: string }`
Response: `{ success: true }` (same response regardless of email existence — prevents enumeration)

### §5.2 Pet Endpoints

#### GET /api/v1/pets/random
Auth: None
Description: Generate a new unclaimed random pet for guest display. Public endpoint — no authentication required; generates a guest-preview pet for display.
Request: `{}` (no body)
Response: `{ petId, seed, rarity, stats: {speed, strength, stamina, level}, generationMeta }`
Notes: Does not persist a ClaimCode; pet is reserved in DB but ownership is unset.

#### GET /api/v1/pet/:petId
Auth: Optional (pet token in `Authorization: Bearer <token>` or `?token=` query param — used to verify ownership for write-access pages)
Description: Fetch pet data including stats, rarity, and level.
Response: `{ id, seed, rarity, stats: {speed, strength, stamina, level}, isOwner: boolean, claimedAt, isNeglected: boolean }`
Notes: `isNeglected` is true if `NOW() - last_training_action > 3 days` (TRAINING_NEGLECT_THRESHOLD = 3 days).

#### POST /api/v1/pet/:petId/train
Auth: Required (pet owner token)
Request: `{ trainingType: 'RUN' | 'STRENGTH' | 'STAMINA' }`
Response: `{ updatedStats: {speed, strength, stamina, level}, statDelta: number, actionsRemainingToday: number }`
Errors: HTTP 400 if 3 actions already used today; HTTP 400 with `STAT_AT_MAXIMUM` if target stat = 100 (PET_STAT_MAX = 100).

#### POST /api/v1/pet/:petId/feed
Auth: Required (pet owner token)
Request: `{ foodBuffId: string }`
Response: `{ updatedStats: {speed, strength, stamina}, buffApplied: { stat, magnitude, isPermanent, expiresAt } }`
Errors: HTTP 400 if food item not owned; HTTP 400 if stat already at maximum.

### §5.3 Arena Endpoints

#### POST /api/v1/arena/enter
Auth: Required (pet owner token)
Request: `{ petId: string, mode: 'RACE' | 'SUMO', acceptAI?: boolean }`
Description: Enqueues pet in matchmaking queue (Redis). Waits up to 30 seconds (ARENA_MATCHMAKING_TIMEOUT) for an opponent. Returns battle result synchronously (HTTP long-poll) or AI result if no opponent found and `acceptAI: true`.
Response: `{ matchId: string, result: 'WIN' | 'LOSS', opponentPetId: string | null, isAiOpponent: boolean, statDelta: number, newLeaderboardScore?: number }`
Rate limit: 10 battles/hour per pet by default (ARENA_RATE_LIMIT_BATTLES_PER_HOUR = 10); HTTP 429 + `Retry-After` header on breach.

#### GET /api/v1/arena/match/:matchId
Auth: None (public battle record)
Response: `{ matchId, mode, petA: PetSummary, petB: PetSummary, winnerId, battleLog, completedAt }`

#### GET /api/v1/arena/history/:petToken
Auth: Required (pet owner token) or public via petId
Description: Last 20 battles for a pet (ARENA_BATTLE_RECORDS_DISPLAY = 20).
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

#### POST /admin/api/auth/login
Auth: None (TOTP + password)
Request: `{ username: string, password: string, totpCode: string }`
Response: Sets session cookie (4h inactivity / 8h absolute — ADMIN_SESSION_INACTIVITY_EXPIRY / ABSOLUTE_EXPIRY)

#### GET /admin/api/pets
Auth: Admin session (Moderator+)
Query: `?page=1&limit=20&search=<petId|emailFragment>&rarity=&isBanned=`
Response: `{ pets: [{id, ownerEmailMasked, rarity, level, battlesPlayed, winRate, isBanned, createdAt}], total, page, limit }`
Notes: Search by pet ID or email fragment up to 1 million records in ≤2 seconds (ADMIN_SEARCH_RESPONSE_TIME = 2s).

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
Auth: Admin session (Moderator+)
Response: Top 500 pets (LEADERBOARD_ADMIN_VIEW = 500) with suspicious flags for pets >50 battles/hour (BOT_DETECTION_BATTLES_THRESHOLD = 50).

#### GET /admin/api/config/runtime
Auth: Admin session (Super Admin)
Response: `{ arenaRateLimit, rarityWeights: {common, rare, epic, legendary}, arenaMatchmakingTimeout, ... }`

#### PUT /admin/api/config/runtime
Auth: Admin session (Super Admin)
Request: Runtime parameter updates (validated against admin-tunable ranges from CONSTANTS)
Response: `{ success: true }` — takes effect within 5 minutes (CONFIG_CACHE_REFRESH_TIME = 5 min).

#### POST /admin/api/gdpr/delete
Auth: Admin session (Super Admin)
Request: `{ emailHash: string, reason: string }`
Response: `{ jobId: string, estimatedCompletion: ISO8601 }`
Notes: Email → SHA-256 hash within 24 hours (GDPR_EMAIL_HASHING_INTERNAL_SLA); reported compliant within 7 days (GDPR_EMAIL_DELETION_WINDOW).

#### GET /admin/api/audit
Auth: Admin session (Super Admin)
Query: `?page=1&limit=50&from=ISO8601&to=ISO8601&actorId=&action=`
Response: Audit log entries; search any 12-month window in ≤3 seconds (ADMIN_AUDIT_LOG_SEARCH_RESPONSE_TIME = 3s).

### §5.6 Marketplace Endpoints (Phase 3 — FF_MARKETPLACE required)

All endpoints require pet access token auth. Active only when `FF_MARKETPLACE=true`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/marketplace/listings` | Public | Browse active listings (paginated, sort by price/rarity/level) |
| `POST` | `/api/v1/marketplace/listings` | Pet token | Create listing (min price enforced: level × 100 + rarity_multiplier × 500) |
| `DELETE` | `/api/v1/marketplace/listings/:listingId` | Pet token (owner only) | Cancel own listing (7-day anti-flip protection from CONSTANTS) |
| `POST` | `/api/v1/marketplace/listings/:listingId/buy` | Pet token | Purchase listing; 5% fee deducted from seller proceeds |
| `GET` | `/api/v1/marketplace/history/:petId` | Pet token | Trade history for a pet |

**Fee**: TRADE_TRANSACTION_FEE = 5% deducted from seller, credited to platform.
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

Token recovery: Users who lose their URL may request a new access link via POST `/api/claim/recover`. A new 6-digit claim code is sent; on verification, a new 32-byte token is issued and the old hash is replaced atomically.

### §6.2 Claim Code Flow

1. User submits email and pet ID to `POST /api/claim`
2. System checks rate limit: ≤5 attempts/hour per email (AUTH_RATE_LIMIT_CLAIM_ATTEMPTS_PER_HOUR = 5)
3. 6-digit numeric OTP generated with `crypto.randomInt(100000, 999999)`
4. OTP hash (SHA-256) stored in `claim_codes` with `expires_at = NOW() + 15min` (CLAIM_CODE_EXPIRY = 15 min)
5. Email dispatched via SendGrid containing ONLY the 6-digit code — no clickable URLs (mitigates email client pre-scanning attacks documented in IDEA.md §8.1 R1)
6. User manually enters code in browser; verified against hash
7. On valid entry: pet access token generated, old claim code marked `used_at`, ownership bound atomically in a DB transaction
8. Claim code records deleted after 72 hours (CLAIM_TOKEN_CLEANUP_TTL = 72 hours)
9. Rate limit on code entry: 10 attempts per session (AUTH_RATE_LIMIT_CODE_ENTRY_ATTEMPTS = 10); 60-second cooldown on breach

### §6.3 Admin Authentication

- Credentials: username + bcrypt password hash (work factor ≥12) + TOTP (RFC 6238, 6-digit, 30-second window)
- Session: server-side Redis session with httpOnly + SameSite=Strict cookie
- Inactivity expiry: 4 hours (ADMIN_SESSION_INACTIVITY_EXPIRY = 4h)
- Absolute expiry: 8 hours regardless of activity (ADMIN_SESSION_ABSOLUTE_EXPIRY = 8h)
- Rate limit: 100 requests/minute per admin account (ADMIN_RATE_LIMIT_REQUESTS_PER_MINUTE = 100)
- All admin auth events (login, logout, failed attempt) written to audit log

### §6.4 Rate Limiting Summary

| Endpoint / Feature | Limit | Window | Storage | HTTP Response |
|---|---|---|---|---|
| Email claim initiation | 5 | per hour per email | Redis TTL 3600s | HTTP 429 + Retry-After |
| Claim code entry | 10 | per session | Redis TTL 900s | HTTP 429 + 60s cooldown |
| Arena battles per pet | 10 (default; 1–50 admin) | per hour per pet | Redis TTL 3600s | HTTP 429 + Retry-After |
| Admin portal requests | 100 | per minute per admin | Redis TTL 60s | HTTP 429 |
| Health endpoint | No limit | — | N/A | 200 always |

All rate limit keys are stored in Redis. The Redis counter TTL equals the window duration. On TTL expiry the counter resets automatically. If Redis is unavailable, rate limiting degrades gracefully (counters not enforced — logged as an alert).

### §6.5 GDPR / Data Handling Summary

- **Data minimization**: Only email hash + encrypted email stored. Raw email never written to database or logs.
- **Right to erasure**: Email encrypted field nulled within 24 hours of request; SHA-256 hash retained for anti-re-registration. Full compliance SLA: 7 days (GDPR_EMAIL_DELETION_WINDOW = 7 days).
- **Right of access / portability**: JSON export of pet data, battle records, training logs delivered within 30 days (GDPR_DATA_ACCESS_RESPONSE / PORTABILITY_RESPONSE = 30 days).
- **Right to restrict processing**: Applied within 24 hours (GDPR_RESTRICT_PROCESSING_RESPONSE = 24 hours).
- **IP addresses**: Hashed on ingress; raw IP never written. Retained 90 days (IP_ADDRESS_LOG_RETENTION = 90 days).
- **COPPA**: Age-13 confirmation checkbox required on claim form; label text: "I confirm I am at least 13 years old" (PRD §5 US-AUTH-001 AC-003-8). Minors not targeted.
- **Audit log**: All admin actions logged for 2 years (ADMIN_AUDIT_LOG_RETENTION = 2 years).
- **CAN-SPAM**: All emails are transactional; no marketing email without separate opt-in consent.

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
| Arena battle result E2E | <2 seconds | CONSTANTS §4 |
| Leaderboard update lag | ≤30 seconds | CONSTANTS §4 |
| Email delivery P90 | ≤60 seconds | CONSTANTS §4 |
| Error rate | <1% per 5-minute window | CONSTANTS §3 |

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
- **Arena matchmaking**: Redis List queue; BRPOP with 30-second timeout (ARENA_MATCHMAKING_TIMEOUT). Supports 100 concurrent match entries without degradation (ARENA_MATCHMAKING_CONCURRENT_ENTRIES = 100).
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
│       │   ├── StatChangeIndicator
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
- Admin portal uses a separate TanStack Query client instance with no shared cache

### §8.3 Pixel Art Rendering

- **Engine**: Phaser.js 3 embedded as a React component via `PetCanvasEngine` class
- **Canvas API**: `image-rendering: pixelated` + `image-rendering: crisp-edges` CSS applied to the canvas element
- **Sprite sheets**: 64×64px sprites (**32×32px** (provisional; implementation must pass `SPRITE_RESOLUTION_PX` as a config constant — see §14 OQ-E01)), PNG format, indexed color palettes (≤16 colors per sprite for retro constraint)
- **Animation loop**: `requestAnimationFrame` via Phaser's internal scene update; target ≥30 FPS sustained on mid-range devices (NFR-PERF-07)
- **Procedural generation**: Pet seed → 6-dimension attribute vector (body, head, color_palette, accessory, rarity_trait, pattern) → sprite sheet frame selection. Seed is stored in `pets.seed`; rendering is deterministic from seed. Combination space ≥1,000,000,000 (PET_GENERATION_COMBINATIONS_MIN).
- **Reduced motion**: `prefers-reduced-motion: reduce` detection — static sprite replaces animation loop; no particle effects.
- **Fallback**: If WebGL unavailable, Canvas 2D fallback rendering with static sprite image.
- **Phaser.js isolation**: Only `PetCanvasEngine` imports Phaser. No other component or hook may import Phaser directly.

### §8.4 Build Toolchain

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
| Dashboard | /admin/dashboard | Real-time DAP, battles/hour, claim funnel, GDPR queue | Moderator+ |
| Pet Management | /admin/pets | Paginated list, search by ID/email, ban/unban with reason | Moderator+ |
| Leaderboard | /admin/leaderboard | Top 500 view, suspicious flag indicators, remove/restore | Moderator+ |
| Battle Records | /admin/battles | Flag suspicious matches, view battle logs | Moderator+ |
| Suspicious Activity | /admin/suspicious | Auto-flagged pets (>50 battles/60min), triage queue | Moderator+ |
| GDPR Queue | /admin/gdpr | Process deletion requests, audit trail | Super Admin |
| Runtime Config | /admin/config/runtime | Arena rate limits, rarity weights, matchmaking timeout | Super Admin |
| Economy Config | /admin/config/economy | Food buff multipliers (0.5×–5.0×), arena entry cost/cooldown | Super Admin |
| Email Monitor | /admin/email | SendGrid delivery status, bounce rates, spam complaints | Moderator+ |
| Analytics | /admin/analytics | DAP trend, claim conversion, retention cohorts | Analyst+ |
| Audit Log | /admin/audit | Full immutable audit trail, 2-year retention | Super Admin |
| Roles | /admin/roles | Admin account management, TOTP reset | Super Admin |

### §9.3 Admin-Specific Security

- **Rate limit**: 100 requests/minute per admin account (ADMIN_RATE_LIMIT_REQUESTS_PER_MINUTE = 100), separately tracked from player API
- **Session security**: Redis server-side session; httpOnly + SameSite=Strict cookies; 4h inactivity / 8h absolute expiry
- **Audit log**: Every create/update/delete/moderation action generates an audit record with actor ID, action type, target entity, reason, and timestamp. Retention: 2 years (ADMIN_AUDIT_LOG_RETENTION = 2 years). Search response for any 12-month window: ≤3 seconds (ADMIN_AUDIT_LOG_SEARCH_RESPONSE_TIME = 3s).
- **Moderation reason field**: Max 500 characters, required for all ban/unban/flag actions (ADMIN_MODERATION_REASON_MAX_CHARS = 500)
- **TOTP**: RFC 6238 required for admin login; 6-digit, 30-second window; backup codes generated on setup
- **IP allowlist**: Admin portal optionally restricted to operator IP ranges via environment variable configuration
- **Performance**: Pages load in ≤3 seconds with up to 1 million pet records (ADMIN_PAGE_LOAD_TIME = 3s); single moderator can handle 100 moderation actions/day without degradation (ADMIN_DAILY_MODERATION_ACTIONS = 100)

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
RUN npm ci --production
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
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
      - Deploy frontend to Vercel (staging)
      - Run smoke tests (Playwright)

    deploy-production:
      needs: deploy-staging
      on: manual approval (GitHub Environments)
      - Deploy to production
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

### §11.2 Logging Strategy

- **Structured logging**: All logs emitted as JSON via `pino` (Fastify's native logger)
- **Log levels**: ERROR (unhandled exceptions), WARN (rate limit breaches, Redis unavailable), INFO (request lifecycle, claim events), DEBUG (disabled in production)
- **Correlation ID**: `X-Request-Id` header generated at API gateway; threaded through all log entries for a request
- **PII in logs**: Email addresses NEVER written to logs; only email_hash may appear. IP addresses written as hashed values only.
- **Log shipping**: Structured JSON logs → Railway log drain → external log aggregator (Datadog or equivalent)
- **Retention**: Hot storage 90 days; cold archive 2 years for audit trail

### §11.3 Alert Thresholds

| Alert | Threshold | Window | Channel | Source |
|---|---|---|---|---|
| API error rate | >1% of requests | 5 minutes | PagerDuty + Slack | CONSTANTS OBSERVABILITY_ERROR_RATE_ALERT_WINDOW |
| P99 latency breach | >1,000 ms any endpoint | 5 minutes | Slack | CONSTANTS OBSERVABILITY_LATENCY_ALERT_THRESHOLD |
| Email delivery failure | >2% SendGrid failure | 30 minutes | PagerDuty | CONSTANTS OBSERVABILITY_EMAIL_FAILURE_ALERT_WINDOW |
| Leaderboard update lag | >60 seconds | — | Slack | CONSTANTS OBSERVABILITY_LEADERBOARD_LAG_ALERT |
| Pet claim rate drop | <5 claims/hour for 2h | 2 hours | Slack | CONSTANTS OBSERVABILITY_PET_CLAIMS_DROP_THRESHOLD |
| Arena battle rate drop | <10 battles/hour for 2h | 2 hours | Slack | CONSTANTS OBSERVABILITY_ARENA_BATTLES_DROP_THRESHOLD |
| Redis memory usage | >80% | — | Slack | CONSTANTS INFRA_REDIS_ALERT_THRESHOLD |
| DB connection pool | >80% utilized | — | Slack | CONSTANTS INFRA_DB_POOL_ALERT_THRESHOLD |

Metrics collected via Prometheus exporters on API servers and Redis. Dashboard in Grafana.

---

## §12. Testing Strategy

### §12.1 Unit Test Targets

- Minimum coverage: 80% of all business logic modules (CONSTANTS `test_unit_coverage_min_percent` = 80%)
- Test framework: Vitest (shared between player app and API server)
- No module exceeds 800 lines (CODE_MODULE_MAX_LINES = 800); no function exceeds 50 lines (CODE_FUNCTION_MAX_LINES = 50) — enforced via ESLint `max-lines` and `max-lines-per-function` rules
- Priority modules for unit testing: pet generation algorithm (seed → attributes), battle outcome calculation (seeded ±15% modifier), claim code OTP generation/verification, rate-limit logic, GDPR email hashing workflow

### §12.2 Integration Test Plan

| Test Area | Approach | Tools |
|---|---|---|
| API route handlers | Fastify `inject()` for in-process HTTP testing against test PostgreSQL instance | Vitest + `@fastify/inject` |
| Claim flow end-to-end | POST /api/claim → verify email send → POST /api/claim/verify → assert token | Vitest + Nodemailer test inbox |
| Arena battle calculation | Submit two pets to `/api/arena/enter`; assert winner determinism for same seeds | Vitest |
| Rate limiting | Exceed limit, assert HTTP 429 + Retry-After; assert counter resets after TTL | Vitest + Redis test instance |
| GDPR deletion | Trigger deletion, run background job, assert email_encrypted = NULL | Vitest + test PostgreSQL |
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
- PostgreSQL schema: `pets`, `claim_identities`, `claim_codes` tables
- API endpoints: `POST /api/pets/random`, `POST /api/claim`, `POST /api/claim/verify`, `GET /api/pet/:petId`
- Email delivery: SendGrid integration + Nodemailer SMTP fallback
- Frontend: Landing page (PetCanvas + ClaimCTA), Claim page (ClaimFlow compound component), Pet page (PetCanvas + StatsPanel + RarityBadge)
- Rate limiting: Redis-backed claim attempts (5/hr) and code entry (10/session)
- Basic leaderboard: PostgreSQL-only (Redis sorted set deferred to Phase 2)
- Admin portal: Login + basic pet list view (Moderator role only)

**Exit criteria**: 20 invited alpha testers successfully claim and access their pets. Claim conversion rate ≥7% (CLAIM_CONVERSION_ALPHA_GO = 7%).

### §13.2 Phase 2 — Arena + Leaderboard (Beta)

**Goal**: Validate competitive engagement loop. Corresponds to Beta milestone.

**Scope**:
- Training system: `POST /api/pet/:petId/train`; 3 actions/day limit; stat increment 1–3 points; neglect state detection (3-day threshold — TRAINING_NEGLECT_THRESHOLD = 3 days)
- Food buff system: FoodBuff table; `/api/pet/:petId/feed`
- Arena matchmaking: Redis queue; 30-second timeout; AI fallback; battle calculation with seeded ±15% modifier
- Arena API: `POST /api/arena/enter`, `GET /api/arena/match/:id`, `GET /api/arena/history/:petToken`
- Leaderboard: Redis sorted set (authoritative) + PostgreSQL snapshots; `GET /api/leaderboard`; ≤30s update lag
- Arena rate limiting: Redis counter 10 battles/hr per pet (ARENA_RATE_LIMIT_BATTLES_PER_HOUR = 10)
- Bot detection: Auto-flag pets >50 battles/60-min rolling window (BOT_DETECTION_BATTLES_THRESHOLD = 50)
- Frontend: Arena page, Battle result page, Leaderboard page, Battle records page, Training page
- Admin portal: Leaderboard management, suspicious activity dashboard, runtime config tuning

**Exit criteria**: 50 daily arena battles (ARENA_BATTLES_BETA_GA_MIN = 50 battles/day). Day-7 retention ≥25% (DAY_7_RETENTION_TARGET = 25%). 500 beta users via itch.io + Discord rollout (BETA_AUDIENCE = 500).

### §13.3 Phase 3 — Marketplace + Admin Full Feature (GA)

**Goal**: Enable P2P pet trading and complete admin portal. Corresponds to General Availability milestone.

**Scope**:
- Marketplace: Feature flag `FF_MARKETPLACE` enabled when DAU sustains >1,000 for 2 weeks (DAU_MARKETPLACE_TRIGGER = 1,000)
- Trade system: Pet listing, offer submission, acceptance; 5% platform fee (TRADE_TRANSACTION_FEE = 5%); min price formula: `(pet_level × 100) + (rarity_multiplier × 500)`; anti-flip 7-day cooldown (MARKETPLACE_TRADE_ANTIFLIP_PROTECTION = 7 days)
- Admin portal: Full GDPR deletion workflow, game economy configuration (food buff multipliers 0.5×–5.0×, arena entry cost/cooldown), email delivery monitor, analytics dashboard, audit log, role management
- Performance hardening: Lighthouse CI gate (LCP <2.5s, FCP <1.5s, CLS <0.1); load testing at 500 RPS
- Security hardening: CSP header with nonce-based script policy; full OWASP Top 10 review

**Exit criteria**: DAU ≥2,000 sustained (DAU_12_MONTH_TARGET = 2,000). Marketplace monthly GMV ≥$10,000 (MONTHLY_GMV_TARGET = 10,000). All admin GDPR workflows operational.

---

## §14. Open Questions / TBD Items

| # | Question | Impact | Owner | Status |
|---|---|---|---|---|
| OQ-E01 | Sprite resolution: 16×16px (NES-era, simpler generation) vs 32×32px (more expressive)? Affects PetCanvasEngine, sprite sheet production, and canvas scaling logic. | Architecture (PDD OQ-D01) | Engineering + Design | OPEN |
| OQ-E02 | Arena matchmaking: HTTP long-poll (simpler, works everywhere) vs WebSocket (lower latency, higher complexity)? The 30-second matchmaking timeout fits HTTP long-poll; WebSocket may be needed if real-time battle animations require bidirectional events. | API complexity, infrastructure | Engineering | OPEN |
| OQ-E03 | Admin portal deployment: Same Vercel project with route-based separation (`/admin`) vs. separate subdomain (`admin.pixel-pet-arena.com`)? Subdomain offers stricter cookie isolation and CSP separation. | Security, deployment | Engineering | OPEN |
| OQ-E04 | Pet ownership transfer mechanism: If a user deletes their email account, can they transfer pet ownership to a new email? Current design requires the pet to become unclaimed (GDPR erasure). Is an ownership-transfer endpoint needed pre-GDPR-deletion? | Data model, GDPR flow | Engineering + Legal | OPEN |
| OQ-E05 | Battle result Open Graph card generation: Static HTML page as OG preview (simpler) vs. server-rendered image (requires Puppeteer/Cloudflare browser, better social preview)? (PDD OQ-D06) | Infrastructure, performance | Engineering + Design | OPEN |
| OQ-E06 | Redis persistence strategy: Upstash provides durability by default. If leaderboard Redis is flushed, full rebuild from PostgreSQL snapshots could take >30 seconds during peak load. Define an explicit rebuild SLA and test it. | Availability | Engineering | OPEN |
| OQ-E07 | Feature flag implementation: Simple environment-variable-based flags sufficient for MVP (`FF_MARKETPLACE`, `FF_ARENA_SUMO`, `FF_ADMIN_PORTAL`)? Or invest in a LaunchDarkly/Flagsmith integration for runtime toggles? | Operations | Engineering + PM | OPEN |
| OQ-E08 | Sumo arena mode battle calculation: The CONSTANTS define `ARENA_BATTLE_OUTCOME_RANDOM_MODIFIER` as covering both Race (Speed-based) and Sumo (Strength-based). Confirm the stat selection logic: Race uses Speed, Sumo uses Strength, modifier ±15% applied to selected stat. Document edge cases when both stats are equal. | Domain logic | Engineering | OPEN |

---

*This EDD is the authoritative engineering specification for pixel-pet-arena. All implementation decisions, schema designs, and API contracts must reference and comply with this document. Numeric values are sourced exclusively from CONSTANTS-PIXEL-PET-ARENA-20260503. Conflicts between this EDD and upstream PDD/VDD/PRD shall be resolved by filing an ECR (Engineering Change Request) against the relevant upstream document.*
