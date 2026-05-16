@p0 @smoke
Feature: Arena Battle System (US-ARENA-001, US-ARENA-002)
  As a competitive player
  I want to enter my pet in arena battles
  So that I can earn battle records and climb the leaderboard

  Background:
    Given pet "pet-alpha" with speed 60 strength 40 stamina 50 level 5 exists and is owned with token "token-alpha"
    And pet "pet-beta" with speed 55 strength 45 stamina 48 level 4 exists and is owned with token "token-beta"

  @TC-E2E-ARENA-001-01 @contract @smoke
  Scenario: Two pets match and complete a Race battle
    Given pet "pet-alpha" has 0 battles this hour in Redis key "rl:arena:pet-alpha"
    And pet "pet-beta" has 0 battles this hour in Redis key "rl:arena:pet-beta"
    When "token-alpha" sends POST /api/v1/arena/enter with petId "pet-alpha" mode "RACE" and acceptAI false
    And "token-beta" sends POST /api/v1/arena/enter with petId "pet-beta" mode "RACE" and acceptAI false
    Then the response for "pet-alpha" has status 200
    And the response body contains a "matchId" field
    And the response body "result" is "WIN" or "LOSS"
    And the database table arena_matches has a row with both "pet-alpha" and "pet-beta" and mode "RACE"

  @TC-E2E-ARENA-001-02 @smoke
  Scenario: AI fallback resolves when no human opponent found within 30 seconds
    Given pet "pet-alpha" has 0 battles this hour in Redis key "rl:arena:pet-alpha"
    And no other pet is in the matchmaking queue for mode "RACE"
    When "token-alpha" sends POST /api/v1/arena/enter with petId "pet-alpha" mode "RACE" and acceptAI true
    Then the response status is 200
    And the response body field "isAiOpponent" is true
    And the database table arena_matches has a row with "pet-alpha" and is_ai_opponent true

  @TC-E2E-ARENA-001-03 @contract
  Scenario: Matchmaking timeout returns 408 when acceptAI is false
    Given pet "pet-alpha" has 0 battles this hour in Redis key "rl:arena:pet-alpha"
    And no other pet is in the matchmaking queue for mode "RACE"
    When "token-alpha" sends POST /api/v1/arena/enter with petId "pet-alpha" mode "RACE" and acceptAI false
    Then the response status is 408
    And the response body error code is "MATCHMAKING_TIMEOUT"
    And the Redis counter "rl:arena:pet-alpha" is NOT incremented

  @TC-E2E-ARENA-001-04 @smoke
  Scenario: Arena rate limit blocks entry after 10 battles per hour
    Given pet "pet-alpha" has 10 battles this hour in Redis key "rl:arena:pet-alpha"
    When "token-alpha" sends POST /api/v1/arena/enter with petId "pet-alpha" mode "RACE" and acceptAI true
    Then the response status is 429
    And the response body error code is "RATE_LIMIT_EXCEEDED"
    And the response header "Retry-After" is present
    And pet "pet-alpha" is not added to the matchmaking queue

  @TC-E2E-ARENA-001-05
  Scenario: Battle outcome is deterministic with the same seed
    Given pet "pet-gamma" with speed 50 strength 30 stamina 40 level 3 exists and is owned with token "token-gamma"
    And pet "pet-delta" with speed 45 strength 35 stamina 38 level 3 exists and is owned with token "token-delta"
    And the battle engine is seeded with fixed random_seed 12345
    When battle outcome is calculated for "pet-gamma" vs "pet-delta" in mode "RACE" twice
    Then both calculations return the same winnerId
    And both battleLog event sequences are identical

  @TC-E2E-ARENA-001-06 @contract
  Scenario: Banned pet cannot enter arena
    Given the pet "pet-alpha" is banned with is_banned true in the database
    When "token-alpha" sends POST /api/v1/arena/enter with petId "pet-alpha" mode "RACE" and acceptAI false
    Then the response status is 403
    And the response body error code is "PET_BANNED"

  @TC-E2E-ARENA-001-07 @contract
  Scenario: Unauthenticated arena entry is rejected
    When an unauthenticated POST request is made to /api/v1/arena/enter with petId "pet-alpha" mode "RACE"
    Then the response status is 401
    And the response body error code is "UNAUTHORIZED"

  @TC-E2E-ARENA-001-08 @contract
  Scenario: Token that does not own the pet is rejected
    When "token-beta" sends POST /api/v1/arena/enter with petId "pet-alpha" mode "RACE" and acceptAI false
    Then the response status is 403
    And the response body error code is "NOT_OWNER"

  @TC-E2E-ARENA-001-09 @contract
  Scenario: Battle record is publicly readable by match ID
    Given an arena match "match-001" exists with winnerId "pet-alpha" and mode "RACE"
    When a GET request is made to /api/v1/arena/match/match-001 without authentication
    Then the response status is 200
    And the response body field "matchId" is "match-001"
    And the response body field "mode" is "RACE"
    And the response body field "winnerId" is "pet-alpha"

  @TC-E2E-ARENA-001-10 @contract
  Scenario: Battle history returns last 20 battles for a pet
    Given pet "pet-alpha" has 25 arena_matches records in the database
    When a GET request is made to /api/v1/arena/history/pet-alpha without authentication
    Then the response status is 200
    And the response body "battles" array contains exactly 20 entries
    And each entry has fields: matchId mode opponentPetId result completedAt

  @TC-E2E-ARENA-001-11
  Scenario: Pet banned by moderator cannot enter arena
    Given pet "pet-mod-003" exists with is_banned true
    And the pet owner holds token "token-mod-003"
    When "token-mod-003" sends POST /api/v1/arena/enter with petId "pet-mod-003" mode "RACE" and acceptAI false
    Then the response status is 403
    And the response body error code is "PET_BANNED"

  @TC-E2E-ARENA-002-01 @contract
  Scenario: Sumo mode resolves using strength stat not speed
    Given pet "pet-sumo-strong" with speed 30 strength 90 stamina 50 level 4 exists and is owned with token "token-sumo-strong"
    And pet "pet-sumo-fast" with speed 90 strength 30 stamina 50 level 4 exists and is owned with token "token-sumo-fast"
    And both pets have 0 battles this hour
    And the battle engine is seeded with fixed random_seed 99999
    When "token-sumo-strong" sends POST /api/v1/arena/enter with petId "pet-sumo-strong" mode "SUMO" and acceptAI false
    And "token-sumo-fast" sends POST /api/v1/arena/enter with petId "pet-sumo-fast" mode "SUMO" and acceptAI false
    Then the database arena_matches row has mode "SUMO"
    And the battle record winnerId is "pet-sumo-strong" reflecting the higher strength stat
