# Requirement Traceability Matrix

| | |
|---|---|
| **DOC-ID** | RTM-PIXEL-PET-001 |
| **Project** | pixel-pet-arena |
| **Date** | 2026-05-08 |
| **Version** | 1.1.0 |
| **Last refresh** | 2026-05-08 (align-fix: regenerated against `features/` after dedup of `features/server/`, US-GEN-001 → US-PET-002 + US-RARITY-001 retag, addition of `economy-config.feature`) |

---

## Overview

This Requirement Traceability Matrix (RTM) maps all 18 user stories defined in the pixel-pet-arena PRD to their corresponding test coverage assets across four test layers: BDD (server-side and client-side Cucumber/Gherkin feature files), unit tests, integration tests, and cross-cutting performance and security tests.

The scope covers the v1 release milestone. Coverage is assessed at the user story level; each row records which specific feature files exercise a story and which additional test categories supplement BDD coverage. One cross-cutting non-functional requirements row captures platform-wide concerns (authentication security hardening, rate limiting, and COPPA compliance) that span multiple stories.

US-TRADE-001 (Pet Trading Marketplace, P2) is formally deferred behind feature flag `FF_MARKETPLACE`. A `trading-system.feature` file is tagged `@US-TRADE-001 @FF_MARKETPLACE` and ready to activate once DAU exceeds 1,000; until then it is excluded from CI runs by the feature-flag gate.

The methodology follows forward traceability: each user story is the anchor, with test assets linked forward from requirements to verification evidence.

The companion machine-readable view of this document lives at `docs/RTM.csv` and is regenerated together with this Markdown file. If they ever diverge, the most recent commit wins; both must be re-emitted in the same change set.

---

## BDD Feature File Inventory

This section maps all 21 BDD feature files to their corresponding user stories and test layers.

**Total**: 12 server feature files + 9 client feature files = **21 files / 206 scenarios**.

### Server-Side Features (12 files, 82 scenarios)

| Feature File | Scenarios | US Stories | Layer | Coverage |
|---|---|---|---|---|
| `features/claim-flow.feature` | 8 | US-AUTH-001, US-AUTH-002 | Backend API | ✅ Covered |
| `features/arena-battle.feature` | 7 | US-ARENA-001, US-ARENA-002 | Backend API | ✅ Covered |
| `features/training-food.feature` | 3 | US-TRAIN-001, US-FOOD-001 | Backend API | ✅ Covered |
| `features/leaderboard.feature` | 8 | US-BOARD-001, US-ADMIN-002 | Backend API | ✅ Covered |
| `features/battle-records.feature` | 7 | US-RECORD-001 | Backend API | ✅ Covered |
| `features/rarity-distribution.feature` | 5 | US-PET-002, US-RARITY-001 | Backend API | ✅ Covered |
| `features/gdpr-erasure.feature` | 8 | US-AUTH-002, US-ADMIN-004 | Backend API | ✅ Covered |
| `features/suspicious-detection.feature` | 3 | US-ADMIN-005 | Backend API | ✅ Covered |
| `features/admin-moderation.feature` | 11 | US-ADMIN-001, US-ADMIN-002, US-ADMIN-005 | Backend API | ✅ Covered |
| `features/admin-search-performance.feature` | 6 | US-ADMIN-001 (NFR-ADMIN-06) | Backend API | ✅ Covered |
| `features/economy-config.feature` | 6 | US-ADMIN-006 | Backend API | ✅ Covered |
| `features/trading-system.feature` | 10 | US-TRADE-001 (deferred behind `FF_MARKETPLACE`) | Backend API | ⏸ Deferred (P2) |
| **Total** | **82** | — | — | — |

### Client-Side Features (9 files, 124 scenarios)

| Feature File | Scenarios | US Stories | Layer | Coverage |
|---|---|---|---|---|
| `features/client/pet-display.feature` | 12 | US-PET-001, US-PET-002 | Frontend UI | ✅ Covered |
| `features/client/claim-flow-ui.feature` | 10 | US-AUTH-001, US-AUTH-002 | Frontend UI | ✅ Covered |
| `features/client/training-ui.feature` | 12 | US-TRAIN-001 | Frontend UI | ✅ Covered |
| `features/client/food-system.feature` | 17 | US-FOOD-001 | Frontend UI | ✅ Covered |
| `features/client/arena-ui.feature` | 10 | US-ARENA-001, US-ARENA-002 | Frontend UI | ✅ Covered |
| `features/client/leaderboard-ui.feature` | 10 | US-BOARD-001, US-RARITY-001 | Frontend UI | ✅ Covered |
| `features/client/battle-records.feature` | 19 | US-RECORD-001 | Frontend UI | ✅ Covered |
| `features/client/admin-portal.feature` | 13 | US-ADMIN-001, US-ADMIN-002, US-ADMIN-003, US-ADMIN-004, US-ADMIN-005, US-ADMIN-006 | Frontend Admin | ✅ Covered |
| `features/client/settings.feature` | 21 | US-AUTH-002 (settings/account preferences) | Frontend UI | ✅ Covered |
| **Total** | **124** | — | — | — |

