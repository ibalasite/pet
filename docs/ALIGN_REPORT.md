# gendoc — Cross-File Alignment Audit Report

**Project:** pixel-pet-arena  
**Date:** 2026-05-04  
**Execution Mode:** gendoc-align-check  
**Repository Type:** BDD Documentation + Game Design Specification (no implementation code)

---

## Executive Summary

| Dimension | CRITICAL | HIGH | MEDIUM | LOW | Total | Status |
|-----------|----------|------|--------|-----|-------|--------|
| **0: File Existence** | 0 | 1 | 0 | 0 | 1 | ⚠️ |
| **1: Doc → Doc** | 0 | 2 | 5 | 4 | 11 | ⚠️ |
| **2: Doc → Code** | 1 | 0 | 0 | 0 | 1 | 🔴 |
| **3: Code → Test** | 1 | 2 | 0 | 0 | 3 | 🔴 |
| **4: Doc → Test** | 2 | 5 | 2 | 0 | 9 | 🔴 |
| **5: UML/RTM Quality** | 0 | 2 | 3 | 0 | 5 | ⚠️ |
| **TOTAL** | **4** | **12** | **10** | **4** | **30** | 🔴 |

**Overall Status:** ⚠️ **MODERATE RISK** — Project has comprehensive documentation (28 files, 1,797 BDD lines) but critical gaps in:
1. Test implementation (0 step definitions, 0 executable tests)
2. Source code (specification-only repository)
3. Traceability (RTM incomplete, missing scenario mappings)
4. Supporting documentation (README, background job specs, UML diagrams)

---

## Dimension 0: Mandatory File Existence

### Findings

**[HIGH] MISSING: docs/README.md**
- Impact: Project lacks high-level overview for contributors
- Fix: Create README.md with project summary, setup instructions, and documentation navigation
- Auto-fixable: YES (documentation only)

**Status:** 1/1 file checks failed  
**Severity Distribution:** HIGH=1

---

## Dimension 1: Document → Document Alignment

### Critical Findings (0/11)
None

### High-Priority Findings (2/11)

