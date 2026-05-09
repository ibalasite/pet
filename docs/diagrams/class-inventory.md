---
diagram: class-inventory
type: Class Inventory
source: class-domain.md, class-application.md, class-infra-presentation.md
generated: 2026-05-10T00:50:00Z
---

# Class Inventory — pixel-pet-arena

> Cross-reference of all classes across Domain, Application, and Infrastructure / Presentation layers, with implementation file paths and corresponding test files. lang_stack: Node.js (TypeScript) + Fastify; tests via Vitest under `tests/unit/` and `tests/integration/`.

## Domain Layer

| Class | Stereotype | Layer | src 路徑 | test 路徑 | TC-ID 前綴 |
|-------|-----------|-------|---------|----------|-----------|
| BaseEntity | AbstractEntity | Domain | `src/domain/shared/base-entity.ts` | `tests/unit/domain/shared/base-entity.test.ts` | TC-DOM-BASE |
| IDomainEvent | interface | Domain | `src/domain/shared/domain-event.ts` | `tests/unit/domain/shared/domain-event.test.ts` | TC-DOM-EVT |
| Pet | Entity | Domain | `src/domain/pet/pet.ts` | `tests/unit/domain/pet/pet.test.ts` | TC-DOM-PET |
| PetStats | ValueObject | Domain | `src/domain/pet/pet-stats.ts` | `tests/unit/domain/pet/pet-stats.test.ts` | TC-DOM-STATS |
| Rarity | ValueObject (enumeration) | Domain | `src/domain/pet/rarity.ts` | `tests/unit/domain/pet/rarity.test.ts` | TC-DOM-RAR |
| ClaimIdentity | Entity | Domain | `src/domain/identity/claim-identity.ts` | `tests/unit/domain/identity/claim-identity.test.ts` | TC-DOM-IDENT |
| ClaimCode | Entity | Domain | `src/domain/identity/claim-code.ts` | `tests/unit/domain/identity/claim-code.test.ts` | TC-DOM-CC |
| ArenaMatch | Entity | Domain | `src/domain/arena/arena-match.ts` | `tests/unit/domain/arena/arena-match.test.ts` | TC-DOM-AM |
| ArenaMode | ValueObject (enumeration) | Domain | `src/domain/arena/arena-mode.ts` | `tests/unit/domain/arena/arena-mode.test.ts` | TC-DOM-MODE |
| TrainingLog | Entity | Domain | `src/domain/pet/training-log.ts` | `tests/unit/domain/pet/training-log.test.ts` | TC-DOM-TL |
| FoodBuff | Entity | Domain | `src/domain/pet/food-buff.ts` | `tests/unit/domain/pet/food-buff.test.ts` | TC-DOM-FB |
| LeaderboardEntry | ValueObject | Domain | `src/domain/leaderboard/leaderboard-entry.ts` | `tests/unit/domain/leaderboard/leaderboard-entry.test.ts` | TC-DOM-LB |
| PetGenerationService | DomainService | Domain | `src/domain/pet/pet-generation.service.ts` | `tests/unit/domain/pet/pet-generation.service.test.ts` | TC-DOM-PGEN |
| BattleCalculator | DomainService | Domain | `src/domain/arena/battle-calculator.ts` | `tests/unit/domain/arena/battle-calculator.test.ts` | TC-DOM-BC |
| OutcomeResult | ValueObject | Domain | `src/domain/arena/outcome-result.ts` | `tests/unit/domain/arena/outcome-result.test.ts` | TC-DOM-OR |
| PetClaimedEvent | DomainEvent | Domain | `src/domain/pet/events/pet-claimed.event.ts` | `tests/unit/domain/pet/events/pet-claimed.event.test.ts` | TC-DOM-EVT-PC |
| ArenaMatchCompletedEvent | DomainEvent | Domain | `src/domain/arena/events/arena-match-completed.event.ts` | `tests/unit/domain/arena/events/arena-match-completed.event.test.ts` | TC-DOM-EVT-AMC |

## Application Layer

