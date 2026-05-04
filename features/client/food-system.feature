Feature: Food System UI — Inventory, Apply Buff, and Buff Indicator Display (US-FOOD-001)

  Background:
    Given the player app is loaded
    And a valid "pet_token" of at least (pet_access_token_min_bytes = 32) bytes is stored in localStorage
    And the user is on the PetPage at "/pet/:petId"

  # --- Food inventory display ---

  Scenario: Food inventory renders list of available food items with stat icons
    Given the FoodInventory component is visible on the PetPage
    And GET /api/v1/pets/:petId responds HTTP 200 with "foodItems" array containing food buff objects
    When the FoodInventory component mounts
    Then the FoodInventory renders a grid or list of FoodItem cards
    And each FoodItem card displays:
      - The stat it targets (Speed, Strength, Stamina) with an icon
      - The buff magnitude (e.g., "+5 Speed")
      - The buff type (permanent or temporary with duration)
      - A "Use" button

  Scenario: Empty food inventory shows helpful message
    Given a pet with no food items in the inventory
    And GET /api/v1/pets/:petId returns HTTP 200 with "foodItems": []
    When the FoodInventory component renders
    Then the message "No food items available" is displayed
    And a hint "Earn food by battling or completing training streaks" is shown
    And no FoodItem cards are rendered

  Scenario: Food item card displays buff duration for temporary buffs
    Given a FoodItem with isPermanent = false and expiresAt = "2026-05-05T10:30:00Z"
    When the FoodItem card renders
    Then the card displays the remaining duration (e.g., "Expires in 2h 30m")
    And the duration countdown updates in real-time

  Scenario: Food item card displays "Permanent" label for permanent buffs
    Given a FoodItem with isPermanent = true
    When the FoodItem card renders
    Then the card displays "Permanent Buff" or similar permanent indicator
    And no expiry timer is shown

  # --- Apply food buff interaction ---

  Scenario: Owner clicks "Use" button on food item and stat increments
    Given the FoodInventory shows a food item with stat = "speed" and magnitude = 5
    And the pet's current speed = 45
    And POST /api/v1/pets/:petId/feed responds HTTP 200 with "updatedStats": {speed: 50, ...} and "buffApplied"
    When the owner clicks the "Use" button on the FoodItem
    Then POST /api/v1/pets/:petId/feed is called with the Authorization header and the food buff type
    And the Authorization header contains the Bearer token from localStorage
    And the Speed StatBar animates to 50 with a visual transition
    And a glow animation appears around the pet sprite (warm glow color)
    And GET /api/v1/pets/:petId is re-fetched to refresh all stats

  Scenario: Buff stat already at maximum — use button disabled with tooltip
    Given a pet with speed = (pet_stat_max = 100)
    And a food item that targets the speed stat
    When the FoodItem card renders
    Then the "Use" button is disabled (grayed out)
    And a tooltip appears on hover: "This stat is already at maximum"

  Scenario: HTTP 400 STAT_AT_MAXIMUM response shows toast error
    Given a pet with strength = 100 and a food item targeting strength
    And POST /api/v1/pets/:petId/feed responds HTTP 400 with error code "STAT_AT_MAXIMUM"
    When the owner clicks the "Use" button
    Then a toast notification appears: "Stat is already at maximum (100)"
    And the FoodItem remains visible and enabled for retrying other stats

  # --- Stat bar buff indicator ---

  Scenario: Temporary buff applied — buff badge appears on StatBar with countdown
    Given the owner has applied a temporary speed buff that expires in 45 minutes
    And the response "buffApplied": {stat: "speed", magnitude: 5, isPermanent: false, expiresAt: "..."}
    When the StatsPanel re-renders
    Then the Speed StatBar shows a buff badge or icon indicating an active temporary buff
    And the badge displays a countdown timer: "Expires in 45m"
    And the timer updates every second and decrements

  Scenario: Buff expires — buff badge disappears from StatBar
    Given a Speed StatBar showing a temporary buff expiring in 30 seconds
    When 30 seconds elapse and the buff expiry time passes
    Then the buff badge disappears from the StatBar
    And the stat value remains elevated (the buff effect is already applied to the base stat)
    And the countdown timer stops and is removed from the page

  Scenario: Permanent buff applied — buff badge shown without countdown
    Given the owner has applied a permanent buff to strength
    And the response "buffApplied": {stat: "strength", magnitude: 10, isPermanent: true, expiresAt: null}
    When the StatsPanel re-renders
    Then the Strength StatBar shows a buff badge indicating a permanent buff
    And no countdown timer appears on the badge

  Scenario: Multiple buffs on same stat displayed on StatBar
    Given a Speed StatBar with two active buffs (e.g., temporary +3 and permanent +5)
    When the StatsPanel renders
    Then both buff badges are visible on the Speed StatBar
    And each badge shows its type (permanent or temporary) and remaining duration
    And the total speed value reflects both buffs combined

  # --- Food use animation ---

  Scenario: Pet sprite plays animation when food is applied
    Given the owner clicks "Use" on a food item
    And POST /api/v1/pets/:petId/feed responds HTTP 200
    When the food buff is applied
    Then the PetCanvas pet sprite plays a brief animation:
      - Pet scales and blinks (0.2s scale 1.05 → 1.0)
      - A warm glow effect surrounds the pet (200ms)
    And the animation completes before the StatBar animation starts

  Scenario: Reduced motion disables food use animation
    Given the user has "prefers-reduced-motion: reduce" enabled
    When the owner applies a food buff
    Then the PetCanvas pet sprite does NOT animate
    And only the StatBar updates without animation
    And the stat value appears instantly

  # --- Multiple food items and inventory management ---

  Scenario: Multiple food items of same type shown separately in inventory
    Given the pet has 3 identical "Speed +5" food items in the inventory
    When the FoodInventory renders
    Then three separate FoodItem cards are displayed (one for each)
    And the owner can use any of them by clicking the "Use" button on the desired card

  Scenario: Food item removed from inventory after use
    Given the FoodInventory shows a food item card
    And the owner clicks "Use" and the API call succeeds
    When the FoodInventory is refreshed (GET /api/v1/pets/:petId)
    Then the used food item disappears from the inventory grid
    And the remaining food items are displayed

  # --- Keyboard navigation ---

  Scenario: Food items are keyboard navigable with Tab and activatable with Enter
    Given the FoodInventory is rendered with multiple FoodItem cards
    When the user navigates using Tab
    Then each FoodItem "Use" button is focusable
    And pressing Enter on a focused "Use" button applies the food buff
    And visual focus indicator (pixel-art ring) is visible on focused buttons

  # --- Accessibility for buff indicators ---

  Scenario: Buff countdown timer announced to screen readers
    Given a temporary buff with remaining duration on a StatBar
    When the countdown timer updates
    Then the StatBar has aria-label that includes the buff description and remaining time (e.g., "Speed, 50 out of 100, with temporary +5 buff expiring in 30 minutes")
    And the aria-live region is updated (throttled to avoid flooding)