**[HIGH] BDD-client.md and BDD-server.md Missing**
- Issue: BDD specifications are present in features/*.feature and features/client/*.feature but summarized documentation files are absent
- Impact: New team members cannot understand test strategy at a glance; traceability to PRD is implicit rather than explicit
- Fix: Create docs/BDD-server.md and docs/BDD-client.md summarizing each feature file's scenarios and linking to PRD AC numbers
- Auto-fixable: YES (consolidate feature file headers into markdown)

**[HIGH] Feature Flag Gating Logic Not Clearly Separated from SCHEMA**
- Issue: EDD §4.11-4.12 defines marketplace as "Phase 3 — FF_MARKETPLACE required", but SCHEMA.md creates marketplace tables unconditionally
- Impact: Future maintainers may not understand that table presence ≠ feature active
- Fix: Add note to SCHEMA.md §2.8: "marketplace_listings and marketplace_transactions tables exist in base schema. Feature flag FF_MARKETPLACE gates all write endpoints and admin/player UIs; read-only queries on empty tables are safe."
- Auto-fixable: YES (documentation clarification)

### Medium-Priority Findings (5/11)

**[MEDIUM] EDD § 4.3 ClaimCode Background Job Not Documented**
- Issue: SCHEMA.md §2.3 defines indexes for cleanup (idx_claim_codes_created_at, idx_claim_codes_used_at) but the actual scheduled job deletion logic is not specified
- Impact: Operations team may overlook implementing the cleanup job
- Fix: Create docs/background-jobs.md documenting all recurring jobs (claim code cleanup 72h, leaderboard snapshots, food buff record cleanup, pet reservation expiry)
- Auto-fixable: NO (requires ops collaboration)

**[MEDIUM] FRONTEND.md Missing Token Recovery Flow**
- Issue: PRD US-AUTH-002 AC-004-2 specifies "player can request new access link", API.md defines POST /api/v1/claim/recover, but FRONTEND.md §5.1 (Pet Claim Flow) does not include recovery UI component
- Impact: Frontend implementation may be unclear about where/when to show recover link
- Fix: Add FRONTEND §5.2 "Token Recovery Flow" with component diagram
- Auto-fixable: YES (documentation + component design)

**[MEDIUM] Social OG Tag Fields Not Fully Specified in API Response**
- Issue: VDD §7 (Asset Pipeline) requires pet name, rarity, win count, and sprite image for Open Graph cards. API.md GET /api/v1/arena/match/:matchId returns name/rarity/level but NOT winCount summary
- Impact: Client may compute winRate from match history, but OG tags could be incomplete
- Fix: API.md should clarify that GET /api/v1/arena/history/:petId (not /arena/match/:matchId) is the source for OG metadata, including win count summary
- Auto-fixable: YES (API documentation clarification)

**[MEDIUM] Admin Session TTL Not Explicitly Stated in FRONTEND**
- Issue: SCHEMA.md §4.3 documents Redis TTL = 14400s (4h) for admin sessions, but FRONTEND.md §3.2 (Admin Portal) does not state this timeout explicitly
- Impact: Frontend session refresh logic may diverge from backend TTL
- Fix: FRONTEND §3.5 (Routing, Admin Auth) should state: "Admin sessions expire after 4 hours of inactivity (admin_session_inactivity_expiry_hours = 14400)"
- Auto-fixable: YES (documentation)

**[MEDIUM] PRD AC Numbers Not Cross-Referenced in EDD Data Models**
- Issue: PRD defines AC-005-6 ("stat at max = 100"), EDD §4.1 Pet table has CHECK constraint, but no comment links constraint to AC number
- Impact: Future maintainers cannot trace constraint justification back to requirement
- Fix: Add EDD.md column comments: `COMMENT: "Range enforced by PRD AC-005-6"`
- Auto-fixable: YES (documentation)

### Low-Priority Findings (4/11)

**[LOW] ARCH vs. EDD Service Specification Redundancy**
- Issue: Both ARCH.md and EDD.md state that API and Admin servers are separate Node.js/Fastify processes
- Impact: None (acceptable duplication at different abstraction levels)
- Fix: No action needed

**[LOW] Admin Portal Route Prefix Inconsistency**
- Issue: FRONTEND.md §3.5 states path `/admin`, ARCH.md §2.1 mentions "separate Vite application" without confirming prefix
- Impact: Deployment-time configuration issue (can be changed via VITE_ADMIN_BASE_URL env var)
- Fix: Add FRONTEND.md note: "Route prefix `/admin` is configurable via VITE_ADMIN_BASE_URL environment variable"
- Auto-fixable: YES (documentation)

**[LOW] CONSTANTS Definition Not Hyperlinked**
- Issue: EDD.md §0 references CONSTANTS-PIXEL-PET-ARENA but does not link to a CONSTANTS.md file
- Impact: Navigation difficulty only
- Fix: Add hyperlinks to EDD.md §0 constant table referencing CONSTANTS.md sections
- Auto-fixable: YES (documentation links)

---

## Dimension 2: Document → Code Alignment

### Critical Findings (1/1)

**[CRITICAL] NO SOURCE CODE REPOSITORY — SPECIFICATION-ONLY PROJECT**
- Issue: This repository contains only BDD feature specifications (features/), documentation (docs/), and pipeline templates (templates/). NO implementation code exists in src/, no ORM models, no route handlers, no migrations.
- Impact: Dimension 2 audit cannot validate API.md ↔ implementation, SCHEMA.md ↔ database models, ARCH.md ↔ component organization
- Recommendation: 
  - **Option A** (Documentation-only audit): This repo is for design/documentation only. Code alignment checks are N/A.
  - **Option B** (Full-stack validation): Provide the actual backend repository (Node.js/Fastify API, database migrations, route handlers) to validate against SCHEMA.md, API.md, EDD.md, ARCH.md
- Auto-fixable: NO (requires linking to code repository)

**Note:** All other Dimension 2 findings (API endpoint validation, SCHEMA model coverage, directory structure alignment) are blocked pending source code availability.

---

## Dimension 3: Code → Test Alignment

### Critical Findings (1/3)

**[CRITICAL] BDD Features Without Test Implementation — Zero Executable Tests**
- Issue: 23 feature files (1,797 lines of Gherkin) have **no corresponding step definitions, test runners, or executable test code**. All scenarios are specifications only.
- Unimplemented feature files:
  - Server: arena-battle.feature, claim-flow.feature, gdpr-erasure.feature, leaderboard.feature, suspicious-detection.feature, training-food.feature (172 steps)
  - Client: admin-portal.feature, arena-ui.feature, battle-records.feature, claim-flow-ui.feature, food-system.feature, leaderboard-ui.feature, pet-display.feature, settings.feature, training-ui.feature (1,071 steps)
  - Root: auth-login.feature, pet-management.feature, pet-training.feature, arena-combat.feature, arena-leaderboard.feature, trading-system.feature, admin-moderation.feature, admin-gdpr.feature (554 steps)
- Impact: 100% of BDD scenarios are unrunnable; test coverage = 0%
- Root Cause: This is a specification repository without an accompanying test implementation repository
- Fix: 
  1. Create step definitions for Cucumber (Backend BDD via cucumber-js + Node.js test harness)
  2. Create E2E test implementations for Playwright (Frontend BDD via playwright + cucumber-js)
  3. Set up CI/CD pipeline to execute tests on every commit
- Auto-fixable: NO (requires engineering implementation of 50+ step definitions)

### High-Priority Findings (2/3)

**[HIGH] Server-Side Step Definitions Missing**
- Issue: 6 server feature files (172 Gherkin scenario steps) have no Cucumber step implementation
- Impact: Backend API business logic is unvalidated; no regression prevention capability
- Files affected: features/server/*.feature
- Fix: Implement Cucumber step definitions mapping Given/When/Then to API test calls
- Auto-fixable: NO

**[HIGH] Client-Side Step Definitions Missing**
- Issue: 10 client feature files (1,071 Gherkin scenario steps) have no Playwright/E2E test implementation
- Impact: Frontend UI/UX is unvalidated; no end-to-end test automation
- Files affected: features/client/*.feature
- Fix: Implement Playwright test harness with Cucumber integration for client scenarios
- Auto-fixable: NO

---

## Dimension 4: Document → Test Alignment

### Critical Findings (2/9)

**[CRITICAL] Test Implementation Layer Missing — Test Coverage = 0%**
- Issue: BDD feature files (131 total scenarios) exist but zero test infrastructure (no step definitions, no test runners, no CI/CD integration)
- Impact: All 131 BDD scenarios are aspirational specifications with no execution capability
- Fix: Implement full test stack (cucumber-js + Node.js for backend, Playwright for E2E)
- Auto-fixable: NO

**[CRITICAL] Root-Level Feature Files Conflict with Server/Client Organization**
- Issue: 8 feature files at /features/*.feature (auth-login.feature, arena-combat.feature, etc.) appear to duplicate content from /features/server/ and /features/client/. RTM references only server/ and client/ features, leaving root features orphaned from traceability matrix.
- Impact: Unclear which feature files are authoritative (root 798 lines vs. server+client 743 lines); duplicate specification effort
- Root Cause: Unclear migration from root organization to subdirectory organization
- Fix: Either (1) remove root-level features and consolidate into server/client directories, or (2) formally document which are canonical and update RTM to list all feature locations
- Auto-fixable: MAYBE (if root features are deprecated, can be archived)

### High-Priority Findings (5/9)

**[HIGH] AC-007-8 MISSING HTTP 429 Rate Limit Response Scenario**
- Issue: PRD AC-007-8 (Arena rate limit 10 battles/hour) requires HTTP 429 with Retry-After header and specific UI countdown timer message. Server feature arena-battle.feature has only 3 scenarios and does not validate 429 response structure. Client arena-ui.feature has "rate limit" scenarios but no pairing to HTTP 429 error response.
- Impact: AC-007-8 partially tested; error response validation missing
- Fix: Add scenario to server arena-battle.feature validating HTTP 429 response body with Retry-After header and countdown time
- Auto-fixable: NO (new scenario required)

**[HIGH] US-RARITY-001 — Rarity Scoring Algorithm Has No Server Test**
- Issue: RTM marks US-RARITY-001 as "Partial" (⚠️). Rarity probabilistic distribution (Common 60%, Rare 25%, Epic 12%, Legendary 3%) is mentioned in AC-002-5 but has no server BDD feature or unit test. Client leaderboard-ui.feature tests legendary border rendering but server-side algorithm is untested.
- Impact: AC-002-5 rarity distribution validation missing; statistical guarantee unverified
- Fix: Create features/server/rarity-scoring.feature with scenarios validating the probabilistic distribution across 10,000+ pet generations
- Auto-fixable: NO

**[HIGH] US-RECORD-001 — Battle Records Partially Tested**
- Issue: RTM marks US-RECORD-001 as "Partial" (⚠️). Client feature battle-records.feature (126 lines, 16 scenarios) exists, but no server BDD feature validates record persistence, pagination, or Open Graph generation.
- Impact: AC-010-1 through AC-010-6 (public battle records page) lack server-side BDD validation
- Fix: Create features/server/battle-records.feature with scenarios for persistence, pagination boundary (last 20 battles), empty state, and OG meta tag generation
- Auto-fixable: NO

**[HIGH] AC-003-6 Email Enumeration Prevention — Timing Assertion Missing**
- Issue: AC-003-6 requires "identical response structure and timing" for valid/invalid pet IDs. Server feature claim-flow.feature has scenario "Email enumeration prevention" but lacks timing assertion (only checks response structure).
- Impact: Timing-based security vulnerability not validated
- Fix: Add timing measurement assertion (< 50ms variance) to email enumeration scenario in features/server/claim-flow.feature
- Auto-fixable: MAYBE (add assertion to existing scenario)

**[HIGH] FRONTEND.md Pages Not Fully Mapped to BDD Client Features**
- Issue: FRONTEND.md §2.1 lists LandingPage, ClaimPage, PetPage, TrainingUI, ArenaUI, LeaderboardPage, BattleRecordsPage, SettingsPage. Not all map cleanly to feature files. E.g., admin SettingsPage (ADMIN_IMPL.md) references admin-portal.feature, but player SettingsPage references settings.feature — naming ambiguity.
- Impact: Unclear component-to-feature mapping
- Fix: Clarify FRONTEND.md that player-app settings.feature is for user-level settings; admin settings are in ADMIN_IMPL.md/admin-portal.feature
- Auto-fixable: MAYBE (clarify naming)

### Medium-Priority Findings (2/9)

**[MEDIUM] AC-016-2 GDPR Email Hashing SLA Ambiguity — 24h vs 7d**
- Issue: AC-016-2 states "email_encrypted set to NULL within 24 hours (not the full 7-day window — completed within 1 day, reported as compliant within 7 days)". Server feature gdpr-erasure.feature scenario says "within 24 hours" but does not distinguish between internal SLA (24h) and external SLA (7d).
- Impact: Scenario wording does not make explicit the two-tier SLA
- Fix: Clarify scenario: "email_encrypted is hashed within 24 hours (internal SLA) and user is notified within 7 days (external SLA)"
- Auto-fixable: YES (clarify scenario wording)

**[MEDIUM] AC-013-4 Admin Search Performance — "≤2 seconds for 1M records" Has No Load Test**
- Issue: AC-013-4 requires search within 2 seconds for "up to 1 million records". No performance test scenario exists in BDD features or test-plan.md to validate this boundary.
- Impact: Performance boundary unverified
- Fix: Add load test scenario in test-plan.md documenting 1M record search validation
- Auto-fixable: NO (requires performance test infrastructure)

---

## Dimension 5: UML/RTM Quality

### High-Priority Findings (2/5)

**[HIGH] EDD Class Diagram Incomplete — 0 Classes Found (<6 minimum)**
- Issue: EDD.md is expected to contain class diagrams, but scanning found 0 class definitions and 0 diagram sections (< 6 classes, < 9 UML diagrams expected)
- Impact: EDD lacks visual architecture representation; difficult for new developers to understand entity relationships
- Fix: Add class diagrams to EDD.md §2 showing Pet, Arena, ClaimCode, User, Food, Battle, Leaderboard, Session, Transaction entities and their relationships
- Auto-fixable: NO (requires UML architecture design)

**[HIGH] RTM Does Not Reference All BDD Scenario Files**
- Issue: RTM.md table rows (57) do not map to all BDD feature files (23 files). RTM contains only references to server/ and client/ features, omitting 8 root-level feature files.
- Impact: 798 lines of specification code (root features) are not part of the official traceability matrix
- Fix: Either (1) remove root features or (2) add all feature file references to RTM with explicit mapping to each PRD AC
- Auto-fixable: MAYBE (if root features are consolidated)

### Medium-Priority Findings (3/5)

**[MEDIUM] PlantUML Diagram Files Missing**
- Issue: docs/diagrams/puml/ directory does not exist or contains no .puml files
- Impact: Automated diagram generation from code is not enabled
- Fix: Create docs/diagrams/puml/ directory and generate PlantUML source files for each UML diagram
- Auto-fixable: NO (requires diagram tool integration)

**[MEDIUM] UML 9 Major Diagrams Incomplete — 0/9 Found**
- Issue: Expected 9 major UML diagrams (Class, Sequence, State, Component, Deployment, Use Case, Interaction, Timing, Profile) in EDD.md, but none found
- Impact: Architectural documentation incomplete; difficult to understand system design
- Fix: Add 9 UML diagram sections to EDD.md covering core architecture
- Auto-fixable: NO (requires architecture design work)

**[MEDIUM] RTM.csv Not Found — Machine-Readable Traceability Missing**
- Issue: docs/RTM.csv does not exist; only RTM.md (markdown table) is available
- Impact: Traceability matrix cannot be easily imported into test management tools or automated dashboards
- Fix: Generate docs/RTM.csv with columns: AC_ID, AC_Description, BDD_Scenario, Test_ID, Coverage_Status
- Auto-fixable: YES (export RTM.md table to CSV)

---

## Recommendations by Priority

### BLOCKING (Complete Before Proceeding)

1. **[CRITICAL]** Implement test execution layer:
   - Create step definitions for 23 BDD feature files (50+ step definitions)
   - Set up Cucumber-JS test runner for backend, Playwright for E2E
   - Configure CI/CD pipeline to run tests on commits
   - **Owner:** Backend + QA Engineering
   - **Effort:** 2-3 weeks

2. **[CRITICAL]** Clarify root vs. server/client feature organization:
   - Remove or consolidate 8 root-level feature files OR update RTM to include them
   - Ensure single source of truth for each scenario
   - **Owner:** BA/QA Lead
   - **Effort:** 2-3 days

### HIGH (Complete Within 1 Sprint)

3. Add missing documentation files:
   - Create docs/README.md (project overview)
   - Create docs/BDD-server.md and docs/BDD-client.md (test strategy)
   - Create docs/background-jobs.md (ops spec)
   - **Effort:** 3 days

4. Create comprehensive UML diagrams in EDD.md:
   - Class diagram (entity relationships)
   - Sequence diagrams (auth, battle, leaderboard flows)
   - State diagrams (pet, battle states)
   - **Effort:** 1 week

5. Reconcile RTM with all feature files:
   - Map all 23 BDD feature files to RTM
   - Generate RTM.csv for tool integration
   - **Effort:** 2-3 days

### MEDIUM (Document Improvements)

6. Clarify feature flag logic in SCHEMA.md and EDD.md
7. Add explicit GDPR SLA wording (24h internal vs. 7d external)
8. Cross-reference PRD AC numbers in EDD column comments
9. Add FRONTEND token recovery flow (§5.2)
10. Clarify admin session TTL in FRONTEND.md

---

## Next Steps

**Immediate Actions:**

```bash
# Option A: Fix documentation alignment only (Dimensions 0, 1, 5)
/gendoc-align-fix docs

# Option B: Full pipeline (including code/test alignment, requires implementation repos)
# Not applicable until source code repository is provided
```

**For Full-Stack Alignment:**

When backend implementation code (Node.js/Fastify, database migrations) and test implementations (Cucumber step definitions, Playwright tests) are available, run:

```bash
/gendoc-align-check  # Re-run all 5 dimensions
```

---

## Appendix: Finding Summaries

### By Layer

| Layer | CRITICAL | HIGH | MEDIUM | LOW |
|-------|----------|------|--------|-----|
| Dimension 0: File Existence | 0 | 1 | 0 | 0 |
| Dimension 1: Doc → Doc | 0 | 2 | 5 | 4 |
| Dimension 2: Doc → Code | 1* | 0 | 0 | 0 |
| Dimension 3: Code → Test | 1* | 2 | 0 | 0 |
| Dimension 4: Doc → Test | 2 | 5 | 2 | 0 |
| Dimension 5: UML/RTM | 0 | 2 | 3 | 0 |
| **TOTAL** | **4** | **12** | **10** | **4** |

*Dimension 2 & 3 findings are blocked (code repository unavailable).

### By Fix Complexity

| Category | Count | Auto-Fixable | Notes |
|----------|-------|--------------|-------|
| Critical | 4 | NO | Requires engineering (test implementation, code repo) |
| Documentation | 13 | YES | Can be written/updated immediately |
| Architectural | 8 | NO | Requires design review + implementation |
| Organization | 3 | MAYBE | Depends on consolidation decision |
| Clarification | 2 | YES | Simple wording improvements |

---

**Report Generated:** 2026-05-04 23:15 UTC  
**Status:** Ready for /gendoc-align-fix (documentation phase)  
**Blocking Items:** 2 (test implementation, source code availability)
