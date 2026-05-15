# API Specification — pixel-pet-arena

**DOC-ID**: API-PIXEL-PET-ARENA-20260503
**Version**: v1.0
**Status**: DRAFT
**Author**: AI Generated (gendoc api)
**Date**: 2026-05-03
**Upstream**: EDD-PIXEL-PET-ARENA-20260503, ARCH-PIXEL-PET-ARENA-20260503, CONSTANTS-PIXEL-PET-ARENA-20260503

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Rate Limiting](#3-rate-limiting)
4. [Error Response Format](#4-error-response-format)
5. [Public Player API — `/api/v1/`](#5-public-player-api)
   - 5.1 [Claim Flow](#51-claim-flow)
   - 5.2 [Pet Endpoints](#52-pet-endpoints)
   - 5.3 [Arena Endpoints](#53-arena-endpoints)
   - 5.4 [Leaderboard Endpoints](#54-leaderboard-endpoints)
   - 5.5 [GDPR Self-Service Endpoints](#55-gdpr-self-service-endpoints)
   - 5.6 [Marketplace Endpoints (Phase 3)](#56-marketplace-endpoints-phase-3--ff_marketplace)
6. [Admin API — `/admin/api/`](#6-admin-api)
   - 6.1 [Admin Authentication](#61-admin-authentication)
   - 6.2 [Admin Role Management](#62-admin-role-management)
   - 6.3 [Admin Pet Management](#63-admin-pet-management)
   - 6.4 [Admin Arena & Battle Management](#64-admin-arena--battle-management)
   - 6.5 [Admin Leaderboard](#65-admin-leaderboard)
   - 6.6 [Admin Configuration](#66-admin-configuration)
   - 6.7 [Admin GDPR Queue](#67-admin-gdpr-queue)
   - 6.8 [Admin Audit Log](#68-admin-audit-log)
   - 6.9 [Admin Dashboard, Analytics & Email Monitor](#69-admin-dashboard-analytics--email-monitor)
7. [WebSocket / Real-Time](#7-websocket--real-time)
8. [Pagination](#8-pagination)
9. [Changelog / Versioning](#9-changelog--versioning)
10. [Health Check](#10-health-check)

---

## 1. Overview

### 1.1 Base URL

| Environment | Base URL |
|-------------|----------|
| Production (Player API) | `https://api.pixel-pet-arena.com/api/v1` |
| Production (Admin API) | `https://api.pixel-pet-arena.com/admin/api` |
| Local development | `http://localhost:3000` |

All player-facing routes use the `/api/v1/` prefix. All admin routes use the `/admin/api/` prefix. Both prefixes are served by the same Node.js/Fastify process; the admin plugin is registered under `/admin`.

### 1.2 Versioning Strategy

- **Current version**: `v1`
- **Versioning scheme**: URI path versioning (`/api/v1/`, `/api/v2/`, …)
- **Backward compatibility**: The platform maintains backward compatibility for at least **1 major version** simultaneously (`api_backward_compat_versions = 1` from `constants.json`).
- **Deprecation notice**: Deprecated API versions receive a minimum **90 days** advance notice before removal (`api_deprecation_notice_days = 90` from `constants.json`). Deprecated endpoints will respond with a `Deprecation` response header indicating the removal date.
- **Admin API**: The admin API (`/admin/api/`) follows the same deprecation policy but is not versioned separately from the player API.

### 1.3 Content Type

All requests and responses use:

```
Content-Type: application/json
```

Request bodies must be JSON-encoded. Endpoints that accept no body (GET and body-less DELETE) must not include a `Content-Type` request header. DELETE endpoints that carry a request body (e.g. `DELETE /admin/api/battles/:matchId/flag`) must include `Content-Type: application/json` like any other body-bearing request.

### 1.4 HTTPS

All endpoints require TLS. Plain HTTP requests are rejected at the load balancer level with a redirect to HTTPS.

---

## 2. Authentication

### 2.1 Pet Access Token (Player Endpoints)

Most write-capable player endpoints require a **pet access token** — a 32-byte cryptographically random URL-safe Base64 string (`pet_access_token_min_bytes = 32` from `constants.json`).

**How a token is obtained:**

1. Player calls `POST /api/v1/claim` with their email and pet ID.
2. System sends a 6-digit OTP to the email (`claim_code_digits = 6` from `constants.json`).
3. Player submits the OTP to `POST /api/v1/claim/verify`.
4. On success, the server responds with `petToken` (the 32-byte token) and `petUrl` (the bookmarkable URL that embeds the token). **This is the only time the raw token is transmitted.**
5. The server stores only the SHA-256 hash of the token in `pets.owner_token_hash`. The raw token is never stored.

**How the token is used:**

Pass the token in the `Authorization` header on every authenticated request:

```
Authorization: Bearer <petToken>
```

Alternatively, the token may be passed as a query parameter `?token=<petToken>` for URL-based deep-links (e.g. shared bookmarks). Header usage is preferred for API calls.

**Token lifecycle:**
- Tokens do not expire automatically.
- A token is invalidated immediately if an admin revokes it (sets `owner_token_hash = NULL`) or if a recovery flow issues a replacement. Replaced tokens are added to a Redis blacklist (`token:blacklist:{token_hash}`) with a 72-hour TTL (`claim_token_cleanup_ttl_hours = 72` — this constant governs both claim_codes row cleanup and token blacklist TTL by design; both use the same 72-hour window per EDD §4.3 and §4.8).

**Token recovery:**

Players who lose their bookmarked URL may recover access via `POST /api/v1/claim/recover`. A new OTP is sent; on verification, a fresh token is issued and the old token is invalidated.

### 2.2 Admin Session Token

Admin operators authenticate via username + password + TOTP. On success, the server creates a server-side session stored in Redis and sets a session cookie.

**Cookie properties:**

```
Set-Cookie: session=<session_id>; HttpOnly; SameSite=Strict; Secure; Path=/admin
```

**Session lifetime:**

| Expiry type | Duration | Constant |
|-------------|----------|----------|
| Inactivity timeout | 4 hours | `admin_session_inactivity_expiry_hours = 4` |
| Absolute maximum | 8 hours | `admin_session_absolute_expiry_hours = 8` |

Every authenticated admin request resets the inactivity clock. When the absolute expiry is reached, the session is invalidated regardless of activity.

**First-login TOTP enrollment:**

On first login, if TOTP is not yet configured, the server returns HTTP 403 using the standard error envelope (§4.1) with `error.code = "TOTP_SETUP_REQUIRED"` and `error.details.setupToken` containing a short-lived signed JWT. The admin must complete TOTP setup via `POST /admin/api/auth/totp/setup` before a session is granted.

### 2.3 Authentication Errors

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Missing or invalid `Authorization: Bearer` token | 401 | `UNAUTHORIZED` |
| Pet token belongs to a different pet | 403 | `NOT_OWNER` |
| Pet is banned | 403 | `PET_BANNED` |
| Admin session cookie missing / expired | 401 | `UNAUTHORIZED` |
| Admin role insufficient for endpoint | 403 | `FORBIDDEN` |
| Admin account locked | 403 | `ACCOUNT_LOCKED` |
| TOTP setup required before first session | 403 | `TOTP_SETUP_REQUIRED` |

---

## 3. Rate Limiting

All rate limits are enforced via Redis counters. When a limit is exceeded the server returns **HTTP 429** with a `Retry-After` header indicating seconds to wait.

### 3.1 Player Rate Limits

| Limit | Value | Constant | Scope | Redis Key Pattern |
|-------|-------|----------|-------|-------------------|
| Arena battles per pet per hour (default) | **10** | `arena_battles_per_pet_per_hour_default = 10` | Per pet ID | `rl:arena:{pet_id}` TTL 3600s |
| Arena battles per pet per hour (admin min) | **1** | `arena_rate_limit_admin_min = 1` | Admin-tunable lower bound | — |
| Arena battles per pet per hour (admin max) | **50** | `arena_rate_limit_admin_max = 50` | Admin-tunable upper bound | — |
| Email claim attempts per hour | **5** | `email_claim_attempts_per_hour_per_email = 5` | Per email address | `rl:claim:{email_hash}` TTL 3600s |
| Claim email retry cooldown | **60 seconds** | `claim_email_retry_cooldown_seconds = 60` | Per email, after limit reached | `rl:claim:cooldown:{email_hash}` TTL 60s |
| OTP code entry attempts per session | **10** | `claim_code_entry_attempts_per_session = 10` | Per session ID | `rl:code_entry:{session_id}` TTL 900s |
| OTP code entry cooldown | **60 seconds** | *(no dedicated constant; 60 s shared by design with `claim_email_retry_cooldown_seconds`)* | Per session, after limit reached | `rl:code_entry:cooldown:{session_id}` TTL 60s |

**Important**: The arena battle rate limit is the default value. Admins may tune it within the range `[arena_rate_limit_admin_min, arena_rate_limit_admin_max]` via `PUT /admin/api/config/runtime`. Changes take effect within 5 minutes (`config_cache_refresh_time_minutes = 5`).

**Fail-open / fail-closed behavior:**
- Player rate limits (arena, claim email) are **fail-open**: if Redis is unavailable, the counter is not enforced but the failure is logged as an alert.
- OTP code entry rate limit is **fail-closed**: if Redis is unavailable, code entry is blocked to prevent brute-force bypass.

### 3.2 Admin Rate Limits

| Limit | Value | Constant | Scope | Redis Key Pattern |
|-------|-------|----------|-------|-------------------|
| Admin portal requests per minute | **100** | `admin_portal_requests_per_minute_per_account = 100` | Per admin account | `rl:admin:{admin_id}` TTL 60s |
| Admin login attempts per IP (pre-auth) | **10** per 15 min | `admin_login_ip_rate_limit_attempts = 10` | Per IP address (hashed) | `rl:admin_login:{ip_hash}` TTL 900s |
| Admin login IP rate limit window | **900 seconds** (15 min) | `admin_login_ip_rate_limit_window_seconds = 900` | Rolling window | — |
| Admin account lockout threshold | **10** consecutive failures | `admin_login_lockout_threshold = 10` | Per admin account | `admin_users.locked_until` column |
| Admin account lockout duration | **30 minutes** | `admin_login_lockout_duration_minutes = 30` | Per admin account | `admin_users.locked_until` column |

---

## 4. Error Response Format

All errors use a standard envelope. Successful responses also use this envelope with `"success": true` and `"error": null`.

### 4.1 Standard Envelope

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SNAKE_CASE_ERROR_CODE",
    "message": "Human-readable description of the error.",
    "details": {}
  }
}
```

For list endpoints, successful responses include a `meta` field:

```json
{
  "success": true,
  "data": [ ... ],
  "error": null,
  "meta": {
    "total": 250,
    "page": 1,
    "limit": 20
  }
}
```

The `details` field is optional and only populated when additional structured context is useful (e.g. validation field errors). It is omitted in production when it would expose internal implementation details.

### 4.2 HTTP Status Code Reference

Client errors (4xx) indicate request problems; server errors (5xx) indicate platform failures.

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async job queued; player endpoints return `jobId`; admin GDPR delete returns `requestId`) |
| 400 | Bad Request (validation error, business rule violation) |
| 401 | Unauthenticated (missing or invalid token/session) |
| 403 | Forbidden (insufficient permissions, account locked, pet banned) |
| 404 | Not Found |
| 408 | Request Timeout (matchmaking timeout) |
| 409 | Conflict (duplicate resource) |
| 422 | Unprocessable Entity (reserved — not currently emitted by any v1 endpoint; all validation failures use 400) |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (health check: one or more dependency checks failed) |

### 4.3 Error Code Reference

| Error Code | HTTP | Description |
|------------|------|-------------|
| `VALIDATION_ERROR` | 400 | Request body or query parameters failed schema validation |
| `AGE_CONFIRMATION_REQUIRED` | 400 | `ageConfirmed` field is false or missing on claim initiation |
| `ALREADY_CLAIMED` | 400 | Pet is already owned by another player |
| `STAT_AT_MAXIMUM` | 400 | Target stat is already at maximum value (`pet_stat_max = 100`) |
| `TRAINING_LIMIT_REACHED` | 400 | All 3 daily training actions have been used (`training_actions_per_day = 3`) |
| `OUT_OF_RANGE` | 400 | Admin config parameter exceeds constants-defined tunable range |
| `WRONG_REQUEST_TYPE` | 400 | GDPR endpoint received a request type it does not handle |
| `INVALID_CODE` | 400 | Submitted OTP code does not match stored hash |
| `CODE_EXPIRED` | 400 | OTP code has passed the 15-minute expiry window (`claim_code_expiry_minutes = 15`) |
| `MAX_ATTEMPTS_REACHED` | 429 | OTP code entry session limit of 10 attempts reached (`claim_code_entry_attempts_per_session = 10`) |
| `UNAUTHORIZED` | 401 | Token or session missing, invalid, or revoked |
| `NOT_OWNER` | 403 | The authenticated pet token does not own the target pet |
| `PET_BANNED` | 403 | Pet has been banned by an admin and cannot perform arena operations |
| `FORBIDDEN` | 403 | Admin role is insufficient for this operation |
| `ACCOUNT_LOCKED` | 403 | Admin account is temporarily locked after repeated failed login attempts; error response includes `unlockedAt` (ISO 8601) |
| `TOTP_SETUP_REQUIRED` | 403 | Admin account has not completed TOTP enrollment |
| `PET_NOT_FOUND` | 404 | No pet found with the given ID |
| `NOT_FOUND` | 404 | Generic resource not found |
| `CONFLICT` | 409 | Resource already exists (e.g. duplicate admin username) |
| `MATCHMAKING_TIMEOUT` | 408 | No opponent found within the 30-second matchmaking window (`arena_matchmaking_timeout_seconds = 30`) |
| `RATE_LIMIT_EXCEEDED` | 429 | Generic rate limit exceeded (see specific limit in `Retry-After` header) |
| `FEATURE_DISABLED` | 403 | The requested feature is behind a feature flag that is currently off |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected internal server error; `stack` and internal details are stripped from production responses |

---

## 5. Public Player API

**Base prefix**: `/api/v1/`

All player endpoints return the standard JSON envelope. Read endpoints have a P99 latency target of **< 200 ms** at 100 RPS (`p99_api_latency_read_ms_at_100_rps = 200`). Write endpoints (training, arena) have a P99 latency target of **< 500 ms** at 100 RPS (`p99_api_latency_write_ms_at_100_rps = 500`).

---

### 5.1 Claim Flow

#### `POST /api/v1/claim`

Initiates the email claim flow. Sends a 6-digit OTP to the provided email address and binds it to a specific unclaimed pet.

**Auth**: None (rate-limited by email address)

**Request body:**

```json
{
  "email": "player@example.com",
  "petId": "550e8400-e29b-41d4-a716-446655440000",
  "ageConfirmed": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Player's email address. Stored as AES-256-GCM ciphertext + SHA-256 hash only; never logged. |
| `petId` | string (UUID) | Yes | ID of the unclaimed pet being claimed. |
| `ageConfirmed` | boolean | Yes | COPPA compliance — player confirms they are 13 or older (`coppa_minimum_age_years = 13`). Must be `true`. |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "claimId": "7f3d9a1c-b2e4-4f88-9c6a-1a2b3c4d5e6f",
    "expiresAt": "2026-05-03T12:15:00Z"
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `claimId` | Identifier for this claim attempt. Pass to `POST /api/v1/claim/verify`. |
| `expiresAt` | OTP expiry timestamp. OTPs expire **15 minutes** after generation (`claim_code_expiry_minutes = 15`). |

**Rate limit**: 5 attempts per hour per email address (`email_claim_attempts_per_hour_per_email = 5`). On breach: HTTP 429 with `Retry-After: 60` (`claim_email_retry_cooldown_seconds = 60`).

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Malformed email, invalid UUID for `petId`, or schema violation |
| 400 | `AGE_CONFIRMATION_REQUIRED` | `ageConfirmed` is `false` or missing |
| 400 | `ALREADY_CLAIMED` | The pet with `petId` is already owned |
| 404 | `PET_NOT_FOUND` | No pet found with the given `petId` |
| 429 | `RATE_LIMIT_EXCEEDED` | Hourly claim attempt limit exceeded |

---

#### `POST /api/v1/claim/verify`

Verifies the 6-digit OTP and, on success, issues the pet access token.

**Auth**: None (rate-limited by session)

**Request body:**

```json
{
  "claimId": "7f3d9a1c-b2e4-4f88-9c6a-1a2b3c4d5e6f",
  "code": "482917"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `claimId` | string (UUID) | Yes | The `claimId` returned by `POST /api/v1/claim` or `POST /api/v1/claim/recover`. |
| `code` | string | Yes | The 6-digit numeric OTP sent to the player's email (`claim_code_digits = 6`). |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "petToken": "dGhpcyBpcyBhIDMyLWJ5dGUgY3J5cHRvZ3JhcGhpY2FsbHkgcmFuZG9t",
    "petId": "550e8400-e29b-41d4-a716-446655440000",
    "petUrl": "https://pixel-pet-arena.com/pet/550e8400-e29b-41d4-a716-446655440000?token=dGhpcyBpcyBhIDMyLWJ5dGUgY3J5cHRvZ3JhcGhpY2FsbHkgcmFuZG9t"
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `petToken` | The 32-byte URL-safe Base64 pet access token (`pet_access_token_min_bytes = 32`). This is transmitted **only once**. The player must bookmark `petUrl`. |
| `petId` | UUID of the claimed pet. |
| `petUrl` | Bookmarkable URL that includes the token as a query parameter. |

**Rate limit**: 10 OTP entry attempts per session (`claim_code_entry_attempts_per_session = 10`). On breach: HTTP 429 with `Retry-After: 60`. This limit is **fail-closed** — if Redis is unavailable, code entry is blocked.

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Malformed `claimId` or `code` |
| 400 | `INVALID_CODE` | Code does not match the stored hash |
| 400 | `CODE_EXPIRED` | OTP has passed the 15-minute window (`claim_code_expiry_minutes = 15`) |
| 404 | `NOT_FOUND` | `claimId` does not exist in database (expired and purged after `CLAIM_TOKEN_CLEANUP_TTL_HOURS` = 72 hours) |
| 429 | `MAX_ATTEMPTS_REACHED` | 10-attempt session limit reached (`claim_code_entry_attempts_per_session = 10`) |

---

#### `POST /api/v1/claim/recover`

Sends a recovery OTP to the email associated with a previously claimed pet. Used when the player has lost their bookmarked URL. Always returns HTTP 200 regardless of whether the email/petId combination matches, to prevent account enumeration.

On successful OTP verification via `POST /api/v1/claim/verify` (recovery path), the server atomically: (1) generates a new 32-byte token; (2) writes the old token hash to the Redis blacklist (`token:blacklist:{old_hash}`, TTL 72 hours); (3) updates `pets.owner_token_hash` with the new hash.

**Auth**: None

**Request body:**

```json
{
  "email": "player@example.com",
  "petId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Player's email address. Must be a valid email format. Used to look up the associated `claim_identity_id`. |
| `petId` | string (UUID) | Yes | UUID of the previously claimed pet for which access is being recovered. |

**Response (HTTP 200 — always):**

```json
{
  "success": true,
  "data": {
    "claimId": "9a1b2c3d-4e5f-6789-abcd-ef0123456789",
    "expiresAt": "2026-05-03T12:15:00Z"
  },
  "error": null
}
```

The `claimId` is only functional if the email/petId combination matches a claimed pet. In the no-match case, the response is identical (anti-enumeration design).

**Rate limit**: Inherits `email_claim_attempts_per_hour_per_email = 5` per email.

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Malformed `email` or `petId` UUID |
| 429 | `RATE_LIMIT_EXCEEDED` | Exceeded `AUTH_RATE_LIMIT_CLAIM_ATTEMPTS_PER_HOUR` (= 5) attempts within 1 hour for this email |

---

### 5.2 Pet Endpoints

#### `GET /api/v1/pets/random`

Generates a new unclaimed random pet for guest display. No authentication required. The pet is reserved in the database for 24 hours (`pet_reservation_ttl_hours = 24`) before cleanup.

**Auth**: None

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "seed": 7381923847561029,
    "rarity": "RARE",
    "petName": "Crimson Vexor",
    "stats": {
      "speed": 10,
      "strength": 10,
      "stamina": 10,
      "level": 1
    },
    "generationMeta": {
      "body": "lizard",
      "head": "horned",
      "colorPalette": "crimson_gold",
      "accessory": "cape",
      "rarityTrait": "shimmering_scales",
      "pattern": "diagonal_stripe"
    },
    "reservedUntil": "2026-05-04T12:00:00Z"
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `rarity` | One of `COMMON`, `RARE`, `EPIC`, `LEGENDARY`. Drop weights: Common 60%, Rare 25%, Epic 12%, Legendary 3% (`rarity_common_percent`, `rarity_rare_percent`, `rarity_epic_percent`, `rarity_legendary_percent` from `constants.json`). |
| `stats` | All stats start at 10 (`pet_stat_default = 10`), range 1–100 (`pet_stat_min = 1`, `pet_stat_max = 100`). |
| `generationMeta` | The 6 procedural generation dimensions (`pet_generation_dimensions = 6`). Total unique combinations exceed 1 billion (`pet_generation_combinations_min = 1000000000`). |
| `reservedUntil` | The pet is reserved for 24 hours (`pet_reservation_ttl_hours = 24`). Client should display a countdown to encourage claiming. |

---

#### `GET /api/v1/pets/:petId`

Fetches public pet data. Optionally authenticates to determine ownership.

**Auth**: Optional (`Authorization: Bearer <petToken>` or `?token=`)

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `petId` | UUID | Pet ID |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "seed": 7381923847561029,
    "rarity": "RARE",
    "petName": "Crimson Vexor",
    "stats": {
      "speed": 34,
      "strength": 28,
      "stamina": 41,
      "level": 7
    },
    "isOwner": true,
    "claimedAt": "2026-04-15T09:32:00Z",
    "isNeglected": false
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `isOwner` | `true` if the provided token matches this pet's `owner_token_hash`. `false` if unauthenticated or different owner. |
| `isNeglected` | `true` if the pet has never been trained or was last trained more than 3 days ago (`training_neglect_threshold_days = 3`). Triggers a visual neglect state in the UI. |

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |

---

#### `GET /api/v1/pets/:petId/stats`

Returns the full stats panel for a pet including training history summary. *(EDD extension — not individually enumerated in EDD §5.2; the core stats are available on `GET /api/v1/pets/:petId` but this endpoint provides the training-history summary fields.)*

**Auth**: Optional

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `petId` | UUID | Pet ID |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "petId": "550e8400-e29b-41d4-a716-446655440000",
    "stats": {
      "speed": 34,
      "strength": 28,
      "stamina": 41,
      "level": 7
    },
    "totalTrainingActions": 72,
    "trainingActionsToday": 1,
    "actionsRemainingToday": 2,
    "lastTrainedAt": "2026-05-02T18:45:00Z",
    "isNeglected": false,
    "activeFoodBuffs": [
      {
        "stat": "speed",
        "magnitude": 5,
        "isPermanent": false,
        "expiresAt": "2026-05-04T18:45:00Z"
      }
    ]
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `totalTrainingActions` | Cumulative count of all training actions performed on this pet. |
| `trainingActionsToday` | Number of training actions used today (UTC day). Max 3 per day (`training_actions_per_day = 3`). |
| `actionsRemainingToday` | Remaining training actions for the current UTC day. Resets at UTC 00:00. |
| `lastTrainedAt` | ISO 8601 timestamp of the most recent training action. `null` if never trained. |
| `isNeglected` | `true` if the pet has never been trained or was last trained more than 3 days ago (`training_neglect_threshold_days = 3`). |
| `stats.level` | `FLOOR(total_training_actions / 10)` capped at 100 (`pet_level_formula_divisor = 10`, `pet_level_max = 100`). |
| `activeFoodBuffs` | Temporary food buffs currently active on this pet. |

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |

---

#### `POST /api/v1/pets/:petId/train`

Performs one training action on the authenticated player's pet, incrementing a stat by 1–3 points.

**Auth**: Required (pet owner token)

**Request body:**

```json
{
  "trainingType": "RUN"
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `trainingType` | string | `RUN`, `STRENGTH`, `STAMINA` | Determines which stat is trained. `RUN` → speed, `STRENGTH` → strength, `STAMINA` → stamina. |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "updatedStats": {
      "speed": 36,
      "strength": 28,
      "stamina": 41,
      "level": 7
    },
    "statDelta": 2,
    "actionsRemainingToday": 1
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `updatedStats` | Full updated stat values (`speed`, `strength`, `stamina`, `level`) after this training action. |
| `statDelta` | The number of stat points gained this action: random integer in [1, 3] (`training_stat_points_min = 1`, `training_stat_points_max = 3`). |
| `actionsRemainingToday` | Remaining training actions today. Starts at 3 (`training_actions_per_day = 3`) and resets at UTC 00:00. |

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `trainingType` value |
| 400 | `TRAINING_LIMIT_REACHED` | All 3 daily training actions already used |
| 400 | `STAT_AT_MAXIMUM` | The target stat is already at 100 (`pet_stat_max = 100`) |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `NOT_OWNER` | Token does not belong to this pet's owner |
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |

---

#### `POST /api/v1/pets/:petId/feed`

Applies a food buff to the authenticated player's pet, granting a temporary or permanent stat increase.

**Auth**: Required (pet owner token)

**Request body:**

```json
{
  "buffType": "protein_shake",
  "stat": "strength",
  "magnitude": 5,
  "isPermanent": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `buffType` | string | Yes | Identifier for the food item type. Validated against admin-configured item catalog. |
| `stat` | string | Yes | One of `speed`, `strength`, `stamina`. |
| `magnitude` | integer | Yes | Stat points to add. Must be within admin-configured range (`food_buff_multiplier_admin_min = 0.5`× to `food_buff_multiplier_admin_max = 5.0`× of base). |
| `isPermanent` | boolean | No | If `true`, the buff is permanent (no expiry). Default: `false`. Illustrative example: permanent +3 points (`food_buff_example_perm_amount_stat_points = 3`). |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "updatedStats": {
      "speed": 34,
      "strength": 33,
      "stamina": 41
    },
    "buffApplied": {
      "stat": "strength",
      "magnitude": 5,
      "isPermanent": false,
      "expiresAt": "2026-05-04T18:45:00Z"
    }
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `updatedStats` | Updated stat values (`speed`, `strength`, `stamina`) after the buff is applied. Does not include `level` — level is derived from total training actions, not food buffs. |
| `buffApplied` | The buff record that was applied. Contains `stat`, `magnitude`, `isPermanent`, and `expiresAt` (ISO 8601; `null` when `isPermanent` is `true`). |

Illustrative buff values: temporary +5 points for 24 hours (`food_buff_example_temp_amount_stat_points = 5`, `food_buff_example_temp_duration_hours = 24`); permanent +3 points (`food_buff_example_perm_amount_stat_points = 3`). Actual values are admin-configurable.

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | `magnitude` or `buffType` fails admin-configured range validation |
| 400 | `STAT_AT_MAXIMUM` | Target stat is already at 100 |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `NOT_OWNER` | Token does not belong to this pet's owner |
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |

---

### 5.3 Arena Endpoints

#### `POST /api/v1/arena/enter`

Enters the authenticated pet into the matchmaking queue for an arena battle. Uses HTTP long-polling: the request waits up to 30 seconds for an opponent (`arena_matchmaking_timeout_seconds = 30`). If no opponent is found and `acceptAI` is `true`, an AI battle is resolved immediately.

**Auth**: Required (pet owner token)

**Request body:**

```json
{
  "petId": "550e8400-e29b-41d4-a716-446655440000",
  "mode": "RACE",
  "acceptAI": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `petId` | UUID | Yes | The pet entering the arena. Must match the authenticated token's owner. |
| `mode` | string | Yes | Arena mode: `RACE` or `SUMO`. |
| `acceptAI` | boolean | No | If `true` and no human opponent found within 30 seconds, the server resolves a battle against an AI opponent instead of returning a timeout error. |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "matchId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "result": "WIN",
    "opponentPetId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "isAiOpponent": false,
    "statDelta": 3,
    "newLeaderboardScore": 142.7
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `matchId` | UUID of the completed arena match. Use with `GET /api/v1/arena/match/:matchId` to fetch the full battle record. |
| `result` | `WIN` or `LOSS`. Tie-breaking: if both pets have equal effective stats after the ±15% modifier (`arena_battle_outcome_random_modifier_percent = 15`), the challenger (earlier enqueue timestamp) wins — deterministic and reproducible via the `battleLog` in `GET /api/v1/arena/match/:matchId`. |
| `opponentPetId` | UUID of the opponent pet. `null` when `isAiOpponent` is `true`. |
| `isAiOpponent` | `true` when matched against the AI fallback. |
| `statDelta` | Net stat value applied after buffs and the random modifier. |
| `newLeaderboardScore` | Updated leaderboard score after this battle. Score formula: `win_rate * battles_played * level_multiplier`. |

**Rate limit**: Default 10 battles/hour per pet (`arena_battles_per_pet_per_hour_default = 10`); range `[1, 50]` (`arena_rate_limit_admin_min = 1`, `arena_rate_limit_admin_max = 50`). HTTP 429 with `Retry-After` header on breach. The rate-limit counter is **not** incremented on a matchmaking timeout.

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `mode` value or malformed `petId` |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `NOT_OWNER` | Token does not own the given `petId` |
| 403 | `PET_BANNED` | Pet is banned and cannot enter the arena |
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |
| 408 | `MATCHMAKING_TIMEOUT` | No opponent found within 30 seconds and `acceptAI` was not `true` |
| 429 | `RATE_LIMIT_EXCEEDED` | Hourly battle limit exceeded |

**HTTP 408 body:**

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "MATCHMAKING_TIMEOUT",
    "message": "No opponent found within 30 seconds. Try again or enable AI opponent.",
    "details": {}
  }
}
```

---

#### `GET /api/v1/arena/match/:matchId`

Fetches the full record of a completed arena match. Public endpoint — no authentication required.

**Auth**: None

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `matchId` | UUID | Arena match ID |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "matchId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "mode": "RACE",
    "petA": {
      "petId": "550e8400-e29b-41d4-a716-446655440000",
      "petName": "Crimson Vexor",
      "rarity": "RARE",
      "level": 7
    },
    "petB": {
      "petId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "petName": "Azure Stomper",
      "rarity": "COMMON",
      "level": 4
    },
    "winnerId": "550e8400-e29b-41d4-a716-446655440000",
    "battleLog": [
      { "event": "start", "tick": 0 },
      { "event": "speed_check", "petA": 36, "petB": 28, "tick": 1 },
      { "event": "finish", "winnerId": "550e8400-e29b-41d4-a716-446655440000", "tick": 12 }
    ],
    "completedAt": "2026-05-03T11:42:00Z"
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `mode` | `RACE` or `SUMO` |
| `winnerId` | Pet ID of the winner. `null` is theoretically impossible due to the tie-break rule. |
| `battleLog` | Structured event sequence for deterministic replay. Match duration: 5–15 seconds (`arena_match_duration_min_seconds = 5`, `arena_match_duration_max_seconds = 15`). |

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 404 | `NOT_FOUND` | No match with the given `matchId` |

---

#### `GET /api/v1/arena/history/:petId`

Returns the last 20 arena battles for a pet. Public endpoint.

**Auth**: None

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `petId` | UUID | Pet ID |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "petId": "550e8400-e29b-41d4-a716-446655440000",
    "battles": [
      {
        "matchId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "mode": "RACE",
        "opponentPetId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "isAiOpponent": false,
        "result": "WIN",
        "completedAt": "2026-05-03T11:42:00Z"
      }
    ],
    "summary": {
      "wins": 12,
      "losses": 5,
      "winRate": 0.706
    }
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `opponentPetId` | UUID of the opponent pet. `null` when `isAiOpponent` is `true`. |
| `isAiOpponent` | `true` when this battle was resolved against an AI fallback opponent. |

The last **20 battles** are shown publicly (`arena_battle_records_display_count = 20`).

**Open Graph Metadata Source:**  
This endpoint (`GET /api/v1/arena/history/:petId`) is the authoritative source for Open Graph metadata generation when creating social share cards for a pet's battle records page. The client should extract `petId`, `wins` (from `summary.wins`), and combine with pet metadata (pet name, rarity, sprite image) from `GET /api/v1/pets/:petId` to construct OG tags (og:title, og:description, og:image, etc.). The win count summary (`summary.wins`) provides the win count aggregate for the OG card without needing to count individual battles.

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |

---

### 5.4 Leaderboard Endpoints

#### `GET /api/v1/leaderboard`

Returns the global leaderboard. Source: Redis sorted set (`leaderboard:global`). Update lag is at most 30 seconds (`leaderboard_update_lag_max_seconds = 30`). Returns the top **100** pets publicly (`leaderboard_top_display = 100`).

**Auth**: None

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `rarity` | string | (all) | Filter by rarity: `COMMON`, `RARE`, `EPIC`, or `LEGENDARY` |
| `page` | integer | 1 | Page number (1-based) |
| `limit` | integer | 100 | Results per page. Maximum 100 for public endpoint. |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "rank": 1,
        "petId": "550e8400-e29b-41d4-a716-446655440000",
        "petName": "Crimson Vexor",
        "rarity": "RARE",
        "level": 7,
        "score": 142.7,
        "winRate": 0.706
      }
    ],
    "lastUpdated": "2026-05-03T11:41:30Z"
  },
  "error": null,
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 100
  }
}
```

Score formula: `win_rate * battles_played * level_multiplier` (`arena_score_formula` from `constants.json`).

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid `rarity` value or non-integer `page`/`limit` |

---

#### `GET /api/v1/leaderboard/rank/:petId`

Returns the leaderboard rank of a specific pet.

**Auth**: None

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `petId` | UUID | Pet ID |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "petId": "550e8400-e29b-41d4-a716-446655440000",
    "rank": 42,
    "score": 87.4
  },
  "error": null
}
```

`rank` is `null` if the pet is not on the leaderboard (e.g. banned, or has not fought enough battles).

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |

---

### 5.5 GDPR Self-Service Endpoints

Players identify via their pet access token. GDPR requests are scoped to the `claim_identity_id` associated with the authenticated pet.

#### `POST /api/v1/gdpr/request`

Submits a GDPR request (erasure, data access, restrict processing, object leaderboard, or rectification).

**Auth**: Required (pet owner token)

**Request body:**

```json
{
  "type": "erasure"
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `type` | string | `erasure`, `data_access`, `restrict_processing`, `object_leaderboard`, `rectification` | GDPR right being exercised. |

**Response (HTTP 202):**

```json
{
  "success": true,
  "data": {
    "jobId": "3c4d5e6f-7a8b-9c0d-e1f2-a3b4c5d6e7f8",
    "message": "Your GDPR request has been received and will be processed within the applicable SLA."
  },
  "error": null
}
```

> **Note**: The `jobId` field in player-facing responses is an alias for `requestId` in admin-facing endpoints. Both refer to `gdpr_requests.id` in the database schema.

**SLAs** (from `constants.json`):

| Request Type | SLA | Constant |
|--------------|-----|----------|
| Erasure | 7 days | `gdpr_email_deletion_window_days = 7` |
| Data access / portability | 30 days | `gdpr_data_access_response_days = 30`; `gdpr_data_portability_response_days = 30` |
| Restrict processing | 24 hours | `gdpr_restrict_processing_response_hours = 24` |
| Object leaderboard | 5 business days | `gdpr_object_leaderboard_response_business_days = 5` |
| Rectification | 24 hours | `gdpr_email_rectification_response_hours = 24` |

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `type` value |
| 401 | `UNAUTHORIZED` | Missing or invalid pet token |

---

#### `GET /api/v1/gdpr/request/status`

Checks the status of a specific GDPR request. The server validates that the authenticating pet token's `claim_identity_id` matches the request's identity before returning status (prevents cross-identity polling).

**Auth**: Required (pet owner token)

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | UUID | Yes | The `jobId` returned by `POST /api/v1/gdpr/request`. |

> **Note**: The `jobId` field in player-facing responses is an alias for `requestId` in admin-facing endpoints. Both refer to `gdpr_requests.id` in the database schema.

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "jobId": "3c4d5e6f-7a8b-9c0d-e1f2-a3b4c5d6e7f8",
    "requestType": "erasure",
    "status": "processing",
    "submittedAt": "2026-05-01T09:00:00Z",
    "completedAt": null
  },
  "error": null
}
```

`status` values: `pending`, `processing`, `completed`, `failed`.

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or malformed `jobId` |
| 401 | `UNAUTHORIZED` | Missing or invalid pet token |
| 403 | `FORBIDDEN` | Authenticated pet's `claim_identity_id` does not match the request's identity |
| 404 | `NOT_FOUND` | No GDPR request found with the given `jobId` |

---

### 5.6 Marketplace Endpoints (Phase 3 — FF_MARKETPLACE)

These endpoints are **only active when the feature flag `FF_MARKETPLACE` is enabled**. All write endpoints require pet access token authentication. Browse endpoint is public.

The platform fee on completed trades is **5%** (`trade_transaction_fee_percent = 5`), within the BRD-defined range of 5–10% (`trade_fee_range_brd_min_percent = 5`, `trade_fee_range_brd_max_percent = 10`).

#### `GET /api/v1/marketplace/listings`

Browse active marketplace listings.

**Auth**: None

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-based). |
| `limit` | integer | 20 | Results per page. Maximum 100. |
| `sortBy` | string | (none) | Sort field: one of `price`, `rarity`, `level`. |
| `order` | string | `asc` | Sort direction: `asc` or `desc`. |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "listingId": "f1e2d3c4-b5a6-7890-fedc-ba0987654321",
        "petId": "550e8400-e29b-41d4-a716-446655440000",
        "petName": "Crimson Vexor",
        "rarity": "RARE",
        "level": 7,
        "sellerId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "price": 1200,
        "description": "Well-trained RARE pet, 70% win rate.",
        "listedAt": "2026-05-03T10:00:00Z"
      }
    ]
  },
  "error": null,
  "meta": { "total": 34, "page": 1, "limit": 20 }
}
```

| Field | Description |
|-------|-------------|
| `listingId` | UUID of the marketplace listing. |
| `petId` | UUID of the listed pet. |
| `sellerId` | UUID of the seller's pet (the pet token used to create the listing). |
| `price` | Asking price in bronze coins (integer). |
| `description` | Seller-supplied description. Max 200 characters. |
| `listedAt` | ISO 8601 timestamp when the listing was created. |

#### `POST /api/v1/marketplace/listings`

Create a new listing. Min price formula: `(pet_level * 100) + (rarity_multiplier * 500)`. Rarity multipliers: Common = 1, Rare = 2, Epic = 4, Legendary = 8 (`trade_min_price_formula_level_coeff = 100`, `trade_min_price_formula_rarity_coeff = 500`, `rarity_multiplier_*` values from `constants.json`). Anti-flip: Pet cannot be re-listed within **7 days** of its last completed purchase (`marketplace_trade_antiflip_protection_days = 7`).

**Auth**: Required (pet owner token)

**Request body:**

```json
{
  "petId": "550e8400-e29b-41d4-a716-446655440000",
  "price": 1200,
  "description": "Well-trained RARE pet, 70% win rate."
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `petId` | string (UUID) | Yes | Must be owned by the authenticated token | The pet to list for sale. |
| `price` | integer | Yes | Must be ≥ min price formula result; in bronze coins | Asking price in bronze coins. |
| `description` | string | No | Max 200 characters | Optional seller-supplied description. |

**Response (HTTP 201):**

```json
{
  "success": true,
  "data": {
    "listingId": "f1e2d3c4-b5a6-7890-fedc-ba0987654321",
    "petId": "550e8400-e29b-41d4-a716-446655440000",
    "price": 1200,
    "listedAt": "2026-05-03T10:00:00Z"
  },
  "error": null
}
```

#### `DELETE /api/v1/marketplace/listings/:listingId`

Cancel an active listing. Only the listing's owner may cancel.

**Auth**: Required (pet owner token — owner of listed pet)

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `listingId` | UUID | ID of the marketplace listing to cancel. |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "cancelled": true
  },
  "error": null
}
```

#### `POST /api/v1/marketplace/listings/:listingId/buy`

Purchase a listing. A **5% platform fee** (`trade_transaction_fee_percent = 5`) is deducted from the seller's proceeds and credited to the platform.

**Auth**: Required (pet owner token — buyer's token)

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `listingId` | UUID | ID of the listing to purchase. |

**Request body:** No request body. The buyer is authenticated via the `Authorization: Bearer <petToken>` header.

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "transactionId": "e5f6a7b8-c9d0-1234-efab-cd5678901234",
    "petId": "550e8400-e29b-41d4-a716-446655440000",
    "price": 1200,
    "platformFee": 60,
    "sellerProceeds": 1140,
    "tradedAt": "2026-05-03T11:00:00Z"
  },
  "error": null
}
```

#### `GET /api/v1/marketplace/history/:petId`

Returns trade history for a pet. **Private** — only the pet's current owner can view (trade prices are commercial-in-confidence).

**Note**: This endpoint provides supplementary trade history data. Upstream reference: PRD US-TRADE-001 AC; enabled under FF_MARKETPLACE feature flag.

**Auth**: Required (pet owner token)

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `petId` | UUID | Pet ID whose trade history is being retrieved. |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "petId": "550e8400-e29b-41d4-a716-446655440000",
    "trades": [
      {
        "transactionId": "e5f6a7b8-c9d0-1234-efab-cd5678901234",
        "fromOwner": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "toOwner": "550e8400-e29b-41d4-a716-446655440000",
        "price": 1200,
        "tradedAt": "2026-05-03T11:00:00Z"
      }
    ]
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `fromOwner` | Pet ID of the seller at time of trade. |
| `toOwner` | Pet ID of the buyer at time of trade. |
| `price` | Agreed transaction price in bronze coins (gross, before platform fee). |
| `tradedAt` | ISO 8601 timestamp when the trade was completed. |

**Error responses for all marketplace endpoints:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Price below minimum or anti-flip protection active |
| 401 | `UNAUTHORIZED` | Missing or invalid pet token (authenticated endpoints only) |
| 403 | `FEATURE_DISABLED` | `FF_MARKETPLACE` feature flag is off |
| 403 | `NOT_OWNER` | Token does not own the relevant pet |
| 404 | `NOT_FOUND` | Listing or pet not found (path-param endpoints) |

---

## 6. Admin API

**Base prefix**: `/admin/api/`

All admin endpoints require a valid admin session cookie. All mutations write an entry to the audit log. Rate limit: **100 requests per minute per admin account** (`admin_portal_requests_per_minute_per_account = 100`; Redis key `rl:admin:{admin_id}`, TTL 60s).

**Role access summary:**

| Role | Access level |
|------|-------------|
| `super_admin` | Full access to all endpoints including GDPR, config, roles, and audit log |
| `moderator` | Pet management (ban/unban), battle management, leaderboard, dashboard, analytics, email monitor |
| `read_only` | GET-only access to dashboard, pet list, leaderboard, battle records, email monitor, analytics — no mutations |

---

### 6.1 Admin Authentication

#### `POST /admin/api/auth/login`

Authenticates an admin with username, password, and TOTP code. On success, sets a session cookie.

**Auth**: None

**Request body:**

```json
{
  "username": "moderator_alice",
  "password": "correct-horse-battery-staple",
  "totpCode": "482917"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Admin username. |
| `password` | string | Yes | Admin password. |
| `totpCode` | string | No | 6-digit TOTP code. Required on all logins except first-time enrollment flow. |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "adminId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "role": "moderator",
    "sessionExpiresAt": "2026-05-03T16:00:00Z"
  },
  "error": null
}
```

Sets `Set-Cookie: session=<session_id>; HttpOnly; SameSite=Strict; Secure; Path=/admin`.

Session: 4-hour inactivity timeout (`admin_session_inactivity_expiry_hours = 4`), 8-hour absolute maximum (`admin_session_absolute_expiry_hours = 8`).

**First-login TOTP enrollment flow**: If the admin account has no TOTP secret configured, the server returns HTTP 403 using the standard error envelope (§4.1) with `error.code = "TOTP_SETUP_REQUIRED"` and `error.details.setupToken` containing a short-lived signed JWT (15-minute expiry). The admin must call `POST /admin/api/auth/totp/setup` before a session is granted.

**Rate limits**: Pre-auth IP rate limit: 10 attempts per 15-minute window (`admin_login_ip_rate_limit_attempts = 10`, `admin_login_ip_rate_limit_window_seconds = 900`). Account lockout: after 10 consecutive failures (`admin_login_lockout_threshold = 10`), account is locked for 30 minutes (`admin_login_lockout_duration_minutes = 30`).

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or malformed fields |
| 401 | `UNAUTHORIZED` | Invalid username or password |
| 403 | `ACCOUNT_LOCKED` | Account locked after repeated failures; `unlockedAt` (ISO 8601) in error response |
| 403 | `TOTP_SETUP_REQUIRED` | First login; TOTP not yet enrolled |
| 429 | `RATE_LIMIT_EXCEEDED` | IP pre-auth rate limit exceeded |

---

#### `POST /admin/api/auth/totp/setup`

Completes TOTP enrollment for a first-time admin login. Requires the short-lived `setupToken` returned by the login endpoint.

**Auth**: Setup token (signed JWT from login response — not a session)

**Request body:**

```json
{
  "setupToken": "<signed JWT from login 403 error.details.setupToken>",
  "password": "correct-horse-battery-staple"
}
```

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "otpAuthUrl": "otpauth://totp/pixel-pet-arena:moderator_alice?secret=BASE32SECRET&issuer=pixel-pet-arena",
    "backupCodes": [
      "A1B2C3D4E5",
      "F6G7H8I9J0",
      "K1L2M3N4O5",
      "P6Q7R8S9T0",
      "U1V2W3X4Y5",
      "Z6A7B8C9D0",
      "E1F2G3H4I5",
      "J6K7L8M9N0",
      "O1P2Q3R4S5",
      "T6U7V8W9X0"
    ]
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `otpAuthUrl` | `otpauth://totp/...` URI suitable for QR code generation in authenticator apps. |
| `backupCodes` | 10 single-use backup codes. Store securely. SHA-256 hashes stored in `admin_users.totp_backup_codes_hash`. |

After setup, the admin performs a standard login with `totpCode` to establish a session.

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields in request body |
| 401 | `UNAUTHORIZED` | `setupToken` is missing, invalid, or expired |

---

#### `POST /admin/api/auth/logout`

Invalidates the current admin session. Writes a logout event to the audit log.

**Auth**: Admin session

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |

---

#### `POST /admin/api/auth/totp/verify`

Verifies a TOTP code against the current admin's secret. Used for step-up authentication before sensitive operations. *(EDD extension — not enumerated in EDD §5.5; complements the TOTP setup flow in EDD §6.3; required for Super Admin sensitive write operations.)*

**Auth**: Admin session

**Request body:**

```json
{
  "totpCode": "482917"
}
```

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "verified": true
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `totpCode` field |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid, or TOTP code does not match |

---

### 6.2 Admin Role Management

#### `GET /admin/api/roles`

Lists all admin users and their roles.

**Auth**: Admin session — Super Admin only

**Query parameters:** `?page=1&limit=20`

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "admins": [
      {
        "adminId": "b2c3d4e5-f6a7-8901-bcde-fa2345678901",
        "username": "moderator_alice",
        "role": "moderator",
        "lastLoginAt": "2026-05-02T09:00:00Z",
        "deactivatedAt": null
      }
    ]
  },
  "error": null,
  "meta": { "total": 3, "page": 1, "limit": 20 }
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |

---

#### `POST /admin/api/roles`

Creates a new admin account.

**Auth**: Admin session — Super Admin only

**Request body:**

```json
{
  "username": "new_moderator",
  "role": "moderator",
  "temporaryPassword": "temp-password-123"
}
```

`role` must be one of `super_admin`, `moderator`, or `read_only`.

**Response (HTTP 201):**

```json
{
  "success": true,
  "data": {
    "adminId": "c3d4e5f6-a7b8-9012-cdef-ab3456789012",
    "username": "new_moderator",
    "role": "moderator",
    "auditLogId": "12344"
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid fields in request body |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |
| 409 | `CONFLICT` | Username already exists |

---

#### `DELETE /admin/api/roles/:adminId`

Soft-deactivates an admin account. Sets `deactivated_at = NOW()`. The account row is never hard-deleted (audit log FK integrity). Login is immediately blocked.

**Auth**: Admin session — Super Admin only

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "auditLogId": "12345"
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |
| 404 | `NOT_FOUND` | No admin account with the given `adminId` |

---

#### `POST /admin/api/roles/:adminId/totp/reset`

Resets TOTP for an admin account — clears `totp_secret_encrypted` and `totp_backup_codes_hash`, forcing re-enrollment on next login. Used when an admin loses their authenticator device.

**Auth**: Admin session — Super Admin only

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "auditLogId": "12346"
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |
| 404 | `NOT_FOUND` | No admin account with the given `adminId` |

---

### 6.3 Admin Pet Management

#### `GET /admin/api/pets`

Lists pets with optional search and filtering. Supports up to 1 million records with a response time target of ≤ 2 seconds (`admin_search_response_time_seconds = 2`).

**Auth**: Admin session — Moderator+ or Read Only

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20) |
| `search` | string | Search by exact pet UUID or exact SHA-256 email hash. Fragment search is not supported (emails are stored as AES-256-GCM ciphertext; only hash-indexed lookup is supported). |
| `rarity` | string | Filter by `COMMON`, `RARE`, `EPIC`, or `LEGENDARY` |
| `isBanned` | boolean | Filter by ban status |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "pets": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "ownerEmailMasked": "p***@example.com",
        "rarity": "RARE",
        "level": 7,
        "battlesPlayed": 17,
        "winRate": 0.706,
        "isBanned": false,
        "createdAt": "2026-04-15T09:32:00Z"
      }
    ]
  },
  "error": null,
  "meta": { "total": 1500, "page": 1, "limit": 20 }
}
```

> **`ownerEmailMasked`**: The server decrypts `claim_identities.email_encrypted` (AES-256-GCM, key from environment variable `EMAIL_ENCRYPTION_KEY`) and masks the plaintext for admin display (format: `p***@example.com`). The raw email is never returned. Decryption occurs server-side only; no decryption key is exposed to the admin portal frontend (EDD §4.2).

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |

---

#### `GET /admin/api/pets/:petId`

Returns full pet details including owner info and ban history. *(EDD extension — implied by ARCH §2.2 admin pet management; not individually enumerated in EDD §5.5 but required for the admin pet detail view.)*

**Auth**: Admin session — Moderator+ or Read Only

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "petName": "Crimson Vexor",
    "seed": 7381923847561029,
    "rarity": "RARE",
    "stats": {
      "speed": 34,
      "strength": 28,
      "stamina": 41,
      "level": 7
    },
    "isBanned": false,
    "bannedReason": null,
    "bannedAt": null,
    "claimedAt": "2026-04-15T09:32:00Z",
    "ownerEmailMasked": "p***@example.com",
    "generationMeta": {
      "body": "lizard",
      "head": "horned",
      "colorPalette": "crimson_gold",
      "accessory": "cape",
      "rarityTrait": "shimmering_scales",
      "pattern": "diagonal_stripe"
    },
    "recentBattles": [
      {
        "matchId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "mode": "RACE",
        "opponentPetId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "isAiOpponent": false,
        "result": "WIN",
        "completedAt": "2026-05-03T11:42:00Z"
      }
    ]
  },
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `isBanned` | `true` if the pet is currently banned. Maps to `pets.is_banned`. |
| `bannedReason` | Admin-supplied ban reason (max 500 chars). Maps to `pets.banned_reason`. `null` when not banned. |
| `bannedAt` | ISO 8601 timestamp when ban was applied. Maps to `pets.banned_at`. `null` when not banned. |
| `claimedAt` | ISO 8601 timestamp when the email-OTP claim flow completed. Maps to `pets.claimed_at`. `null` for unclaimed (guest preview) pets. |
| `generationMeta` | 6-dimension procedural generation vector. Maps to `pets.generation_meta` JSONB: `body`, `head`, `colorPalette` (`color_palette`), `accessory`, `rarityTrait` (`rarity_trait`), `pattern`. |
| `recentBattles` | Last 20 arena battles for this pet (`arena_battle_records_display_count = 20`). |

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |

---

#### `PUT /admin/api/pets/:petId`

Updates administrative fields on a pet (e.g. correcting `petName` after content moderation review). *(EDD extension — not enumerated in EDD §5.5; scoped to Super Admin only for content moderation corrections; audit-logged.)*

**Auth**: Admin session — Super Admin only

**Request body:**

```json
{
  "petName": "Revised Vexor",
  "banReason": "Automated bot behavior confirmed by manual review"
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `petName` | string | No | Max 64 characters (`VARCHAR(64)` in `pets.pet_name`) | Override the auto-generated pet name after content moderation review. |
| `banReason` | string | No | Max 500 characters (`admin_moderation_reason_max_chars = 500`) | Sets or updates the ban reason on the pet record (`pets.banned_reason`). Providing this field alone does **not** ban the pet — use `POST /admin/api/pets/:petId/ban` to apply a ban. This field is for correcting or annotating an existing ban reason only. |

All fields are optional. At least one field must be present.

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "auditLogId": "12347"
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Request body fails schema validation |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |

---

#### `POST /admin/api/pets/:petId/ban`

Bans a pet. The pet is removed from the public leaderboard within **5 minutes** (`leaderboard_ban_reflection_time_minutes = 5`). Banned pets receive `PET_BANNED` on arena entry.

**Auth**: Admin session — Moderator+

**Request body:**

```json
{
  "reason": "Automated bot behavior detected: 52 battles in 60-minute window"
}
```

`reason` max length: 500 characters (`admin_moderation_reason_max_chars = 500`).

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "auditLogId": "12348"
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `reason` field |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is below `moderator` |
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |

---

#### `POST /admin/api/pets/:petId/unban`

Lifts a ban from a pet. Pet is restored to the leaderboard if eligible.

**Auth**: Admin session — Moderator+

**Request body:**

```json
{
  "reason": "Manual review confirmed legitimate play"
}
```

`reason` max length: 500 characters (`admin_moderation_reason_max_chars = 500`).

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "auditLogId": "12349"
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `reason` field |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is below `moderator` |
| 404 | `PET_NOT_FOUND` | No pet with the given `petId` exists |

---

### 6.4 Admin Arena & Battle Management

#### `GET /admin/api/battles`

Lists arena battles with optional filters.

**Auth**: Admin session — Moderator+ or Read Only

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20; see `arena_battle_records_display_count = 20`) |
| `from` | ISO 8601 | Start of date range filter |
| `to` | ISO 8601 | End of date range filter |
| `petId` | UUID | Filter battles involving a specific pet |
| `flagged` | boolean | Filter to flagged battles only |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "battles": [
      {
        "matchId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "petAId": "550e8400-e29b-41d4-a716-446655440000",
        "petBId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "winnerId": "550e8400-e29b-41d4-a716-446655440000",
        "outcome": "WIN",
        "duration": 9,
        "completedAt": "2026-05-03T11:42:00Z",
        "isFlagged": false
      }
    ]
  },
  "error": null,
  "meta": { "total": 8420, "page": 1, "limit": 20 }
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Malformed `from`/`to` ISO 8601 date, invalid `petId` UUID, or invalid `flagged` value |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |

---

#### `GET /admin/api/suspicious`

Lists pets flagged by the bot detection system — pets with more than 50 battles in a 60-minute rolling window (`bot_detection_battles_threshold = 50`, `bot_detection_window_minutes = 60`).

**Auth**: Admin session — Moderator+

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "suspiciousPets": [
      {
        "petId": "550e8400-e29b-41d4-a716-446655440000",
        "battlesLastHour": 52,
        "winRate": 0.98,
        "flagCount": 3,
        "lastFlaggedAt": "2026-05-03T11:30:00Z"
      }
    ]
  },
  "error": null
}
```

The admin leaderboard also flags pets exceeding `leaderboard_admin_suspicious_flag_battles_per_hour = 50` — this is the same threshold value used for a separate admin UI indicator distinct from the bot detection action queue.

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is below `moderator` |

---

#### `POST /admin/api/battles/:matchId/flag`

Flags a battle record as suspicious.

**Auth**: Admin session — Moderator+

**Request body:**

```json
{
  "reason": "Abnormally fast victory; possible stat manipulation"
}
```

`reason` max length: 500 characters (`admin_moderation_reason_max_chars = 500`).

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": { "auditLogId": "12350" },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `reason` field |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is below `moderator` |
| 404 | `NOT_FOUND` | No match with the given `matchId` |

---

#### `DELETE /admin/api/battles/:matchId/flag`

Removes a flag from a battle record.

**Auth**: Admin session — Moderator+

**Request body:**

```json
{
  "reason": "Manual review confirmed legitimate outcome"
}
```

`reason` max length: 500 characters (`admin_moderation_reason_max_chars = 500`).

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": { "auditLogId": "12351" },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `reason` field |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is below `moderator` |
| 404 | `NOT_FOUND` | No match with the given `matchId` |

---

### 6.5 Admin Leaderboard

#### `GET /admin/api/leaderboard`

Returns the top **500** pets (`leaderboard_admin_view = 500`), with suspicious-flag annotations for pets exceeding the battles-per-hour threshold (`leaderboard_admin_suspicious_flag_battles_per_hour = 50`).

> **Pagination**: This endpoint is a **hard-capped list**, not paginated. It always returns up to 500 entries in a single response. The standard `page`/`limit` pagination parameters (§8) do not apply here. The `meta` envelope is omitted; total entry count is implicitly bounded by `leaderboard_admin_view = 500`.

**Auth**: Admin session — Moderator+ or Read Only

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "rank": 1,
        "petId": "550e8400-e29b-41d4-a716-446655440000",
        "petName": "Crimson Vexor",
        "rarity": "RARE",
        "level": 7,
        "score": 142.7,
        "winRate": 0.706,
        "battlesLastHour": 12,
        "isSuspicious": false,
        "isBanned": false
      }
    ],
    "lastUpdated": "2026-05-03T11:41:30Z"
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |

---

#### `DELETE /admin/api/leaderboard/:petId`

Removes a specific pet from the leaderboard (ban reflection). This is equivalent to banning and untracking; the pet's row in Redis is removed from the `leaderboard:global` sorted set. The ban itself must be applied separately via `POST /admin/api/pets/:petId/ban`.

**Auth**: Admin session — Moderator+

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": { "auditLogId": "12352" },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is below `moderator` |
| 404 | `NOT_FOUND` | No pet with the given `petId` on the leaderboard |

---

### 6.6 Admin Configuration

#### `GET /admin/api/config/runtime`

Returns current runtime configuration values. These are the admin-tunable parameters that take effect within 5 minutes of a change (`config_cache_refresh_time_minutes = 5`).

**Auth**: Admin session — Super Admin only

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "arenaRateLimitBattlesPerHour": 10,
    "arenaMatchmakingTimeoutSeconds": 30,
    "rarityWeights": {
      "common": 60,
      "rare": 25,
      "epic": 12,
      "legendary": 3
    }
  },
  "error": null
}
```

The four `rarityWeights` values must always sum to 100%.

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |

---

#### `PUT /admin/api/config/runtime`

Updates runtime configuration values. Changes take effect within 5 minutes (`config_cache_refresh_time_minutes = 5`). All parameters are validated against CONSTANTS-defined admin-tunable ranges.

**Auth**: Admin session — Super Admin only

**Request body (all fields optional — include only fields being updated):**

```json
{
  "arenaRateLimitBattlesPerHour": 15,
  "arenaMatchmakingTimeoutSeconds": 30,
  "rarityWeights": {
    "common": 55,
    "rare": 28,
    "epic": 13,
    "legendary": 4
  }
}
```

Tunable ranges:
- `arenaRateLimitBattlesPerHour`: `[1, 50]` (`arena_rate_limit_admin_min = 1`, `arena_rate_limit_admin_max = 50`)
- `arenaMatchmakingTimeoutSeconds`: runtime-tunable (default `arena_matchmaking_timeout_seconds = 30`; no CONSTANTS-defined min/max — operator judgement required; values outside `[5, 120]` are not recommended)
- `rarityWeights`: four values must sum to 100% (admin-tunable, `admin_tunable = true` in `constants.json`)

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `OUT_OF_RANGE` | A parameter value exceeds its CONSTANTS-defined tunable range |
| 400 | `VALIDATION_ERROR` | Rarity weights do not sum to 100% |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |

---

#### `GET /admin/api/config/economy`

Returns current economy configuration values.

**Auth**: Admin session — Super Admin only

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "foodBuffMultiplierMin": 0.5,
    "foodBuffMultiplierMax": 5.0,
    "arenaEntryCostFoodCreditsDefault": 0,
    "arenaEntryCostFoodCreditsMax": 10,
    "arenaEntryCooldownMinMinutes": 0,
    "arenaEntryCooldownMaxMinutes": 60
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |

---

#### `PUT /admin/api/config/economy`

Updates economy configuration parameters. Changes take effect within 5 minutes (`config_cache_refresh_time_minutes = 5`).

**Auth**: Admin session — Super Admin only

**Request body:**

```json
{
  "foodBuffMultiplierMin": 0.5,
  "foodBuffMultiplierMax": 3.0,
  "arenaEntryCostFoodCreditsDefault": 2,
  "arenaEntryCooldownMaxMinutes": 30
}
```

Tunable ranges:
- `foodBuffMultiplierMin/Max`: `[0.5, 5.0]` (`food_buff_multiplier_admin_min = 0.5`, `food_buff_multiplier_admin_max = 5.0`)
- `arenaEntryCostFoodCreditsDefault`: `[0, 10]` (`arena_entry_cost_food_credits_default = 0`, `arena_entry_cost_food_credits_admin_max = 10`)
- `arenaEntryCooldownMaxMinutes`: `[0, 60]` (`arena_entry_cooldown_admin_min_minutes = 0`, `arena_entry_cooldown_admin_max_minutes = 60`)

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `OUT_OF_RANGE` | A parameter value exceeds its CONSTANTS-defined tunable range |
| 400 | `VALIDATION_ERROR` | Request body fails schema validation |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |

---

#### `GET /admin/api/config/flags`

Returns current feature flag states.

**Auth**: Admin session — Super Admin only

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "flags": [
      { "flag": "FF_MARKETPLACE", "enabled": false, "description": "Phase 3 pet trading marketplace" },
      { "flag": "FF_BATTLE_RECORDS", "enabled": true, "description": "Public shareable battle records page" }
    ]
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |

---

#### `PUT /admin/api/config/flags/:flag`

Enables or disables a feature flag.

**Auth**: Admin session — Super Admin only

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `flag` | string | Feature flag name (e.g. `FF_MARKETPLACE`, `FF_BATTLE_RECORDS`) |

**Request body:**

```json
{
  "enabled": true
}
```

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "flag": "FF_MARKETPLACE",
    "enabled": true,
    "auditLogId": "12353"
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `enabled` field in request body |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |
| 404 | `NOT_FOUND` | No feature flag with the given `flag` name |

---

### 6.7 Admin GDPR Queue

#### `GET /admin/api/gdpr`

Lists all GDPR requests with optional status and type filtering. For Super Admin use only.

**Auth**: Admin session — Super Admin only

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20) |
| `status` | string | Filter: `pending`, `processing`, `completed`, `failed` |
| `type` | string | Filter: `erasure`, `data_access`, `restrict_processing`, `object_leaderboard`, `rectification` |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "requestId": "3c4d5e6f-7a8b-9c0d-e1f2-a3b4c5d6e7f8",
        "requestType": "erasure",
        "status": "pending",
        "submittedAt": "2026-05-01T09:00:00Z",
        "completedAt": null,
        "adminNotes": null
      }
    ]
  },
  "error": null,
  "meta": { "total": 8, "page": 1, "limit": 20 }
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |

---

#### `POST /admin/api/gdpr/delete`

Initiates an admin-triggered erasure request (e.g. for a support ticket). Email hash is converted to SHA-256 within 24 hours (`gdpr_email_hashing_internal_sla_hours = 24`) and reported compliant within 7 days (`gdpr_email_deletion_window_days = 7`).

**Auth**: Admin session — Super Admin only

**Request body:**

```json
{
  "emailHash": "sha256hexhashofemailaddress",
  "reason": "User support request #SUP-2026-0042"
}
```

`reason` max length: 500 characters (`admin_moderation_reason_max_chars = 500`).

**Response (HTTP 202):**

```json
{
  "success": true,
  "data": {
    "requestId": "d4e5f6a7-b8c9-0123-defa-bc4567890123",
    "estimatedCompletion": "2026-05-10T09:00:00Z"
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `emailHash` or `reason` field |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |

---

#### `PATCH /admin/api/gdpr/:requestId`

Updates the status of a non-erasure GDPR request (data_access, restrict_processing, object_leaderboard, rectification). Erasure requests are managed exclusively via `POST /admin/api/gdpr/delete`.

**Auth**: Admin session — Super Admin only

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `requestId` | UUID | GDPR request ID |

**Request body:**

```json
{
  "status": "completed",
  "adminNotes": "Data package emailed to subject within 30-day SLA."
}
```

`status` must be `processing`, `completed`, or `failed`. `adminNotes` max 500 characters (`admin_moderation_reason_max_chars = 500`).

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "requestId": "3c4d5e6f-7a8b-9c0d-e1f2-a3b4c5d6e7f8",
    "status": "completed",
    "updatedAt": "2026-05-03T12:00:00Z"
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Request body fails schema validation |
| 400 | `WRONG_REQUEST_TYPE` | Target `requestType` is `erasure` — must use `POST /admin/api/gdpr/delete` instead |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |
| 404 | `NOT_FOUND` | No GDPR request with the given `requestId` |

---

### 6.8 Admin Audit Log

#### `GET /admin/api/audit`

Returns audit log entries. Search any 12-month window in ≤ 3 seconds (`admin_audit_log_search_response_time_seconds = 3`). Audit logs are retained for **2 years** (`admin_audit_log_retention_years = 2`).

**Auth**: Admin session — Super Admin only

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 50) |
| `from` | ISO 8601 | Start of date range |
| `to` | ISO 8601 | End of date range |
| `actorId` | UUID | Filter by admin account ID |
| `action` | string | Filter by action type (e.g. `pet.ban`, `config.arena_rate_limit`) |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "987654",
        "adminId": "b2c3d4e5-f6a7-8901-bcde-fa2345678901",
        "adminUsername": "moderator_alice",
        "action": "pet.ban",
        "targetType": "pet",
        "targetId": "550e8400-e29b-41d4-a716-446655440000",
        "detail": { "reason": "Bot behavior detected" },
        "createdAt": "2026-05-03T11:45:00Z"
      }
    ]
  },
  "error": null,
  "meta": { "total": 2841, "page": 1, "limit": 50 }
}
```

IP addresses are stored as SHA-256 hashes only — never raw. Hash-only records are retained for **90 days** (`ip_address_log_retention_days = 90`).

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |
| 403 | `FORBIDDEN` | Authenticated admin role is not `super_admin` |

---

### 6.9 Admin Dashboard, Analytics & Email Monitor

#### `GET /admin/api/dashboard`

Returns a real-time summary of platform health for the admin dashboard. Metrics sourced from Redis counters and PostgreSQL aggregates. Page load target ≤ 3 seconds (`admin_page_load_time_seconds = 3`).

**Auth**: Admin session — Moderator+ or Read Only

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "claimedPetsToday": 42,
    "activeBattlesToday": 187,
    "pendingGdprRequests": 3,
    "dailyActiveUsers": 1250,
    "errorRateLast5Min": 0.004,
    "emailDeliveryRate": 0.991,
    "systemStatus": "healthy"
  },
  "error": null
}
```

`systemStatus` values: `healthy`, `degraded`, `down`.

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |

---

#### `GET /admin/api/analytics`

Returns product analytics time-series data.

**Auth**: Admin session — Moderator+ or Read Only

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | ISO 8601 | Start date (required) |
| `to` | ISO 8601 | End date (required) |
| `metric` | string | `dau`, `claims`, `arena_battles`, `leaderboard_uvs` |

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "metric": "dau",
    "dataPoints": [
      { "date": "2026-05-01", "value": 1180 },
      { "date": "2026-05-02", "value": 1250 }
    ],
    "summary": {
      "total": 2430,
      "average": 1215,
      "peak": 1250
    }
  },
  "error": null
}
```

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `from`/`to` (required) or unrecognised `metric` value |
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |

---

#### `GET /admin/api/email/monitor`

Returns email delivery health metrics from SendGrid webhook logs.

**Auth**: Admin session — Moderator+ or Read Only

**Response (HTTP 200):**

```json
{
  "success": true,
  "data": {
    "emailsSentLast24h": 312,
    "deliverySuccessRate": 0.991,
    "bounceRate": 0.006,
    "spamComplaintRate": 0.0008,
    "failoverActive": false
  },
  "error": null
}
```

Targets: delivery rate ≥ 98% (`claim_email_delivery_rate_target_percent = 98`), spam complaint rate < 0.1% (`spam_complaint_rate_max_percent = 0.1`). Failover activates after 3 consecutive SendGrid failures (`sendgrid_failover_consecutive_failures = 3`).

**Error responses:**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Admin session missing or invalid |

---

## 7. WebSocket / Real-Time

**Scope note**: Per the EDD and ARCH, the arena battle resolution uses **HTTP long-polling** on `POST /api/v1/arena/enter` (waiting up to 30 seconds — `arena_matchmaking_timeout_seconds = 30`) rather than a WebSocket connection. This is sufficient for the MVP load profile (500 RPS peak, 2000 PCU — `peak_operation_rps = 500`, `peak_concurrent_users = 2000`) and avoids the operational complexity of a persistent WebSocket server within the MVP budget (`mvp_budget_usd = 40000`).

**Real-time updates** currently handled by client-side polling:

| Data | Client polling interval | Notes |
|------|-------------------------|-------|
| Leaderboard | 30 seconds | Matches `leaderboard_update_lag_max_seconds = 30` |
| Arena matchmaking status | Built into the long-poll request | Single HTTP connection per match entry |
| Pet stats after training | Invalidated by TanStack Query on mutation | Immediate cache invalidation on `POST /train` success |

**WebSocket consideration for Phase 2+**: If live leaderboard push, arena spectator mode, or real-time battle animations are added in a future phase, a WebSocket endpoint at `wss://api.pixel-pet-arena.com/ws` may be introduced. This will be documented as an addendum to v1 API.

---

## 8. Pagination

All list endpoints that may return more than 20 results support cursor-less offset pagination using the following standard query parameters:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | — | 1-based page number |
| `limit` | integer | 20 | 100 (public), 500 (admin leaderboard) | Results per page |

All paginated responses include a `meta` field in the envelope:

```json
{
  "meta": {
    "total": 1500,
    "page": 2,
    "limit": 20
  }
}
```

`total` is the count of all matching records (before pagination). Clients should use `Math.ceil(total / limit)` to determine the total number of pages. When `page * limit >= total`, the response `data` array will be empty (not an error).

**Admin pet search**: Supports returning up to 1 million records efficiently, with response time ≤ 2 seconds (`admin_search_response_time_seconds = 2`).

**Public leaderboard**: Hard cap of 100 entries (`leaderboard_top_display = 100`). Admin leaderboard: hard cap of 500 entries (`leaderboard_admin_view = 500`).

---

## 9. Changelog / Versioning

### v1.0 — 2026-05-03

- Initial release of the pixel-pet-arena REST API.
- Player API routes: claim flow (initiate, verify, recover), pet CRUD, arena (enter, match fetch, history), leaderboard (global, per-pet rank), GDPR self-service, marketplace (Phase 3 / FF_MARKETPLACE).
- Admin API routes: authentication (login, logout, TOTP setup/verify), role management, pet management (list, ban, unban), arena/battle management (list, flag, unflag), leaderboard (admin view, ban reflection), runtime config, economy config, feature flags, GDPR queue, audit log, dashboard, analytics, email monitor.
- All rate limits sourced from `constants.json`.
- Backward compatibility: 1 prior major version (`api_backward_compat_versions = 1`).
- Deprecation notice period: 90 days (`api_deprecation_notice_days = 90`).

### Versioning Policy

When breaking changes are required:
1. A new version prefix is introduced (e.g. `/api/v2/`).
2. The previous version (`/api/v1/`) is maintained for a minimum of 1 complete version lifecycle (`api_backward_compat_versions = 1`).
3. A `Deprecation` response header is added to all v1 responses with the sunset date at least 90 days in the future (`api_deprecation_notice_days = 90`).
4. Release notes will be published to the developer changelog before the deprecation notice date.

Non-breaking changes (additive fields, new optional query parameters, new endpoints) are deployed without a version bump and are backward compatible by definition.

---

## 10. Health Check

#### `GET /health`

Returns platform health status. Required by PRD NFR-AVAIL-06.

> **Note**: This endpoint intentionally uses a minimal response body (`{status, checks, timestamp}`) rather than the standard `{success, data, error, meta}` envelope described in §4.1. Health-check consumers (load balancers, uptime monitors) expect this lightweight format.

**Auth**: None

**Rate Limit**: None

**Response time**: ≤ 500 ms (`health_check_response_time_ms = 500`)

**Response (HTTP 200 — healthy):**

```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "redis": "ok"
  },
  "timestamp": "2026-05-03T12:00:00Z"
}
```

**Response (HTTP 503 — degraded or down):**

```json
{
  "status": "degraded",
  "checks": {
    "database": "ok",
    "redis": "unavailable"
  },
  "timestamp": "2026-05-03T12:00:00Z"
}
```

`status` values: `healthy` (all checks pass), `degraded` (partial failure), `down` (critical failure).
