// ⚠️ Auto-generated step definition stub by gendoc-align-fix gencode
import { Given, When, Then } from '@cucumber/cucumber';
import type { ClientWorld } from '../support/world';

Given('the user is on the TrainingPage at {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('GET \\/api\\/v1\\/pets\\/:petId returns HTTP 200 with the pet\'s current stats', async function(this: ClientWorld) {
  return 'pending';
});

Given('the TrainingPage is showing three TrainingActionCard components labeled {string}, {string}, and {string}', async function(this: ClientWorld, _card1: string, _card2: string, _card3: string) {
  return 'pending';
});

Given('the {string} value is {int} (training_actions_per_day = 3)', async function(this: ClientWorld, _field: string, _value: number) {
  return 'pending';
});

Given('POST \\/api\\/v1\\/training responds HTTP 200 with {string}, {string}, and {string}', async function(this: ClientWorld, _field1: string, _field2: string, _field3: string) {
  return 'pending';
});

When('the owner clicks the {string} button on the {string} action card', async function(this: ClientWorld, _label: string, _card: string) {
  return 'pending';
});

Then('POST \\/api\\/v1\\/training is called with body {string}', async function(this: ClientWorld, _body: string) {
  return 'pending';
});

Then('the StatChangeIndicator component appears showing {string}', async function(this: ClientWorld, _text: string) {
  return 'pending';
});

Then('the StatChangeIndicator is visible for (training_stat_display_duration_seconds = 2) seconds then disappears', async function(this: ClientWorld) {
  return 'pending';
});

Then('the Speed StatBar in StatsPanel animates to the new speed value', async function(this: ClientWorld) {
  return 'pending';
});

Then('GET \\/api\\/v1\\/pets\\/:petId is re-fetched', async function(this: ClientWorld) {
  return 'pending';
});

Given('{string} is {int}', async function(this: ClientWorld, _field: string, _value: number) {
  return 'pending';
});

Then('the StatChangeIndicator shows {string} for (training_stat_display_duration_seconds = 2) seconds', async function(this: ClientWorld, _text: string) {
  return 'pending';
});

Then('the Strength StatBar animates to the updated value', async function(this: ClientWorld) {
  return 'pending';
});

Then('the StatChangeIndicator shows {string} for (training_stat_display_duration_seconds = 2) seconds', async function(this: ClientWorld, _text: string) {
  return 'pending';
});

Given('the owner has already used all (training_actions_per_day = 3) daily training actions', async function(this: ClientWorld) {
  return 'pending';
});

Given('GET \\/api\\/v1\\/pets\\/:petId responds HTTP 200 with {string}: {int}', async function(this: ClientWorld, _field: string, _value: number) {
  return 'pending';
});

When('the TrainingPage renders', async function(this: ClientWorld) {
  return 'pending';
});

