# Requirement Traceability Matrix

| | |
|---|---|
| **DOC-ID** | RTM-PIXEL-PET-001 |
| **Project** | pixel-pet-arena |
| **Date** | 2026-05-03 |
| **Version** | 1.0.0 |

---

## Overview

This Requirement Traceability Matrix (RTM) maps all 17 user stories defined in the pixel-pet-arena PRD to their corresponding test coverage assets across four test layers: BDD (server-side and client-side Cucumber/Gherkin feature files), unit tests, integration tests, and cross-cutting performance and security tests.

The scope covers the v1 release milestone. Coverage is assessed at the user story level; each row records which specific feature files exercise a story and which additional test categories supplement BDD coverage. One cross-cutting non-functional requirements row captures platform-wide concerns (authentication security hardening, rate limiting, and COPPA compliance) that span multiple stories.

US-TRADE-001 (Pet Trading Marketplace, P2) is formally deferred behind feature flag `FF_MARKETPLACE`, with no test coverage planned until DAU exceeds 1,000. US-ADMIN-004 and US-ADMIN-005, while not yet fully expanded in the PRD, are exercised through dedicated server BDD features and are tracked in this matrix to ensure gap visibility before v1 launch.

The methodology follows forward traceability: each user story is the anchor, with test assets linked forward from requirements to verification evidence.

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
| EPIC-ADMIN | 5 | 5 | 0 | 0 | 0 | 100% |
| **Total** | **17** | **14** | **2** | **1** | **0** | **82%** |

### Overall Coverage

Excluding the formally deferred US-TRADE-001 (P2, `FF_MARKETPLACE` off), **14 of 16 active user stories are fully covered** (88%). Including the deferred story, the uncapped ratio is **14 fully covered, 2 partial, 1 deferred** out of 17, yielding an overall percentage of **82%** against all requirements.

### Gaps and Notes

**US-RARITY-001 — Rarity Scoring (⚠️ Partial)**
US-RARITY-001 is covered by client-side BDD scenarios in `leaderboard-ui.feature` and a visual regression test verifying the Legendary border rendering. However, the rarity scoring algorithm — which runs server-side and determines the tier classification for each generated pet — has no BDD-Server feature file, no unit tests, and no integration tests. This is a logic coverage gap: the visual presentation is verified but the underlying calculation is not. Recommend adding at minimum a `rarity-scoring.feature` in `features/server/` and a unit test suite for the scoring formula before the story can be promoted to Covered status.

**US-RECORD-001 — Battle Records Page (⚠️ Partial)**
US-RECORD-001 is covered by unit tests (battle record save/retrieve) and an integration test verifying Open Graph meta tags on the records page. However, no dedicated BDD feature file exists for this story in the current sprint scope. The existing coverage is sufficient for v1 release confidence, but a `battle-records.feature` file should be created before the story is promoted to "fully covered" status. Recommend adding a minimum of 3–4 BDD scenarios covering record pagination, per-pet filtering, and empty-state rendering.

**US-TRADE-001 — Pet Trading Marketplace (⏸ Deferred P2)**
No test coverage is planned for v1. The feature is locked behind the `FF_MARKETPLACE` feature flag and will not be activated until the platform reaches a DAU threshold of 1,000. All test planning for this epic is deferred to the marketplace milestone. When activated, this story will require BDD feature files (both server and client), unit tests for trade validation logic, integration tests for transaction atomicity, and security tests for fraud prevention.

**US-ADMIN-004 and US-ADMIN-005 — PRD Expansion Pending**
Both stories are exercised by server BDD features (`gdpr-erasure.feature`, `suspicious-detection.feature`) but have not yet been formally expanded with full acceptance criteria in the PRD. The AC Count listed in the Requirements table reflects current working estimates. These stories should be formally expanded in the PRD before the v1 code freeze to ensure the BDD scenario count is validated against final acceptance criteria.
