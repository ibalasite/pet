Feature: Admin Moderation — Pet Banning and Battle Flagging
  As an admin moderator
  I want to ban disruptive pets and flag suspicious battles
  So that the game environment remains fair and enjoyable

  Scenario: Moderator bans pet with reason
    Given a pet with is_banned = false
    And a moderator_alice with role = 'moderator'
    When POST /admin/api/pets/:petId/ban is called with reason = "Automated bot behavior detected: 52 battles in 60-minute window"
    Then the system returns HTTP 200
    And pets.is_banned is updated to true
    And pets.banned_at is set to current timestamp
    And pets.banned_reason is stored (max 500 characters)
    And an audit_log entry is created with:
      | Field | Value |
      | admin_id | moderator_alice.id |
      | action | pet.ban |
      | target_type | pet |
      | target_id | pet_id |
      | detail | {"reason": "...", "previous_is_banned": false} |

  Scenario: Banned pet removed from leaderboard within SLA
    Given a pet currently ranked 15th on the leaderboard
    When POST /admin/api/pets/:petId/ban is called
    Then within 5 minutes (leaderboard_ban_reflection_time_minutes):
      | Check | Expected |
      | Redis ZRANK | returns null |
      | GET /api/v1/leaderboard | pet is not in top 100 |
      | pet appearance | pet is removed from results |

  Scenario: Banned pet blocked from arena entry
    Given a pet with is_banned = true
    And the pet owner with a valid petToken
    When POST /api/v1/arena/enter is called with the banned pet's ID
    Then the system returns HTTP 403 with error code PET_BANNED
    And the matchmaking entry is NOT created
    And error message is "This pet has been banned from the arena"

  Scenario: Moderator unbans pet
    Given a pet with is_banned = true and a ban reason on file
    When POST /admin/api/pets/:petId/unban is called with reason = "Manual review confirmed legitimate play"
    Then the system returns HTTP 200
    And pets.is_banned is updated to false
    And pets.banned_reason is cleared (set to NULL)
    And pets.banned_at is NOT reset (immutable for audit)
    And an audit_log entry is created with action = "pet.unban"

  Scenario: Unban requires moderator role
    Given a read_only admin user
    When POST /admin/api/pets/:petId/unban is called
    Then the system returns HTTP 403 with error code FORBIDDEN
    And error message is "Your role does not have permission for this action"
    And the ban status is NOT changed

  Scenario: Flag suspicious battle with reason
    Given a completed arena_match with matchId "match-uuid-001"
    And a moderator with role = 'moderator'
    When POST /admin/api/battles/:matchId/flag is called with reason = "Abnormally fast victory; possible stat manipulation"
    Then the system returns HTTP 200
    And arena_matches.is_flagged is updated to true
    And arena_matches.flagged_at is set to current timestamp
    And an audit_log entry is created with action = "arena_match.flag"

  Scenario: Unflag battle
    Given a flagged battle with is_flagged = true
    When DELETE /admin/api/battles/:matchId/flag is called with reason = "Manual review confirmed legitimate outcome"
    Then the system returns HTTP 200
    And arena_matches.is_flagged is updated to false
    And arena_matches.flagged_at is cleared (set to NULL)
    And an audit_log entry is created with action = "arena_match.unflag"

  Scenario: Only moderator+ can flag battles
    Given a read_only admin user
    And a battle to flag
    When POST /admin/api/battles/:matchId/flag is called
    Then the system returns HTTP 403 with error code FORBIDDEN
    And the battle remains unflagged

  Scenario: Admin can view flagged battles list
    Given 25 flagged battles and 100 unflagged battles in the database
    When GET /admin/api/battles?flagged=true is called
    Then the system returns HTTP 200 with:
      | Field | Value |
      | battles | filtered to flagged = true only |
      | meta.total | 25 |
    And each battle includes: matchId, petAId, petBId, winnerId, is_flagged

  Scenario: Ban reason stored with character limit
    Given a moderator with a 600-character ban reason (exceeds 500-char limit)
    When POST /admin/api/pets/:petId/ban is called
    Then the system returns HTTP 400 with error code VALIDATION_ERROR
    And error message indicates "Reason must not exceed 500 characters"
    And no ban is applied

  Scenario: Audit log captures all ban/unban/flag operations
    Given a moderator performs: ban pet_A, flag battle_B, unban pet_C
    When GET /admin/api/audit?limit=10 is called
    Then at least 3 audit_log entries exist with:
      | action | admin_id | target_type | target_id | detail |
      | pet.ban | moderator.id | pet | pet_A.id | {...} |
      | arena_match.flag | moderator.id | arena_match | battle_B.id | {...} |
      | pet.unban | moderator.id | pet | pet_C.id | {...} |
