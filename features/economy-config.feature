@US-ADMIN-006
Feature: Game Economy Configuration — Admin-tunable design parameters (US-ADMIN-006)
  As a Super Admin
  I want to adjust game economy design parameters through the admin portal
  So that I can tune the player economy without requiring an engineering deployment

  Background:
    Given a Super Admin "alice" is authenticated with role = 'super_admin'
    And the admin portal session is active and within the 4-hour inactivity window

  @TC-SRV-ECO-001
  Scenario: Super Admin edits economy parameters within allowed ranges (AC-018-1)
    Given the Game Economy Configuration module is open
    When the Super Admin submits PUT /admin/api/config/economy with payload:
      | Field                       | New Value |
      | food_buff_speed_multiplier  | 1.5       |
      | food_buff_strength_multiplier | 2.0     |
      | arena_entry_cooldown_minutes  | 15      |
      | arena_entry_cost_credits      | 2       |
    Then the system returns HTTP 200
    And the response includes the updated config_economy values
    And each numeric value is validated against its allowed range:
      | Field                          | Range            |
      | food_buff_*_multiplier         | float 0.5–5.0    |
      | arena_entry_cooldown_minutes   | integer 0–60     |
      | arena_entry_cost_credits       | integer 0–10     |

  @TC-SRV-ECO-002
  Scenario: Out-of-range edit rejected with VALIDATION_ERROR (AC-018-1)
    Given the Game Economy Configuration module is open
    When the Super Admin submits PUT /admin/api/config/economy with food_buff_speed_multiplier = 9.9
    Then the system returns HTTP 400 with error code VALIDATION_ERROR
    And error message indicates the allowed range "0.5–5.0"
    And no audit_log entry is created
    And no config_economy row is updated

  @TC-SRV-ECO-003
  Scenario: Configuration change requires preview confirmation (AC-018-2)
    Given a pending change of arena_entry_cost_credits from 0 to 5
    When the Super Admin requests POST /admin/api/config/economy/preview with the change set
    Then the system returns HTTP 200 with a preview payload showing:
      | Field                     | old_value | new_value |
      | arena_entry_cost_credits  | 0         | 5         |
    And no value is persisted until POST /admin/api/config/economy/confirm is called with the preview token
    And confirmation token expires after 5 minutes

  @TC-SRV-ECO-004
  Scenario: Saved configuration takes effect within 5 minutes via cache refresh (AC-018-3)
    Given the Super Admin saves a confirmed change setting arena_entry_cooldown_minutes = 30
    When the API server receives the next /api/v1/arena/enter request after 5 minutes (config_cache_refresh_max_minutes)
    Then the new cooldown value is applied without any service restart
    And subsequent rate-limit checks use the new 30-minute cooldown
    And no in-flight battles are interrupted by the change

  @TC-SRV-ECO-005
  Scenario: Audit log captures full change context for every economy edit (AC-018-4)
    Given the Super Admin "alice" saves food_buff_strength_multiplier from 1.0 to 2.0
    When GET /admin/api/audit?action=config.economy&limit=1 is called
    Then the most recent audit_log entry contains:
      | Field        | Value                                              |
      | admin_id     | alice.id                                           |
      | action       | config.economy                                     |
      | target_type  | config_economy                                     |
      | target_id    | food_buff_strength_multiplier                      |
      | detail       | {"previous_value": 1.0, "new_value": 2.0}          |
    And the audit row is append-only (no UPDATE or DELETE permitted)

  @TC-SRV-ECO-006
  Scenario: Non-Super-Admin role is forbidden from editing economy parameters
    Given a moderator "bob" with role = 'moderator'
    When bob calls PUT /admin/api/config/economy with any payload
    Then the system returns HTTP 403 with error code FORBIDDEN
    And the existing config_economy values are unchanged
    And an audit_log entry is created with action = "config.economy.denied" capturing the actor and attempted change
