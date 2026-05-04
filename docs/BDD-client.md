# BDD — Client Feature Specifications

<!-- Client-side Gherkin test specifications for pixel-pet-arena frontend (Player App + Admin Portal) -->
<!-- Authored by: gendoc-align-fix -->
<!-- Date: 2026-05-04 -->

---

## Overview

This document summarizes the 9 client-side BDD feature files that specify the frontend UI/UX, user flows, and component behavior for pixel-pet-arena. These specifications ensure the player app and admin portal conform to PRD acceptance criteria and design requirements.

**Total Coverage:** 9 client features, 50+ scenarios, 10 PRD user stories linked

---

## Player App Features

### 1. Arena UI (`features/client/arena-ui.feature`)

**Linked PRD User Stories:** US-ARENA-001, US-ARENA-002  
**Scenarios:** 5+

Validates arena entry, matchmaking UI, battle animation, and rate limit feedback.

- **Mode Selection**: Player selects RACE or SUMO mode and enters arena via button
- **Matchmaking Status**: "Finding opponent..." display with aria-live="polite" and aria-busy="true"
- **Opponent Found**: Battle animation plays for 5–15 seconds; navigates to `/arena/result/:matchId`
- **Matchmaking Timeout**: No opponent within 30 seconds triggers AIOfferModal
- **Rate Limit Display**: HTTP 429 response shows countdown timer for next available battle

**Key UI Components:** ModeSelector, PreBattlePanel, MatchmakingStatus, ArenaScene (Phaser), ResultModal

---

### 2. Email Claim Flow UI (`features/client/claim-flow-ui.feature`)

**Linked PRD User Stories:** US-AUTH-001, US-AUTH-002  
**Scenarios:** 5+

Validates two-step email OTP claim flow: email entry → OTP verification → success state.

- **Email Entry**: Guest enters email and confirms age (13+); advances to OTP step
- **Age Verification**: Claim blocked without age confirmation checkbox
- **Already Claimed**: Inline error if pet already has owner
- **OTP Verification**: 6-digit code entry field with countdown timer
- **Code Expiry**: After 15 minutes, error message "Code expired, request new code"

**Key UI Components:** ClaimFlow (compound), ClaimEmailForm, ClaimCodeForm, SuccessMessage

**Key Constants Referenced:** `email_claim_flow_steps_max = 3`, `claim_code_digits = 6`, `claim_code_expiry_minutes = 15`

---

### 3. Battle Records Page (`features/client/battle-records.feature`)

**Linked PRD User Stories:** US-RECORD-001  
**Scenarios:** 5+

Validates battle history display, stat differential, public access, and share URL.

- **Records Display**: Last 20 battles ordered by date descending (AC-010-2)
- **Stat Differential**: Shows advantage/disadvantage vs. opponent for each battle (e.g., "Speed: +7")
- **Public Access**: No authentication required; page accessible via `/pet/:petId/records` (AC-010-1)
- **Share Button**: Generates shareable URL with Open Graph metadata (pet name, rarity, win count)
- **Empty State**: "No battles yet" message when pet has no records

**Key UI Components:** BattleRecordsPage, BattleHistoryTable, BattleHistoryRow, PetSummaryCard, ShareModal

**Key Constants Referenced:** `arena_battle_records_display_count = 20`

---

### 4. Food System UI (`features/client/food-system.feature`)

**Linked PRD User Stories:** US-FOOD-001  
**Scenarios:** 4+

Validates food inventory, buff application, and buff duration indicator.

- **Inventory Display**: Grid/list of FoodItem cards with stat icons and buff magnitude
- **Apply Buff**: "Use" button triggers buff application; optimistic update + server confirmation
- **Buff Active Indicator**: Badge or timer showing buff expiry time (e.g., "12h remaining")
- **Permanent vs. Temporary**: Different styling for permanent bonuses vs. 24h temporary buffs
- **Empty Inventory**: Message when player has no food items

**Key UI Components:** FoodInventory, FoodItem, BuffIndicator, BuffActiveModal

---

### 5. Leaderboard UI (`features/client/leaderboard-ui.feature`)

**Linked PRD User Stories:** US-BOARD-001, US-RARITY-001  
**Scenarios:** 5+

Validates global leaderboard ranking display, rarity badges, and owner rank banner.

- **Public Access**: No authentication required for leaderboard view (AC-009-3)
- **Top 100 Display**: Leaderboard table with up to 100 rows (AC-009-4)
- **Auto-Refresh**: TanStack Query refetches every 30 seconds (AC-009-2)
- **Rarity Filter**: Tabs to filter by Common, Rare, Epic, Legendary (AC-002-5)
- **Owner Rank**: Banner highlighting player's own pet position on board

**Key UI Components:** LeaderboardPage, LeaderboardTable, LeaderboardRow, RarityFilter, OwnerRankBanner

**Key Constants Referenced:** `leaderboard_update_lag_max_seconds = 30`, `leaderboard_top_display = 100`

---

### 6. Pet Display (`features/client/pet-display.feature`)

**Linked PRD User Stories:** US-PET-001, US-PET-002  
**Scenarios:** 3+

Validates landing page pet generation, stat display, and food buff visual indicator.

