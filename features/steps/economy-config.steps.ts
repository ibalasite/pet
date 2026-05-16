// features/steps/economy-config.steps.ts
// Step definitions for features/economy-config.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

Given('a super_admin {string} is authenticated with a valid session cookie', function (this: AppWorld, _adminId: string) {
  // Set super_admin session cookie on AppWorld — see API.md §2.2
  // Token value is a test-only fixture credential, not a production secret
  this.adminSessionCookie = 'admin-session=test-super-admin-session-fixture';
});

Given('a moderator admin {string} is authenticated with a valid session cookie', function (this: AppWorld, _adminId: string) {
  // Set moderator session cookie on AppWorld — see API.md §2.2
  this.adminSessionCookie = 'admin-session=test-moderator-session-fixture';
});

Given('the database config_economy row has food_buff_speed_multiplier {float} and arena_entry_cooldown_minutes {int}', async function (this: AppWorld, multiplier: number, cooldown: number) {
  // Seed config_economy row — see SCHEMA.md config_economy
  await this.db.seed({
    config_economy: [{
      id: 'config-economy-singleton',
      food_buff_speed_multiplier: multiplier,
      food_buff_strength_multiplier: 1.0,
      arena_entry_cooldown_minutes: cooldown,
      trade_transaction_fee_percent: 5,
      updated_at: new Date().toISOString(),
    }],
  });
});

Given('the admin has updated food_buff_strength_multiplier to {float} successfully', async function (this: AppWorld, value: number) {
  // UPDATE config_economy SET food_buff_strength_multiplier = $1
  await this.db.query('UPDATE config_economy SET food_buff_strength_multiplier = $1 WHERE id = $2', [value, 'config-economy-singleton']);
});

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

When('the admin sends PUT \\/admin\\/api\\/config\\/runtime with max_battles_per_hour {int}', async function (this: AppWorld, value: number) {
  // PUT /admin/api/config/runtime — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  this.lastResponse = await this.client.request({
    method: 'PUT',
    url: `${this.apiBaseUrl}/admin/api/config/runtime`,
    headers: { Cookie: this.adminSessionCookie },
    body: { max_battles_per_hour: value },
  });
  return 'pending';
});

When('the admin sends PUT \\/admin\\/api\\/config\\/runtime with rarity weights summing to {int} percent', async function (this: AppWorld, _sumPercent: number) {
  // PUT /admin/api/config/runtime — invalid rarity weights — see API.md §5.5 error: VALIDATION_ERROR
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  this.lastResponse = await this.client.request({
    method: 'PUT',
    url: `${this.apiBaseUrl}/admin/api/config/runtime`,
    headers: { Cookie: this.adminSessionCookie },
    body: { rarity_weights: { COMMON: 60, RARE: 25, EPIC: 12, LEGENDARY: 2 } }, // sums to 99
  });
  return 'pending';
});

Then('the database config_runtime row has max_battles_per_hour {int}', function (this: AppWorld, _value: number) {
  // SELECT max_battles_per_hour FROM config_runtime — see SCHEMA.md config_runtime
  return 'pending';
});

Then('the database config_runtime row is unchanged', function (this: AppWorld) {
  // Assert config_runtime row values match pre-scenario state — see SCHEMA.md config_runtime
  return 'pending';
});

When('the admin sends PUT \\/admin\\/api\\/config\\/economy with food_buff_speed_multiplier {float}', async function (this: AppWorld, value: number) {
  // PUT /admin/api/config/economy — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  this.lastResponse = await this.client.request({
    method: 'PUT',
    url: `${this.apiBaseUrl}/admin/api/config/economy`,
    headers: { Cookie: this.adminSessionCookie },
    body: { food_buff_speed_multiplier: value },
  });
});

When('the admin sends PUT \\/admin\\/api\\/config\\/economy with food_buff_speed_multiplier {int}', async function (this: AppWorld, value: number) {
  // PUT /admin/api/config/economy — out-of-range integer variant — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  this.lastResponse = await this.client.request({
    method: 'PUT',
    url: `${this.apiBaseUrl}/admin/api/config/economy`,
    headers: { Cookie: this.adminSessionCookie },
    body: { food_buff_speed_multiplier: value },
  });
});

