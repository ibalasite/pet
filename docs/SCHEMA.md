# Database Schema — pixel-pet-arena

**DOC-ID**: SCHEMA-PIXEL-PET-ARENA-20260503
**Status**: DRAFT
**Upstream**: EDD-PIXEL-PET-ARENA-20260503, API-PIXEL-PET-ARENA-20260503, CONSTANTS-PIXEL-PET-ARENA-20260503, PRD-PIXEL-PET-ARENA-20260503

---

## 1. Overview

**Database**: PostgreSQL 15+ managed via Supabase.  
**Primary writer** handles all mutations. **One read replica** handles leaderboard reads, public pet pages, and admin list views.  
**Automated failover** target: 60 seconds (`db_autofailover_time_seconds = 60`).  
**Connection pool** (managed by the `pg` Node.js driver):

| Setting | Value | Source |
|---------|-------|--------|
| `min` (pool floor) | 20 | `db_connection_pool_min_connections` |
| `max` (pool burst) | 50 | `db_connection_pool_max_connections` |

All column names use `snake_case`. All IDs are `UUID` (generated via `gen_random_uuid()`) unless noted. `TEXT` is used where no meaningful length constraint exists. `VARCHAR(n)` is used only where a business length limit is meaningful (e.g. reason text capped at 500 chars, usernames capped at 64 chars).

---

## 2. Tables

> **DDL execution order**: The PostgreSQL `ENUM` types defined in §3 must be created **before** any table in this section. Run all `CREATE TYPE` statements from §3 first, then execute the `CREATE TABLE` statements below in the order §2.1 → §2.12. Within the table definitions, §2.1 (`claim_identities`) must precede §2.2 (`pets`) because `pets.claim_identity_id` carries a foreign key to `claim_identities`; similarly, §2.8 (`marketplace_listings`) must precede §2.9 (`marketplace_transactions`), and §2.10 (`admin_accounts`) must precede §2.11 (`admin_audit_log`).

### 2.1 `claim_identities`

One row per unique email address. Implements PII minimization: only the SHA-256 hash is indexed; the raw email is stored only as AES-256-GCM ciphertext. Defined before `pets` because `pets.claim_identity_id` carries a foreign key to this table.

```sql
CREATE TABLE claim_identities (
    id                    UUID        NOT NULL DEFAULT gen_random_uuid(),
    email_hash            VARCHAR(64) NOT NULL,
    email_encrypted       BYTEA       NULL,
    deletion_requested_at TIMESTAMPTZ NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_claim_identities PRIMARY KEY (id),
    CONSTRAINT uq_claim_identities_email_hash UNIQUE (email_hash)
);

COMMENT ON COLUMN claim_identities.email_hash IS 'SHA-256 of lowercase email. Used for lookups. Never decryptable from this column alone.';
COMMENT ON COLUMN claim_identities.email_encrypted IS 'AES-256-GCM encrypted raw email. Set to NULL within 24 hours (gdpr_email_hashing_internal_sla_hours = 24) of a GDPR erasure request (internal SLA) and fully NULL within 7 days (gdpr_email_deletion_window_days = 7).';
COMMENT ON COLUMN claim_identities.deletion_requested_at IS 'Set when a GDPR erasure request is initiated. Triggers background erasure job.';
COMMENT ON COLUMN claim_identities.updated_at IS 'Updated by the application on every mutation: when deletion_requested_at is set and when email_encrypted is nulled by the GDPR erasure job.';
```

```sql
-- GDPR erasure background job: finds rows pending email encryption removal.
-- Query: WHERE deletion_requested_at IS NOT NULL AND email_encrypted IS NOT NULL
CREATE INDEX idx_claim_identities_deletion
    ON claim_identities (deletion_requested_at)
    WHERE deletion_requested_at IS NOT NULL AND email_encrypted IS NOT NULL;
```

---

### 2.2 `pets`

Stores every generated pet — unclaimed guests, claimed pets, and banned pets.

```sql
CREATE TABLE pets (
    id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
    seed                 BIGINT      NOT NULL,
    rarity               rarity_enum NOT NULL,
    pet_name             VARCHAR(64) NOT NULL,
    stat_speed           SMALLINT    NOT NULL DEFAULT 10,
    stat_strength        SMALLINT    NOT NULL DEFAULT 10,
    stat_stamina         SMALLINT    NOT NULL DEFAULT 10,
    level                SMALLINT    NOT NULL DEFAULT 1,
    total_training_actions INTEGER   NOT NULL DEFAULT 0,
    last_trained_at      TIMESTAMPTZ NULL,
    owner_token_hash     VARCHAR(64) NULL,
    claimed_at           TIMESTAMPTZ NULL,
    claim_identity_id    UUID        NULL,
    reserved_until       TIMESTAMPTZ NULL,
    is_banned            BOOLEAN     NOT NULL DEFAULT FALSE,
    banned_reason        TEXT        NULL,
    banned_at            TIMESTAMPTZ NULL,
    generation_meta      JSONB       NOT NULL DEFAULT '{}',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_pets PRIMARY KEY (id),
    CONSTRAINT fk_pets_claim_identity
        FOREIGN KEY (claim_identity_id) REFERENCES claim_identities(id) ON DELETE SET NULL,
    CONSTRAINT uq_pets_seed
        UNIQUE (seed),
    CONSTRAINT chk_pet_stat_speed_range
        CHECK (stat_speed BETWEEN 1 AND 100),
    CONSTRAINT chk_pet_stat_strength_range
        CHECK (stat_strength BETWEEN 1 AND 100),
    CONSTRAINT chk_pet_stat_stamina_range
        CHECK (stat_stamina BETWEEN 1 AND 100),
    CONSTRAINT chk_pet_level_range
        CHECK (level BETWEEN 1 AND 100),
    CONSTRAINT chk_pet_total_training_actions_nonneg
        CHECK (total_training_actions >= 0),
    CONSTRAINT chk_pet_banned_reason_length
        CHECK (char_length(banned_reason) <= 500),
    CONSTRAINT chk_pet_banned_at_consistency
        CHECK (
            (is_banned = FALSE AND banned_at IS NULL) OR
            (is_banned = TRUE  AND banned_at IS NOT NULL)
        ),
    CONSTRAINT chk_pet_banned_reason_consistency
        CHECK (
            (is_banned = FALSE AND banned_reason IS NULL) OR
            (is_banned = TRUE  AND banned_reason IS NOT NULL)
        ),
    CONSTRAINT chk_pet_claim_consistency
        CHECK (
            (claimed_at IS NULL     AND owner_token_hash IS NULL) OR
            (claimed_at IS NOT NULL AND owner_token_hash IS NOT NULL)
        )
);

COMMENT ON COLUMN pets.seed IS 'Procedural generation seed — globally unique; drives all sprite generation determinism.';
COMMENT ON COLUMN pets.rarity IS 'Rarity tier assigned at generation time by weighted random draw: COMMON 60%, RARE 25%, EPIC 12%, LEGENDARY 3% (rarity_common_percent = 60, rarity_rare_percent = 25, rarity_epic_percent = 12, rarity_legendary_percent = 3). Weights are admin-tunable via config but must always sum to 100%.';
COMMENT ON COLUMN pets.pet_name IS 'Auto-generated from species + color combination at row creation; derived from seed.';
COMMENT ON COLUMN pets.stat_speed IS 'Speed stat. Range: 1–100 (pet_stat_min = 1, pet_stat_max = 100). Default: 10 (pet_stat_default = 10).';
COMMENT ON COLUMN pets.stat_strength IS 'Strength stat. Range: 1–100 (pet_stat_min = 1, pet_stat_max = 100). Default: 10 (pet_stat_default = 10).';
COMMENT ON COLUMN pets.stat_stamina IS 'Stamina stat. Range: 1–100 (pet_stat_min = 1, pet_stat_max = 100). Default: 10 (pet_stat_default = 10).';
COMMENT ON COLUMN pets.level IS 'Derived: MAX(pet_level_default, FLOOR(total_training_actions / pet_level_formula_divisor)) capped at pet_level_max (pet_level_default = 1, pet_level_formula_divisor = 10, pet_level_max = 100). At 0 training actions the formula yields 0, so the lower bound clamps it to pet_level_default = 1. Updated on every training commit.';
COMMENT ON COLUMN pets.total_training_actions IS 'Cumulative count of training actions; feeds the level formula.';
COMMENT ON COLUMN pets.last_trained_at IS 'Timestamp of the most recent training action. NULL if never trained. Used to compute neglect state (threshold: 3 days; training_neglect_threshold_days = 3).';
COMMENT ON COLUMN pets.claimed_at IS 'UTC timestamp when the email-OTP claim flow completed successfully. NULL = pet is unclaimed (guest preview). Set atomically with owner_token_hash (enforced by chk_pet_claim_consistency). Used for claim conversion analytics.';
COMMENT ON COLUMN pets.owner_token_hash IS 'SHA-256 hash of the pet access token (minimum pet_access_token_min_bytes = 32 bytes). NULL = unclaimed. Raw token is never stored.';
COMMENT ON COLUMN pets.claim_identity_id IS 'Set at claim time. Enables GDPR erasure lookup after claim_codes rows are purged.';
COMMENT ON COLUMN pets.reserved_until IS 'Set to NOW() + pet_reservation_ttl_hours hours (pet_reservation_ttl_hours = 24) when pet is generated for guest preview. NULL for claimed pets. Cleanup job target.';
COMMENT ON COLUMN pets.generation_meta IS 'JSONB vector: {body, head, color_palette, accessory, rarity_trait, pattern} — 6 dimensions (pet_generation_dimensions = 6).';
COMMENT ON COLUMN pets.is_banned IS 'TRUE = pet is banned from arena and removed from leaderboard:global via ZREM (reflected within leaderboard_ban_reflection_time_minutes = 5 minutes). Paired with banned_at and banned_reason (enforced by chk_pet_banned_at_consistency and chk_pet_banned_reason_consistency).';
COMMENT ON COLUMN pets.banned_at IS 'UTC timestamp when the ban was applied. NULL iff is_banned = FALSE (enforced by chk_pet_banned_at_consistency). Immutable after ban — not reset if a ban is reviewed or overridden via a future unban flow.';
COMMENT ON COLUMN pets.banned_reason IS 'Admin-supplied ban reason. Max 500 characters (admin_moderation_reason_max_chars = 500).';
COMMENT ON COLUMN pets.updated_at IS 'Updated by the application on every mutation: claim (owner_token_hash + claimed_at set), training (stats + level updated), reservation creation/expiry, and ban action.';
```

