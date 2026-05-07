---
diagram: frontend-object-snapshot
uml-type: Object Diagram（Frontend Runtime Snapshot）
source: docs/FRONTEND.md §2.4 State Management + docs/VDD.md §畫面規格
generated: 2026-05-08T00:00:00Z
---

# Frontend Object Diagram — Runtime Snapshot

> 來源：docs/FRONTEND.md §2.4 State Management + docs/VDD.md §UI States

描述「玩家剛贏完一場 RACE 對戰，正在 BattleResultPage 上看勝利畫面」的執行時刻物件快照。

```mermaid
classDiagram
    direction TB

    %% ============================================================
    %% Stores（runtime snapshot）
    %% ============================================================
    class tokenStoreInstance {
        <<instance>>
        accessToken = "abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx"
        petId = "a3f8c1d2-4b5e-6f7a-8c9d-0e1f2a3b4c5d"
        isValid = true
        persistedAt = "2026-05-08T13:50:23.456Z"
    }

    class petStoreInstance {
        <<instance>>
        pet = petInstance_a3f8
        lastFetchedAt = "2026-05-08T13:55:42.123Z"
        isStale_60s = false
    }

    class gameStoreInstance {
        <<instance>>
        arenaMode = "RACE"
        lastBattleResult = arenaMatchInstance_match001
        leaderboardCache_size = 100
    }

    class uiStoreInstance {
        <<instance>>
        theme = "dark"
        reducedMotion = false
        toastQueue = ["You won!"]
    }

    %% ============================================================
    %% Domain instances
    %% ============================================================
    class petInstance_a3f8 {
        <<instance>>
        id = "a3f8c1d2-4b5e-6f7a-8c9d-0e1f2a3b4c5d"
        seed = 9223372036854775000
        rarity = "EPIC"
        petName = "Astro"
        stats = petStatsInstance_a3f8
        level = 18
        isBanned = false
        createdAt = "2026-04-30T08:12:34.000Z"
    }

    class petStatsInstance_a3f8 {
        <<instance>>
        speed = 84
        strength = 45
        stamina = 62
    }

    class arenaMatchInstance_match001 {
        <<instance>>
        matchId = "b4c9d2e3-5f6a-7b8c-9d0e-1f2a3b4c5d6e"
        mode = "RACE"
        winnerPetId = "a3f8c1d2-4b5e-6f7a-8c9d-0e1f2a3b4c5d"
        durationSeconds = 11
        battleLog = battleLogInstance_match001
        completedAt = "2026-05-08T13:55:38.812Z"
    }

    class battleLogInstance_match001 {
        <<instance>>
        modeApplied = "RACE"
        effectiveStatA = 92
        effectiveStatB = 78
        randomModifierPercent = 9
        tieBreakerRule = "earlier_enqueue_epoch"
    }

    %% ============================================================
    %% UI / Engine instances
    %% ============================================================
    class battleResultPageInstance {
        <<instance>>
        pageType = "BattleResultPage"
        path = "/arena/result/b4c9d2e3-5f6a-7b8c-9d0e-1f2a3b4c5d6e"
        mountedAt = "2026-05-08T13:55:39.025Z"
        children_count = 4
    }

    class battleResultCardInstance {
        <<instance>>
        variant = "WIN"
        match = arenaMatchInstance_match001
        confettiPlaying = true
    }

    class battleAnimationInstance {
        <<instance>>
        engine = phaserEngineInstance
        animationState = "ENDED"
        totalElapsedMs = 11023
    }

    class phaserEngineInstance {
        <<instance>>
        gameKey = "pet-game"
        currentSceneKey = "Result"
        rendererType = "WebGL"
        canvasSize = "640x360"
        fps = 60
    }

    %% ============================================================
    %% Network / API client
    %% ============================================================
    class apiClientInstance {
        <<instance>>
        baseUrl = "https://api.pet.local"
        retriesEnabled = true
        lastRequestPath = "/api/v1/arena/match/b4c9d2e3..."
        lastResponseStatus = 200
        avgLatencyMs = 124
    }

    %% ============================================================
    %% Relationships at this snapshot
    %% ============================================================
    tokenStoreInstance --> petInstance_a3f8 : authorizes pet
    petStoreInstance --> petInstance_a3f8 : holds reference
    petInstance_a3f8 --> petStatsInstance_a3f8 : stats
    gameStoreInstance --> arenaMatchInstance_match001 : lastBattleResult
    arenaMatchInstance_match001 --> battleLogInstance_match001 : battleLog
    battleResultPageInstance --> battleResultCardInstance : renders
    battleResultPageInstance --> battleAnimationInstance : renders
    battleResultCardInstance --> arenaMatchInstance_match001 : displays
    battleAnimationInstance --> phaserEngineInstance : drives
    apiClientInstance --> tokenStoreInstance : reads access token
```

## Snapshot 描述

**時間點**：2026-05-08 13:55:42 UTC（剛打完一場勝利對戰約 4 秒後）

**玩家狀態**：已認領寵物 `Astro`（EPIC 稀有度，level 18），剛在 RACE 模式以 speed 84 (effective 92, 加上 +9% 隨機加成) 擊敗對手（speed 78 → 78）。

**Phaser Engine**：當前 scene `Result`，正在播放彩帶動畫，FPS 穩定 60。

**Network**：API client 最近一次呼叫 `GET /api/v1/arena/match/...` 回傳 200，延遲 124 ms。

**Stores 狀態**：
- TokenStore 已存有 32-byte access token，與 localStorage 已同步
- PetStore 有 60s 內的 fresh Pet 資料（不需 refetch）
- GameStore 暫存了剛打完的 match 物件（讓 BattleResultPage 不用重打 API）
- UiStore 顯示 1 則 toast「You won!」，使用者偏好深色 + 無 reduced-motion

## Notes

- 所有 UUID 為 v4 真實格式範例（非佔位符）
- DateTime 為 ISO 8601 含毫秒
- Phaser 引擎 canvas 尺寸 640x360 對應 VDD §畫面規格的標準解析度
- Score 顯示用 effectiveStatA / effectiveStatB 作為「對手強度差」視覺化
