@p0
Feature: GDPR Data Erasure (US-AUTH-002, US-ADMIN-004)
  As a pet owner exercising GDPR rights
  I want to request erasure of my personal data
  So that my email is removed while my pet history is preserved

  Background:
    Given a claimed pet "pet-gdpr-001" exists owned by claim identity "identity-gdpr-001" with email encrypted in claim_identities
    And the pet owner holds token "token-gdpr-001" associated with "pet-gdpr-001"

  @TC-E2E-GDPR-001-01 @contract @smoke
  Scenario: Player submits GDPR erasure request and receives 202 with jobId
    When "token-gdpr-001" sends POST /api/v1/gdpr/request with type "erasure"
    Then the response status is 202
    And the response body contains a "jobId" field
    And the database table gdpr_requests has a row with status "pending" for "identity-gdpr-001"

  @TC-E2E-GDPR-001-02
  Scenario: Email encrypted column is nulled within the internal SLA
    Given a gdpr_requests row exists for "identity-gdpr-001" with status "pending"
    When the GDPR background job processes the erasure for "identity-gdpr-001"
    Then the database claim_identities row for "identity-gdpr-001" has email_encrypted set to null
    And the database claim_identities row for "identity-gdpr-001" retains a non-null email_hash
    And the gdpr_requests row status is "completed"

  @TC-E2E-GDPR-001-03
  Scenario: Erased pet is removed from Redis leaderboard
    Given pet "pet-gdpr-001" exists in the Redis sorted set "leaderboard:global"
    And the GDPR background job processes the erasure for "identity-gdpr-001"
    When a GET request is made to /api/v1/leaderboard without authentication
    Then "pet-gdpr-001" does NOT appear in the response "data.entries" array

  @TC-E2E-GDPR-001-04
  Scenario: Email hash is retained to prevent re-registration after erasure
    Given a gdpr_requests row exists for "identity-gdpr-001" with status "completed"
    And the claim_identities row for "identity-gdpr-001" has email_encrypted null and email_hash set
    And a new unclaimed pet "pet-fresh-001" exists in the database
    When the same email is submitted in POST /api/v1/claim with petId "pet-fresh-001" and ageConfirmed true
    Then the database lookup finds the retained email_hash and prevents a duplicate identity

  @TC-E2E-GDPR-001-05 @contract
  Scenario: Player checks GDPR request status with matching identity
    Given a gdpr_requests row "job-gdpr-001" exists for "identity-gdpr-001" with status "processing"
    When "token-gdpr-001" sends GET /api/v1/gdpr/request/status with jobId "job-gdpr-001"
    Then the response status is 200
    And the response body field "status" is "processing"
    And the response body contains "submittedAt" and "requestType" fields

  @TC-E2E-GDPR-001-06 @contract
  Scenario: GDPR status check forbidden for a different identity
    Given a gdpr_requests row "job-gdpr-other" exists for a different claim identity
    When "token-gdpr-001" sends GET /api/v1/gdpr/request/status with jobId "job-gdpr-other"
    Then the response status is 403
    And the response body error code is "FORBIDDEN"

  @TC-E2E-GDPR-001-07 @contract
  Scenario: GDPR status check returns 404 for nonexistent jobId
    When "token-gdpr-001" sends GET /api/v1/gdpr/request/status with jobId "nonexistent-job-uuid"
    Then the response status is 404
    And the response body error code is "NOT_FOUND"

  @TC-E2E-GDPR-001-08 @contract
  Scenario: Unauthenticated GDPR request is rejected
    When an unauthenticated POST request is made to /api/v1/gdpr/request with type "erasure"
    Then the response status is 401
    And the response body error code is "UNAUTHORIZED"

  @TC-E2E-GDPR-001-09
  Scenario: Super admin processes GDPR deletion via admin portal and audit log is written
    Given a super_admin session cookie is set for admin user "admin-super-001"
    And a gdpr_requests row "job-gdpr-admin-001" exists for "identity-gdpr-001" with status "pending"
    When the admin sends POST /admin/api/gdpr/job-gdpr-admin-001/process
    Then the response status is 200
    And the database claim_identities row for "identity-gdpr-001" has email_encrypted set to null
    And the database admin_audit_log has a row with action "GDPR_DELETION" and admin_id "admin-super-001"

  @TC-E2E-GDPR-001-10
  Scenario: Erased pet page still loads with pseudonymous data
    Given the erasure for "identity-gdpr-001" is complete and email_encrypted is null
    When a GET request is made to /api/v1/pets/pet-gdpr-001 without authentication
    Then the response status is 200
    And the response body does not contain any email field
    And the response body "id" field is "pet-gdpr-001"
