// features/steps/shared.steps.ts
// Shared step definitions reused across multiple feature step files.
// Each stub returns 'pending' — see API.md for endpoint contracts.
import { Given, Then } from '@cucumber/cucumber';
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

Then('the response body {string} array contains exactly {int} entries', function (this: AppWorld, _field: string, _count: number) {
  // Shared step — see API.md §2.5 paginated response shape
  return 'pending';
});

Then('the response body {string} is a non-empty array', function (this: AppWorld, _field: string) {
  // Shared step — see API.md §2.5 array response fields
  return 'pending';
});

// ---------------------------------------------------------------------------
// Shared Given — pet exists with is_banned false (found in admin-moderation and other files)
// ---------------------------------------------------------------------------

Given('{string} exists with is_banned false', async function (this: AppWorld, petId: string) {
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
