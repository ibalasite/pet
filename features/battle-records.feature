@p0 @smoke
Feature: Battle Records Page (US-RECORD-001)
  As a pet owner
  I want to share my pet's battle records via a public URL
  So that I can show off wins and attract new players

  Background:
    Given pet "pet-record-001" with rarity "RARE" and petName "Crimson Vexor" exists in the database
    And pet "pet-record-001" has 20 arena_matches records with mode "RACE" and mixed Win/Loss results

  @TC-E2E-RECORD-001-01 @contract @smoke
  Scenario: Battle records endpoint returns last 20 battles publicly without auth
    When a GET request is made to /api/v1/arena/history/pet-record-001 without authentication
    Then the response status is 200
    And the response body "battles" array contains exactly 20 entries
    And each entry has fields: matchId mode opponentPetId isAiOpponent result completedAt
    And the response body "summary" contains wins losses and winRate fields

  @TC-E2E-RECORD-001-02
  Scenario: Battle records with fewer than 20 battles returns only available entries
    Given pet "pet-record-002" with rarity "COMMON" and petName "Sand Crawler" exists in the database
    And pet "pet-record-002" has 8 arena_matches records
    When a GET request is made to /api/v1/arena/history/pet-record-002 without authentication
    Then the response status is 200
    And the response body "battles" array contains exactly 8 entries

  @TC-E2E-RECORD-001-03
  Scenario: Battle records with more than 20 battles returns cap of 20
    Given pet "pet-record-003" with rarity "EPIC" and petName "Thunder Drake" exists in the database
    And pet "pet-record-003" has 25 arena_matches records in the database
    When a GET request is made to /api/v1/arena/history/pet-record-003 without authentication
    Then the response status is 200
    And the response body "battles" array contains exactly 20 entries

  @TC-E2E-RECORD-001-04 @contract
  Scenario: Battle records endpoint returns 404 for nonexistent pet
    When a GET request is made to /api/v1/arena/history/nonexistent-pet-uuid without authentication
    Then the response status is 404
    And the response body error code is "PET_NOT_FOUND"

  @TC-E2E-RECORD-001-05
  Scenario: Battle records include AI opponent entries flagged correctly
    Given pet "pet-record-001" has an arena_matches record where is_ai_opponent is true and opponent_pet_id is null
    When a GET request is made to /api/v1/arena/history/pet-record-001 without authentication
    Then the response status is 200
    And at least one entry in the "battles" array has isAiOpponent true and opponentPetId null

  @TC-E2E-RECORD-001-06 @contract
  Scenario: Individual match record is publicly readable by matchId
    Given an arena match "match-record-001" exists with winnerId "pet-record-001" mode "RACE" and completedAt "2026-05-01T12:00:00Z"
    When a GET request is made to /api/v1/arena/match/match-record-001 without authentication
    Then the response status is 200
    And the response body field "matchId" is "match-record-001"
    And the response body "battleLog" is a non-empty array of events

  @TC-E2E-RECORD-001-07 @contract
  Scenario: Match record returns 404 for nonexistent matchId
    When a GET request is made to /api/v1/arena/match/nonexistent-match-uuid without authentication
    Then the response status is 404
    And the response body error code is "NOT_FOUND"

  @TC-E2E-RECORD-001-08 @contract
  Scenario: Battle records response contains all fields needed for Open Graph card generation
    Given a pet "pet-og-001" with battle history of 10 wins and 5 losses
    When a visitor requests the arena history for "pet-og-001"
    Then the response status is 200
    And the response body "summary" contains wins losses and winRate
    And the response body contains petName rarity and a sprite reference for social sharing
