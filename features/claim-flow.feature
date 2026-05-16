@p0 @smoke
Feature: Email Claim Flow (US-AUTH-001, US-AUTH-002)
  As a guest player
  I want to claim a randomly generated pet with my email address
  So that I can access the pet across devices and sessions

  Background:
    Given a seeded unclaimed pet with id "pet-001" exists in the database

  @TC-E2E-AUTH-001-01 @contract @smoke
  Scenario: Guest successfully initiates claim and receives OTP
    Given the pet "pet-001" has no owner_token_hash set
    When the guest sends POST /api/v1/claim with email "player@example.com" petId "pet-001" and ageConfirmed true
    Then the response status is 200
    And the response body contains a "claimId" field
    And the response body contains an "expiresAt" field 15 minutes in the future

  @TC-E2E-AUTH-001-02 @contract @smoke
  Scenario: Guest verifies OTP and receives pet access token
    Given a claim record with id "claim-001" exists for pet "pet-001" with a valid 6-digit code "482917"
    And the claim code "482917" has not expired
    When the guest sends POST /api/v1/claim/verify with claimId "claim-001" and code "482917"
    Then the response status is 200
    And the response body contains a "petToken" field with at least 32 bytes of base64url data
    And the response body contains a "petUrl" field
    And the database record for pet "pet-001" has owner_token_hash populated
    And the claim code record has used_at set

  @TC-E2E-AUTH-001-03 @smoke
  Scenario: Claim code expires after 15 minutes
    Given a claim record with id "claim-002" exists for pet "pet-001" with code "111111"
    And the claim code "111111" expired 1 second ago
    When the guest sends POST /api/v1/claim/verify with claimId "claim-002" and code "111111"
    Then the response status is 400
    And the response body error code is "CODE_EXPIRED"

  @TC-E2E-AUTH-001-04
  Scenario: One-time claim code cannot be reused
    Given a claim record with id "claim-003" exists for pet "pet-001" with code "222222"
    And the claim code "222222" was already used at "2026-05-01T10:00:00Z"
    When the guest sends POST /api/v1/claim/verify with claimId "claim-003" and code "222222"
    Then the response status is 400
    And the response body error code is "INVALID_CODE"

  @TC-E2E-AUTH-001-05
  Scenario: Claim initiation blocked when ageConfirmed is false
    Given the pet "pet-001" has no owner_token_hash set
    When the guest sends POST /api/v1/claim with email "player@example.com" petId "pet-001" and ageConfirmed false
    Then the response status is 400
    And the response body error code is "AGE_CONFIRMATION_REQUIRED"
    And the pet "pet-001" still has no owner_token_hash in the database

  @TC-E2E-AUTH-001-06
  Scenario: Claim blocked when pet is already owned
    Given the pet "pet-001" is already claimed with owner_token_hash "existing-hash-abc"
    When the guest sends POST /api/v1/claim with email "other@example.com" petId "pet-001" and ageConfirmed true
    Then the response status is 400
    And the response body error code is "ALREADY_CLAIMED"

  @TC-E2E-AUTH-001-07
  Scenario: Claim rate limit blocks after 5 attempts per hour
    Given the Redis rate-limit counter "rl:claim:{email_hash}" for email "spammer@example.com" is at 5
    When the guest sends POST /api/v1/claim with email "spammer@example.com" petId "pet-001" and ageConfirmed true
    Then the response status is 429
    And the response body error code is "RATE_LIMIT_EXCEEDED"
    And the response header "Retry-After" is present

  @TC-E2E-AUTH-001-08
  Scenario: OTP entry is fail-closed when Redis is unavailable
    Given Redis is unavailable
    And a claim record with id "claim-004" exists for pet "pet-001" with code "333333"
    When the guest sends POST /api/v1/claim/verify with claimId "claim-004" and code "333333"
    Then the response status is 503 or 429
    And the pet "pet-001" still has no owner_token_hash in the database

  @TC-E2E-AUTH-001-09a
  Scenario: Email enumeration prevention — registered email returns standard claim response
    Given the pet "pet-001" has no owner_token_hash set
    And the email "registered@example.com" is already associated with a claim identity in the database
    When the guest sends POST /api/v1/claim with email "registered@example.com" petId "pet-001" and ageConfirmed true
    Then the response status is 200
    And the response body contains a "claimId" field

  @TC-E2E-AUTH-001-09b
  Scenario: Email enumeration prevention — unregistered email returns identical response shape
    Given the pet "pet-001" has no owner_token_hash set
    When the guest sends POST /api/v1/claim with email "unknown@example.com" petId "pet-001" and ageConfirmed true
    Then the response status is 200
    And the response body contains a "claimId" field
    And both responses have identical JSON structure regardless of email registration status

  @TC-E2E-AUTH-001-10
  Scenario: Claim initiation returns 404 when petId does not exist
    When the guest sends POST /api/v1/claim with email "any@example.com" petId "nonexistent-pet-uuid" and ageConfirmed true
    Then the response status is 404
    And the response body error code is "PET_NOT_FOUND"

  @TC-E2E-AUTH-002-01 @contract
  Scenario: Pet recovery flow issues new token and blacklists old one
    Given the pet "pet-001" is already claimed with owner_token_hash "old-hash-xyz"
    When the guest sends POST /api/v1/claim/recover with email "player@example.com" and petId "pet-001"
    Then the response status is 200
    And the response body contains a "claimId" field
    And the old token hash "old-hash-xyz" is added to Redis blacklist key "token:blacklist:old-hash-xyz"

  @TC-E2E-AUTH-002-02 @contract
  Scenario: Accessing pet via invalid URL token returns 404
    When a GET request is made to /api/v1/pets/nonexistent-invalid-uuid
    Then the response status is 404
    And the response body error code is "PET_NOT_FOUND"
