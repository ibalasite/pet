Feature: Pet Management — Generation, Display, and Stats
  As a player and game designer
  I want to view and manage pet data
  So that I can understand pet capabilities and progression

  Scenario: Random pet generation returns valid unclaimed pet
    Given a request to GET /api/v1/pets/random without authentication
    When the endpoint is called
    Then the system returns HTTP 200 with a new pet object
    And pet has fields: id (UUID), seed (unique), rarity (COMMON|RARE|EPIC|LEGENDARY), petName, stats (speed, strength, stamina, level)
    And generationMeta contains 6 fields: body, head, colorPalette, accessory, rarityTrait, pattern
    And stats.level equals 1 (default level for new pets)
    And stats.speed, stats.strength, stats.stamina each equal 10 (pet_stat_default)
    And rarity distribution across 10000 generations: Common ≈60%, Rare ≈25%, Epic ≈12%, Legendary ≈3% (within ±2% tolerance)
    And reservedUntil is set to NOW() + 24 hours (pet_reservation_ttl_hours)
    And owner_token_hash is NULL (pet is unclaimed)

  Scenario: Pet seed uniqueness is guaranteed
    Given 100 consecutive calls to GET /api/v1/pets/random
    When seeds from all 100 generated pets are collected
    Then no two pets share the same seed value
    And the uniqueness constraint pets(seed) UNIQUE is never violated

  Scenario: Retrieve claimed pet shows owner-only fields
    Given a claimed pet with petId "pet-uuid-003" and valid petToken
    When GET /api/v1/pets/:petId is called with Authorization: Bearer {petToken}
    Then the response includes:
      | Field | Value |
      | id | pet-uuid-003 |
      | isOwner | true |
      | claimedAt | ISO-8601 timestamp |
      | stats.level | calculated from total_training_actions |
      | isNeglected | true if last_trained_at is NULL or > 3 days ago |

  Scenario: Retrieve pet without authentication shows public data only
    Given a claimed pet with petId "pet-uuid-004"
    When GET /api/v1/pets/:petId is called WITHOUT authentication header
    Then the response includes all fields EXCEPT claimedAt and isOwner flags
    And isOwner field is set to false
    And status is HTTP 200 (no 401 error)

  Scenario: Pet stats panel shows training history summary
    Given a pet with 35 total training actions completed across 7 days
    When GET /api/v1/pets/:petId/stats is called
    Then the response includes:
      | Field | Expected Value |
      | totalTrainingActions | 35 |
      | trainingActionsToday | 1-3 (depends on current UTC day) |
      | actionsRemainingToday | 0-2 (training_actions_per_day = 3) |
      | level | FLOOR(35 / 10) = 3 |
      | isNeglected | false (if trained within 3 days) |

  Scenario: Neglected pet shows warning state
    Given a pet with last_trained_at = NOW() - 4 days
    When GET /api/v1/pets/:petId/stats is called
    Then isNeglected = true
    And the response indicates visual neglect state should be displayed in UI

  Scenario: Nonexistent pet returns 404
    Given a request for pet ID "nonexistent-uuid-999"
    When GET /api/v1/pets/nonexistent-uuid-999 is called
    Then the system returns HTTP 404
    And error code is PET_NOT_FOUND
    And error message is "No pet found with this ID"
