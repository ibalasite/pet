---
diagram: frontend-activity-gameplay
uml-type: Activity Diagram（Frontend Main Gameplay Flow）
source: docs/FRONTEND.md §5 + docs/PRD.md §3 + docs/PDD.md §UI flows
generated: 2026-05-08T00:00:00Z
---

# Frontend Activity Diagram — Main Gameplay Flow

> 來源：docs/FRONTEND.md §5 Key UI Flows + docs/PRD.md §3 User Stories + docs/PDD.md

描述玩家進入網站後的主要遊戲循環：從進站、認領、訓練、進入競技場、看結果、回到首頁的完整路徑。

```mermaid
flowchart TD
    Start(["玩家造訪 https://pet.local/"]) --> Bootstrap

    subgraph Browser ["Browser (Chrome / Firefox / Safari)"]
        Bootstrap["bootstrap React app<br/>hydrate stores from localStorage"]
        Bootstrap --> CheckToken{"localStorage 有<br/>pet_access_token?"}
    end

    subgraph PlayerApp ["Player App (React 18 + Phaser.js)"]
        CheckToken -->|YES| LoadOwnPet["fetchOwnPet() via PetApiService<br/>GET /api/v1/pets/:petId"]
        CheckToken -->|NO| LandingFlow["render LandingPage<br/>fetchRandomPet()"]

        LandingFlow --> ShowDemo["render PetCanvas (random pet)<br/>+ ClaimCTA"]
        ShowDemo --> ClaimDecision{"玩家想<br/>認領？"}
        ClaimDecision -->|是（點擊 ClaimCTA）| ClaimFlow["navigate /claim"]
        ClaimDecision -->|否（看公開榜）| LeaderFlow["navigate /leaderboard"]

        ClaimFlow --> EmailStep["render ClaimEmailForm"]
        EmailStep --> SubmitEmail["validate + POST /api/v1/claim<br/>{email, petId}"]
        SubmitEmail --> EmailResult{"API 回應？"}
        EmailResult -->|200 + claimId| CodeStep["render ClaimCodeForm<br/>show 15-min countdown"]
        EmailResult -->|4xx invalid| EmailError(["顯示 inline error<br/>回 ClaimEmailForm"])
        EmailError --> EmailStep
        CodeStep --> SubmitCode["POST /api/v1/claim/verify<br/>{claimId, otpCode}"]
        SubmitCode --> CodeResult{"OTP 驗證？"}
        CodeResult -->|200 + token| TokenSave["localStorage.setItem<br/>('pet_access_token', token)"]
        CodeResult -->|401 wrong, attempts<5| RetryCode(["顯示錯誤次數<br/>剩 N 次"]) --> CodeStep
        CodeResult -->|429 locked| LockedToast(["toast: 已鎖定 15 分鐘"]) --> EmailStep

        TokenSave --> URLReveal["render URLReveal<br/>玩家複製 / 加入書籤"]
        URLReveal --> LoadOwnPet

        LoadOwnPet --> PetDecision{"用戶選擇<br/>哪個動作？"}
        PetDecision -->|訓練| TrainPath["navigate /pet/:id/train"]
        PetDecision -->|餵食| FeedPath["render FeedInventory + click food"]
        PetDecision -->|進場| ArenaPath["navigate /arena"]
        PetDecision -->|看記錄| RecordsPath["navigate /pet/:id/records"]
        PetDecision -->|GDPR| GdprPath["navigate /gdpr"]

        TrainPath --> TrainCheck{"daily quota >0?<br/>(training_daily_quota = 3)"}
        TrainCheck -->|YES| TrainExec["POST /api/v1/pets/:id/train"]
        TrainCheck -->|NO| TrainBlocked(["顯示 RateLimitBanner"])
        TrainExec --> TrainResult{"API 回應？"}
        TrainResult -->|200| StatUp["update PetStore<br/>show +2 stat delta"]
        TrainResult -->|429| TrainBlocked
        StatUp --> PetDecision

        ArenaPath --> ModeSelect{"選擇模式？"}
        ModeSelect -->|RACE| EnterRace["POST /api/v1/arena/enter<br/>{mode: RACE, acceptAi: true}"]
        ModeSelect -->|SUMO| EnterSumo["POST /api/v1/arena/enter<br/>{mode: SUMO}"]
        EnterRace --> WaitMatch
        EnterSumo --> WaitMatch
        WaitMatch{"30s 內媒合？"}
        WaitMatch -->|YES, opponent found| BattlePrep["navigate /arena/result/:matchId<br/>進入動畫"]
        WaitMatch -->|NO, acceptAi=true| AIBattle["AI 對戰"]
        AIBattle --> BattlePrep
        WaitMatch -->|429 rate limit| ArenaBlocked(["RateLimitBanner<br/>顯示 retryAfter"])
    end

    subgraph PhaserCanvas ["Phaser Canvas Engine"]
        BattlePrep --> BattleAnimSeq
        BattleAnimSeq{"並行播放序列"}
        BattleAnimSeq -->|fork| OpenAnim["BattleScene.playOpening<br/>~2s sprites enter"]
        BattleAnimSeq -->|fork| AudioPlay["AudioManager.play<br/>battle BGM"]
        BattleAnimSeq -->|fork| UICues["DOM HUD update<br/>(timer, stats)"]
        OpenAnim --> Resolve["compute outcome<br/>seeded ±15%"]
        AudioPlay --> Resolve
        UICues --> Resolve
        Resolve --> JoinAnim{"join: ALL ready"}
        JoinAnim --> OutcomeAnim["playOutcomeSequence<br/>~3-9s animation"]
        OutcomeAnim --> ResultScene["switchScene Result<br/>+ confetti / fade"]
    end

    subgraph PostBattle ["Post-Battle UI"]
        ResultScene --> ShowCard["render BattleResultCard<br/>WIN / LOSS variant"]
        ShowCard --> ShareDecision{"玩家分享？"}
        ShareDecision -->|是| Share["navigator.clipboard<br/>+ toast"]
        ShareDecision -->|否| BackChoice
        Share --> BackChoice
        BackChoice{"下一步？"}
        BackChoice -->|回寵物| BackToPet(["navigate /pet/:id"]) --> PetDecision
        BackChoice -->|看排行| BackLeader(["navigate /leaderboard"])
        BackChoice -->|登出| Logout(["clear token<br/>navigate /"])
    end

    LeaderFlow --> LandingFlow
    RecordsPath --> PetDecision
    FeedPath --> PetDecision
    GdprPath --> PetDecision

    Logout --> Bootstrap
    BackLeader --> LeaderFlow

    classDef ok fill:#e0ffe0,stroke:#393
    classDef err fill:#ffe0e0,stroke:#d33
    class TrainBlocked,ArenaBlocked,EmailError,RetryCode,LockedToast err
    class StatUp,TokenSave,Share ok
```

