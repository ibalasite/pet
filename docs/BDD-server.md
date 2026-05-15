# BDD — Server Feature Specifications

<!-- Server-side Gherkin test specifications for pixel-pet-arena backend -->
<!-- Authored by: gendoc-align-fix -->
<!-- Date: 2026-05-04 -->

---

## Overview

This document summarizes the 12 server-side BDD feature files that specify the backend API and business logic for pixel-pet-arena. Each feature file contains Gherkin scenarios that validate acceptance criteria from the PRD.

**Total Coverage:** 12 server features, 82 scenarios, 14 PRD user stories linked (including US-ADMIN-006 economy config and US-TRADE-001 marketplace deferred behind `FF_MARKETPLACE`).

> The six feature files originally summarized in detail below cover the v1 P0 scope (arena, claim, GDPR, leaderboard, training, suspicious detection). The full list of 12 feature files (including `admin-moderation`, `admin-search-performance`, `battle-records`, `economy-config`, `rarity-distribution`, `trading-system`) is enumerated in `docs/RTM.md` §"Server-Side Features" and is the authoritative inventory.

---

## 1. Arena Battle System (`features/arena-battle.feature`)

**Linked PRD User Stories:** US-ARENA-001, US-ARENA-002  
**Scenarios:** 5

Validates the core battle matchmaking and battle resolution system.

- **Race Battle**: Two pets match and complete a race battle, with speed stat determining winner
- **AI Fallback**: Matchmaking timeout triggers AI opponent when queue has only 1 pet
- **Rate Limiting**: Arena battles capped at 10 per hour; HTTP 429 returned when exceeded (AC-007-8)
- **Sumo Mode**: Alternative battle mode using strength stat instead of speed
- **Speed Modifier**: Winner determined using base stat + ±15% random modifier

**Key Constants Referenced:** `arena_match_duration_max_seconds = 15`, `arena_matchmaking_timeout_seconds = 30`, `arena_rate_limit_battles_per_hour_default = 10`

---

## 2. Email Claim Flow (`features/claim-flow.feature`)

**Linked PRD User Stories:** US-AUTH-001, US-AUTH-002  
**Scenarios:** 4

Validates the email-based pet ownership claim process (zero-account-barrier).

- **OTP Verification**: Guest claims pet via 6-digit code; email links to pet token (AC-003-1, AC-003-2)
- **Code Expiry**: Claim code expires after 15 minutes (AC-003-3)
- **Claim Rate Limit**: 5 OTP requests per hour; HTTP 429 with Retry-After header on 6th attempt (AC-007-1)
- **One-Time Use**: Claim code cannot be reused after first successful verification (AC-003-4)

**Key Constants Referenced:** `pet_access_token_min_bytes = 32`, `claim_code_digits = 6`, `claim_code_expiry_minutes = 15`, `auth_rate_limit_claim_attempts_per_hour = 5`

---

## 3. GDPR Data Erasure (`features/gdpr-erasure.feature`)

**Linked PRD User Stories:** US-AUTH-002, US-ADMIN-004  
**Scenarios:** 2

Validates user data erasure and privacy compliance (GDPR Article 17).

- **Player Erasure Request**: Pet owner requests email erasure; email_encrypted nulled within 24h SLA (AC-004-6, AC-016-2)
- **Admin Deletion**: Super admin triggers GDPR deletion via admin portal; audit logged with admin_id and ip_address_hash (AC-004-6)

**Key Constants Referenced:** `gdpr_email_hashing_internal_sla_hours = 24`

---

## 4. Global Leaderboard (`features/leaderboard.feature`)

**Linked PRD User Stories:** US-BOARD-001, US-ADMIN-002  
**Scenarios:** 3

Validates the global leaderboard ranking system and admin moderation integration.

- **Redis Fallback**: When Redis is unavailable, leaderboard falls back to PostgreSQL snapshot with "degraded": true flag (AC-009-1)
- **Score Update Lag**: Leaderboard score updates within 30 seconds of a battle win (AC-009-2)
- **Admin Ban Reflection**: Banning a pet removes it from leaderboard within 5 minutes (AC-005-8)

