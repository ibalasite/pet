// features/steps/admin-moderation.steps.ts
// Step definitions for features/admin-moderation.feature
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

Given('pet {string} exists with is_banned false', async function (this: AppWorld, petId: string) {
  // Seed pets row with is_banned false — see SCHEMA.md pets table
  await this.db.seed({
    pets: [{ id: petId, rarity: 'COMMON', level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: false, owner_token_hash: `hash-of-token-${petId}` }],
  });
});

Given('pet {string} exists with is_banned true', async function (this: AppWorld, petId: string) {
  // Seed pets row with is_banned true — see SCHEMA.md pets table
  await this.db.seed({
    pets: [{ id: petId, rarity: 'COMMON', level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: true, owner_token_hash: `hash-of-token-${petId}` }],
  });
});

Given('pet {string} is in the Redis sorted set {string} at rank {int}', async function (this: AppWorld, petId: string, key: string, _rank: number) {
  // ZADD leaderboard:global high_score petId — see API.md §5.4
  await this.redis.zadd(key, 95.0, petId);
});

Given('pet {string} is in the Redis sorted set {string}', async function (this: AppWorld, petId: string, key: string) {
  // ZADD leaderboard:global with arbitrary score — see API.md §5.4
  await this.redis.zadd(key, 70.0, petId);
});

Given('the pet owner holds token {string}', function (this: AppWorld, token: string) {
  // Store token for use in When steps — see API.md §2.1
  this.authToken = token;
});

Given('the database is configured to reject writes for this scenario', function (this: AppWorld) {
  // Stub DB to simulate write failure — implementation-specific override
  return 'pending';
});

Given('Redis is unavailable', function (this: AppWorld) {
  // Stub Redis to simulate connectivity failure — see EDD.md §resilience
  return 'pending';
});

Given('the database contains {int} pets with varying arena_matches counts in the last hour', async function (this: AppWorld, count: number) {
  // Seed N pets rows — performance/moderation list scenario
  const rows = Array.from({ length: Math.min(count, 50) }, (_, i) => ({
    id: `pet-mod-list-${i}`,
    rarity: i % 4 === 0 ? 'LEGENDARY' : i % 4 === 1 ? 'EPIC' : i % 4 === 2 ? 'RARE' : 'COMMON',
    level: (i % 10) + 1,
    stat_speed: 20, stat_strength: 20, stat_stamina: 20,
    is_banned: false,
  }));
  await this.db.seed({ pets: rows });
});

Given('pet {string} exists with is_banned false', async function (this: AppWorld) {
  // alias handled by the parameterised version above
  return 'pending';
});

Given('the admin has previously banned {string} with reason {string}', async function (this: AppWorld, petId: string, reason: string) {
  // Pre-state: seed an admin_audit_log BAN row for the given pet — see SCHEMA.md admin_audit_log
  await this.db.seed({
    admin_audit_log: [{
      id: `audit-ban-${petId}`,
      action: 'BAN',
      admin_id: 'admin-mod-001',
      target_id: petId,
      detail: JSON.stringify({ reason }),
      created_at: new Date(Date.now() - 2000).toISOString(),
    }],
  });
});

Given('the admin has previously unbanned {string} with reason {string}', async function (this: AppWorld, petId: string, reason: string) {
  // Pre-state: seed an admin_audit_log UNBAN row for the given pet — see SCHEMA.md admin_audit_log
  await this.db.seed({
    admin_audit_log: [{
      id: `audit-unban-${petId}`,
      action: 'UNBAN',
      admin_id: 'admin-mod-001',
      target_id: petId,
      detail: JSON.stringify({ reason }),
      created_at: new Date(Date.now() - 1000).toISOString(),
    }],
  });
});

Given('pet {string} has suspicious_flag true in the database', async function (this: AppWorld, petId: string) {
  // UPDATE pets SET suspicious_flag = true WHERE id = $1
  await this.db.query('UPDATE pets SET suspicious_flag = true WHERE id = $1', [petId]);
});

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

When('the admin sends POST \\/admin\\/api\\/pets\\/{string}\\/ban with reason {string}', async function (this: AppWorld, petId: string, reason: string) {
  // POST /admin/api/pets/:petId/ban — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/pets/${encodeURIComponent(petId)}/ban`,
    headers: { Cookie: this.adminSessionCookie },
    body: { reason },
  });
});

When('the admin sends POST \\/admin\\/api\\/pets\\/{string}\\/ban with a reason of {int} characters', async function (this: AppWorld, petId: string, charCount: number) {
  // POST /admin/api/pets/:petId/ban — reason length validation — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  const reason = 'x'.repeat(charCount);
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/pets/${encodeURIComponent(petId)}/ban`,
    headers: { Cookie: this.adminSessionCookie },
    body: { reason },
  });
});

When('the admin sends POST \\/admin\\/api\\/pets\\/nonexistent-pet-uuid\\/ban with reason {string}', async function (this: AppWorld, reason: string) {
  // POST /admin/api/pets/nonexistent-pet-uuid/ban — 404 path — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/pets/nonexistent-pet-uuid/ban`,
    headers: { Cookie: this.adminSessionCookie },
    body: { reason },
  });
});

