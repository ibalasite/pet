Feature: Admin Search Performance SLA (US-ADMIN-003)
  As an admin
  I want to search through pet records quickly
  So that moderation tasks complete within reasonable time

  Scenario: Search returns results within 2 seconds for 1 million pet records
    Given the database contains 1,000,000 pet records
    And search index on (owner_email, pet_name, status) is active
    And the index covers the filtering conditions (status in BANNED, FLAGGED; rarity in EPIC, LEGENDARY; created_after)
    When an admin searches for pets matching query "rare" with filters:
      | Filter | Value |
      | status | BANNED or FLAGGED |
      | rarity | Epic or Legendary |
      | created_after | 2026-01-01 |
    Then the search returns results within 2 seconds
    And the result set includes up to 50 matching records
    And pagination cursor is provided for additional results
    And search logs query time, result count, and index hit rate for monitoring

  Scenario: Search performance consistent across query patterns
    Given the admin search index is active
    When multiple search queries are executed:
      | Query Pattern | Expected Time |
      | Single filter (status=BANNED) | < 500ms |
      | Dual filter (status + rarity) | < 1s |
      | Triple filter (status + rarity + date) | < 2s |
      | Full-text search on pet_name | < 1.5s |
    Then all queries return within the specified time envelope
    And P95 latency remains consistent across the test run

  Scenario: Search does not cause table-level locks
    Given concurrent search queries are running (admin1 searches, admin2 searches)
    When both searches are executed simultaneously
    Then both complete within 2 seconds
    And neither query blocks the other
    And no "table is locked" errors are returned
    And query logs show no lock contention

  Scenario: Search with no results returns quickly
    Given a query that matches zero pets (e.g., rarity=NONEXISTENT)
    When the query is executed
    Then the response returns within 500ms
    And an empty result set is returned
    And error message indicates "No results found" (not a database error)

  Scenario: Search index hit rate is monitored
    Given the admin performs 100 searches over a 5-minute period
    When the search log is analyzed
    Then index_hit_rate >= 95% (at least 95 queries used the index)
    And any index scans (sequential table scans) are logged as warnings
    And DBA is alerted if hit_rate drops below 90%

  Scenario: Large result sets paginated efficiently
    Given a search returns 5000 matching records
    When the first page (50 records) is requested
    Then the response returns within 2 seconds
    When the pagination cursor is used to fetch page 2
    Then the next page also returns within 2 seconds
    And cursor-based pagination does not require recalculating the entire result set
