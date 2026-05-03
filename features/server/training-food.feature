Feature: Training and Food System (US-TRAIN-001, US-FOOD-001)

  Scenario: Training action increments a stat within bounds and enforces the daily action cap
    Given pet "trainee-token-001" has used 0 training actions today
    When the owner submits a training request via POST /api/v1/training with body { "training_type": "STRENGTH" } for "trainee-token-001"
    Then the server increments the strength stat by a value between (training_stat_points_min = 1) and (training_stat_points_max = 3) points
    And a training_logs row is written for "trainee-token-001" bringing today's training log count to 1
    When the owner submits two more valid POST /api/v1/training requests for "trainee-token-001" on the same day
    Then the count of training_logs rows today for "trainee-token-001" reaches (training_actions_per_day = 3)
    When the owner submits a fourth POST /api/v1/training request for "trainee-token-001" on the same day
    Then the server responds with HTTP 429 and error code "TRAINING_DAILY_LIMIT_REACHED"

  Scenario: Temporary food buff applies bonus stat during an arena battle and expires after duration
    Given pet "buffed-pet-token" has a base speed stat of 50
    And a food buff of (food_buff_example_temp_amount_stat_points = 5) speed points has been applied to "buffed-pet-token" via POST /api/v1/food/apply with the food_buffs row recording expires_at (food_buff_example_temp_duration_hours = 24) hours from now
    When a Race battle begins for "buffed-pet-token" within the buff duration window
    Then the battle engine reads "buffed-pet-token" effective speed as 55 for the duration of that match
    And the opponent pet's stats are read without any buff modifier
    When (food_buff_example_temp_duration_hours = 24) hours have elapsed since the buff was applied
    Then the food_buffs row for "buffed-pet-token" has expired_at set to a non-null timestamp and "buffed-pet-token" effective speed reverts to the base value of 50
