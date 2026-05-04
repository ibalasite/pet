Feature: Training UI — Training Action Flow and Daily Cap Enforcement (US-TRAIN-001)

  Background:
    Given the player app is loaded
    And a valid "pet_token" of at least (pet_access_token_min_bytes = 32) bytes is stored in localStorage
    And the user is on the TrainingPage at "/pet/:petId/train"
    And GET /api/v1/pets/:petId returns HTTP 200 with the pet's current stats

  # --- Happy path training ---

  Scenario: Owner performs a RUN training action and StatChangeIndicator appears
    Given the TrainingPage is showing three TrainingActionCard components labeled "RUN", "STRENGTH", and "STAMINA"
    And the "actionsRemainingToday" value is 3 (training_actions_per_day = 3)
    And POST /api/v1/training responds HTTP 200 with "statDelta", "updatedStats", and "actionsRemainingToday"
    When the owner clicks the "Train" button on the "RUN" action card
    Then POST /api/v1/training is called with body {"training_type": "RUN"}
    And the Authorization header contains the Bearer token from localStorage
    And the StatChangeIndicator component appears showing "+X Speed"
    And the StatChangeIndicator is visible for (training_stat_display_duration_seconds = 2) seconds then disappears
    And the Speed StatBar in StatsPanel animates to the new speed value
    And GET /api/v1/pets/:petId is re-fetched

  Scenario: STRENGTH training action increments strength stat
    Given "actionsRemainingToday" is 2
    And POST /api/v1/training responds HTTP 200 with "statDelta", "updatedStats", and "actionsRemainingToday"
    When the owner clicks the "Train" button on the "STRENGTH" action card
    Then POST /api/v1/training is called with body {"training_type": "STRENGTH"}
    And the StatChangeIndicator shows "+X Strength" for (training_stat_display_duration_seconds = 2) seconds
    And the Strength StatBar animates to the updated value

  Scenario: STAMINA training action increments stamina stat
    Given "actionsRemainingToday" is 1
    And POST /api/v1/training responds HTTP 200 with "statDelta", "updatedStats", and "actionsRemainingToday"
    When the owner clicks the "Train" button on the "STAMINA" action card
    Then POST /api/v1/training is called with body {"training_type": "STAMINA"}
    And the StatChangeIndicator shows "+X Stamina" for (training_stat_display_duration_seconds = 2) seconds

  # --- Daily cap enforcement ---

  Scenario: All training actions exhausted — cards disabled and DailyResetTimer appears
    Given the owner has already used all (training_actions_per_day = 3) daily training actions
    And GET /api/v1/pets/:petId responds HTTP 200 with "actionsRemainingToday": 0
    When the TrainingPage renders
    Then all three TrainingActionCard "Train" buttons are disabled
    And the DailyResetTimer component is visible showing a countdown to UTC 00:00
    And the DailyResetTimer has aria-live="polite" and announces the remaining time throttled at 60-second intervals and at ≤ 5 minutes remaining
    And no "Come back tomorrow" or exhaustion message is shown without also showing the DailyResetTimer

  Scenario: Daily reset at UTC 00:00 re-enables training cards
    Given all (training_actions_per_day = 3) training actions were exhausted and the DailyResetTimer is showing
    And GET /api/v1/pets/:petId responds HTTP 200 with "actionsRemainingToday": 3
    When the UTC clock reaches 00:00
    Then GET /api/v1/pets/:petId is re-fetched
    And the three TrainingActionCard "Train" buttons become enabled again
    And the DailyResetTimer component disappears from the page

  Scenario: Stat already at maximum — toast shown and that stat card stays disabled
    Given the pet's speed stat is already at (pet_stat_max = 100)
    And POST /api/v1/training responds HTTP 400 with error code "STAT_AT_MAXIMUM"
    When the owner clicks the "Train" button on the "RUN" action card
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
    And POST /api/v1/training responds HTTP 401
    When the owner clicks the "Train" button on any action card
    Then the "pet_token" key is removed from localStorage
    And the app navigates to "/"

  # --- Server-side training behavior ---

  Scenario: Training action increments stat within valid range
    Given a pet with stat_speed = 25 and a valid petToken
    And the pet has remaining training actions today (< 3 used)
    When POST /api/v1/training is called with trainingType = "RUN"
    Then the system returns HTTP 200
    And stat_speed is incremented by a random integer in [1, 3]
    And new stat_speed is between 26 and 28 inclusive
    And a training_logs record is created with training_type, stat_delta, and stat_after values

  Scenario: Training action increments total_training_actions for level formula
    Given a pet with total_training_actions = 27 (current level = 2)
    When a training action is submitted successfully
    Then total_training_actions is incremented to 28
    And level calculation: FLOOR(28 / 10) = 2 (no level change yet)
    When 2 more training actions are submitted successfully
    Then total_training_actions = 30 and level = 3

  Scenario: Training disabled on banned pet returns HTTP 403
    Given a pet with is_banned = true and a valid petToken
    When POST /api/v1/training is called
    Then the system returns HTTP 403 with error code PET_BANNED
    And no training is applied

  Scenario: Daily training limit resets at UTC midnight
    Given a pet that completed 3 training actions at 23:59 UTC
    When the UTC day rolls over to 00:00 UTC
    And the same pet submits a new training request
    Then the request is accepted with actionsRemainingToday = 2
    And the daily counter has reset