```sql
CREATE INDEX idx_pets_rarity           ON pets (rarity);
CREATE INDEX idx_pets_claimed_at       ON pets (claimed_at)        WHERE claimed_at IS NOT NULL;
CREATE INDEX idx_pets_is_banned        ON pets (is_banned)         WHERE is_banned = TRUE;
CREATE INDEX idx_pets_owner_token_hash ON pets (owner_token_hash)  WHERE owner_token_hash IS NOT NULL;
CREATE INDEX idx_pets_last_trained_at  ON pets (last_trained_at)   WHERE last_trained_at IS NOT NULL;
CREATE INDEX idx_pets_claim_identity   ON pets (claim_identity_id) WHERE claim_identity_id IS NOT NULL;
CREATE INDEX idx_pets_reserved_until   ON pets (reserved_until)    WHERE reserved_until IS NOT NULL;
```

---

### 2.3 `claim_codes`

One-time OTP records for the email claim and recovery flows. Never stores the plaintext code — only its SHA-256 hash.

```sql
CREATE TABLE claim_codes (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    pet_id      UUID        NOT NULL,
    email_hash  VARCHAR(64) NOT NULL,
    code_hash   VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ NULL,
    attempts    SMALLINT    NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_claim_codes PRIMARY KEY (id),
    CONSTRAINT fk_claim_codes_pet
        FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    CONSTRAINT chk_claim_codes_attempts_nonneg
        CHECK (attempts >= 0),
    CONSTRAINT chk_claim_codes_expires_at_after_created
        CHECK (expires_at > created_at),
    CONSTRAINT chk_claim_codes_used_at_after_created
        CHECK (used_at IS NULL OR used_at >= created_at)
);

COMMENT ON COLUMN claim_codes.email_hash IS 'SHA-256 of lowercase email supplied during the claim flow. Must match claim_identities.email_hash for the OTP to be accepted. Index idx_claim_codes_email_hash supports the OTP lookup query WHERE email_hash = $1.';
COMMENT ON COLUMN claim_codes.code_hash IS 'SHA-256 of the 6-digit numeric OTP (claim_code_digits = 6). Plaintext OTP is never stored.';
COMMENT ON COLUMN claim_codes.expires_at IS 'NOW() + 15 minutes at creation (claim_code_expiry_minutes = 15).';
COMMENT ON COLUMN claim_codes.attempts IS 'Informational counter incremented on each verify call. Enforcement is in Redis (rl:code_entry:{session_id}), not this column.';
COMMENT ON COLUMN claim_codes.used_at IS 'Set when the OTP is successfully verified. Background job purges rows 72h after creation or first use, whichever is later (claim_token_cleanup_ttl_hours = 72).';
```

```sql
CREATE INDEX idx_claim_codes_pet_id     ON claim_codes (pet_id);
CREATE INDEX idx_claim_codes_email_hash ON claim_codes (email_hash);
CREATE INDEX idx_claim_codes_expires_at ON claim_codes (expires_at);
-- Background cleanup job: deletes rows 72h after creation or first use, whichever is LATER (claim_token_cleanup_ttl_hours = 72).
-- Query: WHERE created_at < NOW() - INTERVAL '72 hours' AND (used_at IS NULL OR used_at < NOW() - INTERVAL '72 hours')
CREATE INDEX idx_claim_codes_created_at ON claim_codes (created_at);
CREATE INDEX idx_claim_codes_used_at    ON claim_codes (used_at) WHERE used_at IS NOT NULL;
```

---

### 2.4 `arena_matches`

Append-only record of every completed battle. Battle outcome columns are never mutated after insert; however, `is_flagged` and `flagged_at` can be toggled by admin flag/unflag actions. `pet_b_id` and `winner_pet_id` use `ON DELETE SET NULL` so that the match row is retained for audit integrity even if a pet row is later affected.

