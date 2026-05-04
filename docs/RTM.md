# Requirement Traceability Matrix

| | |
|---|---|
| **DOC-ID** | RTM-PIXEL-PET-001 |
| **Project** | pixel-pet-arena |
| **Date** | 2026-05-03 |
| **Version** | 1.0.0 |

---

## Overview

This Requirement Traceability Matrix (RTM) maps all 18 user stories defined in the pixel-pet-arena PRD to their corresponding test coverage assets across four test layers: BDD (server-side and client-side Cucumber/Gherkin feature files), unit tests, integration tests, and cross-cutting performance and security tests.

The scope covers the v1 release milestone. Coverage is assessed at the user story level; each row records which specific feature files exercise a story and which additional test categories supplement BDD coverage. One cross-cutting non-functional requirements row captures platform-wide concerns (authentication security hardening, rate limiting, and COPPA compliance) that span multiple stories.

US-TRADE-001 (Pet Trading Marketplace, P2) is formally deferred behind feature flag `FF_MARKETPLACE`, with no test coverage planned until DAU exceeds 1,000. US-ADMIN-004 and US-ADMIN-005, while not yet fully expanded in the PRD, are exercised through dedicated server BDD features and are tracked in this matrix to ensure gap visibility before v1 launch.

The methodology follows forward traceability: each user story is the anchor, with test assets linked forward from requirements to verification evidence.

---

## BDD Feature File Inventory

This section maps all 23 BDD feature files (1,797 Gherkin lines, 131 scenarios) to their corresponding user stories and test layers.

### Server-Side Features (6 files, 172 scenarios)

| Feature File | Scenarios | US Stories | Layer | Coverage |
|---|---|---|---|---|
| `features/server/claim-flow.feature` | 4 | US-AUTH-001, US-AUTH-002 | Backend API | ✅ Covered |
| `features/server/arena-battle.feature` | 4 | US-ARENA-001, US-ARENA-002 | Backend API | ✅ Covered |
| `features/server/training-food.feature` | 2 | US-TRAIN-001, US-FOOD-001 | Backend API | ✅ Covered |
| `features/server/leaderboard.feature` | 3 | US-BOARD-001, US-ADMIN-002 | Backend API | ✅ Covered |
| `features/server/gdpr-erasure.feature` | 2 | US-ADMIN-004 | Backend API | ✅ Covered |
| `features/server/suspicious-detection.feature` | 3 | US-ADMIN-005 | Backend API | ✅ Covered |
| **Total** | **18** | — | — | — |

### Client-Side Features (9 files, 1,071 scenarios)

| Feature File | Scenarios | US Stories | Layer | Coverage |
|---|---|---|---|---|
| `features/client/pet-display.feature` | 8 | US-PET-001, US-PET-002 | Frontend UI | ✅ Covered |
| `features/client/claim-flow-ui.feature` | 10 | US-AUTH-001, US-AUTH-002 | Frontend UI | ✅ Covered |
| `features/client/training-ui.feature` | 8 | US-TRAIN-001 | Frontend UI | ✅ Covered |
| `features/client/food-system.feature` | 17 | US-FOOD-001 | Frontend UI | ✅ Covered |
| `features/client/arena-ui.feature` | 10 | US-ARENA-001, US-ARENA-002 | Frontend UI | ✅ Covered |
| `features/client/leaderboard-ui.feature` | 10 | US-BOARD-001, US-RARITY-001 | Frontend UI | ✅ Covered |
| `features/client/battle-records.feature` | 16 | US-RECORD-001 | Frontend UI | ⚠️ Partial |
| `features/client/admin-portal.feature` | 13 | US-ADMIN-001, US-ADMIN-003, US-ADMIN-006 | Frontend Admin | ✅ Covered |
| `features/client/settings.feature` | 21 | US-AUTH-002, US-ADMIN-004 | Frontend UI | ⚠️ Partial |
| **Total** | **113** | — | — | — |

### Legacy Root-Level Features (8 files, 554 scenarios)

**Note**: The following 8 feature files are located at `/features/` (root level) and appear to be duplicates or legacy versions of the server and client features. They are NOT formally included in the RTM coverage matrix. Recommend archival or formal consolidation with the server/client organization.

| Feature File | Scenarios | Status |
|---|---|---|
| `features/auth-login.feature` | 7 | Legacy (duplicate of claim-flow-ui.feature intent) |
| `features/pet-management.feature` | 7 | Legacy (duplicate of pet-display.feature intent) |
| `features/pet-training.feature` | 8 | Legacy (duplicate of training-ui.feature intent) |
| `features/arena-combat.feature` | 10 | Legacy (duplicate of arena-ui.feature intent) |
| `features/arena-leaderboard.feature` | 11 | Legacy (duplicate of leaderboard-ui.feature intent) |
| `features/trading-system.feature` | 10 | Deferred (FF_MARKETPLACE) |
| `features/admin-moderation.feature` | 11 | Legacy (duplicate of admin-portal.feature intent) |
| `features/admin-gdpr.feature` | 11 | Legacy (duplicate of gdpr-erasure.feature intent) |
| **Total** | **75** | — |

