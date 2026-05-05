---
diagram: class-inventory
type: Class Inventory
source: class-domain.md, class-application.md, class-infra-presentation.md, class-services.md
generated: 2026-05-05T00:00:00Z
---

# Class Inventory — pixel-pet-arena

> Cross-reference of all classes across Domain, Application, and Infrastructure+Presentation layers.

## Domain Layer (`class-domain.md`)

| Class | Stereotype | Layer | Test File |
|-------|-----------|-------|-----------|
| Pet | `<<AggregateRoot>>` | Domain | `packages/game-api/src/__tests__/domain/Pet.test.ts` |
| ClaimIdentity | `<<Entity>>` | Domain | `packages/game-api/src/__tests__/domain/ClaimIdentity.test.ts` |
| ClaimCode | `<<Entity>>` | Domain | `packages/game-api/src/__tests__/domain/ClaimCode.test.ts` |
| ArenaMatch | `<<AggregateRoot>>` | Domain | `packages/game-api/src/__tests__/domain/ArenaMatch.test.ts` |
| TrainingLog | `<<Entity>>` | Domain | `packages/game-api/src/__tests__/domain/TrainingLog.test.ts` |
| LeaderboardSnapshot | `<<Entity>>` | Domain | `packages/game-api/src/__tests__/domain/LeaderboardSnapshot.test.ts` |
| FoodBuff | `<<Entity>>` | Domain | `packages/game-api/src/__tests__/domain/FoodBuff.test.ts` |
| AdminUser | `<<Entity>>` | Domain | `packages/admin-api/src/__tests__/domain/AdminUser.test.ts` |
| AuditLog | `<<Entity>>` | Domain | `packages/admin-api/src/__tests__/domain/AuditLog.test.ts` |
| GdprRequest | `<<Entity>>` | Domain | `packages/game-api/src/__tests__/domain/GdprRequest.test.ts` |
| RarityType | `<<enumeration>>` | Domain | (inline in Pet tests) |
| TrainingType | `<<enumeration>>` | Domain | (inline in TrainingLog tests) |
| ArenaMode | `<<enumeration>>` | Domain | (inline in ArenaMatch tests) |
| MatchStatus | `<<enumeration>>` | Domain | (inline in ArenaMatch tests) |
| PetState | `<<enumeration>>` | Domain | (inline in Pet tests) |
| IPetRepository | `<<Repository>>` | Domain | (mock in PetService tests) |
| IClaimRepository | `<<Repository>>` | Domain | (mock in ClaimUseCase tests) |
| IArenaRepository | `<<Repository>>` | Domain | (mock in ArenaUseCase tests) |
| ITrainingRepository | `<<Repository>>` | Domain | (mock in TrainPetUseCase tests) |
| ILeaderboardRepository | `<<Repository>>` | Domain | (mock in LeaderboardUseCase tests) |
| IIdentityRepository | `<<Repository>>` | Domain | (mock in VerifyClaimUseCase tests) |
| IFoodRepository | `<<Repository>>` | Domain | (mock in FeedPetUseCase tests) |
| IGdprRepository | `<<Repository>>` | Domain | (mock in GdprUseCase tests) |
| IAuditRepository | `<<Repository>>` | Domain | (mock in AdminBanPetUseCase tests) |

## Application Layer (`class-application.md`)

| Class | Stereotype | Layer | Test File |
|-------|-----------|-------|-----------|
| ClaimPetUseCase | `<<UseCase>>` | Application | `packages/game-api/src/__tests__/usecases/ClaimPetUseCase.test.ts` |
| VerifyClaimUseCase | `<<UseCase>>` | Application | `packages/game-api/src/__tests__/usecases/VerifyClaimUseCase.test.ts` |
| TrainPetUseCase | `<<UseCase>>` | Application | `packages/game-api/src/__tests__/usecases/TrainPetUseCase.test.ts` |
| FeedPetUseCase | `<<UseCase>>` | Application | `packages/game-api/src/__tests__/usecases/FeedPetUseCase.test.ts` |
| EnterArenaUseCase | `<<UseCase>>` | Application | `packages/game-api/src/__tests__/usecases/EnterArenaUseCase.test.ts` |
| ResolveMatchUseCase | `<<UseCase>>` | Application | `packages/game-api/src/__tests__/usecases/ResolveMatchUseCase.test.ts` |
| GetLeaderboardUseCase | `<<UseCase>>` | Application | `packages/game-api/src/__tests__/usecases/GetLeaderboardUseCase.test.ts` |
| AdminBanPetUseCase | `<<UseCase>>` | Application | `packages/admin-api/src/__tests__/usecases/AdminBanPetUseCase.test.ts` |
| ProcessGdprErasureUseCase | `<<UseCase>>` | Application | `packages/game-api/src/__tests__/usecases/ProcessGdprErasureUseCase.test.ts` |
| ClaimPetCommand | `<<DTO>>` | Application | (inline in ClaimPetUseCase tests) |
| VerifyClaimCommand | `<<DTO>>` | Application | (inline in VerifyClaimUseCase tests) |
| TrainPetCommand | `<<DTO>>` | Application | (inline in TrainPetUseCase tests) |
| EnterArenaCommand | `<<DTO>>` | Application | (inline in EnterArenaUseCase tests) |
| ClaimPetResponseDTO | `<<DTO>>` | Application | (inline in ClaimPetUseCase tests) |
| VerifyClaimResponseDTO | `<<DTO>>` | Application | (inline in VerifyClaimUseCase tests) |
| TrainResultDTO | `<<DTO>>` | Application | (inline in TrainPetUseCase tests) |
| ArenaEntryDTO | `<<DTO>>` | Application | (inline in EnterArenaUseCase tests) |
| LeaderboardDTO | `<<DTO>>` | Application | (inline in GetLeaderboardUseCase tests) |
| LeaderboardQuery | `<<DTO>>` | Application | (inline in GetLeaderboardUseCase tests) |
| IEmailPort | `<<Port>>` | Application | (mock in ClaimPetUseCase tests) |
| IRateLimitPort | `<<Port>>` | Application | (mock in TrainPetUseCase + EnterArenaUseCase tests) |
| IMatchQueuePort | `<<Port>>` | Application | (mock in EnterArenaUseCase tests) |
| ILeaderboardPort | `<<Port>>` | Application | (mock in GetLeaderboardUseCase tests) |

