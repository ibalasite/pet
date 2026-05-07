@US-TRADE-001 @FF_MARKETPLACE
Feature: Marketplace Trading System — Pet Sales and Anti-Flip Protection (US-TRADE-001) [FF_MARKETPLACE]
  As a pet owner
  I want to list my pet for sale in the marketplace
  So that I can trade pets with other players

  Scenario: Feature flag controls marketplace access
    Given FF_MARKETPLACE = false (feature disabled)
    When POST /api/v1/marketplace/listings is called with a valid petToken
    Then the system returns HTTP 403 with error code FEATURE_DISABLED
    And error message is "The marketplace feature is not currently available"
    When FF_MARKETPLACE is set to true
    And the same request is resubmitted
    Then the system returns HTTP 201 with created listing

  Scenario: Create marketplace listing with price validation
    Given a pet owned by player A with petToken_A
    And pet stats: level = 5, rarity = RARE
    And minimum price formula: (level × 100) + (rarity_multiplier × 500) = (5 × 100) + (2 × 500) = 1500
    When POST /api/v1/marketplace/listings is called with price_credits = 2000
    Then the system returns HTTP 201 with:
      | Field | Value |
      | id | listing_uuid |
      | status | active |
      | price_credits | 2000 |
      | listed_at | ISO-8601 timestamp |
    And marketplace_listings row is created in PostgreSQL

  Scenario: Listing price below minimum rejected
    Given a pet with minimum required price = 1500 credits
    When POST /api/v1/marketplace/listings is called with price_credits = 1400
    Then the system returns HTTP 400 with error code VALIDATION_ERROR
    And error message indicates minimum price requirement
    And no listing is created

  Scenario: Anti-flip protection prevents rapid re-listing
    Given a pet sold in marketplace_transactions 3 days ago (within 7-day anti-flip window)
    And the same pet is owned by a new buyer (marketplace_trade_antiflip_protection_days = 7)
    When POST /api/v1/marketplace/listings is called to list the pet again
    Then the system returns HTTP 400 with error code VALIDATION_ERROR
    And error message is "This pet cannot be re-listed within 7 days of purchase"
    And no new listing is created

  Scenario: Purchase listing transfers ownership and applies platform fee
    Given an active listing with price_credits = 1000 owned by seller_A
    And buyer_B with a valid petToken and sufficient credits
    And platform fee = 5% of price (trade_transaction_fee_percent = 5)
    When POST /api/v1/marketplace/listings/:listingId/buy is called with buyer_B's token
    Then the system returns HTTP 200
    And marketplace_transactions record is created with:
      | Field | Value |
      | listing_id | listing_uuid |
      | pet_id | pet_uuid |
      | price_credits | 1000 |
      | fee_credits | FLOOR(1000 × 0.05) = 50 |
      | seller_token_hash | SHA-256(seller_A_token) |
      | buyer_token_hash | SHA-256(buyer_B_token) |
      | completed_at | current timestamp |
    And marketplace_listings.status is updated to 'sold'
    And marketplace_listings.completed_at is set
    And seller_A receives 950 credits (1000 - 50 fee)
    And buyer_B receives ownership of the pet

  Scenario: Cancel active listing
    Given an active listing created by player_A
    When DELETE /api/v1/marketplace/listings/:listingId is called with player_A's petToken
    Then the system returns HTTP 200
    And marketplace_listings.status is updated to 'cancelled'
    And marketplace_listings.completed_at is set to NOW()
    And the pet remains owned by player_A

  Scenario: Only listing owner can cancel
    Given an active listing owned by player_A with listingId "list-001"
    And player_B with a different petToken
    When DELETE /api/v1/marketplace/listings/list-001 is called with player_B's token
    Then the system returns HTTP 403 with error code NOT_OWNER
    And the listing remains active

  Scenario: Purchase endpoint requires buyer authentication
    Given an active listing
    When POST /api/v1/marketplace/listings/:listingId/buy is called WITHOUT authentication
    Then the system returns HTTP 401 with error code UNAUTHORIZED
    And the listing is not marked as sold

  Scenario: Browse marketplace listings
    Given 50 active marketplace listings with varying prices and rarities
    When GET /api/v1/marketplace/listings?page=1&limit=20&sortBy=price&order=asc is called
    Then the system returns HTTP 200 with:
      | Field | Value |
      | listings.length | 20 |
      | meta.total | 50 |
      | meta.page | 1 |
    And listings are sorted by price ascending (lowest to highest)
    And each listing includes pet summary: petId, rarity, level, owner name (masked)

  Scenario: Trade history private to pet owner
    Given a pet with completed sale in marketplace_transactions
    And the pet is now owned by a new buyer
    When GET /api/v1/marketplace/history/:petId is called without authentication
    Then the system returns HTTP 401 with error code UNAUTHORIZED
    When GET /api/v1/marketplace/history/:petId is called with current owner's petToken
    Then the system returns HTTP 200 with complete transaction history
    And includes: price_credits, fee_credits, seller_name (masked), completed_at
    And transaction history is private to current owner only
