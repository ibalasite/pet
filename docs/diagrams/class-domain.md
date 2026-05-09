---
diagram: class-domain
uml-type: 類別圖 — Domain Layer
source: docs/EDD.md §4.5.2
generated: 2026-05-10T00:50:00Z
---

# Class Diagram — Domain Layer

Domain 層包含 6 個 Aggregate Root（Pet / ClaimIdentity / ClaimCode / ArenaMatch / TrainingLog / FoodBuff）、5 個 ValueObject、2 個 DomainService（PetGenerationService、BattleCalculator）、1 個 AbstractEntity（BaseEntity）、1 個 interface（IDomainEvent）與 2 個 DomainEvent。本圖滿足 QG-UML-02，6 種 UML 關聯（Inheritance / Realization / Composition / Aggregation / Association / Dependency）皆至少出現 1 次。

```mermaid
classDiagram
    class Pet {
        <<Entity>>
        +UUID id
        +long seed
        +Rarity rarity
        +PetStats stats
        +int level
        +bool isBanned
        +train(type) PetStats
        +applyBuff(buff) PetStats
        +ban(reason)
    }
    class PetStats {
        <<ValueObject>>
        +int speed
        +int strength
        +int stamina
        +int level
    }
    class Rarity {
        <<ValueObject>>
        <<enumeration>>
        COMMON
        RARE
        EPIC
        LEGENDARY
    }
    class ClaimIdentity {
        <<Entity>>
        +UUID id
        +string emailHash
        +bytes emailEncrypted
        +DateTime deletionRequestedAt
        +requestErasure()
    }
    class ClaimCode {
        <<Entity>>
        +UUID id
        +UUID petId
        +string codeHash
        +DateTime expiresAt
        +bool verify(plaintext) bool
    }
    class ArenaMatch {
        <<Entity>>
        +UUID id
        +UUID petAId
        +UUID petBId
        +ArenaMode mode
        +UUID winnerPetId
        +long randomSeed
        +calculateOutcome() OutcomeResult
    }
    class ArenaMode {
        <<ValueObject>>
        <<enumeration>>
        RACE
        SUMO
    }
    class TrainingLog {
        <<Entity>>
        +UUID id
        +UUID petId
        +TrainingType type
        +int statDelta
    }
    class FoodBuff {
        <<Entity>>
        +UUID id
        +UUID petId
        +BuffStat stat
        +int magnitude
        +bool isPermanent
        +DateTime expiresAt
    }
    class LeaderboardEntry {
        <<ValueObject>>
        +UUID petId
        +double score
        +int rank
    }
    class PetGenerationService {
        <<DomainService>>
        +generate(seed) Pet
        +rollRarity(weights) Rarity
    }
    class BattleCalculator {
        <<DomainService>>
        +calculate(petA, petB, mode, seed) OutcomeResult
    }
    class OutcomeResult {
        <<ValueObject>>
        +UUID winnerId
        +int statDeltaA
        +int statDeltaB
    }
    class BaseEntity {
        <<AbstractEntity>>
        +UUID id
        +DateTime createdAt
        +DateTime updatedAt
        +equals(other) bool
    }
    class IDomainEvent {
        <<interface>>
        +string eventName
        +DateTime occurredAt
        +UUID aggregateId
    }
    class PetClaimedEvent {
        <<DomainEvent>>
        +UUID petId
        +UUID claimIdentityId
        +DateTime claimedAt
    }
    class ArenaMatchCompletedEvent {
        <<DomainEvent>>
        +UUID matchId
        +UUID winnerPetId
        +DateTime completedAt
    }

    BaseEntity <|-- Pet : inheritance
    BaseEntity <|-- ClaimIdentity : inheritance
    BaseEntity <|-- ClaimCode : inheritance
    BaseEntity <|-- ArenaMatch : inheritance
    BaseEntity <|-- TrainingLog : inheritance
    BaseEntity <|-- FoodBuff : inheritance
    PetClaimedEvent ..|> IDomainEvent : realization
    ArenaMatchCompletedEvent ..|> IDomainEvent : realization
    Pet "1" *-- "1" PetStats : composition
    Pet "1" --> "1" Rarity : association
    Pet "1" o-- "*" TrainingLog : aggregation
    Pet "1" o-- "*" FoodBuff : aggregation
    ClaimIdentity "1" o-- "*" Pet : aggregation
    ClaimCode "1" --> "1" Pet : association
    ArenaMatch "1" --> "1" ArenaMode : association
    ArenaMatch "*" --> "*" Pet : association
    PetGenerationService ..> Pet : dependency
    BattleCalculator ..> Pet : dependency
    BattleCalculator ..> OutcomeResult : dependency
```

> 6 種 UML 關聯齊備：Inheritance、Realization、Composition、Aggregation、Association、Dependency — 滿足 §4.5.10 QG-UML-02。
