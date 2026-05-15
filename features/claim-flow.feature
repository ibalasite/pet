Feature: Email Claim Flow (US-AUTH-001, US-AUTH-002)
  As a guest player
  I want to claim a randomly generated pet with my email address
  So that I can access the pet across devices and sessions

  @TC-SRV-CLAIM-001
  Scenario: Guest successfully claims a pet via email OTP happy path
    Given a guest holds a valid pet access token of at least (pet_access_token_min_bytes = 32) bytes
    And the guest has already requested an OTP via POST /api/v1/claim/request and received a (claim_code_digits = 6)-digit code at "player@example.com"
    When the guest POSTs the correct 6-digit code via POST /api/v1/claim/verify within (claim_code_expiry_minutes = 15) minutes
    Then the server links the email to the pet token and responds with HTTP 200
    And the pets record has owner_token_hash populated and the claim_codes record has used_at set

  @TC-SRV-CLAIM-002
  Scenario: Claim code expires after the configured window
    Given a guest holds a valid pet access token of at least (pet_access_token_min_bytes = 32) bytes
    And the server issued a (claim_code_digits = 6)-digit OTP to "player@example.com"
    When the guest POSTs the correct OTP via POST /api/v1/claim/verify after (claim_code_expiry_minutes = 15) minutes have elapsed
    Then the server responds with HTTP 400
    And the response body contains error code "CODE_EXPIRED"

  @TC-SRV-CLAIM-003
  Scenario: Claim rate limit blocks requests after the hourly threshold
    Given a guest holds a valid pet access token of at least (pet_access_token_min_bytes = 32) bytes
    And the guest has already requested (auth_rate_limit_claim_attempts_per_hour = 5) OTP codes within the current hour
    When the guest submits a sixth claim request for "player@example.com"
    Then the server responds with HTTP 429
    And the response body contains error code "RATE_LIMIT_EXCEEDED"
    And the Retry-After header is present

  @TC-SRV-CLAIM-004
  Scenario: One-time claim code cannot be reused after first verification
    Given a guest holds a valid pet access token of at least (pet_access_token_min_bytes = 32) bytes
    And the server issued a (claim_code_digits = 6)-digit OTP to "player@example.com"
    And the guest successfully verified the OTP on the first attempt
    When the guest POSTs the same OTP a second time via POST /api/v1/claim/verify
    Then the server responds with HTTP 400
    And the response body contains error code "INVALID_CODE"

  @TC-SRV-CLAIM-005
  Scenario: Claim initiation requires age confirmation
    Given a guest with an unclaimed pet
    When the guest submits a claim request with email "player@example.com" and ageConfirmed = false
    Then the system returns HTTP 400 with error code AGE_CONFIRMATION_REQUIRED
    And the pet remains unclaimed

  @TC-SRV-CLAIM-006
  Scenario: Pet already claimed by another player prevents re-claim
    Given a pet that is already claimed (owner_token_hash is set, claimed_at is set)
    When a guest submits a new claim request with a different email
    Then the system returns HTTP 400 with error code ALREADY_CLAIMED
    And the existing owner's token remains valid

  @TC-SRV-CLAIM-007
  Scenario: Claim code entry enforces fail-closed rate limit on Redis unavailability
    Given Redis is unavailable (connection refused or timeout)
    When a POST /api/v1/claim/verify request is submitted with a code
    Then the system returns HTTP 503 Service Unavailable
    And the claim is NOT completed
    And an alert is logged for Redis connectivity failure
    And no session is created

  @TC-SRV-CLAIM-008
  Scenario: Email enumeration prevention — timing attack defense with ±50ms variance
    Given a test harness makes 100 claim requests with valid pet IDs at time series T_valid[]
    And the harness makes 100 claim requests with invalid pet IDs at time series T_invalid[]
    When the responses are measured (time from request submission to HTTP 200 reception)
    Then response_time_valid[i] ∈ [50ms, 300ms] for all i (typical network + processing)
    And response_time_invalid[i] ∈ [50ms, 300ms] for all i (same range as valid requests)
    And |response_time_valid[i] - response_time_invalid[i]| <= 50ms for ≥95% of request pairs
    And the timing difference is attributable to network jitter, not business logic branching
    And statistical t-test (paired samples, α=0.05) shows no significant difference between valid and invalid response times
