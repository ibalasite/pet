---
diagram: sequence-arena-enter-error
uml-type: Sequence Diagram（POST /arena/enter — Error Paths）
source: docs/API.md §5.3 + §4.1 Error envelope
generated: 2026-05-08T00:00:00Z
---

# Sequence Diagram — Arena Enter Error Paths

> 來源：docs/API.md §5.3 Arena Endpoints + §4 Error Code Reference

聚焦 `POST /api/v1/arena/enter` 的 4 條 Error Path：(1) 認證失效、(2) Rate Limit、(3) 寵物 Banned、(4) 媒合超時 + acceptAi=false。

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant App as Player App
    participant API as Game API Server
    participant Redis as Redis
    participant DB as PostgreSQL

    Note over Player,DB: Error Path 1 — Authentication Failure

    Player->>App: click "Enter Arena"
    App->>API: POST /api/v1/arena/enter {petId, mode, acceptAi}<br/>Header: X-Pet-Token: stale_or_invalid
    API->>API: SHA-256 hash header token
    API->>DB: SELECT FROM pets WHERE id = $1 AND owner_token_hash = $2
    alt token doesn't match
        DB-->>API: 0 rows
        API-->>App: 401 Unauthorized {error: "INVALID_TOKEN"}
        App->>App: tokenStore.clear()
        App-->>Player: redirect /claim "Re-claim required"
    else token revoked (in Redis blacklist)
        API->>Redis: GET token:blacklist:{hash}
        Redis-->>API: "1" (in blacklist)
        API-->>App: 401 Unauthorized {error: "TOKEN_REVOKED"}
        App-->>Player: redirect /claim
    end

    Note over Player,DB: Error Path 2 — Rate Limit Exceeded

    Player->>App: click "Enter Arena" (rapid retry)
    App->>API: POST /api/v1/arena/enter {petId, mode}
    API->>Redis: GET rl:arena:{petId}
    Redis-->>API: 10 (= arena_rate_limit_battles_per_hour_default = 10)
    alt counter >= limit
        API-->>App: 429 Too Many Requests {error: "RATE_LIMIT_EXCEEDED", retryAfter: 1234}
        App->>App: show RateLimitBanner with countdown
        App-->>Player: disable Enter button until cooldown
    end

    Note over Player,DB: Error Path 3 — Pet Banned by Admin

    Player->>App: click "Enter Arena"
    App->>API: POST /api/v1/arena/enter {petId, mode}
    API->>DB: SELECT FROM pets WHERE id = $1
    DB-->>API: pet row, is_banned = TRUE
    alt is_banned
        API->>DB: INSERT admin_audit_log (event='banned_pet_arena_attempt')
        API-->>App: 403 Forbidden {error: "PET_BANNED", reason: "spam_detected"}
        App->>App: show ErrorPage "This pet is banned"
        App-->>Player: cannot proceed; contact support link
    end

    Note over Player,DB: Error Path 4 — Matchmaking Timeout (acceptAi=false)

    Player->>App: select RACE, acceptAi=false (set in advanced settings)
    App->>API: POST /api/v1/arena/enter {petId, mode: RACE, acceptAi: false}
    API->>Redis: ZADD matchmaking:queue:RACE {petId, ts}
    activate API
    Note right of API: long-poll, max 30s<br/>(arena_matchmaking_timeout_seconds = 30)
    loop wait for opponent
        API->>Redis: BLPOP matchmaking:queue:RACE timeout=30
        Redis-->>API: nil (no opponent within 30s)
    end
    deactivate API
    API->>Redis: ZREM matchmaking:queue:RACE {petId}
    Note right of API: rate-limit counter NOT incremented on timeout
    API-->>App: 408 Request Timeout {error: "MATCHMAKING_TIMEOUT", suggestAi: true}
    App->>App: show "No opponent found" toast
    App-->>Player: offer "Try AI battle?" modal

    Note over Player,DB: Error Path 5 — DB Outage (rare)

    Player->>App: click "Enter Arena"
    App->>API: POST /api/v1/arena/enter
    API->>DB: SELECT FROM pets WHERE id = $1
    alt DB unreachable
        DB-->>API: connection timeout 2s
        API->>API: log structured error (level=error, traceId)
        API-->>App: 503 Service Unavailable {error: "DB_UNAVAILABLE", retryAfter: 60}
        App->>App: show OfflineBanner
        App-->>Player: "Service temporarily unavailable"
    end

    Note over Player,DB: Error Path 6 — Server Internal Error (5xx)

    Player->>App: click "Enter Arena"
    App->>API: POST /api/v1/arena/enter
    API->>API: unexpected exception (e.g., null pointer)
    API->>API: capture stack trace + traceId
    API-->>App: 500 Internal Server Error {error: "INTERNAL_ERROR", traceId: "..."}
    App->>App: TelemetryClient.captureError
    App-->>Player: "Unexpected error. We've been notified." + traceId
```

## Error Path 對應 API.md §4.3 Error Codes

| Path | Error Code | HTTP Status | Recovery Action |
|------|-----------|-------------|----------------|
| 1a. Token mismatch | `INVALID_TOKEN` | 401 | clear localStorage; redirect /claim |
| 1b. Token revoked | `TOKEN_REVOKED` | 401 | redirect /claim |
| 2. Rate limit | `RATE_LIMIT_EXCEEDED` | 429 | wait retryAfter seconds |
| 3. Pet banned | `PET_BANNED` | 403 | unrecoverable; contact support |
| 4. Matchmaking timeout | `MATCHMAKING_TIMEOUT` | 408 | accept AI fallback |
| 5. DB outage | `DB_UNAVAILABLE` | 503 | retry 60s |
| 6. Internal error | `INTERNAL_ERROR` | 500 | telemetry log + retry once |

## Counter Update Semantics

- Rate-limit counter `INCR rl:arena:{petId}` is only incremented when a battle **actually completes** — not on timeout, not on error.
- Audit log captures `banned_pet_arena_attempt` even on 403 (forensic trail).
- Token blacklist keyed by `SHA-256(plainToken)` → no plaintext stored.

## Notes

- 6 個 error path 涵蓋了 enter 端點所有 non-200 回應碼（400 / 401 / 403 / 408 / 429 / 500 / 503）
- DB outage 路徑（5）會 graceful degrade，不會把 user 卡在 spinner 永遠
- 所有 server-side error 都會把 `traceId` 回給 client，便於支援團隊用 trace 查日誌
