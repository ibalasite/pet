---
diagram: class-application
uml-type: 類別圖 — Application Layer
source: docs/EDD.md §4.5.2
generated: 2026-05-10T00:50:00Z
---

# Class Diagram — Application Layer

Application 層由 6 個 UseCase（Claim / VerifyClaim / Train / EnterArena / BanPet / ProcessGdprErasure）以及 ClaimCodeService（透過 IClaimCodeService 介面）組成。UseCase 是 Application Service，由 Domain 層的 Repository / Port 注入依賴；BanPetUseCase 透過 PetBannedEvent 觸發 ProcessGdprErasureUseCase 級聯（cross-BC association）。

```mermaid
classDiagram
    class ClaimPetUseCase {
        <<ApplicationService>>
        -ClaimCodeService claimCodeSvc
        -PetRepository petRepo
        -EmailDeliveryPort email
        +execute(input) ClaimResult
    }
    class VerifyClaimCodeUseCase {
        <<ApplicationService>>
        -ClaimCodeService claimCodeSvc
        -PetRepository petRepo
        -TokenIssuer tokenIssuer
        +execute(input) PetTokenResult
    }
    class TrainPetUseCase {
        <<ApplicationService>>
        -PetRepository petRepo
        -RateLimiter rateLimit
        +execute(petId, type) TrainResult
    }
    class EnterArenaUseCase {
        <<ApplicationService>>
        -MatchmakingService matchSvc
        -BattleCalculator battleCalc
        -LeaderboardService leaderboardSvc
        +execute(input) MatchResult
    }
    class BanPetUseCase {
        <<ApplicationService>>
        -PetRepository petRepo
        -AuditLogger audit
        -LeaderboardService leaderboard
        +execute(petId, reason) BanResult
    }
    class ProcessGdprErasureUseCase {
        <<ApplicationService>>
        -GdprRequestRepository gdprRepo
        -IdentityRepository idRepo
        +execute(requestId) ErasureResult
    }
    class IClaimCodeService {
        <<interface>>
        +issue(email, petId) ClaimCode
        +verify(claimId, plaintext) bool
    }
    class ClaimCodeService {
        <<DomainService>>
        +issue(email, petId) ClaimCode
        +verify(claimId, plaintext) bool
    }

    ClaimPetUseCase ..> IClaimCodeService : dependency
    VerifyClaimCodeUseCase ..> IClaimCodeService : dependency
    ClaimCodeService <|.. IClaimCodeService : realization
    EnterArenaUseCase ..> BanPetUseCase : dependency (via event)
    BanPetUseCase --> ProcessGdprErasureUseCase : association
```

> 透過 Port-Adapter 模式維持 Application 層對 Infrastructure 的單向依賴，符合 Clean Architecture 規範。
