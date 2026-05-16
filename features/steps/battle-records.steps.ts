// features/steps/battle-records.steps.ts
// Step definitions for features/battle-records.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

Given('a pet {string} with battle history of {int} wins and {int} losses', async function (this: AppWorld, petId: string, wins: number, losses: number) {
  // Seed pet + arena_matches rows with mixed win/loss results — see SCHEMA.md arena_matches
  await this.db.seed({
    pets: [{ id: petId, rarity: 'RARE', stat_speed: 20, stat_strength: 20, stat_stamina: 20, level: 1, is_banned: false, pet_name: `Pet ${petId}`, sprite_ref: `sprite-${petId}.png` }],
  });
  const rows = [
    ...Array.from({ length: wins }, (_, i) => ({
      id: `match-og-win-${petId}-${i}`,
      pet_a_id: petId,
      pet_b_id: `opp-og-${i}`,
      winner_id: petId,
      mode: 'RACE',
      status: 'COMPLETED',
      is_ai_opponent: false,
      completed_at: new Date(Date.now() - i * 60000).toISOString(),
    })),
    ...Array.from({ length: losses }, (_, i) => ({
      id: `match-og-loss-${petId}-${i}`,
      pet_a_id: petId,
      pet_b_id: `opp-og-loss-${i}`,
      winner_id: `opp-og-loss-${i}`,
      mode: 'RACE',
      status: 'COMPLETED',
      is_ai_opponent: false,
      completed_at: new Date(Date.now() - (wins + i) * 60000).toISOString(),
    })),
  ];
  await this.db.seed({ arena_matches: rows });
  return 'pending';
});

When('a visitor requests the arena history for {string}', async function (this: AppWorld, petId: string) {
  // GET /api/v1/arena/history/:petId — see API.md §5.3
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/arena/history/${encodeURIComponent(petId)}`,
  });
  return 'pending';
});

Then('the response body "summary" contains wins losses and winRate', function (this: AppWorld) {
  // Assert response body summary object has wins, losses, winRate — see API.md §5.3
  return 'pending';
});

Then('the response body contains petName rarity and a sprite reference for social sharing', function (this: AppWorld) {
  // Assert response body top-level has petName, rarity, spriteRef fields for OG meta — see API.md §5.3
  return 'pending';
});

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

// NOTE: 'pet {string} has {int} arena_matches records in the database' → registered in shared.steps.ts

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

// NOTE: 'an arena match {string} exists with winnerId {string} mode {string} and completedAt {string}' → registered in shared.steps.ts

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

// NOTE: 'a GET request is made to /api/v1/arena/history/{string} without authentication' → registered in shared.steps.ts
// NOTE: 'a GET request is made to /api/v1/arena/match/{string} without authentication' → registered in shared.steps.ts

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

// NOTE: Then('the response body {string} array contains exactly {int} entries') — registered in shared.steps.ts

// NOTE: 'each entry has fields: {word} {word} {word} {word} {word} {word}' → registered in shared.steps.ts

Then('the response body {string} contains wins losses and winRate fields', function (this: AppWorld, _field: string) {
  return 'pending';
});

Then('at least one entry in the {string} array has isAiOpponent true and opponentPetId null', function (this: AppWorld, _field: string) {
  return 'pending';
});

// NOTE: 'the response body field {string} is {string}' → registered in shared.steps.ts
// NOTE: 'the response body {string} is a non-empty array of events' → registered in shared.steps.ts

// NOTE: Then('the response status is {int}') — registered in shared.steps.ts
// NOTE: Then('the response body error code is {string}') — registered in shared.steps.ts
