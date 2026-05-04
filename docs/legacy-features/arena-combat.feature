Feature: Arena Combat System — Battle Matchmaking and Resolution
  As a pet owner
  I want to enter my pet into arena battles
  So that I can compete against other players and improve my leaderboard rank

  Scenario: Two pets matched and race battle completed
    Given petA with stat_speed = 50 is in the matchmaking queue for RACE mode
    And petB with stat_speed = 40 is in the matchmaking queue for RACE mode
    And both pets are authenticated with valid petTokens
    When both pets are matched within 30 seconds (arena_matchmaking_timeout_seconds)
    Then an arena_matches record is created with:
      | Field | Value |
      | pet_a_id | petA_id |
      | pet_b_id | petB_id |
      | mode | RACE |
      | is_ai_opponent | false |
    And the battle outcome is deterministically calculated from speed stats and random_seed
    And winner_pet_id is set to petA or petB based on effective speed after ±15% modifier
    And battleLog array is populated with event sequence
    And status HTTP 200 is returned with matchId and result (WIN|LOSS)

  Scenario: Sumo mode uses strength stat for outcome
    Given petA with stat_speed = 100, stat_strength = 10
    And petB with stat_speed = 10, stat_strength = 100
    And both pets enter arena for SUMO mode with the same fixed seed
    When the battle is calculated twice
    Then both calculations return the same winner (petB, strength-dominant)
    And in RACE mode with identical pets, petA would win (speed-dominant)
    And the mode parameter correctly determines the primary stat

  Scenario: AI fallback when no opponent found within timeout
    Given petA enters RACE arena with acceptAI = true
    And no opposing pet is available in the matchmaking queue after 30 seconds
    When the matchmaking timeout expires
    Then the system resolves an AI battle immediately
    And arena_matches.is_ai_opponent = true
    And arena_matches.pet_b_id = NULL (no actual opponent)
    And the result is calculated using an AI synthetic opponent
    And status HTTP 200 is returned (no timeout error)

  Scenario: Matchmaking timeout without AI fallback returns 408
    Given petA enters RACE arena with acceptAI = false (or acceptAI omitted)
    And no opposing pet is available after 30 seconds
    When the matchmaking timeout expires
    Then the system returns HTTP 408 with error code MATCHMAKING_TIMEOUT
    And no arena_matches record is created
    And arena rate limit is NOT incremented (timeout does not count as a battle)
    And the message suggests "Try again or enable AI opponent"

  Scenario: Arena battle rate limit enforced per pet per hour
    Given petA has completed 10 battles in the current hour (arena_battles_per_pet_per_hour_default)
    When petA attempts to enter an 11th arena battle
    Then the system returns HTTP 429 with Retry-After header (60 seconds)
    And the matchmaking request is rejected
    And the rate limit counter is not incremented

  Scenario: Arena rate limit counter reflects current tuning
    Given admin has tuned arena_battles_per_pet_per_hour to 5 (in the range [1, 50])
    And petA has completed 5 battles in the current hour
    When petA attempts a 6th arena battle
    Then the system returns HTTP 429 (rate limit exceeded at the new limit)
    And the applied limit reflects the admin-configured value

  Scenario: Battle outcome is deterministic with same seed
    Given petA (stat_speed = 50) and petB (stat_speed = 45) battle with fixed random_seed = 12345
    When the battle is calculated twice independently
    Then both calculations return the same winner and stat_delta values
    And battleLog event sequences are identical
    And the outcome can be replayed deterministically for viewing

  Scenario: Arena entry unauthenticated returns 401
    Given a request to POST /api/v1/arena/enter WITHOUT authentication header
    When the request is submitted
    Then the system returns HTTP 401 with error code UNAUTHORIZED
    And no matchmaking entry is created

  Scenario: Arena entry with wrong pet token returns 403
    Given petA owned by player X with petToken_X
    And player Y attempts to enter petA into arena with petToken_Y (different owner)
    When POST /api/v1/arena/enter is called with petToken_Y
    Then the system returns HTTP 403 with error code NOT_OWNER
    And no matchmaking entry is created

  Scenario: Banned pet cannot enter arena
    Given a pet with is_banned = true
    And a valid petToken for that pet
    When POST /api/v1/arena/enter is called with the banned pet's ID
    Then the system returns HTTP 403 with error code PET_BANNED
    And no matchmaking entry is created
