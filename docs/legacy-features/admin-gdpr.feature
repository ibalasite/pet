Feature: GDPR Data Subject Rights — Erasure and Data Access
  As a game player
  I want to exercise my GDPR rights
  So that my data can be deleted or accessed according to legal requirements

  Scenario: Player submits GDPR erasure request
    Given a pet owner with a claimed pet and linked claim_identity_id
    And a valid petToken for the pet
    When POST /api/v1/gdpr/request is called with type = "erasure"
    Then the system returns HTTP 202 with:
      | Field | Value |
      | jobId | uuid |
      | message | "Your GDPR request has been received..." |
    And a gdpr_requests row is created with:
      | Field | Value |
      | claim_identity_id | identity_uuid |
      | initiating_pet_id | pet_uuid |
      | request_type | erasure |
      | status | pending |
      | submitted_at | current timestamp |

  Scenario: GDPR erasure internal SLA — 24-hour email nulling
    Given a GDPR erasure request that has been processing for 24 hours
    When the background GDPR erasure job completes
    Then:
      | Table | Column | Action |
      | claim_identities | email_encrypted | SET to NULL |
      | claim_identities | email_hash | RETAIN (not NULL) |
      | claim_identities | deletion_requested_at | SET timestamp |
      | pets | rows linked to identity | RETAIN (not deleted) |

  Scenario: GDPR erasure external SLA — 7-day full deletion
    Given a GDPR erasure request with gdpr_email_deletion_window_days = 7 remaining
    When 7 days have elapsed
    Then the deletion is considered compliant
    And email_encrypted remains NULL (set within 24 hours)
    And email_hash remains in claim_identities for anti-re-registration

  Scenario: GDPR-erased email cannot be re-registered immediately
    Given an email "erased@example.com" that has been GDPR-deleted
    And the email_hash is retained in claim_identities
    When a new claim attempt is submitted with email = "erased@example.com"
    Then the system looks up the email_hash and finds the prior identity
    And the claim request is rejected (or the claim is linked to the same identity, now pseudonymous)

  Scenario: Erased pet removed from leaderboard
    Given a pet belonging to a user who submitted GDPR erasure
    And the pet is ranked 25th on the leaderboard
    When the GDPR erasure background job completes
    Then Redis ZREM is executed to remove the pet from leaderboard:global
    And subsequent leaderboard queries no longer include that pet

  Scenario: Erased pet displays with pseudonymous owner
    Given a pet whose owner email has been erased
    And the pet still has an arena history with visible battles
    When GET /api/v1/pets/:petId is called
    Then the pet data is returned (not deleted)
    And owner email is not displayed
    And owner identification uses a generic label (e.g., "Pet Owner" or anonymized ID)

  Scenario: Player checks GDPR request status
    Given a submitted GDPR erasure request with jobId = "job-uuid-001"
    And the player's petToken that initiated the request
    When GET /api/v1/gdpr/request/status?jobId=job-uuid-001 is called
    Then the system returns HTTP 200 with:
      | Field | Value |
      | jobId | job-uuid-001 |
      | requestType | erasure |
      | status | pending\|processing\|completed\|failed |
      | submittedAt | ISO-8601 |
      | completedAt | null or ISO-8601 |

  Scenario: Cross-identity GDPR status check prevented
    Given petA owned by player_X and petB owned by player_Y
    And a GDPR request associated with petA's claim_identity
    When GET /api/v1/gdpr/request/status?jobId=... is called with player_Y's petToken
    Then the system returns HTTP 403 with error code FORBIDDEN
    And error message is "You do not have permission to view this request"

  Scenario: Admin super_admin processes GDPR deletion
    Given a GDPR erasure request pending in the admin queue
    And a super_admin user authenticated with valid session and TOTP
    When the super_admin processes the deletion in the admin portal
    Then the status is updated to 'completed'
    And an audit_log entry is created with:
      | Field | Value |
      | admin_id | super_admin.id |
      | action | gdpr_request.process |
      | target_type | gdpr_request |
      | target_id | gdpr_request_id |
      | detail | {request_type: "erasure", result: "completed"} |

  Scenario: GDPR request status transitions
    Given a GDPR erasure request initially in 'pending' status
    When the background job begins processing
    Then status transitions to 'processing'
    When the background job completes successfully
    Then status transitions to 'completed'
    And completed_at is set to the completion timestamp
    And any subsequent status check returns 'completed'

  Scenario: GDPR request fails and is retried
    Given a GDPR erasure request that failed to complete (status = 'failed')
    And admin_notes contain details of the failure
    When the background job retries
    And the retry succeeds
    Then status is updated to 'completed'
    And updated_at is set to the new completion timestamp
