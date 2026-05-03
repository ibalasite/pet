Feature: Leaderboard UI — Display, Rarity Filter, Owner Rank Banner, and Degraded State (US-BOARD-001, US-RARITY-001)

  Background:
    Given the player app is loaded
    And the user has navigated to the LeaderboardPage at "/leaderboard"

  # --- Normal leaderboard display ---

  Scenario: Public leaderboard loads top 100 pets without authentication
    Given no "pet_token" is present in localStorage
    And GET /api/v1/leaderboard?page=1&limit=100 responds HTTP 200 with an array of up to (leaderboard_top_display = 100) pet entries
    When the LeaderboardPage renders
    Then the LeaderboardTable renders with up to 100 LeaderboardRow components
    And the table has semantic markup with "<table>" containing "<th scope="col">" column headers
    And no login prompt or token is required to view the page

  Scenario: Leaderboard auto-refreshes every 30 seconds via TanStack Query
    Given the LeaderboardPage is mounted
    And (leaderboard_update_lag_max_seconds = 30) seconds have elapsed since the last fetch
    And GET /api/v1/leaderboard responds HTTP 200 with refreshed pet entries
    When the TanStack Query stale timer fires a background refetch
    Then the LeaderboardTable updates to reflect the refreshed data without a full page reload

  Scenario: Rarity filter updates URL and refetches leaderboard
    Given the LeaderboardPage is loaded showing all rarities
    And GET /api/v1/leaderboard?rarity=EPIC&page=1&limit=100 responds HTTP 200 with EPIC rarity pet entries
    When the owner clicks the "Epic" tab in the RarityFilter component
    Then the browser URL changes to "/leaderboard?rarity=EPIC"
    And GET /api/v1/leaderboard?rarity=EPIC&page=1&limit=100 is called
    And only EPIC rarity pets are shown in the LeaderboardTable

  Scenario: Rarity filter selection is preserved on page refresh
    Given the user is on "/leaderboard?rarity=RARE"
    And GET /api/v1/leaderboard?rarity=RARE&page=1&limit=100 responds HTTP 200 with RARE rarity pet entries
    When the page is refreshed
    Then the "Rare" tab is active in RarityFilter
    And GET /api/v1/leaderboard?rarity=RARE&page=1&limit=100 is called on mount

  Scenario: Owner rank banner shows when pet token is present and pet is in top 100
    Given a "pet_token" is present in localStorage identifying pet "abc123"
    And GET /api/v1/leaderboard/rank/abc123 responds HTTP 200 with {"rank": 47, "petName": "Zara"}
    When the LeaderboardPage renders
    Then the OwnerRankBanner component is visible with text "Your pet Zara is ranked #47"
    And the OwnerRankBanner has role="status"

  Scenario: Owner rank banner shows when pet is ranked below top 100
    Given a "pet_token" is present in localStorage identifying pet "abc123"
    And GET /api/v1/leaderboard/rank/abc123 responds HTTP 200 with {"rank": 342, "petName": "Bolt"}
    When the LeaderboardPage renders
    Then the OwnerRankBanner shows "Your pet Bolt is ranked #342"
    And the pet is not visible in the main LeaderboardTable (which only displays top 100)

  Scenario: Owner rank banner is hidden when no pet token is present
    Given no "pet_token" is in localStorage
    When the LeaderboardPage renders
    Then the OwnerRankBanner component is not rendered

  Scenario: Clicking a leaderboard row navigates to the pet's battle records page
    Given the LeaderboardTable shows a row for pet "Blaze" with petId "xyz789"
    When the user clicks or presses Enter on the "Blaze" LeaderboardRow
    Then the app navigates to "/pet/xyz789/records"

  # --- Degraded leaderboard state ---

  Scenario: Degraded leaderboard banner shown when Redis is unavailable
    Given GET /api/v1/leaderboard responds HTTP 200 but with response body field "degraded": true indicating stale/cached data from a degraded Redis backend
    When the LeaderboardPage renders the response
    Then an orange "Live data temporarily unavailable" banner is visible above the LeaderboardTable
    And the banner has a color that meets 4.5:1 contrast ratio against its background

  Scenario: Banned pet removed from leaderboard within 5 minutes of admin ban
    Given a pet with petId "bad123" is visible at rank 12 in the LeaderboardTable
    And the pet "bad123" has been banned by an admin
    When (leaderboard_ban_reflection_time_minutes = 5) minutes have elapsed and the leaderboard auto-refresh fires
    Then "bad123" no longer appears in any LeaderboardRow in the LeaderboardTable
