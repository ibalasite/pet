---
diagram: modulith-bc-isolation
uml-type: Component Diagram（Bounded Context Isolation）
source: docs/SCHEMA.md + docs/ARCH.md §2 + docs/EDD.md §3 BC ownership
generated: 2026-05-08T00:00:00Z
---

# BC Schema Isolation Diagram — pixel-pet-arena

> 來源：docs/SCHEMA.md table ownership + docs/ARCH.md §2 Component Architecture

每個 Bounded Context 擁有獨立的資料表群組，跨 BC 引用以「ID-only（no FK）」表示，避免直接耦合。
公共 API 介面以綠色實線標注，跨 BC 共用資料只能經 API 取得。

```mermaid
graph LR
    subgraph IdentityBC["identity BC"]
        direction TB
        I_ClaimIdentity[("claim_identities<br/>(id, email_hash,<br/>email_encrypted)")]
        I_ClaimCode[("claim_codes<br/>(id, pet_id*, code_hash,<br/>expires_at)")]
        I_API["Public API:<br/>startClaim(email, petId)<br/>verifyClaim(claimId, otp)<br/>recoverClaim(email, petId)"]
        I_API --> I_ClaimIdentity
        I_API --> I_ClaimCode
    end

    subgraph PetBC["pet BC"]
        direction TB
        P_Pet[("pets<br/>(id, seed, rarity,<br/>stats, owner_token_hash,<br/>claim_identity_id*)")]
        P_TrainingLog[("training_logs<br/>(id, pet_id, type,<br/>stat_delta)")]
        P_FoodBuff[("food_buffs<br/>(id, pet_id, buff_stat,<br/>magnitude, expires_at)")]
        P_API["Public API:<br/>findById(petId)<br/>train(petId, type)<br/>feed(petId, food)<br/>banByAdmin(petId, reason)"]
        P_API --> P_Pet
        P_API --> P_TrainingLog
        P_API --> P_FoodBuff
    end

    subgraph ArenaBC["arena BC"]
        direction TB
        A_ArenaMatch[("arena_matches<br/>(id, pet_a_id*, pet_b_id*,<br/>winner_pet_id*, mode,<br/>battle_log)")]
        A_API["Public API:<br/>enterArena(petId, mode)<br/>getMatch(matchId)<br/>history(petId, limit)"]
        A_API --> A_ArenaMatch
    end

    subgraph LeaderboardBC["leaderboard BC"]
        direction TB
        L_Snapshot[("leaderboard_snapshots<br/>(id, snapshot_time,<br/>entries JSONB)")]
        L_RedisZSet[("redis: leaderboard:global<br/>(authoritative ZSET<br/>petId → score)")]
        L_API["Public API:<br/>getTop(limit)<br/>getRank(petId)<br/>updateScore(petId, score)"]
        L_API --> L_Snapshot
        L_API --> L_RedisZSet
    end

    subgraph AdminBC["admin BC"]
        direction TB
        Ad_Account[("admin_accounts<br/>(id, username,<br/>password_hash, totp_secret,<br/>role)")]
        Ad_Audit[("admin_audit_log<br/>(id, admin_id, action,<br/>target_type, target_id)")]
        Ad_API["Public API:<br/>login(creds, totp)<br/>banPet(petId, reason)<br/>flagBattle(matchId)<br/>tuneConfig(key, value)"]
        Ad_API --> Ad_Account
        Ad_API --> Ad_Audit
    end

    subgraph GdprBC["gdpr BC"]
        direction TB
        G_Request[("gdpr_requests<br/>(id, claim_identity_id*,<br/>request_type, status)")]
        G_API["Public API:<br/>requestErasure(claimId)<br/>process(requestId)<br/>findByStatus(status)"]
        G_API --> G_Request
    end

    subgraph EmailBC["email BC"]
        direction TB
        E_API["Public API:<br/>sendOtp(to, code)<br/>sendErasureConfirm(to)"]
        E_External["External:<br/>SendGrid REST API"]
        E_API --> E_External
    end

    subgraph MarketplaceBC["marketplace BC (P3)"]
        direction TB
        M_Listing[("marketplace_listings<br/>(id, pet_id*,<br/>seller_token_hash, price)")]
        M_Transaction[("marketplace_transactions<br/>(id, listing_id,<br/>pet_id*, buyer_token_hash)")]
        M_API["Public API:<br/>listForSale(petId, price)<br/>buyListing(listingId)<br/>cancelListing(listingId)"]
        M_API --> M_Listing
        M_API --> M_Transaction
    end

    %% Public API 綠色實線（合法跨 BC 呼叫）
    I_API ==>|"sync API call"| P_API
    P_API ==>|"sync API call"| A_API
    A_API ==>|"sync API call"| L_API
    P_API ==>|"sync API call"| L_API
    Ad_API ==>|"sync API call"| P_API
    Ad_API ==>|"sync API call"| A_API
    Ad_API ==>|"sync API call"| G_API
    G_API ==>|"sync API call"| P_API
    G_API ==>|"sync API call"| I_API
    M_API ==>|"sync API call"| P_API

    %% ID-only cross-BC reference（紅色虛線，禁止直接 FK）
    P_Pet -.->|"ID-only<br/>claim_identity_id<br/>(no FK enforcement)"| I_ClaimIdentity
    A_ArenaMatch -.->|"ID-only<br/>pet_a_id / pet_b_id"| P_Pet
    G_Request -.->|"ID-only<br/>claim_identity_id"| I_ClaimIdentity
    Ad_Audit -.->|"ID-only<br/>target_id (varchar)<br/>generic reference"| P_Pet
    Ad_Audit -.->|"ID-only<br/>target_id"| A_ArenaMatch
    M_Listing -.->|"ID-only<br/>pet_id"| P_Pet
    M_Transaction -.->|"ID-only<br/>pet_id"| P_Pet

    classDef bcBox fill:#f0f8ff,stroke:#369
    classDef apiBox fill:#e8ffe8,stroke:#063,color:#063
    classDef tableBox fill:#fff4e0,stroke:#963

    class IdentityBC,PetBC,ArenaBC,LeaderboardBC,AdminBC,GdprBC,EmailBC bcBox
    class MarketplaceBC bcBox
    class I_API,P_API,A_API,L_API,Ad_API,G_API,E_API,M_API apiBox

    linkStyle 13 stroke:#ff0000,stroke-dasharray: 5 5
    linkStyle 14 stroke:#ff0000,stroke-dasharray: 5 5
    linkStyle 15 stroke:#ff0000,stroke-dasharray: 5 5
    linkStyle 16 stroke:#ff0000,stroke-dasharray: 5 5
    linkStyle 17 stroke:#ff0000,stroke-dasharray: 5 5
    linkStyle 18 stroke:#ff0000,stroke-dasharray: 5 5
    linkStyle 19 stroke:#ff0000,stroke-dasharray: 5 5
```

