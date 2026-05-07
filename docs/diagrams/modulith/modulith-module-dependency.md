---
diagram: modulith-module-dependency
uml-type: Component Diagram（Spring Modulith Module Dependency DAG）
source: docs/ARCH.md §2 + docs/EDD.md §3.4 Bounded Contexts
generated: 2026-05-08T00:00:00Z
---

# Spring Modulith Module Dependency DAG — pixel-pet-arena

> 來源：docs/ARCH.md §2 Component Architecture + EDD.md §3 Bounded Contexts

雖然本系統採用 Node.js + Fastify（非 Spring），但 Bounded Context 的依賴關係仍以 Spring Modulith 風格的 DAG 表達，
確保模組間呼叫沒有循環依賴（HC-5 DAG 約束），並區分同步 Public API 與非同步 Domain Event。

```mermaid
graph TD
    Identity["identity<br/>身份與認領流程<br/>(ClaimIdentity / ClaimCode)"]
    Pet["pet<br/>寵物核心<br/>(Pet / TrainingLog / FoodBuff)"]
    Arena["arena<br/>對戰與媒合<br/>(ArenaMatch / Matchmaking)"]
    Leaderboard["leaderboard<br/>排行榜彙總<br/>(LeaderboardSnapshot)"]
    Gdpr["gdpr<br/>資料權利<br/>(GdprRequest / Erasure pipeline)"]
    Admin["admin<br/>管理員操作<br/>(AdminAccount / AuditLog)"]
    Email["email<br/>外部信件通道<br/>(SendGrid Adapter)"]
    Marketplace["marketplace<br/>(Phase 3 — FF_MARKETPLACE)<br/>(Listing / Transaction)"]

    %% 同步 Public API（實線）
    Identity -->|Public API: verify, recover| Pet
    Identity -->|Public API: notify OTP| Email
    Pet -->|Public API: enterArena| Arena
    Pet -->|Public API: addBuff| Pet
    Arena -->|Public API: updateScore| Leaderboard
    Pet -->|Public API: query| Leaderboard
    Admin -->|Public API: ban / unban| Pet
    Admin -->|Public API: flag battle| Arena
    Admin -->|Public API: tune config| Pet
    Admin -->|Public API: tune config| Arena
    Admin -->|Public API: process erasure| Gdpr
    Gdpr -->|Public API: erase pets| Pet
    Gdpr -->|Public API: erase identity| Identity
    Marketplace -->|Public API: read pet| Pet
    Marketplace -->|Public API: verify identity| Identity

    %% 非同步 Domain Event（虛線）
    Identity -.->|"PetClaimedEvent<br/>(Domain Event)"| Pet
    Pet -.->|"PetTrainedEvent<br/>(Domain Event)"| Leaderboard
    Pet -.->|"PetTrainedEvent<br/>(Domain Event)"| Admin
    Arena -.->|"ArenaMatchResolvedEvent<br/>(Domain Event)"| Leaderboard
    Arena -.->|"ArenaMatchResolvedEvent<br/>(Domain Event)"| Admin
    Gdpr -.->|"GdprErasureRequestedEvent<br/>(Domain Event)"| Email
    Pet -.->|"PetBannedEvent<br/>(Domain Event)"| Leaderboard
    Marketplace -.->|"MarketplaceTransactionEvent<br/>(Phase 3)"| Pet

    classDef coreModule fill:#e8f4ff,stroke:#369,color:#036
    classDef supportModule fill:#fff4e0,stroke:#963,color:#630
    classDef adminModule fill:#ffe8f4,stroke:#936,color:#603
    classDef externalModule fill:#e8ffe8,stroke:#393,color:#063
    classDef phase3Module fill:#f0f0f0,stroke:#999,color:#666,stroke-dasharray: 5 5

    class Identity,Pet,Arena,Leaderboard coreModule
    class Gdpr,Admin supportModule
    class Email externalModule
    class Marketplace phase3Module
```

## 圖例

- **實線箭頭（→）**：同步 Public API 呼叫（function call / HTTP within monorepo）
- **虛線箭頭（-.->）**：非同步 Domain Event（透過 EventBus 派送）
- **節點顏色**：
  - 藍色 = Core BC（核心領域：Identity / Pet / Arena / Leaderboard）
  - 橘色 = Supporting BC（支援領域：Gdpr / Admin）
  - 綠色 = External BC（外部整合：Email）
  - 灰色虛框 = Phase 3 BC（FF_MARKETPLACE 啟用後生效）

## 依賴方向驗證（DAG 約束）

按 topological sort 排列（無循環依賴）：

```
Identity → Pet → Arena → Leaderboard
        ↘ Email     ↘ Admin → (Pet, Arena, Gdpr)
        ↗ Gdpr      ↗
Marketplace → Pet, Identity (Phase 3 only)
```

✅ 無循環依賴；Identity / Email 為「下游葉節點」，Admin / Marketplace 為「上游觸發者」。

## 模組職責摘要

| Module | Owner BC | 主要 API | 對外 Domain Event |
|--------|---------|---------|------------------|
| `identity` | Identity Auth | `startClaim` / `verifyClaim` / `recoverClaim` | `PetClaimedEvent` |
| `pet` | Pet Core | `train` / `feed` / `getById` / `random` | `PetTrainedEvent`, `PetBannedEvent` |
| `arena` | Arena | `enterArena` / `getMatch` / `history` | `ArenaMatchResolvedEvent` |
| `leaderboard` | Leaderboard | `getTop` / `getRank` / `update` | （消費者） |
| `gdpr` | GDPR | `requestErasure` / `process` | `GdprErasureRequestedEvent` |
| `admin` | Admin | `login` / `ban` / `flag` / `tune` | （消費者 + 觸發者） |
| `email` | Email | `sendOtp` / `sendConfirmation` | （消費者） |
| `marketplace` | Marketplace (P3) | `list` / `buy` / `cancel` | `MarketplaceTransactionEvent` |
