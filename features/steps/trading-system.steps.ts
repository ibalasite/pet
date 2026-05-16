// features/steps/trading-system.steps.ts
// Step definitions for features/trading-system.feature
import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world';

// ---------------------------------------------------------------------------
// Given — pre-conditions
// ---------------------------------------------------------------------------

Given('the feature flag FF_MARKETPLACE is enabled', async function (this: AppWorld) {
  // UPDATE feature_flags SET enabled = true WHERE key = 'FF_MARKETPLACE' — see EDD.md §feature-flags
  await this.db.query('UPDATE feature_flags SET enabled = true WHERE key = $1', ['FF_MARKETPLACE']);
});

Given('the feature flag FF_MARKETPLACE is disabled', async function (this: AppWorld) {
  // UPDATE feature_flags SET enabled = false WHERE key = 'FF_MARKETPLACE'
  await this.db.query('UPDATE feature_flags SET enabled = false WHERE key = $1', ['FF_MARKETPLACE']);
});

Given('pet {string} with level {int} rarity {string} exists and is owned with token {string}', async function (this: AppWorld, petId: string, level: number, rarity: string, token: string) {
  // Seed pets row with owner token — see SCHEMA.md pets table
  await this.db.seed({
    pets: [{ id: petId, rarity, level, stat_speed: 20, stat_strength: 20, stat_stamina: 20, is_banned: false, owner_token_hash: `hash-of-${token}` }],
  });
});

Given('the minimum price for {string} is {int} based on level {int} and rarity multiplier {int}', function (this: AppWorld, _petId: string, _minPrice: number, _level: number, _rarityMult: number) {
  // Minimum price formula is enforced by the API — no seeding required
  return 'pending';
});

Given('the minimum price for {string} is {int}', function (this: AppWorld, _petId: string, _minPrice: number) {
  // Minimum price is computed server-side — no seeding required
  return 'pending';
});

Given('pet {string} was purchased from marketplace {int} days ago by the current owner', async function (this: AppWorld, petId: string, daysAgo: number) {
  // Seed marketplace_transactions row with completed_at in the past — anti-flip check
  await this.db.seed({
    marketplace_transactions: [{
      id: `tx-antiflip-${petId}`,
      listing_id: `listing-antiflip-${petId}`,
      buyer_token_hash: `hash-of-token-seller`,
      seller_token_hash: `hash-of-prev-seller`,
      pet_id: petId,
      price_credits: 1500,
      fee_credits: 75,
      completed_at: new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString(),
    }],
  });
});

Given('an active listing {string} for {string} at price {int}', async function (this: AppWorld, listingId: string, petId: string, price: number) {
  // Seed marketplace_listings row with status 'active' — see SCHEMA.md marketplace_listings
  await this.db.seed({
    marketplace_listings: [{
      id: listingId,
      pet_id: petId,
      seller_token_hash: `hash-of-token-seller`,
      price_credits: price,
      status: 'active',
      created_at: new Date().toISOString(),
    }],
  });
  this.listingId = listingId;
});

Given('an active listing {string} for {string}', async function (this: AppWorld, listingId: string, petId: string) {
  // Seed marketplace_listings row with default price — cancel/ownership scenarios
  await this.db.seed({
    marketplace_listings: [{
      id: listingId,
      pet_id: petId,
      seller_token_hash: `hash-of-token-seller`,
      price_credits: 1500,
      status: 'active',
      created_at: new Date().toISOString(),
    }],
  });
  this.listingId = listingId;
});

Given('{int} active marketplace_listings rows exist in the database', async function (this: AppWorld, count: number) {
  // Seed N active listings — browse public scenario
  const rows = Array.from({ length: count }, (_, i) => ({
    id: `listing-browse-${i}`,
    pet_id: `pet-browse-${i}`,
    seller_token_hash: `hash-of-seller-${i}`,
    price_credits: 1000 + i * 50,
    status: 'active',
    created_at: new Date(Date.now() - i * 60000).toISOString(),
  }));
  await this.db.seed({ marketplace_listings: rows });
});

Given('pet {string} has one marketplace_transactions record', async function (this: AppWorld, petId: string) {
  // Seed marketplace_transactions — trade history privacy scenario
  await this.db.seed({
    marketplace_transactions: [{
      id: `tx-history-${petId}`,
      listing_id: `listing-history-${petId}`,
      buyer_token_hash: `hash-of-token-seller`,
      seller_token_hash: `hash-of-prev-owner`,
      pet_id: petId,
      price_credits: 1500,
      fee_credits: 75,
      completed_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    }],
  });
});

// ---------------------------------------------------------------------------
// When — triggering actions
// ---------------------------------------------------------------------------