> **Cleanup note** (2026-05-08): the previous duplicate `features/server/` directory has been removed (was byte-identical to `features/`) and the canonical path is now flat (`features/<name>.feature` for server-side, `features/client/<name>.feature` for client-side). RTM rows below cite only the canonical paths.

---

## Requirements

| US-ID | Title | Priority | Epic | AC Count | Feature Flags |
|---|---|---|---|---|---|
| US-PET-001 | Random Pet Display (Guest Mode) | P0 | EPIC-PET | 5 | — |
| US-PET-002 | Procedural Pixel Pet Generation | P0 | EPIC-PET | 4 | `FF_PET_GENERATION` |
| US-AUTH-001 | Email Claim Flow | P0 | EPIC-AUTH | 6 | — |
| US-AUTH-002 | Returning Pet Owner Access | P0 | EPIC-AUTH | 4 | — |
| US-TRAIN-001 | Pet Training System | P0 | EPIC-TRAINING | 5 | — |
| US-FOOD-001 | Special Food System | P0 | EPIC-TRAINING | 4 | — |
| US-ARENA-001 | Arena Racing Competition | P0 | EPIC-ARENA | 6 | — |
| US-ARENA-002 | Sumo Arena Mode | P1 | EPIC-ARENA | 4 | — |
| US-BOARD-001 | Global Leaderboard | P0 | EPIC-RANKING | 5 | — |
| US-RECORD-001 | Battle Records Page | P0 | EPIC-RANKING | 3 | — |
| US-RARITY-001 | Rarity Scoring | P1 | EPIC-RANKING | 3 | `FF_RARITY_DISPLAY` |
| US-TRADE-001 | Pet Trading Marketplace | P2 | EPIC-MARKETPLACE | 5 | `FF_MARKETPLACE` |
| US-ADMIN-001 | Admin Pet Management | P0 | EPIC-ADMIN | 4 | `FF_ADMIN_PORTAL` |
| US-ADMIN-002 | Admin Leaderboard Moderation | P0 | EPIC-ADMIN | 3 | `FF_ADMIN_PORTAL` |
| US-ADMIN-003 | Admin Runtime Parameter Tuning | P1 | EPIC-ADMIN | 3 | `FF_ADMIN_PORTAL` |
| US-ADMIN-004 | GDPR Data Erasure | P0 | EPIC-ADMIN | 4 | `FF_ADMIN_PORTAL` |
| US-ADMIN-005 | Suspicious Battle Detection | P0 | EPIC-ADMIN | 3 | `FF_ADMIN_PORTAL` |
| US-ADMIN-006 | Game Economy Configuration | P1 | EPIC-ADMIN | 4 | `FF_ADMIN_PORTAL` |

---

## Test Cases

