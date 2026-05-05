---
diagram: object-snapshot
uml-type: Object Diagram
source: EDD §4.1–§4.4, PRD §4, SCHEMA.md
generated: 2026-05-05T00:00:00Z
---

# Object Diagram — pixel-pet-arena

> 來源：EDD §4.1 Pet, §4.2 User, §4.3 ClaimCode, §4.4 ArenaMatch

## Snapshot 1 — Claimed Pet (IDLE state, Level 7)

```mermaid
classDiagram
    direction LR

    class pet_claimed_p001 {
        <<instance>>
        id = "a3f8c1d2-4b5e-6f7a-8c9d-0e1f2a3b4c5d"
        seed = 8872341209
        rarity = LEGENDARY
        stat_speed = 72
        stat_strength = 65
        stat_stamina = 58
        level = 7
        total_training_actions = 73
        owner_token_hash = "sha256:e8d4f2a1..."
        is_banned = false
        last_trained_at = "2026-05-04T18:30:00Z"
        reserved_until = null
        created_at = "2026-04-28T09:12:00Z"
    }

    class identity_maya_001 {
        <<instance>>
        id = "b2c9d1e3-5f6a-7b8c-9d0e-1f2a3b4c5d6e"
        email_hash = "sha256:3d7f9a2b..."
        email_encrypted = "AES256GCM:9f8e7d..."
        deletion_requested_at = null
        created_at = "2026-04-28T09:15:00Z"
    }

    class training_log_t001 {
        <<instance>>
        id = "c3d4e5f6-6a7b-8c9d-0e1f-2a3b4c5d6e7f"
        pet_id = "a3f8c1d2-..."
        training_type = SPEED
        stat_delta = 3
        trained_at = "2026-05-04T18:30:00Z"
    }

    pet_claimed_p001 --> identity_maya_001 : ownedBy
    pet_claimed_p001 --> training_log_t001 : latestTraining
```

## Snapshot 2 — Arena Match (RESOLVED state, Race mode)

```mermaid
classDiagram
    direction LR

    class arena_match_m001 {
        <<instance>>
        id = "d4e5f6a7-7b8c-9d0e-1f2a-3b4c5d6e7f8a"
        pet_a_id = "a3f8c1d2-..."
        pet_b_id = "f9e8d7c6-5b4a-3c2d-1e0f-8a7b6c5d4e3f"
        mode = RACE
        winner_pet_id = "a3f8c1d2-..."
        battle_log = "{speed_a:72, speed_b:55, modifier_a:0.08, modifier_b:-0.11, outcome: pet_a_wins}"
        created_at = "2026-05-04T20:00:00Z"
        completed_at = "2026-05-04T20:00:12Z"
        is_flagged = false
    }

    class pet_winner_p001 {
        <<instance>>
        id = "a3f8c1d2-4b5e-6f7a-8c9d-0e1f2a3b4c5d"
        stat_speed = 72
        level = 7
        rarity = LEGENDARY
    }

    class pet_loser_p002 {
        <<instance>>
        id = "f9e8d7c6-5b4a-3c2d-1e0f-8a7b6c5d4e3f"
        stat_speed = 55
        level = 4
        rarity = COMMON
    }

    arena_match_m001 --> pet_winner_p001 : winner
    arena_match_m001 --> pet_loser_p002 : loser
```

## Snapshot 3 — Claim Code (PENDING state, 6-digit OTP)

```mermaid
classDiagram
    direction LR

    class claim_code_cc001 {
        <<instance>>
        id = "e5f6a7b8-8c9d-0e1f-2a3b-4c5d6e7f8a9b"
        pet_id = "a3f8c1d2-4b5e-6f7a-8c9d-0e1f2a3b4c5d"
        email_hash = "sha256:3d7f9a2b..."
        code_hash = "sha256:7f3a9c1e..."
        expires_at = "2026-05-04T09:30:00Z"
        used_at = null
        attempts = 0
        created_at = "2026-05-04T09:15:00Z"
    }

    class pet_unclaimed_p003 {
        <<instance>>
        id = "a3f8c1d2-4b5e-6f7a-8c9d-0e1f2a3b4c5d"
        rarity = RARE
        stat_speed = 10
        stat_strength = 10
        stat_stamina = 10
        level = 1
        owner_token_hash = null
        reserved_until = "2026-05-05T09:15:00Z"
    }

    claim_code_cc001 --> pet_unclaimed_p003 : unlocks
```
