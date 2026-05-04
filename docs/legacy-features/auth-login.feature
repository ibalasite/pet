Feature: Email Claim Flow — User Authentication
  As a guest player
  I want to claim a randomly generated pet with my email address
  So that I can access the pet across devices and sessions

  Scenario: Guest successfully claims an unclaimed pet via email OTP
    Given a guest has viewed a randomly generated unclaimed pet with ID "pet-uuid-001"
    And the pet has never been claimed (owner_token_hash is NULL)
    And a valid email address "player@example.com" is available
    When the guest submits a claim request with email and age confirmation (ageConfirmed = true)
    Then the system returns HTTP 200 with a claimId and 15-minute expiry timestamp
    And a 6-digit OTP is sent to the email address
    And the OTP code is stored as a SHA-256 hash in claim_codes with expires_at = NOW() + 15 minutes
    And when the guest submits the correct 6-digit OTP within the expiry window
    Then the system returns HTTP 200 with a petToken (32-byte Base64 string) and petUrl
    And pets.owner_token_hash is updated with SHA-256 hash of the petToken
    And pets.claimed_at is set to the current timestamp
    And claim_codes.used_at is set to indicate successful verification
    And the claim code cannot be reused (subsequent submissions return INVALID_CODE)

  Scenario: Claim initiation requires age confirmation
    Given a guest with an unclaimed pet "pet-uuid-002"
    When the guest submits a claim request with email "player@example.com" and ageConfirmed = false
    Then the system returns HTTP 400 with error code AGE_CONFIRMATION_REQUIRED
    And the pet remains unclaimed

  Scenario: Claim code expires after 15 minutes
    Given a claim code created more than 15 minutes ago with expires_at in the past
    When the guest submits the OTP code
    Then the system returns HTTP 400 with error code CODE_EXPIRED
    And the response message is "Claim code has expired"

  Scenario: Rate limit enforced — maximum 5 claim attempts per email per hour
    Given an email address "ratelimit@example.com" has been used for 5 claim attempts in the past 60 minutes
    When a 6th claim attempt is submitted for the same email within the hour
    Then the system returns HTTP 429 with Retry-After header set to 60 seconds
    And the counter is not incremented further
    And the client sees "Too many claim attempts. Please wait before trying again."

  Scenario: Pet already claimed by another player prevents re-claim
    Given a pet that is already claimed (owner_token_hash is set, claimed_at is set)
    When a guest submits a new claim request with a different email
    Then the system returns HTTP 400 with error code ALREADY_CLAIMED
    And the existing owner's token remains valid

  Scenario: Claim code entry enforces fail-closed rate limit
    Given Redis is unavailable (connection refused or timeout)
    When a POST /api/v1/claim/verify request is submitted with a code
    Then the system returns HTTP 503 Service Unavailable
    And the claim is NOT completed
    And an alert is logged for Redis connectivity failure
    And no session is created

  Scenario: Email enumeration prevention — same response for valid and invalid pets
    Given two requests to the claim endpoint: one with a valid pet ID, one with an invalid pet ID
    And both requests use different email addresses
    When responses are compared for identical structure and timing
    Then both responses have HTTP 200 status code
    And both responses contain identical response body structure (claimId, expiresAt)
    And no timing difference is detectable that would reveal pet validity