```sql
CREATE TABLE arena_matches (
    id               UUID           NOT NULL DEFAULT gen_random_uuid(),
    pet_a_id         UUID           NOT NULL,
    pet_b_id         UUID           NULL,
    is_ai_opponent   BOOLEAN        NOT NULL DEFAULT FALSE,
    mode             arena_mode_enum NOT NULL,
    winner_pet_id    UUID           NULL,
    random_seed      BIGINT         NOT NULL,
    stat_delta_a     SMALLINT       NOT NULL DEFAULT 0,
    stat_delta_b     SMALLINT       NOT NULL DEFAULT 0,
    duration_seconds SMALLINT       NOT NULL,
    battle_log       JSONB          NOT NULL DEFAULT '[]',
    is_flagged       BOOLEAN        NOT NULL DEFAULT FALSE,
    flagged_at       TIMESTAMPTZ    NULL,
    completed_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_arena_matches PRIMARY KEY (id),
    CONSTRAINT fk_arena_matches_pet_a
        FOREIGN KEY (pet_a_id) REFERENCES pets(id) ON DELETE RESTRICT,
    CONSTRAINT fk_arena_matches_pet_b
        FOREIGN KEY (pet_b_id) REFERENCES pets(id) ON DELETE SET NULL,
    CONSTRAINT fk_arena_matches_winner
        FOREIGN KEY (winner_pet_id) REFERENCES pets(id) ON DELETE SET NULL,
    CONSTRAINT chk_arena_match_duration
        CHECK (duration_seconds BETWEEN 5 AND 15),
    CONSTRAINT chk_arena_match_flagged_at_consistency
        CHECK (
            (is_flagged = FALSE AND flagged_at IS NULL) OR
            (is_flagged = TRUE  AND flagged_at IS NOT NULL)
        ),
    CONSTRAINT chk_arena_match_flagged_at_after_completed
        CHECK (flagged_at IS NULL OR flagged_at >= completed_at),
    CONSTRAINT chk_arena_match_ai_opponent_consistency
        CHECK (
            (is_ai_opponent = FALSE) OR
            (is_ai_opponent = TRUE AND pet_b_id IS NULL)
        ),
    CONSTRAINT chk_arena_match_different_pets
        CHECK (pet_b_id IS NULL OR pet_b_id != pet_a_id),
    CONSTRAINT chk_arena_match_stat_delta_a_nonneg
        CHECK (stat_delta_a >= 0),
    CONSTRAINT chk_arena_match_stat_delta_b_nonneg
        CHECK (stat_delta_b >= 0),
    CONSTRAINT chk_arena_match_winner_is_combatant
        CHECK (
            winner_pet_id IS NULL OR
            winner_pet_id = pet_a_id OR
            winner_pet_id = pet_b_id
        )
);

COMMENT ON COLUMN arena_matches.mode IS 'Battle mode. RACE = speed-based contest (stat_speed is the primary determining stat); SUMO = strength-based contest (stat_strength is the primary determining stat). Drives the outcome formula applied to the random_seed modifier.';
COMMENT ON COLUMN arena_matches.pet_a_id IS 'Challenger pet. ON DELETE RESTRICT: pet row is retained for audit integrity.';
COMMENT ON COLUMN arena_matches.pet_b_id IS 'Opponent pet. NULL if AI opponent (is_ai_opponent = TRUE) or if the pet row has been administratively removed after match completion (ON DELETE SET NULL). Non-null at insert time for human-vs-human matches; enforced by application, not a CHECK constraint (ON DELETE SET NULL would violate a database-level NOT NULL check).';
COMMENT ON COLUMN arena_matches.is_ai_opponent IS 'TRUE = pet_a fought an AI-controlled opponent; pet_b_id is always NULL for AI matches (enforced by chk_arena_match_ai_opponent_consistency). FALSE = human-vs-human match.';
COMMENT ON COLUMN arena_matches.winner_pet_id IS 'pet_id of the winning pet. NULL when the AI opponent wins (is_ai_opponent = TRUE and the player lost); never NULL for human-vs-human matches. ON DELETE SET NULL retains the row if the winning pet is later removed. Constrained to be pet_a_id or pet_b_id (chk_arena_match_winner_is_combatant).';
COMMENT ON COLUMN arena_matches.completed_at IS 'UTC timestamp when the battle result was committed. Doubles as the row creation timestamp (immutable after insert except for is_flagged/flagged_at mutations).';
COMMENT ON COLUMN arena_matches.random_seed IS 'Seeded random value used for the ±15% outcome modifier (arena_battle_outcome_random_modifier_percent = 15). Enables deterministic replay.';
COMMENT ON COLUMN arena_matches.stat_delta_a IS 'Food buff bonus (delta) added to pet_a''s base stat for this match. 0 = no active buff. Always >= 0 (chk_arena_match_stat_delta_a_nonneg); food buff magnitude is strictly positive.';
COMMENT ON COLUMN arena_matches.stat_delta_b IS 'Food buff bonus (delta) added to pet_b''s base stat for this match. 0 = no active buff or AI opponent. Always >= 0 (chk_arena_match_stat_delta_b_nonneg).';
COMMENT ON COLUMN arena_matches.duration_seconds IS 'Animation window: 5–15 seconds (arena_match_duration_min_seconds = 5, arena_match_duration_max_seconds = 15).';
COMMENT ON COLUMN arena_matches.battle_log IS 'Structured event sequence array for client-side replay.';
COMMENT ON COLUMN arena_matches.is_flagged IS 'Set to TRUE by POST /admin/api/battles/:matchId/flag (Moderator+); cleared by DELETE /admin/api/battles/:matchId/flag. Flag reason is written to admin_audit_log.detail, not stored here.';
COMMENT ON COLUMN arena_matches.flagged_at IS 'Timestamp when the match was most recently flagged. NULL when is_flagged = FALSE.';
COMMENT ON COLUMN arena_matches.updated_at IS 'Updated by the application on every mutation: when is_flagged is set to TRUE (POST .../flag) or cleared to FALSE (DELETE .../flag). Unchanged on insert-only path.';
```

```sql
CREATE INDEX idx_arena_matches_completed_at  ON arena_matches (completed_at);
CREATE INDEX idx_arena_matches_winner        ON arena_matches (winner_pet_id);
-- Leading pet_a_id / pet_b_id column also serves FK integrity scans (ON DELETE RESTRICT / SET NULL).
CREATE INDEX idx_arena_matches_pet_a_history ON arena_matches (pet_a_id, completed_at DESC);
CREATE INDEX idx_arena_matches_pet_b_history ON arena_matches (pet_b_id, completed_at DESC);
-- Supports GET /admin/api/battles?flagged=true (filters WHERE is_flagged = TRUE). Flag/unflag mutations use the PK, not this index.
CREATE INDEX idx_arena_matches_is_flagged    ON arena_matches (is_flagged) WHERE is_flagged = TRUE;
```

---

### 2.5 `leaderboard_snapshots`

Periodic snapshots of the leaderboard used for history reporting. The live leaderboard is authoritative from Redis; these rows are the durable PostgreSQL backup.

```sql
CREATE TABLE leaderboard_snapshots (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    snapshot_time TIMESTAMPTZ NOT NULL,
    entries       JSONB       NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_leaderboard_snapshots PRIMARY KEY (id)
);

COMMENT ON COLUMN leaderboard_snapshots.entries IS 'Array of top 500 entries: [{rank, pet_id, pet_name, score, win_rate, rarity, level}]. Size: leaderboard_snapshot_retention_top_n = 500.';
COMMENT ON COLUMN leaderboard_snapshots.snapshot_time IS 'UTC timestamp when this snapshot was taken. Retention: rolling 12 months (leaderboard_snapshot_retention_months = 12).';
COMMENT ON COLUMN leaderboard_snapshots.created_at IS 'System timestamp when the row was inserted. Distinct from snapshot_time, which is the business timestamp of the leaderboard state captured.';
```

```sql
-- Background retention job: deletes snapshots older than 12 months (leaderboard_snapshot_retention_months = 12).
-- Query: DELETE FROM leaderboard_snapshots WHERE snapshot_time < NOW() - INTERVAL '12 months'
CREATE INDEX idx_leaderboard_snapshots_time ON leaderboard_snapshots (snapshot_time DESC);
```

---

### 2.6 `training_logs`

One row per completed training action. Enables per-pet daily action counting and the cumulative `total_training_actions` aggregate that feeds the level formula. Rows are retained indefinitely as a behavioral audit trail (referenced by `GET /api/v1/pets/:petId/stats`).

```sql
CREATE TABLE training_logs (
    id            UUID               NOT NULL DEFAULT gen_random_uuid(),
    pet_id        UUID               NOT NULL,
    training_type training_type_enum NOT NULL,
    stat_delta    SMALLINT           NOT NULL,
    stat_after    SMALLINT           NOT NULL,
    completed_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_training_logs PRIMARY KEY (id),
    CONSTRAINT fk_training_logs_pet
        FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    CONSTRAINT chk_training_stat_delta_range
        CHECK (stat_delta BETWEEN 1 AND 3),
    CONSTRAINT chk_training_stat_after_range
        CHECK (stat_after BETWEEN 1 AND 100)
);

COMMENT ON COLUMN training_logs.training_type IS 'RUN → speed, STRENGTH → strength, STAMINA → stamina. Enforced by training_type_enum.';
COMMENT ON COLUMN training_logs.stat_delta IS 'Stat points gained this action: random integer in [1, 3] (training_stat_points_min = 1, training_stat_points_max = 3).';
COMMENT ON COLUMN training_logs.stat_after IS 'Absolute stat value after this action is applied. Range: 1–100 (pet_stat_min = 1, pet_stat_max = 100).';
COMMENT ON COLUMN training_logs.completed_at IS 'UTC timestamp of the action. Daily action limit (training_actions_per_day = 3) is enforced by counting rows WHERE pet_id = ? AND completed_at >= UTC_DATE.';
```

