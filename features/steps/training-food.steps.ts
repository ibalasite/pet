// features/steps/training-food.steps.ts
// Step definitions for features/training-food.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

Given('pet {string} has {int} training actions today', async function (this: AppWorld, petId: string, count: number) {
  // Seed training_logs rows for today — see SCHEMA.md training_logs table
  const today = new Date().toISOString().slice(0, 10);
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `training-log-${petId}-${i}`,
    pet_id: petId,
    training_type: 'RUN',
    stat_delta: 2,
    created_at: `${today}T10:0${i}:00Z`,
  }));
  if (rows.length > 0) {
    await this.db.seed({ training_logs: rows });
  }
  return 'pending';
});

Given('pet {string} has {int} training_logs rows for today in the database', async function (this: AppWorld, petId: string, count: number) {
  // Seed training_logs rows — POST /api/v1/pets/:petId/train state
  const today = new Date().toISOString().slice(0, 10);
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `tl-${petId}-${i}`,
    pet_id: petId,
    training_type: i % 3 === 0 ? 'RUN' : i % 3 === 1 ? 'STRENGTH' : 'STAMINA',
    stat_delta: 2,
    created_at: `${today}T09:0${i}:00Z`,
  }));
  if (rows.length > 0) {
    await this.db.seed({ training_logs: rows });
  }
  return 'pending';
});

Given('the database pets row for {string} has stat_speed {int}', async function (this: AppWorld, petId: string, value: number) {
  // UPDATE pets SET stat_speed = $1 WHERE id = $2 — see SCHEMA.md pets table
  await this.db.query('UPDATE pets SET stat_speed = $1 WHERE id = $2', [value, petId]);
  return 'pending';
});

Given('the database pets row for {string} has stat_strength {int}', async function (this: AppWorld, petId: string, value: number) {
  // UPDATE pets SET stat_strength = $1 WHERE id = $2
  await this.db.query('UPDATE pets SET stat_strength = $1 WHERE id = $2', [value, petId]);
  return 'pending';
});

Given('pet {string} has {int} active food_buffs rows in the database', async function (this: AppWorld, _petId: string, _count: number) {
  // State assertion — no active buff rows
  return 'pending';
});

Given('pet {string} has an active food_buffs row with stat {string} magnitude {int} expires_at {int} hours from now', async function (this: AppWorld, petId: string, stat: string, magnitude: number, hours: number) {
  // Seed food_buffs row with expires_at in the future — see SCHEMA.md food_buffs table
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  await this.db.seed({
    food_buffs: [{
      id: `buff-${petId}-${stat}`,
      pet_id: petId,
      stat,
      magnitude,
      is_permanent: false,
      expires_at: expiresAt,
    }],
  });
  return 'pending';
});

Given('pet {string} has base stat_speed {int}', async function (this: AppWorld, petId: string, speed: number) {
  await this.db.query('UPDATE pets SET stat_speed = $1 WHERE id = $2', [speed, petId]);
  return 'pending';
});

Given('pet {string} exists and is owned with token {string}', async function (this: AppWorld, petId: string, token: string) {
  // Seed pets row — generic owned pet
  await this.db.seed({
    pets: [{ id: petId, rarity: 'COMMON', stat_speed: 20, stat_strength: 20, stat_stamina: 20, level: 1, owner_token_hash: `hash-of-${token}`, is_banned: false }],
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

When('{string} sends POST /api/v1/pets/{word}/train with trainingType {string}', async function (this: AppWorld, token: string, petId: string, trainingType: string) {
  // POST /api/v1/pets/:petId/train — see API.md §5.2
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/pets/${petId}/train`,
    headers: { Authorization: `Bearer ${token}` },
    body: { trainingType },
  });
  return 'pending';
});

When('an unauthenticated POST request is made to /api/v1/pets/{word}/train with trainingType {string}', async function (this: AppWorld, petId: string, trainingType: string) {
  // POST /api/v1/pets/:petId/train — no Authorization header — see API.md §2.3
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/pets/${petId}/train`,
    body: { trainingType },
  });
  return 'pending';
});

// NOTE: '{string} sends POST /api/v1/pets/{string}/feed with buffType {string} stat {string} magnitude {int} and isPermanent {word}' → registered in shared.steps.ts

When('a GET request is made to /api/v1/pets/{word}/stats without authentication', async function (this: AppWorld, petId: string) {
  // GET /api/v1/pets/:petId/stats — see API.md §5.2
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/pets/${petId}/stats`,
  });
  return 'pending';
});

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

Then('the response body {string} is between {int} and {int}', function (this: AppWorld, _field: string, _min: number, _max: number) {
  return 'pending';
});

Then('the response body {string} is {int}', function (this: AppWorld, _field: string, _value: number) {
  return 'pending';
});

Then('the response body {string} is {word}', function (this: AppWorld, _field: string, _value: string) {
  return 'pending';
});

Then('the response body {string} is null', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('the response body {string} is a non-null ISO 8601 timestamp', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('the database pets row for {string} has stat_speed between {int} and {int}', async function (this: AppWorld, petId: string, min: number, max: number) {
  // SELECT stat_speed FROM pets WHERE id = $1
  const rows = await this.db.query<{ stat_speed: number }>('SELECT stat_speed FROM pets WHERE id = $1', [petId]);
  void rows; void min; void max;
  return 'pending';
});

Then('the database pets row for {string} has stat_strength incremented by {int}', async function (this: AppWorld, petId: string, _delta: number) {
  // SELECT stat_strength FROM pets WHERE id = $1
  const rows = await this.db.query<{ stat_strength: number }>('SELECT stat_strength FROM pets WHERE id = $1', [petId]);
  void rows;
  return 'pending';
});

Then('the database food_buffs row for {string} has expires_at set', async function (this: AppWorld, petId: string) {
  // SELECT expires_at FROM food_buffs WHERE pet_id = $1 AND expires_at IS NOT NULL
  const rows = await this.db.query('SELECT expires_at FROM food_buffs WHERE pet_id = $1 AND expires_at IS NOT NULL', [petId]);
  void rows;
  return 'pending';
});

Then('the database food_buffs table has no new row for {string}', async function (this: AppWorld, petId: string) {
  // SELECT COUNT(*) FROM food_buffs WHERE pet_id = $1
  const rows = await this.db.query('SELECT COUNT(*) FROM food_buffs WHERE pet_id = $1', [petId]);
  void rows;
  return 'pending';
});

Then('the response body {string} array contains one entry with stat {string} magnitude {int} and isPermanent false', function (this: AppWorld, _field: string, _stat: string, _magnitude: number) {
  return 'pending';
});

Then('the arena_matches row for the completed battle has a battleLog referencing effective speed {int} for {string}', async function (this: AppWorld, _effectiveSpeed: number, _petId: string) {
  // SELECT battle_log FROM arena_matches WHERE pet_a_id = $1 ORDER BY completed_at DESC LIMIT 1
  return 'pending';
});

Then('the response body {string} is greater than {int}', function (this: AppWorld, _field: string, _value: number) {
  return 'pending';
});

Then('the response body {string} contains speed strength stamina and level fields', function (this: AppWorld, _field: string) {
  return 'pending';
});

// NOTE: 'the applied buff magnitude reflects the {float} multiplier' → registered in shared.steps.ts
