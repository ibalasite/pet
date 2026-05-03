Feature: Training UI — Training Action Flow and Daily Cap Enforcement (US-TRAIN-001)

  Background:
    Given the player app is loaded
    And a valid "pet_token" of at least (pet_access_token_min_bytes = 32) bytes is stored in localStorage
    And the user is on the TrainingPage at "/pet/:petId/train"
    And GET /api/v1/pets/:petId returns HTTP 200 with "actionsRemainingToday" > 0

  # --- Happy path training ---

  Scenario: Owner performs a RUN training action and StatChangeIndicator appears
    Given the TrainingPage renders three TrainingActionCard components labeled "RUN", "STRENGTH", and "STAMINA"
    And the "actionsRemainingToday" value is 3 (training_actions_per_day = 3)
    When the owner clicks the "Train" button on the "RUN" action card
    Then POST /api/v1/pets/:petId/train is called with body {"trainingType": "RUN"}
    And the Authorization header contains the Bearer token from localStorage
    And the server responds HTTP 200 with "statDelta", "updatedStats", and "actionsRemainingToday"
    And the StatChangeIndicator component appears showing "+X Speed"
    And the StatChangeIndicator is visible for (training_stat_display_duration_seconds = 2) seconds then disappears
    And the Speed StatBar in StatsPanel animates to the new speed value
    And the usePet TanStack Query cache is invalidated triggering a re-fetch of GET /api/v1/pets/:petId

  Scenario: STRENGTH training action increments strength stat
    Given "actionsRemainingToday" is 2
    When the owner clicks the "Train" button on the "STRENGTH" action card
    Then POST /api/v1/pets/:petId/train is called with body {"trainingType": "STRENGTH"}
    And the StatChangeIndicator shows "+X Strength" for (training_stat_display_duration_seconds = 2) seconds
    And the Strength StatBar animates to the updated value

  Scenario: STAMINA training action increments stamina stat
    Given "actionsRemainingToday" is 1
    When the owner clicks the "Train" button on the "STAMINA" action card
    Then POST /api/v1/pets/:petId/train is called with body {"trainingType": "STAMINA"}
    And the StatChangeIndicator shows "+X Stamina" for (training_stat_display_duration_seconds = 2) seconds

  # --- Daily cap enforcement ---

  Scenario: All training actions exhausted — cards disabled and DailyResetTimer appears
    Given the owner has already used all (training_actions_per_day = 3) daily training actions
    And POST /api/v1/pets/:petId/train responds HTTP 400 with error code "TRAINING_LIMIT_REACHED"
    When the TrainingPage renders
    Then all three TrainingActionCard "Train" buttons are disabled
    And the DailyResetTimer component is visible showing a countdown to UTC 00:00
    And the DailyResetTimer has aria-live="polite" and announces the remaining time throttled at 60-second intervals and at ≤ 5 minutes remaining
    And no "Come back tomorrow" or exhaustion message is shown without also showing the DailyResetTimer

  Scenario: Daily reset at UTC 00:00 re-enables training cards
    Given all (training_actions_per_day = 3) training actions were exhausted and the DailyResetTimer is showing
    When the UTC clock reaches 00:00 and the usePet query cache is invalidated
    Then GET /api/v1/pets/:petId is re-fetched and returns "actionsRemainingToday": 3
    And the three TrainingActionCard "Train" buttons become enabled again
    And the DailyResetTimer component disappears from the page

  Scenario: Stat already at maximum — toast shown and that stat card stays disabled
    Given the pet's speed stat is already at (pet_stat_max = 100)
    When the owner clicks the "Train" button on the "RUN" action card
    And POST /api/v1/pets/:petId/train responds HTTP 400 with error code "STAT_AT_MAXIMUM"
    Then a toast notification appears with message "Stat is already at maximum"
    And the "RUN" action card "Train" button is disabled with a "Max" indicator
    And the "STRENGTH" and "STAMINA" action card buttons remain enabled

  Scenario: Training action renders with correct tab-order for keyboard navigation
    Given the TrainingPage is loaded with three action cards
    When the user navigates using the Tab key
    Then the focus order follows: "RUN" card → RUN Train button → "STRENGTH" card → STRENGTH Train button → "STAMINA" card → STAMINA Train button
    And each "Train" button is activatable via Enter or Space

  Scenario: HTTP 401 during training clears token and redirects to home
    Given the owner is on the TrainingPage
    When POST /api/v1/pets/:petId/train responds HTTP 401
    Then the "pet_token" key is removed from localStorage via clearPetToken()
    And the app navigates to "/"