```sql
-- Leading pet_id column also serves the FK CASCADE scan (ON DELETE CASCADE).
CREATE INDEX idx_training_logs_completed_at ON training_logs (pet_id, completed_at DESC);
```

---

### 2.7 `food_buffs`

Active and historical food buff records per pet. Permanent buffs have `expires_at = NULL`. Record rows are cleaned up 30 days after consumption (`food_buff_record_retention_days = 30`).

```sql
CREATE TABLE food_buffs (
    id                UUID        NOT NULL DEFAULT gen_random_uuid(),
    pet_id            UUID        NOT NULL,
    food_type         VARCHAR(50) NOT NULL,
    buff_stat         buff_stat_enum NOT NULL,
    magnitude         SMALLINT    NOT NULL,
    is_permanent      BOOLEAN     NOT NULL DEFAULT FALSE,
    expires_at        TIMESTAMPTZ NULL,
    consumed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    record_expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT pk_food_buffs PRIMARY KEY (id),
    CONSTRAINT fk_food_buffs_pet
        FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    CONSTRAINT chk_food_buff_magnitude_positive
        CHECK (magnitude > 0),
    CONSTRAINT chk_food_buff_expires_at_permanent
        CHECK (
            (is_permanent = TRUE  AND expires_at IS NULL) OR
            (is_permanent = FALSE AND expires_at IS NOT NULL)
        ),
    CONSTRAINT chk_food_buff_expires_at_after_consumed
        CHECK (expires_at IS NULL OR expires_at > consumed_at),
    CONSTRAINT chk_food_buff_record_expires_after_consumed
        CHECK (record_expires_at > consumed_at),
    CONSTRAINT chk_food_buff_expires_before_record_cleanup
        CHECK (expires_at IS NULL OR expires_at <= record_expires_at)
);

COMMENT ON COLUMN food_buffs.food_type IS 'Application-defined food item identifier (e.g. ''speed_berry'', ''iron_kibble''). Used by the client to render the correct food icon and label. Not a database enum; valid values are defined by the food catalogue in the application layer and documented in the API spec. Max 50 characters (VARCHAR(50)).';
COMMENT ON COLUMN food_buffs.is_permanent IS 'TRUE = buff never expires (expires_at IS NULL, enforced by chk_food_buff_expires_at_permanent). FALSE = buff has a finite duration (expires_at IS NOT NULL).';
COMMENT ON COLUMN food_buffs.consumed_at IS 'UTC timestamp when the food item was applied to the pet. Defaults to NOW() at row insertion. Serves as the reference point for expires_at and record_expires_at calculations.';
COMMENT ON COLUMN food_buffs.buff_stat IS 'Stat affected: speed, strength, or stamina.';
COMMENT ON COLUMN food_buffs.magnitude IS 'Stat points granted. Must be > 0. Admin-configurable multiplier range: 0.5×–5.0× (food_buff_multiplier_admin_min = 0.5, food_buff_multiplier_admin_max = 5.0).';
COMMENT ON COLUMN food_buffs.expires_at IS 'NULL for permanent buffs. Set to consumed_at + duration for temporary buffs. chk_food_buff_expires_before_record_cleanup ensures expires_at <= record_expires_at so the buff always expires before its record is deleted by the background cleanup job.';
COMMENT ON COLUMN food_buffs.record_expires_at IS 'consumed_at + 30 days (food_buff_record_retention_days = 30). Target for background cleanup job. Enforced to be >= expires_at (chk_food_buff_expires_before_record_cleanup) so the record is never deleted while the buff is still logically active.';
```

```sql
CREATE INDEX idx_food_buffs_pet_id         ON food_buffs (pet_id);
CREATE INDEX idx_food_buffs_record_expires ON food_buffs (record_expires_at);
```

---

### 2.8 `marketplace_listings`

Active and historical pet trade listings. Phase 3 feature, gated by `FF_MARKETPLACE`. A partial unique index prevents duplicate active listings per pet at the database level.

```sql
CREATE TABLE marketplace_listings (
    id                UUID         NOT NULL DEFAULT gen_random_uuid(),
    pet_id            UUID         NOT NULL,
    seller_token_hash VARCHAR(64)  NOT NULL,
    price_credits     INTEGER      NOT NULL,
    status            listing_status_enum NOT NULL DEFAULT 'active',
    listed_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ  NULL,
    completed_at      TIMESTAMPTZ  NULL,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_marketplace_listings PRIMARY KEY (id),
    CONSTRAINT fk_marketplace_listings_pet
        FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
    CONSTRAINT chk_marketplace_listing_price_positive
        CHECK (price_credits > 0),
    CONSTRAINT chk_marketplace_listing_completed_at_consistency
        CHECK (
            (status = 'active'   AND completed_at IS NULL) OR
            (status != 'active'  AND completed_at IS NOT NULL)
        ),
    CONSTRAINT chk_marketplace_listing_expires_at_after_listed
        CHECK (expires_at IS NULL OR expires_at > listed_at),
    CONSTRAINT chk_marketplace_listing_completed_at_after_listed
        CHECK (completed_at IS NULL OR completed_at >= listed_at)
);

COMMENT ON COLUMN marketplace_listings.pet_id IS 'The pet being listed for trade. ON DELETE RESTRICT: prevents hard-deleting a pet while it has any listing row (active, sold, or cancelled).';
COMMENT ON COLUMN marketplace_listings.seller_token_hash IS 'SHA-256 hash of the seller pet access token. Used for ownership verification.';
COMMENT ON COLUMN marketplace_listings.price_credits IS 'Asking price in food credits. Minimum enforced by application: (pet_level × trade_min_price_formula_level_coeff) + (rarity_multiplier × trade_min_price_formula_rarity_coeff) (trade_min_price_formula_level_coeff = 100, trade_min_price_formula_rarity_coeff = 500).';
COMMENT ON COLUMN marketplace_listings.listed_at IS 'UTC timestamp when the listing was created. Defaults to NOW(). Copied verbatim into marketplace_transactions.listed_at at sale time for financial audit traceability. Sort key for idx_marketplace_listings_listed_at (public/admin browse query ORDER BY listed_at DESC).';
COMMENT ON COLUMN marketplace_listings.status IS 'active | cancelled | sold.';
COMMENT ON COLUMN marketplace_listings.expires_at IS 'Optional listing expiry. NULL = no expiry.';
COMMENT ON COLUMN marketplace_listings.completed_at IS 'Set when status transitions to sold or cancelled.';
COMMENT ON COLUMN marketplace_listings.updated_at IS 'Updated by the application on every mutation: status transitions (active → sold/cancelled) and background expiry job.';
```

```sql
CREATE INDEX idx_marketplace_listings_pet       ON marketplace_listings (pet_id);
CREATE INDEX idx_marketplace_listings_status    ON marketplace_listings (status) WHERE status = 'active';
CREATE INDEX idx_marketplace_listings_listed_at ON marketplace_listings (listed_at DESC);

-- Prevents a pet from having more than one active listing at a time.
CREATE UNIQUE INDEX idx_marketplace_listings_active_pet
    ON marketplace_listings (pet_id)
    WHERE status = 'active';

-- Background job target: transitions active listings whose expires_at has passed to cancelled.
-- Only rows with a non-NULL expires_at can expire; rows with NULL expires_at never expire.
CREATE INDEX idx_marketplace_listings_expires_at
    ON marketplace_listings (expires_at)
    WHERE status = 'active' AND expires_at IS NOT NULL;
```

---

### 2.9 `marketplace_transactions`

Immutable completed trade records. `listing_id` uses `ON DELETE RESTRICT` to ensure the originating listing row is never deleted while a transaction references it.

