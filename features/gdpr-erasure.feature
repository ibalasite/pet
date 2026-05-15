Feature: GDPR Data Erasure (US-AUTH-002, US-ADMIN-004)

  @TC-SRV-GDPR-001
  Scenario: Player requests email erasure and email_encrypted is nulled within the SLA
    Given a pet owner with pet token "owner-token-gdpr" has a linked email "erasure@example.com" stored in email_encrypted
    When the owner submits a GDPR erasure request to POST /api/v1/gdpr/request with body { "type": "erasure" }
    Then the server enqueues an erasure job and responds with HTTP 202
    And within (gdpr_email_hashing_internal_sla_hours = 24) hours the email_encrypted column is set to NULL

  @TC-SRV-GDPR-002
  Scenario: Super admin processes GDPR deletion via the admin portal
    Given a super admin is authenticated with a valid httpOnly SameSite=Strict admin session cookie
    And a GDPR deletion request exists for pet token "owner-token-gdpr-admin"
    When the admin submits a deletion action via POST /admin/api/gdpr/delete with the email hash and a reason
    Then the server enqueues an erasure job and responds with HTTP 202
    And within (gdpr_email_hashing_internal_sla_hours = 24) hours the email_encrypted column for "owner-token-gdpr-admin" is set to NULL
    And an entry is written to admin_audit_log with action "GDPR_DELETE" and the admin_id and ip_address_hash populated

  @TC-SRV-GDPR-003
  Scenario: GDPR email deletion completes within internal SLA and reports within external SLA
    Given a player requests account deletion via email
    When the GDPR request is processed
    Then the email_encrypted column is set to NULL within (gdpr_email_hashing_internal_sla_hours = 24) hours
    And the player receives deletion confirmation email within (gdpr_deletion_external_sla_days = 7) days
    And all personal data is either:
      - Anonymized (pet names → "Pet #123", player name removed)
      - Deleted (claim codes, session tokens)
      - Archived (audit logs for fraud detection, encrypted and no longer linked to player)

  @TC-SRV-GDPR-004
  Scenario: Player submits GDPR erasure request
    Given a pet owner with a claimed pet and linked claim_identity_id
    And a valid petToken for the pet
    When POST /api/v1/gdpr/request is called with type = "erasure"
    Then the system returns HTTP 202 with jobId and "Your GDPR request has been received..." message
    And a gdpr_requests row is created with status = 'pending'

  @TC-SRV-GDPR-005
  Scenario: GDPR-erased email cannot be re-registered immediately
    Given an email "erased@example.com" that has been GDPR-deleted
    And the email_hash is retained in claim_identities
    When a new claim attempt is submitted with email = "erased@example.com"
    Then the system rejects the claim request

  @TC-SRV-GDPR-006
  Scenario: Erased pet displays with pseudonymous owner
    Given a pet whose owner email has been erased
    And the pet still has an arena history with visible battles
    When GET /api/v1/pets/:petId is called
    Then the pet data is returned (not deleted)
    And owner email is not displayed

  @TC-SRV-GDPR-007
  Scenario: Player checks GDPR request status
    Given a submitted GDPR erasure request with jobId = "job-uuid-001"
    And the player's petToken that initiated the request
    When GET /api/v1/gdpr/request/status?jobId=job-uuid-001 is called
    Then the system returns HTTP 200 with status, submittedAt, and completedAt fields

  @TC-SRV-GDPR-008
  Scenario: GDPR request status transitions
    Given a GDPR erasure request initially in 'pending' status
    When the background job begins processing
    Then status transitions to 'processing'
    When the background job completes successfully
    Then status transitions to 'completed' and completed_at is set