When('the admin sends PUT \\/admin\\/api\\/config\\/economy with arena_entry_cooldown_minutes {int}', async function (this: AppWorld, value: number) {
  // PUT /admin/api/config/economy — cooldown field — see API.md §5.5
  if (!this.adminSessionCookie) throw new Error('adminSessionCookie not set — ensure a Given step authenticates the admin');
  this.lastResponse = await this.client.request({
    method: 'PUT',
    url: `${this.apiBaseUrl}/admin/api/config/economy`,
    headers: { Cookie: this.adminSessionCookie },
    body: { arena_entry_cooldown_minutes: value },
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

When('an unauthenticated PUT request is made to \\/admin\\/api\\/config\\/economy with food_buff_speed_multiplier {float}', async function (this: AppWorld, value: number) {
  // PUT /admin/api/config/economy — no cookie — see API.md §2.3
  this.lastResponse = await this.client.request({
    method: 'PUT',
    url: `${this.apiBaseUrl}/admin/api/config/economy`,
    body: { food_buff_speed_multiplier: value },
  });
});

When('the config cache is refreshed', function (this: AppWorld) {
  // Trigger config cache refresh directly — see EDD.md §config-cache (no real-time wait)
  return 'pending';
});

When('{string} sends POST \\/api\\/v1\\/pets\\/{string}\\/feed with buffType {string} stat {string} magnitude {int} and isPermanent {word}', async function (this: AppWorld, token: string, petId: string, buffType: string, stat: string, magnitude: number, isPermanentStr: string) {
  // POST /api/v1/pets/:petId/feed — see API.md §5.2
  const isPermanent = isPermanentStr === 'true';
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/pets/${encodeURIComponent(petId)}/feed`,
    headers: { Authorization: `Bearer ${token}` },
    body: { buffType, stat, magnitude, isPermanent },
  });
});

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

// NOTE: Then('the response status is {int}') — registered in shared.steps.ts
// NOTE: Then('the response body error code is {string}') — registered in shared.steps.ts

Then('the response body field {string} is {float}', function (this: AppWorld, _field: string, _value: number) {
  return 'pending';
});

Then('the database config_economy row has food_buff_speed_multiplier {float}', function (this: AppWorld, _value: number) {
  // TODO: query SELECT food_buff_speed_multiplier FROM config_economy WHERE id = 'config-economy-singleton'
  // TODO: assert result[0].food_buff_speed_multiplier === _value
  return 'pending';
});

Then('the database config_economy row still has food_buff_speed_multiplier {float}', function (this: AppWorld, _value: number) {
  // TODO: query SELECT food_buff_speed_multiplier FROM config_economy WHERE id = 'config-economy-singleton'
  // TODO: assert result[0].food_buff_speed_multiplier === _value (value must be unchanged)
  return 'pending';
});

Then('the database config_economy row is unchanged', function (this: AppWorld) {
  // TODO: query SELECT * FROM config_economy WHERE id = 'config-economy-singleton'
  // TODO: assert all fields match the values seeded in the Background step
  return 'pending';
});

Then('the database admin_audit_log has a row with action {string} field {string} old_value {string} new_value {string} and admin_id {string}', function (this: AppWorld, _action: string, _field: string, _oldVal: string, _newVal: string, _adminId: string) {
  // TODO: query SELECT * FROM admin_audit_log WHERE action = $1 AND admin_id = $2
  // TODO: assert detail JSONB contains field, old_value, new_value
  return 'pending';
});

Then('the database admin_audit_log has a row with action {string} and admin_id {string} and old_value containing {string} and new_value containing {string}', function (this: AppWorld, _action: string, _adminId: string, _oldFragment: string, _newFragment: string) {
  // TODO: query SELECT * FROM admin_audit_log WHERE action = $1 AND admin_id = $2
  // TODO: assert detail::text ILIKE '%' || _oldFragment || '%' and '%' || _newFragment || '%'
  return 'pending';
});

Then('no new row is added to admin_audit_log for this attempt', function (this: AppWorld) {
  // TODO: snapshot COUNT(*) from admin_audit_log before the When step, compare after
  return 'pending';
});

Then('the applied buff magnitude reflects the {float} multiplier', function (this: AppWorld, _multiplier: number) {
  return 'pending';
});
