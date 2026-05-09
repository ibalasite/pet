---
diagram: activity-arena-battle
uml-type: 活動圖 — Arena Battle
source: docs/EDD.md §4.5.7
generated: 2026-05-10T00:50:00Z
---

# Activity Diagram — Arena Battle

進入競技場活動：選擇模式 → rate limit → ZADD 排隊 → 30 秒內配對（真人 / AI / timeout 三分支）→ 寫入 arena_match 與 leaderboard → 客戶端動畫展示 → 顯示結果。

```mermaid
flowchart TB
    Start([Owner on arena page]) --> Mode[Select mode RACE/SUMO]
    Mode --> Rate{Rate limit ≤ 10/hr?}
    Rate -->|No| Err429[HTTP 429 Retry-After]
    Rate -->|Yes| Enqueue[ZADD matchmaking:queue]
    Enqueue --> Poll{Opponent found?}
    Poll -->|&lt; 30s yes| Calc[BattleCalculator]
    Poll -->|30s timeout AI accepted| AI[AI opponent calc]
    Poll -->|30s timeout no AI| Err408[HTTP 408]
    Calc --> Persist[INSERT arena_match]
    AI --> Persist
    Persist --> ZADD[ZADD leaderboard:global]
    ZADD --> Animate[Play 5-15s animation client-side]
    Animate --> Result[Show win/loss + share button]
    Result --> End([User can share or rebattle])
```

> 動畫時長 5–15 秒於 client side 模擬，後端 BattleCalculator 即時結算（< 100ms），不阻塞 UI。