## Infrastructure + Presentation Layer (`class-infra-presentation.md`)

| Class | Stereotype | Layer | Test File |
|-------|-----------|-------|-----------|
| PetController | `<<Controller>>` | Presentation | `packages/game-api/src/__tests__/routes/pet.routes.test.ts` |
| ArenaController | `<<Controller>>` | Presentation | `packages/game-api/src/__tests__/routes/arena.routes.test.ts` |
| LeaderboardController | `<<Controller>>` | Presentation | `packages/game-api/src/__tests__/routes/leaderboard.routes.test.ts` |
| AdminController | `<<Controller>>` | Presentation | `packages/admin-api/src/__tests__/routes/admin.routes.test.ts` |
| TrainPetRequestDTO | `<<RequestDTO>>` | Presentation | (inline in PetController tests) |
| ClaimStartRequestDTO | `<<RequestDTO>>` | Presentation | (inline in PetController tests) |
| ClaimVerifyRequestDTO | `<<RequestDTO>>` | Presentation | (inline in PetController tests) |
| ArenaEnterRequestDTO | `<<RequestDTO>>` | Presentation | (inline in ArenaController tests) |
| PetResponseDTO | `<<ResponseDTO>>` | Presentation | (inline in PetController tests) |
| MatchResponseDTO | `<<ResponseDTO>>` | Presentation | (inline in ArenaController tests) |
| LeaderboardResponseDTO | `<<ResponseDTO>>` | Presentation | (inline in LeaderboardController tests) |
| PetRepositoryImpl | `<<RepositoryImpl>>` | Infrastructure | `packages/game-api/src/__tests__/infra/PetRepositoryImpl.test.ts` |
| ClaimRepositoryImpl | `<<RepositoryImpl>>` | Infrastructure | `packages/game-api/src/__tests__/infra/ClaimRepositoryImpl.test.ts` |
| TrainingRepositoryImpl | `<<RepositoryImpl>>` | Infrastructure | `packages/game-api/src/__tests__/infra/TrainingRepositoryImpl.test.ts` |
| ArenaRepositoryImpl | `<<RepositoryImpl>>` | Infrastructure | `packages/game-api/src/__tests__/infra/ArenaRepositoryImpl.test.ts` |
| LeaderboardRepositoryImpl | `<<RepositoryImpl>>` | Infrastructure | `packages/game-api/src/__tests__/infra/LeaderboardRepositoryImpl.test.ts` |
| EmailAdapter | `<<Adapter>>` | Infrastructure | `packages/game-api/src/__tests__/infra/EmailAdapter.test.ts` |
| RedisRateLimitAdapter | `<<Adapter>>` | Infrastructure | `packages/game-api/src/__tests__/infra/RedisRateLimitAdapter.test.ts` |
| RedisMatchQueueAdapter | `<<Adapter>>` | Infrastructure | `packages/game-api/src/__tests__/infra/RedisMatchQueueAdapter.test.ts` |
| RedisLeaderboardAdapter | `<<Adapter>>` | Infrastructure | `packages/game-api/src/__tests__/infra/RedisLeaderboardAdapter.test.ts` |

## Service Layer (`class-services.md`)

| Class | Stereotype | Layer | Test File |
|-------|-----------|-------|-----------|
| PetService | `<<ApplicationService>>` | Application | `packages/game-api/src/__tests__/services/PetService.test.ts` |
| ClaimService | `<<ApplicationService>>` | Application | `packages/game-api/src/__tests__/services/ClaimService.test.ts` |
| ArenaService | `<<ApplicationService>>` | Application | `packages/game-api/src/__tests__/services/ArenaService.test.ts` |
| LeaderboardService | `<<ApplicationService>>` | Application | `packages/game-api/src/__tests__/services/LeaderboardService.test.ts` |
| AdminService | `<<ApplicationService>>` | Application | `packages/admin-api/src/__tests__/services/AdminService.test.ts` |
