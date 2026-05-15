// ⚠️ Auto-generated step definition stub by gendoc-align-fix gencode
import { Given, When, Then } from '@cucumber/cucumber';

Given('pet {string} has used {int} training actions today', function (_token: string, _count: number) {
  return 'pending';
});

When('the owner submits a training request via POST \\/api\\/v1\\/training with body \\{ "training_type": "STRENGTH" \\} for {string}', function (_token: string) {
  return 'pending';
});

Then('the server increments the strength stat by a value between (training_stat_points_min = {int}) and (training_stat_points_max = {int}) points', function (_min: number, _max: number) {
  return 'pending';
});

Then('a training_logs row is written for {string} bringing today\'s training log count to {int}', function (_token: string, _count: number) {
  return 'pending';
});

When('the owner submits two more valid POST \\/api\\/v1\\/training requests for {string} on the same day', function (_token: string) {
  return 'pending';
});

Then('the count of training_logs rows today for {string} reaches (training_actions_per_day = {int})', function (_token: string, _count: number) {
  return 'pending';
});

When('the owner submits a fourth POST \\/api\\/v1\\/training request for {string} on the same day', function (_token: string) {
  return 'pending';
});

Then('the server responds with HTTP {int} and error code {string}', function (_status: number, _code: string) {
  return 'pending';
});

Given('pet {string} has a stat triplet (speed={int}, strength={int}, stamina={int}) summing to {int} stat points', function (_token: string, _speed: number, _strength: number, _stamina: number, _sum: number) {
  return 'pending';
});

When('the level computation runs for {string}', function (_token: string) {
  return 'pending';
});

Then('pet.level equals FLOOR({int} \\/ (pet_level_formula_divisor = {int})) = {int}', function (_sum: number, _divisor: number, _level: number) {
  return 'pending';
});

When('pet {string} later reaches a stat sum of {int}', function (_token: string, _sum: number) {
  return 'pending';
});

Then('pet.level equals MIN(FLOOR({int} \\/ {int}), pet_level_max = {int}) = {int}', function (_sum: number, _divisor: number, _max: number, _level: number) {
  return 'pending';
});

Then('the level value never exceeds (pet_level_max = {int})', function (_max: number) {
  return 'pending';
});

Given('pet {string} has a base speed stat of {int}', function (_token: string, _speed: number) {
  return 'pending';
});

Given('a food buff of (food_buff_example_temp_amount_stat_points = {int}) speed points has been applied to {string} via POST \\/api\\/v1\\/food\\/apply with the food_buffs row recording expires_at (food_buff_example_temp_duration_hours = {int}) hours from now', function (_points: number, _token: string, _hours: number) {
  return 'pending';
});

When('a Race battle begins for {string} within the buff duration window', function (_token: string) {
  return 'pending';
});

Then('the battle engine reads {string} effective speed as {int} for the duration of that match', function (_token: string, _speed: number) {
  return 'pending';
});

Then('the opponent pet\'s stats are read without any buff modifier', function () {
  return 'pending';
});

When('(food_buff_example_temp_duration_hours = {int}) hours have elapsed since the buff was applied', function (_hours: number) {
  return 'pending';
});

Then('the food_buffs row for {string} has expired_at set to a non-null timestamp and {string} effective speed reverts to the base value of {int}', function (_token: string, _token2: string, _speed: number) {
  return 'pending';
});
