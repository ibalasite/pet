@modulith @p0
Feature: Modulith Bounded-Context Contracts (Architecture Guardrails)
  As an engineering team
  We want to enforce strict boundaries between bounded contexts
  So that each module can be independently scaled, tested, and deployed

  # HC-1: Schema isolation between bounded contexts
  @TC-ARCH-HC1-01 @modulith @p0 @contract
  Scenario: Auth BC does not hold a direct FK to Arena BC tables
    Given the PostgreSQL schema is loaded from the current migration state
    When all foreign key constraints are enumerated from information_schema.referential_constraints
    Then no foreign key from the claim_identities or claim_codes tables references arena_matches or arena_matchmaking_queue
    And no foreign key from pets tables directly references food_buffs via a cross-BC join path
    And each bounded context owns its own tables with no shared mutable rows

  @TC-ARCH-HC1-02 @modulith @p0
  Scenario: Training BC tables are not directly referenced by Marketplace BC tables
    Given the PostgreSQL schema is loaded from the current migration state
    When foreign key constraints are enumerated for tables starting with "training_" and "food_buffs"
    Then no FK from marketplace_listings or marketplace_transactions references training_logs
    And no FK from marketplace tables references food_buffs rows by a direct foreign key

  # HC-2: Public interface contracts between bounded contexts
  @TC-ARCH-HC2-01 @modulith @p0 @contract
  Scenario: Arena BC reads pet stats only via the Pet domain service public interface
    Given the Arena module source files are scanned for database query patterns
    When all direct SQL queries or ORM calls in the Arena BC are enumerated
    Then no query in the Arena BC accesses pets.stat_speed or pets.stat_strength directly via raw SQL
    And all pet stat reads are routed through the PetStatsService public method signature

  @TC-ARCH-HC2-02 @modulith @p0 @contract
  Scenario: Leaderboard BC writes scores only via the LeaderboardService public write method
    Given the Leaderboard module source files are scanned
    When all Redis ZADD calls in the codebase are enumerated
    Then all ZADD calls targeting "leaderboard:global" originate only from the LeaderboardService module
    And no Arena route handler or Training route handler calls ZADD directly

  # HC-3: Domain event contract validation
  @TC-ARCH-HC3-01 @modulith @p0
  Scenario: BattleCompleted event carries the required fields for downstream consumers
    Given the Arena BC emits a BattleCompleted domain event
    When the event payload schema is validated against the published event contract
    Then the payload contains matchId winnerId loserId mode completedAt and newLeaderboardScore
    And the payload does not contain raw pet access tokens or email addresses
    And the event schema version is present in the payload envelope

  @TC-ARCH-HC3-02 @modulith @p0
  Scenario: PetClaimed event carries the required fields for Auth and Training BCs
    Given the Auth BC emits a PetClaimed domain event after claim verification
    When the event payload schema is validated against the published event contract
    Then the payload contains petId claimedAt and ownerTokenHash
    And the payload does not contain the plaintext email or the raw 32-byte token

  # HC-4: Redis namespace isolation between bounded contexts
  @TC-ARCH-HC4-01 @modulith @p0 @contract
  Scenario: Arena rate-limit keys use the prescribed namespace prefix
    Given the Arena BC creates a Redis rate-limit counter for pet "pet-ns-001"
    When the Redis key is inspected
    Then the key matches the pattern "rl:arena:pet-ns-001"
    And no Arena key uses the "rl:claim:" or "rl:admin:" namespace prefix

  @TC-ARCH-HC4-02 @modulith @p0 @contract
  Scenario: Claim rate-limit keys use the prescribed namespace and do not collide with arena keys
    Given the Auth BC creates a Redis rate-limit counter for email hash "email-hash-001"
    When all Redis keys matching "rl:claim:*" are listed
    Then the key "rl:claim:email-hash-001" exists
    And no key in the "rl:arena:*" namespace contains the email hash pattern
    And no key in the "rl:claim:*" namespace contains a pet UUID

  @TC-ARCH-HC4-03 @modulith @p0
  Scenario: Token blacklist keys are scoped to the Auth namespace
    Given the Auth BC writes a revoked token to Redis
    When the Redis key is inspected
    Then the key matches the pattern "token:blacklist:{sha256_hash}"
    And the TTL is set to 72 hours or less
    And no other BC writes to the "token:blacklist:*" namespace

  # HC-5: DAG dependency verification — no circular dependencies between BCs
  @TC-ARCH-HC5-01 @modulith @p0
  Scenario: Bounded context dependency graph contains no cycles
    Given the module import graph is derived from TypeScript barrel exports and DI registrations
    When a directed acyclic graph check is run on the BC dependency edges
    Then no cycle exists in the DAG
    And the import direction is: Arena -> Pet -> Auth (not reverse)
    And Leaderboard -> Arena -> Pet (not reverse)
    And Admin -> all BCs (Admin is a consumer-only leaf node)

  @TC-ARCH-HC5-02 @modulith @p0
  Scenario: Each bounded context exposes only its declared public API surface
    Given the source tree is scanned for cross-BC imports
    When imports from "arena" module into "auth" module files are searched
    Then no "auth" module file imports Arena implementation classes directly
    And all cross-BC communication uses the published service interface or domain event