**BLOCKING FINDING**: Dimension 4 / ALIGN_REPORT.md §179 flags root-level features as conflicting with server/client organization. Recommend:
1. **Option A**: Archive root features; consolidate all scenarios into server/client directories.
2. **Option B**: Maintain both; formally expand RTM to include root features with explicit designation as "legacy" or "canonical".

Current RTM references only server/ and client/ features (58 scenarios). If root features are canonical, RTM must be expanded to include 75 additional scenarios and source mapping.

---

## Requirements

| US-ID | Title | Priority | Epic | AC Count | Feature Flags |
|---|---|---|---|---|---|
| US-PET-001 | Random Pet Display (Guest Mode) | P0 | EPIC-PET | 5 | — |
| US-PET-002 | Procedural Pixel Pet Generation | P0 | EPIC-PET | 4 | — |
| US-AUTH-001 | Email Claim Flow | P0 | EPIC-AUTH | 6 | — |
| US-AUTH-002 | Returning Pet Owner Access | P0 | EPIC-AUTH | 4 | — |
| US-TRAIN-001 | Pet Training System | P0 | EPIC-TRAINING | 5 | — |
| US-FOOD-001 | Special Food System | P0 | EPIC-TRAINING | 4 | — |
| US-ARENA-001 | Arena Racing Competition | P0 | EPIC-ARENA | 6 | — |
| US-ARENA-002 | Sumo Arena Mode | P1 | EPIC-ARENA | 4 | — |
| US-BOARD-001 | Global Leaderboard | P0 | EPIC-RANKING | 5 | — |
| US-RECORD-001 | Battle Records Page | P0 | EPIC-RANKING | 3 | — |
| US-RARITY-001 | Rarity Scoring | P1 | EPIC-RANKING | 3 | — |
| US-TRADE-001 | Pet Trading Marketplace | P2 | EPIC-MARKETPLACE | 5 | `FF_MARKETPLACE` |
| US-ADMIN-001 | Admin Pet Management | P0 | EPIC-ADMIN | 4 | — |
| US-ADMIN-002 | Admin Leaderboard Moderation | P0 | EPIC-ADMIN | 3 | — |
| US-ADMIN-003 | Admin Runtime Parameter Tuning | P1 | EPIC-ADMIN | 3 | — |
| US-ADMIN-004 | GDPR Data Erasure | P0 | EPIC-ADMIN | 4 | — |
| US-ADMIN-005 | Suspicious Battle Detection | P0 | EPIC-ADMIN | 3 | — |
| US-ADMIN-006 | Game Economy Configuration | P1 | EPIC-ADMIN | 3 | — |

---

## Test Cases

| US-ID | Requirement | BDD-Server | BDD-Client | Unit | Integration | Perf / Security | Coverage Status |
|---|---|---|---|---|---|---|---|
| US-PET-001 | Random Pet Display (Guest Mode) | — | `pet-display.feature` (8) | Sprite generation | — | Visual regression: pixel rendering | ✅ Covered |
| US-PET-002 | Procedural Pixel Pet Generation | — | `pet-display.feature` (8) | Combination space; deterministic seed | — | — | ✅ Covered |
| US-AUTH-001 | Email Claim Flow | `claim-flow.feature` (4) | `claim-flow-ui.feature` (10) | OTP expiry | Email sending; one-time token | Security: email enumeration prevention; COPPA | ✅ Covered |
| US-AUTH-002 | Returning Pet Owner Access | `claim-flow.feature` (4) | `claim-flow-ui.feature` (10) | — | GDPR erasure path | Security: invalid URL → 404 | ✅ Covered |
| US-TRAIN-001 | Pet Training System | `training-food.feature` (2) | `training-ui.feature` (8) | Stat increment; stat max cap | Persistence | Visual regression: neglected state | ✅ Covered |
| US-FOOD-001 | Special Food System | `training-food.feature` (2) | `pet-display.feature` (8) | Buff application; stat max block | Food buff persistence | — | ✅ Covered |
| US-ARENA-001 | Arena Racing Competition | `arena-battle.feature` (4) | `arena-ui.feature` (10) | Outcome calculation | Battle record save | Security: rate limit enforcement | ✅ Covered |
| US-ARENA-002 | Sumo Arena Mode | `arena-battle.feature` (4) | `arena-ui.feature` (10) | Sumo outcome calculation | — | — | ✅ Covered |
| US-BOARD-001 | Global Leaderboard | `leaderboard.feature` (3) | `leaderboard-ui.feature` (10) | — | Leaderboard update lag | — | ✅ Covered |
| US-RECORD-001 | Battle Records Page | — | — | Battle record save/retrieve | Open Graph meta | — | ⚠️ Partial |
| US-RARITY-001 | Rarity Scoring | — | `leaderboard-ui.feature` (10) | — | — | Visual regression: Legendary border | ⚠️ Partial |
| US-TRADE-001 | Pet Trading Marketplace | — | — | — | — | — | ⏸ Deferred (P2) |
| US-ADMIN-001 | Admin Pet Management | — | `admin-portal.feature` (13) | — | Ban propagation | Perf: search ≤2 s for 1 M records | ✅ Covered |
| US-ADMIN-002 | Admin Leaderboard Moderation | `leaderboard.feature` (3) | `admin-portal.feature` (13) | — | — | — | ✅ Covered |
| US-ADMIN-003 | Admin Runtime Parameter Tuning | — | `admin-portal.feature` (13) | — | Config cache refresh | — | ✅ Covered |
| US-ADMIN-004 | GDPR Data Erasure | `gdpr-erasure.feature` (2) | — | — | — | — | ✅ Covered |
| US-ADMIN-005 | Suspicious Battle Detection | `suspicious-detection.feature` (3) | — | — | — | — | ✅ Covered |
| US-ADMIN-006 | Game Economy Configuration | — | `admin-portal.feature` (13) | — | Config cache refresh; food buff multiplier | — | ✅ Covered |
| NFR-XCUT-001 | Cross-cutting non-functional: auth security hardening, rate limiting, COPPA age gate, email enumeration prevention | `claim-flow.feature` (4) | `claim-flow-ui.feature` (10) | OTP expiry | One-time token | Security: email enumeration; rate limit; COPPA | ✅ Covered |

