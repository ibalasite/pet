# Sequence Diagram — Arena Battle Matchmaking

## Overview

The arena battle flow handles matchmaking, battle outcome computation, and leaderboard score
updates. Players enter via `POST /api/v1/arena/enter` and the server holds a long-poll (HTTP
long-polling) for up to 30 seconds (`arena_matchmaking_timeout_seconds = 30`) waiting for an
opponent. If no opponent is found and the player accepted AI (`acceptAI: true`), an AI battle is
resolved immediately. The battle outcome uses a seeded random ±15% modifier
(`arena_battle_outcome_random_modifier_percent = 15`) for deterministic replay.

Two modes are supported:
- **RACE** — primary determining stat is `stat_speed`
- **SUMO** — primary determining stat is `stat_strength`

Rate limit: 10 battles/hour per pet by default (`arena_rate_limit_battles_per_hour_default = 10`),
admin-tunable between 1 and 50 (`arena_rate_limit_admin_min = 1`, `arena_rate_limit_admin_max = 50`).

## Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant PlayerApp as Player App<br/>(React + Phaser.js)
    participant API as Game API Server<br/>(Fastify)
    participant Redis
    participant PG as PostgreSQL

    Note over Player,PG: Pre-flight Checks

    Player->>PlayerApp: Select mode (RACE / SUMO), click Enter Arena
    PlayerApp->>API: POST /api/v1/arena/enter<br/>{ petId, mode, acceptAI }
    API->>Redis: GET rl:arena:{pet_id}<br/>(rate limit: 10/hr default — arena_rate_limit_battles_per_hour_default = 10)
    alt Rate limit exceeded
        Redis-->>API: count ≥ limit
        API-->>PlayerApp: HTTP 429 Retry-After header
        PlayerApp-->>Player: "Battle limit reached. Try again later."
    else Within limit
        API->>PG: SELECT pets WHERE id = petId AND is_banned = FALSE
        alt Pet banned
            PG-->>API: is_banned = TRUE
            API-->>PlayerApp: HTTP 403 { code: "PET_BANNED" }
        else Pet allowed
            PG-->>API: pet stats + active food buffs
            Note over API: Compute effective stats:<br/>effectiveStat = baseStat + stat_delta (food buff)

            Note over Player,PG: Matchmaking Phase (30 s window)

            API->>Redis: ZADD matchmaking:queue:{mode}<br/>score=enqueue_epoch_ms<br/>member="{petId}:{epoch}"
            API->>Redis: ZRANGEBYSCORE matchmaking:queue:{mode}<br/>0 (NOW - stale_threshold_ms)<br/>to find eligible opponent<br/>(stale if age > 45 s = timeout + 15 s)
            alt Opponent found within 30 s
                Redis-->>API: opponentEntry = "{opponentPetId}:{epoch}"
                API->>Redis: ZREM matchmaking:queue:{mode} opponentEntry
                API->>Redis: ZREM matchmaking:queue:{mode} petEntry
                API->>PG: SELECT pets WHERE id = opponentPetId
                PG-->>API: opponent stats + food buffs
            else Timeout (30 s) — no human opponent
                Redis-->>API: no match
                API->>Redis: ZREM matchmaking:queue:{mode} petEntry
                alt acceptAI = true
                    API->>API: Generate AI opponent stats
                    Note over API: AI battle proceeds below
                else acceptAI = false
                    API-->>PlayerApp: HTTP 408<br/>{ code: "MATCHMAKING_TIMEOUT" }
                    Note right of API: Rate-limit counter NOT incremented on timeout
                    PlayerApp-->>Player: "No opponent found. Try AI battle?"
                end
            end

            Note over Player,PG: Battle Resolution

            API->>API: seed = crypto.randomInt()<br/>modifier_a = seed-based ±15%<br/>modifier_b = inversely derived<br/>(arena_battle_outcome_random_modifier_percent = 15)
            API->>API: Compute effectiveStatA = baseStat_a × (1 + modifier_a) + stat_delta_a<br/>Compute effectiveStatB = baseStat_b × (1 + modifier_b) + stat_delta_b<br/>winner = higher effective stat<br/>Tie-break: earlier enqueue epoch wins (challenger)
            API->>API: duration = random(5, 15) seconds<br/>(arena_match_duration_min_seconds = 5,<br/>arena_match_duration_max_seconds = 15)
            API->>API: Build battle_log JSONB event sequence

            Note over Player,PG: Persist Result & Update Score

            API->>PG: BEGIN TRANSACTION<br/>INSERT INTO arena_matches<br/>(pet_a_id, pet_b_id, is_ai_opponent, mode,<br/>winner_pet_id, random_seed, stat_delta_a,<br/>stat_delta_b, duration_seconds, battle_log)<br/>COMMIT
            PG-->>API: matchId
            API->>Redis: INCR rl:arena:{pet_id} EX 3600<br/>(record battle consumption)
            API->>Redis: ZADD leaderboard:global<br/>score=newLeaderboardScore member=petId
            Note right of Redis: Update lag ≤ 30 s<br/>(leaderboard_update_lag_max_seconds = 30)

            Note over Player,PG: Animate & Display Result

            API-->>PlayerApp: HTTP 200<br/>{ matchId, result: WIN|LOSS,<br/>opponentPetId, isAiOpponent,<br/>statDelta, newLeaderboardScore }
            PlayerApp->>PlayerApp: Launch Phaser.js BattleAnimation<br/>(5–15 s animation window)
            PlayerApp-->>Player: Show BattleResultCard (WIN / LOSS variant)
            Note right of PlayerApp: Battle records page shows last 20<br/>(arena_battle_records_display_count = 20)
        end
    end

    Note over Player,PG: Bot Detection (Background)

    Note right of Redis: Bot detection: > 50 battles in 60-min window<br/>(bot_detection_battles_threshold = 50,<br/>bot_detection_window_minutes = 60)<br/>triggers admin suspicious-activity flag
```

## Notes

- **Stale entry cleanup**: matchmaking queue entries older than ~45 seconds (timeout 30 s +
  buffer 15 s) are silently discarded by the consumer (`arena_matchmaking_timeout_seconds = 30`).
  Entry format: `"{petId}:{enqueue_epoch_ms}"`.
- **Rate limit not incremented on timeout**: If matchmaking times out without finding an opponent,
  the battle counter `rl:arena:{pet_id}` is NOT incremented, so the player does not lose a
  battle slot for a failed queue attempt.
- **AI opponent**: When `acceptAI: true` and no human is found, the AI opponent is synthesized in
  memory; no `pet_b_id` row is written — `is_ai_opponent = TRUE` and `pet_b_id = NULL` in
  `arena_matches`.
- **Leaderboard score formula**: `win_rate × battles_played × level_multiplier` (ARCH P2). The
  Redis sorted set (`leaderboard:global`) is authoritative; PostgreSQL `leaderboard_snapshots` is
  the durable backup, retaining top 500 entries (`leaderboard_snapshot_retention_top_n = 500`).
- **Banned pet leaderboard removal**: When a pet is banned, `ZREM leaderboard:global petId` is
  called within 5 minutes (`leaderboard_ban_reflection_time_minutes = 5`).