```sql
CREATE TABLE marketplace_transactions (
    id                UUID        NOT NULL DEFAULT gen_random_uuid(),
    listing_id        UUID        NOT NULL,
    pet_id            UUID        NOT NULL,
    seller_token_hash VARCHAR(64) NOT NULL,
    buyer_token_hash  VARCHAR(64) NOT NULL,
    price_credits     INTEGER     NOT NULL,
    fee_credits       INTEGER     NOT NULL,
    listed_at         TIMESTAMPTZ NOT NULL,
    completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_marketplace_transactions PRIMARY KEY (id),
    CONSTRAINT fk_marketplace_transactions_listing
        FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE RESTRICT,
    CONSTRAINT fk_marketplace_transactions_pet
        FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
    CONSTRAINT uq_marketplace_transactions_listing
        UNIQUE (listing_id),
    CONSTRAINT chk_marketplace_transaction_price_positive
        CHECK (price_credits > 0),
    CONSTRAINT chk_marketplace_transaction_fee_non_negative
        CHECK (fee_credits >= 0),
    CONSTRAINT chk_marketplace_transaction_completed_at_after_listed
        CHECK (completed_at >= listed_at)
);

COMMENT ON COLUMN marketplace_transactions.listing_id IS 'FK to marketplace_listings (ON DELETE RESTRICT). uq_marketplace_transactions_listing UNIQUE constraint enforces exactly one completed transaction per listing. The RESTRICT prevents the listing row from being hard-deleted while a transaction references it.';
COMMENT ON COLUMN marketplace_transactions.price_credits IS 'Sale price in food credits. Denormalized from marketplace_listings.price_credits at transaction time for financial audit immutability — the listing price could be amended before expiry but the transaction records the actual agreed price.';
COMMENT ON COLUMN marketplace_transactions.pet_id IS 'Denormalized from listing for fast anti-flip queries. Anti-flip window: 7 days (marketplace_trade_antiflip_protection_days = 7).';
COMMENT ON COLUMN marketplace_transactions.seller_token_hash IS 'SHA-256 hash of the seller pet access token at time of sale.';
COMMENT ON COLUMN marketplace_transactions.buyer_token_hash IS 'SHA-256 hash of the buyer pet access token at time of purchase.';
COMMENT ON COLUMN marketplace_transactions.fee_credits IS '5% platform fee: FLOOR(price_credits * 0.05) — trade_transaction_fee_percent = 5. May be 0 for price_credits < 20.';
COMMENT ON COLUMN marketplace_transactions.listed_at IS 'Copied from the listing row at transaction time for audit traceability.';
COMMENT ON COLUMN marketplace_transactions.completed_at IS 'UTC timestamp when the trade completed and this immutable record was inserted. Defaults to NOW(). Serves as both the row creation timestamp and the anti-flip reference point.';
```

```sql
-- listing_id: uq_marketplace_transactions_listing UNIQUE constraint creates an implicit index that serves FK scans; no separate index needed.
CREATE INDEX idx_marketplace_transactions_completed ON marketplace_transactions (completed_at DESC);
-- Anti-flip query: finds the most recent completed trade for a pet via ORDER BY completed_at DESC LIMIT 1.
-- Leading pet_id column also serves the FK RESTRICT scan (ON DELETE RESTRICT).
-- Composite covers both the equality filter and the sort without a separate heap sort step.
CREATE INDEX idx_marketplace_transactions_pet_completed
    ON marketplace_transactions (pet_id, completed_at DESC);
```

---

### 2.10 `admin_accounts`

Admin operator credentials. Accounts are never hard-deleted — deactivation is a soft-delete via `deactivated_at`. The audit log holds a FK to this table, requiring row retention.

```sql
CREATE TABLE admin_accounts (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    username                VARCHAR(64) NOT NULL,
    password_hash           TEXT        NOT NULL,
    totp_secret_encrypted   TEXT        NULL,
    totp_backup_codes_hash  JSONB       NULL,
    role                    admin_role_enum NOT NULL DEFAULT 'moderator',
    last_login_at           TIMESTAMPTZ NULL,
    failed_attempts         SMALLINT    NOT NULL DEFAULT 0,
    locked_until            TIMESTAMPTZ NULL,
    deactivated_at          TIMESTAMPTZ NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_admin_accounts PRIMARY KEY (id),
    CONSTRAINT uq_admin_accounts_username UNIQUE (username),
    CONSTRAINT chk_admin_accounts_failed_attempts_nonneg
        CHECK (failed_attempts >= 0)
);

COMMENT ON COLUMN admin_accounts.username IS 'Login identifier. Unique (uq_admin_accounts_username). Max 64 characters (VARCHAR(64)). Used as the login credential alongside password and TOTP.';
COMMENT ON COLUMN admin_accounts.password_hash IS 'bcrypt hash. Minimum work factor: 12.';
COMMENT ON COLUMN admin_accounts.totp_secret_encrypted IS 'AES-256-GCM encrypted TOTP secret. NULL until TOTP enrollment is completed. First login returns TOTP_SETUP_REQUIRED until this is set.';
COMMENT ON COLUMN admin_accounts.totp_backup_codes_hash IS 'Array of SHA-256 hashes of the 10 single-use backup codes. Consumed entry is removed from array on use. NULL until enrollment.';
COMMENT ON COLUMN admin_accounts.role IS 'super_admin | moderator | read_only.';
COMMENT ON COLUMN admin_accounts.last_login_at IS 'UTC timestamp of the most recent successful login (i.e. passed password check + TOTP verification). NULL until the first successful login. Updated on every successful authentication.';
COMMENT ON COLUMN admin_accounts.failed_attempts IS 'Consecutive failed login counter. Reset to 0 on successful login.';
COMMENT ON COLUMN admin_accounts.locked_until IS 'Non-NULL and in future = account is locked. Set after 10 consecutive failures (admin_login_lockout_threshold = 10) for 30 minutes (admin_login_lockout_duration_minutes = 30). NOT used for permanent deactivation.';
COMMENT ON COLUMN admin_accounts.deactivated_at IS 'Non-NULL = account is permanently deactivated. Set by DELETE /admin/api/roles/:adminId (soft-deactivate). Prevents login. Row is never hard-deleted.';
COMMENT ON COLUMN admin_accounts.updated_at IS 'Updated by the application on every mutation: password change, TOTP enrollment/reset, role change, lockout set/cleared, and deactivation.';
```

```sql
-- username: uq_admin_accounts_username UNIQUE constraint creates an implicit index for login lookups; no separate index needed.
```

---

### 2.11 `admin_audit_log`

Immutable audit trail of all admin actions. Uses `BIGSERIAL` for sequential ordering. Retention: 2 years (`admin_audit_log_retention_years = 2`).

```sql
CREATE TABLE admin_audit_log (
    id               BIGSERIAL   NOT NULL,
    admin_id         UUID        NULL,
    action           VARCHAR(128) NOT NULL,
    target_type      VARCHAR(64) NULL,
    target_id        TEXT        NULL,
    detail           JSONB       NULL,
    ip_address_hash  VARCHAR(64) NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_admin_audit_log PRIMARY KEY (id),
    CONSTRAINT fk_admin_audit_log_admin
        FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE RESTRICT
);

COMMENT ON COLUMN admin_audit_log.id IS 'BIGSERIAL for monotonic log ordering.';
COMMENT ON COLUMN admin_audit_log.admin_id IS 'Actor admin account. NULL for failed logins with an unrecognized username.';
COMMENT ON COLUMN admin_audit_log.action IS 'Dot-namespaced action string, e.g. pet.ban, config.arena_rate_limit, admin_user.deactivate.';
COMMENT ON COLUMN admin_audit_log.target_type IS 'pet | arena_match | leaderboard_entry | config_runtime | config_economy | gdpr_request | admin_user.';
COMMENT ON COLUMN admin_audit_log.target_id IS 'UUID or key of the affected entity.';
COMMENT ON COLUMN admin_audit_log.detail IS 'JSONB blob of action-specific context. Shape varies by action: e.g. for pet.ban: {reason, previous_is_banned}; for arena_match.flag: {reason}; for config.*: {previous_value, new_value}. NULL for actions with no additional context.';
COMMENT ON COLUMN admin_audit_log.ip_address_hash IS 'SHA-256 hash of the raw request IP. Raw IP is never stored. Retained 90 days (ip_address_log_retention_days = 90).';
```

