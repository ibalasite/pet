// features/steps/gdpr-erasure.steps.ts
// Step definitions for features/gdpr-erasure.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

Given('a claimed pet {string} exists owned by claim identity {string} with email encrypted in claim_identities', async function (this: AppWorld, petId: string, identityId: string) {
  // Seed pets + claim_identities rows — see SCHEMA.md claim_identities
  await this.db.seed({
    pets: [{ id: petId, rarity: 'COMMON', level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: false, owner_token_hash: `hash-of-token-gdpr-001` }],
    claim_identities: [{
      id: identityId,
      pet_id: petId,
      email_encrypted: 'encrypted-email-placeholder',
      email_hash: `hash-of-email-${identityId}`,
      created_at: new Date().toISOString(),
    }],
  });
});

Given('the pet owner holds token {string} associated with {string}', function (this: AppWorld, token: string, _petId: string) {
  // Set auth token on AppWorld for subsequent When steps — see API.md §2.1
  this.authToken = token;
});

Given('a gdpr_requests row exists for {string} with status {string}', async function (this: AppWorld, identityId: string, status: string) {
  // Seed gdpr_requests row — see SCHEMA.md gdpr_requests
  await this.db.seed({
    gdpr_requests: [{
      id: `job-gdpr-seed-${identityId}`,
      claim_identity_id: identityId,
      status,
      request_type: 'erasure',
      submitted_at: new Date().toISOString(),
    }],
  });
});

Given('the GDPR background job processes the erasure for {string}', async function (this: AppWorld, _identityId: string) {
  // Trigger GDPR erasure job — nulls email_encrypted, removes from leaderboard
  return 'pending';
});

Given('pet {string} exists in the Redis sorted set {string}', async function (this: AppWorld, petId: string, key: string) {
  // ZADD leaderboard:global score petId — see API.md §5.4
  await this.redis.zadd(key, 75.0, petId);
});

Given('a gdpr_requests row {string} exists for {string} with status {string}', async function (this: AppWorld, jobId: string, identityId: string, status: string) {
  // Seed gdpr_requests with explicit jobId — see SCHEMA.md gdpr_requests
  await this.db.seed({
    gdpr_requests: [{
      id: jobId,
      claim_identity_id: identityId,
      status,
      request_type: 'erasure',
      submitted_at: new Date().toISOString(),
    }],
  });
  this.jobId = jobId;
});

Given('a gdpr_requests row {string} exists for a different claim identity', async function (this: AppWorld, jobId: string) {
  // Seed a gdpr_request belonging to a different identity — cross-identity 403 check
  await this.db.seed({
    claim_identities: [{
      id: 'identity-other-001',
      pet_id: 'pet-other-001',
      email_encrypted: 'encrypted-other',
      email_hash: 'hash-of-other',
      created_at: new Date().toISOString(),
    }],
    gdpr_requests: [{
      id: jobId,
      claim_identity_id: 'identity-other-001',
      status: 'pending',
      request_type: 'erasure',
      submitted_at: new Date().toISOString(),
    }],
  });
});

Given('the claim_identities row for {string} has email_encrypted null and email_hash set', async function (this: AppWorld, identityId: string) {
  // UPDATE claim_identities SET email_encrypted = NULL — see SCHEMA.md
  await this.db.query('UPDATE claim_identities SET email_encrypted = NULL WHERE id = $1', [identityId]);
});

Given('a new unclaimed pet {string} exists in the database', async function (this: AppWorld, petId: string) {
  // Seed unclaimed pet row — see SCHEMA.md pets table
  await this.db.seed({
    pets: [{ id: petId, rarity: 'COMMON', level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: false, owner_token_hash: null }],
  });
});

Given('a super_admin session cookie is set for admin user {string}', function (this: AppWorld, _adminId: string) {
  // Set super_admin session cookie — see API.md §2.2
  this.adminSessionCookie = 'admin-session=test-super-admin-session-fixture';
});

Given('the erasure for {string} is complete and email_encrypted is null', async function (this: AppWorld, identityId: string) {
  // UPDATE claim_identities SET email_encrypted = NULL — erasure complete state
  await this.db.query('UPDATE claim_identities SET email_encrypted = NULL WHERE id = $1', [identityId]);
});

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

When('{string} sends POST /api/v1/gdpr/request with type {string}', async function (this: AppWorld, token: string, type: string) {
  // POST /api/v1/gdpr/request — see API.md §5.5
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/gdpr/request`,
    headers: { Authorization: `Bearer ${token}` },
    body: { type },
  });
});

When('{string} sends GET /api/v1/gdpr/request/status with jobId {string}', async function (this: AppWorld, token: string, jobId: string) {
  // GET /api/v1/gdpr/request/status?jobId=... — see API.md §5.5
  const qs = new URLSearchParams({ jobId }).toString();
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/gdpr/request/status?${qs}`,
    headers: { Authorization: `Bearer ${token}` },
  });
});

