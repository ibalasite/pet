// ⚠️ Auto-generated step definition stub by gendoc-align-fix gencode
import { Given, When, Then } from '@cucumber/cucumber';

Given('a Super Admin {string} is authenticated with role = {string}', function (_name: string, _role: string) {
  return 'pending';
});

Given('the admin portal session is active and within the 4-hour inactivity window', function () {
  return 'pending';
});

Given('the Game Economy Configuration module is open', function () {
  return 'pending';
});

When('the Super Admin submits PUT \\/admin\\/api\\/config\\/economy with payload:', function (_table: unknown) {
  return 'pending';
});

Then('the system returns HTTP {int}', function (_status: number) {
  return 'pending';
});

Then('the response includes the updated config_economy values', function () {
  return 'pending';
});

Then('each numeric value is validated against its allowed range:', function (_table: unknown) {
  return 'pending';
});

When('the Super Admin submits PUT \\/admin\\/api\\/config\\/economy with food_buff_speed_multiplier = {float}', function (_value: number) {
  return 'pending';
});

Then('the system returns HTTP {int} with error code VALIDATION_ERROR', function (_status: number) {
  return 'pending';
});

Then('error message indicates the allowed range {string}', function (_range: string) {
  return 'pending';
});

Then('no audit_log entry is created', function () {
  return 'pending';
});

Then('no config_economy row is updated', function () {
  return 'pending';
});

Given('a pending change of arena_entry_cost_credits from {int} to {int}', function (_oldVal: number, _newVal: number) {
  return 'pending';
});

When('the Super Admin requests POST \\/admin\\/api\\/config\\/economy\\/preview with the change set', function () {
  return 'pending';
});

Then('the system returns HTTP {int} with a preview payload showing:', function (_status: number, _table: unknown) {
  return 'pending';
});

Then('no value is persisted until POST \\/admin\\/api\\/config\\/economy\\/confirm is called with the preview token', function () {
  return 'pending';
});

Then('confirmation token expires after {int} minutes', function (_minutes: number) {
  return 'pending';
});

Given('the Super Admin saves a confirmed change setting arena_entry_cooldown_minutes = {int}', function (_minutes: number) {
  return 'pending';
});

When('the API server receives the next \\/api\\/v1\\/arena\\/enter request after {int} minutes (config_cache_refresh_max_minutes)', function (_minutes: number) {
  return 'pending';
});

Then('the new cooldown value is applied without any service restart', function () {
  return 'pending';
});

Then('subsequent rate-limit checks use the new {int}-minute cooldown', function (_minutes: number) {
  return 'pending';
});

Then('no in-flight battles are interrupted by the change', function () {
  return 'pending';
});

Given('the Super Admin {string} saves food_buff_strength_multiplier from {float} to {float}', function (_name: string, _oldVal: number, _newVal: number) {
  return 'pending';
});

When('GET \\/admin\\/api\\/audit?action=config.economy&limit=1 is called', function () {
  return 'pending';
});

Then('the most recent audit_log entry contains:', function (_table: unknown) {
  return 'pending';
});

Then('the audit row is append-only (no UPDATE or DELETE permitted)', function () {
  return 'pending';
});

Given('a moderator {string} with role = {string}', function (_name: string, _role: string) {
  return 'pending';
});

When('{string} calls PUT \\/admin\\/api\\/config\\/economy with any payload', function (_name: string) {
  return 'pending';
});

Then('the system returns HTTP {int} with error code FORBIDDEN', function (_status: number) {
  return 'pending';
});

Then('the existing config_economy values are unchanged', function () {
  return 'pending';
});

Then('an audit_log entry is created with action = {string} capturing the actor and attempted change', function (_action: string) {
  return 'pending';
});