| Class | Stereotype | Layer | src 路徑 | test 路徑 | TC-ID 前綴 |
|-------|-----------|-------|---------|----------|-----------|
| ClaimPetUseCase | ApplicationService | Application | `src/application/identity/use-cases/claim-pet.use-case.ts` | `tests/unit/application/identity/claim-pet.use-case.test.ts` | TC-APP-CLAIM |
| VerifyClaimCodeUseCase | ApplicationService | Application | `src/application/identity/use-cases/verify-claim-code.use-case.ts` | `tests/unit/application/identity/verify-claim-code.use-case.test.ts` | TC-APP-VERIFY |
| TrainPetUseCase | ApplicationService | Application | `src/application/pet/use-cases/train-pet.use-case.ts` | `tests/unit/application/pet/train-pet.use-case.test.ts` | TC-APP-TRAIN |
| EnterArenaUseCase | ApplicationService | Application | `src/application/arena/use-cases/enter-arena.use-case.ts` | `tests/unit/application/arena/enter-arena.use-case.test.ts` | TC-APP-ARENA |
| BanPetUseCase | ApplicationService | Application | `src/application/admin/use-cases/ban-pet.use-case.ts` | `tests/unit/application/admin/ban-pet.use-case.test.ts` | TC-APP-BAN |
| ProcessGdprErasureUseCase | ApplicationService | Application | `src/application/identity/use-cases/process-gdpr-erasure.use-case.ts` | `tests/unit/application/identity/process-gdpr-erasure.use-case.test.ts` | TC-APP-GDPR |
| IClaimCodeService | interface | Application | `src/application/identity/ports/claim-code.service.interface.ts` | — | TC-APP-ICCS |
| ClaimCodeService | DomainService | Application | `src/application/identity/services/claim-code.service.ts` | `tests/unit/application/identity/claim-code.service.test.ts` | TC-APP-CCS |

## Infrastructure / Presentation Layer

| Class | Stereotype | Layer | src 路徑 | test 路徑 | TC-ID 前綴 |
|-------|-----------|-------|---------|----------|-----------|
| IPetRepository | interface | Infrastructure | `src/domain/pet/repositories/pet-repository.interface.ts` | — | TC-INF-IPR |
| PostgresPetRepository | Repository | Infrastructure | `src/infrastructure/pet/postgres-pet.repository.ts` | `tests/integration/pet/postgres-pet.repository.test.ts` | TC-INF-PPR |
| ICacheRepository | interface | Infrastructure | `src/domain/shared/cache-repository.interface.ts` | — | TC-INF-ICR |
| RedisCacheRepository | Repository | Infrastructure | `src/infrastructure/cache/redis-cache.repository.ts` | `tests/integration/cache/redis-cache.repository.test.ts` | TC-INF-RCR |
| IEmailDeliveryPort | interface | Infrastructure | `src/application/identity/ports/email-delivery.port.ts` | — | TC-INF-IEDP |
| SendGridEmailAdapter | Adapter | Infrastructure | `src/infrastructure/email/sendgrid-email.adapter.ts` | `tests/integration/email/sendgrid-email.adapter.test.ts` | TC-INF-SGEA |
| SmtpEmailAdapter | Adapter | Infrastructure | `src/infrastructure/email/smtp-email.adapter.ts` | `tests/integration/email/smtp-email.adapter.test.ts` | TC-INF-SMTP |
| EmailDeliveryWithFallback | Adapter | Infrastructure | `src/infrastructure/email/email-delivery-with-fallback.ts` | `tests/integration/email/email-delivery-with-fallback.test.ts` | TC-INF-EDF |
| ClaimController | Controller | Presentation | `src/presentation/http/controllers/claim.controller.ts` | `tests/integration/presentation/claim.controller.test.ts` | TC-PRE-CC |
| ArenaController | Controller | Presentation | `src/presentation/http/controllers/arena.controller.ts` | `tests/integration/presentation/arena.controller.test.ts` | TC-PRE-AC |
| AdminController | Controller | Presentation | `src/presentation/http/controllers/admin.controller.ts` | `tests/integration/presentation/admin.controller.test.ts` | TC-PRE-ADC |

## Summary

| Layer | Class Count |
|-------|------------:|
| Domain | 17 |
| Application | 8 |
| Infrastructure / Presentation | 11 |
| **Total** | **36** |

> 路徑慣例（Node.js / TypeScript）：
> - `src/domain/{bc}/*.ts` ↔ `tests/unit/domain/{bc}/*.test.ts`
> - `src/application/{bc}/use-cases/*.ts` ↔ `tests/unit/application/{bc}/*.test.ts`
> - `src/infrastructure/{bc}/*.ts` ↔ `tests/integration/{bc}/*.test.ts`
> - interface 不需獨立測試（由具體實作覆蓋）。