Then('all three TrainingActionCard {string} buttons are disabled', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('the DailyResetTimer component is visible showing a countdown to UTC 00:00', async function(this: ClientWorld) {
  return 'pending';
});

Then('the DailyResetTimer has aria-live={string} and announces the remaining time throttled at 60-second intervals and at <= 5 minutes remaining', async function(this: ClientWorld, _live: string) {
  return 'pending';
});

Then('no {string} or exhaustion message is shown without also showing the DailyResetTimer', async function(this: ClientWorld, _message: string) {
  return 'pending';
});

Given('all (training_actions_per_day = 3) training actions were exhausted and the DailyResetTimer is showing', async function(this: ClientWorld) {
  return 'pending';
});

Given('GET \\/api\\/v1\\/pets\\/:petId responds HTTP 200 with {string}: {int}', async function(this: ClientWorld, _field: string, _value: number) {
  return 'pending';
});

When('the UTC clock reaches 00:00', async function(this: ClientWorld) {
  return 'pending';
});

Then('the three TrainingActionCard {string} buttons become enabled again', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('the DailyResetTimer component disappears from the page', async function(this: ClientWorld) {
  return 'pending';
});

Given("the pet's speed stat is already at (pet_stat_max = 100)", async function(this: ClientWorld) {
  return 'pending';
});

Given('POST \\/api\\/v1\\/training responds HTTP 400 with error code {string}', async function(this: ClientWorld, _errorCode: string) {
  return 'pending';
});

Then('a toast notification appears with message {string}', async function(this: ClientWorld, _message: string) {
  return 'pending';
});

Then('the {string} action card {string} button is disabled with a {string} indicator', async function(this: ClientWorld, _card: string, _btn: string, _indicator: string) {
  return 'pending';
});

Then('the {string} and {string} action card buttons remain enabled', async function(this: ClientWorld, _card1: string, _card2: string) {
  return 'pending';
});

Given('the TrainingPage is loaded with three action cards', async function(this: ClientWorld) {
  return 'pending';
});

When('the user navigates using the Tab key', async function(this: ClientWorld) {
  return 'pending';
});

Then('the focus order follows: {string} card → RUN Train button → {string} card → STRENGTH Train button → {string} card → STAMINA Train button', async function(this: ClientWorld, _card1: string, _card2: string, _card3: string) {
  return 'pending';
});

Then('each {string} button is activatable via Enter or Space', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Given('the owner is on the TrainingPage', async function(this: ClientWorld) {
  return 'pending';
});

Given('POST \\/api\\/v1\\/training responds HTTP 401', async function(this: ClientWorld) {
  return 'pending';
});

Then('the {string} key is removed from localStorage', async function(this: ClientWorld, _key: string) {
  return 'pending';
});

Then('the app navigates to {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('a pet with stat_speed = {int} and a valid petToken', async function(this: ClientWorld, _speed: number) {
  return 'pending';
});

Given('the pet has remaining training actions today (< 3 used)', async function(this: ClientWorld) {
  return 'pending';
});

When('POST \\/api\\/v1\\/training is called with trainingType = {string}', async function(this: ClientWorld, _trainingType: string) {
  return 'pending';
});

Then('the system returns HTTP 200', async function(this: ClientWorld) {
  return 'pending';
});

Then('stat_speed is incremented by a random integer in [1, 3]', async function(this: ClientWorld) {
  return 'pending';
});

Then('new stat_speed is between {int} and {int} inclusive', async function(this: ClientWorld, _min: number, _max: number) {
  return 'pending';
});

Then('a training_logs record is created with training_type, stat_delta, and stat_after values', async function(this: ClientWorld) {
  return 'pending';
});

Given('a pet with total_training_actions = {int} (current level = {int})', async function(this: ClientWorld, _actions: number, _level: number) {
  return 'pending';
});

When('a training action is submitted successfully', async function(this: ClientWorld) {
  return 'pending';
});

Then('total_training_actions is incremented to {int}', async function(this: ClientWorld, _total: number) {
  return 'pending';
});

Then('level calculation: FLOOR({int} / {int}) = {int} (no level change yet)', async function(this: ClientWorld, _actions: number, _divisor: number, _level: number) {
  return 'pending';
});

When('{int} more training actions are submitted successfully', async function(this: ClientWorld, _count: number) {
  return 'pending';
});

Then('total_training_actions = {int} and level = {int}', async function(this: ClientWorld, _total: number, _level: number) {
  return 'pending';
});

Given('a pet with is_banned = true and a valid petToken', async function(this: ClientWorld) {
  return 'pending';
});

When('POST \\/api\\/v1\\/training is called', async function(this: ClientWorld) {
  return 'pending';
});

Then('the system returns HTTP 403 with error code PET_BANNED', async function(this: ClientWorld) {
  return 'pending';
});

Then('no training is applied', async function(this: ClientWorld) {
  return 'pending';
});

Given('a pet that completed {int} training actions at 23:59 UTC', async function(this: ClientWorld, _count: number) {
  return 'pending';
});

When('the UTC day rolls over to 00:00 UTC', async function(this: ClientWorld) {
  return 'pending';
});

When('the same pet submits a new training request', async function(this: ClientWorld) {
  return 'pending';
});

Then('the request is accepted with actionsRemainingToday = {int}', async function(this: ClientWorld, _remaining: number) {
  return 'pending';
});

Then('the daily counter has reset', async function(this: ClientWorld) {
  return 'pending';
});
