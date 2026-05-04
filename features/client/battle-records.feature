Feature: Battle Records Page — View History, Share URL, and Public Access (US-RECORD-001)

  Background:
    Given the player app is loaded
    And the user is on the BattleRecordsPage at "/pet/:petId/records"

  # --- Battle records display ---

  Scenario: Owner views battle records for their pet — shows last 20 battles
    Given a claimed pet with petId "pet-abc123" has (arena_battle_records_display_count = 20) stored battle records
    And GET /api/v1/pets/:petId/records responds HTTP 200 with an array of battle record objects ordered by date descending
    When the BattleRecordsPage loads
    Then the BattleHistoryTable renders with up to 20 BattleHistoryRow components
    And each row displays: date, opponent pet name, mode (RACE|SUMO), result (WIN|LOSS), stat comparison
    And the table has semantic markup with "<table>" and "<th scope="col">" column headers
    And the rows are ordered with the most recent battle at the top

  Scenario: Battle records table shows stat differential for each battle
    Given a BattleHistoryRow for a RACE match between the player's pet (speed 45) and opponent (speed 38)
    When the BattleRecordsPage renders
    Then the row displays "Speed: +7" or similar, indicating the player's speed advantage at the time of battle
    And the stat differential is readable by screen readers via aria-label

  Scenario: Public battle records page accessible without authentication
    Given a user (guest) navigates to "/pet/:petId/records" without a pet_token
    When the BattleRecordsPage loads
    Then GET /api/v1/pets/:petId/records is called WITHOUT an Authorization header
    And the BattleHistoryTable and PetSummaryCard render publicly
    And no "Sign in to see more" or auth prompt is shown

  Scenario: Battle records page shows pet summary card with rarity and level
    Given the PetSummaryCard is rendered on the BattleRecordsPage
    When the pet's stats are "level: 5, rarity: EPIC, wins: 12, losses: 8"
    Then the card displays the pet's sprite canvas (via PetCanvas component)
    And the card shows "Level 5" and "EPIC" rarity badge with appropriate color
    And the win/loss record is displayed as "12 wins, 8 losses"

  Scenario: Clicking a battle row highlights stat comparison between both pets
    Given the BattleRecordsPage is displayed with a table of battle rows
    When the user clicks or taps a specific BattleHistoryRow
    Then the row background color changes to a highlight state
    And the StatComparison component expands to show full stat breakdowns for both players

  # --- Shareable battle URLs ---

  Scenario: Owner clicks ShareBattleButton and URL is copied to clipboard
    Given the BattleRecordsPage is displayed with a ShareBattleButton at the top or bottom
    When the owner clicks the "Share Battle Results" button
    Then the button text briefly changes to "Copied!" or shows a checkmark
    And the public battle records URL "/pet/:petId/records" is copied to the system clipboard
    And the user can share this URL on social media or forums

  Scenario: Social share card generation for shareable battle URL
    Given a user shares the public URL "/pet/:petId/records" on Twitter or Discord
    When the link is previewed
    Then an Open Graph card is displayed with:
      - The pet's sprite image as the og:image
      - The pet name in the og:title
      - A summary of the pet's record (e.g., "12-8 record, Level 5") in og:description
      - The preview should be visually appealing and compelling

  Scenario: Guest views opponent's battle records after shared URL
    Given a guest receives a shared URL "/pet/:petId/records" for opponent "Zara"
    And they click the link
    When the BattleRecordsPage loads
    Then the page displays Zara's battle history publicly
    And the page shows a "Get Your Own Pet" or "Claim Your Pet" CTA at the bottom
    And clicking the CTA redirects to "/" to start the claim flow

  # --- Win/loss variations ---

  Scenario: Battle record row shows WIN indicator with green color
    Given a battle record in the BattleHistoryTable where the result is "WIN"
    When the BattleHistoryRow renders
    Then the result cell displays "WIN" with a green background or check icon
    And the cell passes a 4.5:1 contrast ratio check against its background

  Scenario: Battle record row shows LOSS indicator with red color
    Given a battle record where the result is "LOSS"
    When the BattleHistoryRow renders
    Then the result cell displays "LOSS" with a red background or X icon
    And the cell passes a 4.5:1 contrast ratio check

  Scenario: Battles against AI opponent are marked distinctly
    Given a battle record where the opponent is an AI-generated pet (not a real player)
    When the BattleHistoryRow renders
    Then the opponent name cell displays "(AI)" or a bot icon badge
    And the row is visually distinguishable from player-vs-player battles

  # --- Pagination and loading states ---

  Scenario: Empty battle records state shown when no battles exist
    Given a recently claimed pet with no battles played
    And GET /api/v1/pets/:petId/records responds HTTP 200 with an empty array
    When the BattleRecordsPage loads
    Then the BattleHistoryTable is not displayed
    And a friendly message "No battles yet. Enter the arena to get started!" is shown
    And an "Enter Arena" button is visible that navigates to "/arena"

  Scenario: Battle records page loads with skeleton loaders during fetch
    Given GET /api/v1/pets/:petId/records is pending (takes 2+ seconds)
    When the BattleRecordsPage mounts
    Then skeleton loaders appear in the BattleHistoryTable placeholder rows
    And the PetSummaryCard shows a skeleton loader for the sprite canvas

  # --- Accessibility ---

  Scenario: Battle records table is keyboard navigable
    Given the BattleRecordsPage is rendered with a BattleHistoryTable
    When the user navigates using the Tab key
    Then each BattleHistoryRow is focusable
    And pressing Enter on a focused row highlights it
    And the table has proper "<table>", "<thead>", "<tbody>", and "<tr>" structure

  Scenario: Battle result colors pass contrast ratio checks
    Given the BattleHistoryTable with WIN (green) and LOSS (red) result indicators
    When tested with a contrast analyzer
    Then each color meets the 4.5:1 minimum contrast ratio for text on its background
    And the colors are distinguishable for color-blind users (not red/green alone)

  Scenario: Responsive battle records table on mobile (320px viewport)
    Given the viewport width is 320px (mobile)
    When the BattleRecordsPage loads
    Then the BattleHistoryTable adapts to a mobile-friendly view (e.g., stacked rows or horizontal scroll)
    And the pet sprite remains visible and properly sized
    And the table does not cause horizontal overflow beyond the viewport