When('{string} sends POST \\/api\\/v1\\/arena\\/enter with petId {string} mode {string} and acceptAI {word}', async function (this: AppWorld, token: string, petId: string, mode: string, acceptAIStr: string) {
  // POST /api/v1/arena/enter — see API.md §5.3
  const acceptAI = acceptAIStr === 'true';
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/arena/enter`,
    headers: { Authorization: `Bearer ${token}` },
    body: { petId, mode, acceptAI },
  });
});

When('the admin sends GET \\/admin\\/api\\/pets with limit {int}', async function (this: AppWorld, limit: number) {
  // GET /admin/api/pets?limit=N — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  const qs = new URLSearchParams({ limit: String(limit) }).toString();
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/admin/api/pets?${qs}`,
    headers: { Cookie: this.adminSessionCookie },
  });
});

When('the read_only admin sends POST \\/admin\\/api\\/pets\\/{string}\\/ban with reason {string}', async function (this: AppWorld, petId: string, reason: string) {
  // POST /admin/api/pets/:petId/ban with read_only cookie — expect 403 — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the read_only admin');
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/pets/${encodeURIComponent(petId)}/ban`,
    headers: { Cookie: this.adminSessionCookie },
    body: { reason },
  });
});

When('the admin sends POST \\/admin\\/api\\/pets\\/{string}\\/unban with reason {string}', async function (this: AppWorld, petId: string, reason: string) {
  // POST /admin/api/pets/:petId/unban — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/pets/${encodeURIComponent(petId)}/unban`,
    headers: { Cookie: this.adminSessionCookie },
    body: { reason },
  });
});

When('the admin sends GET \\/admin\\/api\\/audit with limit {int}', async function (this: AppWorld, limit: number) {
  // GET /admin/api/audit?limit=N — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  const qs = new URLSearchParams({ limit: String(limit) }).toString();
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/admin/api/audit?${qs}`,
    headers: { Cookie: this.adminSessionCookie },
  });
});

When('a GET request to \\/api\\/v1\\/leaderboard returns entries that do not include {string}', async function (this: AppWorld, _petId: string) {
  // GET /api/v1/leaderboard — verify pet absent from response
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/leaderboard`,
  });
});

When('the moderator sends PUT \\/admin\\/api\\/config\\/economy with food_buff_speed_multiplier {float}', async function (this: AppWorld, value: number) {
  // PUT /admin/api/config/economy — moderator role → expect 403 — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the moderator');
  this.lastResponse = await this.client.request({
    method: 'PUT',
    url: `${this.apiBaseUrl}/admin/api/config/economy`,
    headers: { Cookie: this.adminSessionCookie },
    body: { food_buff_speed_multiplier: value },
  });
});

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

// NOTE: Then('the response status is {int}') — registered in shared.steps.ts
// NOTE: Then('the response status is {int} or {int}') — registered in shared.steps.ts
// NOTE: Then('the response body error code is {string}') — registered in shared.steps.ts

Then('the database pets row for {string} has is_banned true', async function (this: AppWorld, petId: string) {
  // SELECT is_banned FROM pets WHERE id = $1
  const _rows = await this.db.query<{ is_banned: boolean }>('SELECT is_banned FROM pets WHERE id = $1', [petId]);
  return 'pending';
});

Then('the database pets row for {string} has banned_reason set', async function (this: AppWorld, petId: string) {
  // SELECT banned_reason FROM pets WHERE id = $1 — expect non-null
  const _rows = await this.db.query<{ banned_reason: string }>('SELECT banned_reason FROM pets WHERE id = $1', [petId]);
  return 'pending';
});

Then('the database pets row for {string} still has is_banned false', async function (this: AppWorld, petId: string) {
  // SELECT is_banned FROM pets WHERE id = $1 — expect false
  const _rows = await this.db.query<{ is_banned: boolean }>('SELECT is_banned FROM pets WHERE id = $1', [petId]);
  return 'pending';
});

Then('the database pets row for {string} is unchanged', async function (this: AppWorld, petId: string) {
  // SELECT is_banned FROM pets WHERE id = $1 — expect unchanged
  const _rows = await this.db.query<{ is_banned: boolean }>('SELECT is_banned FROM pets WHERE id = $1', [petId]);
  return 'pending';
});

Then('the Redis sorted set {string} does NOT contain {string}', async function (this: AppWorld, key: string, petId: string) {
  // ZRANK key petId — expect null
  const _rank = await this.redis.zrank(key, petId);
  return 'pending';
});

Then('the Redis sorted set {string} still contains {string}', async function (this: AppWorld, key: string, petId: string) {
  // ZRANK key petId — expect non-null
  const _rank = await this.redis.zrank(key, petId);
  return 'pending';
});

Then('the database admin_audit_log has a row with action {string} and admin_id {string} and target_id {string}', async function (this: AppWorld, action: string, adminId: string, targetId: string) {
  // SELECT id FROM admin_audit_log WHERE action = $1 AND admin_id = $2 AND target_id = $3
  const _rows = await this.db.query<{ id: string }>(
    'SELECT id FROM admin_audit_log WHERE action = $1 AND admin_id = $2 AND target_id = $3',
    [action, adminId, targetId],
  );
  return 'pending';
});

Then('the response body {string} array contains pet entries with petId rarity level and recent battle counts', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('the response body contains at least {int} audit log entries for {string}', function (this: AppWorld, _count: number, _petId: string) {
  return 'pending';
});

Then('the entries include actions {string} and {string} with admin_id {string}', function (this: AppWorld, _action1: string, _action2: string, _adminId: string) {
  return 'pending';
});

Then('the entries include actions {string} and {string} with admin_id {string} in sequence', function (this: AppWorld, _action1: string, _action2: string, _adminId: string) {
  // Assert audit log entries appear in BAN → UNBAN order for the given admin — see API.md §5.5
  return 'pending';
});
