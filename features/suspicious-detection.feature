Feature: Suspicious Battle Detection (US-ADMIN-005)

  Scenario: Pet is auto-flagged SUSPICIOUS after exceeding the battle threshold in the detection window
    Given pet "spammer-token-001" has completed more than (bot_detection_battles_threshold = 50) battles within the last (bot_detection_window_minutes = 60) minutes
    When the background detection job evaluates battle counts for all active pets
    Then pet "spammer-token-001" status is updated to "SUSPICIOUS" in the database
    And a moderation alert is created in the admin review queue for "spammer-token-001"
    And no automatic ban is applied — the pet remains able to battle until a moderator acts

  Scenario: Moderator reviews a SUSPICIOUS pet and submits an arena ban with a reason
    Given a moderator is authenticated with a valid httpOnly SameSite=Strict admin session cookie
    And pet "spammer-token-001" has status "SUSPICIOUS" in the moderation queue
    When the moderator submits a ban action via POST /admin/api/pets/spammer-token-001/ban with reason "Automated rapid-fire battles consistent with scripted bot behaviour"
    And the reason text is fewer than (admin_moderation_reason_max_chars = 500) characters
    Then the pet status is updated to "BANNED" in the database
    And an entry is written to admin_audit_log with action "BAN", admin_id, ip_address_hash, and the reason in the detail JSONB column
    And the server responds with HTTP 200

  Scenario: Banned pet cannot enter future arena matches
    Given pet "banned-token-002" has status "BANNED" in the database
    When "banned-token-002" attempts to join the matchmaking queue via POST /api/v1/arena/enter
    Then the server responds with HTTP 403
    And the response body contains error code "PET_BANNED"
    And "banned-token-002" is not added to the Redis matchmaking sorted set
