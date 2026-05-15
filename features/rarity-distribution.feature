@US-PET-002 @US-RARITY-001
Feature: Pet Rarity Distribution Algorithm (US-PET-002, US-RARITY-001)
  As a game designer
  I want to verify that pet rarity follows the specified probability distribution
  So that players get a balanced experience without gaming the system

  @TC-SRV-RARITY-001
  Scenario: Pet generation follows 60-25-12-3 rarity distribution
    Given a test harness generates 10000 pets
    When the generation completes
    Then the distribution is within acceptable bounds:
      | Rarity    | Target | Min   | Max   |
      | Common    | 60%    | 58%   | 62%   |
      | Rare      | 25%    | 23%   | 27%   |
      | Epic      | 12%    | 10%   | 14%   |
      | Legendary | 3%     | 1.5%  | 4.5%  |
    And the chi-square test (α=0.05) confirms distribution is not statistically biased
    And no single rarity bucket deviates more than 2 percentage points from target

  @TC-SRV-RARITY-002
  Scenario: Individual rarity probabilities sum to 100%
    Given the rarity weights are defined as:
      | Rarity    | Weight |
      | Common    | 0.60   |
      | Rare      | 0.25   |
      | Epic      | 0.12   |
      | Legendary | 0.03   |
    When the weights are summed
    Then the total equals 1.00 (100%)
    And no negative or inverted weights are present

  @TC-SRV-RARITY-003
  Scenario: Rarity seed determinism with same random seed
    Given a pet generation request with random_seed = 12345
    When the pet is generated and rarity is determined
    And a second pet is generated with the same random_seed = 12345
    Then both pets have the SAME rarity value
    And the rarity determination is reproducible

  @TC-SRV-RARITY-004
  Scenario: Rarity distribution holds across population samples
    Given multiple samples of 5000 pets each
    When the rarity distribution is calculated for each sample
    Then each sample distribution remains within the acceptable bounds
    And no sample exhibits statistical anomalies (e.g., all Legendary)

  @TC-SRV-RARITY-005
  Scenario: Legendary rarity cap enforcement
    Given a large batch of 50000 pets is generated
    When the rarity distribution is calculated
    Then Legendary rarity count remains within the acceptable bounds: 1.5% to 4.5%
    And the 3% baseline (1500 pets) is maintained as the expected value
    And statistical variance is due to random distribution, not algorithm bias
