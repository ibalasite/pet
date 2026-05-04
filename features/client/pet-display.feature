Feature: Pet Display — Token Generation, Stat Bars, and Food Buff Indicator (US-PET-001, US-PET-002, US-FOOD-001)

  Background:
    Given the player app is loaded at the root URL "/"
    And the API base is "https://api.pixel-pet-arena.example.com"

  # --- Pet token generation ---

  Scenario: Guest visits the landing page and a new pet token is generated
    Given no "pet_token" key exists in localStorage
    When the browser loads "/"
    Then GET /api/v1/pets/random is called without an Authorization header
    And the response body contains a "seed" field and a "rarity" field
    And a "pet_token" entry is written to localStorage with a value of at least (pet_access_token_min_bytes = 32) bytes
    And the PetCanvas component renders inside a div with role="img" and aria-label="Pixel pet canvas"

  Scenario: Returning guest has an existing token — no new pet is generated
    Given a "pet_token" value of at least (pet_access_token_min_bytes = 32) bytes is present in localStorage
    When the browser loads "/pet/:petId"
    Then GET /api/v1/pets/:petId is called with the header "Authorization: Bearer <token>"
    And GET /api/v1/pets/random is NOT called
    And the PetCanvas component renders the sprite corresponding to the stored token

  Scenario: Pet page loads and displays stat bars for speed, strength, and stamina
    Given a claimed pet is accessible at "/pet/:petId"
    And GET /api/v1/pets/:petId returns HTTP 200 with "speed", "strength", and "stamina" values between 1 and 100
    When the StatsPanel component renders
    Then a StatBar labeled "Speed" is visible with a width proportional to the speed value out of (pet_stat_max = 100)
    And a StatBar labeled "Strength" is visible with a width proportional to the strength value
    And a StatBar labeled "Stamina" is visible with a width proportional to the stamina value
    And each StatBar element has an aria-label announcing the stat name and current value

  Scenario: Pixel art canvas renders with pixelated image rendering
    Given a pet is displayed on the LandingPage
    When the PetCanvas div is inspected
    Then the container has the CSS property "image-rendering: pixelated"
    And the Phaser game canvas dimensions are (sprite_resolution_px = 32) × 2 = 64 CSS px wide and 64 CSS px tall

  Scenario: Neglected pet displays desaturated visual state after threshold exceeded
    Given a claimed pet's "last_trained_at" timestamp is more than (training_neglect_threshold_days = 3) days ago
    When the PetPage at "/pet/:petId" loads
    Then the PetCanvas container has the CSS class "pet-canvas--neglected"
    And the canvas wrapper has CSS filter "grayscale(60%) brightness(0.8)" applied
    And the NeglectedState component is visible on the page

  Scenario: Reduced motion preference suppresses Phaser idle animation
    Given the OS/browser has "prefers-reduced-motion: reduce" enabled
    When the PetCanvas mounts and PetCanvasEngine initializes
    Then the Phaser animation loop is paused and a static sprite frame is rendered
    And the CSS rarity shimmer animations are suppressed via "@media (prefers-reduced-motion: reduce)"

  Scenario: Temporary food buff indicator shown on StatsPanel with countdown timer
    Given a claimed pet has an active temporary food buff on the "speed" stat
    And the buff was applied via POST /api/v1/food/apply and the response "buffApplied.isPermanent" is false
    And the response "buffApplied.expiresAt" is a future timestamp
    When the PetPage at "/pet/:petId" renders the StatsPanel
    Then a buff badge is visible on the Speed StatBar
    And the buff badge displays a countdown timer showing the remaining duration until "expiresAt"
    And the buff indicator disappears once the "expiresAt" time has passed

  Scenario: Legendary pet displays animated shimmer border
    Given a claimed pet has rarity "LEGENDARY"
    When the PetPage renders
    Then the PetCanvas wrapper has the CSS class "rarity-legendary"
    And the element has the CSS animation "legendary-shimmer 2s ease-in-out infinite" applied from rarity.css

  # --- Pet Seed Uniqueness & Generation Validation ---

  Scenario: Pet seed uniqueness is guaranteed across generation requests
    Given 100 consecutive calls to GET /api/v1/pets/random via the landing page
    When seeds from all 100 generated pets are collected by the client
    Then no two pets share the same seed value
    And the uniqueness constraint on the server side is verified in tests

  Scenario: Random pet generation returns valid unclaimed pet with rarity distribution
    Given a request to GET /api/v1/pets/random without authentication
    When the endpoint is called multiple times (sample size ≥ 1000)
    Then rarity distribution follows expected:
      | Rarity    | Target | Tolerance |
      | COMMON    | 60%    | ±2%       |
      | RARE      | 25%    | ±2%       |
      | EPIC      | 12%    | ±2%       |
      | LEGENDARY | 3%     | ±2%       |
    And each pet has fields: id, seed, rarity, stats (speed, strength, stamina all = 10)
    And reservedUntil is set to NOW() + 24 hours

  Scenario: Retrieve claimed pet shows owner-only fields when authenticated
    Given a claimed pet with petId "pet-uuid-003" and valid petToken
    When GET /api/v1/pets/:petId is called with Authorization: Bearer {petToken}
    Then the response includes isOwner = true and claimedAt timestamp
    And stats.level is calculated from total_training_actions
    And isNeglected reflects whether pet was trained within 3 days

  Scenario: Retrieve pet without authentication shows public data only
    Given a claimed pet with petId "pet-uuid-004"
    When GET /api/v1/pets/:petId is called WITHOUT authentication header
    Then the response includes all fields EXCEPT claimedAt
    And isOwner field is set to false
    And status is HTTP 200 (no 401 error)
