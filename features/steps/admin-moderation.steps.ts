// ⚠️ Auto-generated step definition stub by gendoc-align-fix gencode
import { Given, When, Then } from '@cucumber/cucumber';

Given('a pet with is_banned = false', function () {
  return 'pending';
});

Given('a moderator_alice with role = {string}', function (_role: string) {
  return 'pending';
});

When('POST \\/admin\\/api\\/pets\\/:petId\\/ban is called with reason = {string}', function (_reason: string) {
  return 'pending';
});

Then('the system returns HTTP {int}', function (_status: number) {
  return 'pending';
});

Then('pets.is_banned is updated to true', function () {
  return 'pending';
});

Then('pets.banned_at is set to current timestamp', function () {
  return 'pending';
});

Then('pets.banned_reason is stored (max 500 characters)', function () {
  return 'pending';
});

Then('an audit_log entry is created with:', function (_table: unknown) {
  return 'pending';
});

Given('a pet currently ranked 15th on the leaderboard', function () {
  return 'pending';
});

When('POST \\/admin\\/api\\/pets\\/:petId\\/ban is called', function () {
  return 'pending';
});

Then('within 5 minutes (leaderboard_ban_reflection_time_minutes):', function (_table: unknown) {
  return 'pending';
});

Given('a pet with is_banned = true', function () {
  return 'pending';
});

Given('the pet owner with a valid petToken', function () {
  return 'pending';
});

When('POST \\/api\\/v1\\/arena\\/enter is called with the banned pet\'s ID', function () {
  return 'pending';
});

Then('the system returns HTTP {int} with error code PET_BANNED', function (_status: number) {
  return 'pending';
});

Then('the matchmaking entry is NOT created', function () {
  return 'pending';
});

Then('error message is {string}', function (_message: string) {
  return 'pending';
});

Given('a pet with is_banned = true and a ban reason on file', function () {
  return 'pending';
});

When('POST \\/admin\\/api\\/pets\\/:petId\\/unban is called with reason = {string}', function (_reason: string) {
  return 'pending';
});

Then('pets.is_banned is updated to false', function () {
  return 'pending';
});

Then('pets.banned_reason is cleared (set to NULL)', function () {
  return 'pending';
});

Then('pets.banned_at is NOT reset (immutable for audit)', function () {
  return 'pending';
});

Then('an audit_log entry is created with action = {string}', function (_action: string) {
  return 'pending';
});

Given('a read_only admin user', function () {
  return 'pending';
});

When('POST \\/admin\\/api\\/pets\\/:petId\\/unban is called', function () {
  return 'pending';
});

Then('the system returns HTTP {int} with error code FORBIDDEN', function (_status: number) {
  return 'pending';
});

Then('the ban status is NOT changed', function () {
  return 'pending';
});

Given('a completed arena_match with matchId {string}', function (_matchId: string) {
  return 'pending';
});

Given('a moderator with role = {string}', function (_role: string) {
  return 'pending';
});

When('POST \\/admin\\/api\\/battles\\/:matchId\\/flag is called with reason = {string}', function (_reason: string) {
  return 'pending';
});

Then('arena_matches.is_flagged is updated to true', function () {
  return 'pending';
});

Then('arena_matches.flagged_at is set to current timestamp', function () {
  return 'pending';
});

Given('a flagged battle with is_flagged = true', function () {
  return 'pending';
});

When('DELETE \\/admin\\/api\\/battles\\/:matchId\\/flag is called with reason = {string}', function (_reason: string) {
  return 'pending';
});

Then('arena_matches.is_flagged is updated to false', function () {
  return 'pending';
});

Then('arena_matches.flagged_at is cleared (set to NULL)', function () {
  return 'pending';
});

Given('a battle to flag', function () {
  return 'pending';
});

When('POST \\/admin\\/api\\/battles\\/:matchId\\/flag is called', function () {
  return 'pending';
});

Then('the battle remains unflagged', function () {
  return 'pending';
});

Given('{int} flagged battles and {int} unflagged battles in the database', function (_flagged: number, _unflagged: number) {
  return 'pending';
});

When('GET \\/admin\\/api\\/battles?flagged=true is called', function () {
  return 'pending';
});

Then('the system returns HTTP {int} with:', function (_status: number, _table: unknown) {
  return 'pending';
});

Then('each battle includes: matchId, petAId, petBId, winnerId, is_flagged', function () {
  return 'pending';
});

Given('a moderator with a 600-character ban reason (exceeds 500-char limit)', function () {
  return 'pending';
});

Then('the system returns HTTP {int} with error code VALIDATION_ERROR', function (_status: number) {
  return 'pending';
});

Then('error message indicates {string}', function (_message: string) {
  return 'pending';
});

Then('no ban is applied', function () {
  return 'pending';
});

Given('a moderator performs: ban pet_A, flag battle_B, unban pet_C', function () {
  return 'pending';
});

When('GET \\/admin\\/api\\/audit?limit=10 is called', function () {
  return 'pending';
});

Then('at least 3 audit_log entries exist with:', function (_table: unknown) {
  return 'pending';
});
