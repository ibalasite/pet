// features/steps/claim-flow.steps.ts
// Step definitions for features/claim-flow.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions (state setup, no action verbs)
// ---------------------------------------------------------------------------

Given('a seeded unclaimed pet with id {string} exists in the database', async function (this: AppWorld, petId: string) {
  // POST /api/v1/pets/random — see API.md §5.2
  await this.db.seed({ pets: [{ id: petId, rarity: 'COMMON', owner_token_hash: null, claimed_at: null }] });
  this.petId = petId;
  return 'pending';
});

Given('the pet {string} has no owner_token_hash set', async function (this: AppWorld, _petId: string) {
  // DB assertion only — no API call
  return 'pending';
});

Given('the pet {string} is already claimed with owner_token_hash {string}', async function (this: AppWorld, _petId: string, _hash: string) {
  // Seed pets row with owner_token_hash populated — POST /api/v1/claim/verify state
  return 'pending';
});

Given('a claim record with id {string} exists for pet {string} with a valid 6-digit code {string}', async function (this: AppWorld, claimId: string, _petId: string, _code: string) {
  // Seed claim_codes row — see SCHEMA.md claim_codes table
  this.claimId = claimId;
  return 'pending';
});

Given('the claim code {string} has not expired', function (this: AppWorld, _code: string) {
  // State assertion — expires_at is in the future
  return 'pending';
});

Given('the claim code {string} expired {int} second ago', function (this: AppWorld, _code: string, _seconds: number) {
  // Seed claim_codes with expires_at = NOW() - interval
  return 'pending';
});

Given('the claim code {string} was already used at {string}', function (this: AppWorld, _code: string, _usedAt: string) {
  // Seed claim_codes with used_at populated
  return 'pending';
});

Given('the Redis rate-limit counter {string} for email {string} is at {int}', async function (this: AppWorld, key: string, _email: string, count: number) {
  // SET rl:claim:{email_hash} {count} — see API.md §3.1
  await this.redis.set(key, String(count), 3600);
  return 'pending';
});

Given('Redis is unavailable', function (this: AppWorld) {
  // Stub Redis client to throw connection errors
  return 'pending';
});

Given('a claim record with id {string} exists for pet {string} with code {string}', async function (this: AppWorld, claimId: string, _petId: string, _code: string) {
  this.claimId = claimId;
  return 'pending';
});

// ---------------------------------------------------------------------------
// When — triggering actions (one per scenario)
// ---------------------------------------------------------------------------

When('the guest sends POST \\/api\\/v1\\/claim with email {string} petId {string} and ageConfirmed true', async function (this: AppWorld, email: string, petId: string) {
  // POST /api/v1/claim — see API.md §5.1.1
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/claim`,
    body: { email, petId, ageConfirmed: true },
  });
  return 'pending';
});

When('the guest sends POST \\/api\\/v1\\/claim with email {string} petId {string} and ageConfirmed false', async function (this: AppWorld, email: string, petId: string) {
  // POST /api/v1/claim — see API.md §5.1.1 error: AGE_CONFIRMATION_REQUIRED
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/claim`,
    body: { email, petId, ageConfirmed: false },
  });
  return 'pending';
});

When('the guest sends POST \\/api\\/v1\\/claim\\/verify with claimId {string} and code {string}', async function (this: AppWorld, claimId: string, code: string) {
  // POST /api/v1/claim/verify — see API.md §5.1.2
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/claim/verify`,
    body: { claimId, code },
  });
  return 'pending';
});

When('the guest sends POST \\/api\\/v1\\/claim\\/recover with email {string} and petId {string}', async function (this: AppWorld, email: string, petId: string) {
  // POST /api/v1/claim/recover — see API.md §5.1.3
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/claim/recover`,
    body: { email, petId },
  });
  return 'pending';
});

When('a GET request is made to \\/api\\/v1\\/pets\\/{string}', async function (this: AppWorld, petId: string) {
  // GET /api/v1/pets/:petId — see API.md §5.2
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/pets/${petId}`,
  });
  return 'pending';
});

When('an unauthenticated POST request is made to \\/api\\/v1\\/gdpr\\/request with type {string}', async function (this: AppWorld, type: string) {
  // POST /api/v1/gdpr/request — see API.md §5.5; no Authorization header
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/gdpr/request`,
    body: { type },
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

Then('the response status is {int}', function (this: AppWorld, expectedStatus: number) {
  // Assert this.lastResponse.status === expectedStatus
  return 'pending';
});

Then('the response body contains a {string} field', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('the response body contains an {string} field {int} minutes in the future', function (this: AppWorld, _field: string, _minutes: number) {
  return 'pending';
});

Then('the response body error code is {string}', function (this: AppWorld, _code: string) {
  // Assert (this.lastResponse.body as any).error.code === code
  return 'pending';
});

Then('the database record for pet {string} has owner_token_hash populated', async function (this: AppWorld, petId: string) {
  // SELECT owner_token_hash FROM pets WHERE id = petId
  const rows = await this.db.query('SELECT owner_token_hash FROM pets WHERE id = $1', [petId]);
  return 'pending';
  void rows;
});

Then('the claim code record has used_at set', async function (this: AppWorld) {
  // SELECT used_at FROM claim_codes WHERE claim_id = this.claimId
  return 'pending';
});

Then('the pet {string} still has no owner_token_hash in the database', async function (this: AppWorld, _petId: string) {
  // SELECT owner_token_hash FROM pets WHERE id = petId — expect null
  return 'pending';
});

Then('the response body field {string} is {string}', function (this: AppWorld, _field: string, _value: string) {
  return 'pending';
});

Then('the response header {string} is present', function (this: AppWorld, _header: string) {
  // Assert this.lastResponse.headers[header] is defined
  return 'pending';
});

Then('the response body is identical in structure to a successful 200 claim initiation', function (this: AppWorld) {
  // Anti-enumeration check — response shape matches happy path
  return 'pending';
});

Then('the response does not reveal whether the petId exists', function (this: AppWorld) {
  return 'pending';
});

Then('the old token hash {string} is added to Redis blacklist key {string}', async function (this: AppWorld, _hash: string, key: string) {
  // GET token:blacklist:{hash} — see API.md §2.1 token blacklist
  const val = await this.redis.get(key);
  return 'pending';
  void val;
});

Then('the response body contains a {string} field with at least {int} bytes of base64url data', function (this: AppWorld, _field: string, _minBytes: number) {
  return 'pending';
});

Then('the response status is {int} or {int}', function (this: AppWorld, _a: number, _b: number) {
  return 'pending';
});
