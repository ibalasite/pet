@p0
Feature: Admin Authentication (US-ADMIN-AUTH-001)
  As a platform administrator
  I want to authenticate securely using password and TOTP
  So that the admin portal is protected against unauthorised access

  @TC-E2E-ADMIN-AUTH-001-01 @contract @smoke
  Scenario: Successful TOTP login returns session cookie
    Given an admin account "admin-auth-001" exists with a valid password and TOTP secret configured
    When the admin submits correct credentials and a valid TOTP code for "admin-auth-001"
    Then the response status is 200
    And the response sets a "admin-session" cookie with HttpOnly and Secure flags

  @TC-E2E-ADMIN-AUTH-001-02 @contract
  Scenario: Wrong password returns 401
    Given an admin account "admin-auth-001" exists with a valid password and TOTP secret configured
    When the admin submits an incorrect password for "admin-auth-001"
    Then the response status is 401
    And the response body error code is "INVALID_CREDENTIALS"
    And no session cookie is set

  @TC-E2E-ADMIN-AUTH-001-03 @contract
  Scenario: Account locked after 10 consecutive failures returns 403 ACCOUNT_LOCKED with unlockedAt
    Given an admin account "admin-auth-002" has failed login 10 times consecutively
    When the admin submits any credentials for "admin-auth-002"
    Then the response status is 403
    And the response body error code is "ACCOUNT_LOCKED"
    And the response body contains an "unlockedAt" field

  @TC-E2E-ADMIN-AUTH-001-04 @contract
  Scenario: First login without TOTP configured returns 403 TOTP_SETUP_REQUIRED
    Given an admin account "admin-auth-003" exists with a valid password but no TOTP secret configured
    When the admin submits correct password credentials for "admin-auth-003"
    Then the response status is 403
    And the response body error code is "TOTP_SETUP_REQUIRED"
    And no session cookie is set

  @TC-E2E-ADMIN-AUTH-001-05 @contract
  Scenario: Logout invalidates session cookie
    Given an admin "admin-auth-001" is authenticated with a valid session cookie
    When the admin sends POST /admin/api/auth/logout
    Then the response status is 200
    And the response clears the "admin-session" cookie
    And subsequent requests using the old session cookie return 401
