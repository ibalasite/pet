@p1
Feature: Game Economy Configuration (US-ADMIN-006)
  As a Super Admin
  I want to adjust game economy design parameters through the admin portal
  So that I can tune the player economy without requiring an engineering deployment

  Background:
    Given a super_admin "admin-super-001" is authenticated with a valid session cookie
    And the database config_economy row has food_buff_speed_multiplier 1.0 and arena_entry_cooldown_minutes 10

  @TC-E2E-ECO-001-01 @contract @smoke
  Scenario: Super Admin updates food buff multiplier within allowed range
    When the admin sends PUT /admin/api/config/economy with food_buff_speed_multiplier 1.5
    Then the response status is 200
    And the response body field "food_buff_speed_multiplier" is 1.5
    And the database config_economy row has food_buff_speed_multiplier 1.5
    And the database admin_audit_log has a row with action "CONFIG_UPDATE" field "food_buff_speed_multiplier" old_value "1.0" new_value "1.5" and admin_id "admin-super-001"

  @TC-E2E-ECO-001-02 @contract
  Scenario: Economy config update rejected when value is out of allowed range
    When the admin sends PUT /admin/api/config/economy with food_buff_speed_multiplier 9.9
    Then the response status is 400
    And the response body error code is "OUT_OF_RANGE"
    And the database config_economy row still has food_buff_speed_multiplier 1.0
    And no new row is added to admin_audit_log for this attempt

  @TC-E2E-ECO-001-03
  Scenario: Updated economy config takes effect within 5 minutes via cache refresh
    Given the admin has updated food_buff_strength_multiplier to 2.0 successfully
    When 5 minutes elapse for the config cache to refresh
    And "token-train-001" sends POST /api/v1/pets/pet-train-001/feed with buffType "power_mushroom" stat "strength" magnitude 3 and isPermanent false
    Then the applied buff magnitude reflects the 2.0 multiplier

  @TC-E2E-ECO-001-04
  Scenario: Audit log captures full change context for every economy config edit
    When the admin sends PUT /admin/api/config/economy with arena_entry_cooldown_minutes 30
    Then the response status is 200
    And the database admin_audit_log has a row with action "CONFIG_UPDATE" and admin_id "admin-super-001" and old_value containing "10" and new_value containing "30"

  @TC-E2E-ECO-001-05 @contract
  Scenario: Moderator role cannot edit economy parameters
    Given a moderator admin "admin-mod-001" is authenticated with a valid session cookie
    When the moderator sends PUT /admin/api/config/economy with food_buff_speed_multiplier 2.0
    Then the response status is 403
    And the response body error code is "FORBIDDEN"
    And the database config_economy row is unchanged

  @TC-E2E-ECO-001-06 @contract
  Scenario: Unauthenticated economy config request is rejected
    When an unauthenticated PUT request is made to /admin/api/config/economy with food_buff_speed_multiplier 1.5
    Then the response status is 401
    And the response body error code is "UNAUTHORIZED"

  @TC-E2E-ECO-001-07
  Scenario Outline: Food buff multiplier boundary values are validated
    When the admin sends PUT /admin/api/config/economy with food_buff_speed_multiplier <value>
    Then the response status is <expected_status>

    Examples:
      | value | expected_status |
      | 0.5   | 200             |
      | 5.0   | 200             |
      | 0.49  | 400             |
      | 5.01  | 400             |
