Feature: Global Leaderboard (US-BOARD-001, US-ADMIN-002)

  Scenario: Leaderboard falls back to PostgreSQL snapshot when Redis is unavailable
    Given the Redis Upstash instance is unreachable
    And a PostgreSQL snapshot of leaderboard scores exists from the last sync
    When a client requests GET /api/v1/leaderboard
    Then the server responds with HTTP 200 using the PostgreSQL snapshot data
    And the response body contains "degraded": true

  Scenario: Leaderboard score is updated within the configured lag window after a battle
    Given pet "fast-pet-token" completes a Race battle and wins
    And the win increments "fast-pet-token" score in the battle result record
    When the leaderboard sync job runs against Redis using ZRANGE REV WITHSCORES
    Then the updated score for "fast-pet-token" is visible in GET /api/v1/leaderboard within (leaderboard_update_lag_max_seconds = 30) seconds
    And "fast-pet-token" appears at the correct rank position

  Scenario: Admin ban removes pet from leaderboard within the reflection time
    Given pet "cheating-pet-token" currently holds rank 3 on the leaderboard
    And a super admin is authenticated with a valid httpOnly SameSite=Strict admin session cookie
    When the admin issues a ban action via POST /admin/api/pets/cheating-pet-token/ban with a moderation reason under (admin_moderation_reason_max_chars = 500) characters
    Then "cheating-pet-token" is removed from the Redis leaderboard sorted set
    And within (leaderboard_ban_reflection_time_minutes = 5) minutes the pet no longer appears in GET /api/v1/leaderboard responses
    And an entry is written to admin_audit_log with action "BAN" and detail containing the moderation reason
