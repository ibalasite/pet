Feature: Battle Records API and History (US-RECORD-001)

  @TC-SRV-REC-001
  Scenario: Battle records page returns last 20 battles with pagination
    Given a player has 45 public battle records
    When the player requests GET /api/v1/arena/history/:petId
    Then the API returns the 20 most recent battles
    And the response includes a pagination cursor for the next batch
    And each battle record includes: match_id, opponent_pet_id, result (WIN/LOSS), reward, timestamp
    And the response structure includes meta.total = 45 and meta.hasMore = true

  @TC-SRV-REC-002
  Scenario: Battle records page with fewer than 20 records shows all records
    Given a player has 8 public battle records
    When the player requests GET /api/v1/arena/history/:petId
    Then the API returns all 8 records
    And the response indicates "hasMore": false or no pagination cursor
    And total_count = 8

  @TC-SRV-REC-003
  Scenario: Battle records pagination cursor for next batch
    Given a player has 45 battle records
    And the first page returned 20 records with pagination_cursor = "offset_20"
    When the client requests GET /api/v1/arena/history/:petId?cursor=offset_20
    Then the API returns battles 21-40 (next 20 records)
    And a new pagination_cursor is provided for the next batch
    And the response includes meta.hasMore = true

  @TC-SRV-REC-004
  Scenario: Open Graph meta tags are correctly generated for a battle record
    Given a battle was fought between Pet A (Rare, 12 wins) and Pet B (Common, 3 wins)
    When the battle record page is rendered as a social share link
    Then the meta tags include:
      | Tag | Value |
      | og:title | "Pet A vs Pet B" |
      | og:image | [sprite_image_url] |
      | og:description | "Pet A won with 12 total wins" |
      | og:url | https://pixel-pet-arena.com/battles/[match_id] |
      | og:type | website |
    And all OG URLs are absolute and properly encoded
    And og:image points to a valid image URL with correct dimensions (1200x630 recommended)

  @TC-SRV-REC-005
  Scenario: Battle record details include all required fields
    Given a battle record from GET /api/v1/arena/history/:petId
    When the response is parsed
    Then each battle record contains:
      | Field | Type | Presence |
      | match_id | UUID | required |
      | opponent_pet_id | UUID | required |
      | opponent_name | string | required |
      | opponent_rarity | enum | required |
      | result | WIN\|LOSS | required |
      | reward_xp | integer | required |
      | reward_coins | integer | required |
      | timestamp | ISO-8601 | required |
      | mode | RACE\|SUMO | required |
    And no sensitive fields (opponent owner email) are exposed

  @TC-SRV-REC-006
  Scenario: Battle records endpoint enforces public access without authentication
    Given a battle record for a pet with public_battles = true
    When GET /api/v1/arena/history/:petId is called WITHOUT Authorization header
    Then HTTP 200 is returned
    And the battle records are visible to any visitor
    And no authentication is required

  @TC-SRV-REC-007
  Scenario: AI opponent battles are marked in battle records
    Given a battle record where opponent is an AI-generated pet
    When GET /api/v1/arena/history/:petId is called
    Then the response includes is_ai_opponent = true
    And opponent_pet_id is NULL or omitted for AI battles
    And opponent_name indicates AI status (e.g., "AI Bot" or "Computer")
