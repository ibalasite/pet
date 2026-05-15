@us-trade-001 @wip
Feature: Pet Trading Marketplace UI — Browse Listings and Initiate Trade (US-TRADE-001)

  # This feature is deferred and not yet implemented.
  # The trading marketplace is planned for a future release.
  # Scenarios tagged @future document the intended client-side flow.

  Background:
    Given the player app is loaded
    And a valid "pet_token" is stored in localStorage

  @future @TC-CLI-TRADE-001
  Scenario: Owner browses marketplace listings and views available pets for trade
    Given the owner navigates to "/marketplace"
    And GET /api/v1/marketplace/listings responds HTTP 200 with a list of listed pets
    When the MarketplacePage renders
    Then a grid of ListingCard components is displayed
    And each ListingCard shows the pet sprite, rarity badge, stat summary, and asking price
    And a search/filter bar allows filtering by rarity and stat range
    And an "Offer Trade" button is visible on each ListingCard
