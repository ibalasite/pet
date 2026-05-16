// features/steps/admin-search-performance.steps.ts
// Step definitions for features/admin-search-performance.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

Given('a moderator admin {string} is authenticated with a valid session cookie', function (this: AppWorld, _adminId: string) {
  // Set moderator session cookie on AppWorld — see API.md §2.2
  // Token value is a test-only fixture credential, not a production secret
  this.adminSessionCookie = 'admin-session=test-moderator-session-fixture';
});

Given('a read_only admin {string} is authenticated with a valid session cookie', function (this: AppWorld, _adminId: string) {
  // Set read_only session cookie on AppWorld — see API.md §2.2
  this.adminSessionCookie = 'admin-session=test-readonly-session-fixture';
});

Given('the database contains at least {int} pets rows', function (this: AppWorld, _count: number) {
  // Large-volume seed is infrastructure-level setup — deferred to test environment provisioning
  // The 1M pets dataset is typically pre-loaded in the perf test environment, not seeded per scenario
  return 'pending';
});

Given('a pet with id {string} exists in the database', async function (this: AppWorld, petId: string) {
  // Seed the specific pet that will be searched — see SCHEMA.md pets table
  await this.db.seed({
    pets: [{ id: petId, rarity: 'RARE', level: 5, stat_speed: 60, stat_strength: 60, stat_stamina: 60, is_banned: false }],
  });
});

Given('a pet {string} exists with owner email {string} stored encrypted', async function (this: AppWorld, petId: string, _email: string) {
  // Seed pet row — email stored in claim_identities.email_encrypted, not in pets — see SCHEMA.md
  await this.db.seed({
    pets: [{ id: petId, rarity: 'COMMON', level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: false }],
    claim_identities: [{
      id: `identity-${petId}`,
      pet_id: petId,
      email_encrypted: 'encrypted-owner-email-placeholder',
      email_hash: `hash-of-${petId}-email`,
      created_at: new Date().toISOString(),
    }],
  });
});

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

When('the admin sends GET \\/admin\\/api\\/pets with search param {string}', async function (this: AppWorld, searchParam: string) {
  // GET /admin/api/pets?search=... — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  const qs = new URLSearchParams({ search: searchParam }).toString();
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/admin/api/pets?${qs}`,
    headers: { Cookie: this.adminSessionCookie },
  });
});

When('the admin sends GET \\/admin\\/api\\/pets with page {int} and limit {int}', async function (this: AppWorld, page: number, limit: number) {
  // GET /admin/api/pets?page=N&limit=N — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/admin/api/pets?${qs}`,
    headers: { Cookie: this.adminSessionCookie },
  });
});

When('an unauthenticated GET request is made to \\/admin\\/api\\/pets', async function (this: AppWorld) {
  // GET /admin/api/pets — no cookie — expect 401 — see API.md §2.3
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/admin/api/pets`,
  });
});

When('the read_only admin sends GET \\/admin\\/api\\/pets with page {int} and limit {int}', async function (this: AppWorld, page: number, limit: number) {
  // GET /admin/api/pets — read_only role — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the read_only admin');
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/admin/api/pets?${qs}`,
    headers: { Cookie: this.adminSessionCookie },
  });
});

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

Then('the response status is {int}', function (this: AppWorld, _status: number) {
  return 'pending';
});

Then('the response body error code is {string}', function (this: AppWorld, _code: string) {
  return 'pending';
});

Then('the response body {string} array contains {string}', function (this: AppWorld, _field: string, _value: string) {
  return 'pending';
});

Then('the response was received within {int} milliseconds', function (this: AppWorld, _ms: number) {
  // TODO: assert (Date.now() - requestStartTime) <= _ms
  // requestStartTime must be captured in the When step
  return 'pending';
});

Then('each entry in the response body {string} array has petId rarity level arenaRecord createdAt fields', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('the response meta contains total page and limit fields', function (this: AppWorld) {
  return 'pending';
});

Then('the response body {string} array is empty', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('the response meta field {string} is {int}', function (this: AppWorld, _field: string, _value: number) {
  return 'pending';
});

Then('the response body entry for {string} does not contain a plaintext email field', function (this: AppWorld, _petId: string) {
  // TODO: parse response data array, find entry with petId === _petId, assert no /email/i key
  return 'pending';
});

Then('the response body {string} is a non-empty array', function (this: AppWorld, _field: string) {
  return 'pending';
});
