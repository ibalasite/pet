Feature: Settings and Preferences UI — Theme Toggle, Audio, Notifications (User Settings)

  Background:
    Given the player app is loaded
    And a valid "pet_token" is stored in localStorage
    And the user has access to settings via navbar menu or settings page

  # --- Settings page access ---

  Scenario: Owner opens settings from navbar menu
    Given the player is on any page with the NavBar visible
    When the owner clicks a settings icon or menu button in the NavBar
    Then a settings dropdown or modal appears
    And options for "Theme", "Audio", and "Notifications" are visible
    And a "Close" button or Escape key dismisses the settings

  Scenario: Settings preferences persist in localStorage
    Given the user is on the SettingsPage
    And the user changes the theme from "Dark" to "Light"
    When the user closes the settings page
    And refreshes the page
    Then the "Light" theme is applied
    And the theme preference is persisted in localStorage under a "theme" key

  # --- Dark mode / Light mode toggle ---

  Scenario: User toggles dark mode on and off
    Given the SettingsPage shows a "Dark Mode" toggle switch
    And the default mode is "Dark"
    When the user clicks the toggle to switch to "Light"
    Then the page background color changes from dark (#1a1a2e) to light (e.g., #f5f5f0)
    And text color inverts appropriately to maintain 4.5:1 contrast ratio
    And the toggle switch visual state updates to show "Light" is selected

  Scenario: Dark mode colors maintain accessibility contrast ratios
    Given the dark mode is enabled
    When the page renders with dark background and light text
    Then the text color (e.g., #e8e8f0) on dark surface (#1a1a2e) has a contrast ratio of at least 4.5:1
    And all interactive elements (buttons, links) maintain 3:1 contrast for focus states

  Scenario: Light mode colors maintain accessibility contrast ratios
    Given the light mode is enabled
    When the page renders
    Then the text color on light surface has a contrast ratio of at least 4.5:1
    And buttons and interactive elements meet the same contrast minimums

  Scenario: Rarity badge colors adapt to theme
    Given a Legendary pet with rarity badge in Dark mode
    And the user switches to Light mode
    When the RarityBadge component re-renders
    Then the badge color adjusts to remain legible and visually compelling in Light mode
    And the animated shimmer (if present) maintains visual appeal in both themes

  # --- Audio and sound settings ---

  Scenario: Owner disables sound effects globally
    Given the SettingsPage shows a "Sound Effects" toggle
    And sound is enabled by default
    When the owner clicks the toggle to disable sound
    Then no sound is played for subsequent interactions (button clicks, stat changes, arena)
    And the setting is stored in localStorage

  Scenario: Owner re-enables sound effects
    Given sound effects are currently disabled
    When the owner clicks the toggle to re-enable sound
    Then sound plays for the next interaction (button click)
    And a confirmation sound plays to indicate the toggle worked

  Scenario: Sound setting does not affect reduced-motion behavior
    Given the user has "prefers-reduced-motion: reduce" enabled at the OS level
    And sound effects are enabled in settings
    When the user performs an action (e.g., trains a pet)
    Then animations are still suppressed (per reduced-motion preference)
    But sound effects play (if sound is enabled in settings)
    These are independent settings

  # --- Notification preferences ---

  Scenario: Owner enables/disables push notifications
    Given the SettingsPage shows a "Notifications" toggle
    And notifications are enabled by default
    When the owner clicks to disable notifications
    Then no push notifications are sent for subsequent pet events (training complete, arena available)
    And the setting is stored in localStorage

  Scenario: Owner views notification channels
    Given the owner navigates to Notification settings
    When the settings section expands
    Then checkboxes are visible for:
      - Daily training reminder (enabled by default)
      - Arena battles available (enabled by default)
      - Pet level up (enabled by default)
    And the owner can toggle each channel independently

  Scenario: Owner enables daily training reminder notification
    Given notification reminders are disabled
    When the owner checks the "Daily training reminder" checkbox
    Then the browser requests notification permission (if not already granted)
    And the user is asked to confirm the permission
    And the setting is stored if the user grants permission

  # --- Settings form behavior ---

  Scenario: Changes to settings are applied immediately
    Given the user is on the SettingsPage with the theme set to "Dark"
    When the user clicks the theme toggle to "Light"
    Then the page theme changes immediately without requiring a save button
    And no "Save Settings" action is required

  Scenario: Settings modal or panel can be closed without saving
    Given the SettingsPage is open and the user has made changes
    When the user clicks the X button or presses Escape
    Then the settings modal closes
    And all changes are persisted (no "Cancel" or "Revert" action needed)
    And the user is returned to the previous page

  Scenario: Reset to defaults button restores original settings
    Given the user has customized multiple settings (theme, sound, notifications)
    When a "Reset to Defaults" button is visible and clicked
    Then all settings revert to:
      - Theme: Dark
      - Sound: Enabled
      - Notifications: Enabled
    And a confirmation message appears: "Settings reset to defaults"

  # --- Accessibility of settings controls ---

  Scenario: Settings toggle switches are keyboard operable
    Given the SettingsPage is open with toggle switches for theme and sound
    When the user navigates using Tab to a toggle switch
    And presses Space or Enter
    Then the toggle state changes
    And a visual focus indicator is visible on the toggle

  Scenario: Settings labels are properly associated with inputs
    Given the SettingsPage shows "Dark Mode" label with a toggle switch
    When inspected in the browser DevTools
    Then the <label> element is properly associated with the toggle via a matching "for" and "id" attribute
    Or the label wraps the input element
    And screen readers correctly announce the label and current state

  Scenario: Settings form has proper heading hierarchy
    Given the SettingsPage is open
    When inspected for heading structure
    Then a top-level <h1> or <h2> reads "Settings"
    And subsections (Theme, Audio, Notifications) have <h3> headings
    And no heading levels are skipped

  # --- Settings validation ---

  Scenario: Invalid settings are prevented from being saved
    Given a hypothetical settings form with a numeric input (e.g., notification delay)
    When the user enters a non-numeric value (e.g., "abc")
    Then the field shows a validation error
    And the invalid value is not persisted to localStorage
    And the previous valid value is retained

  # --- Settings responsiveness ---

  Scenario: Settings panel is accessible on mobile (320px viewport)
    Given the viewport width is 320px (mobile)
    When the user opens the settings
    Then the settings panel or modal is fully visible without horizontal overflow
    And toggle switches and buttons are at least 44×44px for touch interaction
    And text is readable without zooming

  Scenario: Settings layout adapts to small screens
    Given the viewport width is 375px (mobile)
    When the SettingsPage renders
    Then the layout is single-column
    And all controls (toggles, buttons) are vertically stacked
    And no controls are hidden or require horizontal scrolling
