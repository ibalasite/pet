# Entity-Relationship Diagram — pixel-pet-arena

## Overview

This ER diagram covers all 13 PostgreSQL tables defined in SCHEMA.md §2, plus the Redis key-space
structures defined in EDD §4.8 (shown as notes). Tables are grouped by domain:

- **Identity & Auth**: `claim_identities`, `claim_codes`, `admin_accounts`
- **Pet Core**: `pets`, `training_logs`, `food_buffs`
- **Arena**: `arena_matches`
- **Leaderboard**: `leaderboard_snapshots`
- **Marketplace (Phase 3 / FF_MARKETPLACE)**: `marketplace_listings`, `marketplace_transactions`
- **Governance**: `admin_audit_log`, `gdpr_requests`

All IDs are UUID (`gen_random_uuid()`) except `admin_audit_log.id` which is `BIGSERIAL` for
monotonic ordering. All timestamps are `TIMESTAMPTZ`.

## Diagram

```mermaid
erDiagram
    claim_identities {
        UUID id PK
        VARCHAR_64 email_hash UK
        BYTEA email_encrypted
        TIMESTAMPTZ deletion_requested_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    pets {
        UUID id PK
        BIGINT seed UK
        rarity_enum rarity
        VARCHAR_64 pet_name
        SMALLINT stat_speed
        SMALLINT stat_strength
        SMALLINT stat_stamina
        SMALLINT level
        INTEGER total_training_actions
        TIMESTAMPTZ last_trained_at
        VARCHAR_64 owner_token_hash
        TIMESTAMPTZ claimed_at
        UUID claim_identity_id FK
        TIMESTAMPTZ reserved_until
        BOOLEAN is_banned
        TEXT banned_reason
        TIMESTAMPTZ banned_at
        JSONB generation_meta
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    claim_codes {
        UUID id PK
        UUID pet_id FK
        VARCHAR_64 email_hash
        VARCHAR_64 code_hash
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ used_at
        SMALLINT attempts
        TIMESTAMPTZ created_at
    }

    training_logs {
        UUID id PK
        UUID pet_id FK
        training_type_enum training_type
        SMALLINT stat_delta
        SMALLINT stat_after
        TIMESTAMPTZ completed_at
    }

    food_buffs {
        UUID id PK
        UUID pet_id FK
        VARCHAR_50 food_type
        buff_stat_enum buff_stat
        SMALLINT magnitude
        BOOLEAN is_permanent
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ consumed_at
        TIMESTAMPTZ record_expires_at
    }

    arena_matches {
        UUID id PK
        UUID pet_a_id FK
        UUID pet_b_id FK
        BOOLEAN is_ai_opponent
        arena_mode_enum mode
        UUID winner_pet_id FK
        BIGINT random_seed
        SMALLINT stat_delta_a
        SMALLINT stat_delta_b
        SMALLINT duration_seconds
        JSONB battle_log
        BOOLEAN is_flagged
        TIMESTAMPTZ flagged_at
        TIMESTAMPTZ completed_at
        TIMESTAMPTZ updated_at
    }

    leaderboard_snapshots {
        UUID id PK
        TIMESTAMPTZ snapshot_time
        JSONB entries
        TIMESTAMPTZ created_at
    }

    marketplace_listings {
        UUID id PK
        UUID pet_id FK
        VARCHAR_64 seller_token_hash
        INTEGER price_credits
        listing_status_enum status
        TIMESTAMPTZ listed_at
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ completed_at
        TIMESTAMPTZ updated_at
    }

    marketplace_transactions {
        UUID id PK
        UUID listing_id FK
        UUID pet_id FK
        VARCHAR_64 seller_token_hash
        VARCHAR_64 buyer_token_hash
        INTEGER price_credits
        INTEGER fee_credits
        TIMESTAMPTZ listed_at
        TIMESTAMPTZ completed_at
    }

    admin_accounts {
        UUID id PK
        VARCHAR_64 username UK
        TEXT password_hash
        TEXT totp_secret_encrypted
        JSONB totp_backup_codes_hash
        admin_role_enum role
        TIMESTAMPTZ last_login_at
        SMALLINT failed_attempts
        TIMESTAMPTZ locked_until
        TIMESTAMPTZ deactivated_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    admin_audit_log {
        BIGSERIAL id PK
        UUID admin_id FK
        VARCHAR_128 action
        VARCHAR_64 target_type
        TEXT target_id
        JSONB detail
        VARCHAR_64 ip_address_hash
        TIMESTAMPTZ created_at
    }

    gdpr_requests {
        UUID id PK
        UUID claim_identity_id FK
        UUID initiating_pet_id FK
        gdpr_request_type_enum request_type
        gdpr_request_status_enum status
        TIMESTAMPTZ submitted_at
        TIMESTAMPTZ completed_at
        TIMESTAMPTZ updated_at
        TEXT admin_notes
    }

    %% Relationships
    claim_identities ||--o{ pets : "claim_identity_id (SET NULL)"
    claim_identities ||--o{ gdpr_requests : "claim_identity_id (RESTRICT)"

    pets ||--o{ claim_codes : "pet_id (CASCADE)"
    pets ||--o{ training_logs : "pet_id (CASCADE)"
    pets ||--o{ food_buffs : "pet_id (CASCADE)"
    pets ||--o{ arena_matches : "pet_a_id (RESTRICT)"
    pets |o--o{ arena_matches : "pet_b_id (SET NULL)"
    pets |o--o{ arena_matches : "winner_pet_id (SET NULL)"
    pets ||--o{ marketplace_listings : "pet_id (RESTRICT)"
    pets ||--o{ marketplace_transactions : "pet_id (RESTRICT)"
    pets |o--o{ gdpr_requests : "initiating_pet_id (SET NULL)"

    marketplace_listings ||--o| marketplace_transactions : "listing_id (RESTRICT)"

    admin_accounts ||--o{ admin_audit_log : "admin_id (RESTRICT)"
```

