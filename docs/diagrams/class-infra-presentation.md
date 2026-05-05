---
diagram: class-infra-presentation
uml-type: Class Diagram（Infrastructure + Presentation Layer）
source: EDD §3.8, EDD §5, ARCH §2, EDD §3.1–3.7
generated: 2026-05-05T00:00:00Z
---

# Class Diagram — Infrastructure + Presentation Layer — pixel-pet-arena

> 來源：EDD §3.8 Class Diagram, EDD §5 API Design, ARCH §2 Component Architecture

```mermaid
classDiagram
    direction TB

    class PetController {
        <<Controller>>
        -trainPetUseCase: TrainPetUseCase
        -feedPetUseCase: FeedPetUseCase
        -claimPetUseCase: ClaimPetUseCase
        -verifyClaimUseCase: VerifyClaimUseCase
        +getRandomPet(req: FastifyRequest) Promise~ResponseDTO~
        +getPetById(req: FastifyRequest) Promise~ResponseDTO~
        +trainPet(req: FastifyRequest) Promise~ResponseDTO~
        +feedPet(req: FastifyRequest) Promise~ResponseDTO~
        +startClaim(req: FastifyRequest) Promise~ResponseDTO~
        +verifyClaim(req: FastifyRequest) Promise~ResponseDTO~
    }

    class ArenaController {
        <<Controller>>
        -enterArenaUseCase: EnterArenaUseCase
        -resolveMatchUseCase: ResolveMatchUseCase
        +enterArena(req: FastifyRequest) Promise~ResponseDTO~
        +getMatchStatus(req: FastifyRequest) Promise~ResponseDTO~
        +getBattleHistory(req: FastifyRequest) Promise~ResponseDTO~
    }

    class LeaderboardController {
        <<Controller>>
        -getLeaderboardUseCase: GetLeaderboardUseCase
        +getLeaderboard(req: FastifyRequest) Promise~ResponseDTO~
        +getPetRank(req: FastifyRequest) Promise~ResponseDTO~
    }

    class AdminController {
        <<Controller>>
        -adminBanPetUseCase: AdminBanPetUseCase
        -processGdprErasureUseCase: ProcessGdprErasureUseCase
        +login(req: FastifyRequest) Promise~ResponseDTO~
        +banPet(req: FastifyRequest) Promise~ResponseDTO~
        +getAdminPets(req: FastifyRequest) Promise~ResponseDTO~
        +getRuntimeConfig(req: FastifyRequest) Promise~ResponseDTO~
        +updateRuntimeConfig(req: FastifyRequest) Promise~ResponseDTO~
        +getDashboard(req: FastifyRequest) Promise~ResponseDTO~
        +getAuditLogs(req: FastifyRequest) Promise~ResponseDTO~
    }

    class TrainPetRequestDTO {
        <<RequestDTO>>
        +petId: UUID
        +trainingType: String
        +accessToken: String
    }

    class ClaimStartRequestDTO {
        <<RequestDTO>>
        +email: String
        +petId: UUID
    }

    class ClaimVerifyRequestDTO {
        <<RequestDTO>>
        +claimId: UUID
        +code: String
    }

    class ArenaEnterRequestDTO {
        <<RequestDTO>>
        +petId: UUID
        +accessToken: String
        +mode: String
    }

    class PetResponseDTO {
        <<ResponseDTO>>
        +id: UUID
        +rarity: String
        +statSpeed: Integer
        +statStrength: Integer
        +statStamina: Integer
        +level: Integer
        +isBanned: Boolean
        +lastTrainedAt: DateTime
    }

    class MatchResponseDTO {
        <<ResponseDTO>>
        +matchId: UUID
        +status: String
        +winnerPetId: UUID
        +battleLog: Object
        +completedAt: DateTime
    }

    class LeaderboardResponseDTO {
        <<ResponseDTO>>
        +entries: List~LeaderboardEntryItem~
        +snapshotTime: DateTime
        +totalPets: Integer
    }

    class PetRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool: Pool
        +findById(petId: UUID) Promise~Pet~
        +findRandom() Promise~Pet~
        +save(pet: Pet) Promise~Pet~
        +update(pet: Pet) Promise~Pet~
        +banPet(petId: UUID, reason: String) Promise~void~
        +cleanupReserved(olderThanHours: Integer) Promise~Integer~
    }

    class ClaimRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool: Pool
        +create(claimCode: ClaimCode) Promise~ClaimCode~
        +findByClaimId(claimId: UUID) Promise~ClaimCode~
        +markUsed(claimId: UUID, usedAt: DateTime) Promise~void~
        +deleteExpired() Promise~Integer~
    }

    class TrainingRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool: Pool
        +countTodayActions(petId: UUID) Promise~Integer~
        +save(log: TrainingLog) Promise~TrainingLog~
        +findByPetId(petId: UUID, limit: Integer) Promise~List~TrainingLog~~
    }

    class ArenaRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool: Pool
        +create(match: ArenaMatch) Promise~ArenaMatch~
        +findById(matchId: UUID) Promise~ArenaMatch~
        +findByPetId(petId: UUID, limit: Integer) Promise~List~ArenaMatch~~
        +update(match: ArenaMatch) Promise~ArenaMatch~
    }

    class LeaderboardRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool: Pool
        -redis: Redis
        +getTop(limit: Integer) Promise~List~LeaderboardEntry~~
        +getRank(petId: UUID) Promise~Integer~
        +saveSnapshot(snapshot: LeaderboardSnapshot) Promise~void~
    }

    class EmailAdapter {
        <<Adapter>>
        -sendgridClient: SendGridClient
        -nodemailerClient: NodemailerTransport
        -consecutiveFailures: Integer
        +sendClaimOtp(email: String, code: String, petId: UUID) Promise~void~
        +sendClaimRecovery(email: String, petUrl: String) Promise~void~
        -switchToFallback() void
    }

    class RedisRateLimitAdapter {
        <<Adapter>>
        -redis: Redis
        +checkTrainingLimit(petId: UUID) Promise~boolean~
        +checkArenaLimit(petId: UUID) Promise~boolean~
        +checkClaimLimit(email: String) Promise~boolean~
        +incrementCounter(key: String, windowSeconds: Integer) Promise~Integer~
    }

    class RedisMatchQueueAdapter {
        <<Adapter>>
        -redis: Redis
        +enqueue(petId: UUID, mode: ArenaMode) Promise~void~
        +dequeue(timeoutSeconds: Integer) Promise~UUID~
        +getQueueLength() Promise~Integer~
    }

    class RedisLeaderboardAdapter {
        <<Adapter>>
        -redis: Redis
        +getTopPets(limit: Integer) Promise~List~LeaderboardEntryDTO~~
        +getRank(petId: UUID) Promise~Integer~
        +updateScore(petId: UUID, score: Integer) Promise~void~
    }

    PetController ..> TrainPetRequestDTO : validates
    PetController ..> ClaimStartRequestDTO : validates
    PetController ..> ClaimVerifyRequestDTO : validates
    PetController ..> PetResponseDTO : returns
    ArenaController ..> ArenaEnterRequestDTO : validates
    ArenaController ..> MatchResponseDTO : returns
    LeaderboardController ..> LeaderboardResponseDTO : returns
    PetRepositoryImpl ..|> IPetRepository : implements
    ClaimRepositoryImpl ..|> IClaimRepository : implements
    TrainingRepositoryImpl ..|> ITrainingRepository : implements
    ArenaRepositoryImpl ..|> IArenaRepository : implements
    LeaderboardRepositoryImpl ..|> ILeaderboardRepository : implements
    EmailAdapter ..|> IEmailPort : implements
    RedisRateLimitAdapter ..|> IRateLimitPort : implements
    RedisMatchQueueAdapter ..|> IMatchQueuePort : implements
    RedisLeaderboardAdapter ..|> ILeaderboardPort : implements
```
