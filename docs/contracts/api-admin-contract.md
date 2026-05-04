# API–Admin Portal Contract

This document defines the stable interface contract between the Fastify 4 API backend (`apps/api`) and the Vue 3 + Element Plus admin portal (`apps/admin`). Admin users have elevated privileges and access a separate endpoint namespace (`/api/v1/admin/*`). All admin routes require an authenticated session established via TOTP login; bearer tokens used by the player frontend are not accepted here.

---

## Admin Authentication Contract

Admin authentication is a two-step TOTP flow entirely distinct from the player bearer-token system. Step one: the admin submits their username and TOTP code to `POST /api/v1/admin/auth/login`. On success the API creates a Redis-backed session record and responds with a `Set-Cookie` header:

```
Set-Cookie: ppa_admin_session=<opaque-session-id>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/admin
```

The cookie is `HttpOnly` (JavaScript in the admin portal cannot read it), `Secure` (HTTPS only), and scoped to `Path=/api/v1/admin` so it is never sent to player endpoints. The Vue 3 frontend must be configured with `withCredentials: true` on its Axios/fetch instance so the browser attaches the cookie automatically to every admin API call. Session records are stored in Redis under `session:admin:<sessionId>` with a TTL of 8 hours. When the session expires Redis deletes the key and subsequent requests receive `401 Unauthorized`; the portal must redirect the user back to the login screen.

**Login request** (`POST /api/v1/admin/auth/login`):

```json
{ "username": "admin_alice", "totpCode": "482031" }
```

**Login success** `200 OK` — body is minimal:

```json
{ "adminId": "uuid-v4", "username": "admin_alice", "role": "moderator" }
```

`role` is one of `"superadmin"` or `"moderator"`. Some destructive endpoints (GDPR erasure, config updates) require `superadmin`.

**Logout** (`POST /api/v1/admin/auth/logout`) invalidates the Redis session immediately and responds `204 No Content` with a `Set-Cookie` header that expires the cookie.

---

## Core Admin Endpoint Contracts

### GET /api/v1/admin/pets

Returns a paginated list of all pets in the system, with moderation metadata.

**Query params**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `50` | Max 200 |
| `status` | `string` | `all` | `all`, `active`, `banned` |
| `species` | `string` | — | Filter by species slug |

**Success response** `200 OK`:

```json
{
  "pets": [
    {
      "petId": "uuid-v4",
      "name": "Frostbyte",
      "species": "glacicat",
      "ownerId": "uuid-v4",
      "ownerDisplayName": "PixelWarrior",
      "level": 7,
      "status": "active",
      "bannedAt": null,
      "bannedBy": null,
      "createdAt": "2026-01-15T10:23:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 3140 }
}
```

---

### PUT /api/v1/admin/pets/:id/ban

Bans a pet from arena participation. Banned pets remain visible to their owner but cannot enter battles or the leaderboard.

**Path param**: `id` — pet UUID.

**Request body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | `string` | Yes | Human-readable reason (max 255 chars) |
| `notifyOwner` | `boolean` | No | Default `true`; sends in-app notification |

**Success response** `200 OK`:

```json
{
  "petId": "uuid-v4",
  "status": "banned",
  "bannedAt": "2026-05-04T09:12:00Z",
  "bannedBy": "admin_alice"
}
```

Returns `404` if the pet does not exist, `409` if already banned.

---

### GET /api/v1/admin/leaderboard

Returns the full leaderboard including banned and shadow-banned entries, with flags invisible to the player endpoint.

**Success response** `200 OK`:

```json
{
  "entries": [
    {
      "rank": 1,
      "playerId": "uuid",
      "displayName": "PixelWarrior",
      "petName": "Frostbyte",
      "wins": 142,
      "rating": 2150,
      "flagged": false,
      "shadowBanned": false
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 850 }
}
```

The `flagged` and `shadowBanned` fields are stripped from the player-facing `/api/v1/leaderboard` endpoint.

---

### DELETE /api/v1/admin/users/:id/gdpr-erase

Enqueues a GDPR erasure job for the specified player. This endpoint is restricted to `superadmin` role. The erasure is asynchronous: all player data (account, pets, battle history, display name) is scheduled for deletion. The endpoint returns immediately with a job reference.

**Path param**: `id` — player UUID.

**Request body**: empty.

**Success response** `202 Accepted` (superadmin only):

```json
{
  "jobId": "job_uuid-v4",
  "playerId": "uuid-v4",
  "status": "queued",
  "estimatedCompletionMs": 15000
}
```

Returns `403 Forbidden` for moderator-role sessions. Returns `404` if the player does not exist. The portal must display a confirmation dialog before issuing this request because it is irreversible.

---

### GET /api/v1/admin/battles/suspicious

Returns battles flagged by the anomaly-detection system as potentially exploited (unusual win rates, stat manipulation, repeated identical turn sequences).

**Query params**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `20` | Max 100 |
| `reviewStatus` | `string` | `pending` | `pending`, `cleared`, `actioned` |

**Success response** `200 OK`:

```json
{
  "battles": [
    {
      "battleId": "uuid-v4",
      "playerPetId": "uuid-v4",
      "opponentPetId": "uuid-v4",
      "suspicionScore": 0.92,
      "suspicionReasons": ["identical_turn_sequence", "stat_overflow"],
      "reviewStatus": "pending",
      "occurredAt": "2026-05-03T22:14:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 7 }
}
```

---

### PUT /api/v1/admin/config

Updates runtime configuration values. Restricted to `superadmin` role. Only keys listed in the API's allowlist can be modified; unknown keys return `400`.

**Request body** (partial update; omit keys to leave unchanged):

```json
{
  "arenaMatchmakingRatingBand": 150,
  "petGenerationCooldownMs": 86400000,
  "leaderboardPageSize": 20
}
```

**Success response** `200 OK`:

```json
{
  "updated": ["arenaMatchmakingRatingBand", "petGenerationCooldownMs"],
  "config": {
    "arenaMatchmakingRatingBand": 150,
    "petGenerationCooldownMs": 86400000,
    "leaderboardPageSize": 20
  }
}
```

---

## Session Expiry Handling

The Redis session TTL is 8 hours from the time of login; there is no sliding-window refresh. The admin portal must handle `401 Unauthorized` responses from any admin endpoint gracefully by clearing any locally cached admin state (Pinia store), displaying a "session expired, please log in again" message, and navigating to the TOTP login screen. The portal must not cache session status in localStorage; session validity is determined entirely by whether the backend accepts the cookie. A `GET /api/v1/admin/auth/me` endpoint is available for the portal to validate session status on app mount without performing a destructive action.

---

## Breaking Change Policy

Admin endpoints follow the same versioning semantics as the player API: any removal, type change, or authentication-mechanism change is breaking and requires a path version bump (`/api/v2/admin/`) with a 30-day deprecation period. Because the admin portal is an internal tool deployed together with the API, a shorter 14-day deprecation window is acceptable with explicit team sign-off. Additive changes (new optional fields, new optional query params, new endpoints) are non-breaking. The portal must tolerate unknown fields in responses. Configuration key additions to the `PUT /api/v1/admin/config` allowlist are non-breaking; removals are breaking.
