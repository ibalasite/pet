---
diagram: sequence-arena-battle
uml-type: 順序圖 — Arena Battle
source: docs/EDD.md §4.5.4
generated: 2026-05-10T00:50:00Z
---

# Sequence Diagram — Arena Battle

Player 進入 RACE/SUMO 競技場：API 透過 Redis ZADD 排隊，最多 30 秒內配對到對手；若 acceptAI=true 且超時則由 AI 對手結算；勝負與排行榜分數同步寫入 PG 與 Redis。

```mermaid
sequenceDiagram
    participant P as Player
    participant API as API Server
    participant R as Redis
    participant DB as PostgreSQL

    P->>API: POST /api/v1/arena/enter {petId, mode, acceptAI}
    API->>R: INCR rl:arena:{pet_id} (TTL 3600)
    alt rate limit > 10
        API-->>P: HTTP 429 Retry-After
    else
        API->>R: ZADD matchmaking:queue:{mode} score=enqueue_epoch member="{petId}:{epoch_ms}"
        loop poll up to 30s
            API->>R: ZRANGEBYSCORE oldest opponent (excluding self)
            alt opponent found
                API->>R: ZREM both pets
                API->>DB: SELECT both pet stats
                API->>API: BattleCalculator.calculate(stats, mode, seed)
                API->>DB: INSERT arena_matches; UPDATE leaderboard score
                API->>R: ZADD leaderboard:global score=newScore member=petId
                API-->>P: HTTP 200 {matchId, result, opponentPetId}
            else timeout 30s and acceptAI=true
                API->>API: AI opponent battle calculation
                API->>DB: INSERT arena_matches (is_ai_opponent=TRUE)
                API-->>P: HTTP 200 {matchId, result, isAiOpponent: true}
            else timeout 30s and acceptAI=false
                API-->>P: HTTP 408 MATCHMAKING_TIMEOUT
            end
        end
    end
```

> Matchmaking 使用 Redis Sorted Set 確保「最早進入者優先配對」；BattleCalculator 為純函式，可基於 seed 重現結果以利反作弊比對。
