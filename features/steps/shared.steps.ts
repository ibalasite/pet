// features/steps/shared.steps.ts
// Shared step definitions reused across multiple feature step files.
// Each stub returns 'pending' — see API.md for endpoint contracts.
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Shared Then — response status (found in 11+ step files)
// ---------------------------------------------------------------------------

Then('the response status is {int}', function (this: AppWorld, _status: number) {
  // Shared step — see API.md §2 for HTTP status code semantics
  return 'pending';
});

Then('the response status is {int} or {int}', function (this: AppWorld, _a: number, _b: number) {
  // Shared step — see API.md §2 for error response codes
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Then — common response body assertions
// ---------------------------------------------------------------------------

Then('the response body error code is {string}', function (this: AppWorld, _code: string) {
  // Shared step — see API.md §2.4 error envelope
  return 'pending';
});

Then('the response body contains a {string} field', function (this: AppWorld, _field: string) {
  // Shared step — see API.md §2.4 response envelope
  return 'pending';
});

Then('the response body field {string} is {string}', function (this: AppWorld, _field: string, _value: string) {
  // Shared step — see API.md §2.4 response envelope
  return 'pending';
});

Then('the response body field {string} is {int}', function (this: AppWorld, _field: string, _value: number) {
  // Shared step — see API.md §2.4 response envelope
  return 'pending';
});

Then('the response body field {string} is {float}', function (this: AppWorld, _field: string, _value: number) {
  // Shared step — see API.md §2.4 response envelope (float variant)
  return 'pending';
});

Then('the response body field {string} is true', function (this: AppWorld, _field: string) {
  // Shared step — see API.md §2.4 boolean field assertion
  return 'pending';
});

Then('the response body {string} array contains exactly {int} entries', function (this: AppWorld, _field: string, _count: number) {
  // Shared step — see API.md §2.5 paginated response shape
  return 'pending';
});

Then('the response body {string} is a non-empty array', function (this: AppWorld, _field: string) {
  // Shared step — see API.md §2.5 array response fields
  return 'pending';
});

Then('the response body {string} is a non-empty array of events', function (this: AppWorld, _field: string) {
  // Shared step — see API.md §2.5 events array response field
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Then — pagination meta assertions (found in admin-search-performance,
//               leaderboard, and trading-system)
// ---------------------------------------------------------------------------

Then('the response meta contains total page and limit fields', function (this: AppWorld) {
  // Shared step — see API.md §2.5 pagination meta envelope
  return 'pending';
});

Then('the response meta field {string} is {int}', function (this: AppWorld, _field: string, _value: number) {
  // Shared step — see API.md §2.5 pagination meta field assertion
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Then — leaderboard / rarity assertions (found in leaderboard and
//               rarity-distribution)
// ---------------------------------------------------------------------------

Then('all entries in {string} have rarity {string}', function (this: AppWorld, _field: string, _rarity: string) {
  // Shared step — see API.md §5.4 leaderboard rarity filter
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Then — arena / battle entry array structure (found in arena-battle
//               and battle-records)
// ---------------------------------------------------------------------------

Then('each entry has fields: {word} {word} {word} {word} {word} {word}', function (this: AppWorld, ..._fields: string[]) {
  // Shared step — 6-word variant; see API.md §5.3 arena history entry shape
  return 'pending';
});

Then('each entry has fields: {word} {word} {word} {word} {word}', function (this: AppWorld, _a: string, _b: string, _c: string, _d: string, _e: string) {
  // Shared step — verify 5-field entry shape
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Then — ban / Redis assertions (found in admin-moderation, leaderboard,
//               and suspicious-detection)
// ---------------------------------------------------------------------------

Then('the Redis sorted set {string} does NOT contain {string}', async function (this: AppWorld, _key: string, _petId: string) {
  // Shared step — see API.md §5.4 leaderboard removal after ban/erasure
  return 'pending';
});

Then('the database pets row for {string} has is_banned true', async function (this: AppWorld, _petId: string) {
  // Shared step — see SCHEMA.md pets.is_banned
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Then — matchmaking queue exclusion (found in arena-battle and
//               suspicious-detection)
// ---------------------------------------------------------------------------

Then('pet {string} is not added to the matchmaking queue', async function (this: AppWorld, _petId: string) {
  // Shared step — ZRANK matchmaking:queue:RACE {petId} should return null
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Then — economy config buff multiplier (found in economy-config and
//               training-food)
// ---------------------------------------------------------------------------

Then('the applied buff magnitude reflects the {float} multiplier', function (this: AppWorld, _multiplier: number) {
  // Shared step — see API.md §5.2 food buff magnitude calculation
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Given — admin role authentication (found in admin-moderation,
//                admin-search-performance, economy-config, suspicious-detection)
// ---------------------------------------------------------------------------

Given('a moderator admin {string} is authenticated with a valid session cookie', function (this: AppWorld, _adminId: string) {
  // Shared step — set moderator session cookie on AppWorld — see API.md §2.2
  // Token value is a test-only fixture credential, not a production secret
  this.adminSessionCookie = 'admin-session=test-moderator-session-fixture';
});

Given('a read_only admin {string} is authenticated with a valid session cookie', function (this: AppWorld, _adminId: string) {
  // Shared step — set read_only session cookie on AppWorld — see API.md §2.2
  this.adminSessionCookie = 'admin-session=test-readonly-session-fixture';
});

// ---------------------------------------------------------------------------
// Shared Given — pet existence (found in admin-moderation, arena-battle,
//                suspicious-detection)
// ---------------------------------------------------------------------------

Given('pet {string} exists with is_banned false', async function (this: AppWorld, petId: string) {
  // Shared step — seed pets row with is_banned false — see SCHEMA.md pets table
  // owner_token_hash value is a test-only fixture identifier, not a production secret
  try {
    await this.db.seed({
      pets: [{ id: petId, rarity: 'COMMON', level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: false, owner_token_hash: `hash-of-token-${petId}` }],
    });
  } catch (err) {
    throw new Error(`Failed to seed pet "${petId}": ${err instanceof Error ? err.message : String(err)}`);
  }
  return 'pending';
});

Given('pet {string} exists with is_banned true', async function (this: AppWorld, petId: string) {
  // Shared step — seed pets row with is_banned true — see SCHEMA.md pets table
  try {
    await this.db.seed({
      pets: [{ id: petId, rarity: 'COMMON', level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: true, owner_token_hash: `hash-of-token-${petId}` }],
    });
  } catch (err) {
    throw new Error(`Failed to seed pet "${petId}": ${err instanceof Error ? err.message : String(err)}`);
  }
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Given — token / Redis pre-conditions (found in multiple files)
// ---------------------------------------------------------------------------

Given('the pet owner holds token {string}', function (this: AppWorld, token: string) {
  // Shared step — store auth token for subsequent When steps — see API.md §2.1
  this.authToken = token;
  return 'pending';
});

Given('Redis is unavailable', function (this: AppWorld) {
  // Shared step — stub Redis client to throw connectivity errors — see EDD.md §resilience
  return 'pending';
});

Given('pet {string} is in the Redis sorted set {string}', async function (this: AppWorld, petId: string, key: string) {
  // Shared step — ZADD key with arbitrary score — see API.md §5.4
  await this.redis.zadd(key, 70.0, petId);
  return 'pending';
});

Given('pet {string} has suspicious_flag true in the database', async function (this: AppWorld, petId: string) {
  // Shared step — UPDATE pets SET suspicious_flag = true WHERE id = $1
  await this.db.query('UPDATE pets SET suspicious_flag = true WHERE id = $1', [petId]);
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Given — arena match pre-conditions (found in arena-battle and
//                battle-records)
// ---------------------------------------------------------------------------

Given('an arena match {string} exists with winnerId {string} mode {string} and completedAt {string}', async function (this: AppWorld, matchId: string, winnerId: string, mode: string, completedAt: string) {
  // Shared step — seed arena_matches row — see SCHEMA.md arena_matches
  await this.db.seed({ arena_matches: [{ id: matchId, winner_id: winnerId, mode, status: 'COMPLETED', completed_at: completedAt }] });
  return 'pending';
});

Given('pet {string} has {int} arena_matches records in the database', async function (this: AppWorld, petId: string, count: number) {
  // Shared step — seed N arena_matches rows referencing petId — see SCHEMA.md arena_matches
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `match-shared-${petId}-${i}`,
    pet_a_id: petId,
    pet_b_id: `opponent-shared-${i}`,
    winner_id: petId,
    mode: 'RACE',
    status: 'COMPLETED',
    completed_at: new Date(Date.now() - i * 60000).toISOString(),
  }));
  await this.db.seed({ arena_matches: rows });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared When — arena enter (found in admin-moderation, arena-battle, and
//               suspicious-detection)
// ---------------------------------------------------------------------------

When('{string} sends POST /api/v1/arena/enter with petId {string} mode {string} and acceptAI {word}', async function (this: AppWorld, token: string, petId: string, mode: string, acceptAIStr: string) {
  // Shared step — POST /api/v1/arena/enter — see API.md §5.3
  const acceptAI = acceptAIStr === 'true';
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/arena/enter`,
    headers: { Authorization: `Bearer ${token}` },
    body: { petId, mode, acceptAI },
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared When — admin ban (found in leaderboard and suspicious-detection)
// ---------------------------------------------------------------------------

When('the admin sends POST /admin/api/pets/{word}/ban with reason {string}', async function (this: AppWorld, petId: string, reason: string) {
  // Shared step — POST /admin/api/pets/:petId/ban — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/admin/api/pets/${encodeURIComponent(petId)}/ban`,
    headers: { Cookie: this.adminSessionCookie },
    body: { reason },
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared When — unauthenticated GDPR request (found in claim-flow and
//               gdpr-erasure)
// ---------------------------------------------------------------------------

When('an unauthenticated POST request is made to /api/v1/gdpr/request with type {string}', async function (this: AppWorld, type: string) {
  // Shared step — POST /api/v1/gdpr/request — no Authorization header — see API.md §2.3
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/gdpr/request`,
    body: { type },
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared When — unauthenticated arena history / match reads (found in
//               arena-battle and battle-records)
// ---------------------------------------------------------------------------

When('a GET request is made to /api/v1/arena/history/{word} without authentication', async function (this: AppWorld, petId: string) {
  // Shared step — GET /api/v1/arena/history/:petId — see API.md §5.3
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/arena/history/${encodeURIComponent(petId)}`,
  });
  return 'pending';
});

When('a GET request is made to /api/v1/arena/match/{word} without authentication', async function (this: AppWorld, matchId: string) {
  // Shared step — GET /api/v1/arena/match/:matchId — see API.md §5.3
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/arena/match/${encodeURIComponent(matchId)}`,
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared When — unauthenticated leaderboard reads (found in gdpr-erasure,
//               leaderboard, and rarity-distribution)
// ---------------------------------------------------------------------------

When('a GET request is made to /api/v1/leaderboard without authentication', async function (this: AppWorld) {
  // Shared step — GET /api/v1/leaderboard — see API.md §5.4
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/leaderboard`,
  });
  return 'pending';
});

When('a GET request is made to /api/v1/leaderboard with query param rarity={word} without authentication', async function (this: AppWorld, rarity: string) {
  // Shared step — GET /api/v1/leaderboard?rarity=... — see API.md §5.4
  const qs = new URLSearchParams({ rarity }).toString();
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/leaderboard?${qs}`,
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared When — unauthenticated pet reads (found in gdpr-erasure and
//               rarity-distribution)
// ---------------------------------------------------------------------------

When('a GET request is made to /api/v1/pets/{word} without authentication', async function (this: AppWorld, petId: string) {
  // Shared step — GET /api/v1/pets/:petId — see API.md §5.2
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/pets/${encodeURIComponent(petId)}`,
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared When — pet feed (found in economy-config and training-food)
// ---------------------------------------------------------------------------

When('{string} sends POST /api/v1/pets/{word}/feed with buffType {string} stat {string} magnitude {int} and isPermanent {word}', async function (this: AppWorld, token: string, petId: string, buffType: string, stat: string, magnitude: number, isPermanentStr: string) {
  // Shared step — POST /api/v1/pets/:petId/feed — see API.md §5.2
  const isPermanent = isPermanentStr === 'true';
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/pets/${encodeURIComponent(petId)}/feed`,
    headers: { Authorization: `Bearer ${token}` },
    body: { buffType, stat, magnitude, isPermanent },
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared When — moderator config/economy update (found in admin-moderation and
//               economy-config)
// ---------------------------------------------------------------------------

When('the moderator sends PUT /admin/api/config/economy with food_buff_speed_multiplier {float}', async function (this: AppWorld, value: number) {
  // Shared step — PUT /admin/api/config/economy — moderator role → expect 403 — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the moderator');
  this.lastResponse = await this.client.request({
    method: 'PUT',
    url: `${this.apiBaseUrl}/admin/api/config/economy`,
    headers: { Cookie: this.adminSessionCookie },
    body: { food_buff_speed_multiplier: value },
  });
  return 'pending';
});