---

## Coverage

### Coverage by Epic

| Epic | Total Stories | Covered | Partial | Deferred | Not Covered | Epic Coverage % |
|---|---|---|---|---|---|---|
| EPIC-PET | 2 | 2 | 0 | 0 | 0 | 100% |
| EPIC-AUTH | 2 | 2 | 0 | 0 | 0 | 100% |
| EPIC-TRAINING | 2 | 2 | 0 | 0 | 0 | 100% |
| EPIC-ARENA | 2 | 2 | 0 | 0 | 0 | 100% |
| EPIC-RANKING | 3 | 1 | 2 | 0 | 0 | 33% |
| EPIC-MARKETPLACE | 1 | 0 | 0 | 1 | 0 | 0% (deferred) |
| EPIC-ADMIN | 6 | 6 | 0 | 0 | 0 | 100% |
| **Total** | **18** | **15** | **2** | **1** | **0** | **83%** |

### Overall Coverage

Excluding the formally deferred US-TRADE-001 (P2, `FF_MARKETPLACE` off), **15 of 17 active user stories are fully covered** (88%). Including the deferred story, the uncapped ratio is **15 fully covered, 2 partial, 1 deferred** out of 18, yielding an overall percentage of **83%** against all requirements.

### Gaps and Notes

**US-RARITY-001 — Rarity Scoring (⚠️ Partial)**
US-RARITY-001 is covered by client-side BDD scenarios in `leaderboard-ui.feature` and a visual regression test verifying the Legendary border rendering. However, the rarity scoring algorithm — which runs server-side and determines the tier classification for each generated pet — has no BDD-Server feature file, no unit tests, and no integration tests. This is a logic coverage gap: the visual presentation is verified but the underlying calculation is not. Recommend adding at minimum a `rarity-scoring.feature` in `features/server/` and a unit test suite for the scoring formula before the story can be promoted to Covered status.

**US-RECORD-001 — Battle Records Page (⚠️ Partial)**
US-RECORD-001 is covered by unit tests (battle record save/retrieve) and an integration test verifying Open Graph meta tags on the records page. However, no dedicated BDD feature file exists for this story in the current sprint scope. The existing coverage is sufficient for v1 release confidence, but a `battle-records.feature` file should be created before the story is promoted to "fully covered" status. Recommend adding a minimum of 3–4 BDD scenarios covering record pagination, per-pet filtering, and empty-state rendering.

**US-TRADE-001 — Pet Trading Marketplace (⏸ Deferred P2)**
No test coverage is planned for v1. The feature is locked behind the `FF_MARKETPLACE` feature flag and will not be activated until the platform reaches a DAU threshold of 1,000. All test planning for this epic is deferred to the marketplace milestone. When activated, this story will require BDD feature files (both server and client), unit tests for trade validation logic, integration tests for transaction atomicity, and security tests for fraud prevention.

**US-ADMIN-004 and US-ADMIN-005 — PRD Expansion Pending**
Both stories are exercised by server BDD features (`gdpr-erasure.feature`, `suspicious-detection.feature`) but have not yet been formally expanded with full acceptance criteria in the PRD. The AC Count listed in the Requirements table reflects current working estimates. These stories should be formally expanded in the PRD before the v1 code freeze to ensure the BDD scenario count is validated against final acceptance criteria.
