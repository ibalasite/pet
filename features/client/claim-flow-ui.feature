Feature: Email Claim Flow UI — Two-Step OTP Flow in Player App (US-AUTH-001, US-AUTH-002)

  Background:
    Given the player app is loaded
    And the user has navigated to the ClaimPage at "/claim"
    And the ClaimFlow compound component renders in step "email" (step 1 of email_claim_flow_steps_max = 3)

  # --- Step 1: Email entry ---

  Scenario: Guest submits valid email and age confirmation — advances to OTP step
    Given the ClaimEmailForm shows an email input field and an age confirmation checkbox "I am at least 13 years old"
    When the guest enters a valid email "player@example.com"
    And the guest checks the age confirmation checkbox
    And the guest clicks "Send Claim Code"
    Then POST /api/v1/claim is called with body {"email": "player@example.com", "petId": "<petId>", "ageConfirmed": true}
    And the server responds HTTP 200 with "claimId" and "expiresAt"
    And the Zustand claim slice stores the claimId via setClaimId()
    And the ClaimFlow advances to step "code" rendering the ClaimCodeForm

  Scenario: Email form blocks submission without age confirmation
    Given the ClaimEmailForm is visible
    When the guest enters a valid email but leaves the age confirmation checkbox unchecked
    And the guest clicks "Send Claim Code"
    Then POST /api/v1/claim is NOT called
    And an inline error "Age confirmation required" is shown and the checkbox is re-highlighted

  Scenario: Already-claimed pet shows inline error
    Given the guest submits a claim for a pet that already has an owner
    And POST /api/v1/claim responds HTTP 400 with error code "ALREADY_CLAIMED"
    When the response is received
    Then an inline error message "This pet is already owned." is shown on the ClaimEmailForm
    And the user remains on step "email"

  Scenario: Email claim rate limit — cooldown banner shown
    Given the guest has already made (auth_rate_limit_claim_attempts_per_hour = 5) claim requests in the current hour
    When the guest submits another email claim request
    And POST /api/v1/claim responds HTTP 429 with a "Retry-After" header
    Then a cooldown banner is shown indicating the user must wait (claim_email_retry_cooldown_seconds = 60) seconds
    And the email input and submit button are disabled during the cooldown

  # --- Step 2: OTP entry ---

  Scenario: Guest enters correct 6-digit OTP within expiry window — advances to reveal
    Given the ClaimCodeForm is visible (step "code")
    And the OTP "123456" is valid and was issued within (claim_code_expiry_minutes = 15) minutes
    When the guest enters "123456" in the (claim_code_digits = 6)-digit OTP input
    And the guest clicks "Verify Code"
    Then POST /api/v1/claim/verify is called with body {"claimId": "<claimId>", "code": "123456"}
    And the server responds HTTP 200 with "petToken", "petId", and "petUrl"
    And setPetToken(petToken) writes the token to localStorage under key "pet_token"
    And the Zustand claim slice advances to step "reveal" via setClaimStep('reveal')

  Scenario: Invalid OTP — shake animation and error message shown
    Given the ClaimCodeForm is visible (step "code")
    When the guest enters the wrong 6-digit code and clicks "Verify Code"
    And POST /api/v1/claim/verify responds HTTP 400 with error code "INVALID_CODE"
    Then the OTP digit input boxes play a red shake animation
    And an error message is displayed below the input
    And the OTP inputs remain enabled for retry

  Scenario: Expired OTP — re-request button shown
    Given the ClaimCodeForm is visible and the OTP has expired after (claim_code_expiry_minutes = 15) minutes
    When the guest submits the code and POST /api/v1/claim/verify responds HTTP 400 with error code "CODE_EXPIRED"
    Then the error message "Claim code has expired. Please request a new one." is shown
    And a "Request a new code" button is visible that re-initiates POST /api/v1/claim

  Scenario: ExpiryWarning activates when 2 minutes or fewer remain before OTP expiry
    Given the ClaimCodeForm is visible and (a11y_claim_code_warning_before_expiry_minutes = 2) minutes or fewer remain before OTP expiry
    When the ExpiryWarning component evaluates the minutesRemaining value
    Then the ExpiryWarning renders with role="alert" and aria-live="assertive"
    And the warning text includes the remaining minutes as a countdown

  Scenario: Max OTP attempts reached — all inputs disabled with Retry-After countdown
    Given the guest has made (auth_rate_limit_code_entry_attempts_per_session = 10) failed OTP attempts in this session
    When POST /api/v1/claim/verify responds HTTP 429
    Then all OTP digit inputs are disabled
    And the submit button is disabled
    And a Retry-After countdown is displayed and announced via aria-live="assertive"

  # --- Step 3: URL Reveal ---

  Scenario: Claim reveal step shows pet URL with copy button and navigates to pet page
    Given the ClaimFlow is in step "reveal" and the petToken and petUrl have been received
    When the URLReveal component renders
    Then the unique pet URL is displayed in a read-only field
    And a "Copy" button is visible that copies the petUrl to the clipboard
    And the app automatically navigates to "/pet/:petId" after the token is stored in localStorage
