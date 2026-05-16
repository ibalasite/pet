@p0 @smoke
Feature: Global Leaderboard (US-BOARD-001)
  As a competitive player
  I want to view a global leaderboard ranking all pets by performance
  So that I have a clear goal to work toward

  Background:
    Given the Redis sorted set "leaderboard:global" contains 150 entries with varying scores

  @TC-E2E-BOARD-001-01 @contract @smoke
  Scenario: Leaderboard returns top 100 pets publicly without authentication
    When a GET request is made to /api/v1/leaderboard without authentication
    Then the response status is 200
    And the response body "data.entries" array contains exactly 100 entries
    And each entry has fields: rank petId petName rarity level score winRate
    And entries are ordered by score descending
    And the response meta contains total page and limit fields

  @TC-E2E-BOARD-001-02
  Scenario: Leaderboard filterable by rarity tier
    Given the Redis sorted set "leaderboard:global" contains pets of all rarity tiers
    When a GET request is made to /api/v1/leaderboard with query param rarity=EPIC without authentication
    Then the response status is 200
    And all entries in "data.entries" have rarity "EPIC"

  @TC-E2E-BOARD-001-03 @contract
  Scenario: Individual pet rank is returned publicly
    Given a pet "pet-rank-042" with score 87.4 exists in the leaderboard at rank 42
    When a GET request is made to /api/v1/leaderboard/rank/pet-rank-042 without authentication
    Then the response status is 200
    And the response body field "rank" is 42
    And the response body field "score" is 87.4

  @TC-E2E-BOARD-001-04 @contract
  Scenario: Pet rank returns 404 for nonexistent pet
    When a GET request is made to /api/v1/leaderboard/rank/nonexistent-pet-uuid without authentication
    Then the response status is 404
    And the response body error code is "PET_NOT_FOUND"

  @TC-E2E-BOARD-001-05
  Scenario: Leaderboard falls back to PostgreSQL snapshot when Redis is unavailable
    Given Redis is unavailable
    And the database table leaderboard_snapshots has a recent row with valid leaderboard data
    When a GET request is made to /api/v1/leaderboard without authentication
    Then the response status is 200
    And the response body field "degraded" is true
    And the response body "data.entries" is a non-empty array

  @TC-E2E-BOARD-001-06
  Scenario: Leaderboard score is updated within 30 seconds after a battle
    Given pet "pet-board-001" completes a winning Race battle
    And the battle result is persisted in arena_matches
    When 30 seconds elapse for the leaderboard sync job to run
    Then the Redis sorted set "leaderboard:global" contains "pet-board-001" with an updated score

  @TC-E2E-BOARD-001-07
  Scenario: Banned pet is removed from leaderboard within 5 minutes
    Given pet "pet-board-002" exists in the Redis sorted set "leaderboard:global" at rank 10
    And an admin session cookie is set for a moderator admin user
    When the admin sends POST /admin/api/pets/pet-board-002/ban with reason "bot activity detected"
    Then the response status is 200
    And the Redis sorted set "leaderboard:global" does NOT contain "pet-board-002"
    And the database admin_audit_log has a row with action "BAN" and pet_id "pet-board-002"

  @TC-E2E-BOARD-001-08
  Scenario: Leaderboard validation error for invalid rarity filter
    When a GET request is made to /api/v1/leaderboard with query param rarity=INVALID without authentication
    Then the response status is 400
    And the response body error code is "VALIDATION_ERROR"