When('the same email is submitted in POST /api/v1/claim with petId {string} and ageConfirmed true', async function (this: AppWorld, petId: string) {
  // POST /api/v1/claim — email_hash collision check — see API.md §5.1.1
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/claim`,
    body: { email: 'erased-user@example.com', petId, ageConfirmed: true },
  });
});

// NOTE: 'a GET request is made to /api/v1/leaderboard without authentication' → registered in shared.steps.ts

When('the admin sends POST /admin/api/gdpr/{word}/process', async function (this: AppWorld, jobId: string) {
  // POST /admin/api/gdpr/:jobId/process — see API.md §5.5
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/gdpr/${encodeURIComponent(jobId)}/process`,
    headers: { Cookie: this.adminSessionCookie ?? '' },
  });
});

// NOTE: 'a GET request is made to /api/v1/pets/{string} without authentication' → registered in shared.steps.ts
// NOTE: 'an unauthenticated POST request is made to /api/v1/gdpr/request with type {string}' → registered in shared.steps.ts

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

// NOTE: Then('the response status is {int}') — registered in shared.steps.ts
// NOTE: Then('the response body contains a {string} field') — registered in shared.steps.ts
// NOTE: Then('the response body error code is {string}') — registered in shared.steps.ts

Then('the database table gdpr_requests has a row with status {string} for {string}', async function (this: AppWorld, status: string, identityId: string) {
  // SELECT id FROM gdpr_requests WHERE claim_identity_id = $1 AND status = $2
  const _rows = await this.db.query<{ id: string }>(
    'SELECT id FROM gdpr_requests WHERE claim_identity_id = $1 AND status = $2',
    [identityId, status],
  );
  return 'pending'; // assertion against _rows deferred to implementation phase
});

Then('the database claim_identities row for {string} has email_encrypted set to null', async function (this: AppWorld, identityId: string) {
  // SELECT email_encrypted FROM claim_identities WHERE id = $1 — expect null
  const _rows = await this.db.query<{ email_encrypted: string | null }>(
    'SELECT email_encrypted FROM claim_identities WHERE id = $1',
    [identityId],
  );
  return 'pending'; // assertion against _rows deferred to implementation phase
});

Then('the database claim_identities row for {string} retains a non-null email_hash', async function (this: AppWorld, identityId: string) {
  // SELECT email_hash FROM claim_identities WHERE id = $1 — expect non-null
  const _rows = await this.db.query<{ email_hash: string }>(
    'SELECT email_hash FROM claim_identities WHERE id = $1',
    [identityId],
  );
  return 'pending'; // assertion against _rows deferred to implementation phase
});

Then('the gdpr_requests row status is {string}', async function (this: AppWorld, _status: string) {
  // SELECT status FROM gdpr_requests WHERE id = this.jobId
  if (!this.jobId) throw new Error('this.jobId is not set — ensure a Given step initialises jobId before this assertion');
  const _rows = await this.db.query<{ status: string }>(
    'SELECT status FROM gdpr_requests WHERE id = $1',
    [this.jobId],
  );
  return 'pending'; // assertion against _rows deferred to implementation phase
});

Then('{string} does NOT appear in the response {string} array', function (this: AppWorld, _petId: string, _field: string) {
  // parse (this.lastResponse.body as any)[_field] and verify _petId is absent
  return 'pending';
});

Then('the database lookup finds the retained email_hash and prevents a duplicate identity', function (this: AppWorld) {
  // assert this.lastResponse.status === 409 || error.code === 'DUPLICATE_IDENTITY'
  return 'pending';
});

// NOTE: 'the response body field {string} is {string}' → registered in shared.steps.ts

Then('the response body contains {string} and {string} fields', function (this: AppWorld, _field1: string, _field2: string) {
  return 'pending';
});

Then('the database admin_audit_log has a row with action {string} and admin_id {string}', async function (this: AppWorld, action: string, adminId: string) {
  // SELECT id FROM admin_audit_log WHERE action = $1 AND admin_id = $2
  const _rows = await this.db.query<{ id: string }>(
    'SELECT id FROM admin_audit_log WHERE action = $1 AND admin_id = $2',
    [action, adminId],
  );
  return 'pending'; // assertion against _rows deferred to implementation phase
});

Then('the response body does not contain any email field', function (this: AppWorld) {
  // assert no key matching /email/i exists in this.lastResponse.body
  return 'pending';
});

Then('the response body {string} field is {string}', function (this: AppWorld, _field: string, _value: string) {
  return 'pending';
});