## Swimlanes

- **Browser**: 純瀏覽器層（localStorage、URL navigation）
- **Player App**: React 18 + 路由 + API 呼叫
- **Phaser Canvas**: 遊戲畫布層（動畫、音效）
- **Post-Battle UI**: 結算畫面 React 元件

## Fork/Join Parallel Operations

`BattleAnimSeq` 節點觸發 3 條並行路徑：
- **OpenAnim**：Phaser 動畫序列（visual）
- **AudioPlay**：音效播放（audio）
- **UICues**：DOM HUD 更新（HUD overlay）

三者完成後 join 進入 outcome 動畫，確保視覺、聽覺、UI 同步。

## Decision Conditions

每個決策菱形都有具體判定條件：
- `localStorage 有 pet_access_token?` — `boolean check`
- `daily quota >0?` — `training_daily_quota_remaining > 0`
- `30s 內媒合？` — `arena_matchmaking_timeout_seconds = 30` 內 BLPOP 成功
- `OTP 驗證？` — API status code (200 / 401 / 429)

## Error Recovery Paths

- Email error → 回 EmailStep
- OTP wrong → 回 CodeStep（顯示剩餘次數）
- Daily quota 0 → RateLimitBanner（玩家無法重試）
- 429 locked → 15 分鐘鎖定 toast
