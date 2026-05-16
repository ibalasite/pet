// features/steps/suspicious-detection.steps.ts
// Step definitions for features/suspicious-detection.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

// NOTE: 'a moderator admin {string} is authenticated with a valid session cookie' → registered in shared.steps.ts
// NOTE: 'pet {string} exists with is_banned false' → registered in shared.steps.ts
// NOTE: 'pet {string} exists with is_banned true' → registered in shared.steps.ts

Given('pet {string} has {int} arena_matches rows with completedAt within the last {int} minutes', async function (this: AppWorld, petId: string, count: number, windowMinutes: number) {
  // Seed N arena_matches rows within the rolling window — see SCHEMA.md arena_matches
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `match-susp-${petId}-${i}`,
    pet_a_id: petId,
    pet_b_id: `opp-susp-${i}`,
    winner_id: petId,
    mode: 'RACE',
    status: 'COMPLETED',
    is_ai_opponent: false,
    completed_at: new Date(Date.now() - (i * Math.floor((windowMinutes * 60 * 1000) / (count + 1)))).toISOString(),
  }));
  await this.db.seed({ arena_matches: rows });
});

Given('pet {string} has exactly {int} arena_matches rows with completedAt within the last {int} minutes', async function (this: AppWorld, petId: string, count: number, windowMinutes: number) {
  // Seed exactly N rows — boundary-condition variant of above
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `match-susp-exact-${petId}-${i}`,
    pet_a_id: petId,
    pet_b_id: `opp-susp-exact-${i}`,
    winner_id: petId,
    mode: 'RACE',
    status: 'COMPLETED',
    is_ai_opponent: false,
    completed_at: new Date(Date.now() - (i * Math.floor((windowMinutes * 60 * 1000) / (count + 1)))).toISOString(),
  }));
  await this.db.seed({ arena_matches: rows });
});

Given('pet {string} has {int} arena_matches rows all with completedAt older than {int} minutes', async function (this: AppWorld, petId: string, count: number, windowMinutes: number) {
  // Seed N rows outside the detection window — see EDD.md §bot-detection
  await this.db.seed({
    pets: [{ id: petId, rarity: 'COMMON', level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: false, suspicious_flag: false }],
  });
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `match-old-${petId}-${i}`,
    pet_a_id: petId,
    pet_b_id: `opp-old-${i}`,
    winner_id: petId,
    mode: 'RACE',
    status: 'COMPLETED',
    is_ai_opponent: false,
    completed_at: new Date(Date.now() - ((windowMinutes + 1 + i) * 60 * 1000)).toISOString(),
  }));
  await this.db.seed({ arena_matches: rows });
});

Given('pet {string} has {int} arena_matches rows in the last {int} minutes', async function (this: AppWorld, petId: string, count: number, windowMinutes: number) {
  // Seed rows within window — analytics event scenario variant
  await this.db.seed({
    pets: [{ id: petId, rarity: 'COMMON', level: 1, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: false, suspicious_flag: false }],
  });
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `match-ana-${petId}-${i}`,
    pet_a_id: petId,
    pet_b_id: `opp-ana-${i}`,
    winner_id: petId,
    mode: 'RACE',
    status: 'COMPLETED',
    is_ai_opponent: false,
    completed_at: new Date(Date.now() - (i * Math.floor((windowMinutes * 60 * 1000) / (count + 1)))).toISOString(),
  }));
  await this.db.seed({ arena_matches: rows });
});

// NOTE: 'pet {string} has suspicious_flag true in the database' → registered in shared.steps.ts
// NOTE: 'pet {string} is in the Redis sorted set {string}' → registered in shared.steps.ts
// NOTE: 'the pet owner holds token {string}' → registered in shared.steps.ts

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

When('the suspicious activity detection job runs', function (this: AppWorld) {
  // Trigger bot-detection background job — see EDD.md §bot-detection
  return 'pending';
});

When('the admin sends GET /admin/api/suspicious', async function (this: AppWorld) {
  // GET /admin/api/suspicious — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/admin/api/suspicious`,
    headers: { Cookie: this.adminSessionCookie },
  });
});

// NOTE: 'the admin sends POST /admin/api/pets/{string}/ban with reason {string}' → registered in shared.steps.ts
// NOTE: '{string} sends POST /api/v1/arena/enter with petId {string} mode {string} and acceptAI {word}' → registered in shared.steps.ts

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

// NOTE: Then('the response status is {int}') — registered in shared.steps.ts
// NOTE: Then('the response body error code is {string}') — registered in shared.steps.ts

Then('the database pets row for {string} has suspicious_flag set to true', async function (this: AppWorld, petId: string) {
  // SELECT suspicious_flag FROM pets WHERE id = $1 — expect true
  const _rows = await this.db.query<{ suspicious_flag: boolean }>('SELECT suspicious_flag FROM pets WHERE id = $1', [petId]);
  return 'pending';
});

Then('the database pets row for {string} does NOT have suspicious_flag set to true', async function (this: AppWorld, petId: string) {
  // SELECT suspicious_flag FROM pets WHERE id = $1 — expect false or null
  const _rows = await this.db.query<{ suspicious_flag: boolean }>('SELECT suspicious_flag FROM pets WHERE id = $1', [petId]);
  return 'pending';
});

Then('the database admin_audit_log has a row with action {string} and target_id {string}', async function (this: AppWorld, action: string, targetId: string) {
  // SELECT id FROM admin_audit_log WHERE action = $1 AND target_id = $2
  const _rows = await this.db.query<{ id: string }>(
    'SELECT id FROM admin_audit_log WHERE action = $1 AND target_id = $2',
    [action, targetId],
  );
  return 'pending';
});

Then('pet {string} is still able to enter arena battles (no automatic ban)', async function (this: AppWorld, petId: string) {
  // SELECT is_banned FROM pets WHERE id = $1 — expect false
  const _rows = await this.db.query<{ is_banned: boolean }>('SELECT is_banned FROM pets WHERE id = $1', [petId]);
  return 'pending';
});

Then('{string} appears in the response data with a SUSPICIOUS badge', function (this: AppWorld, _petId: string) {
  return 'pending';
});

// NOTE: 'the database pets row for {string} has is_banned true' → registered in shared.steps.ts
// NOTE: 'the Redis sorted set {string} does NOT contain {string}' → registered in shared.steps.ts

Then('the database admin_audit_log has a row with action {string} and admin_id {string} and reason containing {string}', async function (this: AppWorld, action: string, adminId: string, _reasonFragment: string) {
  // SELECT id FROM admin_audit_log WHERE action = $1 AND admin_id = $2 AND detail::text LIKE $3
  const _rows = await this.db.query<{ id: string }>(
    'SELECT id FROM admin_audit_log WHERE action = $1 AND admin_id = $2',
    [action, adminId],
  );
  return 'pending';
});

Then('a {string} analytics event is emitted with pet_id {string} and battles_in_window {int}', function (this: AppWorld, _eventName: string, _petId: string, _battles: number) {
  // Assert analytics event payload — implementation-specific event bus check
  return 'pending';
});

// NOTE: 'pet {string} is not added to the matchmaking queue' → registered in shared.steps.ts
