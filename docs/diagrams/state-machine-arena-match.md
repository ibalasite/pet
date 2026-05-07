---
diagram: state-machine-arena-match
uml-type: State Machine Diagram（ArenaMatch Entity Lifecycle）
source: docs/EDD.md §3.8 Battle Match State Machine + §4.4 ArenaMatch
generated: 2026-05-08T00:00:00Z
---

# State Machine — Arena Match

> 來源：docs/EDD.md §3.8 Battle Match State Machine + §4.4 ArenaMatch entity

## Overview

An arena match progresses through a well-defined lifecycle: from queue entry through matchmaking,
battle resolution, result persistence, and leaderboard update. This state machine covers both
human-vs-human (PvP) and human-vs-AI (PvE) paths.

Key timing constants:
- Matchmaking timeout: 30 seconds (`arena_matchmaking_timeout_seconds = 30`)
- Battle animation window: 5–15 seconds (`arena_match_duration_min_seconds = 5`,
  `arena_match_duration_max_seconds = 15`)
- Rate limit: 10 battles/hour default (`arena_rate_limit_battles_per_hour_default = 10`)
- Leaderboard update lag: ≤ 30 seconds (`leaderboard_update_lag_max_seconds = 30`)

## Diagram

```mermaid
stateDiagram-v2
    [*] --> RateLimitCheck : POST /api/v1/arena/enter\n{ petId, mode, acceptAI }

    RateLimitCheck --> RateLimitExceeded : rl:arena:{pet_id} ≥ limit\n(default 10/hr — arena_rate_limit_battles_per_hour_default = 10)
    RateLimitExceeded --> [*] : HTTP 429 Retry-After

    RateLimitCheck --> BanCheck : counter < limit

    BanCheck --> BannedRejected : pets.is_banned = TRUE
    BannedRejected --> [*] : HTTP 403 PET_BANNED

    BanCheck --> Queued : pet allowed\nZADD matchmaking:queue:{mode}\nscore = enqueue_epoch_ms\nmember = "{petId}:{epoch}"

    Queued --> MatchFound : Opponent entry found in\nmatchmaking:queue:{mode}\nwithin 30 s window\n(arena_matchmaking_timeout_seconds = 30)

    Queued --> Timeout : No opponent found\nwithin 30 s\n(arena_matchmaking_timeout_seconds = 30)

    Timeout --> AIBattle : acceptAI = true\nAI opponent generated in memory

    Timeout --> MatchmakingFailed : acceptAI = false\nZREM queue entry\nRate-limit counter NOT incremented
    MatchmakingFailed --> [*] : HTTP 408\n{ code: "MATCHMAKING_TIMEOUT" }

    MatchFound --> BattleComputing : ZREM both queue entries\nLoad opponent stats from PG\nCompute effective stats with\nfood buff delta

    AIBattle --> BattleComputing : AI stats synthesized

    BattleComputing --> BattleResolved : Apply ±15% seeded modifier\n(arena_battle_outcome_random_modifier_percent = 15)\nCompute winner\nTie-break: earlier enqueue epoch\nGenerate battle_log JSONB\nDuration = random[5,15] s

    BattleResolved --> Persisted : BEGIN TRANSACTION\nINSERT INTO arena_matches\n  (pet_a_id, pet_b_id, is_ai_opponent,\n   mode, winner_pet_id, random_seed,\n   stat_delta_a, stat_delta_b,\n   duration_seconds, battle_log)\nCOMMIT\nINCR rl:arena:{pet_id} EX 3600\n(TTL = 3600 s — arena_rate_limit_counter_window_hours = 1)

    Persisted --> LeaderboardUpdated : PvP: MULTI ZADD leaderboard:global winnerPetId\n+ ZADD leaderboard:global loserPetId EXEC\n(both ZADDs in MULTI/EXEC pipeline for atomicity)\nAI match: single ZADD for player's pet only\n(lag ≤ 30 s — leaderboard_update_lag_max_seconds = 30)

    LeaderboardUpdated --> AnimationPlaying : HTTP 200 response sent\n{ matchId, result, opponentPetId,\n  isAiOpponent, statDelta,\n  newLeaderboardScore }\nPhaser.js BattleAnimation starts

    AnimationPlaying --> Completed : Animation ends\n(5–15 s window)\nBattleResultCard displayed

    Completed --> [*] : Match lifecycle complete\nHistory queryable via\nGET /api/v1/arena/history/:petId\n(last 20 — arena_battle_records_display_count = 20)

    state BattleComputing {
        [*] --> LoadStats
        LoadStats --> ApplyFoodBuff : effectiveStat = baseStat + stat_delta
        ApplyFoodBuff --> ApplyRandomModifier : seed = crypto.randomInt()\nmodifier = ±15% of effectiveStat
        ApplyRandomModifier --> DetermineWinner : higher effective stat wins\nRACE → stat_speed\nSUMO → stat_strength
        DetermineWinner --> [*]
    }

    note right of Queued
        Stale entries (age > 45 s) are
        discarded silently by consumer
        (timeout 30 s + buffer 15 s)
    end note

    note right of Persisted
        arena_matches row is
        append-only after insert
        (except is_flagged by admin)
    end note
```

## Match States Reference

| State | Description | Redis Keys Active |
|---|---|---|
| Queued | Pet waiting for opponent | `matchmaking:queue:{mode}` entry present |
| MatchFound | Opponent paired; both entries dequeued | — |
| Timeout | No opponent within 30 s (`arena_matchmaking_timeout_seconds = 30`) | — |
| AIBattle | AI opponent path | — |
| BattleComputing | Outcome calculation in memory | — |
| BattleResolved | Winner determined, log built | — |
| Persisted | `arena_matches` row inserted; rate counter incremented | `rl:arena:{pet_id}` incremented |
| LeaderboardUpdated | PvP: both winner and loser Redis sorted set entries updated via MULTI/EXEC; AI: player's pet only | `leaderboard:global` updated (1 or 2 entries) |
| AnimationPlaying | Client animating battle | — |
| Completed | Result shown; history updated | — |

## Notes

- **Random seed reproducibility**: `random_seed` in `arena_matches` is the seed used for the
  ±15% modifier, enabling deterministic replay of any battle via `GET /api/v1/arena/match/:matchId`.
  The `battle_log` JSONB field provides the structured event sequence for the client-side
  Phaser.js replay.
- **Admin flag/unflag**: After a match is in `Completed` state, admin moderators can set
  `is_flagged = TRUE` via `POST /admin/api/battles/:matchId/flag`. This is the only allowed
  mutation to a completed match row. The `flagged_at` timestamp is written atomically with
  `is_flagged`.
- **Bot detection**: A background monitor checks for > 50 battles in a 60-minute rolling window
  (`bot_detection_battles_threshold = 50`, `bot_detection_window_minutes = 60`). Triggered pets
  appear in the admin suspicious-activity view (distinct from `leaderboard_admin_suspicious_flag_battles_per_hour = 50`).
- **AI opponent persistence**: When `is_ai_opponent = TRUE`, `pet_b_id = NULL` in the match row
  and `winner_pet_id` is NULL if the AI wins (the player's pet lost). For human-vs-human,
  `winner_pet_id` is always non-null (tie-break prevents draws).
