# Test Plan — pixel-pet-arena

**DOC-ID**: TEST-PLAN-PIXEL-PET-ARENA-20260503
**Project**: pixel-pet-arena
**Version**: v1.0
**Status**: DRAFT
**Author**: AI Generated (gendoc test-plan)
**Date**: 2026-05-03
**Upstream**: ARCH-PIXEL-PET-ARENA-20260503, API-PIXEL-PET-ARENA-20260503, EDD-PIXEL-PET-ARENA-20260503, SCHEMA-PIXEL-PET-ARENA-20260503, PRD-PIXEL-PET-ARENA-20260503, CONSTANTS-PIXEL-PET-ARENA-20260503

---

## Table of Contents

1. [Test Objectives](#1-test-objectives)
2. [Test Scope](#2-test-scope)
3. [Test Environment Setup](#3-test-environment-setup)
4. [Test Data Strategy](#4-test-data-strategy)
5. [Unit Tests](#5-unit-tests)
6. [Integration Tests](#6-integration-tests)
7. [End-to-End Tests](#7-end-to-end-tests)
8. [Performance Tests](#8-performance-tests)
9. [Security Tests](#9-security-tests)
10. [Accessibility Tests](#10-accessibility-tests)
11. [BDD Scenario Coverage](#11-bdd-scenario-coverage)
12. [CI/CD Integration](#12-cicd-integration)
13. [Test Cases](#13-test-cases)

---

## 1. Test Objectives

### 1.1 Primary Objectives

This test plan governs quality assurance for the pixel-pet-arena platform across all 8 architecture layers: Frontend (React + Phaser.js player app), Frontend (Vue 3 + Element Plus admin portal), Backend API (Node.js + Fastify), Database (PostgreSQL/Supabase), Cache (Redis/Upstash), Email Service (SendGrid + Nodemailer), Deployment Infrastructure, and Cross-Cutting Concerns.

The objectives are ordered by criticality to the product's core value proposition:

1. **Correctness**: Every acceptance criterion from the 18 user stories (US-PET-001, US-PET-002, US-AUTH-001, US-AUTH-002, US-TRAIN-001, US-FOOD-001, US-ARENA-001, US-ARENA-002, US-BOARD-001, US-RECORD-001, US-RARITY-001, US-TRADE-001, US-ADMIN-001, US-ADMIN-002, US-ADMIN-003, US-ADMIN-004, US-ADMIN-005, US-ADMIN-006) is verifiable by at least one automated test.

2. **Coverage**: Unit test coverage for all business logic modules must reach or exceed (unit_test_coverage_min_percent = 80)%. This threshold is enforced as a hard CI gate; builds fail below this line.

3. **Performance**: The API meets the SLO targets: P99 read latency below (p99_api_latency_read_ms_at_100_rps = 200) ms and P99 write latency below (p99_api_latency_write_ms_at_100_rps = 500) ms at (normal_operation_rps = 100) RPS sustained load. Frontend meets Core Web Vitals: FCP below (fcp_seconds = 1.5) s, LCP below (lcp_seconds = 2.5) s, CLS below (cls_score = 0.1), INP below (inp_ms = 200) ms.

4. **Security**: No OWASP Top 10 vulnerabilities exist in the claim flow, admin authentication, or data-handling endpoints. All rate limits and token-handling behaviors are verified under adversarial conditions.

5. **Reliability**: Degraded-mode behavior (Redis unavailable, SendGrid failure, PostgreSQL primary failover) is validated in integration and E2E tests so the system behaves predictably in production incidents.

6. **Compliance**: GDPR erasure ((gdpr_email_deletion_window_days = 7)-day SLA, internal 24-hour processing — gdpr_email_hashing_internal_sla_hours = 24), COPPA age-confirmation, and CAN-SPAM transactional-only email constraints are covered by dedicated test cases.

7. **Accessibility**: All P0 user flows conform to WCAG 2.1 Level AA. Focus contrast meets (a11y_focus_contrast_ratio = 3:1) and text contrast meets (a11y_text_contrast_normal = 4.5:1).

### 1.2 Out-of-Scope Test Objectives

The following areas are explicitly excluded from this test plan version:

- Phase 3 marketplace features (covered by FF_MARKETPLACE = false; basic smoke tests for feature-flag gate only)
- Native mobile app testing (project is HTML5 browser-only)
- Voice chat or MMORPG combat mechanics (out of project scope per PRD §4.4)
- Blockchain or P2E mechanics (out of project scope per PRD §4.4)

---

## 2. Test Scope

### 2.1 In-Scope Architecture Layers

All 8 architecture layers identified in ARCH.md are covered:

| Layer | Components | Test Types Applied |
|-------|-----------|-------------------|
| L1 — Frontend Player App | React 18, Phaser.js 3, Vite 5, TanStack Query, Zustand | Unit, E2E, Visual Regression, Accessibility, Performance |
| L2 — Frontend Admin Portal | Vue 3, Element Plus, Vite 5, Pinia, Axios, ECharts | Unit, E2E, Accessibility |
| L3 — Backend API | Node.js 20, Fastify 4, TypeScript 5, Zod | Unit, Integration, E2E, Performance, Security |
| L4 — Database | PostgreSQL 15+, Supabase, pg-migrate | Integration, Schema validation, Constraint testing |
| L5 — Cache | Redis 7+, Upstash, sorted sets, TTL discipline | Integration, Resilience/degraded-mode |
| L6 — Email Service | SendGrid v3, Nodemailer SMTP fallback | Integration, Failover testing |
| L7 — Deployment | Railway, Vercel, Docker, GitHub Actions | Smoke tests, Container health checks |
| L8 — Cross-Cutting Concerns | Logging (pino), observability, GDPR, config management | Unit, Integration, Compliance |

### 2.2 User Story Coverage Matrix

All 18 user stories are covered by at least one automated test. The complete traceability mapping is:

| User Story | Priority | Epic | Test Types Required |
|------------|----------|------|---------------------|
| US-PET-001 — Random Pet Display | P0 | EPIC-PET | E2E, Accessibility, Visual Regression |
| US-PET-002 — Procedural Pet Generation | P0 | EPIC-PET | Unit, Integration |
| US-AUTH-001 — Email Claim Flow | P0 | EPIC-AUTH | Unit, Integration, E2E, Security |
| US-AUTH-002 — Returning Pet Owner Access | P0 | EPIC-AUTH | E2E, Security |
| US-TRAIN-001 — Pet Training System | P0 | EPIC-TRAINING | Unit, Integration, E2E, Visual Regression |
| US-FOOD-001 — Special Food System | P0 | EPIC-TRAINING | Unit, Integration, E2E |
| US-ARENA-001 — Arena Racing Competition | P0 | EPIC-ARENA | Unit, Integration, E2E, Security, Performance |
| US-ARENA-002 — Sumo Arena Mode | P1 | EPIC-ARENA | Unit, Integration, E2E |
| US-BOARD-001 — Global Leaderboard | P0 | EPIC-RANKING | Integration, E2E, Performance |
| US-RECORD-001 — Battle Records Page | P0 | EPIC-RANKING | E2E, Integration |
| US-RARITY-001 — Rarity Scoring | P1 | EPIC-RANKING | E2E, Visual Regression |
| US-TRADE-001 — Pet Trading Marketplace | P2 | EPIC-MARKETPLACE | Integration (feature-flag gate only) |
| US-ADMIN-001 — Admin Pet Management | P0 | EPIC-ADMIN | E2E, Integration, Performance |
| US-ADMIN-002 — Admin Leaderboard Moderation | P0 | EPIC-ADMIN | Integration, E2E |
| US-ADMIN-003 — Admin Runtime Parameter Tuning | P1 | EPIC-ADMIN | Integration, E2E |
| US-ADMIN-004 — GDPR Data Deletion Processing | P0 | EPIC-ADMIN | Integration, E2E, Compliance |
| US-ADMIN-005 — Suspicious Battle Detection | P0 | EPIC-ADMIN | Integration, E2E |
| US-ADMIN-006 — Game Economy Configuration | P1 | EPIC-ADMIN | Integration, E2E |

### 2.3 Feature Flag Coverage

Every feature flag has a dedicated test that validates the kill-switch behavior (disabled state returns the correct error or placeholder, not a raw exception):

| Feature Flag | Kill-Switch Test | Live-Path Test |
|---|---|---|
| FF_GUEST_PET_DISPLAY | Static placeholder rendered when disabled | Random pet rendered on load |
| FF_PET_GENERATION | Pet generation pipeline disabled; random-pet endpoint returns 503 | Procedural pet generated on demand |
| FF_EMAIL_CLAIM | Claim button shows "Feature temporarily unavailable" | Full claim flow succeeds |
| FF_TRAINING_SYSTEM | Training buttons disabled with tooltip | Training stat increments correctly |
| FF_FOOD_SYSTEM | Food inventory hidden; existing buffs still calculated | Feed action applies stat buff |
| FF_ARENA_RACE | Arena entry disabled with maintenance message | Race match completes |
| FF_ARENA_SUMO | Mode not available in UI | Sumo match completes (when FF_ARENA_SUMO = true) |
| FF_LEADERBOARD | Leaderboard page shows unavailable message | Top 100 renders with correct ranks |
| FF_BATTLE_RECORDS | Battle records page returns 503 | Public page renders without auth |
| FF_RARITY_DISPLAY | Rarity badge and animated border hidden; no rarity metadata in pet API response | Rarity badge and tier-specific effects visible |
| FF_ADMIN_PORTAL | Admin routes return 503 | Admin login + dashboard accessible |
| FF_MARKETPLACE | Marketplace hidden from nav and routes | Listing page accessible (FF = true, staging only) |

---

## 3. Test Environment Setup

### 3.1 Environment Strategy

Three isolated environments mirror the deployment architecture from ARCH §7.3:

| Environment | Purpose | Database | Redis | Trigger |
|-------------|---------|----------|-------|---------|
| `test` (CI) | Automated test runs | PostgreSQL in Docker (CI service) | Redis in Docker (CI service) | Every pull request push |
| `staging` | Pre-production integration + E2E | Supabase staging project | Upstash staging namespace | Auto on main branch merge |
| `production` | Live smoke tests only | Supabase production | Upstash production | Post-deployment verification |

### 3.2 Local Development Test Setup

Prerequisites for local test execution:

```
Node.js 20 LTS
pnpm 9+
Docker Desktop (for PostgreSQL + Redis services)
```

Bootstrap commands:

```bash
# Start dependent services
docker compose up -d postgres redis

# Install all workspace dependencies
pnpm install

# Run database migrations on test database
pnpm run db:migrate --env test

# Run all test suites
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
```

### 3.3 CI Service Configuration

GitHub Actions CI matrix uses Docker service containers:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_DB: pixel_pet_arena_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

  redis:
    image: redis:7-alpine
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

Required environment variables in CI secrets:

- `TEST_DATABASE_URL`: PostgreSQL connection string for CI test database
- `TEST_REDIS_URL`: Redis connection string for CI test instance
- `TEST_SENDGRID_API_KEY`: SendGrid test-mode key (no real emails sent)
- `TEST_EMAIL_ENCRYPTION_KEY`: AES-256-GCM key for email encryption tests
- `TEST_JWT_SECRET`: HMAC secret for admin TOTP setup token tests

### 3.4 Playwright Browser Configuration

E2E tests run on three browser engines to satisfy cross-browser requirements:

```typescript
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]
```

Visual regression breakpoints tested: 320px, 768px, 1024px, 1440px (per web testing rules).

---

## 4. Test Data Strategy

### 4.1 Fixture Categories

Test fixtures are organized into four categories matching the domain model:

**Static Fixtures** (committed to repository, deterministic):

- `fixtures/pets/`: 20 pre-seeded pet records at known seeds covering all rarity tiers (Common × 12, Rare × 5, Epic × 2, Legendary × 1)
- `fixtures/admin_users/`: 3 admin accounts — one per role (super_admin, moderator, read_only)
- `fixtures/battle_records/`: 25 battle records (race × 15, sumo × 10, including AI matches)
- `fixtures/food_buffs/`: 12 food buff records (temporary × 6, permanent × 4, expired × 2)

**Generated Fixtures** (created at test setup, cleaned up after):

- Random pet tokens for each authenticated test: `crypto.randomBytes(32)` — mirrors production generation using (pet_access_token_min_bytes = 32)
- Claim codes: deterministic 6-digit integers in the 100000–999999 range generated via seeded pseudo-random for repeatability
- Admin sessions: Redis entries created with known session IDs and expiry timestamps

**Boundary Fixtures** (edge-case values):

- Pet with `stat_speed = 100` (at maximum — (pet_stat_max = 100)) to test the training-blocked path
- Pet with `last_trained_at` set to 4 days ago (exceeds (training_neglect_threshold_days = 3)) for neglected-state tests
- Claim code with `expires_at = NOW() - 1 second` to test the expired-code path
- Admin account with `locked_until = NOW() + (admin_login_lockout_duration_minutes = 30) minutes` for lockout state tests

**Negative Fixtures** (invalid data, must produce errors):

- Pet access token with length below (pet_access_token_min_bytes = 32) bytes
- Claim code with non-numeric characters (format violation)
- Admin password without uppercase, lowercase, and digit (validation rule)
- Rarity weights that do not sum to 100% (constraint violation for admin config)

### 4.2 Test Data Isolation

Each integration test suite runs inside a database transaction that is rolled back after the test completes, preventing state accumulation between tests. Redis keys created during tests use a test-specific namespace prefix (`test:{suite_id}:*`) and are flushed via `FLUSHDB` on the test Redis instance after each suite run.

### 4.3 Seed Data for Performance Tests

Load tests require a representative data set to produce realistic query plans:

- 100,000 pet records with randomized seeds and stats
- 500,000 battle records distributed across pets
- 10,000 training log entries
- Redis `leaderboard:global` sorted set populated with 50,000 entries

Seed data is generated by a dedicated script (`scripts/seed-perf-data.ts`) and loaded once into the staging environment before performance test runs.

---

## 5. Unit Tests

### 5.1 Test Framework and Configuration

All unit tests use Vitest with the following configuration:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        global: {
          branches: 80,   // unit_test_coverage_min_percent = 80
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
```

Coverage enforcement is a hard gate; CI fails if any threshold drops below (unit_test_coverage_min_percent = 80)%.

### 5.2 Pet Generation Unit Tests (US-PET-001, US-PET-002)

**File**: `packages/api/src/domain/pet/__tests__/pet-generation.test.ts`

| TC-UNIT-001 | Combination space exceeds minimum |
|---|---|
| Given | The generation algorithm with dimension counts from constants |
| When | Combination space is calculated as body × head × color_palette × accessory × rarity_trait × pattern |
| Then | Result exceeds (pet_generation_combinations_min = 1000000000) |
| Linked AC | AC-002-1 |

| TC-UNIT-002 | Deterministic generation from seed |
|---|---|
| Given | A fixed seed value (e.g. 123456789) |
| When | `generatePet(seed)` is called twice |
| Then | Both calls return identical attribute objects |
| Linked AC | AC-002-2 |

| TC-UNIT-003 | Rarity distribution matches probability weights |
|---|---|
| Given | 10,000 generated pets with random seeds |
| When | Rarity distribution is computed |
| Then | Common ≈ (rarity_common_percent = 60)%, Rare ≈ (rarity_rare_percent = 25)%, Epic ≈ (rarity_epic_percent = 12)%, Legendary ≈ (rarity_legendary_percent = 3)%, all within ±2% statistical tolerance |
| Linked AC | AC-002-5 |

| TC-UNIT-004 | Default stat values |
|---|---|
| Given | A newly generated pet |
| When | Stats are inspected |
| Then | speed = strength = stamina = (pet_stat_default = 10) |
| Linked AC | US-PET-002 (data model correctness) |

### 5.3 Claim Flow Unit Tests (US-AUTH-001, US-AUTH-002)

**File**: `packages/api/src/domain/auth/__tests__/claim-flow.test.ts`

| TC-UNIT-005 | OTP code expiry enforcement |
|---|---|
| Given | A claim code created with `expires_at = NOW() - 1 second` |
| When | `verifyClaimCode(code, claimId)` is called |
| Then | Throws `ClaimCodeExpiredError` with code `CODE_EXPIRED` |
| Linked AC | AC-003-4 |

| TC-UNIT-006 | OTP code one-time-use enforcement |
|---|---|
| Given | A claim code with `used_at` already set |
| When | `verifyClaimCode(code, claimId)` is called |
| Then | Throws `ClaimCodeAlreadyUsedError` with code `INVALID_CODE` |
| Linked AC | AC-003-5 |

| TC-UNIT-007 | Pet access token minimum entropy |
|---|---|
| Given | A call to `generatePetAccessToken()` |
| When | The raw token is inspected |
| Then | `Buffer.from(token, 'base64url').length >= (pet_access_token_min_bytes = 32)` |
| Linked AC | PRD NFR-SEC-05 |

| TC-UNIT-008 | Token stored as SHA-256 hash only |
|---|---|
| Given | A pet with an assigned access token |
| When | The `pets.owner_token_hash` column is read |
| Then | Value is a 64-character hex string (SHA-256 digest); raw token is absent from all persisted fields |
| Linked AC | PRD NFR-SEC-01 |

### 5.4 Training System Unit Tests (US-TRAIN-001, US-FOOD-001)

**File**: `packages/api/src/domain/training/__tests__/training.test.ts`

| TC-UNIT-009 | Stat increment range |
|---|---|
| Given | A pet with `stat_speed = 15` (any level; stat delta is level-independent per constants) |
| When | `applyTrainingAction(pet, 'RUN')` is called |
| Then | `stat_speed` increases by an integer in `[training_stat_points_min = 1, training_stat_points_max = 3]`; the delta is uniformly random and not level-dependent |
| Linked AC | AC-005-1 |

| TC-UNIT-010 | Stat cap enforcement — training blocked at maximum |
|---|---|
| Given | A pet with `stat_speed = (pet_stat_max = 100)` |
| When | `applyTrainingAction(pet, 'RUN')` is called |
| Then | Throws `StatAtMaximumError`; when serialized by the API handler the response is HTTP 400 with `{ "code": "STAT_AT_MAXIMUM", "message": "This stat has reached the maximum value of 100" }` |
| Linked AC | AC-005-6 |

| TC-UNIT-011 | Stat cap enforcement — food feed blocked at maximum |
|---|---|
| Given | A pet with `stat_strength = (pet_stat_max = 100)` and a permanent strength-boost food item |
| When | `feedFoodItem(pet, foodItem)` is called |
| Then | Throws `StatAtMaximumError`; when serialized by the API handler the response is HTTP 400 with `{ "code": "STAT_AT_MAXIMUM", "stat": "strength" }` |
| Linked AC | AC-006-6 |

| TC-UNIT-012 | Neglected state threshold |
|---|---|
| Given | A pet with `last_trained_at = NOW() - (training_neglect_threshold_days = 3) days - 1 hour` |
| When | `isNeglected(pet)` is called |
| Then | Returns `true` |
| Linked AC | AC-005-5 |

| TC-UNIT-013 | Daily training action limit |
|---|---|
| Given | A pet that has already completed (training_actions_per_day = 3) training actions in the current UTC day |
| When | `canTrain(pet)` is called |
| Then | Returns `false` |
| Linked AC | AC-005-2 |

### 5.5 Arena Battle Unit Tests (US-ARENA-001, US-ARENA-002)

**File**: `packages/api/src/domain/arena/__tests__/battle-calculation.test.ts`

| TC-UNIT-014 | Race outcome determinism with seed |
|---|---|
| Given | Two pets with known stats and a fixed `random_seed` |
| When | `calculateBattleOutcome('RACE', petA, petB, seed)` is called twice |
| Then | Both calls return the same winner |
| Linked AC | AC-007-2 |

| TC-UNIT-015 | Random modifier bounds |
|---|---|
| Given | 1,000 battle calculations with varied seeds |
| When | The effective speed modifier is extracted from each result |
| Then | All modifiers are within `[-15%, +15%]` — (arena_battle_outcome_random_modifier_percent = 15) |
| Linked AC | AC-007-2 |

| TC-UNIT-016 | Sumo mode uses strength stat |
|---|---|
| Given | PetA with `stat_speed = 100`, `stat_strength = 1`; PetB with `stat_speed = 1`, `stat_strength = 100`; fixed seed |
| When | `calculateBattleOutcome('SUMO', petA, petB, seed)` is called |
| Then | PetB wins (strength-dominant); race mode would have petA winning |
| Linked AC | AC-008-2 |

| TC-UNIT-017 | Arena score formula |
|---|---|
| Given | A pet with win_rate = 0.75, battles_played = 40, level = 5 |
| When | `calculateArenaScore(pet)` is called |
| Then | Result = 0.75 × 40 × level_multiplier(5), matching `(arena_score_formula = win_rate * battles_played * level_multiplier)` |
| Linked AC | AC-009-1 |

### 5.6 Level Formula Unit Tests

**File**: `packages/api/src/domain/pet/__tests__/level.test.ts`

| TC-UNIT-018 | Level formula derivation |
|---|---|
| Given | A pet with 35 total training actions |
| When | `calculateLevel(totalTrainingActions)` is called |
| Then | Returns `FLOOR(35 / (pet_level_formula_divisor = 10)) = 3` |
| Linked AC | US-TRAIN-001 (level growth) |

| TC-UNIT-019 | Level cap enforcement |
|---|---|
| Given | A pet with 1,500 total training actions |
| When | `calculateLevel(totalTrainingActions)` is called |
| Then | Returns `(pet_level_max = 100)`, not 150 |
| Linked AC | US-TRAIN-001 |

### 5.7 Security Unit Tests

**File**: `packages/api/src/security/__tests__/`

| TC-UNIT-020 | Email enumeration prevention |
|---|---|
| Given | Two calls to the claim handler — one with a registered email, one with an unregistered email |
| When | Response objects are compared |
| Then | Both responses have identical structure, HTTP status code, and response body text |
| Linked AC | AC-003-6, PRD NFR-SEC-03 |

| TC-UNIT-021 | Recovery endpoint anti-enumeration |
|---|---|
| Given | `POST /api/v1/claim/recover` with an email that matches no pet |
| When | Response is inspected |
| Then | HTTP 200 returned with a synthetic `claimId`; no `NOT_FOUND` status exposed |
| Linked AC | ARCH §5.2 anti-enumeration |

| TC-UNIT-022 | Error sanitization in production mode |
|---|---|
| Given | `NODE_ENV = production` and an internal server error thrown during request handling |
| When | The error response is serialized |
| Then | `stack`, internal `code`, and path details are absent; only public `code`, user-safe `message`, and optional `retryAfter` are present |
| Linked AC | ARCH §8.2 production error sanitization |

---

## 6. Integration Tests

### 6.1 Claim Flow Integration Tests (US-AUTH-001, US-AUTH-002)

**File**: `packages/api/src/__tests__/integration/claim-flow.integration.test.ts`

| TC-INT-001 | Full claim flow persists ownership |
|---|---|
| Given | A guest pet record in PostgreSQL and a valid claim code |
| When | `POST /api/v1/claim/verify` is called with the correct OTP |
| Then | `pets.owner_token_hash` is set; `claim_codes.used_at` is set; response includes `petToken` and `petUrl` |
| Linked AC | AC-003-3 |

| TC-INT-002 | Claim rate limit enforced via Redis |
|---|---|
| Given | Redis `rl:claim:{email_hash}` counter at (auth_rate_limit_claim_attempts_per_hour = 5) |
| When | `POST /api/v1/claim` is submitted for the same email |
| Then | HTTP 429 returned with `Retry-After` header; counter not incremented further |
| Linked AC | PRD NFR-SEC-04 |

| TC-INT-003 | Seed collision retry mechanism |
|---|---|
| Given | The first 2 generated seeds already exist in `pets.seed` |
| When | `GET /api/v1/pets/random` is called |
| Then | A unique seed is found on the 3rd attempt; HTTP 200 returned |
| Linked AC | AC-002-3 |

| TC-INT-004 | Seed collision max retries exceeded |
|---|---|
| Given | All attempts up to (pet_seed_collision_max_retries = 3) produce colliding seeds |
| When | `GET /api/v1/pets/random` is called |
| Then | HTTP 500 with `INTERNAL_SERVER_ERROR` |
| Linked AC | ARCH §6.1 collision retry |

| TC-INT-024 | Seed uniqueness guarantee across large batch |
|---|---|
| Given | 10,000 pet records generated with random seeds |
| When | All `pets.seed` values are collected |
| Then | No two pets share the same seed value; the uniqueness constraint holds across the full generated set |
| Linked AC | AC-002-4 |

| TC-INT-005 | OTP code entry fail-closed on Redis unavailability |
|---|---|
| Given | Redis is unavailable (connection refused) |
| When | `POST /api/v1/claim/verify` is called with a valid code |
| Then | HTTP 503 or 429 is returned; claim is NOT completed; alert is logged |
| Linked AC | ARCH §5.3 fail-closed OTP entry |

### 6.2 Training and Food Integration Tests (US-TRAIN-001, US-FOOD-001)

**File**: `packages/api/src/__tests__/integration/training.integration.test.ts`

| TC-INT-006 | Training stat persisted across reads |
|---|---|
| Given | A pet with `stat_speed = 15` |
| When | `POST /api/v1/pets/:petId/train` is called with `{ trainingType: "RUN" }` |
| Then | Subsequent `GET /api/v1/pets/:petId` returns `stat_speed` in range `[16, 18]` |
| Linked AC | AC-005-4 |

| TC-INT-007 | Food buff active during arena combat |
|---|---|
| Given | A pet with `stat_speed = 20` and an active temporary speed buff of +(food_buff_example_temp_amount_stat_points = 5) |
| When | Arena battle calculation reads pet stats |
| Then | Effective speed = 25 (base + buff applied) and buff indicator is included in pre-battle response |
| Linked AC | AC-006-5 |

| TC-INT-008 | Permanent food buff increments base stat |
|---|---|
| Given | A pet with `stat_strength = 30` and a permanent +(food_buff_example_perm_amount_stat_points = 3) strength food item |
| When | Feed action is confirmed |
| Then | `pets.stat_strength` = 33; food_buff record has no `expires_at`; `food_buffs.is_permanent = true` |
| Linked AC | AC-006-2 |

### 6.3 Arena Integration Tests (US-ARENA-001, US-ARENA-002, US-BOARD-001)

**File**: `packages/api/src/__tests__/integration/arena.integration.test.ts`

| TC-INT-009 | Battle record saved for both pets |
|---|---|
| Given | Two pets matched in a Race arena battle |
| When | Battle completes |
| Then | `arena_matches` table has one row; both pet IDs referenced; `random_seed` stored for replay |
| Linked AC | AC-007-4 |

| TC-INT-010 | Leaderboard updated within update lag |
|---|---|
| Given | A battle completes and both pets' arena scores are recalculated |
| When | Redis `leaderboard:global` ZADD is executed |
| Then | Updated scores are visible via `ZRANGE leaderboard:global 0 99 REV WITHSCORES` within (leaderboard_update_lag_max_seconds = 30) seconds |
| Linked AC | AC-009-2 |

| TC-INT-011 | Arena rate limit enforced per pet per hour |
|---|---|
| Given | A pet with `rl:arena:{pet_id}` counter at (arena_rate_limit_battles_per_hour_default = 10) |
| When | `POST /api/v1/arena/enter` is called |
| Then | HTTP 429 with `Retry-After` header; rate limit NOT incremented on timeout |
| Linked AC | AC-007-6, AC-007-8 |

| TC-INT-012 | AI opponent fallback after matchmaking timeout |
|---|---|
| Given | No opposing pet in `matchmaking:queue:RACE` for (arena_matchmaking_timeout_seconds = 30) seconds |
| When | Request includes `acceptAI: true` |
| Then | Match completes with `is_ai_opponent = true`; player pet's leaderboard score updated; AI synthetic pet not added to leaderboard |
| Linked AC | AC-007-7 |

| TC-INT-013 | Leaderboard fallback to PostgreSQL snapshot when Redis unavailable |
|---|---|
| Given | Redis is unavailable; `leaderboard_snapshots` table has a recent entry |
| When | `GET /api/v1/leaderboard` is called |
| Then | HTTP 200 with `degraded: true`; data sourced from PostgreSQL snapshot |
| Linked AC | ARCH §4.3 fallback flow |

### 6.4 GDPR Integration Tests (US-AUTH-002, US-ADMIN-004)

**File**: `packages/api/src/__tests__/integration/gdpr.integration.test.ts`

| TC-INT-014 | Erasure request nulls email within internal SLA |
|---|---|
| Given | A claimed pet with a linked `claim_identity_id` |
| When | `POST /api/v1/gdpr/request` with `type: "erasure"` is processed by the background job |
| Then | `claim_identities.email_encrypted` is NULL within (gdpr_email_hashing_internal_sla_hours = 24) hours; `email_hash` retained; `pets` rows retained |
| Linked AC | AC-004-4, AC-016-1, AC-016-2, ARCH §4.4 |

| TC-INT-015 | Erased pet removed from Redis leaderboard |
|---|---|
| Given | An erased identity whose pet exists in `leaderboard:global` sorted set |
| When | GDPR erasure background job completes |
| Then | `ZRANK leaderboard:global {petId}` returns null |
| Linked AC | ARCH §4.4 GDPR flow |

| TC-INT-016 | Email hash retained for anti-re-registration |
|---|---|
| Given | A GDPR-erased email |
| When | The same email is submitted in a new claim attempt |
| Then | `email_hash` lookup finds the existing record; duplicate is prevented |
| Linked AC | ARCH §5.4 data minimization |

### 6.5 Admin Integration Tests (US-ADMIN-001 through US-ADMIN-006)

**File**: `packages/api/src/__tests__/integration/admin.integration.test.ts`

| TC-INT-017 | Admin pet ban removes from leaderboard within SLA |
|---|---|
| Given | A pet with an active leaderboard entry |
| When | `POST /admin/api/pets/:petId/ban` is called |
| Then | `ZRANK leaderboard:global {petId}` returns null within (leaderboard_ban_reflection_time_minutes = 5) minutes (synchronous ZREM) |
| Linked AC | AC-013-3, ARCH §5.3 ban reflection |

| TC-INT-018 | Config change propagates within cache TTL |
|---|---|
| Given | Arena rate limit is updated via `PUT /admin/api/config/runtime` |
| When | (config_cache_refresh_time_minutes = 5) minutes elapse |
| Then | All API replicas apply the new rate limit |
| Linked AC | AC-015-2 |

| TC-INT-019 | Audit log written for every admin mutation |
|---|---|
| Given | An admin performs a ban, config change, and GDPR deletion in sequence |
| When | `GET /admin/api/audit?limit=10` is called |
| Then | Three distinct audit records exist with correct `action`, `admin_id`, and `detail` (JSONB payload) fields |
| Linked AC | AC-015-3, AC-016-4, AC-017-4, AC-018-4 |

| TC-INT-020 | Suspicious pet auto-flagged at threshold |
|---|---|
| Given | A pet that has completed more than (bot_detection_battles_threshold = 50) battles within a (bot_detection_window_minutes = 60)-minute rolling window |
| When | The detection job or inline check runs |
| Then | Pet appears in `GET /admin/api/suspicious` with a `SUSPICIOUS` badge |
| Linked AC | AC-017-1 |

| TC-INT-021 | Economy config applied within cache TTL |
|---|---|
| Given | Food buff multiplier updated to 2.5x via `PUT /admin/api/config/economy` |
| When | A pet is fed a temporary food item after the cache refreshes |
| Then | The applied stat bonus reflects the 2.5x multiplier (within range: (food_buff_multiplier_admin_min = 0.5) to (food_buff_multiplier_admin_max = 5.0)) |
| Linked AC | AC-018-3 |

### 6.6 Email Service Integration Tests (US-AUTH-001)

**File**: `packages/api/src/__tests__/integration/email-service.integration.test.ts`

| TC-INT-022 | SendGrid failover after consecutive failures |
|---|---|
| Given | SendGrid mock returns HTTP 500 for (sendgrid_failover_consecutive_failures = 3) consecutive calls |
| When | The 4th email send is triggered |
| Then | Nodemailer SMTP fallback is used; delivery succeeds |
| Linked AC | ARCH §6.4 failover flow |

| TC-INT-023 | Claim email contains 6-digit code, no URL |
|---|---|
| Given | A claim initiation for a valid email |
| When | The email body is inspected via mock transport |
| Then | Body contains exactly a (claim_code_digits = 6)-digit numeric code; no `https://` or clickable link present |
| Linked AC | ARCH §2.6 email security design, ARCH §5.2 |

---

## 7. End-to-End Tests

### 7.1 E2E Framework Configuration

All E2E tests use Playwright with the configuration defined in Section 3.4. Tests are organized by critical user flow and are always executed against the staging environment before production.

### 7.2 Guest Pet Interaction Flow (US-PET-001)

**File**: `packages/player-app/tests/e2e/guest-pet.spec.ts`

| TC-E2E-001 | Pet renders within SLO on page load |
|---|---|
| Given | A new browser tab navigating to `https://staging.pixel-pet-arena.com/` |
| When | Page load completes |
| Then | Pet canvas element is visible within (pet_render_on_load_seconds = 2) seconds; no COPPA modal blocking view |
| Linked AC | AC-001-1 |

| TC-E2E-002 | Pet interaction response time |
|---|---|
| Given | A loaded pet canvas |
| When | User clicks the pet canvas element |
| Then | An interaction animation begins within (pet_interaction_response_ms = 200) ms |
| Linked AC | AC-001-2 |

| TC-E2E-003 | Page refresh generates a different pet |
|---|---|
| Given | A guest with a rendered pet having `petId = X` |
| When | The page is refreshed via `F5` |
| Then | A new pet with a different `petId` is rendered |
| Linked AC | AC-001-4 |

### 7.3 Email Claim Flow (US-AUTH-001, US-AUTH-002)

**File**: `packages/player-app/tests/e2e/claim-flow.spec.ts`

| TC-E2E-004 | Complete claim flow — happy path |
|---|---|
| Given | A guest with an unclaimed pet on screen |
| When | User clicks "Claim This Pet", enters email + checks COPPA checkbox, submits, enters correct OTP |
| Then | Pet URL is displayed; navigating to that URL shows the pet page with owner controls |
| Linked AC | AC-003-3, AC-003-7 |

| TC-E2E-005 | COPPA age confirmation prevents submit |
|---|---|
| Given | Email entered but COPPA checkbox unchecked |
| When | User attempts to submit the claim form |
| Then | Form submission is blocked; inline error "Please confirm you are at least 13 years old" is visible |
| Linked AC | AC-003-8 |

| TC-E2E-006 | Expired claim code shows correct error |
|---|---|
| Given | A valid email submitted but the test waits until OTP is past expiry (test uses a backdated code) |
| When | User enters the expired code |
| Then | Error message reads "Claim code has expired. Please request a new claim link." and a re-send button is visible |
| Linked AC | AC-003-4 |

| TC-E2E-007 | Invalid pet URL returns 404 |
|---|---|
| Given | A browser navigates to `/pet/invalid-token-that-does-not-exist` |
| When | Page loads |
| Then | HTTP 404 displayed with message "This pet URL is not valid or has been revoked" and a link to home page |
| Linked AC | AC-004-5 |

| TC-E2E-008 | Pet URL works cross-device (multi-context test) |
|---|---|
| Given | A pet claimed in one browser context (Chromium) |
| When | The pet URL is accessed in a second browser context (Firefox) |
| Then | Correct pet page loads with current stats; owner action buttons visible |
| Linked AC | AC-004-1 |

### 7.4 Training and Food E2E Tests (US-TRAIN-001, US-FOOD-001)

**File**: `packages/player-app/tests/e2e/training.spec.ts`

| TC-E2E-009 | Three training actions per day |
|---|---|
| Given | A freshly claimed pet |
| When | User completes 3 training actions (speed, strength, stamina) in sequence |
| Then | After 3rd action, all training buttons are disabled; countdown timer is visible |
| Linked AC | AC-005-1, AC-005-2 |

| TC-E2E-010 | Stat change indicator displays for correct duration |
|---|---|
| Given | A training action is submitted |
| When | Server responds with success |
| Then | Stat indicator `+X Speed` appears and disappears after (training_stat_display_duration_seconds = 2) seconds |
| Linked AC | AC-005-3 |

| TC-E2E-011 | Food inventory and feed animation |
|---|---|
| Given | A pet owner with food items in inventory |
| When | User clicks a food item in the inventory |
| Then | Feeding animation plays; item removed from inventory; buff visible on stats panel |
| Linked AC | AC-006-1, AC-006-3 |

| TC-E2E-025 | Food inventory empty — get more food prompt |
|---|---|
| Given | A pet owner whose food inventory is empty |
| When | Owner views the food inventory section |
| Then | "Get more food" prompt is visible with two earning mechanisms highlighted: (a) arena battle food drop on battle completion, (b) food reward on (training_actions_per_day = 3)-session training streak; no error or broken state shown |
| Linked AC | AC-006-4 |

### 7.5 Arena E2E Tests (US-ARENA-001, US-ARENA-002)

**File**: `packages/player-app/tests/e2e/arena.spec.ts`

| TC-E2E-012 | Arena battle complete cycle |
|---|---|
| Given | Two pets in the matchmaking pool for Race mode |
| When | Both pets enter via `POST /api/v1/arena/enter` |
| Then | Match found within (arena_matchmaking_timeout_seconds = 30) seconds; animation plays (duration between (arena_match_duration_min_seconds = 5) and (arena_match_duration_max_seconds = 15) s); result screen shows Win/Loss and stat comparison |
| Linked AC | AC-007-1, AC-007-3 |

| TC-E2E-013 | Share battle result URL generated |
|---|---|
| Given | A completed arena battle |
| When | User clicks "Share Battle Result" |
| Then | A unique shareable URL is generated and displayed; navigating to the URL loads the battle record page publicly |
| Linked AC | AC-007-5 |

| TC-E2E-014 | Rate limit UI — countdown and disabled button |
|---|---|
| Given | A pet that has completed (arena_rate_limit_battles_per_hour_default = 10) battles this hour |
| When | User attempts to enter arena again |
| Then | Message "Arena rate limit reached. You can enter again in X minutes" displayed; Enter Arena button is disabled; API returns HTTP 429 with `Retry-After` header |
| Linked AC | AC-007-8 |

### 7.6 Leaderboard, Battle Records, and Rarity E2E Tests (US-BOARD-001, US-RECORD-001, US-RARITY-001)

**File**: `packages/player-app/tests/e2e/leaderboard.spec.ts`

| TC-E2E-015 | Leaderboard publicly accessible without login |
|---|---|
| Given | A guest browser navigates to `/leaderboard` |
| When | Page loads |
| Then | Top (leaderboard_top_display = 100) pets displayed in rank order; no auth required |
| Linked AC | AC-009-5 |

| TC-E2E-016 | Owner rank banner visible outside top 100 |
|---|---|
| Given | A pet owner whose pet is ranked 250th |
| When | Owner accesses leaderboard via their pet URL token |
| Then | Their pet's rank (250) is highlighted in an OwnerRankBanner below the top 100 table |
| Linked AC | AC-009-3 |

| TC-E2E-026 | Rarity badge shows occurrence rate |
|---|---|
| Given | A pet page for a Legendary pet |
| When | The page loads |
| Then | Rarity badge text reads "Legendary — (rarity_legendary_percent = 3)% of all pets" |
| Linked AC | AC-011-2 |

| TC-E2E-027 | Leaderboard filterable by rarity tier |
|---|---|
| Given | The leaderboard page with pets of all four rarity tiers present |
| When | User selects the "Epic" rarity filter |
| Then | Only Epic-rarity pets are shown in the filtered results; pets of other rarities are hidden |
| Linked AC | AC-011-3 |

| TC-E2E-017 | Battle records page — public access and display cap |
|---|---|
| Given | A pet with 25 battle records (exceeds (arena_battle_records_display_count = 20) cap) |
| When | Guest navigates to `/pet/:petId/records` |
| Then | Exactly (arena_battle_records_display_count = 20) battles displayed (oldest omitted); each shows date, mode (Race/Sumo), opponent name, Win/Loss outcome; no auth prompt |
| Linked AC | AC-010-1, AC-010-2, AC-010-4 |

| TC-E2E-018 | Battle records page — fewer than 20 battles prompt |
|---|---|
| Given | A pet with 8 battle records |
| When | Records page loads |
| Then | 8 entries shown; message "More battles coming — enter the arena to build your records!" visible below last entry |
| Linked AC | AC-010-6 |

| TC-E2E-019 | Battle records page invalid pet ID |
|---|---|
| Given | A visitor navigates to `/pet/nonexistent-uuid/records` |
| When | Page attempts to load |
| Then | HTTP 404 with message "This pet could not be found" and home page link |
| Linked AC | AC-010-5 |

| TC-E2E-024 | Battle records page Open Graph meta tags |
|---|---|
| Given | A pet with a completed battle record |
| When | The battle records page HTML `<head>` is inspected |
| Then | Open Graph meta tags are present: `og:title` = pet name, `og:description` contains rarity and win count, `og:image` = pet sprite URL |
| Linked AC | AC-010-3 |

### 7.7 Admin Portal E2E Tests (US-ADMIN-001 through US-ADMIN-006)

**File**: `packages/admin-app/tests/e2e/admin.spec.ts`

| TC-E2E-020 | Admin TOTP login flow |
|---|---|
| Given | A super_admin account with TOTP configured |
| When | Admin logs in with correct password and TOTP token |
| Then | Session cookie set (httpOnly, SameSite=Strict); admin dashboard accessible |
| Linked AC | PRD NFR-ADMIN-01 |

| TC-E2E-021 | Admin pet search within SLA |
|---|---|
| Given | 1,000,000 pet records in the database (staging performance data) |
| When | Admin searches by exact pet ID or exact email hash (SHA-256; fragment search is not supported) |
| Then | Results returned within (admin_search_response_time_seconds = 2) seconds |
| Linked AC | AC-013-4 |

| TC-E2E-022 | Admin ban + leaderboard removal |
|---|---|
| Given | A pet visible on the public leaderboard |
| When | Admin bans the pet with a reason (max (admin_moderation_reason_max_chars = 500) chars) |
| Then | Pet no longer appears on public leaderboard within (leaderboard_ban_reflection_time_minutes = 5) minutes; audit log entry created |
| Linked AC | AC-013-2, AC-013-3, AC-014-3 |

| TC-E2E-023 | GDPR deletion E2E |
|---|---|
| Given | A super_admin and a user who submitted a deletion request |
| When | Super admin processes deletion via admin portal |
| Then | `email_encrypted` becomes NULL; pet page still loads with pseudonymous owner; audit log shows `GDPR_DELETION` action |
| Linked AC | AC-016-1, AC-016-3 |

| TC-E2E-028 | Admin runtime parameter tuning — arena rate limit update |
|---|---|
| Given | A super_admin authenticated in the admin portal and the System Config page |
| When | Admin sets max battles per hour to a new value in the allowed range [(arena_rate_limit_admin_min = 1), (arena_rate_limit_admin_max = 50)] and clicks Save |
| Then | Success toast displayed; updated value is visible in the config panel; audit log contains a record with `action = CONFIG_UPDATE`, the old value, and the new value |
| Linked AC | AC-015-1, AC-015-3 |

| TC-E2E-029 | Admin suspicious activity — flagged pet review and moderation |
|---|---|
| Given | A pet that has been auto-flagged SUSPICIOUS (more than (bot_detection_battles_threshold = 50) battles in a (bot_detection_window_minutes = 60)-minute window) |
| When | Moderator navigates to the Suspicious Activity page, clicks the flagged pet, reviews its battle timeline, and selects "Ban from Arena" with a reason |
| Then | SUSPICIOUS badge visible in the list; battle timeline for the suspicious window is displayed; ban action succeeds; pet removed from arena queue; audit log records moderator ID, timestamp, action, and reason (max (admin_moderation_reason_max_chars = 500) chars) |
| Linked AC | AC-017-2, AC-017-3, AC-017-4 |

| TC-E2E-030 | Admin game economy config — food buff multiplier update with preview |
|---|---|
| Given | A super_admin authenticated in the admin portal and the Game Economy Config page |
| When | Admin changes a food buff multiplier to a value in the allowed range [(food_buff_multiplier_admin_min = 0.5), (food_buff_multiplier_admin_max = 5.0)], reviews the old-value → new-value preview, and confirms save |
| Then | Preview dialog shows old and new values before save; after confirmation, updated multiplier visible in config panel; audit log records Super Admin ID, field name, old value, and new value |
| Linked AC | AC-018-1, AC-018-2, AC-018-4 |

---

## 8. Performance Tests

### 8.1 API Load Tests

**Tool**: k6 with threshold assertions. Load test scripts are in `tests/performance/`.

| TC-PERF-001 | P99 read latency under sustained load |
|---|---|
| Target | `GET /api/v1/leaderboard`, `GET /api/v1/pets/:petId` |
| Load | (normal_operation_rps = 100) RPS sustained for 5 minutes |
| Pass Threshold | P99 < (p99_api_latency_read_ms_at_100_rps = 200) ms; error rate < (error_rate_max_percent = 1)% |
| Linked NFR | NFR-PERF-01 |

| TC-PERF-002 | P99 write latency under sustained load |
|---|---|
| Target | `POST /api/v1/pets/:petId/train`, `POST /api/v1/arena/enter` |
| Load | (normal_operation_rps = 100) RPS sustained for 5 minutes |
| Pass Threshold | P99 < (p99_api_latency_write_ms_at_100_rps = 500) ms; error rate < (error_rate_max_percent = 1)% |
| Linked NFR | NFR-PERF-02 |

| TC-PERF-003 | Peak viral load — 500 RPS |
|---|---|
| Target | All player-facing endpoints combined |
| Load | Ramp from 100 to (peak_operation_rps = 500) RPS over 2 minutes; sustain 500 RPS for 5 minutes |
| Pass Threshold | System remains available (no HTTP 500 spikes > 1%); P99 < 1,000 ms (observability_latency_alert_threshold_ms = 1000) |
| Linked NFR | NFR-SCALE-01, NFR-SCALE-02 |

| TC-PERF-004 | Matchmaking concurrent entries |
|---|---|
| Target | `POST /api/v1/arena/enter` with (arena_matchmaking_concurrent_entries = 100) simultaneous entries |
| Load | 100 concurrent arena enter requests for RACE mode |
| Pass Threshold | All 100 entries queued without error; pairs resolved within (arena_matchmaking_timeout_seconds = 30) seconds |
| Linked NFR | NFR-SCALE-04 |

| TC-PERF-005 | Pet generation batch concurrency |
|---|---|
| Target | Internal batch generation pipeline |
| Load | Generate (pet_generation_concurrent_batch = 1000) pets simultaneously |
| Pass Threshold | All 1,000 pets generated within (pet_generation_concurrent_batch_time_seconds = 10) seconds |
| Linked NFR | NFR-SCALE-05 |

### 8.2 Frontend Performance Tests

**Tool**: Playwright + Lighthouse CI

| TC-PERF-006 | Core Web Vitals — Landing Page |
|---|---|
| URL | `https://staging.pixel-pet-arena.com/` |
| Pass Threshold | FCP < (fcp_seconds = 1.5) s; LCP < (lcp_seconds = 2.5) s; CLS < (cls_score = 0.1); INP < (inp_ms = 200) ms |
| Linked NFR | NFR-PERF-03 through NFR-PERF-06 |

| TC-PERF-007 | JS bundle size within budget |
|---|---|
| Target | Vite production build |
| Pass Threshold | Total gzipped JS ≤ (total_js_bundle_gzipped_kb = 300) KB; total gzipped CSS ≤ (total_css_bundle_gzipped_kb = 50) KB |
| Linked NFR | PRD §7.1 bundle budgets |

| TC-PERF-008 | Pet canvas animation FPS |
|---|---|
| Tool | Playwright `page.evaluate(() => performance.measure(...))` |
| Pass Threshold | Sustained FPS ≥ (pet_animation_fps_min = 30) on mid-range device emulation (Pixel 5 profile) |
| Linked NFR | NFR-PERF-07 |

| TC-PERF-009 | Pet render on load within SLO |
|---|---|
| Given | Cold page load |
| When | Pet canvas first frame renders |
| Then | Elapsed time ≤ (pet_render_on_load_seconds = 2) seconds |
| Linked NFR | ARCH §2.1 render SLO |

### 8.3 Admin Portal Performance Tests

| TC-PERF-010 | Admin pet search with 1M records |
|---|---|
| Target | `GET /admin/api/pets?search={petId}` |
| Precondition | 1,000,000 pets seeded in staging database |
| Pass Threshold | Response time ≤ (admin_search_response_time_seconds = 2) seconds |
| Linked AC | AC-013-4, PRD NFR-ADMIN-06 |

| TC-PERF-011 | Admin page load SLO |
|---|---|
| Target | All admin portal pages |
| Pass Threshold | Any admin page with up to 1,000,000 pet records loads within (admin_page_load_time_seconds = 3) seconds |
| Linked NFR | PRD NFR-ADMIN-06 |

| TC-PERF-012 | Audit log search across 12-month window |
|---|---|
| Target | `GET /admin/api/audit?from={12MonthsAgo}&to={now}` |
| Pass Threshold | Response within (admin_audit_log_search_response_time_seconds = 3) seconds |
| Linked NFR | ARCH §5.4 audit log search |

### 8.4 Database Performance Tests

| TC-PERF-013 | PostgreSQL autofailover recovery |
|---|---|
| Given | PostgreSQL primary is terminated (simulated) |
| When | Failover to read replica initiates |
| Then | Write availability restored within (db_autofailover_time_seconds = 60) seconds |
| Linked NFR | NFR-AVAIL-03 |

| TC-PERF-014 | Health check response time |
|---|---|
| Target | `GET /health` |
| Pass Threshold | Response ≤ (health_check_response_time_ms = 500) ms including database and cache connectivity status |
| Linked NFR | NFR-AVAIL-06 |

---

## 9. Security Tests

### 9.1 Authentication and Token Security Tests

| TC-SEC-001 | Pet token minimum entropy |
|---|---|
| Given | (pet_access_token_min_bytes = 32) bytes from `crypto.randomBytes(32)` |
| When | Token uniqueness is checked across 100,000 generated tokens |
| Then | Zero collisions; all tokens are URL-safe base64; all have byte length ≥ 32 |
| Linked NFR | NFR-SEC-01, NFR-SEC-05 |

| TC-SEC-002 | Token revocation via blacklist |
|---|---|
| Given | A valid pet access token |
| When | Admin initiates a recovery flow (new token issued); old token hash written to `token:blacklist:{hash}` with TTL = (claim_token_cleanup_ttl_hours = 72) hours |
| Then | Any request using the old token within the (claim_token_cleanup_ttl_hours = 72)-hour window returns HTTP 401 |
| Linked NFR | ARCH §2.5 token blacklist |

| TC-SEC-003 | Admin TOTP required — no bypass |
|---|---|
| Given | Admin submits correct username + password only (no TOTP) |
| When | Login endpoint is called |
| Then | HTTP 403 `TOTP_SETUP_REQUIRED` (if TOTP not yet enrolled) or HTTP 401 `UNAUTHORIZED` (if TOTP is enrolled but no code submitted); no session cookie issued in either case |
| Linked NFR | NFR-SEC-11 |

| TC-SEC-004 | Admin session absolute expiry |
|---|---|
| Given | An admin session created (admin_session_absolute_expiry_hours = 8) hours ago with continuous activity |
| When | Admin makes any authenticated request |
| Then | Session is invalidated; HTTP 401 returned |
| Linked NFR | PRD NFR-ADMIN-02 |

| TC-SEC-005 | Admin IP allowlist enforcement |
|---|---|
| Given | `ADMIN_ALLOWED_IPS` set to a specific CIDR; request originating from outside that CIDR |
| When | `POST /admin/api/auth/login` is called |
| Then | HTTP 403 `FORBIDDEN` before any credential check |
| Linked NFR | ARCH §5.1 IP allowlist |

### 9.2 Rate Limiting and Brute Force Prevention Tests

| TC-SEC-006 | Claim rate limit enforced per email hash |
|---|---|
| Given | (auth_rate_limit_claim_attempts_per_hour = 5) claim attempts for the same email |
| When | A 6th attempt is submitted within the rolling hour |
| Then | HTTP 429 with `Retry-After`; counter not incremented beyond limit |
| Linked NFR | NFR-SEC-04 |

| TC-SEC-007 | OTP code entry fail-closed |
|---|---|
| Given | Redis unavailable |
| When | `POST /api/v1/claim/verify` is called |
| Then | HTTP 503 or 429 returned; code NOT treated as valid; alert logged |
| Linked NFR | ARCH §5.3 fail-closed |

| TC-SEC-008 | Admin login IP rate limit |
|---|---|
| Given | (admin_login_ip_rate_limit_attempts = 10) failed logins from the same IP within (admin_login_ip_rate_limit_window_seconds = 900) seconds |
| When | An 11th attempt originates from the same IP |
| Then | HTTP 429 with `Retry-After` |
| Linked NFR | ARCH §5.3 admin rate limits |

| TC-SEC-009 | Admin account lockout |
|---|---|
| Given | (admin_login_lockout_threshold = 10) consecutive failed login attempts for the same admin account |
| When | The 11th attempt is made |
| Then | HTTP 403 `ACCOUNT_LOCKED`; `locked_until = NOW() + (admin_login_lockout_duration_minutes = 30) minutes` in DB |
| Linked NFR | ARCH §5.3 account lockout |

| TC-SEC-010 | Arena rate limit not incremented on matchmaking timeout |
|---|---|
| Given | A pet enters arena and times out (no opponent in (arena_matchmaking_timeout_seconds = 30) seconds), `acceptAI = false` |
| When | HTTP 408 `MATCHMAKING_TIMEOUT` is returned |
| Then | `rl:arena:{pet_id}` counter is NOT incremented |
| Linked AC | ARCH §4.2 arena battle flow |

### 9.3 Data Handling and Privacy Tests

| TC-SEC-011 | Email never logged in plaintext |
|---|---|
| Given | A complete claim flow from email submission through OTP verification |
| When | All log entries from pino are captured |
| Then | No log entry contains a raw email address; only `email_hash` (SHA-256) is present in log fields |
| Linked NFR | ARCH §8.1 PII rules |

| TC-SEC-012 | Raw IP never written to database |
|---|---|
| Given | A request that triggers an audit log entry |
| When | `admin_audit_log.ip_address_hash` is inspected |
| Then | Value is a 64-character hex string (SHA-256 hash); no dotted-decimal or IPv6 literal |
| Linked NFR | ARCH §8.1 PII rules |

| TC-SEC-013 | SQL injection prevention — parameterized queries |
|---|---|
| Given | An endpoint that accepts user-supplied pet ID or search parameters |
| When | SQL injection payloads (e.g. `'; DROP TABLE pets; --`) are submitted as query parameters |
| Then | HTTP 400 `VALIDATION_ERROR` or clean empty result; no SQL error exposed; database unchanged |
| Linked NFR | NFR-SEC-09 |

| TC-SEC-014 | Security headers present on all responses |
|---|---|
| Given | Any API or frontend response |
| When | Response headers are inspected |
| Then | All of the following are present: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` |
| Linked NFR | ARCH §5.5 |

| TC-SEC-015 | Pet tokens absent from all log output |
|---|---|
| Given | A complete sequence of authenticated pet requests |
| When | All pino log entries captured over the sequence are scanned |
| Then | No log entry contains the raw 32-byte token; only `token_length` or boolean presence flags are permitted |
| Linked NFR | ARCH §8.1 |

---

## 10. Accessibility Tests

### 10.1 Automated Accessibility Scans

**Tool**: axe-core integrated into Playwright tests. All P0 page routes are scanned on each CI run.

| TC-A11Y-001 | axe-core: no violations on landing page |
|---|---|
| Given | Guest visits `https://staging.pixel-pet-arena.com/` |
| When | axe-core analysis runs |
| Then | Zero critical or serious violations reported |
| Linked NFR | NFR-A11Y-01 |

| TC-A11Y-002 | axe-core: no violations on claim flow |
|---|---|
| Given | Each step of the 3-step claim flow (`/claim`, email form, OTP entry, URL reveal) |
| When | axe-core analysis runs at each step |
| Then | Zero critical or serious violations reported |
| Linked NFR | NFR-A11Y-01 through NFR-A11Y-03 |

| TC-A11Y-003 | Focus indicator contrast ratio |
|---|---|
| Given | Any focusable interactive element on any P0 page |
| When | Contrast ratio between focus indicator and surrounding background is measured |
| Then | All ratios ≥ (a11y_focus_contrast_ratio = 3:1) |
| Linked NFR | NFR-A11Y-01 |

| TC-A11Y-004 | Normal text contrast ratio |
|---|---|
| Given | All normal-size text across P0 pages |
| When | Contrast ratio measured using Playwright colour inspector |
| Then | All ratios ≥ (a11y_text_contrast_normal = 4.5:1) |
| Linked NFR | NFR-A11Y-01 |

| TC-A11Y-005 | Alt text on pixel pet sprites |
|---|---|
| Given | Pet canvas and sprite image elements across all P0 pages |
| When | `alt` attribute is inspected |
| Then | Descriptive alt text is present (e.g., "Legendary blue dragon pixel pet with fire accessory"); decorative animations use `alt=""` |
| Linked NFR | NFR-A11Y-02 |

### 10.2 Keyboard Navigation Tests

| TC-A11Y-006 | Full claim flow keyboard-only navigation |
|---|---|
| Given | A fresh browser session with mouse events disabled (keyboard only) |
| When | User navigates entire claim flow using Tab, Enter, Space |
| Then | Every interactive element receives focus in logical order; form submits correctly without mouse |
| Linked NFR | NFR-A11Y-03 |

| TC-A11Y-007 | Arena entry keyboard operable |
|---|---|
| Given | A pet owner navigates to Arena page using keyboard only |
| When | User presses Tab to reach "Enter Arena" button and Enter to activate |
| Then | Arena entry initiated; mode selector reachable via Tab and Arrow keys |
| Linked NFR | NFR-A11Y-03 |

| TC-A11Y-008 | Leaderboard keyboard navigation |
|---|---|
| Given | Leaderboard page loaded |
| When | User navigates rows using Tab and Arrow keys |
| Then | Each row receives focus; Enter activates the link to the pet's battle records page |
| Linked NFR | NFR-A11Y-03 |

### 10.3 Reduced-Motion Tests

| TC-A11Y-009 | Prefers-reduced-motion suppresses idle animation |
|---|---|
| Given | OS reduced-motion preference is active (Playwright `--force-prefers-reduced-motion`) |
| When | Guest views the pet canvas |
| Then | Pet animation is a static sprite; no particle effects; no looping movement |
| Linked AC | AC-001-5 |

| TC-A11Y-010 | Leaderboard transitions suppressed with reduced motion |
|---|---|
| Given | OS reduced-motion preference active |
| When | Leaderboard row order updates on the page |
| Then | No CSS animation or JavaScript motion applied to rows; content updates instantaneously |
| Linked NFR | NFR-A11Y-04 |

### 10.4 Claim Code Expiry Warning

| TC-A11Y-011 | Expiry warning at 2 minutes remaining |
|---|---|
| Given | A claim code created at T=0 expires at T+(claim_code_expiry_minutes = 15) minutes |
| When | The time remaining reaches (a11y_claim_code_warning_before_expiry_minutes = 2) minutes |
| Then | An `aria-live="assertive"` warning region becomes visible: "Your claim code expires in 2 minutes. Enter it now or request a new one." |
| Linked NFR | ARCH §2.1 accessibility claim warning |

### 10.5 Visual Regression Tests

Visual regression snapshots are taken at 320px, 768px, 1024px, and 1440px viewports. Snapshots are committed to the repository and compared on each CI run.

| TC-VR-001 | Landing page — all 4 breakpoints |
| TC-VR-002 | Claim flow 3 steps — all 4 breakpoints |
| TC-VR-003 | Pet page with active food buffs — all 4 breakpoints |
| TC-VR-004 | Arena page mode selector — all 4 breakpoints |
| TC-VR-005 | Leaderboard top 100 table — all 4 breakpoints |
| TC-VR-006 | Battle records page — all 4 breakpoints |
| TC-VR-007 | Legendary pet with animated border effect — 1024px, 1440px |
| TC-VR-008 | Rarity badge variants (Common / Rare / Epic / Legendary) — 1024px |

---

## 11. BDD Scenario Coverage

### 11.1 BDD Coverage Overview

The minimum number of BDD scenarios is calculated as `ceil(18 × 0.8) = 15`. This plan documents 17 scenarios covering the highest-priority user stories (US-PET-001, US-AUTH-001, US-AUTH-002, US-TRAIN-001, US-ARENA-001, US-BOARD-001, US-RARITY-001, US-ADMIN-004, US-ADMIN-005). Remaining user stories are covered at the required level by unit, integration, and E2E tests. Full scenario text lives in `features/server/` and `features/client/` Gherkin files.

### 11.2 Server-Side BDD Scenarios

```gherkin
Feature: Email Claim Flow (US-AUTH-001)

Scenario: Guest successfully claims a pet via email OTP
  Given a guest has viewed a randomly generated pet
  And the pet is not yet claimed
  When the guest submits a valid email and checks the age confirmation
  And the guest enters the correct 6-digit OTP within (claim_code_expiry_minutes = 15) minutes
  Then the pet's owner_token_hash is stored in the database
  And a unique pet URL is returned containing a (pet_access_token_min_bytes = 32)-byte token
  And the claim code is marked as used and cannot be reused

Scenario: Claim code expires after (claim_code_expiry_minutes = 15) minutes
  Given a claim code was created more than (claim_code_expiry_minutes = 15) minutes ago
  When the guest submits that code
  Then the system returns HTTP 400 with error code CODE_EXPIRED
  And a new claim email can be requested

Scenario: Claim rate limit blocks after (auth_rate_limit_claim_attempts_per_hour = 5) attempts per hour
  Given the email address has been used for (auth_rate_limit_claim_attempts_per_hour = 5) claim attempts in the past hour
  When a 6th claim attempt is submitted for the same email
  Then HTTP 429 is returned with a Retry-After header
  And the counter is not incremented further
```

```gherkin
Feature: Arena Battle System (US-ARENA-001)

Scenario: Two pets match and complete a race battle
  Given two claimed pets both enter Race arena mode
  And both pets are in the matchmaking queue
  When a match is found within (arena_matchmaking_timeout_seconds = 30) seconds
  Then the battle outcome is calculated deterministically from speed stats and a seeded modifier
  And the result is stored in arena_matches for both pets
  And the leaderboard sorted set is updated within (leaderboard_update_lag_max_seconds = 30) seconds

Scenario: AI fallback when no opponent available
  Given a pet enters Race arena mode
  And no real opponent joins within (arena_matchmaking_timeout_seconds = 30) seconds
  When the player accepts the AI opponent offer
  Then a battle result is recorded with is_ai_opponent = true
  And the player pet's arena score is updated in the leaderboard
  And no leaderboard entry is created for the AI synthetic pet

Scenario: Arena rate limit prevents excessive battles
  Given a pet has completed (arena_rate_limit_battles_per_hour_default = 10) battles in the current hour
  When the pet owner attempts to enter another arena battle
  Then HTTP 429 is returned with a Retry-After header
  And the arena rate limit counter is not incremented on matchmaking timeout
```

```gherkin
Feature: GDPR Erasure (US-AUTH-002, US-ADMIN-004)

Scenario: Player requests email erasure
  Given a pet owner with a linked claim identity
  When the owner submits a GDPR erasure request
  Then HTTP 202 is returned with a job ID
  And within (gdpr_email_hashing_internal_sla_hours = 24) hours the email_encrypted column is nulled
  And the email_hash is retained for anti-re-registration
  And the pet is removed from the public leaderboard

Scenario: Super admin processes GDPR deletion via admin portal
  Given a GDPR deletion request in the admin queue
  When a Super Admin processes it through the admin portal
  Then email_encrypted is set to NULL
  And an audit log entry records the action with actor ID and timestamp
  And the pet displays with a pseudonymous identifier
```

```gherkin
Feature: Leaderboard Resilience (US-BOARD-001)

Scenario: Leaderboard falls back to PostgreSQL when Redis unavailable
  Given Redis is unavailable
  And leaderboard_snapshots contains a recent entry
  When a player requests the leaderboard
  Then HTTP 200 is returned with degraded: true
  And data is sourced from the PostgreSQL snapshot
```

```gherkin
Feature: Admin Suspicious Battle Detection (US-ADMIN-005)

Scenario: Pet auto-flagged after exceeding battle threshold
  Given a pet completes more than (bot_detection_battles_threshold = 50) battles within a (bot_detection_window_minutes = 60)-minute rolling window
  When the bot detection check runs
  Then the pet is marked SUSPICIOUS in the admin suspicious activity feed
  And a suspicious_pet_flagged analytics event is emitted

Scenario: Moderator reviews and bans suspicious pet
  Given a SUSPICIOUS-flagged pet in the admin portal
  When the moderator selects the pet and submits a ban with reason text
  Then the pet is removed from the leaderboard within (leaderboard_ban_reflection_time_minutes = 5) minutes
  And the ban reason is persisted in the audit log (max (admin_moderation_reason_max_chars = 500) characters)
  And the pet cannot enter future arena matches
```

### 11.3 Client-Side BDD Scenarios

```gherkin
Feature: Guest Pet Display (US-PET-001)

Scenario: Guest sees animated pet on first visit
  Given a new guest browser session
  When the guest navigates to the root URL
  Then a pixel pet canvas is visible within (pet_render_on_load_seconds = 2) seconds
  And no login prompt is shown
  And the pet plays an idle animation

Scenario: Pet interaction animates within (pet_interaction_response_ms = 200) ms
  Given a loaded pet canvas
  When the guest clicks or taps the pet canvas
  Then an interaction animation begins within (pet_interaction_response_ms = 200) milliseconds
  And the interaction is accessible via keyboard (Enter key on focused canvas)
```

```gherkin
Feature: Training System (US-TRAIN-001)

Scenario: Owner trains pet and sees stat change indicator
  Given a pet owner on the training page
  And the pet has at least one training action available today
  When the owner clicks "Run Training"
  Then a stat change indicator "+X Speed" appears on screen
  And the indicator disappears after (training_stat_display_duration_seconds = 2) seconds
  And the updated stat is reflected in the stats panel

Scenario: Training disabled after (training_actions_per_day = 3) daily actions
  Given a pet owner has completed (training_actions_per_day = 3) training actions today
  When the owner views the training page
  Then all training buttons are disabled
  And a countdown timer shows time until UTC midnight reset
```

```gherkin
Feature: Arena Rate Limit UX (US-ARENA-001)

Scenario: Rate-limited owner sees countdown and disabled button
  Given a pet owner whose pet has reached the hourly arena limit
  When the owner navigates to the arena page
  Then the Enter Arena button is disabled
  And the message "Arena rate limit reached. You can enter again in X minutes." is displayed
  And the countdown timer updates in real time
```

```gherkin
Feature: Rarity Display (US-RARITY-001)

Scenario: Legendary pet displays animated border effect
  Given a pet with rarity = LEGENDARY
  When the pet page is loaded
  Then a special animated border effect is visible around the sprite
  And the rarity badge reads "Legendary — (rarity_legendary_percent = 3)% of all pets"
  And when reduced-motion is active, the border animation is replaced with a static glow
```

---

## 12. CI/CD Integration

### 12.1 Pipeline Gates

The CI/CD pipeline defined in ARCH §7.2 enforces the following test gates in order:

**Gate 1 — Type Check and Lint (blocks all downstream steps)**

```bash
pnpm run type-check       # TypeScript 5 strict — zero errors
pnpm run lint             # ESLint: max-lines = 800 (code_module_max_lines = 800),
                          #          max-lines-per-function = 50 (code_function_max_lines = 50)
```

**Gate 2 — Unit Tests with Coverage (blocks build on failure)**

```bash
pnpm run test:unit        # Vitest
                          # Branch/line/function/statement coverage ≥ 80% (unit_test_coverage_min_percent = 80)
                          # Any module below threshold fails the gate
```

**Gate 3 — Integration Tests (blocks deploy on failure)**

```bash
pnpm run test:integration # Vitest + Docker PostgreSQL + Docker Redis
                          # All 24 TC-INT-* cases must pass
```

**Gate 4 — Build (blocks staging deploy on failure)**

```bash
pnpm run build            # Vite builds for player-app and admin-app
docker build --target runtime  # Multi-stage Docker build for API
```

**Gate 5 — Staging Deploy + Playwright Smoke Tests (blocks production deploy)**

After successful build and staging deployment, Playwright smoke tests run:

```bash
pnpm run test:e2e --project=chromium --grep="@smoke"
```

Smoke test tags (`@smoke`) cover the minimal set of P0 happy paths: guest pet display, email claim, training, arena race, leaderboard, battle records page, and admin login.

**Gate 6 — Production Deploy + Smoke Tests (manual approval required)**

Post-production-deployment smoke tests run identically to staging smoke tests but against production URLs. Manual approval is required before this gate executes.

### 12.2 Performance Test Integration

Performance tests do NOT run on every pull request (too slow and resource-intensive). They run on a schedule:

| Test Suite | Schedule | Environment | Alert on Failure |
|---|---|---|---|
| k6 read latency (TC-PERF-001) | Nightly (main branch only) | Staging | PagerDuty + Slack |
| k6 write latency (TC-PERF-002) | Nightly (main branch only) | Staging | PagerDuty + Slack |
| Lighthouse CI (TC-PERF-006) | On every PR targeting main | Staging preview | Slack (warning only) |
| JS bundle size check (TC-PERF-007) | On every PR | CI build artifacts | CI failure if exceeded |
| k6 peak load (TC-PERF-003) | Weekly (Sunday UTC 02:00) | Staging | PagerDuty |

### 12.3 Security Scan Integration

| Tool | Trigger | Scope | Gate Behavior |
|---|---|---|---|
| `pnpm audit` | Every PR | All workspace packages | Fail on high/critical vulnerabilities |
| OWASP ZAP baseline scan | Nightly on main | `https://staging.pixel-pet-arena.com` | Alert on MEDIUM+; fail on HIGH+ |
| Semgrep (TypeScript ruleset) | Every PR | `packages/api/src/` | Fail on security rules (SQL injection, hardcoded secrets) |

### 12.4 Observability Verification Tests

Post-deployment smoke tests include a subset of observability checks to verify the monitoring layer is functional:

| TC-OBS-001 | Error rate metric emitted |
|---|---|
| Given | 10 requests to a valid endpoint followed by 1 request to a nonexistent endpoint |
| When | Prometheus metrics are scraped |
| Then | `api_error_rate` counter increments for the 404 |

| TC-OBS-002 | Leaderboard update lag metric emitted |
|---|---|
| Given | A battle is completed and leaderboard ZADD executes |
| When | The lag measurement is recorded |
| Then | `leaderboard_update_lag_seconds` gauge value is ≤ (leaderboard_update_lag_max_seconds = 30) |

| TC-OBS-003 | Structured log correlation ID threaded |
|---|---|
| Given | A request with `X-Request-Id: test-correlation-id` header |
| When | Log output from pino is inspected |
| Then | Every log entry for that request includes `requestId: "test-correlation-id"` |

### 12.5 Test Coverage Reporting

Coverage reports are generated by Vitest's V8 provider and uploaded to the CI artifacts store on every run. The coverage summary is posted as a pull request comment. The following thresholds are enforced:

| Package | Minimum Coverage |
|---|---|
| `packages/api/src/domain/` (core business logic) | (unit_test_coverage_min_percent = 80)% |
| `packages/api/src/routes/` (API handlers) | (unit_test_coverage_min_percent = 80)% |
| `packages/shared/` (domain types + constants bridge) | (unit_test_coverage_min_percent = 80)% |
| `packages/player-app/src/` (React components + hooks) | (unit_test_coverage_min_percent = 80)% |
| `packages/admin-app/src/` (Vue components + Pinia stores) | (unit_test_coverage_min_percent = 80)% |

Coverage exemptions (excluded from threshold calculation):
- Auto-generated files (Vite build outputs, type stubs)
- `packages/api/src/migrations/` (SQL migration files — covered by integration tests, not unit tests)
- Phaser.js `PetCanvasEngine` class internals (covered by E2E and visual regression tests)

---

## 13. Test Cases

This section provides a consolidated index of all test case identifiers defined in this plan, organized by test type. Full test case details are in their respective sections above.

### 13.1 Unit Test Cases (TC-UNIT-*)

| ID | Title | Section |
|---|---|---|
| TC-UNIT-001 | Combination space exceeds minimum | §5.2 |
| TC-UNIT-002 | Deterministic generation from seed | §5.2 |
| TC-UNIT-003 | Rarity distribution matches probability weights | §5.2 |
| TC-UNIT-004 | Default stat values | §5.2 |
| TC-UNIT-005 | OTP code expiry enforcement | §5.3 |
| TC-UNIT-006 | OTP code one-time-use enforcement | §5.3 |
| TC-UNIT-007 | Pet access token minimum entropy | §5.3 |
| TC-UNIT-008 | Token stored as SHA-256 hash only | §5.3 |
| TC-UNIT-009 | Stat increment range | §5.4 |
| TC-UNIT-010 | Stat cap enforcement — training blocked at maximum | §5.4 |
| TC-UNIT-011 | Stat cap enforcement — food feed blocked at maximum | §5.4 |
| TC-UNIT-012 | Neglected state threshold | §5.4 |
| TC-UNIT-013 | Daily training action limit | §5.4 |
| TC-UNIT-014 | Race outcome determinism with seed | §5.5 |
| TC-UNIT-015 | Random modifier bounds | §5.5 |
| TC-UNIT-016 | Sumo mode uses strength stat | §5.5 |
| TC-UNIT-017 | Arena score formula | §5.5 |
| TC-UNIT-018 | Level formula derivation | §5.6 |
| TC-UNIT-019 | Level cap enforcement | §5.6 |
| TC-UNIT-020 | Email enumeration prevention | §5.7 |
| TC-UNIT-021 | Recovery endpoint anti-enumeration | §5.7 |
| TC-UNIT-022 | Error sanitization in production mode | §5.7 |

### 13.2 Integration Test Cases (TC-INT-*)

| ID | Title | Section |
|---|---|---|
| TC-INT-001 | Full claim flow persists ownership | §6.1 |
| TC-INT-002 | Claim rate limit enforced via Redis | §6.1 |
| TC-INT-003 | Seed collision retry mechanism | §6.1 |
| TC-INT-004 | Seed collision max retries exceeded | §6.1 |
| TC-INT-005 | OTP code entry fail-closed on Redis unavailability | §6.1 |
| TC-INT-006 | Training stat persisted across reads | §6.2 |
| TC-INT-007 | Food buff active during arena combat | §6.2 |
| TC-INT-008 | Permanent food buff increments base stat | §6.2 |
| TC-INT-009 | Battle record saved for both pets | §6.3 |
| TC-INT-010 | Leaderboard updated within update lag | §6.3 |
| TC-INT-011 | Arena rate limit enforced per pet per hour | §6.3 |
| TC-INT-012 | AI opponent fallback after matchmaking timeout | §6.3 |
| TC-INT-013 | Leaderboard fallback to PostgreSQL snapshot when Redis unavailable | §6.3 |
| TC-INT-014 | Erasure request nulls email within internal SLA | §6.4 |
| TC-INT-015 | Erased pet removed from Redis leaderboard | §6.4 |
| TC-INT-016 | Email hash retained for anti-re-registration | §6.4 |
| TC-INT-017 | Admin pet ban removes from leaderboard within SLA | §6.5 |
| TC-INT-018 | Config change propagates within cache TTL | §6.5 |
| TC-INT-019 | Audit log written for every admin mutation | §6.5 |
| TC-INT-020 | Suspicious pet auto-flagged at threshold | §6.5 |
| TC-INT-021 | Economy config applied within cache TTL | §6.5 |
| TC-INT-022 | SendGrid failover after consecutive failures | §6.6 |
| TC-INT-023 | Claim email contains 6-digit code, no URL | §6.6 |
| TC-INT-024 | Seed uniqueness guarantee across large batch | §6.1 |

### 13.3 End-to-End Test Cases (TC-E2E-*)

| ID | Title | Section |
|---|---|---|
| TC-E2E-001 | Pet renders within SLO on page load | §7.2 |
| TC-E2E-002 | Pet interaction response time | §7.2 |
| TC-E2E-003 | Page refresh generates a different pet | §7.2 |
| TC-E2E-004 | Complete claim flow — happy path | §7.3 |
| TC-E2E-005 | COPPA age confirmation prevents submit | §7.3 |
| TC-E2E-006 | Expired claim code shows correct error | §7.3 |
| TC-E2E-007 | Invalid pet URL returns 404 | §7.3 |
| TC-E2E-008 | Pet URL works cross-device (multi-context test) | §7.3 |
| TC-E2E-009 | Three training actions per day | §7.4 |
| TC-E2E-010 | Stat change indicator displays for correct duration | §7.4 |
| TC-E2E-011 | Food inventory and feed animation | §7.4 |
| TC-E2E-012 | Arena battle complete cycle | §7.5 |
| TC-E2E-013 | Share battle result URL generated | §7.5 |
| TC-E2E-014 | Rate limit UI — countdown and disabled button | §7.5 |
| TC-E2E-015 | Leaderboard publicly accessible without login | §7.6 |
| TC-E2E-016 | Owner rank banner visible outside top 100 | §7.6 |
| TC-E2E-017 | Battle records page — public access and display cap | §7.6 |
| TC-E2E-018 | Battle records page — fewer than 20 battles prompt | §7.6 |
| TC-E2E-019 | Battle records page invalid pet ID | §7.6 |
| TC-E2E-020 | Admin TOTP login flow | §7.7 |
| TC-E2E-021 | Admin pet search within SLA | §7.7 |
| TC-E2E-022 | Admin ban + leaderboard removal | §7.7 |
| TC-E2E-023 | GDPR deletion E2E | §7.7 |
| TC-E2E-024 | Battle records page Open Graph meta tags | §7.6 |
| TC-E2E-025 | Food inventory empty — get more food prompt | §7.4 |
| TC-E2E-026 | Rarity badge shows occurrence rate | §7.6 |
| TC-E2E-027 | Leaderboard filterable by rarity tier | §7.6 |
| TC-E2E-028 | Admin runtime parameter tuning — arena rate limit update | §7.7 |
| TC-E2E-029 | Admin suspicious activity — flagged pet review and moderation | §7.7 |
| TC-E2E-030 | Admin game economy config — food buff multiplier update with preview | §7.7 |

### 13.4 Performance Test Cases (TC-PERF-*)

| ID | Title | Section |
|---|---|---|
| TC-PERF-001 | P99 read latency under sustained load | §8.1 |
| TC-PERF-002 | P99 write latency under sustained load | §8.1 |
| TC-PERF-003 | Peak viral load — 500 RPS | §8.1 |
| TC-PERF-004 | Matchmaking concurrent entries | §8.1 |
| TC-PERF-005 | Pet generation batch concurrency | §8.1 |
| TC-PERF-006 | Core Web Vitals — Landing Page | §8.2 |
| TC-PERF-007 | JS bundle size within budget | §8.2 |
| TC-PERF-008 | Pet canvas animation FPS | §8.2 |
| TC-PERF-009 | Pet render on load within SLO | §8.2 |
| TC-PERF-010 | Admin pet search with 1M records | §8.3 |
| TC-PERF-011 | Admin page load SLO | §8.3 |
| TC-PERF-012 | Audit log search across 12-month window | §8.3 |
| TC-PERF-013 | PostgreSQL autofailover recovery | §8.4 |
| TC-PERF-014 | Health check response time | §8.4 |

### 13.5 Security Test Cases (TC-SEC-*)

| ID | Title | Section |
|---|---|---|
| TC-SEC-001 | Pet token minimum entropy | §9.1 |
| TC-SEC-002 | Token revocation via blacklist | §9.1 |
| TC-SEC-003 | Admin TOTP required — no bypass | §9.1 |
| TC-SEC-004 | Admin session absolute expiry | §9.1 |
| TC-SEC-005 | Admin IP allowlist enforcement | §9.1 |
| TC-SEC-006 | Claim rate limit enforced per email hash | §9.2 |
| TC-SEC-007 | OTP code entry fail-closed | §9.2 |
| TC-SEC-008 | Admin login IP rate limit | §9.2 |
| TC-SEC-009 | Admin account lockout | §9.2 |
| TC-SEC-010 | Arena rate limit not incremented on matchmaking timeout | §9.2 |
| TC-SEC-011 | Email never logged in plaintext | §9.3 |
| TC-SEC-012 | Raw IP never written to database | §9.3 |
| TC-SEC-013 | SQL injection prevention — parameterized queries | §9.3 |
| TC-SEC-014 | Security headers present on all responses | §9.3 |
| TC-SEC-015 | Pet tokens absent from all log output | §9.3 |

### 13.6 Accessibility Test Cases (TC-A11Y-*)

| ID | Title | Section |
|---|---|---|
| TC-A11Y-001 | axe-core: no violations on landing page | §10.1 |
| TC-A11Y-002 | axe-core: no violations on claim flow | §10.1 |
| TC-A11Y-003 | Focus indicator contrast ratio | §10.1 |
| TC-A11Y-004 | Normal text contrast ratio | §10.1 |
| TC-A11Y-005 | Alt text on pixel pet sprites | §10.1 |
| TC-A11Y-006 | Full claim flow keyboard-only navigation | §10.2 |
| TC-A11Y-007 | Arena entry keyboard operable | §10.2 |
| TC-A11Y-008 | Leaderboard keyboard navigation | §10.2 |
| TC-A11Y-009 | Prefers-reduced-motion suppresses idle animation | §10.3 |
| TC-A11Y-010 | Leaderboard transitions suppressed with reduced motion | §10.3 |
| TC-A11Y-011 | Expiry warning at 2 minutes remaining | §10.4 |

### 13.7 Visual Regression Test Cases (TC-VR-*)

| ID | Title | Section |
|---|---|---|
| TC-VR-001 | Landing page — all 4 breakpoints | §10.5 |
| TC-VR-002 | Claim flow 3 steps — all 4 breakpoints | §10.5 |
| TC-VR-003 | Pet page with active food buffs — all 4 breakpoints | §10.5 |
| TC-VR-004 | Arena page mode selector — all 4 breakpoints | §10.5 |
| TC-VR-005 | Leaderboard top 100 table — all 4 breakpoints | §10.5 |
| TC-VR-006 | Battle records page — all 4 breakpoints | §10.5 |
| TC-VR-007 | Legendary pet with animated border effect — 1024px, 1440px | §10.5 |
| TC-VR-008 | Rarity badge variants (Common / Rare / Epic / Legendary) — 1024px | §10.5 |

---

*This test plan is the authoritative quality assurance specification for pixel-pet-arena v1.0. All numeric constants are sourced from CONSTANTS-PIXEL-PET-ARENA-20260503 (constants.json). Any change to a constant value requires updating both constants.json and any test cases that reference the affected threshold. Conflicts between this plan and upstream PRD, EDD, or ARCH documents shall be resolved by filing an Engineering Change Request against the relevant upstream document.*
