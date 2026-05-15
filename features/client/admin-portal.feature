Feature: Admin Portal — Login with TOTP, Moderation Queue, and Ban Action UI (US-ADMIN-001, US-ADMIN-002, US-ADMIN-003)

  Background:
    Given the admin portal is loaded at "/admin/login"
    And the Vue 3 + Element Plus admin app uses httpOnly session cookies for authentication

  # --- Admin login (TOTP) ---

  @TC-CLI-ADMIN-001
  Scenario: Admin submits valid credentials with TOTP code and is redirected to dashboard
    Given the LoginPage.vue is showing an ElForm with an email input, password input, and TOTP code input
    And POST /admin/api/auth/login responds HTTP 200 with Set-Cookie: session=<id>; HttpOnly; SameSite=Strict; Secure; Path=/admin
    When the admin enters valid "email", "password", and a current "totpCode"
    And clicks the "Login" button
    Then POST /admin/api/auth/login is called with body {"email": "...", "password": "...", "totpCode": "..."}
    And the Pinia useAdminAuthStore sets isAuthenticated = true and the role field
    And Vue Router navigates to "/admin/dashboard"
    And the TOTP code input field is cleared immediately after submission

  @TC-CLI-ADMIN-002
  Scenario: First-time admin login without TOTP enrolled — redirected to TOTP setup
    Given the admin has not enrolled a TOTP device
    And POST /admin/api/auth/login responds HTTP 403 with error code "TOTP_SETUP_REQUIRED" and a "setupToken"
    And POST /admin/api/auth/totp/setup responds HTTP 200 with a QR code URL and backup codes
    When the admin submits credentials without a TOTP code
    Then Vue Router navigates to "/admin/totp-setup"
    And the TotpSetupPage.vue renders a QR code and calls POST /admin/api/auth/totp/setup with {"setupToken": "..."}
    And backup codes are displayed exactly once

  @TC-CLI-ADMIN-003
  Scenario: Invalid admin credentials return inline error
    Given the admin has entered an incorrect password
    And POST /admin/api/auth/login responds HTTP 401 with error code "UNAUTHORIZED"
    When the admin clicks the "Login" button
    Then an inline error message "Invalid credentials." is shown on the LoginPage ElForm
    And the user remains on "/admin/login"

  @TC-CLI-ADMIN-004
  Scenario: Account locked after repeated failed logins — lock message displayed
    Given the admin has made (admin_login_lockout_threshold = 10) consecutive failed login attempts
    And POST /admin/api/auth/login responds HTTP 403 with error code "ACCOUNT_LOCKED" and "unlockedAt"
    When the admin clicks the "Login" button
    Then the LoginPage shows the account is locked and displays the unlock time from the "unlockedAt" field

  @TC-CLI-ADMIN-005
  Scenario: IP rate limit on login — 15-minute countdown shown
    Given the IP address has made (admin_login_ip_rate_limit_attempts = 10) requests within (admin_login_ip_rate_limit_window_seconds = 900) seconds (15 minutes)
    And POST /admin/api/auth/login responds HTTP 429
    When the admin submits the login form
    Then a rate-limit message is displayed with a countdown of up to 900 seconds

  @TC-CLI-ADMIN-006
  Scenario: Unauthenticated access to admin route redirects to login
    Given the admin user is not authenticated (no valid session cookie)
    When the user navigates directly to "/admin/pets"
    Then the user is redirected to "/admin/login"

  @TC-CLI-ADMIN-007
  Scenario: Session expiry during admin work — redirect to login
    Given the admin is authenticated and viewing "/admin/pets"
    And the session has been inactive for more than (admin_session_inactivity_expiry_hours = 4) hours
    And any admin API call responds HTTP 401
    When an admin API call is made
    Then Vue Router navigates to "/admin/login"

  # --- Pet moderation queue ---

  @TC-CLI-ADMIN-008
  Scenario: Admin views pet list and filters by SUSPICIOUS status
    Given the admin is authenticated as a moderator or super_admin
    And the admin has navigated to "/admin/pets"
    And GET /admin/api/pets responds HTTP 200 with pet entries
    When the PetListPage.vue loads
    Then GET /admin/api/pets is called with the session cookie
    And the ElTable displays pet rows with columns: pet ID, masked owner email, rarity, level, arena record, creation date
    And an ElSelect filter for status "SUSPICIOUS" is available

  @TC-CLI-ADMIN-009
  Scenario: Admin bans a pet with a reason
    Given the admin is on "/admin/pets" and can see a pet with petId "bad-pet-001"
    And POST /admin/api/pets/bad-pet-001/ban responds HTTP 200
    When the admin clicks the "Ban" button on the pet row
    And the admin types a reason of at most (admin_moderation_reason_max_chars = 500) characters in the PetBanModal.vue reason field
    And the admin clicks "Confirm Ban"
    Then POST /admin/api/pets/bad-pet-001/ban is called with body {"reason": "<reason>"}
    And the pet row status is updated to "BANNED" in the ElTable

  @TC-CLI-ADMIN-010
  Scenario: Ban reason exceeding 500 characters is rejected client-side
    Given the PetBanModal is open for petId "bad-pet-001"
    When the admin types a reason of 501 or more characters in the reason field
    Then the "Confirm Ban" button remains disabled or an inline validation error is shown
    And POST /admin/api/pets/bad-pet-001/ban is NOT called

  # --- Admin leaderboard moderation ---

  @TC-CLI-ADMIN-011
  Scenario: Admin leaderboard shows up to 500 entries with SUSPICIOUS flag badges
    Given the admin has navigated to "/admin/leaderboard"
    And GET /admin/api/leaderboard responds with up to (leaderboard_admin_view = 500) entries
    When the AdminLeaderboardPage.vue renders
    Then the ElTable shows all returned entries without pagination
    And pets with more than (bot_detection_battles_threshold = 50) battles in the last (bot_detection_window_minutes = 60) minutes have a SuspiciousFlagBadge component visible

  @TC-CLI-ADMIN-012
  Scenario: Admin removes a suspicious pet from the leaderboard
    Given the AdminLeaderboardPage shows petId "cheat-pet-007" with a SuspiciousFlagBadge
    And DELETE /admin/api/leaderboard/cheat-pet-007 responds HTTP 200
    When the admin clicks "Remove from Leaderboard" on that row
    Then DELETE /admin/api/leaderboard/cheat-pet-007 is called with the session cookie
    And the row for "cheat-pet-007" disappears from the AdminLeaderboardPage ElTable

  @TC-CLI-ADMIN-013
  Scenario: Admin adjusts max battles per hour via runtime config panel
    Given the admin is authenticated as a super_admin and has navigated to "/admin/config/runtime"
    And the RuntimeConfigPage.vue is showing an ElForm with an ElInputNumber for "Max Battles Per Hour"
    When the admin changes the value to 15 (within the allowed range of 1 to 50)
    And clicks "Save"
    Then PUT /admin/api/config/runtime is called with the updated value
    And a success confirmation is displayed in the RuntimeConfigPage.vue

  # --- GDPR Data Deletion (US-ADMIN-004) ---

  @TC-CLI-ADMIN-014
  Scenario: Admin views GDPR deletion request queue with status badges
    Given the admin is authenticated as a super_admin and navigates to "/admin/gdpr/deletion-requests"
    And GET /admin/api/gdpr/deletion-requests responds HTTP 200 with a list of requests
    When the GdprDeletionQueuePage.vue renders
    Then the ElTable shows each request with columns: request ID, masked email, submitted date, and status badge
    And requests with status "PENDING" display an orange badge
    And requests with status "PROCESSED" display a green "Processed" badge

  @TC-CLI-ADMIN-015
  Scenario: Admin approves a GDPR deletion request and sees confirmation dialog
    Given the GdprDeletionQueuePage shows a PENDING request with requestId "gdpr-req-001"
    And POST /admin/api/gdpr/deletion-requests/gdpr-req-001/approve responds HTTP 200
    When the admin clicks the "Approve" button on the request row
    Then a confirmation dialog appears asking "Are you sure you want to permanently delete this user's data?"
    And the dialog has "Confirm" and "Cancel" buttons
    When the admin clicks "Confirm"
    Then POST /admin/api/gdpr/deletion-requests/gdpr-req-001/approve is called with the session cookie
    And the request row status badge updates to "PROCESSING"
    And a success notification is shown: "Deletion request approved and queued for processing"

  @TC-CLI-ADMIN-016
  Scenario: Completed deletion requests show as "Processed" in the queue
    Given the GdprDeletionQueuePage is loaded
    And GET /admin/api/gdpr/deletion-requests returns a mix of PENDING and PROCESSED requests
    When the page renders
    Then completed requests display a green "Processed" badge in the status column
    And a "processed_at" timestamp is shown for each completed request
    And PROCESSED rows are not actionable (no "Approve" button visible)

  # --- Suspicious Battle Detection (US-ADMIN-005) ---

  @TC-CLI-ADMIN-017
  Scenario: Admin views suspicious detection dashboard with flagged battles
    Given the admin is authenticated and navigates to "/admin/suspicious-battles"
    And GET /admin/api/suspicious-battles responds HTTP 200 with a list of flagged battle entries
    When the SuspiciousBattleDashboardPage.vue renders
    Then the ElTable shows flagged battles with columns: battle ID, pet IDs, battle timestamp, flag reason, and status
    And each flagged entry shows a "FLAGGED" badge
    And the page title reads "Suspicious Battle Detection"

  @TC-CLI-ADMIN-018
  Scenario: Admin reviews and clears a suspicious flag with reason
    Given the SuspiciousBattleDashboardPage shows a flagged battle with battleId "battle-sus-042"
    And POST /admin/api/suspicious-battles/battle-sus-042/clear responds HTTP 200
    When the admin clicks "Clear Flag" on the flagged battle row
    Then a modal appears with a text area for the admin to enter a review reason
    When the admin enters a reason (up to 500 characters) and clicks "Confirm Clear"
    Then POST /admin/api/suspicious-battles/battle-sus-042/clear is called with body {"reason": "<reason>"}
    And the battle row status updates to "REVIEWED"
    And the "FLAGGED" badge is replaced with a "REVIEWED" badge

  @TC-CLI-ADMIN-019
  Scenario: Auto-flag threshold configuration is displayed in admin settings
    Given the admin navigates to "/admin/config/bot-detection"
    And GET /admin/api/config/bot-detection responds HTTP 200 with current thresholds
    When the BotDetectionConfigPage.vue renders
    Then the current value of (bot_detection_battles_threshold = 50) is shown in an ElInputNumber field
    And the current value of (bot_detection_window_minutes = 60) is shown in a separate ElInputNumber field
    And a "Save" button is visible
    When the admin changes the threshold and clicks "Save"
    Then PUT /admin/api/config/bot-detection is called with the new threshold values

  # --- Game Economy Configuration (US-ADMIN-006) ---

  @TC-CLI-ADMIN-020
  Scenario: Admin configures food buff multiplier via economy config form
    Given the admin is authenticated as a super_admin and navigates to "/admin/config/economy"
    And GET /admin/api/config/economy responds HTTP 200 with current economy settings including "foodBuffMultiplier"
    When the EconomyConfigPage.vue renders
    Then an ElInputNumber field for "Food Buff Multiplier" is visible with the current value
    When the admin changes the multiplier value and clicks "Save"
    Then PUT /admin/api/config/economy is called with the updated "foodBuffMultiplier" value
    And a success toast "Economy configuration saved" is shown

  @TC-CLI-ADMIN-021
  Scenario: Admin sets arena entry cost and sees changes reflected immediately
    Given the admin is on "/admin/config/economy"
    And the current "arenaEntryCost" is 10
    When the admin updates the "Arena Entry Cost" ElInputNumber field to 15
    And clicks "Save"
    Then PUT /admin/api/config/economy is called with body containing "arenaEntryCost": 15
    And the field value refreshes to 15 on the page
    And a success notification "Economy configuration saved" confirms the change
