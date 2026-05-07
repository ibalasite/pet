---
diagram: frontend-state-scene
uml-type: State Machine Diagram（Frontend Scene）
source: docs/FRONTEND.md §2.5 Routing + §5 Key UI Flows
generated: 2026-05-08T00:00:00Z
---

# Frontend State Machine — Scene Lifecycle

> 來源：docs/FRONTEND.md §2.5 React Router v6 + §5 Key UI Flows

描述 Player App 客戶端的「scene 狀態機」：從首頁到認領、養成、競技、結算、登出 / 錯誤恢復的完整生命週期。

```mermaid
stateDiagram-v2
    [*] --> LOADING : initial bootstrap [always] / hydrate stores from localStorage

    LOADING --> LANDING : assets loaded [no token] / render LandingPage
    LOADING --> PET_PAGE : assets loaded [token valid] / fetch own pet

    state LANDING {
        [*] --> IDLE_PET_DEMO
        IDLE_PET_DEMO --> SOCIAL_PROOF
        SOCIAL_PROOF --> CTA_VISIBLE
    }

    LANDING --> CLAIM : click ClaimCTA [always] / navigate /claim
    LANDING --> LEADERBOARD : click NavBar [always] / navigate /leaderboard
    LANDING --> ERROR_OFFLINE : network drop [navigator.onLine=false] / show OfflineBanner

    state CLAIM {
        [*] --> EMAIL_INPUT
        EMAIL_INPUT --> CODE_INPUT : submit valid email [API 200] / store claimId
        EMAIL_INPUT --> EMAIL_INPUT : invalid email [validation fail] / show inline error
        CODE_INPUT --> URL_REVEAL : submit valid OTP [API 200] / save pet_access_token
        CODE_INPUT --> EMAIL_INPUT : OTP expired [API 410] / restart flow
        CODE_INPUT --> CODE_INPUT : OTP wrong [API 401, attempts<5] / show counter
        CODE_INPUT --> CLAIM_LOCKED : 5 wrong attempts [attempts=5] / temporary lockout
        URL_REVEAL --> [*]
    }

    CLAIM --> PET_PAGE : URL_REVEAL complete [token saved] / navigate /pet/:id

    state PET_PAGE {
        [*] --> NORMAL
        NORMAL --> NEGLECTED : 3+ days idle [days_since_train >= 3] / render NeglectedState overlay
        NEGLECTED --> NORMAL : train action triggered [valid] / clear overlay
    }

    PET_PAGE --> TRAINING : click "Train" [token valid] / navigate /pet/:id/train
    PET_PAGE --> ARENA : click "Enter Arena" [token valid] / navigate /arena
    PET_PAGE --> RECORDS : click "Battle Records" [always] / navigate /pet/:id/records
    PET_PAGE --> GDPR : click GDPR link [token valid] / navigate /gdpr

    state TRAINING {
        [*] --> READY
        READY --> EXECUTING : click action [daily quota >0] / disable card + show spinner
        EXECUTING --> READY : API 200 [ok] / show stat delta
        EXECUTING --> RATE_LIMITED : API 429 [over daily limit] / disable all cards
        RATE_LIMITED --> READY : daily reset [now > resetAt] / re-enable cards
    }

    TRAINING --> PET_PAGE : back navigation [always] / cleanup state

    state ARENA {
        [*] --> MODE_SELECT
        MODE_SELECT --> MATCHMAKING : click "Find Match" [valid mode] / open long-poll
        MATCHMAKING --> READY_TO_BATTLE : opponent found [API status=READY] / store matchId
        MATCHMAKING --> AI_OFFER_MODAL : 30s timeout [no opponent] / show AcceptAI modal
        AI_OFFER_MODAL --> READY_TO_BATTLE : accept AI [user click yes] / set acceptAi=true
        AI_OFFER_MODAL --> MODE_SELECT : decline AI [user click no] / cancel match
        MATCHMAKING --> RATE_LIMITED : 429 received [over hourly limit] / show RateLimitBanner
        RATE_LIMITED --> MODE_SELECT : hourly reset [now > resetAt] / re-enable
    }

    ARENA --> BATTLE_RESULT : READY_TO_BATTLE [matchId set] / navigate /arena/result/:id

    state BATTLE_RESULT {
        [*] --> ANIM_PLAYING
        ANIM_PLAYING --> RESULT_DISPLAYED : timeline complete [duration>=5s] / show BattleResultCard
        RESULT_DISPLAYED --> SHARED : click Share [clipboard ok] / show toast
    }

    BATTLE_RESULT --> PET_PAGE : click "Back" [always] / navigate /pet/:id

    state ERROR_OFFLINE {
        [*] --> RETRY_PROMPT
        RETRY_PROMPT --> RECONNECTING : auto every 30s [navigator.onLine=true detected] / re-attempt
        RECONNECTING --> RETRY_PROMPT : still offline [API timeout] / continue retry
    }

    ERROR_OFFLINE --> LANDING : online again [navigator.onLine=true] / hydrate state

    PET_PAGE --> [*] : token cleared (logout) [tokenStore.clear()] / redirect /
    TRAINING --> [*] : token cleared
    ARENA --> [*] : token cleared

    note right of CLAIM
        Claim flow has max 5 OTP retries
        per claim_otp_max_attempts = 5
        Lockout duration: 15 min
    end note

    note right of MATCHMAKING
        Long-poll holds connection 30s
        AbortController timeout 35s
        On 5xx error: backoff retry × 3
    end note

    note right of BATTLE_RESULT
        Phaser BattleScene timeline
        5-15s based on durationSeconds
        Cannot be skipped (animation
        must play to completion)
    end note
```

## State 對應 UI Surfaces

| State | UI Surface | Phaser Scene |
|-------|-----------|--------------|
| LOADING | App.tsx initial spinner | (none) |
| LANDING | LandingPage | IdlePet (demo random pet) |
| CLAIM | ClaimPage 3-step compound | (none — no Phaser on claim) |
| PET_PAGE | PetPage | IdlePet (own pet) |
| TRAINING | TrainingPage | (light Phaser animation) |
| ARENA | ArenaPage | (none — pre-battle) |
| BATTLE_RESULT | BattleResultPage | Battle → Result |
| ERROR_OFFLINE | OfflineBanner overlay | (frozen current scene) |

## Transition Triggers / Guards

每個 transition 包含 `trigger [guard] / action`：

- `trigger`：使用者操作或系統事件（click, navigate, timeout, networkStatus）
- `[guard]`：判定條件（token valid?, daily quota?, mode valid?, online?）
- `action`：副作用（store update, navigate, show toast, fire animation）

## Notes

- 所有 state 在 token 失效時都可轉至 `[*]`（logout 終態）
- ERROR_OFFLINE 是橫切 state，從任何 state 進入並回到原 state
- Phaser scene 生命週期由 `PetCanvasEngine.switchScene` 自動管理，不在 React state 中追蹤
