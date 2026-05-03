# State Machine — Pet Lifecycle

## Overview

A pet in pixel-pet-arena moves through a defined lifecycle from procedural generation to an active
claimed state, with side-branches for neglect, banning, and (Phase 3) marketplace listing. The
identity layer is entirely token-based — no user account exists. All state transitions are driven
by application events: claim, train, feed, ban, and marketplace actions.

Key lifecycle constants:
- Guest preview reservation window: 24 hours (`pet_reservation_ttl_hours = 24`)
- Neglect threshold: 3 days without training (`training_neglect_threshold_days = 3`)
- Ban reflection on leaderboard: within 5 minutes (`leaderboard_ban_reflection_time_minutes = 5`)
- Marketplace anti-flip window: 7 days (`marketplace_trade_antiflip_protection_days = 7`)

## Diagram

```mermaid
stateDiagram-v2
    [*] --> Generated : GET /api/v1/pets/random\ncreates pet row with\nreserved_until = NOW()+24h\n(pet_reservation_ttl_hours = 24)

    Generated --> GuestPreview : Pet row created,\nowner_token_hash IS NULL,\nreserved_until IS NOT NULL

    GuestPreview --> ClaimInitiated : POST /api/v1/claim\n(email + petId + ageConfirmed)

    GuestPreview --> Expired : reserved_until < NOW()\nAND owner_token_hash IS NULL\n(cleanup job runs every 6h)

    Expired --> [*] : Pet row hard-deleted

    ClaimInitiated --> ClaimPending : claim_codes row inserted\nOTP email sent via SendGrid\nexpires_at = NOW()+15min\n(claim_code_expiry_minutes = 15)

    ClaimPending --> ClaimExpired : expires_at < NOW()\nAND used_at IS NULL

    ClaimExpired --> GuestPreview : Player must re-initiate claim\n(pet row still unclaimed)

    ClaimPending --> Claimed : POST /api/v1/claim/verify\nOTP valid\nowner_token_hash set\nclaimed_at set\nreserved_until = NULL

    Claimed --> Active : Initial state after claim\nlevel = 1, all stats = 10\n(pet_level_default = 1,\npet_stat_default = 10)

    Active --> ActiveNeglected : NOW() - last_trained_at > 3 days\nOR last_trained_at IS NULL\n(training_neglect_threshold_days = 3)

    ActiveNeglected --> Active : POST /api/v1/pets/:petId/train\n(any training action clears neglect)

    Active --> TrainingLimitReached : 3 actions used today\n(training_actions_per_day = 3)

    TrainingLimitReached --> Active : UTC 00:00 daily reset

    Active --> Buffed : POST /api/v1/pets/:petId/feed\nfood_buffs row inserted

    Buffed --> Active : Buff expires (expires_at < NOW())\nOR permanent buff consumed

    Active --> InArena : POST /api/v1/arena/enter\n(enqueued in matchmaking:\nqueue:{mode})

    InArena --> Active : Battle completed\narena_matches row inserted\nleaderboard score updated

    Active --> Banned : POST /admin/api/pets/:petId/ban\nis_banned = TRUE\nbanned_at set\nleaderboard:global ZREM\n(within 5 min — leaderboard_ban_reflection_time_minutes = 5)

    Banned --> Active : POST /admin/api/pets/:petId/unban\nis_banned = FALSE\nbanned_at remains (immutable)

    Active --> Listed : POST /api/v1/marketplace/listings\n(FF_MARKETPLACE only)\nstatus = active

    Listed --> Active : DELETE /api/v1/marketplace/listings/:id\nstatus = cancelled\nOR expires_at reached

    Listed --> Sold : POST /api/v1/marketplace/listings/:id/buy\nstatus = sold\nowner_token_hash updated\nmarketplace_transactions row inserted\nAnti-flip: re-listing blocked\nfor 7 days (marketplace_trade_antiflip_protection_days = 7)

    Sold --> Active : New owner holds token\nPet returns to Active state

    note right of GuestPreview
        Sprite rendered in Phaser.js
        32×32 px (sprite_resolution_px = 32)
        ClaimCTA shown
    end note

    note right of Claimed
        petToken transmitted once
        only SHA-256 hash stored
        (pet_access_token_min_bytes = 32)
    end note

    note right of Banned
        Banned pets cannot enter arena
        POST /api/v1/arena/enter returns
        HTTP 403 PET_BANNED
    end note
```

## State Descriptions

| State | `owner_token_hash` | `is_banned` | `reserved_until` | Description |
|---|---|---|---|---|
| Generated / GuestPreview | NULL | FALSE | future timestamp | Pet just created; no owner; visible for 24 h |
| Expired | NULL | FALSE | past timestamp | Cleaned up by background job every 6 h |
| ClaimPending | NULL | FALSE | future timestamp | OTP sent; awaiting code entry (15 min window) |
| Active | set | FALSE | NULL | Normal state; all features available |
| ActiveNeglected | set | FALSE | NULL | No training for > 3 days; visual neglect overlay |
| TrainingLimitReached | set | FALSE | NULL | 3 daily actions exhausted; resets at UTC 00:00 |
| Buffed | set | FALSE | NULL | Active food buff modifying arena stat |
| InArena | set | FALSE | NULL | Matchmaking or battle in progress |
| Banned | set | TRUE | NULL | Blocked from arena; removed from leaderboard |
| Listed | set | FALSE | NULL | Active marketplace listing (Phase 3) |
| Sold | updated | FALSE | NULL | Ownership transferred to buyer |

## Notes

- The `ActiveNeglected` state is a **visual sub-state** of `Active`; it does not block any action.
  Training, arena entry, and feeding all remain available to neglected pets.
- `banned_at` is immutable after ban — it is not reset if the pet is subsequently unbanned
  (admin audit trail requirement).
- `ClaimExpired` is a transient state: no data is deleted on OTP expiry, only the claim code
  record becomes invalid. The pet remains in `GuestPreview` and the player can re-initiate claim.
- Claim code records are purged 72 hours after creation or first use, whichever is later
  (`claim_token_cleanup_ttl_hours = 72`).