```sql
-- Background retention job: deletes rows older than 2 years (admin_audit_log_retention_years = 2).
-- Query: DELETE FROM admin_audit_log WHERE created_at < NOW() - INTERVAL '2 years'
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_admin_id   ON admin_audit_log (admin_id, created_at DESC);
-- Background job target: nulls ip_address_hash after 90 days (ip_address_log_retention_days = 90).
-- Query: UPDATE ... SET ip_address_hash = NULL WHERE ip_address_hash IS NOT NULL AND created_at < NOW() - INTERVAL '90 days'
-- Partial predicate keeps the index tiny — once nulled, rows drop out of the index automatically.
CREATE INDEX idx_admin_audit_log_ip_hash_cleanup
    ON admin_audit_log (created_at)
    WHERE ip_address_hash IS NOT NULL;
```

---

### 2.12 `gdpr_requests`

Job queue for all GDPR data subject requests. `claim_identity_id` uses `ON DELETE RESTRICT` to prevent an identity row from being removed while open GDPR requests reference it.

```sql
CREATE TABLE gdpr_requests (
    id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    claim_identity_id  UUID        NOT NULL,
    initiating_pet_id  UUID        NULL,
    request_type       gdpr_request_type_enum   NOT NULL,
    status             gdpr_request_status_enum NOT NULL DEFAULT 'pending',
    submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at       TIMESTAMPTZ NULL,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admin_notes        TEXT        NULL,

    CONSTRAINT pk_gdpr_requests PRIMARY KEY (id),
    CONSTRAINT fk_gdpr_requests_identity
        FOREIGN KEY (claim_identity_id) REFERENCES claim_identities(id) ON DELETE RESTRICT,
    CONSTRAINT fk_gdpr_requests_initiating_pet
        FOREIGN KEY (initiating_pet_id) REFERENCES pets(id) ON DELETE SET NULL,
    CONSTRAINT chk_gdpr_request_admin_notes_length
        CHECK (char_length(admin_notes) <= 500),
    CONSTRAINT chk_gdpr_request_completed_at_consistency
        CHECK (
            (status IN ('pending', 'processing') AND completed_at IS NULL) OR
            (status IN ('completed', 'failed')   AND completed_at IS NOT NULL)
        ),
    CONSTRAINT chk_gdpr_request_completed_at_after_submitted
        CHECK (completed_at IS NULL OR completed_at >= submitted_at)
);

COMMENT ON COLUMN gdpr_requests.claim_identity_id IS 'Data subject. A single erasure covers all pets under this identity.';
COMMENT ON COLUMN gdpr_requests.initiating_pet_id IS 'Pet whose token authenticated the self-service submission. NULL for admin-initiated requests.';
COMMENT ON COLUMN gdpr_requests.request_type IS 'erasure | data_access | restrict_processing | object_leaderboard | rectification.';
COMMENT ON COLUMN gdpr_requests.status IS 'pending | processing | completed | failed.';
COMMENT ON COLUMN gdpr_requests.submitted_at IS 'UTC timestamp when the request was submitted. Doubles as the row creation timestamp (this table has no separate created_at). Defaults to NOW(). FIFO sort key for the admin work queue (idx_gdpr_requests_status ORDER BY submitted_at).';
COMMENT ON COLUMN gdpr_requests.completed_at IS 'Set when status transitions to completed or failed. NULL while status is pending or processing (enforced by chk_gdpr_request_completed_at_consistency).';
COMMENT ON COLUMN gdpr_requests.updated_at IS 'Timestamp of the last status transition or admin_notes update. Required to populate the updatedAt field in PATCH /admin/api/gdpr/:requestId response. Updated by application on every status change.';
COMMENT ON COLUMN gdpr_requests.admin_notes IS 'Filled by admin on completion or status update. Also used for admin-initiated erasure reason (max 500 chars; admin_moderation_reason_max_chars = 500).';
```

```sql
CREATE INDEX idx_gdpr_requests_identity         ON gdpr_requests (claim_identity_id, submitted_at DESC);
CREATE INDEX idx_gdpr_requests_status           ON gdpr_requests (status, submitted_at);
-- FK support: every FK column must have an index (fk_gdpr_requests_initiating_pet).
CREATE INDEX idx_gdpr_requests_initiating_pet   ON gdpr_requests (initiating_pet_id) WHERE initiating_pet_id IS NOT NULL;
```

---

## 3. Enums

All enums are defined as PostgreSQL `ENUM` types to enforce domain values at the database level.

```sql
-- Pet rarity tiers. Drop weights (admin-tunable, must sum to 100%):
--   COMMON = 60%, RARE = 25%, EPIC = 12%, LEGENDARY = 3%
--   (rarity_common_percent = 60, rarity_rare_percent = 25, rarity_epic_percent = 12, rarity_legendary_percent = 3)
CREATE TYPE rarity_enum AS ENUM (
    'COMMON',
    'RARE',
    'EPIC',
    'LEGENDARY'
);

-- Arena battle modes.
CREATE TYPE arena_mode_enum AS ENUM (
    'RACE',
    'SUMO'
);

-- Training action type. Maps to the stat trained: RUN→speed, STRENGTH→strength, STAMINA→stamina.
CREATE TYPE training_type_enum AS ENUM (
    'RUN',
    'STRENGTH',
    'STAMINA'
);

-- Food buff target stat.
CREATE TYPE buff_stat_enum AS ENUM (
    'speed',
    'strength',
    'stamina'
);

-- Marketplace listing lifecycle state.
CREATE TYPE listing_status_enum AS ENUM (
    'active',
    'cancelled',
    'sold'
);

-- Admin operator role. Controls endpoint access:
--   super_admin  — full access including config, GDPR, role management
--   moderator    — pet/leaderboard/battle management; no config or GDPR
--   read_only    — GET-only access to dashboard, pets, leaderboard, battles, analytics
CREATE TYPE admin_role_enum AS ENUM (
    'super_admin',
    'moderator',
    'read_only'
);

-- GDPR request types per GDPR Arts. 15–21.
CREATE TYPE gdpr_request_type_enum AS ENUM (
    'erasure',
    'data_access',
    'restrict_processing',
    'object_leaderboard',
    'rectification'
);

-- GDPR request lifecycle state.
CREATE TYPE gdpr_request_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);
```

---

## 4. Redis Key Schema

All Redis keys use Upstash Redis 7+ (serverless). TTL values are hard-coded in seconds where shown.

### 4.1 Rate Limit Counters

| Key Pattern | TTL | Value | Notes |
|-------------|-----|-------|-------|
| `rl:claim:{email_hash}` | 3600 s | Integer attempt count | Email claim initiation. Limit: 5/hr per email (`email_claim_attempts_per_hour_per_email = 5`). Window = 1 h = 3600 s (implicit: no separate window-seconds constant; derived from `email_claim_attempts_per_hour_per_email`). Fail-open if Redis unavailable. |
| `rl:claim:cooldown:{email_hash}` | 60 s | `"1"` | Set when limit is reached. Blocks further attempts during cooldown. TTL = `claim_email_retry_cooldown_seconds = 60`. Returns HTTP 429 with `Retry-After: 60`. |
| `rl:arena:{pet_id}` | 3600 s | Integer battle count | Arena battles per pet. Default limit: 10/hr (`arena_battles_per_pet_per_hour_default = 10`); admin-tunable 1–50 (`arena_battles_per_pet_per_hour_admin_min = 1`, `arena_battles_per_pet_per_hour_admin_max = 50`). Window = 1 h = 3600 s (`arena_rate_limit_counter_window_hours = 1`). Fail-open. |
| `rl:code_entry:{session_id}` | 900 s | Integer attempt count | OTP code entry. Limit: 10/session (`claim_code_entry_attempts_per_session = 10`). Window = 15 min = 900 s (`claim_code_expiry_minutes = 15`; the code-entry window matches the OTP validity window). **Fail-closed** — code entry is blocked if Redis is unavailable. |
| `rl:code_entry:cooldown:{session_id}` | 60 s | `"1"` | Set when code entry limit is reached. TTL matches `claim_email_retry_cooldown_seconds = 60` (no separate constant defined for code-entry cooldown). HTTP 429 with `Retry-After: 60`. |
| `rl:admin_login:{ip_hash}` | 900 s | Integer attempt count | Pre-auth admin login IP rate limit. Limit: 10 attempts per 15 min (`admin_login_ip_rate_limit_attempts = 10`, `admin_login_ip_rate_limit_window_seconds = 900`). |
| `rl:admin:{admin_id}` | 60 s | Integer request count | Per-authenticated-admin request rate limit. Limit: 100/min (`admin_portal_requests_per_minute_per_account = 100`). |

