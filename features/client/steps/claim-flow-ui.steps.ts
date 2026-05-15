// ⚠️ Auto-generated step definition stub by gendoc-align-fix gencode
import { Given, When, Then } from '@cucumber/cucumber';
import type { ClientWorld } from '../support/world';

Given('the user has navigated to the ClaimPage at {string}', async function(this: ClientWorld, _path: string) {
  return 'pending';
});

Given('the ClaimFlow compound component is showing step {string} (step 1 of email_claim_flow_steps_max = 3)', async function(this: ClientWorld, _step: string) {
  return 'pending';
});

Given('the ClaimEmailForm shows an email input field and an age confirmation checkbox {string}', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Given('POST \\/api\\/v1\\/claim\\/request responds HTTP 200 with {string} and {string}', async function(this: ClientWorld, _field1: string, _field2: string) {
  return 'pending';
});

When('the guest enters a valid email {string}', async function(this: ClientWorld, _email: string) {
  return 'pending';
});

When('the guest checks the age confirmation checkbox', async function(this: ClientWorld) {
  return 'pending';
});

When('the guest clicks {string}', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('POST \\/api\\/v1\\/claim\\/request is called with body {string}', async function(this: ClientWorld, _body: string) {
  return 'pending';
});

Then('the Zustand claim slice stores the claimId', async function(this: ClientWorld) {
  return 'pending';
});

Then('the ClaimFlow advances to step {string} rendering the ClaimCodeForm', async function(this: ClientWorld, _step: string) {
  return 'pending';
});

Given('the ClaimEmailForm is visible', async function(this: ClientWorld) {
  return 'pending';
});

When('the guest enters a valid email but leaves the age confirmation checkbox unchecked', async function(this: ClientWorld) {
  return 'pending';
});

Then('POST \\/api\\/v1\\/claim\\/request is NOT called', async function(this: ClientWorld) {
  return 'pending';
});

Then('an inline error {string} is shown and the checkbox is re-highlighted', async function(this: ClientWorld, _message: string) {
  return 'pending';
});

Given('the pet being claimed already has an owner', async function(this: ClientWorld) {
  return 'pending';
});

Given('POST \\/api\\/v1\\/claim\\/request responds HTTP 400 with error code {string}', async function(this: ClientWorld, _errorCode: string) {
  return 'pending';
});

When('the guest submits the claim email form', async function(this: ClientWorld) {
  return 'pending';
});

Then('an inline error message {string} is shown on the ClaimEmailForm', async function(this: ClientWorld, _message: string) {
  return 'pending';
});

Then('the user remains on step {string}', async function(this: ClientWorld, _step: string) {
  return 'pending';
});

Given('the guest has already made (auth_rate_limit_claim_attempts_per_hour = 5) claim requests in the current hour', async function(this: ClientWorld) {
  return 'pending';
});

Given('POST \\/api\\/v1\\/claim\\/request responds HTTP 429 with a {string} header', async function(this: ClientWorld, _header: string) {
  return 'pending';
});

When('the guest submits another email claim request', async function(this: ClientWorld) {
  return 'pending';
});

Then('a cooldown banner is shown indicating the user must wait (claim_email_retry_cooldown_seconds = 60) seconds', async function(this: ClientWorld) {
  return 'pending';
});

Then('the email input and submit button are disabled during the cooldown', async function(this: ClientWorld) {
  return 'pending';
});

Given('the ClaimCodeForm is visible (step {string})', async function(this: ClientWorld, _step: string) {
  return 'pending';
});

Given('the OTP {string} is valid and was issued within (claim_code_expiry_minutes = 15) minutes', async function(this: ClientWorld, _otp: string) {
  return 'pending';
});

Given('POST \\/api\\/v1\\/claim\\/verify responds HTTP 200 with {string}, {string}, and {string}', async function(this: ClientWorld, _field1: string, _field2: string, _field3: string) {
  return 'pending';
});

When('the guest enters {string} in the (claim_code_digits = 6)-digit OTP input', async function(this: ClientWorld, _otp: string) {
  return 'pending';
});

When('the guest clicks {string}', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('POST \\/api\\/v1\\/claim\\/verify is called with body {string}', async function(this: ClientWorld, _body: string) {
  return 'pending';
});

Then('the pet_token key is written to localStorage', async function(this: ClientWorld) {
  return 'pending';
});

Then('the Zustand claim slice advances to step {string}', async function(this: ClientWorld, _step: string) {
  return 'pending';
});

Given('POST \\/api\\/v1\\/claim\\/verify responds HTTP 400 with error code {string}', async function(this: ClientWorld, _errorCode: string) {
  return 'pending';
});

When('the guest enters the wrong 6-digit code and clicks {string}', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('the OTP digit input boxes play a red shake animation', async function(this: ClientWorld) {
  return 'pending';
});

Then('an error message is displayed below the input', async function(this: ClientWorld) {
  return 'pending';
});

Then('the OTP inputs remain enabled for retry', async function(this: ClientWorld) {
  return 'pending';
});

Given('the ClaimCodeForm is visible and the OTP has expired after (claim_code_expiry_minutes = 15) minutes', async function(this: ClientWorld) {
  return 'pending';
});

When('the guest submits the expired code', async function(this: ClientWorld) {
  return 'pending';
});

Then('the error message {string} is shown', async function(this: ClientWorld, _message: string) {
  return 'pending';
});

Then('a {string} button is visible that re-initiates POST \\/api\\/v1\\/claim\\/request', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Given('the ClaimCodeForm is visible and (a11y_claim_code_warning_before_expiry_minutes = 2) minutes or fewer remain before OTP expiry', async function(this: ClientWorld) {
  return 'pending';
});

When('the OTP countdown timer ticks', async function(this: ClientWorld) {
  return 'pending';
});

Then('the ExpiryWarning renders with role={string} and aria-live={string}', async function(this: ClientWorld, _role: string, _live: string) {
  return 'pending';
});

Then('the warning text includes the remaining minutes as a countdown', async function(this: ClientWorld) {
  return 'pending';
});

Given('the guest has made (auth_rate_limit_code_entry_attempts_per_session = 10) failed OTP attempts in this session', async function(this: ClientWorld) {
  return 'pending';
});

Given('POST \\/api\\/v1\\/claim\\/verify responds HTTP 429 with error code {string}', async function(this: ClientWorld, _errorCode: string) {
  return 'pending';
});

When('the guest enters another OTP code and clicks {string}', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('all OTP digit inputs are disabled', async function(this: ClientWorld) {
  return 'pending';
});

Then('the submit button is disabled', async function(this: ClientWorld) {
  return 'pending';
});

Then('a Retry-After countdown is displayed and announced via aria-live={string}', async function(this: ClientWorld, _live: string) {
  return 'pending';
});

Given('the ClaimFlow is in step {string} and the petToken and petUrl have been received', async function(this: ClientWorld, _step: string) {
  return 'pending';
});

When('the URLReveal component renders', async function(this: ClientWorld) {
  return 'pending';
});

Then('the unique pet URL is displayed in a read-only field', async function(this: ClientWorld) {
  return 'pending';
});

Then('a {string} button is visible that copies the petUrl to the clipboard', async function(this: ClientWorld, _label: string) {
  return 'pending';
});

Then('the app automatically navigates to {string} after the token is stored in localStorage', async function(this: ClientWorld, _path: string) {
  return 'pending';
});
