@p0
Feature: Admin Moderation — Pet Banning and Leaderboard Management (US-ADMIN-001, US-ADMIN-002)
  As an admin moderator
  I want to ban disruptive pets and manage leaderboard integrity
  So that the arena remains fair for all players

  Background:
    Given a moderator admin "admin-mod-001" is authenticated with a valid session cookie

  @TC-E2E-MOD-001-01 @contract @smoke
  Scenario: Admin bans a pet and it is removed from the leaderboard
    Given pet "pet-mod-001" exists with is_banned false
    And pet "pet-mod-001" exists in the Redis sorted set "leaderboard:global" at rank 15
    When the admin sends POST /admin/api/pets/pet-mod-001/ban with reason "bot activity detected: 52 battles in 60 minutes"
    Then the response status is 200
    And the database pets row for "pet-mod-001" has is_banned true
    And the database pets row for "pet-mod-001" has banned_reason set
    And the Redis sorted set "leaderboard:global" does NOT contain "pet-mod-001"
    And the database admin_audit_log has a row with action "BAN" and admin_id "admin-mod-001" and target_id "pet-mod-001"

  @TC-E2E-MOD-001-02
  Scenario: Admin ban fails gracefully when database write fails
    Given pet "pet-mod-002" exists with is_banned false
    And pet "pet-mod-002" is in the Redis sorted set "leaderboard:global"
    And the database is configured to reject writes for this scenario
    When the admin sends POST /admin/api/pets/pet-mod-002/ban with reason "test failure"
    Then the response status is 500 or 503
    And the database pets row for "pet-mod-002" still has is_banned false
    And the Redis sorted set "leaderboard:global" still contains "pet-mod-002"

  @TC-E2E-MOD-001-03
  Scenario: Admin ban reason exceeding 500 characters is rejected
    Given pet "pet-mod-001" exists with is_banned false
    When the admin sends POST /admin/api/pets/pet-mod-001/ban with a reason of 501 characters
    Then the response status is 400
    And the response body error code is "VALIDATION_ERROR"
    And the database pets row for "pet-mod-001" still has is_banned false

  @TC-E2E-MOD-001-04 @contract
  Scenario: Banning a nonexistent pet returns 404
    When the admin sends POST /admin/api/pets/nonexistent-pet-uuid/ban with reason "test"
    Then the response status is 404
    And the response body error code is "PET_NOT_FOUND"

  @TC-E2E-MOD-002-01 @contract @smoke
  Scenario: Admin views top 500 pets with hourly battle counts for moderation
    Given the database contains 500 pets with varying arena_matches counts in the last hour
    When the admin sends GET /admin/api/pets with limit 500
    Then the response status is 200
    And the response body "data" array contains pet entries with petId rarity level and recent battle counts

  @TC-E2E-MOD-002-02
  Scenario: Leaderboard moderation removal takes effect within 5 minutes
    Given pet "pet-mod-004" exists in the Redis sorted set "leaderboard:global" at rank 3
    When the admin sends POST /admin/api/pets/pet-mod-004/ban with reason "cheating"
    Then the response status is 200
    And the Redis sorted set "leaderboard:global" does NOT contain "pet-mod-004"
    And a GET request to /api/v1/leaderboard returns entries that do not include "pet-mod-004"

  @TC-E2E-MOD-002-03
  Scenario: Leaderboard removal fails gracefully when Redis is unavailable
    Given pet "pet-mod-005" exists with is_banned false
    And pet "pet-mod-005" is in the Redis sorted set "leaderboard:global"
    And Redis is unavailable
    When the admin sends POST /admin/api/pets/pet-mod-005/ban with reason "bot"
    Then the response status is 500 or 503
    And the database pets row for "pet-mod-005" still has is_banned false

  @TC-E2E-MOD-002-04 @contract
  Scenario: Read-only admin cannot perform ban action
    Given a read_only admin "admin-readonly-001" is authenticated with a valid session cookie
    When the read_only admin sends POST /admin/api/pets/pet-mod-001/ban with reason "test"
    Then the response status is 403
    And the response body error code is "FORBIDDEN"
    And the database pets row for "pet-mod-001" is unchanged

  @TC-E2E-MOD-002-05
  Scenario: Audit log records every admin mutation in sequence
    Given pet "pet-audit-001" exists with is_banned false
    And the admin has previously banned "pet-audit-001" with reason "audit test"
    And the admin has previously unbanned "pet-audit-001" with reason "audit test unban"
    When the admin sends GET /admin/api/audit with limit 10
    Then the response status is 200
    And the response body contains at least 2 audit log entries for "pet-audit-001"
    And the entries include actions "BAN" and "UNBAN" with admin_id "admin-mod-001" in sequence
