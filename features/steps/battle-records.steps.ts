// features/steps/battle-records.steps.ts
// Step definitions for features/battle-records.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

Given('pet {string} with rarity {string} and petName {string} exists in the database', async function (this: AppWorld, petId: string, rarity: string, _petName: string) {
  // Seed pets row — see SCHEMA.md pets table
  await this.db.seed({
    pets: [{ id: petId, rarity, stat_speed: 20, stat_strength: 20, stat_stamina: 20, level: 1, is_banned: false }],
  });
});

Given('pet {string} has {int} arena_matches records with mode {string} and mixed Win\\/Loss results', async function (this: AppWorld, petId: string, count: number, mode: string) {
  // Seed arena_matches rows referencing petId — see SCHEMA.md arena_matches table
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `match-rec-${petId}-${i}`,
    pet_a_id: petId,
    pet_b_id: `opponent-rec-${i}`,
    winner_id: i % 2 === 0 ? petId : `opponent-rec-${i}`,
    mode,
    status: 'COMPLETED',
    is_ai_opponent: false,
    completed_at: new Date(Date.now() - i * 60000).toISOString(),
  }));
  await this.db.seed({ arena_matches: rows });
});

Given('pet {string} has {int} arena_matches records', async function (this: AppWorld, petId: string, count: number) {
  // Seed N arena_matches rows — see SCHEMA.md arena_matches table
  await this.db.seed({
    pets: [{ id: petId, rarity: 'COMMON', stat_speed: 20, stat_strength: 20, stat_stamina: 20, level: 1, is_banned: false }],
  });
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `match-rec-${petId}-${i}`,
    pet_a_id: petId,
    pet_b_id: `opp-${i}`,
    winner_id: petId,
    mode: 'RACE',
    status: 'COMPLETED',
    is_ai_opponent: false,
    completed_at: new Date(Date.now() - i * 60000).toISOString(),
  }));
  await this.db.seed({ arena_matches: rows });
});

Given('pet {string} has {int} arena_matches records in the database', async function (this: AppWorld, petId: string, count: number) {
  // Seed arena_matches rows (alias, used by RECORD-001-03 with 25 matches)
  await this.db.seed({
    pets: [{ id: petId, rarity: 'EPIC', stat_speed: 20, stat_strength: 20, stat_stamina: 20, level: 1, is_banned: false }],
  });
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `match-rec2-${petId}-${i}`,
    pet_a_id: petId,
    pet_b_id: `opp2-${i}`,
    winner_id: petId,
    mode: 'RACE',
    status: 'COMPLETED',
    is_ai_opponent: false,
    completed_at: new Date(Date.now() - i * 60000).toISOString(),
  }));
  await this.db.seed({ arena_matches: rows });
});

Given('pet {string} has an arena_matches record where is_ai_opponent is true and opponent_pet_id is null', async function (this: AppWorld, petId: string) {
  // Seed an AI opponent match row — see SCHEMA.md arena_matches.is_ai_opponent
  await this.db.seed({
    arena_matches: [{
      id: `match-ai-${petId}`,
      pet_a_id: petId,
      pet_b_id: null,
      winner_id: petId,
      mode: 'RACE',
      status: 'COMPLETED',
      is_ai_opponent: true,
      completed_at: new Date().toISOString(),
    }],
  });
});

Given('an arena match {string} exists with winnerId {string} mode {string} and completedAt {string}', async function (this: AppWorld, matchId: string, winnerId: string, mode: string, completedAt: string) {
  // Seed arena_matches row for match record read — see SCHEMA.md arena_matches
  await this.db.seed({
    arena_matches: [{ id: matchId, winner_id: winnerId, mode, status: 'COMPLETED', completed_at: completedAt }],
  });
});

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

When('a GET request is made to \\/api\\/v1\\/arena\\/history\\/{string} without authentication', async function (this: AppWorld, petId: string) {
  // GET /api/v1/arena/history/:petId — see API.md §5.3
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/arena/history/${encodeURIComponent(petId)}`,
  });
});

When('a GET request is made to \\/api\\/v1\\/arena\\/match\\/{string} without authentication', async function (this: AppWorld, matchId: string) {
  // GET /api/v1/arena/match/:matchId — see API.md §5.3
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/arena/match/${encodeURIComponent(matchId)}`,
  });
});

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

Then('the response body {string} array contains exactly {int} entries', function (this: AppWorld, _field: string, _count: number) {
  return 'pending';
});

Then('each entry has fields: {word} {word} {word} {word} {word} {word}', function (this: AppWorld, ..._fields: string[]) {
  return 'pending';
});

Then('the response body {string} contains wins losses and winRate fields', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('at least one entry in the {string} array has isAiOpponent true and opponentPetId null', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('the response body field {string} is {string}', function (this: AppWorld, _field: string, _value: string) {
  return 'pending';
});

Then('the response body {string} is a non-empty array of events', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('the response status is {int}', function (this: AppWorld, _status: number) {
  return 'pending';
});

Then('the response body error code is {string}', function (this: AppWorld, _code: string) {
  return 'pending';
});
