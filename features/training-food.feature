@p0 @smoke
Feature: Pet Training and Food System (US-TRAIN-001, US-FOOD-001)
  As a pet owner
  I want to train my pet daily and feed it special food items
  So that its stats improve and it performs better in arena battles

  Background:
    Given pet "pet-train-001" with speed 20 strength 20 stamina 20 level 2 exists and is owned with token "token-train-001"

  @TC-E2E-TRAIN-001-01 @contract @smoke
  Scenario: Training action increments the correct stat within bounds
    Given pet "pet-train-001" has 0 training actions today
    When "token-train-001" sends POST /api/v1/pets/pet-train-001/train with trainingType "RUN"
    Then the response status is 200
    And the response body "updatedStats.speed" is between 21 and 23
    And the response body "statDelta" is between 1 and 3
    And the response body "actionsRemainingToday" is 2
    And the database pets row for "pet-train-001" has stat_speed between 21 and 23

  @TC-E2E-TRAIN-001-02 @smoke
  Scenario: Daily training limit of 3 actions is enforced
    Given pet "pet-train-001" has 3 training_logs rows for today in the database
    When "token-train-001" sends POST /api/v1/pets/pet-train-001/train with trainingType "STAMINA"
    Then the response status is 400
    And the response body error code is "TRAINING_LIMIT_REACHED"

  @TC-E2E-TRAIN-001-03
  Scenario: Training blocked when target stat is already at maximum of 100
    Given the database pets row for "pet-train-001" has stat_speed 100
    When "token-train-001" sends POST /api/v1/pets/pet-train-001/train with trainingType "RUN"
    Then the response status is 400
    And the response body error code is "STAT_AT_MAXIMUM"

  @TC-E2E-TRAIN-001-04 @contract
  Scenario: Unauthenticated training request is rejected
    When an unauthenticated POST request is made to /api/v1/pets/pet-train-001/train with trainingType "RUN"
    Then the response status is 401
    And the response body error code is "UNAUTHORIZED"

  @TC-E2E-TRAIN-001-05 @contract
  Scenario: Training with wrong owner token is rejected
    Given pet "pet-other-001" exists and is owned with token "token-other-001"
    When "token-other-001" sends POST /api/v1/pets/pet-train-001/train with trainingType "STRENGTH"
    Then the response status is 403
    And the response body error code is "NOT_OWNER"

  @TC-E2E-TRAIN-001-06
  Scenario: Pet stats and training summary are returned via stats endpoint
    Given pet "pet-train-001" has 2 training_logs rows for today in the database
    When a GET request is made to /api/v1/pets/pet-train-001/stats without authentication
    Then the response status is 200
    And the response body "trainingActionsToday" is 2
    And the response body "actionsRemainingToday" is 1
    And the response body "stats" contains speed strength stamina and level fields

  @TC-E2E-FOOD-001-01 @contract @smoke
  Scenario: Temporary food buff is applied and reflected in stats
    Given pet "pet-train-001" has 0 active food_buffs rows in the database
    When "token-train-001" sends POST /api/v1/pets/pet-train-001/feed with buffType "speed_berry" stat "speed" magnitude 5 and isPermanent false
    Then the response status is 200
    And the response body "buffApplied.stat" is "speed"
    And the response body "buffApplied.magnitude" is 5
    And the response body "buffApplied.isPermanent" is false
    And the response body "buffApplied.expiresAt" is a non-null ISO 8601 timestamp
    And the database food_buffs row for "pet-train-001" has expires_at set

  @TC-E2E-FOOD-001-02
  Scenario: Permanent food buff increments base stat with no expiry
    When "token-train-001" sends POST /api/v1/pets/pet-train-001/feed with buffType "power_mushroom" stat "strength" magnitude 3 and isPermanent true
    Then the response status is 200
    And the response body "buffApplied.isPermanent" is true
    And the response body "buffApplied.expiresAt" is null
    And the database pets row for "pet-train-001" has stat_strength incremented by 3

  @TC-E2E-FOOD-001-03
  Scenario: Feeding food buff blocked when target stat is already at maximum of 100
    Given the database pets row for "pet-train-001" has stat_strength 100
    When "token-train-001" sends POST /api/v1/pets/pet-train-001/feed with buffType "power_mushroom" stat "strength" magnitude 3 and isPermanent true
    Then the response status is 400
    And the response body error code is "STAT_AT_MAXIMUM"
    And the database food_buffs table has no new row for "pet-train-001"

  @TC-E2E-FOOD-001-04
  Scenario: Active temporary food buff is included in pet stats response
    Given pet "pet-train-001" has an active food_buffs row with stat "speed" magnitude 5 expires_at 24 hours from now
    When a GET request is made to /api/v1/pets/pet-train-001/stats without authentication
    Then the response status is 200
    And the response body "activeFoodBuffs" array contains one entry with stat "speed" magnitude 5 and isPermanent false

  @TC-E2E-FOOD-001-05
  Scenario: Active food buff stat is included in arena battle effective stat calculation
    Given pet "pet-train-001" has base stat_speed 50
    And pet "pet-train-001" has an active food_buffs row with stat "speed" magnitude 5 expires_at 24 hours from now
    And pet "pet-other-001" exists and is owned with token "token-other-001"
    And both pets have 0 battles this hour
    When "token-train-001" sends POST /api/v1/arena/enter with petId "pet-train-001" mode "RACE" and acceptAI false
    And "token-other-001" sends POST /api/v1/arena/enter with petId "pet-other-001" mode "RACE" and acceptAI false
    Then the arena_matches row for the completed battle has a battleLog referencing effective speed 55 for "pet-train-001"

  @TC-E2E-TRAIN-001-07
  Scenario Outline: Training type maps to the correct stat
    Given pet "pet-train-001" has 0 training actions today
    When "token-train-001" sends POST /api/v1/pets/pet-train-001/train with trainingType "<type>"
    Then the response status is 200
    And the response body "updatedStats.<stat>" is greater than 20

    Examples:
      | type     | stat     |
      | RUN      | speed    |
      | STRENGTH | strength |
      | STAMINA  | stamina  |