## Enum Types

All enums are created as PostgreSQL `ENUM` types before any table DDL.

| Enum | Values | Used by |
|---|---|---|
| `rarity_enum` | COMMON, RARE, EPIC, LEGENDARY | `pets.rarity` |
| `arena_mode_enum` | RACE, SUMO | `arena_matches.mode` |
| `training_type_enum` | RUN, STRENGTH, STAMINA | `training_logs.training_type` |
| `buff_stat_enum` | speed, strength, stamina | `food_buffs.buff_stat` |
| `listing_status_enum` | active, cancelled, sold | `marketplace_listings.status` |
| `admin_role_enum` | super_admin, moderator, read_only | `admin_accounts.role` |
| `gdpr_request_type_enum` | erasure, data_access, restrict_processing, object_leaderboard, rectification | `gdpr_requests.request_type` |
| `gdpr_request_status_enum` | pending, processing, completed, failed | `gdpr_requests.status` |

## Key Constraints & Business Rules

- **`pets.owner_token_hash`**: SHA-256 of the 32-byte URL token (`pet_access_token_min_bytes = 32`).
  Raw token never stored. Paired with `claimed_at` (both NULL = unclaimed; both set = claimed),
  enforced by `chk_pet_claim_consistency`.
- **`pets.level`** is derived: `MAX(1, FLOOR(total_training_actions / 10))`
  (`pet_level_formula_divisor = 10`) capped at `pet_level_max = 100`.
- **`arena_matches.duration_seconds`**: constrained `BETWEEN 5 AND 15`
  (`arena_match_duration_min_seconds = 5`, `arena_match_duration_max_seconds = 15`).
- **`food_buffs.record_expires_at`**: `consumed_at + 30 days`
  (`food_buff_record_retention_days = 30`). Background cleanup job targets this column.
- **`admin_audit_log.id`**: `BIGSERIAL` (not UUID) for monotonic log ordering.
  Retention: 2 years (`admin_audit_log_retention_years = 2`).
- **`marketplace_transactions`**: immutable append-only; `listing_id` has a UNIQUE constraint
  ensuring one transaction per listing. `fee_credits = FLOOR(price_credits × 0.05)`
  (`trade_transaction_fee_percent = 5`).
- **DDL execution order**: `claim_identities` before `pets`; `marketplace_listings` before
  `marketplace_transactions`; `admin_accounts` before `admin_audit_log`.

## Redis Key-Space (Non-Relational, for Reference)

| Key Pattern | TTL | Purpose |
|---|---|---|
| `rl:claim:{email_hash}` | 3600 s | Claim attempt counter (limit: 5/hr — `auth_rate_limit_claim_attempts_per_hour = 5`) |
| `rl:claim:cooldown:{email_hash}` | 60 s | Post-limit cooldown (`claim_email_retry_cooldown_seconds = 60`) |
| `rl:arena:{pet_id}` | 3600 s | Arena battle counter (default 10/hr) |
| `rl:code_entry:{session_id}` | 900 s | OTP attempt counter (limit: 10 — `auth_rate_limit_code_entry_attempts_per_session = 10`) |
| `leaderboard:global` | no TTL | Sorted set; score = arena_score; member = petId |
| `matchmaking:queue:{mode}` | no TTL | Sorted set; score = enqueue epoch |
| `session:admin:{session_id}` | 14400 s | Admin session JSON (`admin_session_inactivity_expiry_hours = 4`) |
| `token:blacklist:{token_hash}` | 259200 s | Revoked pet tokens (`claim_token_cleanup_ttl_hours = 72`) |
| `config:runtime` | 300 s | Cached runtime config (`config_cache_refresh_time_minutes = 5`) |
