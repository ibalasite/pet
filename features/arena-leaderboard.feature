Feature: Leaderboard System — Ranking, Updates, and Resilience
  As a player
  I want to see the global leaderboard rankings
  So that I can track my progress against other players

  Scenario: Leaderboard displays top 100 pets publicly
    Given 200 pets with varying leaderboard scores in Redis leaderboard:global sorted set
    When GET /api/v1/leaderboard with page=1, limit=100 is called without authentication
    Then the system returns HTTP 200 with:
      | Field | Value |
      | entries.length | 100 (leaderboard_top_display) |
      | meta.total | total leaderboard size |
      | meta.page | 1 |
      | meta.limit | 100 |
    And each entry contains: rank, petId, petName, rarity, level, score, winRate
    And entries are sorted by score descending (highest rank first)

  Scenario: Leaderboard filterable by rarity tier
    Given the leaderboard contains pets of all four rarity tiers: COMMON, RARE, EPIC, LEGENDARY
    When GET /api/v1/leaderboard?rarity=EPIC is called
    Then only EPIC-rarity pets are returned in the entries array
    And pets of other rarities are excluded
    And meta.total reflects the filtered count

  Scenario: Leaderboard score calculation from formula
    Given a pet with:
      | Stat | Value |
      | win_rate | 0.75 |
      | battles_played | 40 |
      | level | 5 |
    When arena_score is calculated using: win_rate × battles_played × level_multiplier
    Then the result equals 0.75 × 40 × level_multiplier(5)
    And this score is used for leaderboard ranking

  Scenario: Leaderboard updated after battle completion
    Given petA and petB complete a battle
    And petA wins with updated score = 150.5
    And petB loses with updated score = 142.3
    When the leaderboard is queried within 30 seconds (leaderboard_update_lag_max_seconds)
    Then Redis leaderboard:global contains updated scores for both pets
    And the scores are visible via ZREVRANK queries
    And new ranks reflect the updated scores

  Scenario: Pet rank query for individual pet
    Given a pet with petId "pet-uuid-005" ranked 42nd on the leaderboard
    When GET /api/v1/leaderboard/rank/pet-uuid-005 is called without authentication
    Then the system returns HTTP 200 with:
      | Field | Value |
      | rank | 42 |
      | score | calculated_score_value |
      | petId | pet-uuid-005 |

  Scenario: Banned pet removed from leaderboard
    Given a pet currently ranked in top 100
    And admin calls POST /admin/api/pets/:petId/ban with a reason
    When the leaderboard is queried within 5 minutes (leaderboard_ban_reflection_time_minutes)
    Then Redis ZRANK returns null for the banned pet
    And the pet is no longer visible in GET /api/v1/leaderboard results
    And other pets' ranks are updated accordingly

  Scenario: Leaderboard falls back to PostgreSQL snapshot when Redis unavailable
    Given Redis is unavailable (connection refused or timeout)
    And leaderboard_snapshots table contains a recent snapshot (within the last hour)
    When GET /api/v1/leaderboard is called
    Then the system returns HTTP 200 with degraded: true in response meta
    And data is sourced from PostgreSQL leaderboard_snapshots
    And snapshot_time is included to indicate staleness
    And entries array contains top-N entries from the snapshot

  Scenario: Erased GDPR pet removed from leaderboard
    Given a pet belonging to a user who submitted GDPR erasure request
    And the pet is currently ranked on the leaderboard
    When the GDPR erasure background job completes
    Then Redis ZREM is called to remove the pet from leaderboard:global
    And subsequent GET /api/v1/leaderboard queries no longer include that pet
    And the pet's rank is no longer queryable

  Scenario: Pagination through leaderboard entries
    Given 250 total pets on the leaderboard
    When GET /api/v1/leaderboard?page=1&limit=100 is called
    Then 100 entries (ranks 1-100) are returned
    When GET /api/v1/leaderboard?page=2&limit=100 is called
    Then 100 entries (ranks 101-200) are returned
    And meta.total = 250
    And meta.page = 2

  Scenario: Leaderboard empty result handles gracefully
    Given a query for rarity filter that matches no pets (e.g., ?rarity=NONEXISTENT)
    When GET /api/v1/leaderboard?rarity=NONEXISTENT is called
    Then HTTP 400 is returned with VALIDATION_ERROR
    And error message indicates invalid rarity value

  Scenario: Battle records history publicly accessible
    Given a pet with 25 completed battles (exceeds the 20-battle display limit)
    When GET /api/v1/arena/history/:petId is called without authentication
    Then the system returns HTTP 200 with:
      | Field | Value |
      | battles.length | 20 (arena_battle_records_display_count) |
      | summary.wins | count of wins |
      | summary.losses | count of losses |
      | summary.winRate | wins / (wins + losses) |
    And the 20 most recent battles are included (oldest 5 omitted)