## BC 邊界規則

1. **Schema 擁有權**：每張資料表只屬於一個 BC，由該 BC 的 Repository 獨佔讀寫。
2. **跨 BC 引用**：只允許 ID-only 引用（如 `pet_a_id UUID`），**禁止跨 BC 的外鍵約束**。
3. **跨 BC 取資**：只能經 Public API 呼叫對方 BC 的 Service，不得直接 SELECT 對方資料表。
4. **Domain Event**：跨 BC 的非同步協作透過 Domain Event 廣播，由消費者 BC 訂閱（解耦）。
5. **Phase 3 隔離**：`marketplace` BC 透過 Feature Flag `FF_MARKETPLACE` 控制；未啟用時整個 BC 模組不載入。

## 共享核心常數（Cross-BC）

僅以下類型為共享 Kernel（位於 `packages/shared`）：

- 共用 Enum：`Rarity`、`ArenaMode`、`TrainingType`、`GdprRequestType`、`AdminRole`
- 共用 ValueObject 型別：`UUID`、`DateTime`、`Money`、`TokenHash`
- 共用常數：CONSTANTS.md 的所有 numeric / string 常數（不含 secret）

## 違規偵測

CI 階段透過 `eslint-plugin-import` 規則檢查：

```javascript
// .eslintrc.js
'import/no-restricted-paths': ['error', {
  zones: [
    { target: './packages/identity/**', from: './packages/pet/repositories/**' },
    { target: './packages/pet/**', from: './packages/arena/repositories/**' },
    // ... (deny direct cross-BC repository imports)
  ]
}]
```
