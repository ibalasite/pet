// ⚠️ Auto-generated step definition stub by gendoc-align-fix gencode
import { Given, When, Then } from '@cucumber/cucumber';

Given('a player has {int} public battle records', function (_count: number) {
  return 'pending';
});

When('the player requests GET \\/api\\/v1\\/arena\\/history\\/:petId', function () {
  return 'pending';
});

Then('the API returns the {int} most recent battles', function (_count: number) {
  return 'pending';
});

Then('the response includes a pagination cursor for the next batch', function () {
  return 'pending';
});

Then('each battle record includes: match_id, opponent_pet_id, result (WIN\\/LOSS), reward, timestamp', function () {
  return 'pending';
});

Then('the response structure includes meta.total = {int} and meta.hasMore = true', function (_total: number) {
  return 'pending';
});

Then('the API returns all {int} records', function (_count: number) {
  return 'pending';
});

Then('the response indicates {string} or no pagination cursor', function (_message: string) {
  return 'pending';
});

Then('total_count = {int}', function (_count: number) {
  return 'pending';
});

Given('a player has {int} battle records', function (_count: number) {
  return 'pending';
});

Given('the first page returned {int} records with pagination_cursor = {string}', function (_count: number, _cursor: string) {
  return 'pending';
});

When('the client requests GET \\/api\\/v1\\/arena\\/history\\/:petId?cursor={string}', function (_cursor: string) {
  return 'pending';
});

Then('the API returns battles {int}-{int} (next {int} records)', function (_from: number, _to: number, _count: number) {
  return 'pending';
});

Then('a new pagination_cursor is provided for the next batch', function () {
  return 'pending';
});

Then('the response includes meta.hasMore = true', function () {
  return 'pending';
});

Given('a battle was fought between Pet A (Rare, {int} wins) and Pet B (Common, {int} wins)', function (_winsA: number, _winsB: number) {
  return 'pending';
});

When('the battle record page is rendered as a social share link', function () {
  return 'pending';
});

Then('the meta tags include:', function (_table: unknown) {
  return 'pending';
});

Then('all OG URLs are absolute and properly encoded', function () {
  return 'pending';
});

Then('og:image points to a valid image URL with correct dimensions (1200x630 recommended)', function () {
  return 'pending';
});

Given('a battle record from GET \\/api\\/v1\\/arena\\/history\\/:petId', function () {
  return 'pending';
});

When('the response is parsed', function () {
  return 'pending';
});

Then('each battle record contains:', function (_table: unknown) {
  return 'pending';
});

Then('no sensitive fields (opponent owner email) are exposed', function () {
  return 'pending';
});

Given('a battle record for a pet with public_battles = true', function () {
  return 'pending';
});

When('GET \\/api\\/v1\\/arena\\/history\\/:petId is called WITHOUT Authorization header', function () {
  return 'pending';
});

Then('HTTP {int} is returned', function (_status: number) {
  return 'pending';
});

Then('the battle records are visible to any visitor', function () {
  return 'pending';
});

Then('no authentication is required', function () {
  return 'pending';
});

Given('a battle record where opponent is an AI-generated pet', function () {
  return 'pending';
});

When('GET \\/api\\/v1\\/arena\\/history\\/:petId is called', function () {
  return 'pending';
});

Then('the response includes is_ai_opponent = true', function () {
  return 'pending';
});

Then('opponent_pet_id is NULL or omitted for AI battles', function () {
  return 'pending';
});

Then('opponent_name indicates AI status (e.g., {string} or {string})', function (_nameA: string, _nameB: string) {
  return 'pending';
});
