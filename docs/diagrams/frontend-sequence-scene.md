---
diagram: frontend-sequence-scene
uml-type: Sequence Diagram（Scene Transition）
source: docs/FRONTEND.md §2.5 Routing + §2.3 Phaser Integration
generated: 2026-05-08T00:00:00Z
---

# Frontend Sequence — Scene Transition (PetPage → ArenaPage → BattleResultPage)

> 來源：docs/FRONTEND.md §2.5 React Router v6 + §2.3 Phaser Integration

描述玩家從 PetPage 進入 ArenaPage 觸發 matchmaking、再導入 BattleResultPage 看動畫的場景切換流程，
包含資源預加載、loading 進度、舊場景解構、新場景初始化。

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant Router as React Router v6
    participant SceneMgr as SceneManager
    participant TokenGuard as TokenAuthGuard
    participant ResLoader as ResourceLoader
    participant PhaserEng as PetCanvasEngine
    participant Server as Game API Server

    Note over Player,Server: Phase 1 — Player on PetPage, decides to enter Arena

    Player->>Router: click "Enter Arena" link
    Router->>SceneMgr: navigate("/arena")

    Note over SceneMgr,TokenGuard: Phase 2 — Route guard check

    SceneMgr->>TokenGuard: canActivate(to=ArenaScene, from=PetScene)
    TokenGuard->>TokenGuard: tokenStore.getToken()
    alt token valid
        TokenGuard-->>SceneMgr: true
    else no token
        TokenGuard-->>SceneMgr: false
        SceneMgr->>Router: redirect to "/claim"
        Note right of SceneMgr: early return — re-flow on /claim path
    end

    Note over SceneMgr,PhaserEng: Phase 3 — Tear down PetPage Phaser scene

    SceneMgr->>PhaserEng: destroyCurrentScene("IdlePet")
    activate PhaserEng
    PhaserEng->>PhaserEng: scene.shutdown()
    PhaserEng->>PhaserEng: release WebGL textures
    PhaserEng-->>SceneMgr: destroyed
    deactivate PhaserEng

    Note over SceneMgr,Server: Phase 4 — Preload arena assets (parallel async)

    par
        SceneMgr->>ResLoader: preload(["arena-bg.atlas", "race-track.png", "ui-modal.png"])
        ResLoader-->>SceneMgr: progress 33%
    and
        SceneMgr->>Server: GET /api/v1/leaderboard?limit=10 (warm-cache pre-fetch)
        Server-->>SceneMgr: 200 OK {top10}
    end
    Note over ResLoader: Loading bar visible 0-100%
    ResLoader-->>SceneMgr: progress 100% (all assets loaded)

    Note over Player,SceneMgr: Phase 5 — Mount ArenaPage component

    SceneMgr->>Router: render ArenaPage
    Router-->>Player: ArenaPage mounted (ModeSelector visible)
    Player->>Router: select "RACE" + click "Find Match"

    Note over Player,Server: Phase 6 — Enter arena (long poll)

    Router->>Server: POST /api/v1/arena/enter {petId, mode: RACE, acceptAi: true}
    activate Server
    Note right of Server: server holds connection<br/>up to 30s for matchmaking
    Server-->>Router: 200 OK {matchId, status: READY, opponentPetId, durationSeconds: 11}
    deactivate Server

    Note over SceneMgr,PhaserEng: Phase 7 — Transition to BattleResultPage

    Router->>SceneMgr: navigate("/arena/result/" + matchId)
    SceneMgr->>SceneMgr: setLastBattleResult in GameStore
    SceneMgr->>PhaserEng: destroyCurrentScene("Idle")
    PhaserEng-->>SceneMgr: destroyed

    SceneMgr->>ResLoader: preload(["battle-fx.atlas", "winner-confetti.png"])
    ResLoader-->>SceneMgr: progress 100%

    SceneMgr->>PhaserEng: switchScene("Battle", {matchId, mode: RACE, battleLog})
    activate PhaserEng
    PhaserEng->>PhaserEng: new BattleScene(...).preload() / create()
    PhaserEng->>PhaserEng: scene.playOpeningSequence()
    Note over PhaserEng: 11s battle animation timeline
    PhaserEng->>PhaserEng: scene.playOutcomeSequence()
    PhaserEng->>SceneMgr: onAnimationComplete()
    deactivate PhaserEng

    SceneMgr->>PhaserEng: switchScene("Result", {winner: "PLAYER"})
    PhaserEng->>PhaserEng: new ResultScene().playConfetti()
    SceneMgr-->>Player: BattleResultCard.WIN visible

    Note over Player,Server: Phase 8 — Player taps "Back to Pet"

    Player->>Router: click "Back to Pet" → navigate("/pet/:petId")
    Router->>SceneMgr: cleanup BattleResultPage
    SceneMgr->>PhaserEng: destroyCurrentScene("Result")
    PhaserEng-->>SceneMgr: destroyed
    SceneMgr->>PhaserEng: switchScene("IdlePet", {pet})
    PhaserEng-->>Player: PetPage IdlePet scene rendered
```

## Async / Await Operation Markers

| Operation | Timing | Notes |
|-----------|--------|-------|
| Resource preload | Phase 4 (parallel with API call) | Loading bar progress 0-100%, blocks render until complete |
| Long-poll matchmaking | Phase 6 | Server holds for up to 30s; client `AbortController` 35s timeout |
| Battle animation | Phase 7 (11s timeline) | Phaser tweens; cannot be interrupted by route change |
| Confetti animation | Phase 7 end | Non-blocking; can be skipped by user click |

## Notes

- **No WebSocket reconnect needed**：HTTP-only protocol（API.md §5.3）；切場景時主動 abort 任何 inflight long-poll。
- **GameStore 暫存**：BattleResultPage 從 `GameStore.lastBattleResult` 讀資料，避免重打 API。
- **Phaser scene lifecycle**：每次 `switchScene` 必須先 `destroyCurrentScene` 釋放 GPU 資源，否則會有 memory leak。
- **Loader 並行**：API call 與 asset preload 並行，取最慢者結束時間；典型總耗時 < 1s（asset 通常已 cached）。