| US-ID | Requirement | BDD-Server | BDD-Client | Unit | Integration | Perf / Security | Coverage Status |
|---|---|---|---|---|---|---|---|
| US-PET-001 | Random Pet Display (Guest Mode) | — | `pet-display.feature` (12) | Sprite generation | — | Visual regression: pixel rendering | ✅ Covered |
| US-PET-002 | Procedural Pixel Pet Generation | `rarity-distribution.feature` (5) | `pet-display.feature` (12) | Combination space; deterministic seed | — | Statistical chi-square (rarity dist) | ✅ Covered |
| US-AUTH-001 | Email Claim Flow | `claim-flow.feature` (8) | `claim-flow-ui.feature` (10) | OTP expiry | Email sending; one-time token | Security: email enumeration prevention; COPPA | ✅ Covered |
| US-AUTH-002 | Returning Pet Owner Access | `claim-flow.feature` (8), `gdpr-erasure.feature` (8) | `claim-flow-ui.feature` (10), `settings.feature` (21) | — | GDPR erasure path | Security: invalid URL → 404 | ✅ Covered |
| US-TRAIN-001 | Pet Training System | `training-food.feature` (3) | `training-ui.feature` (12) | Stat increment; stat max cap | Persistence | Visual regression: neglected state | ✅ Covered |
| US-FOOD-001 | Special Food System | `training-food.feature` (3) | `food-system.feature` (17) | Buff application; stat max block | Food buff persistence | — | ✅ Covered |
| US-ARENA-001 | Arena Racing Competition | `arena-battle.feature` (7) | `arena-ui.feature` (10) | Outcome calculation | Battle record save | Security: rate limit enforcement | ✅ Covered |
| US-ARENA-002 | Sumo Arena Mode | `arena-battle.feature` (7) | `arena-ui.feature` (10) | Sumo outcome calculation | — | — | ✅ Covered |
| US-BOARD-001 | Global Leaderboard | `leaderboard.feature` (8) | `leaderboard-ui.feature` (10) | — | Leaderboard update lag | — | ✅ Covered |
| US-RECORD-001 | Battle Records Page | `battle-records.feature` (7) | `battle-records.feature` (19) | Battle record save/retrieve | Open Graph meta | — | ✅ Covered |
| US-RARITY-001 | Rarity Scoring | `rarity-distribution.feature` (5) | `leaderboard-ui.feature` (10) | — | — | Visual regression: Legendary border | ✅ Covered |
| US-TRADE-001 | Pet Trading Marketplace | `trading-system.feature` (10) — gated by `FF_MARKETPLACE`, excluded from CI until DAU ≥1,000 | — | — | — | — | ⏸ Deferred (P2) |
| US-ADMIN-001 | Admin Pet Management | `admin-moderation.feature` (11), `admin-search-performance.feature` (6) | `admin-portal.feature` (13) | — | Ban propagation | Perf: search ≤2 s for 1 M records | ✅ Covered |
| US-ADMIN-002 | Admin Leaderboard Moderation | `leaderboard.feature` (8), `admin-moderation.feature` (11) | `admin-portal.feature` (13) | — | — | — | ✅ Covered |
| US-ADMIN-003 | Admin Runtime Parameter Tuning | — | `admin-portal.feature` (13) | — | Config cache refresh | — | ✅ Covered |
| US-ADMIN-004 | GDPR Data Erasure | `gdpr-erasure.feature` (8) | `admin-portal.feature` (13) | — | — | — | ✅ Covered |
| US-ADMIN-005 | Suspicious Battle Detection | `suspicious-detection.feature` (3), `admin-moderation.feature` (11) | `admin-portal.feature` (13) | — | — | — | ✅ Covered |
| US-ADMIN-006 | Game Economy Configuration | `economy-config.feature` (6) | `admin-portal.feature` (13) | — | Config cache refresh; food buff multiplier | — | ✅ Covered |
| NFR-XCUT-001 | Cross-cutting non-functional: auth security hardening, rate limiting, COPPA age gate, email enumeration prevention | `claim-flow.feature` (8) | `claim-flow-ui.feature` (10) | OTP expiry | One-time token | Security: email enumeration; rate limit; COPPA | ✅ Covered |

---

## Coverage

### Coverage by Epic

| Epic | Total Stories | Covered | Partial | Deferred | Not Covered | Epic Coverage % |
|---|---|---|---|---|---|---|
| EPIC-PET | 2 | 2 | 0 | 0 | 0 | 100% |
| EPIC-AUTH | 2 | 2 | 0 | 0 | 0 | 100% |
| EPIC-TRAINING | 2 | 2 | 0 | 0 | 0 | 100% |
| EPIC-ARENA | 2 | 2 | 0 | 0 | 0 | 100% |
| EPIC-RANKING | 3 | 3 | 0 | 0 | 0 | 100% |
| EPIC-MARKETPLACE | 1 | 0 | 0 | 1 | 0 | 0% (deferred) |
| EPIC-ADMIN | 6 | 6 | 0 | 0 | 0 | 100% |
| **Total** | **18** | **17** | **0** | **1** | **0** | **94%** |

### Overall Coverage

Excluding the formally deferred US-TRADE-001 (P2, `FF_MARKETPLACE` off), **17 of 17 active user stories are fully covered** (100%). Including the deferred story, the uncapped ratio is **17 fully covered, 0 partial, 1 deferred** out of 18, yielding an overall percentage of **94%** against all requirements (the 6% gap is the deferred marketplace story; coverage automatically reaches 100% the moment `FF_MARKETPLACE` activates and the existing `trading-system.feature` enters the CI run).

### Gaps and Notes

**US-TRADE-001 — Pet Trading Marketplace (⏸ Deferred P2)**
No active CI coverage in v1. The `features/trading-system.feature` file is tagged `@US-TRADE-001 @FF_MARKETPLACE` (10 scenarios specifying anti-flip, listing creation, sale execution, and trade-record persistence). Cucumber profile excludes `@FF_MARKETPLACE` until the flag is enabled. When activated, this story will additionally require unit tests for trade validation logic, integration tests for transaction atomicity, and security tests for fraud prevention.

**US-ADMIN-004 / US-ADMIN-005 — PRD acceptance criteria**
PRD §19.4 contains the full acceptance criteria for both stories (AC-016-1..4 for US-ADMIN-004 and AC-017-1..4 for US-ADMIN-005). Coverage is provided by `features/gdpr-erasure.feature` (8) and `features/suspicious-detection.feature` (3) on the server side, plus the relevant client-side scenarios in `admin-portal.feature`.
