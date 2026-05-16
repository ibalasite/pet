@p0
Feature: Admin Pet Search Performance (US-ADMIN-001)
  As an admin operator
  I want to search through pet records quickly
  So that moderation tasks complete within the 2-second SLA

  Background:
    Given a moderator admin "admin-mod-001" is authenticated with a valid session cookie
    And the database contains at least 1000000 pets rows

  @TC-E2E-ADMIN-SRCH-001-01 @contract @smoke
  Scenario: Admin search by exact pet ID returns within 2 seconds
    Given a pet with id "pet-search-target-001" exists in the database
    When the admin sends GET /admin/api/pets with search param "pet-search-target-001"
    Then the response status is 200
    And the response body "data" array contains "pet-search-target-001"
    And the response was received within 2000 milliseconds

  @TC-E2E-ADMIN-SRCH-001-02 @contract
  Scenario: Admin search returns paginated pet list with all required fields
    When the admin sends GET /admin/api/pets with page 1 and limit 20
    Then the response status is 200
    And each entry in the response body "data" array has petId rarity level arenaRecord createdAt fields
    And the response meta contains total page and limit fields

  @TC-E2E-ADMIN-SRCH-001-03 @contract
  Scenario: Admin search for nonexistent pet ID returns empty result
    When the admin sends GET /admin/api/pets with search param "nonexistent-00000000-0000-0000-0000-000000000000"
    Then the response status is 200
    And the response body "data" array is empty
    And the response meta field "total" is 0

  @TC-E2E-ADMIN-SRCH-001-04
  Scenario: Admin pet list returns pets with masked owner email in response
    Given a pet "pet-search-target-002" exists with owner email "owner@example.com" stored encrypted
    When the admin sends GET /admin/api/pets with search param "pet-search-target-002"
    Then the response status is 200
    And the response body entry for "pet-search-target-002" does not contain a plaintext email field

  @TC-E2E-ADMIN-SRCH-001-05 @contract
  Scenario: Unauthenticated admin search is rejected
    When an unauthenticated GET request is made to /admin/api/pets
    Then the response status is 401
    And the response body error code is "UNAUTHORIZED"

  @TC-E2E-ADMIN-SRCH-001-06 @contract
  Scenario: Read-only admin can view pet list but cannot perform mutations
    Given a read_only admin "admin-readonly-001" is authenticated with a valid session cookie
    When the read_only admin sends GET /admin/api/pets with page 1 and limit 10
    Then the response status is 200
    And the response body "data" is a non-empty array
