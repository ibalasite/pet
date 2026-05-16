@p0
Feature: Suspicious Battle Detection (US-ADMIN-005)
  As an admin moderator
  I want the system to auto-flag pets exceeding battle thresholds
  So that bot activity is surfaced for review without disrupting legitimate players

  Background:
    Given a moderator admin "admin-mod-001" is authenticated with a valid session cookie

  @TC-E2E-SUSP-001-01 @smoke
  Scenario: Pet auto-flagged after exceeding 50 battles in 60-minute window
    Given pet "pet-susp-001" exists with is_banned false
    And pet "pet-susp-001" has 51 arena_matches rows with completedAt within the last 60 minutes
    When the suspicious activity detection job runs
    Then the database pets row for "pet-susp-001" has suspicious_flag set to true
    And the database admin_audit_log has a row with action "AUTO_FLAG" and target_id "pet-susp-001"
    And pet "pet-susp-001" is still able to enter arena battles (no automatic ban)

  @TC-E2E-SUSP-001-02
  Scenario: Pet NOT flagged when battle count is exactly at the threshold
    Given pet "pet-susp-002" exists with is_banned false
    And pet "pet-susp-002" has exactly 50 arena_matches rows with completedAt within the last 60 minutes
    When the suspicious activity detection job runs
    Then the database pets row for "pet-susp-002" does NOT have suspicious_flag set to true

  @TC-E2E-SUSP-001-03 @contract
  Scenario: Admin can view suspicious pets list
    Given pet "pet-susp-001" has suspicious_flag true in the database
    When the admin sends GET /admin/api/suspicious
    Then the response status is 200
    And "pet-susp-001" appears in the response data with a SUSPICIOUS badge

  @TC-E2E-SUSP-001-04
  Scenario: Moderator reviews suspicious pet and submits ban
    Given pet "pet-susp-001" has suspicious_flag true in the database
    And pet "pet-susp-001" is in the Redis sorted set "leaderboard:global"
    When the admin sends POST /admin/api/pets/pet-susp-001/ban with reason "Automated rapid-fire battles consistent with bot behavior"
    Then the response status is 200
    And the database pets row for "pet-susp-001" has is_banned true
    And the Redis sorted set "leaderboard:global" does NOT contain "pet-susp-001"
    And the database admin_audit_log has a row with action "BAN" and admin_id "admin-mod-001" and reason containing "bot behavior"

  @TC-E2E-SUSP-001-05
  Scenario: Suspicious analytics event is emitted for auto-flagged pet
    Given pet "pet-susp-003" has 52 arena_matches rows in the last 60 minutes
    When the suspicious activity detection job runs
    Then a "suspicious_pet_flagged" analytics event is emitted with pet_id "pet-susp-003" and battles_in_window 52

  @TC-E2E-SUSP-001-06 @contract
  Scenario: Detection job does not flag pets outside the rolling window
    Given pet "pet-susp-004" has 55 arena_matches rows all with completedAt older than 60 minutes
    When the suspicious activity detection job runs
    Then the database pets row for "pet-susp-004" does NOT have suspicious_flag set to true

  @TC-E2E-SUSP-001-07 @contract
  Scenario: Banned pet is rejected from arena entry
    Given pet "pet-susp-005" exists with is_banned true
    And the pet owner holds token "token-susp-005"
    When "token-susp-005" sends POST /api/v1/arena/enter with petId "pet-susp-005" mode "RACE" and acceptAI false
    Then the response status is 403
    And the response body error code is "PET_BANNED"
    And pet "pet-susp-005" is not added to the matchmaking queue
