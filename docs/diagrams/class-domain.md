# Domain Class Diagram — pixel-pet-arena

## Overview

This diagram covers all 13 domain entities defined in EDD §4 and SCHEMA.md §2. It models the
structural relationships between pets, identities, claims, training, arena matches, leaderboard
snapshots, food buffs, marketplace tables, admin accounts, audit log, and GDPR requests.

Key design constraints reflected here:
- Pet access tokens (≥32 bytes; `pet_access_token_min_bytes = 32`) are **never** stored; only the
  SHA-256 hash appears as `owner_token_hash`.
- Email is stored only as AES-256-GCM ciphertext plus a SHA-256 lookup hash (GDPR P6 principle).
- `level` is a derived column: `MAX(1, FLOOR(total_training_actions / 10))` capped at 100
  (`pet_level_formula_divisor = 10`, `pet_level_max = 100`).

## Diagram

```mermaid
classDiagram
    direction TB

    class ClaimIdentity {
        +UUID id
        +VARCHAR(64) email_hash
        +BYTEA email_encrypted
        +TIMESTAMPTZ deletion_requested_at
        +TIMESTAMPTZ created_at
        +TIMESTAMPTZ updated_at
    }

    class Pet {
        +UUID id
        +BIGINT seed
        +rarity_enum rarity
        +VARCHAR(64) pet_name
        +SMALLINT stat_speed
        +SMALLINT stat_strength
        +SMALLINT stat_stamina
        +SMALLINT level
        +INTEGER total_training_actions
        +TIMESTAMPTZ last_trained_at
        +VARCHAR(64) owner_token_hash
        +TIMESTAMPTZ claimed_at
        +UUID claim_identity_id
        +TIMESTAMPTZ reserved_until
        +BOOLEAN is_banned
        +TEXT banned_reason
        +TIMESTAMPTZ banned_at
        +JSONB generation_meta
        +TIMESTAMPTZ created_at
        +TIMESTAMPTZ updated_at
        +deriveLevel() SMALLINT
    }

    class ClaimCode {
        +UUID id
        +UUID pet_id
        +VARCHAR(64) email_hash
        +VARCHAR(64) code_hash
        +TIMESTAMPTZ expires_at
        +TIMESTAMPTZ used_at
        +SMALLINT attempts
        +TIMESTAMPTZ created_at
    }

    class ArenaMatch {
        +UUID id
        +UUID pet_a_id
        +UUID pet_b_id
        +BOOLEAN is_ai_opponent
        +arena_mode_enum mode
        +UUID winner_pet_id
        +BIGINT random_seed
        +SMALLINT stat_delta_a
        +SMALLINT stat_delta_b
        +SMALLINT duration_seconds
        +JSONB battle_log
        +BOOLEAN is_flagged
        +TIMESTAMPTZ flagged_at
        +TIMESTAMPTZ completed_at
        +TIMESTAMPTZ updated_at
    }

    class TrainingLog {
        +UUID id
        +UUID pet_id
        +training_type_enum training_type
        +SMALLINT stat_delta
        +SMALLINT stat_after
        +TIMESTAMPTZ completed_at
    }

    class LeaderboardSnapshot {
        +UUID id
        +TIMESTAMPTZ snapshot_time
        +JSONB entries
        +TIMESTAMPTZ created_at
    }

    class FoodBuff {
        +UUID id
        +UUID pet_id
        +VARCHAR(50) food_type
        +buff_stat_enum buff_stat
        +SMALLINT magnitude
        +BOOLEAN is_permanent
        +TIMESTAMPTZ expires_at
        +TIMESTAMPTZ consumed_at
        +TIMESTAMPTZ record_expires_at
    }

    class MarketplaceListing {
        +UUID id
        +UUID pet_id
        +VARCHAR(64) seller_token_hash
        +INTEGER price_credits
        +listing_status_enum status
        +TIMESTAMPTZ listed_at
        +TIMESTAMPTZ expires_at
        +TIMESTAMPTZ completed_at
        +TIMESTAMPTZ updated_at
    }

    class MarketplaceTransaction {
        +UUID id
        +UUID listing_id
        +UUID pet_id
        +VARCHAR(64) seller_token_hash
        +VARCHAR(64) buyer_token_hash
        +INTEGER price_credits
        +INTEGER fee_credits
        +TIMESTAMPTZ listed_at
        +TIMESTAMPTZ completed_at
    }

    class AdminAccount {
        +UUID id
        +VARCHAR(64) username
        +TEXT password_hash
        +TEXT totp_secret_encrypted
        +JSONB totp_backup_codes_hash
        +admin_role_enum role
        +TIMESTAMPTZ last_login_at
        +SMALLINT failed_attempts
        +TIMESTAMPTZ locked_until
        +TIMESTAMPTZ deactivated_at
        +TIMESTAMPTZ created_at
        +TIMESTAMPTZ updated_at
    }

    class AdminAuditLog {
        +BIGSERIAL id
        +UUID admin_id
        +VARCHAR(128) action
        +VARCHAR(64) target_type
        +TEXT target_id
        +JSONB detail
        +VARCHAR(64) ip_address_hash
        +TIMESTAMPTZ created_at
    }

    class GdprRequest {
        +UUID id
        +UUID claim_identity_id
        +UUID initiating_pet_id
        +gdpr_request_type_enum request_type
        +gdpr_request_status_enum status
        +TIMESTAMPTZ submitted_at
        +TIMESTAMPTZ completed_at
        +TIMESTAMPTZ updated_at
        +TEXT admin_notes
    }

    %% Relationships
    ClaimIdentity "1" --> "0..*" Pet : claim_identity_id (SET NULL on delete)
    ClaimIdentity "1" --> "0..*" GdprRequest : claim_identity_id (RESTRICT on delete)

    Pet "1" --> "0..*" ClaimCode : pet_id (CASCADE on delete)
    Pet "1" --> "0..*" TrainingLog : pet_id (CASCADE on delete)
    Pet "1" --> "0..*" FoodBuff : pet_id (CASCADE on delete)
    Pet "1" --> "0..*" ArenaMatch : pet_a_id (RESTRICT on delete)
    Pet "0..1" --> "0..*" ArenaMatch : pet_b_id (SET NULL on delete)
    Pet "0..1" --> "0..*" ArenaMatch : winner_pet_id (SET NULL on delete)
    Pet "1" --> "0..*" MarketplaceListing : pet_id (RESTRICT on delete)
    Pet "1" --> "0..*" MarketplaceTransaction : pet_id (RESTRICT on delete)
    Pet "0..1" --> "0..*" GdprRequest : initiating_pet_id (SET NULL on delete)

    MarketplaceListing "1" --> "0..1" MarketplaceTransaction : listing_id (RESTRICT on delete)

    AdminAccount "1" --> "0..*" AdminAuditLog : admin_id (RESTRICT on delete)
```

## Notes

- **Rarity weights** (admin-tunable, must sum to 100%): COMMON = 60% (`rarity_common_percent = 60`),
  RARE = 25% (`rarity_rare_percent = 25`), EPIC = 12% (`rarity_epic_percent = 12`),
  LEGENDARY = 3% (`rarity_legendary_percent = 3`).
- **Stat range**: all three stats default to 10 (`pet_stat_default = 10`) and are capped at
  1–100 (`pet_stat_min = 1`, `pet_stat_max = 100`).
- **Arena duration**: `duration_seconds` constrained to 5–15 s (`arena_match_duration_min_seconds = 5`,
  `arena_match_duration_max_seconds = 15`); `random_seed` enables deterministic ±15% replay
  (`arena_battle_outcome_random_modifier_percent = 15`).
- **MarketplaceListing / MarketplaceTransaction** are Phase 3 features gated by `FF_MARKETPLACE`.
  The platform fee is 5% (`trade_transaction_fee_percent = 5`).
- **AdminAuditLog** retention is 2 years (`admin_audit_log_retention_years = 2`); the table uses
  `BIGSERIAL` for monotonic ordering rather than UUID.
- **GdprRequest** `request_type` values: erasure, data_access, restrict_processing,
  object_leaderboard, rectification.
