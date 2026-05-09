---
diagram: er-diagram
uml-type: 實體關聯圖（ER Diagram）
source: docs/SCHEMA.md §14
generated: 2026-05-10T00:50:00Z
note: 此圖描述資料庫表格關聯，請勿與 class-*.md 物件模型混淆
---

# Entity-Relationship Diagram

下圖呈現所有 12 張 PostgreSQL 表與其 FK / cross-BC ID 引用關係。**雙線箭頭 `||--o{`** = 同 BC FK（DB-level 強制）；**虛線箭頭 `||..o{`** = cross-BC ID-only（v2.1 後移除 DB FK，僅在 application 層維持參照完整性）。

```mermaid
erDiagram
    claim_identities {
        uuid id PK
        varchar email_hash UK
        bytea email_encrypted
        timestamptz deletion_requested_at
        timestamptz created_at
        timestamptz updated_at
    }
    pets {
        uuid id PK
        bigint seed UK
        rarity_enum rarity
        varchar pet_name
        smallint stat_speed
        smallint stat_strength
        smallint stat_stamina
        smallint level
        integer total_training_actions
        timestamptz last_trained_at
        varchar owner_token_hash
        timestamptz claimed_at
        uuid claim_identity_id "Cross-BC ID-only"
        timestamptz reserved_until
        boolean is_banned
        text banned_reason
        timestamptz banned_at
        jsonb generation_meta
        timestamptz created_at
        timestamptz updated_at
    }
    claim_codes {
        uuid id PK
        uuid pet_id "Cross-BC ID-only"
        varchar email_hash
        varchar code_hash
        timestamptz expires_at
        timestamptz used_at
        smallint attempts
        timestamptz created_at
    }
    arena_matches {
        uuid id PK
        uuid pet_a_id "Cross-BC ID-only"
        uuid pet_b_id "Cross-BC ID-only"
        boolean is_ai_opponent
        arena_mode_enum mode
        uuid winner_pet_id "Cross-BC ID-only"
        bigint random_seed
        smallint stat_delta_a
        smallint stat_delta_b
        smallint duration_seconds
        jsonb battle_log
        boolean is_flagged
        timestamptz flagged_at
        timestamptz completed_at
        timestamptz updated_at
    }
    leaderboard_snapshots {
        uuid id PK
        timestamptz snapshot_time
        jsonb entries
        timestamptz created_at
    }
    training_logs {
        uuid id PK
        uuid pet_id FK
        training_type_enum training_type
        smallint stat_delta
        smallint stat_after
        timestamptz completed_at
    }
    food_buffs {
        uuid id PK
        uuid pet_id FK
        varchar food_type
        buff_stat_enum buff_stat
        smallint magnitude
        boolean is_permanent
        timestamptz expires_at
        timestamptz consumed_at
        timestamptz record_expires_at
    }
    marketplace_listings {
        uuid id PK
        uuid pet_id "Cross-BC ID-only"
        varchar seller_token_hash
        integer price_credits
        listing_status_enum status
        timestamptz listed_at
        timestamptz expires_at
        timestamptz completed_at
        timestamptz updated_at
    }
    marketplace_transactions {
        uuid id PK
        uuid listing_id FK,UK
        uuid pet_id "Cross-BC ID-only"
        varchar seller_token_hash
        varchar buyer_token_hash
        integer price_credits
        integer fee_credits
        timestamptz listed_at
        timestamptz completed_at
    }
    admin_users {
        uuid id PK
        varchar username UK
        text password_hash
        text totp_secret_encrypted
        jsonb totp_backup_codes_hash
        admin_role_enum role
        timestamptz last_login_at
        smallint failed_attempts
        timestamptz locked_until
        timestamptz deactivated_at
        timestamptz created_at
        timestamptz updated_at
    }
    audit_logs {
        bigserial id PK
        uuid admin_id FK
        varchar action
        varchar target_type
        text target_id
        jsonb detail
        varchar ip_address_hash
        timestamptz created_at
    }
    gdpr_requests {
        uuid id PK
        uuid claim_identity_id FK
        uuid initiating_pet_id "Cross-BC ID-only"
        gdpr_request_type_enum request_type
        gdpr_request_status_enum status
        timestamptz submitted_at
        timestamptz completed_at
        timestamptz updated_at
        text admin_notes
    }

    %% Same-BC FKs (DB-level enforced)
    pets             ||--o{ training_logs            : "owns (CASCADE)"
    pets             ||--o{ food_buffs               : "owns (CASCADE)"
    marketplace_listings ||--|| marketplace_transactions : "completes (RESTRICT, UQ)"
    claim_identities ||--o{ gdpr_requests            : "subject of (RESTRICT)"
    admin_users      ||--o{ audit_logs               : "actor (RESTRICT)"

    %% Cross-BC ID-only references (v2.1 strip DB FK)
    claim_identities ||..o{ pets                     : "ID-only: claim_identity_id"
    pets             ||..o{ claim_codes              : "ID-only: pet_id"
    pets             ||..o{ arena_matches            : "ID-only: pet_a/pet_b/winner"
    pets             ||..o{ marketplace_listings     : "ID-only: pet_id"
    pets             ||..o{ marketplace_transactions : "ID-only: pet_id"
    pets             ||..o{ gdpr_requests            : "ID-only: initiating_pet_id"
```

> 圖例：`||--o{` 為同 BC FK（DB-level）；`||..o{` 為 cross-BC ID-only（無 DB FK）。此圖描述 Schema 表格關聯，請勿與 `class-*.md` 物件模型混淆。
