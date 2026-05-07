---
diagram: admin-rbac-entity
uml-type: ER Diagram（Admin RBAC Entities）
source: docs/ADMIN_IMPL.md §5 RBAC + docs/SCHEMA.md admin tables + docs/EDD.md §4.9-§4.10
generated: 2026-05-08T00:00:00Z
---

# Admin RBAC Entity Diagram — pixel-pet-arena

> 來源：docs/ADMIN_IMPL.md §5 RBAC + docs/SCHEMA.md admin tables + docs/EDD.md §4.9 AdminUser + §4.10 AuditLogs

描述 Admin Portal 的角色權限模型（RBAC）資料表結構與關係。本系統採用三層 RBAC：
AdminAccount ← AdminUserRole → Role ← RolePermission → Permission，配合 AuditLog 追蹤所有特權動作。

```mermaid
erDiagram
    ADMIN_ACCOUNT {
        UUID id PK
        VARCHAR(64) username UK "lowercase, unique"
        TEXT password_hash "argon2id $argon2id$..."
        TEXT totp_secret_encrypted "AES-256-GCM ciphertext"
        JSONB totp_backup_codes_hash "hashed backup codes"
        ENUM role "fallback role for non-RBAC checks"
        TIMESTAMPTZ last_login_at
        SMALLINT failed_attempts "max 5 → lock"
        TIMESTAMPTZ locked_until "exponential backoff"
        TIMESTAMPTZ deactivated_at "soft delete"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    ROLE {
        UUID id PK
        VARCHAR(64) name UK "moderator, super_admin, ..."
        VARCHAR(255) description
        BOOLEAN is_system "TRUE for built-in roles, immutable"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    PERMISSION {
        UUID id PK
        VARCHAR(128) code UK "pets.ban / pets.unban / config.update / ..."
        VARCHAR(255) description
        VARCHAR(64) category "pets, config, gdpr, audit, dashboard"
        TIMESTAMPTZ created_at
    }

    ROLE_PERMISSION {
        UUID role_id FK
        UUID permission_id FK
        TIMESTAMPTZ granted_at
        UUID granted_by FK "AdminAccount.id who created mapping"
    }

    ADMIN_USER_ROLE {
        UUID admin_id FK
        UUID role_id FK
        TIMESTAMPTZ assigned_at
        UUID assigned_by FK "AdminAccount.id who assigned role"
        TIMESTAMPTZ revoked_at "NULL for active assignments"
    }

    ADMIN_AUDIT_LOG {
        BIGSERIAL id PK
        UUID admin_id FK "nullable for system jobs"
        VARCHAR(128) action "e.g. pet.ban, config.update.runtime"
        VARCHAR(64) target_type "pet, arena_match, config_key, gdpr_request"
        TEXT target_id "stringified UUID or composite key"
        JSONB detail "before/after diff + IP + reason"
        VARCHAR(64) ip_address_hash "SHA-256(remote_addr)"
        TIMESTAMPTZ created_at "monotonic insert order"
    }

    ADMIN_SESSION {
        VARCHAR(64) token_id PK "session opaque ID"
        UUID admin_id FK
        VARCHAR(64) ip_address_hash
        VARCHAR(255) user_agent_hash
        TIMESTAMPTZ created_at
        TIMESTAMPTZ expires_at "default 1h sliding"
        TIMESTAMPTZ revoked_at "NULL for active sessions"
    }

    ADMIN_ACCOUNT ||--o{ ADMIN_USER_ROLE : "has"
    ADMIN_USER_ROLE }o--|| ROLE : "is granted"
    ROLE ||--o{ ROLE_PERMISSION : "contains"
    ROLE_PERMISSION }o--|| PERMISSION : "grants"
    ADMIN_ACCOUNT ||--o{ ADMIN_AUDIT_LOG : "performs (admin_id)"
    ADMIN_ACCOUNT ||--o{ ADMIN_SESSION : "owns"
    ADMIN_ACCOUNT ||--o{ ADMIN_USER_ROLE : "assigned_by"
    ADMIN_ACCOUNT ||--o{ ROLE_PERMISSION : "granted_by"
```

## RBAC 角色 / 權限矩陣

從 ADMIN_IMPL.md §5.2 提取的內建角色：

| Role Name | 主要職責 | 預設 Permission（節選） |
|-----------|---------|-------------------------|
| `super_admin` | 全功能、TOTP 強制、可管理其他 admin | `*` (所有 permission) |
| `moderator` | 寵物 ban/unban、戰鬥旗標、處理可疑活動 | `pets.ban`, `pets.unban`, `battles.flag`, `suspicious.read` |
| `data_steward` | GDPR 處理、資料審計 | `gdpr.read`, `gdpr.process`, `audit.read` |
| `read_only_auditor` | 僅讀取儀表板與審計日誌 | `dashboard.read`, `audit.read` |
| `analyst` | 報表與儀表板（不含敏感資料） | `dashboard.read`, `analytics.read` |

## Permission 命名規範

格式：`{resource}.{action}`，全小寫，dot-separated。

| Category | 範例 Permission Codes |
|----------|----------------------|
| pets | `pets.list`, `pets.read`, `pets.ban`, `pets.unban` |
| arena | `battles.list`, `battles.read`, `battles.flag`, `battles.unflag` |
| config | `config.runtime.read`, `config.runtime.update`, `config.economy.read`, `config.economy.update` |
| gdpr | `gdpr.read`, `gdpr.process`, `gdpr.delete` |
| audit | `audit.read`, `audit.export` |
| dashboard | `dashboard.read`, `dashboard.read.sensitive` |
| admin_mgmt | `admin.list`, `admin.create`, `admin.deactivate`, `admin.role.assign`, `admin.totp.reset` |

## Audit Log 規範

- 所有 admin mutation 動作（任何 `POST/PUT/PATCH/DELETE`）必須寫一筆 audit log 記錄。
- `target_id` 統一為字串（避免 UUID/Integer 混用），`detail` 為 JSONB 可結構化查詢。
- 保留期 2 年（`admin_audit_log_retention_years = 2`）。
- `ip_address_hash` 為 SHA-256 hash，而非明文 IP（GDPR P6 minimization）。
