// features/steps/leaderboard.steps.ts
// Step definitions for features/leaderboard.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

Given('the Redis sorted set {string} contains {int} entries with varying scores', async function (this: AppWorld, key: string, count: number) {
  // ZADD leaderboard:global score member × count — see API.md §5.4
  for (let i = 0; i < count; i++) {
    await this.redis.zadd(key, 100 - i * 0.5, `pet-lb-${i.toString().padStart(3, '0')}`);
  }
});

Given('the Redis sorted set {string} contains pets of all rarity tiers', async function (this: AppWorld, key: string) {
  // Seed cross-rarity entries into Redis sorted set
  const rarities = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];
  for (let i = 0; i < 20; i++) {
    const rarity = rarities[i % 4];
    const petId = `pet-rarity-${rarity.toLowerCase()}-${i}`;
    await this.db.seed({ pets: [{ id: petId, rarity, level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: false }] });
    await this.redis.zadd(key, 80 - i, petId);
  }
});

Given('a pet {string} with score {float} exists in the leaderboard at rank {int}', async function (this: AppWorld, petId: string, score: number, _rank: number) {
  // Seed pet row and ZADD into leaderboard:global — see API.md §5.4
  await this.db.seed({ pets: [{ id: petId, rarity: 'RARE', level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: false }] });
  await this.redis.zadd('leaderboard:global', score, petId);
});

Given('Redis is unavailable', function (this: AppWorld) {
  // Stub Redis to simulate connectivity failure — fail-open for leaderboard
  return 'pending';
});

Given('the database table leaderboard_snapshots has a recent row with valid leaderboard data', async function (this: AppWorld) {
  // Seed leaderboard_snapshots — PostgreSQL fallback — see EDD.md §leaderboard
  await this.db.seed({
    leaderboard_snapshots: [{
      id: 'snap-001',
      snapshot_data: JSON.stringify([{ rank: 1, petId: 'pet-lb-000', score: 100, rarity: 'RARE', level: 1, winRate: 0.75 }]),
      created_at: new Date().toISOString(),
    }],
  });
});

Given('pet {string} completes a winning Race battle', async function (this: AppWorld, petId: string) {
  // Seed an arena_matches row with this pet as winner — see SCHEMA.md arena_matches
  await this.db.seed({
    arena_matches: [{
      id: `match-board-${petId}`,
      pet_a_id: petId,
      pet_b_id: 'opponent-board-001',
      winner_id: petId,
      mode: 'RACE',
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
    }],
  });
});

Given('the battle result is persisted in arena_matches', function (this: AppWorld) {
  // State assertion — arena_matches row already seeded in previous step
  return 'pending';
});

Given('pet {string} exists in the Redis sorted set {string} at rank {int}', async function (this: AppWorld, petId: string, key: string, _rank: number) {
  // Seed pet and ZADD with a high score so it appears at rank 10
  await this.db.seed({ pets: [{ id: petId, rarity: 'EPIC', level: 5, stat_speed: 80, stat_strength: 80, stat_stamina: 80, is_banned: false }] });
  await this.redis.zadd(key, 92.0, petId);
});

Given('an admin session cookie is set for a moderator admin user', function (this: AppWorld) {
  // Set admin session cookie on AppWorld from test fixture — see API.md §2.2
  // Token value is a test-only fixture credential, not a production secret
  this.adminSessionCookie = 'admin-session=test-moderator-session-fixture';
});

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

When('a GET request is made to \\/api\\/v1\\/leaderboard without authentication', async function (this: AppWorld) {
  // GET /api/v1/leaderboard — see API.md §5.4
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/leaderboard`,
  });
});

When('a GET request is made to \\/api\\/v1\\/leaderboard with query param rarity={word} without authentication', async function (this: AppWorld, rarity: string) {
  // GET /api/v1/leaderboard?rarity=EPIC — see API.md §5.4
  const qs = new URLSearchParams({ rarity }).toString();
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/leaderboard?${qs}`,
  });
});

When('a GET request is made to \\/api\\/v1\\/leaderboard\\/rank\\/{string} without authentication', async function (this: AppWorld, petId: string) {
  // GET /api/v1/leaderboard/rank/:petId — see API.md §5.4
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/leaderboard/rank/${encodeURIComponent(petId)}`,
  });
});

When('{int} seconds elapse for the leaderboard sync job to run', function (this: AppWorld, _seconds: number) {
  // Trigger leaderboard sync job or wait for background job — see EDD.md §leaderboard
  return 'pending';
});

When('the admin sends POST \\/admin\\/api\\/pets\\/{string}\\/ban with reason {string}', async function (this: AppWorld, petId: string, reason: string) {
  // POST /admin/api/pets/:petId/ban — see API.md §5.5
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/pets/${encodeURIComponent(petId)}/ban`,
    headers: { Cookie: this.adminSessionCookie ?? '' },
    body: { reason },
  });
});

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

Then('the response body {string} array contains exactly {int} entries', function (this: AppWorld, _field: string, _count: number) {
  return 'pending';
});

Then('each entry has fields: {word} {word} {word} {word} {word} {word} {word}', function (this: AppWorld, ..._fields: string[]) {
  return 'pending';
});

Then('entries are ordered by score descending', function (this: AppWorld) {
  return 'pending';
});

Then('the response meta contains total page and limit fields', function (this: AppWorld) {
  return 'pending';
});

Then('all entries in {string} have rarity {string}', function (this: AppWorld, _field: string, _rarity: string) {
  return 'pending';
});

Then('the response body field {string} is {float}', function (this: AppWorld, _field: string, _value: number) {
  return 'pending';
});

Then('the response body field {string} is {int}', function (this: AppWorld, _field: string, _value: number) {
  return 'pending';
});

Then('the response body field {string} is {string}', function (this: AppWorld, _field: string, _value: string) {
  return 'pending';
});

Then('the response body error code is {string}', function (this: AppWorld, _code: string) {
  return 'pending';
});

Then('the response body field {string} is true', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('the response body {string} is a non-empty array', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('the Redis sorted set {string} contains {string} with an updated score', async function (this: AppWorld, key: string, petId: string) {
  // ZRANK leaderboard:global {petId} — see API.md §5.4
  void await this.redis.zrank(key, petId);
  return 'pending';
});

Then('the Redis sorted set {string} does NOT contain {string}', async function (this: AppWorld, key: string, petId: string) {
  // ZRANK should return null after ban/erasure
  void await this.redis.zrank(key, petId);
  return 'pending';
});

Then('the database admin_audit_log has a row with action {string} and pet_id {string}', async function (this: AppWorld, action: string, petId: string) {
  // SELECT id FROM admin_audit_log WHERE action = $1 AND target_id = $2
  void await this.db.query('SELECT id FROM admin_audit_log WHERE action = $1 AND target_id = $2', [action, petId]);
  return 'pending';
});
