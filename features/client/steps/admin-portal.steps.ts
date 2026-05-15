// ⚠️ Auto-generated step definition stub by gendoc-align-fix gencode
import { Given, When, Then } from '@cucumber/cucumber';
import type { ClientWorld } from '../support/world';

Given('the admin portal is loaded at {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('the Vue 3 + Element Plus admin app uses httpOnly session cookies for authentication', async function(this: ClientWorld) {
  return 'pending';
});

Given('the LoginPage.vue is showing an ElForm with an email input, password input, and TOTP code input', async function(this: ClientWorld) {
  return 'pending';
});

Given('POST \\/admin\\/api\\/auth\\/login responds HTTP 200 with Set-Cookie: session=<id>; HttpOnly; SameSite=Strict; Secure; Path=\\/admin', async function(this: ClientWorld) {
  return 'pending';
});

When('the admin enters valid {string}, {string}, and a current {string}', async function(this: ClientWorld, _email: string, _password: string, _totpCode: string) {
  return 'pending';
});

When('clicks the {string} button', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('POST \\/admin\\/api\\/auth\\/login is called with body {string}', async function(this: ClientWorld, _body: string) {
  return 'pending';
});

Then('the Pinia useAdminAuthStore sets isAuthenticated = true and the role field', async function(this: ClientWorld) {
  return 'pending';
});

Then('Vue Router navigates to {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Then('the TOTP code input field is cleared immediately after submission', async function(this: ClientWorld) {
  return 'pending';
});

Given('the admin has not enrolled a TOTP device', async function(this: ClientWorld) {
  return 'pending';
});

Given('POST \\/admin\\/api\\/auth\\/login responds HTTP 403 with error code {string} and a {string}', async function(this: ClientWorld, _errorCode: string, _field: string) {
  return 'pending';
});

Given('POST \\/admin\\/api\\/auth\\/totp\\/setup responds HTTP 200 with a QR code URL and backup codes', async function(this: ClientWorld) {
  return 'pending';
});

When('the admin submits credentials without a TOTP code', async function(this: ClientWorld) {
  return 'pending';
});

Then('the TotpSetupPage.vue renders a QR code and calls POST \\/admin\\/api\\/auth\\/totp\\/setup with {string}', async function(this: ClientWorld, _body: string) {
  return 'pending';
});

Then('backup codes are displayed exactly once', async function(this: ClientWorld) {
  return 'pending';
});

Given('the admin has entered an incorrect password', async function(this: ClientWorld) {
  return 'pending';
});

Given('POST \\/admin\\/api\\/auth\\/login responds HTTP 401 with error code {string}', async function(this: ClientWorld, _errorCode: string) {
  return 'pending';
});

When('the admin clicks the {string} button', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('an inline error message {string} is shown on the LoginPage ElForm', async function(this: ClientWorld, _message: string) {
  return 'pending';
});

Then('the user remains on {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('the admin has made (admin_login_lockout_threshold = 10) consecutive failed login attempts', async function(this: ClientWorld) {
  return 'pending';
});

Given('POST \\/admin\\/api\\/auth\\/login responds HTTP 403 with error code {string} and {string}', async function(this: ClientWorld, _errorCode: string, _field: string) {
  return 'pending';
});

Then('the LoginPage shows the account is locked and displays the unlock time from the {string} field', async function(this: ClientWorld, _field: string) {
  return 'pending';
});

Given('the IP address has made (admin_login_ip_rate_limit_attempts = 10) requests within (admin_login_ip_rate_limit_window_seconds = 900) seconds (15 minutes)', async function(this: ClientWorld) {
  return 'pending';
});

Given('POST \\/admin\\/api\\/auth\\/login responds HTTP 429', async function(this: ClientWorld) {
  return 'pending';
});

When('the admin submits the login form', async function(this: ClientWorld) {
  return 'pending';
});

Then('a rate-limit message is displayed with a countdown of up to 900 seconds', async function(this: ClientWorld) {
  return 'pending';
});

Given('the admin user is not authenticated (no valid session cookie)', async function(this: ClientWorld) {
  return 'pending';
});

When('the user navigates directly to {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Then('the user is redirected to {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('the admin is authenticated and viewing {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('the session has been inactive for more than (admin_session_inactivity_expiry_hours = 4) hours', async function(this: ClientWorld) {
  return 'pending';
});

Given('any admin API call responds HTTP 401', async function(this: ClientWorld) {
  return 'pending';
});

When('an admin API call is made', async function(this: ClientWorld) {
  return 'pending';
});

Given('the admin is authenticated as a moderator or super_admin', async function(this: ClientWorld) {
  return 'pending';
});

Given('the admin has navigated to {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('GET \\/admin\\/api\\/pets responds HTTP 200 with pet entries', async function(this: ClientWorld) {
  return 'pending';
});

When('the PetListPage.vue loads', async function(this: ClientWorld) {
  return 'pending';
});

Then('GET \\/admin\\/api\\/pets is called with the session cookie', async function(this: ClientWorld) {
  return 'pending';
});

