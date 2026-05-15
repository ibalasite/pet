Feature: Global Leaderboard (US-BOARD-001, US-ADMIN-002)

  @TC-SRV-BOARD-001
  Scenario: Leaderboard falls back to PostgreSQL snapshot when Redis is unavailable
    Given the Redis Upstash instance is unreachable
    And a PostgreSQL snapshot of leaderboard scores exists from the last sync
    When a client requests GET /api/v1/leaderboard
    Then the server responds with HTTP 200 using the PostgreSQL snapshot data
    And the response body contains "degraded": true

  @TC-SRV-BOARD-002
  Scenario: Leaderboard score is updated within the configured lag window after a battle
    Given pet "fast-pet-token" completes a Race battle and wins
    And the win increments the battles_won counter on pet "fast-pet-token" in the pets table
    When the leaderboard sync job runs against Redis using ZRANGE REV WITHSCORES
    Then the updated score for "fast-pet-token" is visible in GET /api/v1/leaderboard within (leaderboard_update_lag_max_seconds = 30) seconds
    And "fast-pet-token" appears at the correct rank position

  @TC-SRV-BOARD-003
  Scenario: Admin ban removes pet from leaderboard within the reflection time
    Given pet "cheating-pet-token" currently holds rank 3 on the leaderboard
    And a super admin is authenticated with a valid httpOnly SameSite=Strict admin session cookie
    When the admin issues a ban action via POST /admin/api/pets/cheating-pet-token/ban with a moderation reason under (admin_moderation_reason_max_chars = 500) characters
    Then "cheating-pet-token" is removed from the Redis leaderboard sorted set
    And within (leaderboard_ban_reflection_time_minutes = 5) minutes the pet no longer appears in GET /api/v1/leaderboard responses
    And an entry is written to admin_audit_log with action "BAN" and detail containing the moderation reason

  @TC-SRV-BOARD-004
  Scenario: Leaderboard displays top 100 pets publicly
    Given 200 pets with varying leaderboard scores in Redis leaderboard:global sorted set
    When GET /api/v1/leaderboard with page=1, limit=100 is called without authentication
    Then the system returns HTTP 200 with entries.length = 100
    And each entry contains: rank, petId, petName, rarity, level, score, winRate
    And entries are sorted by score descending (highest rank first)
    And meta fields include total leaderboard size, page number, and limit

  @TC-SRV-BOARD-005
  Scenario: Leaderboard filterable by rarity tier
    Given the leaderboard contains pets of all rarity tiers (COMMON, RARE, EPIC, LEGENDARY)
    When GET /api/v1/leaderboard?rarity=EPIC is called
    Then only EPIC-rarity pets are returned in the entries array
    And meta.total reflects the filtered count

  @TC-SRV-BOARD-006
  Scenario: Leaderboard score calculation from formula
    Given a pet with win_rate = 0.75, battles_played = 40, level = 5
    When arena_score is calculated using: win_rate × battles_played × level_multiplier(5)
    Then this score is used for leaderboard ranking

  @TC-SRV-BOARD-007
  Scenario: Pet rank query for individual pet
    Given a pet with petId "pet-uuid-005" ranked 42nd on the leaderboard
    When GET /api/v1/leaderboard/rank/pet-uuid-005 is called without authentication
    Then the system returns HTTP 200 with rank = 42 and the calculated_score_value

  @TC-SRV-BOARD-008
  Scenario: Erased GDPR pet removed from leaderboard
    Given a pet belonging to a user who submitted GDPR erasure request
    And the pet is currently ranked on the leaderboard
    When the GDPR erasure background job completes
    Then Redis ZREM is called to remove the pet from leaderboard:global
    And subsequent GET /api/v1/leaderboard queries no longer include that pet
