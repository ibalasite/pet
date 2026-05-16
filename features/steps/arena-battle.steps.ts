// features/steps/arena-battle.steps.ts
// Step definitions for features/arena-battle.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

// NOTE: 'the pet owner holds token {string}' → registered in shared.steps.ts
// NOTE: 'pet {string} exists with is_banned true' → registered in shared.steps.ts
// NOTE: 'an arena match {string} exists with winnerId {string} mode {string} and completedAt {string}' → registered in shared.steps.ts
// NOTE: 'pet {string} has {int} arena_matches records in the database' → registered in shared.steps.ts

Given('pet {string} with speed {int} strength {int} stamina {int} level {int} exists and is owned with token {string}', async function (this: AppWorld, petId: string, speed: number, strength: number, stamina: number, level: number, token: string) {
  // Seed pets row + owner token — see SCHEMA.md pets table
  await this.db.seed({
    pets: [{ id: petId, stat_speed: speed, stat_strength: strength, stat_stamina: stamina, level, owner_token_hash: `hash-of-${token}`, is_banned: false }],
  });
  return 'pending';
});

Given('pet {string} has {int} battles this hour in Redis key {string}', async function (this: AppWorld, _petId: string, count: number, redisKey: string) {
  // SET rl:arena:{pet_id} {count} — see API.md §3.1 arena rate limit
  await this.redis.set(redisKey, String(count), 3600);
  return 'pending';
});

Given('pet {string} has 0 battles this hour in Redis key {string}', async function (this: AppWorld, _petId: string, redisKey: string) {
  // Ensure counter is absent or zero
  await this.redis.del(redisKey);
  return 'pending';
});

Given('no other pet is in the matchmaking queue for mode {string}', async function (this: AppWorld, mode: string) {
  // Ensure matchmaking:{mode}:queue sorted set is empty
  await this.redis.del(`matchmaking:queue:${mode}`);
  return 'pending';
});

Given('the pet {string} is banned with is_banned true in the database', async function (this: AppWorld, petId: string) {
  // UPDATE pets SET is_banned = true WHERE id = petId
  await this.db.query('UPDATE pets SET is_banned = true WHERE id = $1', [petId]);
  return 'pending';
});

Given('the battle engine is seeded with fixed random_seed {int}', function (this: AppWorld, _seed: number) {
  // Inject fixed seed into battle engine context
  return 'pending';
});

Given('an arena match {string} exists with winnerId {string} and mode {string}', async function (this: AppWorld, matchId: string, winnerId: string, mode: string) {
  // Seed arena_matches row — see SCHEMA.md arena_matches table
  await this.db.seed({ arena_matches: [{ id: matchId, winner_id: winnerId, mode, status: 'COMPLETED' }] });
  return 'pending';
});

Given('both pets have {int} battles this hour', async function (this: AppWorld, _count: number) {
  return 'pending';
});

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

// NOTE: '{string} sends POST /api/v1/arena/enter with petId {string} mode {string} and acceptAI {word}' → registered in shared.steps.ts
// NOTE: 'a GET request is made to /api/v1/arena/match/{string} without authentication' → registered in shared.steps.ts
// NOTE: 'a GET request is made to /api/v1/arena/history/{string} without authentication' → registered in shared.steps.ts

When('battle outcome is calculated for {string} vs {string} in mode {string} twice', function (this: AppWorld, _petA: string, _petB: string, _mode: string) {
  // Calculate battle twice using same seed — see API.md §5.3 arena/enter
  return 'pending';
});

When('an unauthenticated POST request is made to \\/api\\/v1\\/arena\\/enter with petId {string} mode {string}', async function (this: AppWorld, petId: string, mode: string) {
  // POST /api/v1/arena/enter — no Authorization header — see API.md §2.3
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/arena/enter`,
    body: { petId, mode, acceptAI: false },
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

// NOTE: Then('the response body {string} array contains exactly {int} entries') — registered in shared.steps.ts
// NOTE: Then('each entry has fields: {word} {word} {word} {word} {word} {word}') — registered in shared.steps.ts
// NOTE: Then('the response body {string} is a non-empty array of events') — registered in shared.steps.ts
// NOTE: Then('pet {string} is not added to the matchmaking queue') — registered in shared.steps.ts
// NOTE: Then('the response body field {string} is true') — registered in shared.steps.ts

Then('the response for {string} has status {int}', function (this: AppWorld, _petId: string, _status: number) {
  return 'pending';
});

Then('the database table arena_matches has a row with both {string} and {string} and mode {string}', async function (this: AppWorld, petA: string, petB: string, mode: string) {
  // SELECT id FROM arena_matches WHERE (pet_a_id IN ($1,$2) OR pet_b_id IN ($1,$2)) AND mode=$3
  const rows = await this.db.query<{ id: string }>(
    'SELECT id FROM arena_matches WHERE (pet_a_id = $1 OR pet_b_id = $1 OR pet_a_id = $2 OR pet_b_id = $2) AND mode = $3',
    [petA, petB, mode],
  );
  return 'pending';
  void rows;
});

Then('the Redis leaderboard key {string} is updated within {int} seconds', async function (this: AppWorld, _key: string, _seconds: number) {
  // ZRANK leaderboard:global {petId} — see API.md §5.4
  return 'pending';
});

Then('the database table arena_matches has a row with {string} and is_ai_opponent true', async function (this: AppWorld, _petId: string) {
  return 'pending';
});

Then('the Redis counter {string} is NOT incremented', async function (this: AppWorld, key: string) {
  // GET {key} from Redis — expect count did not change
  const val = await this.redis.get(key);
  return 'pending';
  void val;
});

Then('the response body {string} is {string} or {string}', function (this: AppWorld, _field: string, _val1: string, _val2: string) {
  return 'pending';
});

Then('both calculations return the same winnerId', function (this: AppWorld) {
  return 'pending';
});

Then('both battleLog event sequences are identical', function (this: AppWorld) {
  return 'pending';
});

Then('the database arena_matches row has mode {string}', async function (this: AppWorld, _mode: string) {
  return 'pending';
});

Then('the battle record winnerId is {string} reflecting the higher strength stat', function (this: AppWorld, _petId: string) {
  return 'pending';
});
