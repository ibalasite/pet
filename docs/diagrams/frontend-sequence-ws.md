---
diagram: frontend-sequence-ws
uml-type: Sequence Diagram（HTTP Long-Polling Protocol）
source: docs/FRONTEND.md §2.6 API Client + docs/API.md §5.3 Arena
generated: 2026-05-08T00:00:00Z
---

# Frontend Sequence — HTTP Long-Polling Protocol

> 來源：docs/FRONTEND.md §2.6 API Client + docs/API.md §5.3 Arena Endpoints

> **注意**：本系統採 HTTP Long-Polling 取代 WebSocket（API.md §5.3 Scope note）。
> 本圖描述客戶端與伺服器的「持續連線」訊息協議，包括：建立連線、心跳、超時退避、斷線重連。

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant App as PlayerApp (React + Phaser)
    participant LP as LongPollClient
    participant API as Game API Server (Fastify)
    participant Heartbeat as HealthMonitor

    Note over Player,Heartbeat: 1. Initial Connection (POST /api/v1/arena/enter)

    Player->>App: Click "Enter Arena (RACE)"
    App->>LP: openLongPoll(petId, mode=RACE)
    LP->>API: POST /api/v1/arena/enter {petId, mode: RACE, acceptAi: true}
    Note over LP,API: Connection: keep-alive<br/>Read timeout: 35s (server max 30s + 5s buffer)

    Note over Player,Heartbeat: 2. Server-side Long-Poll Window (≤30s)

    activate API
    API->>API: enqueue petId in matchmaking queue
    loop Within 30s window
        API->>API: poll Redis BLPOP for opponent (block)
    end
    deactivate API

    Note over Player,Heartbeat: 3a. Happy: Opponent Found (within 30s)

    alt opponent found within 30s
        API-->>LP: 200 OK {matchId, status: READY, opponentPetId, durationSeconds}
        LP-->>App: onMatchReady(payload)
        App->>App: navigate to /arena/result/:matchId
        App->>API: GET /api/v1/arena/match/:matchId (final result + battle log)
        API-->>App: 200 OK {ArenaMatch with full battle log}
        App-->>Player: render BattleResultPage (Phaser BattleScene)

    else timeout reached (30s, no opponent)

        Note over Player,Heartbeat: 3b. Timeout — fallback to AI battle

        API-->>LP: 200 OK {matchId, status: AI_FALLBACK, durationSeconds}
        LP-->>App: onAiFallback(payload)
        App->>API: POST /api/v1/arena/match/:matchId/start (AI battle resolve)
        API-->>App: 200 OK {ArenaMatch with battle log}
        App-->>Player: render BattleResultPage

    else server error (5xx) or network failure

        Note over Player,Heartbeat: 3c. Error path with retry/backoff

        API-->>LP: 503 Service Unavailable / network timeout
        LP->>LP: retry with backoff (exponential: 1s → 2s → 4s, max 3 attempts)
        loop retry up to 3 times
            LP->>API: POST /api/v1/arena/enter (retry)
            alt success
                API-->>LP: 200 OK
                LP-->>App: onMatchReady(payload)
            else exhausted
                LP-->>App: onError(NetworkError)
                App-->>Player: show toast "Connection failed. Try again."
            end
        end

    else 429 rate limited

        API-->>LP: 429 Too Many Requests {Retry-After: 600}
        LP-->>App: onRateLimited({retryAfter: 600})
        App-->>Player: show RateLimitBanner
    end

    Note over Player,Heartbeat: 4. Health-check / Heartbeat (background)

    par every 30s while page open
        App->>Heartbeat: every 30s
        Heartbeat->>API: GET /health/ready
        alt healthy
            API-->>Heartbeat: 200 OK {status: "ready"}
        else unhealthy
            API-->>Heartbeat: 503 / network error
            Heartbeat->>App: setOnlineStatus(false)
            App-->>Player: show OfflineBanner
        end
    and on page focus regain
        App->>Heartbeat: triggerImmediate()
        Heartbeat->>API: GET /health/ready
    end

    Note over Player,Heartbeat: 5. Disconnect / cleanup on page unmount

    Player->>App: navigate away (component unmount)
    App->>LP: cancel() (AbortController.abort())
    LP->>API: cancel inflight request
    LP-->>App: aborted
    App->>Heartbeat: stop()
```

## Notes

- **No actual WebSocket**：API.md §5.3 明確指出 MVP 用 HTTP long-polling，避免持久化 WebSocket server 的運營複雜度。
- **Read timeout 35s**：客戶端 `AbortController` 設 35 秒，比伺服器 30 秒 long-poll 窗口多 5 秒緩衝。
- **Retry budget**：失敗時最多 3 次 exponential backoff（1s / 2s / 4s）；total 最多 ~7 秒等待後才告知使用者失敗。
- **Heartbeat / health check**：每 30 秒呼叫一次 `/health/ready`，並在 `window.onfocus` 立即觸發。
- **Cancel on unmount**：React `useEffect` cleanup function 呼叫 `AbortController.abort()` 取消 inflight 請求，防止 memory leak。

## 訊息類型清單

| Event | Direction | Payload Schema |
|-------|-----------|---------------|
| `enter_arena_request` | Client → Server | `{petId: UUID, mode: ArenaMode, acceptAi: Boolean}` |
| `match_ready` | Server → Client | `{matchId: UUID, status: "READY", opponentPetId: UUID, durationSeconds: Integer}` |
| `ai_fallback` | Server → Client | `{matchId: UUID, status: "AI_FALLBACK", durationSeconds: Integer}` |
| `rate_limited` | Server → Client | `{error: "RATE_LIMITED", retryAfter: Integer}` |
| `health_check` | Client → Server | `GET /health/ready` (no body) |
| `health_response` | Server → Client | `{status: "ready" \| "degraded"}` |
