Feature: GDPR Data Erasure (US-AUTH-002, US-ADMIN-004)

  Scenario: Player requests email erasure and email_encrypted is nulled within the SLA
    Given a pet owner with pet token "owner-token-gdpr" has a linked email "erasure@example.com" stored in email_encrypted
    When the owner submits a GDPR erasure request to POST /api/v1/gdpr/request with body { "type": "erasure" }
    Then the server enqueues an erasure job and responds with HTTP 202
    And within (gdpr_email_hashing_internal_sla_hours = 24) hours the email_encrypted column is set to NULL

  Scenario: Super admin processes GDPR deletion via the admin portal
    Given a super admin is authenticated with a valid httpOnly SameSite=Strict admin session cookie
    And a GDPR deletion request exists for pet token "owner-token-gdpr-admin"
    When the admin submits a deletion action via POST /admin/api/gdpr/delete with the email hash and a reason
    Then the server enqueues an erasure job and responds with HTTP 202
    And within (gdpr_email_hashing_internal_sla_hours = 24) hours the email_encrypted column for "owner-token-gdpr-admin" is set to NULL
    And an entry is written to admin_audit_log with action "GDPR_DELETE" and the admin_id and ip_address_hash populated
