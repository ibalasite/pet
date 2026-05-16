@p1
Feature: Pet Rarity Distribution and Display (US-PET-002, US-RARITY-001)
  As a collector
  I want each pet to have a verifiable rarity score
  So that I can trust that Legendary pets are genuinely rare

  @TC-E2E-PET-001-01 @smoke @contract
  Scenario: Random pet generation returns a complete pet object
    Given no active reservation exists for seed "pet-seed-rnd-001"
    When a visitor requests a random pet from the generation API
    Then the response status is 200
    And the response body contains id seed rarity petName and stats
    And the response body contains generationMeta with algorithm version rarity roll and collision count
    And the response body contains reservedUntil timestamp

  @TC-E2E-PET-001-02 @contract
  Scenario: Random pet generation returns 503 when generation pool is exhausted
    Given the database pets table already contains seeds matching the first 3 generated seeds
    When a visitor requests a random pet from the generation API
    Then the response status is 503
    And the response body error code is "INTERNAL_SERVER_ERROR"

  @TC-E2E-RARITY-001-01
  Scenario: Pet generation follows the 60-25-12-3 rarity distribution within tolerance
    Given the pet generation algorithm uses the constants: Common 60% Rare 25% Epic 12% Legendary 3%
    When the pet generation algorithm is applied to 10000 unique seeds
    Then the Common count is between 5800 and 6200
    And the Rare count is between 2300 and 2700
    And the Epic count is between 1000 and 1400
    And the Legendary count is between 150 and 450

  @TC-E2E-RARITY-001-02
  Scenario: Rarity weights sum to exactly 100 percent
    Given the rarity weights are Common 60 Rare 25 Epic 12 Legendary 3
    When the weights are summed
    Then the total is exactly 100

  @TC-E2E-RARITY-001-03
  Scenario: Rarity is deterministic for the same seed
    Given the pet generation algorithm uses the constants: Common 60% Rare 25% Epic 12% Legendary 3%
    When the pet generation algorithm is applied to seed 12345
    And the pet generation algorithm is applied to seed 12345 a second time
    Then both results return the same rarity value

  @TC-E2E-RARITY-001-04 @contract
  Scenario: Random pet API response includes rarity field with valid tier
    When a GET request is made to /api/v1/pets/random without authentication
    Then the response status is 200
    And the response body "data.rarity" is one of "COMMON" "RARE" "EPIC" "LEGENDARY"
    And the response body "data.generationMeta" contains all 6 dimension fields

  @TC-E2E-RARITY-001-05 @contract
  Scenario: Pet API returns rarity for claimed pet
    Given pet "pet-rare-001" with rarity "RARE" exists in the database
    When a GET request is made to /api/v1/pets/pet-rare-001 without authentication
    Then the response status is 200
    And the response body "data.rarity" is "RARE"

  @TC-E2E-RARITY-001-06 @contract
  Scenario: Leaderboard entries include rarity field for filtering
    Given the Redis sorted set "leaderboard:global" contains pets with rarity "LEGENDARY"
    When a GET request is made to /api/v1/leaderboard with query param rarity=LEGENDARY without authentication
    Then the response status is 200
    And all entries in "data.entries" have rarity "LEGENDARY"

  @TC-E2E-RARITY-001-07
  Scenario: Pet generation collision retry works up to 3 attempts then returns 503
    Given the database pets table already contains seeds matching the first 3 generated seeds
    When a GET request is made to /api/v1/pets/random without authentication
    Then the response status is 503
    And the response body error code is "INTERNAL_SERVER_ERROR"

  @TC-E2E-RARITY-001-08
  Scenario: Pet generation combination space exceeds 1 billion distinct combinations
    Given the generation algorithm dimension counts are known from constants
    When the total combination space is calculated as body_count times head_count times color_palette_count times accessory_count times rarity_trait_count times pattern_count
    Then the product exceeds 1000000000
