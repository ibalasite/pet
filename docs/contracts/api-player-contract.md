# API–Player Frontend Contract

This document defines the stable interface contract between the Fastify 4 API backend (`apps/api`) and the React 18 + Phaser 3 player frontend (`apps/player`). Both teams must treat this contract as authoritative. Any deviation from the shapes described here constitutes a breaking change and must follow the versioning policy in the final section.

---

## Authentication Contract

Player authentication uses raw opaque bearer tokens issued by the API. When a player claims a pet session via `POST /api/v1/auth/claim`, the API returns a single-use token string. The frontend **must** persist this token in `localStorage` under the key `ppa_player_token`. Every subsequent authenticated request must include the header:

```
Authorization: Bearer <token>
```

There is no refresh mechanism; tokens do not expire on a fixed schedule but may be revoked server-side (e.g., after a GDPR erasure). When the API returns `401 Unauthorized`, the frontend must clear `ppa_player_token` from `localStorage` and redirect the player to the claim screen. Tokens are opaque strings—the frontend must never attempt to parse or decode them. The backend validates tokens against PostgreSQL/Supabase; no JWT libraries are involved on either side.

---

## Core Endpoint Contracts

### POST /api/v1/auth/claim

Issues a new bearer token, optionally associating it with an existing player identity.

**Request body** (`application/json`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `displayName` | `string` | No | Preferred display name (max 32 chars) |
| `referralCode` | `string` | No | Optional referral code |

**Success response** `200 OK`:

```json
{
  "token": "ppa_t_a1b2c3d4e5f6...",
  "playerId": "uuid-v4",
  "displayName": "PixelWarrior"
}
```

**Error responses**: `400` for validation failures, `429` for rate-limit exceeded.

---

### GET /api/v1/pet

Returns the authenticated player's current active pet.

**Success response** `200 OK`:

```json
{
  "petId": "uuid-v4",
  "name": "Frostbyte",
  "species": "glacicat",
  "level": 7,
  "experience": 2340,
  "stats": {
    "hp": 120,
    "attack": 45,
    "defense": 38,
    "speed": 62
  },
  "spriteKey": "glacicat_blue_lv2",
  "createdAt": "2026-01-15T10:23:00Z"
}
```

Returns `404` with error body if the player has no active pet (must call generate first).

---

### POST /api/v1/pet/generate

Enqueues a new pet generation job and returns immediately with a job reference. Pet generation is asynchronous; the frontend must poll or use a WebSocket subscription to detect completion.

**Request body**: empty or `{}`.

**Success response** `202 Accepted`:

```json
{
  "jobId": "job_uuid-v4",
  "status": "queued",
  "estimatedWaitMs": 3000
}
```

**Conflict response** `409`: Player already has an active pet. The frontend must offer an explicit "release pet" action before generating a new one.

---

### GET /api/v1/arena/challenge

Returns the current arena challenge available to the authenticated player—an opponent pet drawn from the matchmaking pool.

**Success response** `200 OK`:

```json
{
  "challengeId": "uuid-v4",
  "opponent": {
    "petId": "uuid-v4",
    "name": "Emberclaw",
    "species": "pyrofox",
    "level": 7,
    "stats": { "hp": 115, "attack": 52, "defense": 30, "speed": 58 },
    "spriteKey": "pyrofox_red_lv2"
  },
  "expiresAt": "2026-05-04T12:05:00Z"
}
```

Returns `404` if no suitable opponent is available (frontend should display "no challengers" state).

---

### POST /api/v1/arena/battle

Submits the player's move selection to resolve an arena battle. The battle engine runs server-side; the response includes the full turn-by-turn log for Phaser 3 to animate.

**Request body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `challengeId` | `string` | Yes | From the challenge endpoint |
| `moveId` | `string` | Yes | One of the player pet's available move IDs |

**Success response** `200 OK`:

```json
{
  "battleId": "uuid-v4",
  "outcome": "win",
  "turns": [
    { "turn": 1, "actor": "player", "move": "ice_shard", "damage": 18, "targetHpAfter": 97 },
    { "turn": 2, "actor": "opponent", "move": "ember", "damage": 12, "targetHpAfter": 108 }
  ],
  "rewards": {
    "experienceGained": 320,
    "newLevel": 8
  }
}
```

`outcome` is one of `"win"`, `"loss"`, or `"draw"`.

---

### GET /api/v1/leaderboard

Returns the global leaderboard, paginated.

**Query params**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `integer` | `1` | Page number (1-indexed) |
| `limit` | `integer` | `20` | Entries per page (max 100) |

**Success response** `200 OK`:

```json
{
  "entries": [
    { "rank": 1, "playerId": "uuid", "displayName": "PixelWarrior", "petName": "Frostbyte", "wins": 142, "rating": 2150 }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 850 }
}
```

---

## Error Response Format Contract

All API errors follow a single envelope regardless of HTTP status code. The frontend must read `error.code` for machine-readable handling and `error.message` for display.

```json
{
  "error": {
    "code": "PET_NOT_FOUND",
    "message": "No active pet found for this player.",
    "statusCode": 404,
    "requestId": "req_abc123xyz"
  }
}
```

Standard error codes used by player-facing endpoints:

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Token missing, invalid, or revoked |
| `FORBIDDEN` | 403 | Authenticated but not allowed (e.g., banned) |
| `PET_NOT_FOUND` | 404 | Player has no active pet |
| `CHALLENGE_EXPIRED` | 410 | Challenge window has passed |
| `RATE_LIMITED` | 429 | Too many requests; respect `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Unexpected server failure |

The `requestId` field is always present and should be surfaced in error UI to assist support.

---

## Breaking Change Policy

A change is **breaking** if it removes a field, changes a field's type, renames an endpoint path, or alters authentication semantics. Breaking changes require a new API version path prefix (e.g., `/api/v2/`) and a minimum 30-day deprecation notice communicated via the `Deprecation` and `Sunset` HTTP response headers on the old endpoints. Additive changes—new optional fields, new endpoints, new optional query params—are non-breaking and do not require a version bump. The frontend must be tolerant of unknown fields in responses (never fail hard on unrecognised JSON keys).
