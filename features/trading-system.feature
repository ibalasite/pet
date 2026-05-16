@p2 @FF_MARKETPLACE
Feature: Pet Trading Marketplace (US-TRADE-001)
  As a pet owner with surplus pets
  I want to list my pet for trade and accept offers from other players
  So that I can exchange pets and build my ideal collection

  Background:
    Given the feature flag FF_MARKETPLACE is enabled
    And pet "pet-trade-seller" with level 5 rarity "RARE" exists and is owned with token "token-seller"
    And pet "pet-trade-buyer" with level 3 rarity "COMMON" exists and is owned with token "token-buyer"

  @TC-E2E-TRADE-001-01 @contract
  Scenario: Feature flag disabled returns FEATURE_DISABLED error
    Given the feature flag FF_MARKETPLACE is disabled
    When "token-seller" sends POST /api/v1/marketplace/listings with petId "pet-trade-seller" price 1200 description "Well trained"
    Then the response status is 403
    And the response body error code is "FEATURE_DISABLED"

  @TC-E2E-TRADE-001-02 @contract @smoke
  Scenario: Seller creates a marketplace listing at or above minimum price
    Given the minimum price for "pet-trade-seller" is 1500 based on level 5 and rarity multiplier 2
    When "token-seller" sends POST /api/v1/marketplace/listings with petId "pet-trade-seller" price 1500 description "Ready to sell"
    Then the response status is 201
    And the response body contains a "listingId" field
    And the response body field "petId" is "pet-trade-seller"
    And the database marketplace_listings has a row for "pet-trade-seller" with status "active"

  @TC-E2E-TRADE-001-03 @contract
  Scenario: Listing price below minimum formula is rejected
    Given the minimum price for "pet-trade-seller" is 1500
    When "token-seller" sends POST /api/v1/marketplace/listings with petId "pet-trade-seller" price 1400 description "Cheap"
    Then the response status is 400
    And the response body error code is "VALIDATION_ERROR"
    And no marketplace_listings row is created

  @TC-E2E-TRADE-001-04 @contract
  Scenario: Anti-flip protection prevents re-listing within 7 days of purchase
    Given pet "pet-trade-seller" was purchased from marketplace 3 days ago by the current owner
    When "token-seller" sends POST /api/v1/marketplace/listings with petId "pet-trade-seller" price 1500 description "Relisting"
    Then the response status is 400
    And the response body error code is "VALIDATION_ERROR"

  @TC-E2E-TRADE-001-05 @contract @smoke
  Scenario: Buyer purchases listing with atomic ownership transfer and 5 percent fee
    Given an active listing "listing-001" for "pet-trade-seller" at price 1000
    When "token-buyer" sends POST /api/v1/marketplace/listings/listing-001/buy
    Then the response status is 200
    And the response body field "platformFee" is 50
    And the response body field "sellerProceeds" is 950
    And the database marketplace_listings row for "listing-001" has status "sold"
    And the database pets row for "pet-trade-seller" has owner_token_hash matching "token-buyer"
    And the database marketplace_transactions has a row with transactionId and price 1000 and platformFee 50

  @TC-E2E-TRADE-001-06
  Scenario: Seller cancels active listing
    Given an active listing "listing-002" for "pet-trade-seller"
    When "token-seller" sends DELETE /api/v1/marketplace/listings/listing-002
    Then the response status is 200
    And the database marketplace_listings row for "listing-002" has status "cancelled"
    And the database pets row for "pet-trade-seller" still has owner_token_hash matching "token-seller"

  @TC-E2E-TRADE-001-07 @contract
  Scenario: Non-owner cannot cancel listing
    Given an active listing "listing-003" for "pet-trade-seller"
    When "token-buyer" sends DELETE /api/v1/marketplace/listings/listing-003
    Then the response status is 403
    And the response body error code is "NOT_OWNER"
    And the database marketplace_listings row for "listing-003" still has status "active"

  @TC-E2E-TRADE-001-08 @contract
  Scenario: Unauthenticated purchase attempt is rejected
    Given an active listing "listing-004" for "pet-trade-seller"
    When an unauthenticated POST request is made to /api/v1/marketplace/listings/listing-004/buy
    Then the response status is 401
    And the response body error code is "UNAUTHORIZED"
    And the database marketplace_listings row for "listing-004" still has status "active"

  @TC-E2E-TRADE-001-09 @contract
  Scenario: Browse marketplace listings is public
    Given 25 active marketplace_listings rows exist in the database
    When a GET request is made to /api/v1/marketplace/listings with page 1 and limit 20 without authentication
    Then the response status is 200
    And the response body "data.listings" array contains exactly 20 entries
    And the response meta field "total" is 25

  @TC-E2E-TRADE-001-10 @contract
  Scenario: Trade history is private to current pet owner
    Given pet "pet-trade-seller" has one marketplace_transactions record
    When a GET request is made to /api/v1/marketplace/history/pet-trade-seller without authentication
    Then the response status is 401
    And the response body error code is "UNAUTHORIZED"
    When "token-seller" sends GET /api/v1/marketplace/history/pet-trade-seller
    Then the response status is 200
    And the response body "data.trades" is a non-empty array
