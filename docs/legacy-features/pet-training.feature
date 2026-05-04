Feature: Pet Training System — Stat Progression and Daily Limits
  As a pet owner
  I want to train my pet to improve its stats
  So that it becomes stronger for arena battles

  Scenario: Training action increments stat within valid range
    Given a pet with stat_speed = 25 and a valid petToken
    And the pet has remaining training actions today (< 3 used)
    When POST /api/v1/pets/:petId/train is called with trainingType = "RUN"
    Then the system returns HTTP 200
    And stat_speed is incremented by a random integer in [1, 3] (training_stat_points_min, training_stat_points_max)
    And new stat_speed is between 26 and 28 inclusive
    And the training action count for today is incremented
    And a training_logs record is created with training_type = 'RUN', stat_delta, and stat_after values

  Scenario: Three daily training actions per pet per UTC day
    Given a pet with zero training actions completed today (UTC day just started)
    And the pet's owner is authenticated with petToken
    When the owner submits 3 training requests in sequence (RUN, STRENGTH, STAMINA)
    Then all 3 requests return HTTP 200
    And each stat is incremented by [1, 3] points
    And actionsRemainingToday in the 3rd response = 0
    When a 4th training request is submitted
    Then the system returns HTTP 400 with error code TRAINING_LIMIT_REACHED
    And the message is "You have used all 3 training actions for today"

  Scenario: Training blocked when stat is at maximum
    Given a pet with stat_strength = 100 (pet_stat_max)
    And the owner is authenticated with petToken
    When POST /api/v1/pets/:petId/train with trainingType = "STRENGTH" is submitted
    Then the system returns HTTP 400 with error code STAT_AT_MAXIMUM
    And the stat remains at 100
    And the training action is NOT consumed

  Scenario: Training action unauthenticated request rejected
    Given a pet with remaining training actions available
    When POST /api/v1/pets/:petId/train is called WITHOUT authentication header
    Then the system returns HTTP 401 with error code UNAUTHORIZED
    And no training is applied

  Scenario: Training action only available to pet owner
    Given a claimed pet owned by player A with petToken_A
    And another player B with a different petToken_B
    When POST /api/v1/pets/:petId/train is called with Authorization: Bearer {petToken_B}
    Then the system returns HTTP 403 with error code NOT_OWNER
    And no training is applied

  Scenario: Training action increments total_training_actions for level formula
    Given a pet with total_training_actions = 27 (current level = 2)
    When a training action is submitted successfully
    Then total_training_actions is incremented to 28
    And level calculation: FLOOR(28 / 10) = 2 (no level change yet)
    When 2 more training actions are submitted successfully
    Then total_training_actions = 30
    And level is calculated as FLOOR(30 / 10) = 3
    And the response includes the updated level

  Scenario: Training disabled on banned pet
    Given a pet with is_banned = true
    And a valid petToken for that pet
    When POST /api/v1/pets/:petId/train is called
    Then the system returns HTTP 403 with error code PET_BANNED
    And no training is applied

  Scenario: Daily training limit resets at UTC midnight
    Given a pet that completed 3 training actions at 23:59 UTC
    When the UTC day rolls over to 00:00 UTC
    And the same pet submits a new training request
    Then the request is accepted (actionsRemainingToday = 2)
    And the daily counter has reset
