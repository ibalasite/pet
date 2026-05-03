Feature: Admin Portal — Login with TOTP, Moderation Queue, and Ban Action UI (US-ADMIN-001, US-ADMIN-002, US-ADMIN-003)

  Background:
    Given the admin portal is loaded at "/admin/login"
    And the Vue 3 + Element Plus admin app uses httpOnly session cookies for authentication

  # --- Admin login (TOTP) ---

  Scenario: Admin submits valid credentials with TOTP code and is redirected to dashboard
    Given the LoginPage.vue renders an ElForm with an email input, password input, and TOTP code input
    And POST /admin/api/auth/login responds HTTP 200 with Set-Cookie: session=<id>; HttpOnly; SameSite=Strict; Secure; Path=/admin
    When the admin enters valid "email", "password", and a current "totpCode"
    And clicks the "Login" button
    Then POST /admin/api/auth/login is called with body {"email": "...", "password": "...", "totpCode": "..."}
    And the Pinia useAdminAuthStore sets isAuthenticated = true and the role field
    And Vue Router navigates to "/admin/dashboard"
    And the totpCode value is cleared from the Vue component state immediately after submission

  Scenario: First-time admin login without TOTP enrolled — redirected to TOTP setup
    Given the admin has not enrolled a TOTP device
    And POST /admin/api/auth/login responds HTTP 403 with error code "TOTP_SETUP_REQUIRED" and a "setupToken"
    When the admin submits credentials without a TOTP code
    Then Vue Router navigates to "/admin/totp-setup"
    And the TotpSetupPage.vue renders a QR code and calls POST /admin/api/auth/totp/setup with {"setupToken": "..."}
    And backup codes are displayed exactly once and not stored in any Vue component state

  Scenario: Invalid admin credentials return inline error
    Given the admin has entered an incorrect password
    And POST /admin/api/auth/login responds HTTP 401 with error code "UNAUTHORIZED"
    When the admin clicks the "Login" button
    Then an inline error message "Invalid credentials." is shown on the LoginPage ElForm
    And the user remains on "/admin/login"

  Scenario: Account locked after repeated failed logins — lock message displayed
    Given the admin has made (admin_login_lockout_threshold = 10) consecutive failed login attempts
    And POST /admin/api/auth/login responds HTTP 403 with error code "ACCOUNT_LOCKED" and "unlockedAt"
    When the admin clicks the "Login" button
    Then the LoginPage shows the account is locked and displays the unlock time from the "unlockedAt" field
    And the lock lasts (admin_login_lockout_duration_minutes = 30) minutes

  Scenario: IP rate limit on login — 15-minute countdown shown
    Given the IP address has made (admin_login_ip_rate_limit_attempts = 10) requests within (admin_login_ip_rate_limit_window_seconds = 900) seconds (15 minutes)
    And POST /admin/api/auth/login responds HTTP 429
    When the admin submits the login form
    Then a rate-limit message is displayed with a countdown of up to 900 seconds

  Scenario: Unauthenticated access to admin route redirects to login
    Given the admin user is not authenticated (no valid session cookie)
    When the user navigates directly to "/admin/pets"
    Then the Vue Router beforeEach guard detects isAuthenticated = false
    And the user is redirected to "/admin/login"

  Scenario: Session expiry during admin work — redirect to login
    Given the admin is authenticated and viewing "/admin/pets"
    And the session has been inactive for more than (admin_session_inactivity_expiry_hours = 4) hours
    When any admin API call returns HTTP 401
    Then the adminApiClient interceptor calls useAdminAuthStore().logout()
    And Vue Router navigates to "/admin/login"

  # --- Pet moderation queue ---

  Scenario: Admin views pet list and filters by SUSPICIOUS status
    Given the admin is authenticated as a moderator or super_admin
    And the admin navigates to "/admin/pets"
    When the PetListPage.vue loads
    Then GET /admin/api/pets is called with the session cookie
    And the ElTable displays pet rows with columns: pet ID, masked owner email, rarity, level, arena record, creation date
    And an ElSelect filter for status "SUSPICIOUS" is available and narrows the table when selected

  Scenario: Admin bans a pet with a reason and the ban is logged
    Given the admin is on "/admin/pets" and can see a pet with petId "bad-pet-001"
    When the admin clicks the "Ban" button on the pet row
    And the PetBanModal.vue (ElDialog) opens with a reason text area
    And the admin types a reason of at most (admin_moderation_reason_max_chars = 500) characters
    And the admin clicks "Confirm Ban"
    Then POST /admin/api/pets/bad-pet-001/ban is called with body {"reason": "<reason>"}
    And the server records the ban with admin ID, timestamp, and reason
    And the pet row status is updated to "BANNED" in the ElTable

  Scenario: Ban reason exceeding 500 characters is rejected client-side
    Given the PetBanModal is open for petId "bad-pet-001"
    When the admin types a reason of 501 or more characters in the reason field
    Then the "Confirm Ban" button remains disabled or an inline validation error is shown
    And POST /admin/api/pets/bad-pet-001/ban is NOT called

  # --- Admin leaderboard moderation ---

  Scenario: Admin leaderboard shows up to 500 entries with SUSPICIOUS flag badges
    Given the admin navigates to "/admin/leaderboard"
    And GET /admin/api/leaderboard responds with up to (leaderboard_admin_view = 500) entries
    When the AdminLeaderboardPage.vue renders
    Then the ElTable shows all returned entries without pagination
    And pets with more than (bot_detection_battles_threshold = 50) battles in the last (bot_detection_window_minutes = 60) minutes have a SuspiciousFlagBadge component visible

  Scenario: Admin removes a suspicious pet from the leaderboard
    Given the AdminLeaderboardPage shows petId "cheat-pet-007" with a SuspiciousFlagBadge
    When the admin clicks "Remove from Leaderboard" on that row
    Then DELETE /admin/api/leaderboard/cheat-pet-007 is called with the session cookie
    And the row for "cheat-pet-007" disappears from the AdminLeaderboardPage ElTable
    And the change reflects on the public LeaderboardPage within (leaderboard_ban_reflection_time_minutes = 5) minutes

  Scenario: Admin adjusts max battles per hour via runtime config panel
    Given the admin is authenticated as a super_admin and navigates to "/admin/config/runtime"
    And the RuntimeConfigPage.vue renders an ElForm with an ElInputNumber for "Max Battles Per Hour"
    When the admin changes the value to 15 (within the allowed range of 1 to 50)
    And clicks "Save"
    Then PUT /admin/api/config/runtime is called with the updated value
    And the change takes effect within (config_cache_refresh_time_minutes = 5) minutes
    And the audit log records the admin ID, timestamp, field "max_battles_per_hour", old value, and new value
