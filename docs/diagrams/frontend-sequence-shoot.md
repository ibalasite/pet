---
diagram: frontend-sequence-shoot
uml-type: Sequence Diagram（Main Game Interaction — Train + Battle）
source: docs/FRONTEND.md §5 Key UI Flows + docs/API.md §5.2 Pet + §5.3 Arena
generated: 2026-05-08T00:00:00Z
---

# Frontend Sequence — Main Game Interaction (Train + Enter Arena + Battle Result)

> 來源：docs/FRONTEND.md §5.3 Training Interaction + §5.5 Arena Battle Flow + docs/API.md §5.2 / §5.3

描述玩家完成「訓練 → 進場 → 看結果」一個完整的核心遊戲循環，覆蓋多個 component、多個 store 與多個 API 呼叫。

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant TP as TrainingPage
    participant TAC as TrainingActionCard
    participant PetSvc as PetApiService
    participant Pet as PetStore
    participant API as Game API Server
    participant DB as PostgreSQL
    participant AP as ArenaPage
    participant ArenaSvc as ArenaApiService
    participant Phaser as PetCanvasEngine

    Note over Player,Phaser: Phase 1 — Player trains pet (SPEED action)

    Player->>TP: visit /pet/:petId/train (TrainingPage mount)
    TP->>Pet: read pet from PetStore
    Pet-->>TP: Pet {speed: 80, level: 18}
    TP->>TAC: render 3 cards (SPEED / STRENGTH / STAMINA)
    Player->>TAC: click "Train Speed" card
    TAC->>TAC: setLoading(true) + disable card

    TAC->>PetSvc: train(petId, {trainingType: "SPEED"})
    PetSvc->>API: POST /api/v1/pets/:petId/train {trainingType: "SPEED"}<br/>Header: X-Pet-Token: ...
    API->>API: validate token via owner_token_hash
    API->>API: check rate limit (rl:train:{petId} ≥ 3 daily?)
    alt rate limit OK
        API->>DB: BEGIN TRANSACTION<br/>INSERT INTO training_logs (pet_id, type, stat_delta=+2)<br/>UPDATE pets SET stat_speed = stat_speed + 2<br/>COMMIT
        DB-->>API: rows affected: 2
        API-->>PetSvc: 200 OK {pet: {speed: 82}, trainingLog: {...}}
        PetSvc-->>TAC: TrainResult {newPet, log}
        TAC->>Pet: setPet(newPet)
        TAC->>TAC: setLoading(false) + show StatChangeIndicator (+2)
    else rate limit exceeded
        API-->>PetSvc: 429 Too Many Requests {retryAfter: 86400}
        PetSvc-->>TAC: throw TrainRateLimitError
        TAC->>TAC: setError("Daily training limit reached")
    end

    Note over Player,Phaser: Phase 2 — Player navigates to Arena

    Player->>TP: click "Enter Arena" link
    TP->>TP: cleanup useEffect (no Phaser scene yet)
    TP->>AP: navigate to /arena
    AP->>AP: useState mode = RACE (default)
    Player->>AP: select RACE, click "Find Match"

    Note over Player,API: Phase 3 — Long-poll matchmaking (up to 30s)

    AP->>ArenaSvc: enterArena({petId, mode: RACE, acceptAi: true})
    ArenaSvc->>API: POST /api/v1/arena/enter
    activate API
    API->>API: rate limit check rl:arena:{petId} (default 10/hr)
    API->>API: ZADD matchmaking:queue:RACE
    Note right of API: holds connection for up to 30s<br/>(arena_matchmaking_timeout_seconds = 30)
    API->>API: BLPOP wait for opponent
    alt opponent found within 30s
        API->>DB: SELECT pet stats for both pets
        DB-->>API: pet_a + pet_b stats
        API->>API: compute outcome (seeded ±15%)<br/>winner = higher effective stat
        API->>DB: BEGIN TXN<br/>INSERT arena_matches<br/>INCR rl:arena:{petId} EX 3600<br/>ZADD leaderboard:global × 2<br/>COMMIT
        DB-->>API: matchId
    else timeout (30s) — accept AI
        API->>API: synthesize AI opponent stats
        API->>API: compute outcome same as above
        API->>DB: INSERT arena_matches (is_ai_opponent=true)
        DB-->>API: matchId
    end
    API-->>ArenaSvc: 200 OK {matchId, status: READY, durationSeconds: 11, isAiOpponent}
    deactivate API

    Note over Player,Phaser: Phase 4 — Render BattleResultPage with Phaser animation

    ArenaSvc-->>AP: MatchResponse
    AP->>Pet: gameStore.setLastBattleResult(match)
    AP->>AP: navigate to /arena/result/:matchId
    AP->>Phaser: destroy current scene + switchScene("Battle", {match})

    activate Phaser
    Phaser->>Phaser: new BattleScene().preload() (load atlases)
    Phaser->>Phaser: BattleScene.create({mode: RACE, battleLog})
    Phaser->>Phaser: timeline.play() — 11 sec battle animation

    Note right of Phaser: Phase 5 — Frame-by-frame animation<br/>(60 FPS Phaser tween)

    loop every 16.67ms (60 FPS)
        Phaser->>Phaser: tween update (sprite move, scale, alpha)
        Phaser->>Phaser: render WebGL frame
    end

    Phaser->>Phaser: timeline.complete()
    Phaser->>AP: emit "animationComplete"
    Phaser->>Phaser: switchScene("Result", {winner: "PLAYER"})
    Phaser->>Phaser: ResultScene.playConfetti()
    deactivate Phaser

    AP->>Player: render BattleResultCard.WIN with stats comparison

    Note over Player,API: Phase 6 — Player shares result + returns

    Player->>AP: click "Share" button
    AP->>AP: navigator.clipboard.writeText(shareUrl)
    AP-->>Player: toast "URL copied!"

    Player->>AP: click "Back to Pet"
    AP->>Phaser: destroyCurrentScene("Result")
    AP->>AP: navigate to /pet/:petId
```

## 涵蓋的完整流程

| Phase | UI 元件 | API 呼叫 | Store 變動 | Phaser 場景 |
|-------|--------|---------|-----------|------------|
| 1 訓練 | TrainingPage / TrainingActionCard | POST /pets/:id/train | PetStore.setPet | (none) |
| 2 導航 | TrainingPage → ArenaPage | (none) | (none) | (none) |
| 3 媒合 | ArenaPage / MatchmakingStatus | POST /arena/enter (long-poll 30s) | (none) | (none) |
| 4 切場景 | ArenaPage → BattleResultPage | (none) | GameStore.setLastBattleResult | destroy idle, switch to Battle |
| 5 動畫 | BattleAnimation | (none) | (none) | BattleScene.timeline.play (11s) |
| 6 結束 | BattleResultPage / Share | (none) | (none) | switch to Result, then back to Idle |

## Async Operation Awaits

- Phase 1: `await PetSvc.train(...)` (~150ms typical) blocks UI with disabled card
- Phase 3: `await ArenaSvc.enterArena(...)` (long-poll 0~30s) blocks ArenaPage with MatchmakingStatus spinner
- Phase 5: Phaser tween timeline runs in background; React continues to be responsive

## Error Branches Covered

- Phase 1: 429 rate limit (TrainRateLimitError) → show daily-limit toast
- Phase 3 (not shown but exists): 429 arena rate-limit, 408 matchmaking timeout (acceptAi=false)
- Phase 5 (not shown): if Phaser fails to load asset → fallback to text-only result card
