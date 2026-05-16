// features/steps/admin-auth.steps.ts
// Step definitions for features/admin-auth.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

Given('an admin account {string} exists with a valid password and TOTP secret configured', async function (this: AppWorld, adminId: string) {
  // Seed admin_accounts row with hashed password and TOTP secret — see SCHEMA.md admin_accounts
  // Credentials are test-only fixture values, not production secrets
  await this.db.seed({
    admin_accounts: [{
      id: adminId,
      username: adminId,
      password_hash: `bcrypt-hash-of-test-password-${adminId}`,
      totp_secret: `totp-secret-fixture-${adminId}`,
      totp_configured: true,
      failed_login_count: 0,
      locked_until: null,
      role: 'moderator',
    }],
  });
  return 'pending';
});

Given('an admin account {string} has failed login {int} times consecutively', async function (this: AppWorld, adminId: string, failCount: number) {
  // Seed admin_accounts with failed_login_count = failCount and locked_until set — see API.md §2.2
  const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await this.db.seed({
    admin_accounts: [{
      id: adminId,
      username: adminId,
      password_hash: `bcrypt-hash-of-test-password-${adminId}`,
      totp_secret: `totp-secret-fixture-${adminId}`,
      totp_configured: true,
      failed_login_count: failCount,
      locked_until: lockedUntil,
      role: 'moderator',
    }],
  });
  return 'pending';
});

Given('an admin account {string} exists with a valid password but no TOTP secret configured', async function (this: AppWorld, adminId: string) {
  // Seed admin_accounts row with totp_configured false — TOTP setup required flow
  await this.db.seed({
    admin_accounts: [{
      id: adminId,
      username: adminId,
      password_hash: `bcrypt-hash-of-test-password-${adminId}`,
      totp_secret: null,
      totp_configured: false,
      failed_login_count: 0,
      locked_until: null,
      role: 'moderator',
    }],
  });
  return 'pending';
});

Given('an admin {string} is authenticated with a valid session cookie', function (this: AppWorld, _adminId: string) {
  // Set moderator session cookie on AppWorld — see API.md §2.2
  // Token value is a test-only fixture credential, not a production secret
  this.adminSessionCookie = 'admin-session=test-moderator-session-fixture';
  return 'pending';
});

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

When('the admin submits correct credentials and a valid TOTP code for {string}', async function (this: AppWorld, adminId: string) {
  // POST /admin/api/auth/login — see API.md §2.2
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/auth/login`,
    body: {
      username: adminId,
      password: 'test-password-fixture',
      totpCode: '123456',
    },
  });
  return 'pending';
});

When('the admin submits an incorrect password for {string}', async function (this: AppWorld, adminId: string) {
  // POST /admin/api/auth/login with wrong password — see API.md §2.2 error: INVALID_CREDENTIALS
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/auth/login`,
    body: {
      username: adminId,
      password: 'wrong-password-fixture',
      totpCode: '000000',
    },
  });
  return 'pending';
});

When('the admin submits any credentials for {string}', async function (this: AppWorld, adminId: string) {
  // POST /admin/api/auth/login — account is locked regardless of credentials — see API.md §2.2
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/auth/login`,
    body: {
      username: adminId,
      password: 'any-password-fixture',
      totpCode: '000000',
    },
  });
  return 'pending';
});

When('the admin submits correct password credentials for {string}', async function (this: AppWorld, adminId: string) {
  // POST /admin/api/auth/login — no TOTP configured — see API.md §2.2 error: TOTP_SETUP_REQUIRED
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/auth/login`,
    body: {
      username: adminId,
      password: 'test-password-fixture',
    },
  });
  return 'pending';
});

When('the admin sends POST /admin/api/auth/logout', async function (this: AppWorld) {
  // POST /admin/api/auth/logout — see API.md §2.2
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/auth/logout`,
    headers: { Cookie: this.adminSessionCookie ?? '' },
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

Then('the response sets a {string} cookie with HttpOnly and Secure flags', function (this: AppWorld, _cookieName: string) {
  // Assert Set-Cookie header contains HttpOnly and Secure attributes — see API.md §2.2
  return 'pending';
});

Then('no session cookie is set', function (this: AppWorld) {
  // Assert Set-Cookie header is absent or empty in the response — see API.md §2.2
  return 'pending';
});

Then('the response body contains an {string} field', function (this: AppWorld, _field: string) {
  // Assert response body has the named field present and non-null — see API.md §2.2
  return 'pending';
});

Then('the response clears the {string} cookie', function (this: AppWorld, _cookieName: string) {
  // Assert Set-Cookie header sets the named cookie with Max-Age=0 or Expires in the past — see API.md §2.2
  return 'pending';
});

Then('subsequent requests using the old session cookie return 401', async function (this: AppWorld) {
  // Re-issue any authenticated admin request with the old cookie — expect 401 — see API.md §2.2
  const probeResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/admin/api/pets`,
    headers: { Cookie: this.adminSessionCookie ?? '' },
  });
  void probeResponse;
  return 'pending';
});