Then('the ElTable displays pet rows with columns: pet ID, masked owner email, rarity, level, arena record, creation date', async function(this: ClientWorld) {
  return 'pending';
});

Then('an ElSelect filter for status {string} is available', async function(this: ClientWorld, _status: string) {
  return 'pending';
});

Given('the admin is on {string} and can see a pet with petId {string}', async function(this: ClientWorld, _path: string, _petId: string) {
  return 'pending';
});

Given('POST \\/admin\\/api\\/pets\\/{petId}\\/ban responds HTTP 200', async function(this: ClientWorld) {
  return 'pending';
});

When('the admin clicks the {string} button on the pet row', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

When('the admin types a reason of at most (admin_moderation_reason_max_chars = 500) characters in the PetBanModal.vue reason field', async function(this: ClientWorld) {
  return 'pending';
});

When('the admin clicks {string}', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('POST \\/admin\\/api\\/pets\\/{petId}\\/ban is called with body {string}', async function(this: ClientWorld, _body: string) {
  return 'pending';
});

Then('the pet row status is updated to {string} in the ElTable', async function(this: ClientWorld, _status: string) {
  return 'pending';
});

Given('the PetBanModal is open for petId {string}', async function(this: ClientWorld, _petId: string) {
  return 'pending';
});

When('the admin types a reason of 501 or more characters in the reason field', async function(this: ClientWorld) {
  return 'pending';
});

Then('the {string} button remains disabled or an inline validation error is shown', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('POST \\/admin\\/api\\/pets\\/{petId}\\/ban is NOT called', async function(this: ClientWorld) {
  return 'pending';
});

Given('GET \\/admin\\/api\\/leaderboard responds with up to (leaderboard_admin_view = 500) entries', async function(this: ClientWorld) {
  return 'pending';
});

When('the AdminLeaderboardPage.vue renders', async function(this: ClientWorld) {
  return 'pending';
});

Then('the ElTable shows all returned entries without pagination', async function(this: ClientWorld) {
  return 'pending';
});

Then('pets with more than (bot_detection_battles_threshold = 50) battles in the last (bot_detection_window_minutes = 60) minutes have a SuspiciousFlagBadge component visible', async function(this: ClientWorld) {
  return 'pending';
});

Given('the AdminLeaderboardPage shows petId {string} with a SuspiciousFlagBadge', async function(this: ClientWorld, _petId: string) {
  return 'pending';
});

Given('DELETE \\/admin\\/api\\/leaderboard\\/{petId} responds HTTP 200', async function(this: ClientWorld) {
  return 'pending';
});

When('the admin clicks {string} on that row', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('DELETE \\/admin\\/api\\/leaderboard\\/{petId} is called with the session cookie', async function(this: ClientWorld) {
  return 'pending';
});

Then('the row for {string} disappears from the AdminLeaderboardPage ElTable', async function(this: ClientWorld, _petId: string) {
  return 'pending';
});

Given('the admin is authenticated as a super_admin and has navigated to {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('the RuntimeConfigPage.vue is showing an ElForm with an ElInputNumber for {string}', async function(this: ClientWorld, _fieldLabel: string) {
  return 'pending';
});

When('the admin changes the value to {int} (within the allowed range of {int} to {int})', async function(this: ClientWorld, _value: number, _min: number, _max: number) {
  return 'pending';
});

Then('PUT \\/admin\\/api\\/config\\/runtime is called with the updated value', async function(this: ClientWorld) {
  return 'pending';
});

Then('a success confirmation is displayed in the RuntimeConfigPage.vue', async function(this: ClientWorld) {
  return 'pending';
});

Given('the admin is authenticated as a super_admin and navigates to {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('GET \\/admin\\/api\\/gdpr\\/deletion-requests responds HTTP 200 with a list of requests', async function(this: ClientWorld) {
  return 'pending';
});

When('the GdprDeletionQueuePage.vue renders', async function(this: ClientWorld) {
  return 'pending';
});

Then('the ElTable shows each request with columns: request ID, masked email, submitted date, and status badge', async function(this: ClientWorld) {
  return 'pending';
});

Then('requests with status {string} display an orange badge', async function(this: ClientWorld, _status: string) {
  return 'pending';
});

Then('requests with status {string} display a green {string} badge', async function(this: ClientWorld, _status: string, _label: string) {
  return 'pending';
});

Given('the GdprDeletionQueuePage shows a PENDING request with requestId {string}', async function(this: ClientWorld, _requestId: string) {
  return 'pending';
});

Given('POST \\/admin\\/api\\/gdpr\\/deletion-requests\\/{requestId}\\/approve responds HTTP 200', async function(this: ClientWorld) {
  return 'pending';
});

When('the admin clicks the {string} button on the request row', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('a confirmation dialog appears asking {string}', async function(this: ClientWorld, _text: string) {
  return 'pending';
});

Then('the dialog has {string} and {string} buttons', async function(this: ClientWorld, _btn1: string, _btn2: string) {
  return 'pending';
});

Then('POST \\/admin\\/api\\/gdpr\\/deletion-requests\\/{requestId}\\/approve is called with the session cookie', async function(this: ClientWorld) {
  return 'pending';
});

Then('the request row status badge updates to {string}', async function(this: ClientWorld, _status: string) {
  return 'pending';
});

Then('a success notification is shown: {string}', async function(this: ClientWorld, _message: string) {
  return 'pending';
});

Given('the GdprDeletionQueuePage is loaded', async function(this: ClientWorld) {
  return 'pending';
});

Given('GET \\/admin\\/api\\/gdpr\\/deletion-requests returns a mix of PENDING and PROCESSED requests', async function(this: ClientWorld) {
  return 'pending';
});

When('the page renders', async function(this: ClientWorld) {
  return 'pending';
});

Then('completed requests display a green {string} badge in the status column', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('a {string} timestamp is shown for each completed request', async function(this: ClientWorld, _field: string) {
  return 'pending';
});

Then('PROCESSED rows are not actionable (no {string} button visible)', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Given('GET \\/admin\\/api\\/suspicious-battles responds HTTP 200 with a list of flagged battle entries', async function(this: ClientWorld) {
  return 'pending';
});

When('the SuspiciousBattleDashboardPage.vue renders', async function(this: ClientWorld) {
  return 'pending';
});

Then('the ElTable shows flagged battles with columns: battle ID, pet IDs, battle timestamp, flag reason, and status', async function(this: ClientWorld) {
  return 'pending';
});

Then('each flagged entry shows a {string} badge', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('the page title reads {string}', async function(this: ClientWorld, _title: string) {
  return 'pending';
});

Given('the SuspiciousBattleDashboardPage shows a flagged battle with battleId {string}', async function(this: ClientWorld, _battleId: string) {
  return 'pending';
});

Given('POST \\/admin\\/api\\/suspicious-battles\\/{battleId}\\/clear responds HTTP 200', async function(this: ClientWorld) {
  return 'pending';
});

When('the admin clicks {string} on the flagged battle row', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('a modal appears with a text area for the admin to enter a review reason', async function(this: ClientWorld) {
  return 'pending';
});

When('the admin enters a reason (up to 500 characters) and clicks {string}', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('POST \\/admin\\/api\\/suspicious-battles\\/{battleId}\\/clear is called with body {string}', async function(this: ClientWorld, _body: string) {
  return 'pending';
});

Then('the battle row status updates to {string}', async function(this: ClientWorld, _status: string) {
  return 'pending';
});

Then('the {string} badge is replaced with a {string} badge', async function(this: ClientWorld, _oldBadge: string, _newBadge: string) {
  return 'pending';
});

Given('GET \\/admin\\/api\\/config\\/bot-detection responds HTTP 200 with current thresholds', async function(this: ClientWorld) {
  return 'pending';
});

When('the BotDetectionConfigPage.vue renders', async function(this: ClientWorld) {
  return 'pending';
});

Then('the current value of (bot_detection_battles_threshold = 50) is shown in an ElInputNumber field', async function(this: ClientWorld) {
  return 'pending';
});

Then('the current value of (bot_detection_window_minutes = 60) is shown in a separate ElInputNumber field', async function(this: ClientWorld) {
  return 'pending';
});

Then('a {string} button is visible', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

When('the admin changes the threshold and clicks {string}', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('PUT \\/admin\\/api\\/config\\/bot-detection is called with the new threshold values', async function(this: ClientWorld) {
  return 'pending';
});

Given('GET \\/admin\\/api\\/config\\/economy responds HTTP 200 with current economy settings including {string}', async function(this: ClientWorld, _field: string) {
  return 'pending';
});

When('the EconomyConfigPage.vue renders', async function(this: ClientWorld) {
  return 'pending';
});

Then('an ElInputNumber field for {string} is visible with the current value', async function(this: ClientWorld, _fieldLabel: string) {
  return 'pending';
});

When('the admin changes the multiplier value and clicks {string}', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('PUT \\/admin\\/api\\/config\\/economy is called with the updated {string} value', async function(this: ClientWorld, _field: string) {
  return 'pending';
});

Then('a success toast {string} is shown', async function(this: ClientWorld, _message: string) {
  return 'pending';
});

Given('the admin is on {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('the current {string} is {int}', async function(this: ClientWorld, _field: string, _value: number) {
  return 'pending';
});

When('the admin updates the {string} ElInputNumber field to {int}', async function(this: ClientWorld, _fieldLabel: string, _value: number) {
  return 'pending';
});

Then('PUT \\/admin\\/api\\/config\\/economy is called with body containing {string}: {int}', async function(this: ClientWorld, _field: string, _value: number) {
  return 'pending';
});

Then('the field value refreshes to {int} on the page', async function(this: ClientWorld, _value: number) {
  return 'pending';
});

Then('a success notification {string} confirms the change', async function(this: ClientWorld, _message: string) {
  return 'pending';
});
