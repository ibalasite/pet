// ⚠️ Auto-generated step definition stub by gendoc-align-fix gencode
import { Given, When, Then } from '@cucumber/cucumber';

Given('FF_MARKETPLACE = false (feature disabled)', function () {
  return 'pending';
});

When('POST \\/api\\/v1\\/marketplace\\/listings is called with a valid petToken', function () {
  return 'pending';
});

Then('the system returns HTTP {int} with error code FEATURE_DISABLED', function (_status: number) {
  return 'pending';
});

Then('error message is {string}', function (_message: string) {
  return 'pending';
});

When('FF_MARKETPLACE is set to true', function () {
  return 'pending';
});

Then('the same request is resubmitted', function () {
  return 'pending';
});

Then('the system returns HTTP {int} with created listing', function (_status: number) {
  return 'pending';
});

Given('a pet owned by player A with petToken_A', function () {
  return 'pending';
});

Given('pet stats: level = {int}, rarity = {word}', function (_level: number, _rarity: string) {
  return 'pending';
});

Given('minimum price formula: (level × {int}) + (rarity_multiplier × {int}) = ({int} × {int}) + ({int} × {int}) = {int}', function (_lm: number, _rm: number, _l: number, _lm2: number, _r: number, _rm2: number, _total: number) {
  return 'pending';
});

When('POST \\/api\\/v1\\/marketplace\\/listings is called with price_credits = {int}', function (_price: number) {
  return 'pending';
});

Then('the system returns HTTP {int} with:', function (_status: number, _table: unknown) {
  return 'pending';
});

Then('marketplace_listings row is created in PostgreSQL', function () {
  return 'pending';
});

Given('a pet with minimum required price = {int} credits', function (_price: number) {
  return 'pending';
});

Then('the system returns HTTP {int} with error code VALIDATION_ERROR', function (_status: number) {
  return 'pending';
});

Then('error message indicates minimum price requirement', function () {
  return 'pending';
});

Then('no listing is created', function () {
  return 'pending';
});

Given('a pet sold in marketplace_transactions {int} days ago (within {int}-day anti-flip window)', function (_days: number, _window: number) {
  return 'pending';
});

Given('the same pet is owned by a new buyer (marketplace_trade_antiflip_protection_days = {int})', function (_days: number) {
  return 'pending';
});

// NOTE: 'error message is {string}' is already defined above (line 16) — no duplicate needed here

Then('no new listing is created', function () {
  return 'pending';
});

Given('an active listing with price_credits = {int} owned by seller_A', function (_price: number) {
  return 'pending';
});

Given('buyer_B with a valid petToken and sufficient credits', function () {
  return 'pending';
});

Given('platform fee = {int}% of price (trade_transaction_fee_percent = {int})', function (_pct: number, _pct2: number) {
  return 'pending';
});

When('POST \\/api\\/v1\\/marketplace\\/listings\\/:listingId\\/buy is called with buyer_B\'s token', function () {
  return 'pending';
});

Then('the system returns HTTP {int}', function (_status: number) {
  return 'pending';
});

Then('marketplace_transactions record is created with:', function (_table: unknown) {
  return 'pending';
});

Then('marketplace_listings.status is updated to {string}', function (_status: string) {
  return 'pending';
});

Then('marketplace_listings.completed_at is set', function () {
  return 'pending';
});

Then('seller_A receives {int} credits ({int} - {int} fee)', function (_net: number, _gross: number, _fee: number) {
  return 'pending';
});

Then('buyer_B receives ownership of the pet', function () {
  return 'pending';
});

Given('an active listing created by player_A', function () {
  return 'pending';
});

When('DELETE \\/api\\/v1\\/marketplace\\/listings\\/:listingId is called with player_A\'s petToken', function () {
  return 'pending';
});

Then('marketplace_listings.completed_at is set to NOW()', function () {
  return 'pending';
});

Then('the pet remains owned by player_A', function () {
  return 'pending';
});

Given('an active listing owned by player_A with listingId {string}', function (_listingId: string) {
  return 'pending';
});

Given('player_B with a different petToken', function () {
  return 'pending';
});

When('DELETE \\/api\\/v1\\/marketplace\\/listings\\/{string} is called with player_B\'s token', function (_listingId: string) {
  return 'pending';
});

Then('the system returns HTTP {int} with error code NOT_OWNER', function (_status: number) {
  return 'pending';
});

Then('the listing remains active', function () {
  return 'pending';
});

Given('an active listing', function () {
  return 'pending';
});

When('POST \\/api\\/v1\\/marketplace\\/listings\\/:listingId\\/buy is called WITHOUT authentication', function () {
  return 'pending';
});

Then('the system returns HTTP {int} with error code UNAUTHORIZED', function (_status: number) {
  return 'pending';
});

Then('the listing is not marked as sold', function () {
  return 'pending';
});

Given('{int} active marketplace listings with varying prices and rarities', function (_count: number) {
  return 'pending';
});

When('GET \\/api\\/v1\\/marketplace\\/listings?page={int}&limit={int}&sortBy=price&order=asc is called', function (_page: number, _limit: number) {
  return 'pending';
});

Then('listings are sorted by price ascending (lowest to highest)', function () {
  return 'pending';
});

Then('each listing includes pet summary: petId, rarity, level, owner name (masked)', function () {
  return 'pending';
});

Given('a pet with completed sale in marketplace_transactions', function () {
  return 'pending';
});

Given('the pet is now owned by a new buyer', function () {
  return 'pending';
});

When('GET \\/api\\/v1\\/marketplace\\/history\\/:petId is called without authentication', function () {
  return 'pending';
});

When('GET \\/api\\/v1\\/marketplace\\/history\\/:petId is called with current owner\'s petToken', function () {
  return 'pending';
});

Then('the system returns HTTP {int} with complete transaction history', function (_status: number) {
  return 'pending';
});

Then('includes: price_credits, fee_credits, seller_name (masked), completed_at', function () {
  return 'pending';
});

Then('transaction history is private to current owner only', function () {
  return 'pending';
});