### 4.2 Arena Matchmaking Queue

| Key Pattern | TTL | Type | Notes |
|-------------|-----|------|-------|
| `matchmaking:queue:{mode}` | None | Redis Sorted Set | Score = enqueue epoch (ms). Member format: `"{petId}:{enqueue_epoch_ms}"`. Consumer pops oldest eligible entry via `ZRANGEBYSCORE`. Entries older than `arena_matchmaking_timeout_seconds = 30` seconds plus an implementation-defined grace buffer (~15 s; no constant) are considered stale and discarded silently. |

### 4.3 Session Storage

| Key Pattern | TTL | Value | Notes |
|-------------|-----|-------|-------|
| `session:admin:{session_id}` | 14400 s | JSON `{ adminId, role, createdAt, absExpiry }` | Inactivity TTL = 14400 s (4 h; `admin_session_inactivity_expiry_hours = 4`). `absExpiry = createdAt + 28800 s` (8 h; `admin_session_absolute_expiry_hours = 8`) is validated on every request for the absolute cap. |
| `token:blacklist:{token_hash}` | 259200 s | `"1"` | Invalidates replaced pet access tokens after recovery flow. TTL = 72 h (`claim_token_cleanup_ttl_hours = 72`). |

### 4.4 Leaderboard Sorted Set

| Key | TTL | Type | Notes |
|-----|-----|------|-------|
| `leaderboard:global` | None | Redis Sorted Set | Score = arena score (`win_rate × battles_played × level_multiplier`). Member = `pet_id`. Authoritative real-time source; PostgreSQL `leaderboard_snapshots` is the durable backup. Update lag target ≤ 30 s (`leaderboard_update_lag_max_seconds = 30`). Banned pets are removed via `ZREM` immediately on ban (reflected within 5 min; `leaderboard_ban_reflection_time_minutes = 5`). Pet entries are also removed via `ZREM` during GDPR erasure processing. |

### 4.5 Config Cache

| Key | TTL | Value | Notes |
|-----|-----|-------|-------|
| `config:runtime` | 300 s | JSON blob | Runtime configuration values (arena rate limit, rarity weights, etc.). Refreshed every 5 min (`config_cache_refresh_time_minutes = 5`). Mutations via `PUT /admin/api/config/runtime` or `PUT /admin/api/config/economy` take effect within this window. |

---

## 5. Data Retention

| Table / Key Pattern | Retention Policy | Source Constant |
|---------------------|-----------------|-----------------|
| `pets` | Indefinite (until GDPR erasure or admin deletion) | — |
| `claim_identities` | Indefinite; `email_encrypted` nulled within 7 days of erasure request | `gdpr_email_deletion_window_days = 7` |
| `claim_codes` | Deleted 72 hours after row creation or `used_at`, whichever is later | `claim_token_cleanup_ttl_hours = 72` |
| `arena_matches` | Indefinite (audit immutability; last 20 per pet shown publicly) | `arena_battle_records_display_count = 20` |
| `training_logs` | Indefinite (behavioral audit trail; feeds `total_training_actions` aggregate) | — |
| `leaderboard_snapshots` | Rolling 12 months | `leaderboard_snapshot_retention_months = 12` |
| `food_buffs` | 30 days after `consumed_at` (`record_expires_at` column; cleaned by background job) | `food_buff_record_retention_days = 30` |
| `marketplace_listings` | Indefinite (referenced by transactions; `ON DELETE RESTRICT`) | — |
| `marketplace_transactions` | Indefinite (financial audit trail) | — |
| `admin_accounts` | Indefinite (never hard-deleted; audit log FK) | — |
| `admin_audit_log` | 2 years (GDPR Art. 30 compliance) | `admin_audit_log_retention_years = 2` |
| `gdpr_requests` | Indefinite (legal compliance record) | — |
| `rl:*` Redis counters | Per key TTL (60 s – 3600 s) | Various `rate_limits.*` constants |
| `session:admin:*` | 14400 s inactivity / absolute 28800 s | `admin_session_inactivity_expiry_hours = 4`, `admin_session_absolute_expiry_hours = 8` |
| `token:blacklist:*` | 259200 s (72 h) | `claim_token_cleanup_ttl_hours = 72` |
| `leaderboard:global` | No expiry; entries removed on ban or GDPR erasure | — |
| `admin_audit_log.ip_address_hash` | 90 days (column is set to NULL after 90 d by background job) | `ip_address_log_retention_days = 90` |
| Unclaimed `pets` (guest preview) | Background job deletes `reserved_until < NOW() AND owner_token_hash IS NULL` on an implementation-defined schedule (no constant; run frequency is an operational decision) | `pet_reservation_ttl_hours = 24` |

---

## 6. Indexes & Performance Notes

### 6.1 Partial Indexes

Partial indexes on boolean and nullable columns are preferred over full-table indexes where the indexed set is a small fraction of total rows:

- `idx_pets_claimed_at` — `WHERE claimed_at IS NOT NULL`: only claimed pets have this set; used by analytics and admin list queries that filter for claimed pets.
- `idx_pets_is_banned` — `WHERE is_banned = TRUE`: nearly all rows are `FALSE`; this partial index is tiny and fast for ban-check queries.
- `idx_pets_owner_token_hash` — `WHERE owner_token_hash IS NOT NULL`: unclaimed pets have NULL; only claimed pet rows are indexed, keeping the index compact.
- `idx_pets_last_trained_at` — `WHERE last_trained_at IS NOT NULL`: never-trained pets are excluded; the index supports neglect detection queries without scanning the full table.
- `idx_pets_reserved_until` — `WHERE reserved_until IS NOT NULL`: only guest preview pets have this set; background cleanup job scans this index exclusively.
- `idx_marketplace_listings_status` — `WHERE status = 'active'`: the vast majority of historical listings are `cancelled` or `sold`; the active listing index stays small.
- `idx_marketplace_listings_active_pet` — `WHERE status = 'active'` unique: provides a database-enforced uniqueness constraint for concurrent active listings per pet at near-zero write cost.
- `idx_arena_matches_is_flagged` — `WHERE is_flagged = TRUE`: nearly all matches are unflagged; partial index stays tiny and serves `GET /admin/api/battles?flagged=true` efficiently.
- `idx_gdpr_requests_initiating_pet` — `WHERE initiating_pet_id IS NOT NULL`: supports FK SET NULL integrity scan (`fk_gdpr_requests_initiating_pet ON DELETE SET NULL`) and any lookup by initiating pet. NULL rows (admin-initiated requests) are excluded.
- `idx_claim_codes_used_at` — `WHERE used_at IS NOT NULL`: used by the 72-hour background cleanup job which must find rows whose first-use time has passed.
- `idx_marketplace_listings_expires_at` — `WHERE status = 'active' AND expires_at IS NOT NULL`: used by the background job that transitions active listings whose `expires_at` has passed to `cancelled`. Only a small subset of active listings have a non-NULL expiry, keeping this index tiny.
- `idx_claim_identities_deletion` — `WHERE deletion_requested_at IS NOT NULL AND email_encrypted IS NOT NULL`: used exclusively by the GDPR erasure background job to find rows that still have encrypted email data pending removal. Once `email_encrypted` is set to NULL the row drops out of the index, so this partial index stays tiny under normal operation and approaches zero size once all pending deletions are processed.
- `idx_admin_audit_log_ip_hash_cleanup` — `WHERE ip_address_hash IS NOT NULL`: used by the background job that nulls `ip_address_hash` after 90 days (`ip_address_log_retention_days = 90`). Once nulled, rows drop out of the index, keeping it compact. Mirrors the same pattern used by `idx_claim_identities_deletion`.
- `idx_pets_claim_identity` — `WHERE claim_identity_id IS NOT NULL`: only claimed pets have this FK set; the partial index supports the GDPR erasure lookup query (`SELECT id FROM pets WHERE claim_identity_id = $1`) efficiently and also serves the FK integrity scan. See §6.5 for the full query pattern.

