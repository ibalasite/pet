// ⚠️ Auto-generated step definition stub by gendoc-align-fix gencode
import { Given, When, Then } from '@cucumber/cucumber';

Given('pet {string} has completed more than (bot_detection_battles_threshold = {int}) battles within the last (bot_detection_window_minutes = {int}) minutes', function (_token: string, _threshold: number, _window: number) {
  return 'pending';
});

When('the background detection job evaluates battle counts for all active pets', function () {
  return 'pending';
});

Then('pet {string} status is updated to {string} in the database', function (_token: string, _status: string) {
  return 'pending';
});

Then('a moderation alert is created in the admin review queue for {string}', function (_token: string) {
  return 'pending';
});

Then('no automatic ban is applied — the pet remains able to battle until a moderator acts', function () {
  return 'pending';
});

Given('a moderator is authenticated with a valid httpOnly SameSite=Strict admin session cookie', function () {
  return 'pending';
});

Given('pet {string} has status {string} in the moderation queue', function (_token: string, _status: string) {
  return 'pending';
});

When('the moderator submits a ban action via POST \\/admin\\/api\\/pets\\/{string}\\/ban with reason {string}', function (_token: string, _reason: string) {
  return 'pending';
});

Then('the reason text is fewer than (admin_moderation_reason_max_chars = {int}) characters', function (_maxChars: number) {
  return 'pending';
});

Then('the pet status is updated to {string} in the database', function (_status: string) {
  return 'pending';
});

Then('an entry is written to admin_audit_log with action {string}, admin_id, ip_address_hash, and the reason in the detail JSONB column', function (_action: string) {
  return 'pending';
});

Then('the server responds with HTTP {int}', function (_status: number) {
  return 'pending';
});

Given('pet {string} has status {string} in the database', function (_token: string, _status: string) {
  return 'pending';
});

When('{string} attempts to join the matchmaking queue via POST \\/api\\/v1\\/arena\\/enter', function (_token: string) {
  return 'pending';
});

// NOTE: 'the server responds with HTTP {int}' is already defined above — no duplicate needed here

Then('the response body contains error code {string}', function (_code: string) {
  return 'pending';
});

Then('{string} is not added to the Redis matchmaking sorted set', function (_token: string) {
  return 'pending';
});