- **Token Generation**: Visiting "/" generates new pet_token via GET /api/v1/pets/random
- **Pet Canvas**: Pixel art rendered with Phaser, role="img", aria-label with pet name
- **Stat Bars**: Visual bars for Speed, Strength, Stamina with current/max values
- **Buff Indicator**: Icon/badge showing active food buff on stat bar

**Key UI Components:** PetCanvas, StatBars, BuffIndicator, LandingPage

**Key Constants Referenced:** `pet_access_token_min_bytes = 32`

---

### 7. Settings Page (`features/client/settings.feature`)

**Linked PRD User Stories:** User-level preferences (no specific PRD story)  
**Scenarios:** 3+

Validates settings modal/page for theme, audio, and notification preferences.

- **Settings Menu**: Accessible from navbar; dismissible via close button or Escape
- **Theme Toggle**: Switch between light and dark mode (persists to localStorage)
- **Audio Toggle**: Enable/disable background music and SFX
- **Notification Toggle**: Enable/disable browser notifications for arena results

**Key UI Components:** SettingsModal, ThemeToggle, AudioToggle, NotificationToggle

---

### 8. Training UI (`features/client/training-ui.feature`)

**Linked PRD User Stories:** US-TRAIN-001  
**Scenarios:** 4+

Validates training action selection, daily cap enforcement, and stat change feedback.

- **Action Cards**: Three TrainingActionCard options (RUN, STRENGTH, STAMINA)
- **Daily Cap**: Display "3 actions remaining today" counter; block 4th attempt (AC-006-5)
- **Stat Change**: StatChangeIndicator shows +1/+2/+3 point delta and updated total
- **Error Feedback**: HTTP 400 "TRAINING_LIMIT_REACHED" shows inline error

**Key UI Components:** TrainingPage, TrainingActionCard, StatChangeIndicator, TrainingInputForm

**Key Constants Referenced:** `training_actions_per_day = 3`

---

## Admin Portal Features

### 9. Admin Portal (`features/client/admin-portal.feature`)

**Linked PRD User Stories:** US-ADMIN-001, US-ADMIN-002, US-ADMIN-003, US-ADMIN-004, US-ADMIN-005, US-ADMIN-006  
**Scenarios:** 15+

Validates admin authentication, pet moderation, GDPR erasure, leaderboard management, and system configuration.

- **Admin Login**: Email-based login with httpOnly SameSite=Strict session cookie (AC-011-1)
- **Session Timeout**: Session expires after 4 hours of inactivity (AC-011-2)
- **Moderation Queue**: View SUSPICIOUS pets and bans; submit reason ≤500 chars (AC-013-2)
- **GDPR Erasure**: Approve/deny erasure requests; view SLA status (AC-016-1, AC-016-2)
- **Leaderboard Reset**: Admin action to reset leaderboard; reflects within 5 minutes (AC-009-5)
- **Runtime Parameters**: Tune arena_rate_limit_battles_per_hour, rarity weights, etc. (US-ADMIN-003)
- **Game Economy**: Configure food buff multipliers, arena entry cost, battle cooldown (US-ADMIN-006)

**Key UI Components:** AdminPortal, Moderation Queue, PetDetailModal, GDPRRequestList, ConfigPanel, ParameterInputForm

**Key Constants Referenced:** `admin_moderation_reason_max_chars = 500`, `admin_session_inactivity_expiry_hours = 4`

---

## Cross-Reference: PRD Acceptance Criteria

| AC ID | Story | Covered By | Status |
|-------|-------|-----------|--------|
| AC-002-5 | US-RARITY-001 | Leaderboard UI | ✓ |
| AC-006-5 | US-TRAIN-001 | Training UI | ✓ |
| AC-009-1 | US-BOARD-001 | Leaderboard UI | ✓ |
| AC-009-2 | US-BOARD-001 | Leaderboard UI | ✓ |
| AC-009-3 | US-BOARD-001 | Leaderboard UI | ✓ |
| AC-009-4 | US-BOARD-001 | Leaderboard UI | ✓ |
| AC-009-5 | US-BOARD-001 | Leaderboard UI | ✓ |
| AC-010-1 | US-RECORD-001 | Battle Records | ✓ |
| AC-010-2 | US-RECORD-001 | Battle Records | ✓ |
| AC-011-1 | US-ADMIN-001 | Admin Portal | ✓ |
| AC-011-2 | US-ADMIN-001 | Admin Portal | ✓ |
| AC-013-2 | US-ADMIN-005 | Admin Portal | ✓ |
| AC-016-1 | US-AUTH-002 | Admin Portal | ✓ |
| AC-016-2 | US-AUTH-002 | Admin Portal | ✓ |

---

## How to Use This Document

1. **For Frontend Developers**: Quick reference for UI/UX specifications and component interactions.
2. **For QA/E2E Testers**: Cross-reference scenario steps against `features/client/` feature files to create Playwright test implementations.
3. **For Product/Design**: Verify all frontend flows match PRD acceptance criteria and design system.

---

**Generated:** 2026-05-04  
**Last Updated:** 2026-05-04  
**Maintainer:** Product Engineering Team