When('{string} sends POST \\/api\\/v1\\/marketplace\\/listings with petId {string} price {int} description {string}', async function (this: AppWorld, token: string, petId: string, price: number, description: string) {
  // POST /api/v1/marketplace/listings — see API.md §5.6
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/marketplace/listings`,
    headers: { Authorization: `Bearer ${token}` },
    body: { petId, price, description },
  });
});

When('{string} sends POST \\/api\\/v1\\/marketplace\\/listings\\/{string}\\/buy', async function (this: AppWorld, token: string, listingId: string) {
  // POST /api/v1/marketplace/listings/:listingId/buy — see API.md §5.6
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/marketplace/listings/${encodeURIComponent(listingId)}/buy`,
    headers: { Authorization: `Bearer ${token}` },
  });
});

When('{string} sends DELETE \\/api\\/v1\\/marketplace\\/listings\\/{string}', async function (this: AppWorld, token: string, listingId: string) {
  // DELETE /api/v1/marketplace/listings/:listingId — see API.md §5.6
  this.lastResponse = await this.client.request({
    method: 'DELETE',
    url: `${this.apiBaseUrl}/api/v1/marketplace/listings/${encodeURIComponent(listingId)}`,
    headers: { Authorization: `Bearer ${token}` },
  });
});

When('an unauthenticated POST request is made to \\/api\\/v1\\/marketplace\\/listings\\/{string}\\/buy', async function (this: AppWorld, listingId: string) {
  // POST /api/v1/marketplace/listings/:listingId/buy — no Authorization header — see API.md §2.3
  this.lastResponse = await this.client.request({
    method: 'POST',
    url: `${this.apiBaseUrl}/api/v1/marketplace/listings/${encodeURIComponent(listingId)}/buy`,
  });
});

When('a GET request is made to \\/api\\/v1\\/marketplace\\/listings with page {int} and limit {int} without authentication', async function (this: AppWorld, page: number, limit: number) {
  // GET /api/v1/marketplace/listings — public browse — see API.md §5.6
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/marketplace/listings?${qs}`,
  });
});

When('a GET request is made to \\/api\\/v1\\/marketplace\\/history\\/{string} without authentication', async function (this: AppWorld, petId: string) {
  // GET /api/v1/marketplace/history/:petId — unauthenticated → expect 401 — see API.md §5.6
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/marketplace/history/${encodeURIComponent(petId)}`,
  });
});

When('{string} sends GET \\/api\\/v1\\/marketplace\\/history\\/{string}', async function (this: AppWorld, token: string, petId: string) {
  // GET /api/v1/marketplace/history/:petId — authenticated owner — see API.md §5.6
  this.lastResponse = await this.client.request({
    method: 'GET',
    url: `${this.apiBaseUrl}/api/v1/marketplace/history/${encodeURIComponent(petId)}`,
    headers: { Authorization: `Bearer ${token}` },
  });
});

// ---------------------------------------------------------------------------
// Then — observable business results
// ---------------------------------------------------------------------------

// NOTE: Then('the response status is {int}') — registered in shared.steps.ts
// NOTE: Then('the response body error code is {string}') — registered in shared.steps.ts
// NOTE: Then('the response body contains a {string} field') — registered in shared.steps.ts
// NOTE: Then('the response body field {string} is {string}') — registered in shared.steps.ts
// NOTE: Then('the response body field {string} is {int}') — registered in shared.steps.ts

Then('the database marketplace_listings has a row for {string} with status {string}', function (this: AppWorld, _petId: string, _status: string) {
  // TODO: query SELECT status FROM marketplace_listings WHERE pet_id = $1 AND status = $2
  return 'pending';
});

Then('the database marketplace_listings row for {string} has status {string}', function (this: AppWorld, _listingId: string, _status: string) {
  // TODO: query SELECT status FROM marketplace_listings WHERE id = $1
  // TODO: assert result[0].status === _status
  return 'pending';
});

Then('the database marketplace_listings row for {string} still has status {string}', function (this: AppWorld, _listingId: string, _status: string) {
  // TODO: query SELECT status FROM marketplace_listings WHERE id = $1
  // TODO: assert result[0].status === _status (unchanged)
  return 'pending';
});

Then('the database pets row for {string} has owner_token_hash matching {string}', function (this: AppWorld, _petId: string, _token: string) {
  // TODO: query SELECT owner_token_hash FROM pets WHERE id = $1
  // TODO: assert result[0].owner_token_hash === hash-of-_token
  return 'pending';
});

Then('the database marketplace_transactions has a row with transactionId and price {int} and platformFee {int}', function (this: AppWorld, _price: number, _fee: number) {
  // TODO: query SELECT * FROM marketplace_transactions WHERE price_credits = $1 AND fee_credits = $2
  return 'pending';
});

Then('no marketplace_listings row is created', function (this: AppWorld) {
  // TODO: query SELECT COUNT(*) FROM marketplace_listings — assert count unchanged
  return 'pending';
});

// NOTE: Then('the response body {string} array contains exactly {int} entries') — registered in shared.steps.ts

// NOTE: 'the response meta field {string} is {int}' → registered in shared.steps.ts

// NOTE: Then('the response body {string} is a non-empty array') — registered in shared.steps.ts