**Key Constants Referenced:** `leaderboard_update_lag_max_seconds = 30`, `leaderboard_ban_reflection_time_minutes = 5`, `admin_moderation_reason_max_chars = 500`

---

## 5. Training and Food System (`features/training-food.feature`)

**Linked PRD User Stories:** US-TRAIN-001, US-FOOD-001  
**Scenarios:** 2

Validates pet stat progression and temporary buff mechanics.

- **Training Action Bounds**: Training increments a stat by 1–3 points; 3 training actions per day allowed (AC-006-1, AC-006-5)
- **Food Buff Expiry**: Temporary food buff (e.g., +5 speed) applies bonus during battle; expires after 24h duration (AC-008-1)

**Key Constants Referenced:** `training_stat_points_min = 1`, `training_stat_points_max = 3`, `training_actions_per_day = 3`, `food_buff_example_temp_amount_stat_points = 5`, `food_buff_example_temp_duration_hours = 24`

---

## 6. Suspicious Battle Detection (`features/suspicious-detection.feature`)

**Linked PRD User Stories:** US-ADMIN-005  
**Scenarios:** 3

Validates bot/spam detection and admin moderation workflow.

- **Auto-Flag SUSPICIOUS**: Pet auto-flagged SUSPICIOUS after 50+ battles within 60 minutes (AC-013-1)
- **Moderator Ban Action**: Moderator bans a SUSPICIOUS pet with reason; audit logged (AC-013-2, AC-013-3)
- **Ban Enforcement**: Banned pet cannot enter future arena matches; HTTP 403 "PET_BANNED" (AC-013-4)

**Key Constants Referenced:** `bot_detection_battles_threshold = 50`, `bot_detection_window_minutes = 60`, `admin_moderation_reason_max_chars = 500`

---

## Cross-Reference: PRD Acceptance Criteria

| AC ID | Story | Covered By | Status |
|-------|-------|-----------|--------|
| AC-003-1 | US-AUTH-001 | Email Claim Flow | ✓ |
| AC-003-2 | US-AUTH-001 | Email Claim Flow | ✓ |
| AC-003-3 | US-AUTH-001 | Email Claim Flow | ✓ |
| AC-003-4 | US-AUTH-001 | Email Claim Flow | ✓ |
| AC-004-6 | US-AUTH-002 | GDPR Erasure | ✓ |
| AC-005-8 | US-ADMIN-002 | Leaderboard | ✓ |
| AC-006-1 | US-TRAIN-001 | Training & Food | ✓ |
| AC-006-5 | US-TRAIN-001 | Training & Food | ✓ |
| AC-007-1 | US-ARENA-001 | Email Claim Flow | ✓ |
| AC-007-8 | US-ARENA-001 | Arena Battle | ✓ |
| AC-008-1 | US-FOOD-001 | Training & Food | ✓ |
| AC-009-1 | US-BOARD-001 | Leaderboard | ✓ |
| AC-009-2 | US-BOARD-001 | Leaderboard | ✓ |
| AC-013-1 | US-ADMIN-005 | Bot Detection | ✓ |
| AC-013-2 | US-ADMIN-005 | Bot Detection | ✓ |
| AC-013-3 | US-ADMIN-005 | Bot Detection | ✓ |
| AC-013-4 | US-ADMIN-005 | Bot Detection | ✓ |
| AC-016-2 | US-AUTH-002 | GDPR Erasure | ✓ |

---

## How to Use This Document

1. **For Developers**: Use this as a quick reference for what backend functionality is specified.
2. **For QA**: Cross-reference scenario steps against the feature files in `features/` to understand expected behavior.
3. **For Product**: Use AC mapping above to verify all PRD requirements are covered by test specifications.

---

**Generated:** 2026-05-04  
**Last Updated:** 2026-05-04  
**Maintainer:** Product Engineering Team
