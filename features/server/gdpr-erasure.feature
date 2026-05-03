Feature: GDPR Data Erasure (US-AUTH-002, US-ADMIN-004)

  Scenario: Player requests email erasure and email_encrypted is nulled within the SLA
    Given a pet owner with pet token "owner-token-gdpr" has a verified email "erasure@example.com" on file
    When the owner submits a GDPR erasure request to DELETE /api/v1/me/email
    Then the server enqueues an erasure job and responds with HTTP 202
    And within (gdpr_email_hashing_internal_sla_hours = 24) hours the email_encrypted column is set to NULL
    And the email_verified flag is set to false on the pet record

  Scenario: Super admin processes GDPR deletion via the admin portal
    Given a super admin is authenticated with a valid httpOnly SameSite=Strict admin session cookie
    And a GDPR deletion request exists for pet token "owner-token-gdpr-admin"
    When the admin submits a deletion action via POST /admin/gdpr/process with the pet token
    Then the server nulls email_encrypted for "owner-token-gdpr-admin" immediately
    And an entry is written to admin_audit_log with action "GDPR_DELETE" and the admin_id and ip_address_hash populated
    And the response returns HTTP 200 with confirmation payload
