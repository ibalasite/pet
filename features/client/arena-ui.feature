Feature: Arena UI — Enter Arena Flow, Rate Limit UI, and Battle Result Display (US-ARENA-001, US-ARENA-002)

  Background:
    Given the player app is loaded
    And a valid "pet_token" of at least (pet_access_token_min_bytes = 32) bytes is stored in localStorage
    And the user has navigated to the ArenaPage at "/arena"

  # --- Mode selection and arena entry ---

  Scenario: Owner selects RACE mode and clicks Enter Arena — matchmaking begins
    Given the ModeSelector component shows two options: "RACE" and "SUMO"
    And no prior HTTP 429 rate limit response is stored in the Zustand arena slice
    When the owner clicks the "RACE" option in ModeSelector
    And the owner clicks the "Enter Arena" button in PreBattlePanel
    Then POST /api/v1/arena/enter is called with body {"petId": "<petId>", "mode": "RACE"}
    And the Authorization header contains the Bearer token from localStorage
    And the MatchmakingStatus component appears with text "Finding opponent..."
    And the MatchmakingStatus has aria-live="polite" and aria-busy="true"

  Scenario: Opponent found within matchmaking timeout — battle animation plays
    Given the MatchmakingStatus is showing "Finding opponent..."
    And the owner has clicked the "Enter Arena" button in PreBattlePanel
    And POST /api/v1/arena/enter responds HTTP 200 with "matchId", "result", and "opponentPetId"
    When the opponent is matched and the response is received before the (arena_matchmaking_timeout_seconds = 30)-second timeout
    Then a 3-2-1 pre-battle countdown animation plays in the ArenaPage
    And the ArenaScene Phaser component loads and plays the battle animation
    And the battle animation lasts between (arena_match_duration_min_seconds = 5) and (arena_match_duration_max_seconds = 15) seconds
    And the app navigates to "/arena/result/:matchId" after the animation completes

  Scenario: No opponent found — AIOfferModal is shown after 30-second timeout
    Given the owner has clicked the "Enter Arena" button in PreBattlePanel
    And POST /api/v1/arena/enter responds HTTP 408 with error code "MATCHMAKING_TIMEOUT" after the (arena_matchmaking_timeout_seconds = 30)-second timeout elapses
    When the matchmaking timeout fires
    Then the MatchmakingStatus text changes to "No opponent found"
    And the AIOfferModal appears with role="dialog" and aria-modal="true"
    And the modal has a focus trap: Tab cycles focus within the modal while it is open
    And the modal is dismissible via the Escape key

  Scenario: User accepts AI opponent from AIOfferModal — battle proceeds
    Given the AIOfferModal is visible after a matchmaking timeout
    And the selected battle mode is "RACE"
    And POST /api/v1/arena/enter responds HTTP 200 with "matchId", "result", and "opponentPetId"
    When the owner clicks the "Accept AI Opponent" button inside the modal
    Then POST /api/v1/arena/enter is re-called with body {"petId": "<petId>", "mode": "RACE", "acceptAI": true} to signal AI opponent acceptance
    And the battle animation plays and the result page is shown at "/arena/result/:matchId"

  # --- Rate limit UI ---

  Scenario: Arena rate limit reached — RateLimitBanner shown and Enter Arena disabled
    Given the owner has already entered (arena_rate_limit_battles_per_hour_default = 10) arena battles in the current hour
    And POST /api/v1/arena/enter responds HTTP 429 with a "Retry-After" header
    When the owner clicks the "Enter Arena" button in PreBattlePanel
    Then the Zustand arena slice stores the rate limit state
    And the RateLimitBanner component renders with role="alert" and aria-live="assertive"
    And the RateLimitBanner displays a countdown timer showing the remaining time until the rate limit resets
    And the "Enter Arena" button in PreBattlePanel is disabled for the duration of the cooldown

  Scenario: Rate limit countdown expires — Enter Arena button re-enabled
    Given the RateLimitBanner is visible with a countdown timer
    When the Retry-After duration elapses
    Then the RateLimitBanner component disappears
    And the "Enter Arena" button becomes enabled again

  Scenario: Banned pet cannot enter arena
    Given the player's pet has been banned by an admin
    And POST /api/v1/arena/enter responds HTTP 403 with error code "PET_BANNED"
    When the owner clicks the "Enter Arena" button in PreBattlePanel
    Then a ban notice is displayed on the ArenaPage
    And the "Enter Arena" button remains disabled
    And the user is not navigated away from "/arena"

  # --- Battle result display ---

  Scenario: Battle result page shows WIN card with stat comparison and share button
    Given the match is complete and the player's pet won
    And the app has navigated to "/arena/result/:matchId"
    And GET /api/v1/arena/match/:matchId responds HTTP 200 with "result": "WIN"
    When the ResultPage renders
    Then the BattleResultCard displays in "WIN" variant with the pet's name and win indicator
    And the StatComparison component shows both pets' stats side by side
    And the ShareBattleButton component is visible and copies the public "/arena/result/:matchId" URL when clicked

  Scenario: Battle result page shows LOSS card
    Given the match is complete and the player's pet lost
    And the app has navigated to "/arena/result/:matchId"
    And GET /api/v1/arena/match/:matchId responds HTTP 200 with "result": "LOSS"
    When the ResultPage renders
    Then the BattleResultCard displays in "LOSS" variant

  Scenario: SUMO mode is available alongside RACE in the ModeSelector
    Given the ArenaPage is loaded with the FF_ARENA_SUMO feature flag enabled
    And both "RACE" and "SUMO" option buttons are visible and focusable
    When the owner selects "SUMO" in the ModeSelector and clicks the "Enter Arena" button
    Then POST /api/v1/arena/enter is called with body {"petId": "<petId>", "mode": "SUMO"}
