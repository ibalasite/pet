Feature: Email Claim Flow (US-AUTH-001, US-AUTH-002)

  Scenario: Guest successfully claims a pet via email OTP happy path
    Given a guest holds a valid pet access token of at least (pet_access_token_min_bytes = 32) bytes
    And the guest submits their email address "player@example.com" to the claim endpoint
    When the server generates a (claim_code_digits = 6)-digit OTP and emails it to "player@example.com"
    And the guest submits the correct 6-digit code within (claim_code_expiry_minutes = 15) minutes
    Then the server links the email to the pet token and responds with HTTP 200
    And the pet record shows email_verified = true

  Scenario: Claim code expires after the configured window
    Given a guest holds a valid pet access token of at least (pet_access_token_min_bytes = 32) bytes
    And the server issued a (claim_code_digits = 6)-digit OTP to "player@example.com"
    When the guest submits the correct OTP after (claim_code_expiry_minutes = 15) minutes have elapsed
    Then the server responds with HTTP 410
    And the response body contains error code "CLAIM_CODE_EXPIRED"

  Scenario: Claim rate limit blocks requests after the hourly threshold
    Given a guest holds a valid pet access token of at least (pet_access_token_min_bytes = 32) bytes
    And the guest has already requested (auth_rate_limit_claim_attempts_per_hour = 5) OTP codes within the current hour
    When the guest submits a sixth claim request for "player@example.com"
    Then the server responds with HTTP 429
    And the response body contains error code "CLAIM_RATE_LIMIT_EXCEEDED"
    And the Retry-After header is present

  Scenario: One-time claim code cannot be reused after first verification
    Given a guest holds a valid pet access token of at least (pet_access_token_min_bytes = 32) bytes
    And the server issued a (claim_code_digits = 6)-digit OTP to "player@example.com"
    And the guest successfully verified the OTP on the first attempt
    When the guest submits the same OTP a second time
    Then the server responds with HTTP 410
    And the response body contains error code "CLAIM_CODE_ALREADY_USED"