### 6.2 Composite Indexes for History Queries

- `idx_arena_matches_pet_a_history (pet_a_id, completed_at DESC)` and `idx_arena_matches_pet_b_history (pet_b_id, completed_at DESC)` — support the `ORDER BY completed_at DESC LIMIT 20` query pattern used by `GET /api/v1/arena/history/:petId` (`arena_battle_records_display_count = 20`). Without a composite index the planner would scan the full `pet_a_id` partition and sort. The leading column of each index also serves PostgreSQL's FK integrity scan for `ON DELETE RESTRICT` (pet_a_id) and `ON DELETE SET NULL` (pet_b_id), eliminating the need for separate single-column indexes.
- `idx_training_logs_completed_at (pet_id, completed_at DESC)` — supports the daily action count query (`COUNT(*) WHERE pet_id = ? AND completed_at >= UTC_DATE`) and the training history summary in `GET /api/v1/pets/:petId/stats`. The leading `pet_id` column also serves the FK CASCADE scan (`ON DELETE CASCADE`), making a separate `idx_training_logs_pet_id` unnecessary.
- `idx_admin_audit_log_admin_id (admin_id, created_at DESC)` — supports filtered audit log searches by actor within a 12-month window in ≤ 3 s (`admin_audit_log_search_response_time_seconds = 3`).
- `idx_marketplace_transactions_pet_completed (pet_id, completed_at DESC)` — supports the anti-flip eligibility check (`marketplace_trade_antiflip_protection_days = 7`). The query `SELECT completed_at FROM marketplace_transactions WHERE pet_id = $1 ORDER BY completed_at DESC LIMIT 1` is fully served by the composite index without a separate heap sort. The leading `pet_id` column also covers the FK RESTRICT scan (`ON DELETE RESTRICT`), eliminating the need for a separate single-column `idx_marketplace_transactions_pet` index.
- `idx_leaderboard_snapshots_time (snapshot_time DESC)` — supports both the historical reporting query (`SELECT ... ORDER BY snapshot_time DESC LIMIT 1`) and the 12-month rolling retention DELETE (`WHERE snapshot_time < NOW() - INTERVAL '12 months'`; `leaderboard_snapshot_retention_months = 12`).
- `idx_admin_audit_log_created_at (created_at DESC)` — supports audit log search queries and the 2-year row retention DELETE (`WHERE created_at < NOW() - INTERVAL '2 years'`; `admin_audit_log_retention_years = 2`). The composite `idx_admin_audit_log_admin_id` additionally covers filtered searches by actor.

### 6.3 Leaderboard Query Pattern

The live leaderboard is served exclusively from the Redis `leaderboard:global` sorted set (`ZREVRANGE` for top-N retrieval, `ZREVRANK` for a pet's rank — both O(log N)). The `leaderboard_snapshots` table is written by a background job and read only for historical reporting. No hot-path leaderboard query touches PostgreSQL under normal operation.

### 6.4 Token Lookup Path

Authentication on every write request hashes the incoming bearer token and executes:

```sql
SELECT id, is_banned, claim_identity_id, owner_token_hash
  FROM pets
 WHERE owner_token_hash = $1;
```

Before executing the SELECT, the application checks the incoming token hash against the Redis `token:blacklist:{token_hash}` key; if the key is present the request is rejected immediately without touching PostgreSQL. The partial index `idx_pets_owner_token_hash` (covering only non-NULL rows) makes the subsequent DB lookup a single index scan.

### 6.5 GDPR Erasure Lookup

The `pets.claim_identity_id` FK enables the erasure job to find all pets belonging to a data subject in one query:

```sql
SELECT id FROM pets WHERE claim_identity_id = $1;
```

This avoids depending on the ephemeral `claim_codes` table, which is purged 72 hours after creation or first use, whichever is later (`claim_token_cleanup_ttl_hours = 72`). The partial index `idx_pets_claim_identity` supports this scan efficiently.

### 6.6 Single-Column Support Indexes

These full-table indexes cover FK scans, sort-only queries, and background job targets that are not classified as partial or composite:

- `idx_pets_rarity (rarity)` — supports admin list-view and leaderboard snapshot queries that filter by rarity tier. Not partial because all rows have a non-NULL `rarity`.
- `idx_claim_codes_expires_at (expires_at)` — supports OTP verification filtering for unexpired codes (`WHERE expires_at > NOW()`) and the background job that identifies stale unverified codes. Not partial because all rows have a non-NULL `expires_at`.
- `idx_claim_codes_created_at (created_at)` — supports the 72-hour background cleanup job which finds rows by creation time (`WHERE created_at < NOW() - INTERVAL '72 hours'`). Not partial because all rows have a non-NULL `created_at`.
- `idx_arena_matches_completed_at (completed_at)` — supports admin list queries ordered by recency and serves as the sort key for leaderboard-adjacent analytics. Not partial because all rows have a non-NULL `completed_at`.
- `idx_arena_matches_winner (winner_pet_id)` — supports the FK integrity scan for `winner_pet_id ON DELETE SET NULL`. PostgreSQL does not require an index on the referencing column, but without one it falls back to a sequential scan of `arena_matches` whenever a `pets` row is deleted; the index prevents that O(N) scan at low cost given the low cardinality of `winner_pet_id` updates.
- `idx_claim_codes_pet_id (pet_id)` — supports the FK CASCADE scan when a `pets` row is deleted (`ON DELETE CASCADE`). Also used by the OTP verification query `WHERE pet_id = $1 AND expires_at > NOW() AND used_at IS NULL`.
- `idx_claim_codes_email_hash (email_hash)` — supports the OTP lookup query `WHERE email_hash = $1` to retrieve pending codes for a given email.
- `idx_food_buffs_pet_id (pet_id)` — supports the FK CASCADE scan and the active-buff query `WHERE pet_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`.
- `idx_food_buffs_record_expires (record_expires_at)` — supports the background cleanup job `DELETE FROM food_buffs WHERE record_expires_at < NOW()` (`food_buff_record_retention_days = 30`).
- `idx_marketplace_listings_pet (pet_id)` — supports the FK RESTRICT scan and seller-facing queries `WHERE pet_id = $1`.
- `idx_marketplace_listings_listed_at (listed_at DESC)` — supports the admin and public marketplace browse query `ORDER BY listed_at DESC`.
- `idx_marketplace_transactions_completed (completed_at DESC)` — supports admin transaction audit queries ordered by recency.
- `idx_gdpr_requests_identity (claim_identity_id, submitted_at DESC)` — composite: supports the query `WHERE claim_identity_id = $1 ORDER BY submitted_at DESC` for listing all requests by a data subject. The leading column also serves the FK RESTRICT scan (`ON DELETE RESTRICT`).
- `idx_gdpr_requests_status (status, submitted_at)` — supports the admin work queue query `WHERE status IN ('pending', 'processing') ORDER BY submitted_at` for processing requests in FIFO order.

### 6.7 Connection Pool Sizing

At `db_connection_pool_min_connections = 20` and `db_connection_pool_max_connections = 50`, the pool is sized for the sustained 100 RPS target (`normal_operation_rps = 100`) with headroom to the 500 RPS peak (`peak_operation_rps = 500`) before autoscaling adds replicas. Each API server process holds its own pool; with the minimum API server replica count (implementation-defined; no constant), the total connection count at burst is `min_replicas × db_connection_pool_max_connections`. For example, 2 API server processes × 50 pool max = 100 total connections at burst.
