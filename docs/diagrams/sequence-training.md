# Sequence Diagram — Pet Training

## Overview

Training is the core progression loop: a pet owner spends up to 3 daily actions
(`training_actions_per_day = 3`, reset at UTC 00:00) to improve one of three stats. Each action
raises the targeted stat by a uniformly random 1–3 points (`training_stat_points_min = 1`,
`training_stat_points_max = 3`) and increments `total_training_actions`, which feeds the level
formula: `level = MAX(1, FLOOR(total_training_actions / 10))` capped at 100
(`pet_level_formula_divisor = 10`, `pet_level_max = 100`).

Three training types map to three stats:
- **RUN** → `stat_speed`
- **STRENGTH** → `stat_strength`
- **STAMINA** → `stat_stamina`

A pet that has not been trained for more than 3 days enters a visual "neglect" state
(`training_neglect_threshold_days = 3`), shown via the `NeglectedState` component.

## Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    participant PlayerApp as Player App<br/>(React + Phaser.js)
    participant API as Game API Server<br/>(Fastify)
    participant PG as PostgreSQL

    Note over Owner,PG: Page Load — Training Page (/pet/:petId/train)

    Owner->>PlayerApp: Navigate to /pet/:petId/train
    PlayerApp->>API: GET /api/v1/pets/:petId<br/>Authorization: Bearer petToken
    API->>PG: SELECT pets WHERE id = petId
    PG-->>API: pet row (stats, level, last_trained_at, is_banned)
    API->>API: isNeglected = (last_trained_at IS NULL OR<br/>NOW() - last_trained_at > 3 days)<br/>(training_neglect_threshold_days = 3)
    API-->>PlayerApp: { stats, level, isOwner: true, isNeglected }
    PlayerApp->>API: GET /api/v1/pets/:petId/training-status<br/>(today's remaining actions)
    API->>PG: SELECT COUNT(*) FROM training_logs<br/>WHERE pet_id = petId<br/>AND completed_at >= UTC_DATE
    PG-->>API: actionsUsedToday (0–3)
    API-->>PlayerApp: { actionsRemainingToday: 3 - used }
    PlayerApp->>Owner: Render TrainingActions (3 cards)<br/>DailyResetTimer showing next UTC 00:00<br/>NeglectedState if isNeglected

    Note over Owner,PG: Training Action (POST /api/v1/pets/:petId/train)

    Owner->>PlayerApp: Click TrainingActionCard (RUN / STRENGTH / STAMINA)
    PlayerApp->>API: POST /api/v1/pets/:petId/train<br/>Authorization: Bearer petToken<br/>{ trainingType: "RUN" | "STRENGTH" | "STAMINA" }

    Note over API: Auth middleware: SHA-256(petToken) == owner_token_hash

    alt Token invalid or wrong pet
        API-->>PlayerApp: HTTP 401 UNAUTHORIZED or HTTP 403 NOT_OWNER
    else Token valid
        API->>PG: SELECT COUNT(*) FROM training_logs<br/>WHERE pet_id = petId<br/>AND completed_at >= UTC_DATE
        alt 3 actions already used today
            PG-->>API: count = 3
            API-->>PlayerApp: HTTP 400<br/>{ code: "TRAINING_LIMIT_REACHED",<br/>message: "3 actions used today." }
            PlayerApp-->>Owner: Grey out cards, show DailyResetTimer
        else Actions remaining
            PG-->>API: count < 3
            API->>PG: SELECT stat_speed, stat_strength, stat_stamina,<br/>level, total_training_actions FROM pets WHERE id = petId
            PG-->>API: current stat values
            API->>API: targetStat = stat_speed | stat_strength | stat_stamina<br/>based on trainingType
            alt Target stat already at maximum (100)
                API-->>PlayerApp: HTTP 400 { code: "STAT_AT_MAXIMUM" }<br/>(pet_stat_max = 100)
            else Stat below max
                API->>API: statDelta = random integer in [1, 3]<br/>(training_stat_points_min = 1,<br/>training_stat_points_max = 3)<br/>newStat = MIN(100, currentStat + statDelta)<br/>newTotalActions = total_training_actions + 1<br/>newLevel = MAX(1, FLOOR(newTotalActions / 10))<br/>  capped at 100
                API->>PG: BEGIN TRANSACTION<br/>INSERT INTO training_logs<br/>(pet_id, training_type, stat_delta, stat_after)<br/>UPDATE pets SET<br/>  stat_{type} = newStat,<br/>  level = newLevel,<br/>  total_training_actions = newTotalActions,<br/>  last_trained_at = NOW(),<br/>  updated_at = NOW()<br/>COMMIT
                PG-->>API: success
                API-->>PlayerApp: HTTP 200<br/>{ updatedStats: {speed, strength, stamina, level},<br/>  statDelta, actionsRemainingToday }
                PlayerApp->>PlayerApp: Show StatChangeIndicator (+N points)<br/>visible for 2 s<br/>(training_stat_display_duration_seconds = 2)
                PlayerApp->>PlayerApp: Update StatBar animations
                PlayerApp-->>Owner: Updated stats + remaining actions count
            end
        end
    end

    Note over Owner,PG: Neglect State Check (passive, on every page load)

    Note right of API: If last_trained_at IS NULL OR<br/>NOW() - last_trained_at > 3 days<br/>(training_neglect_threshold_days = 3)<br/>→ isNeglected = true<br/>→ PlayerApp renders NeglectedState overlay
```

## Notes

- **Daily action reset**: The 3-action quota is computed by counting `training_logs` rows for
  the current UTC calendar day (`completed_at >= CURRENT_DATE AT TIME ZONE 'UTC'`). The reset
  therefore occurs at UTC 00:00 — not rolling 24 hours from the last action.
- **Level derivation**: `level = MAX(pet_level_default, FLOOR(total_training_actions / pet_level_formula_divisor))`
  where `pet_level_default = 1` and `pet_level_formula_divisor = 10`. At 0 training actions
  the formula yields 0, so the lower bound clamps it to 1. The column is denormalized on `pets`
  for query efficiency and updated atomically inside the same training transaction.
- **Stat ceiling**: If `currentStat + statDelta` would exceed 100 (`pet_stat_max = 100`) the
  value is clamped to 100 and the endpoint returns HTTP 400 `STAT_AT_MAXIMUM` to signal to the
  UI that this stat type is maxed out.
- **Neglect visual**: The `NeglectedState` component appears on the PetPage and TrainingPage
  when `isNeglected = true`. It does not block training — a neglected pet can still train.
- **Food buff interaction**: Active `food_buffs` rows contribute `stat_delta` only during arena
  matches (applied to `arena_matches.stat_delta_a / stat_delta_b`). They do not modify training
  stat gains.
