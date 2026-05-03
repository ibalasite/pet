Feature: Arena Battle System (US-ARENA-001, US-ARENA-002)

  Scenario: Two pets match and complete a Race battle
    Given pet "alpha-token-abc" and pet "beta-token-xyz" are both in the matchmaking queue
    And both pets have valid speed stats recorded in the database
    When the matchmaking service pairs the two pets via ZPOPMIN from the Redis queue
    Then a Race battle record is created with status "IN_PROGRESS" and mode "RACE"
    And the battle resolves within (arena_match_duration_max_seconds = 15) seconds
    And the pet with the higher effective speed (base stat plus up to ±15% random modifier) is recorded as the winner
    And both pets receive updated win/loss counts in their profiles

  Scenario: AI fallback when no real opponent is available after timeout
    Given pet "alpha-token-abc" has entered the matchmaking queue via POST /api/v1/arena/enter and is the only pet present
    And (arena_matchmaking_timeout_seconds = 30) seconds pass without a second pet joining
    When the matchmaking service triggers the AI fallback logic
    Then a Race battle is created pairing "alpha-token-abc" against an AI bot opponent
    And the battle record includes is_ai_opponent = true
    And the battle resolves within (arena_match_duration_max_seconds = 15) seconds

  Scenario: Arena rate limit prevents excessive battles per hour
    Given pet "alpha-token-abc" has already completed (arena_rate_limit_battles_per_hour_default = 10) battles within the current hour
    When pet "alpha-token-abc" attempts to enter the matchmaking queue via POST /api/v1/arena/enter
    Then the server responds with HTTP 429
    And the response body contains error code "ARENA_RATE_LIMIT_EXCEEDED"
    And pet "alpha-token-abc" is not added to the matchmaking queue

  Scenario: Sumo mode resolves outcome using strength stat instead of speed
    Given pet "sumo-token-001" with strength 85 and speed 40 is queued for a Sumo battle
    And pet "sumo-token-002" with strength 60 and speed 90 is queued for a Sumo battle
    When the matchmaking service pairs the two pets for a Sumo match
    Then a Sumo battle record is created with mode "SUMO"
    And the battle resolves within (arena_match_duration_max_seconds = 15) seconds
    And "sumo-token-001" is recorded as the winner because its strength stat is higher
    And the outcome is determined solely by the raw strength stat with no random modifier applied
