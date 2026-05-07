# gendoc — Alignment Scan Report

| | |
|---|---|
| **Project** | pixel-pet-arena |
| **Path** | `/Users/tobala/projects/pet` |
| **Date** | 2026-05-08 |
| **State** | `client_type=game`, `has_admin_backend=true` |
| **Last completed step** | UML-CICD |
| **Implementation status** | Pre-implementation (no `src/` or `tests/` yet — documentation-only project) |
| **Scan tool** | `/gendoc-align-check` (read-only audit) |

---

## Summary

```
╔══════════════════════════════════════════════════════════════════╗
║          gendoc — Alignment Scan Summary                         ║
║          Project: pixel-pet-arena    Date: 2026-05-08            ║
╠══════════════════════════════════════════════════════════════════╣
║  Dimension              CRITICAL  HIGH  MEDIUM  LOW  Total  Status║
║  Dim 0  File presence       0       0      0     0     0    OK   ║
║  Dim 1  Doc → Doc           0       6      4     2    12    !!   ║
║  Dim 2  Doc → Code          0       0      0     0     0    N/A  ║
║  Dim 3  Code → Test         0       0      0     0     0    N/A  ║
║  Dim 4  Doc → Test          1       3      2     0     6    !!!  ║
║  Dim 5  UML/RTM Quality     0       2      3     0     5    !!   ║
╠══════════════════════════════════════════════════════════════════╣
║  Total                      1      11      9     2    23         ║
╚══════════════════════════════════════════════════════════════════╝
```

**Pre-implementation note**: `src/` and `tests/` directories do not yet exist. Dimensions 2 and 3 (Doc→Code and Code→Test) are intentionally returned with zero findings and treated as **N/A — expected pre-impl state**, not as gaps. This audit focuses on doc-doc, doc-test, and UML/RTM structural quality, which are the relevant alignment surfaces before code is written.

---

## Dimension 0 — File presence (Pipeline outputs)

All 25 required pipeline outputs are present and non-empty under the active conditions (`client_type=game`, `has_admin_backend=true`):

- 22 docs/*.md files (IDEA, BRD, PRD, CONSTANTS, PDD, VDD, EDD, ARCH, API, SCHEMA, FRONTEND, AUDIO, ANIM, CLIENT_IMPL, ADMIN_IMPL, RESOURCE, test-plan, RTM, runbook, LOCAL_DEPLOY, CICD, DEVELOPER_GUIDE)
- features/ — 11 server feature files
- features/client/ — 9 client feature files
- README.md

**No findings.** Findings count: 0.

---

## Dimension 1 — Doc → Doc Alignment

### [HIGH] D1-01 — SCHEMA → EDD: Table-name divergence (admin_accounts vs admin_users)

- **Source → Target**: SCHEMA.md §2.10 → EDD.md §4.9
- **Description**: SCHEMA defines the table as `admin_accounts`. EDD §4.9 is titled "AdminUser" and references the table as `admin_users` (line 816 index, line 824 FK, line 1639 schema list). Three downstream documents (API.md cross-references, FRONTEND.md, ADMIN_IMPL.md) follow EDD's `admin_users` name; SCHEMA is the only source that uses `admin_accounts`.
- **Conflict type**: B1 — downstream (EDD/API/FRONTEND/ADMIN_IMPL) is consistent and matches the existing EDD §4.9 ORM name; upstream SCHEMA introduced a divergent spelling at DDL time. Recommend updating SCHEMA to `admin_users` (or, alternately, updating EDD/API/FRONTEND/ADMIN_IMPL/EDD §13 to `admin_accounts` — pick one canonical name).
- **Affected scope**: Migrations, ORM models, every reference to admin login, audit log FK target.
- **Suggested fix**: Choose one canonical name (recommend `admin_users` for consistency with EDD class-diagram + 4 downstream docs) and rename in SCHEMA + DDL.
- **Auto-fixable**: YES.

### [HIGH] D1-02 — SCHEMA → EDD: Table-name divergence (admin_audit_log vs audit_logs)

- **Source → Target**: SCHEMA.md §2.11 → EDD.md §4.10
- **Description**: SCHEMA defines `admin_audit_log`. EDD §4.10 indexes use `audit_logs` (line 833) and the schema list at line 1639 also uses `audit_logs`. SCHEMA comments (line 268) reference `admin_audit_log.detail` from arena_matches comment.
- **Conflict type**: B1 — same axis as D1-01.
- **Affected scope**: Audit log index migrations, every admin endpoint that writes audit rows.
- **Suggested fix**: Pick one canonical name; rename in losing-side doc(s).
- **Auto-fixable**: YES.

### [HIGH] D1-03 — SCHEMA → EDD: Table-name divergence (marketplace_transactions vs trade_records)

- **Source → Target**: SCHEMA.md §2.9 → EDD.md §4.11
- **Description**: SCHEMA names the trade table `marketplace_transactions`. EDD §4.11 calls it `TradeRecord` and the index uses `trade_records` (line 849).
- **Conflict type**: B1.
- **Affected scope**: Marketplace migrations, transaction queries, anti-flip lookups, FK constraints.
- **Suggested fix**: Pick one canonical name (SCHEMA's `marketplace_transactions` is more descriptive); rename EDD §4.11 and any references.
- **Auto-fixable**: YES.

### [HIGH] D1-04 — features/ ↔ docs/RTM.md: Duplicate feature directories (features/ AND features/server/)

- **Source → Target**: features/ tree ↔ docs/RTM.md §"BDD Feature File Inventory"
- **Description**: 11 server feature files are duplicated identically (byte-for-byte) in both `features/` and `features/server/`. RTM lines 32-37 reference paths under `features/server/`, but BDD-server.md, the docs/MANIFEST.md inventory, and the gendoc-flow pipeline expect `features/`. RTM's "BLOCKING FINDING" at lines 71-75 already flags this issue.
- **Conflict type**: B-待確認 — Two viable resolutions:
  - **Option A** (Archive root features): Delete the 11 root-level `features/*.feature` files and keep only `features/server/`. Update BDD-server.md, RTM, and pipeline to consistently use `features/server/`.
  - **Option B** (Archive server/ duplicates): Delete the 11 files in `features/server/` and update RTM to reference `features/*.feature`. Aligns with Cucumber.js default discovery and the gendoc pipeline's `features/` output spec.
- **Affected scope**: BDD discovery, test runners, RTM forward traceability, future test infrastructure.
- **Suggested fix**: Recommend **Option B** (delete `features/server/`, update RTM rows 32-37 to `features/<name>.feature`). Reason: pipeline.json declares output as `features/`, not `features/server/`; flatter structure matches Cucumber default. Either way, must pick one.
- **Auto-fixable**: YES (after canonical-path decision).

### [HIGH] D1-05 — features/rarity-distribution.feature → PRD: Unknown US-ID `US-GEN-001`

- **Source → Target**: features/rarity-distribution.feature (line 1) → PRD.md §5
- **Description**: `features/rarity-distribution.feature` (and `features/server/rarity-distribution.feature`) declares `Feature: Pet Rarity Distribution Algorithm (US-GEN-001)`. PRD has no `US-GEN-001`. The intent maps to **US-PET-002** (Procedural Pixel Pet Generation) and/or **US-RARITY-001** (Rarity Scoring). RTM does not link this feature file to any user story.
- **Conflict type**: 缺失 (orphan US-ID) → also B2 (downstream feature file uses an ID not in upstream PRD).
- **Affected scope**: BDD-PRD traceability, RTM forward link, RTM coverage matrix for US-PET-002/US-RARITY-001.
- **Suggested fix**: Replace `US-GEN-001` with `US-PET-002` (or split scenarios across US-PET-002 and US-RARITY-001) and add this feature to RTM rows for those stories. Also update `features/server/rarity-distribution.feature` if Option B from D1-04 is chosen.
- **Auto-fixable**: YES.

### [HIGH] D1-06 — RTM ↔ features/: Stale and incorrect coverage rows

- **Source → Target**: docs/RTM.md → actual features/
- **Description**: Multiple integrity issues found:
  - RTM line 26 claims "23 BDD feature files (1,797 Gherkin lines, 131 scenarios)". Actual: 31 feature files (counting both `features/` and `features/server/` duplicates), or 20 unique files if duplicates removed.
  - RTM line 28 claims "Server-Side Features (6 files, 172 scenarios)". Actual `features/server/`: 11 files. Actual scenario total computed inline: 75.
  - RTM line 38 totals server scenarios as **18** while line 28 header says 172 — internal contradiction within RTM itself.
  - RTM line 53 totals client scenarios as **113** while header says 1,071 — internal contradiction.
  - RTM line 117: US-RECORD-001 is marked as having no BDD-server feature ("⚠️ Partial"). Actual: `features/battle-records.feature` and `features/server/battle-records.feature` exist (7 scenarios, tagged US-RECORD-001).
  - RTM line 118: US-RARITY-001 marked "⚠️ Partial" — but `features/rarity-distribution.feature` exists (5 scenarios). Plus see D1-05 — its US-ID needs renaming.
  - RTM Coverage table line 143 reports 83% overall; actual coverage is closer to 100% once stale rows are corrected.
- **Conflict type**: 缺失 (downstream RTM has not been refreshed against the latest features/ directory).
- **Affected scope**: All forward traceability, release-readiness signals, audit posture.
- **Suggested fix**: Regenerate RTM from a fresh scan of features/ + PRD (the `RTM` step in pipeline.json). Resolve internal scenario-count contradictions (line 28 header vs line 38 total; line 40 header vs line 53 total). Re-link US-RECORD-001 and US-RARITY-001 as Covered.
- **Auto-fixable**: YES.

### [MEDIUM] D1-07 — features/ → PRD: US-ADMIN-006 has no BDD coverage

- **Source → Target**: PRD.md §19.4 (US-ADMIN-006) → features/
- **Description**: PRD.md US-ADMIN-006 (Game Economy Configuration, P1) defines AC-018-1 through AC-018-4 but no `features/admin-economy-config.feature` (server) or `features/client/economy-config-ui.feature` (client) exists. RTM line 125 lists US-ADMIN-006 as covered via `admin-portal.feature` (13) but this feature file's scenarios are general portal navigation, not the economy-config AC.
- **Conflict type**: 缺失.
- **Affected scope**: P1 admin functionality, RTM coverage claim.
- **Suggested fix**: Add scenarios to `admin-portal.feature` explicitly tagged with US-ADMIN-006 OR create dedicated `features/economy-config.feature` covering AC-018-1..4.
- **Auto-fixable**: YES.

### [MEDIUM] D1-08 — features/trading-system.feature → PRD: Missing US-TRADE-001 tag

- **Source → Target**: features/trading-system.feature line 1 → PRD US-TRADE-001
- **Description**: `features/trading-system.feature` describes marketplace trade scenarios but does not tag itself with US-TRADE-001 in the Feature header (unlike most other feature files). Note: US-TRADE-001 is formally deferred behind `FF_MARKETPLACE`, but the feature file exists and should still be tagged for future RTM activation.
- **Conflict type**: 缺失 (missing trace tag).
- **Affected scope**: Future RTM activation when FF_MARKETPLACE turns on; current grep-based traceability.
- **Suggested fix**: Update Feature line to `Feature: Marketplace Trading System — Pet Sales and Anti-Flip Protection (US-TRADE-001) [FF_MARKETPLACE]`.
- **Auto-fixable**: YES.

### [MEDIUM] D1-09 — EDD → LOCAL_DEPLOY: No environment/port matrix in EDD

- **Source → Target**: EDD.md §3 → LOCAL_DEPLOY.md
- **Description**: The skill expects EDD §3.5 to contain a Local Namespace + Service Port matrix (Local/Staging/Production) so LOCAL_DEPLOY's port table can be cross-validated. EDD §3.5 instead documents Email Service. LOCAL_DEPLOY ports (`3000` API, `5173` player frontend, `5174` admin, `6379` Redis, `54321/22/23/24` Supabase stack) are documented unilaterally in LOCAL_DEPLOY without an upstream contract. No CRITICAL contradictions found between docs as written, but there is no traceable spec source for these ports.
- **Conflict type**: 缺失 (upstream contract missing; downstream is ad-hoc but currently not contradictory).
- **Affected scope**: docker-compose mode reproducibility, k8s manifest port consistency, troubleshooting.
- **Suggested fix**: Add a Service Port Reference subsection to EDD (§3.x) listing `service | local-port | staging-port | prod-port | k8s-port` — then verify LOCAL_DEPLOY matches.
- **Auto-fixable**: YES.

### [MEDIUM] D1-10 — EDD class diagram → SCHEMA: Class names diverge from table names

- **Source → Target**: EDD §3.8 Class Diagram (lines 269-329) → SCHEMA §2
- **Description**: EDD class diagram uses entity names `User`, `Pet`, `ClaimCode`, `ArenaMatch`, `TrainingLog`, `Leaderboard`. SCHEMA tables are `claim_identities`, `pets`, `claim_codes`, `arena_matches`, `training_logs`, `leaderboard_snapshots`. Note: EDD §4 calls the same entity "User / Email (ClaimIdentity)" — three different names for the same domain object across one document (User in class diagram, ClaimIdentity in §4.2 heading, claim_identities in SCHEMA).
- **Conflict type**: 缺失 / B2 (downstream introduced naming drift from upstream).
- **Affected scope**: Onboarding clarity, ORM model naming, code-gen scaffold.
- **Suggested fix**: Pick one canonical domain name (recommend `ClaimIdentity` matching EDD §4.2) and apply consistently across EDD class diagram, EDD §4 headings, SCHEMA table prose, and FRONTEND TypeScript interfaces.
- **Auto-fixable**: YES.

### [LOW] D1-11 — RTM line 161: Stale "PRD Expansion Pending" note

- **Source → Target**: docs/RTM.md line 160-161 → docs/PRD.md §19.4
- **Description**: RTM line 161 says US-ADMIN-004 and US-ADMIN-005 "have not yet been formally expanded with full acceptance criteria in the PRD". PRD §19.4 (lines 1449-1488) has full ACs for both — the note is stale.
- **Conflict type**: 缺失 (RTM not refreshed).
- **Suggested fix**: Remove or correct this paragraph during RTM regeneration.
- **Auto-fixable**: YES.

### [LOW] D1-12 — BDD-server.md → BDD-client.md: Both reference `features/server/` and `features/client/`

- **Source → Target**: docs/BDD-server.md line 17, etc.
- **Description**: BDD-server.md prose references feature files at `features/server/<name>.feature` paths consistently; BDD-client.md similarly references `features/client/`. If D1-04 is resolved by Option B (drop `features/server/`), BDD-server.md must be updated to `features/<name>.feature`.
- **Conflict type**: 缺失 / coupling — depends on D1-04 resolution.
- **Suggested fix**: Tie together with D1-04 fix.
- **Auto-fixable**: YES.

---

## Dimension 2 — Doc → Code Alignment

**Status: N/A (Pre-implementation).**

`src/` directory does not exist yet. This is **expected** — the project is currently in the documentation-and-test-spec phase (gendoc-flow has reached UML-CICD; CONTRACTS / scaffold / impl steps have not run). Once `src/` is created (likely from the `CONTRACTS` step's `docs/blueprint/scaffold/src/` output), this dimension should be re-scanned to verify:

- API.md endpoints (52 distinct endpoints across player + admin) ↔ `src/` route handlers
- SCHEMA.md tables (12) ↔ `src/models/` ORM definitions
- EDD §3 layered structure ↔ `src/` directory layout
- ARCH components ↔ src/ modules

**Findings**: 0 (deferred until impl exists).

---

## Dimension 3 — Code → Test Alignment

**Status: N/A (Pre-implementation).**

Neither `src/` nor `tests/` exists. test-plan.md §5-7 specifies extensive Unit/Integration/E2E suites (Vitest + Playwright), but no code or test files have been written. Re-scan once both directories are populated.

**Findings**: 0 (deferred until impl exists).

---

## Dimension 4 — Doc → Test Alignment

### [CRITICAL] D4-01 — features/ structural duplication blocks test discovery

- **Source → Target**: features/ tree
- **Description**: Identical scenarios appear under both `features/<name>.feature` and `features/server/<name>.feature` (11 file pairs, byte-identical). Any naive Cucumber.js / @cucumber/cucumber configuration will execute every scenario twice — inflating coverage metrics, doubling test runtime, and introducing nondeterminism if any scenario writes shared state. This is a CRITICAL test-infrastructure blocker.
- **Conflict type**: 缺失 / B-待確認 (depends on canonical-path decision; tied to D1-04).
- **Affected scope**: All future BDD test execution, CI runtime budget, RTM coverage accuracy.
- **Suggested fix**: Pick canonical path (Option B preferred — flat `features/`), delete the duplicate side, update BDD-server.md and RTM accordingly.
- **Auto-fixable**: YES.

### [HIGH] D4-02 — PRD US-ADMIN-006 → No BDD scenario explicitly tagged

- **Source → Target**: PRD §19.4 US-ADMIN-006 → features/
- **Description**: AC-018-1..4 (food buff multipliers, arena entry cooldown, arena entry cost) lack a dedicated feature file or scenarios tagged with US-ADMIN-006. RTM claims coverage via `admin-portal.feature`, but that file's scenarios are about login/role/audit-log, not economy-config edits. (See D1-07.)
- **Conflict type**: 缺失.
- **Affected scope**: P1 admin functionality test coverage.
- **Suggested fix**: Add 4 scenarios in admin-portal.feature (or create economy-config.feature) covering AC-018-1 through AC-018-4.
- **Auto-fixable**: YES.

### [HIGH] D4-03 — PRD US-RECORD-001 marked Partial despite having a feature

- **Source → Target**: docs/RTM.md line 117 → features/battle-records.feature
- **Description**: US-RECORD-001 is marked "⚠️ Partial — no BDD-server feature" in RTM, but `features/battle-records.feature` (7 scenarios) and `features/client/battle-records.feature` (19 scenarios) both exist and exercise battle-record save, retrieval, pagination, Open Graph meta tags, and per-pet filtering. This is an RTM-side miscount: actual coverage is full.
- **Conflict type**: 缺失 (RTM stale).
- **Suggested fix**: Update RTM US-RECORD-001 row to "Covered" with both feature files cited.
- **Auto-fixable**: YES.

### [HIGH] D4-04 — PRD US-RARITY-001 underreported coverage

- **Source → Target**: docs/RTM.md line 118 → features/rarity-distribution.feature
- **Description**: US-RARITY-001 marked "⚠️ Partial — no BDD-Server feature, no unit tests". `features/rarity-distribution.feature` exists (5 scenarios) but is tagged with the non-existent US-GEN-001 (see D1-05). After fixing the tag to US-PET-002 + US-RARITY-001, coverage moves from Partial → Covered for the BDD-server layer.
- **Conflict type**: 缺失 + B2 (downstream feature has wrong US-ID, RTM consequently fails to credit it).
- **Suggested fix**: Renaming under D1-05 + RTM regeneration under D1-06 resolves this.
- **Auto-fixable**: YES.

### [MEDIUM] D4-05 — RTM ↔ docs/RTM.csv: Two RTM artifacts may diverge

- **Source → Target**: docs/RTM.md ↔ docs/RTM.csv
- **Description**: Both `RTM.md` (161 lines) and `RTM.csv` (66 lines) exist. RTM.md has known stale rows (D1-06, D1-11, D4-03, D4-04). Whether RTM.csv reflects the same staleness or has been hand-curated separately is not directly verifiable without parsing both. Either way, two co-existing RTM artifacts are a divergence risk.
- **Conflict type**: 缺失 (drift risk).
- **Suggested fix**: Treat one as canonical (recommend RTM.csv as the machine-readable source of truth) and regenerate RTM.md from it, or vice versa, during the next RTM step.
- **Auto-fixable**: YES.

### [MEDIUM] D4-06 — test-plan.md → features/: test-plan references US-IDs that don't appear in features

- **Source → Target**: test-plan.md §5.6 (Level Formula Unit Tests) → features/
- **Description**: test-plan.md §5.6 specifies "Level Formula Unit Tests" but no feature scenario or US-ID maps the level-formula behavior (level: [1..100] mentioned in EDD class diagram but no feature scenario validates the formula). This will be caught at the unit-test layer once code lands, but BDD layer has no acceptance scenario.
- **Conflict type**: 缺失 (BDD scenario gap; unit-test plan covers it).
- **Suggested fix**: Optionally add a `Scenario: Level formula computes correctly` to `features/training-food.feature`. Not strictly required if unit-test layer is sufficient per testing strategy.
- **Auto-fixable**: YES.

---

## Dimension 5 — UML/RTM Quality

### [HIGH] D5-01 — EDD §3.8 missing 2-3 of the standard UML 9 diagrams

- **Source**: EDD.md §3.8 (lines 258-577)
- **Description**: §3.8 contains 7 diagram types: Class, Sequence (multiple), State, Component, Deployment, Use Case, Data Flow. The standard UML 9 set additionally requires: **Object Diagram**, **Activity Diagram**, **Communication Diagram**. While `docs/diagrams/` contains object-snapshot.md, activity-*.md, and communication.md as standalone files, EDD §3.8 (the inline reference) does not embed or reference all 9.
- **Affected scope**: Architectural completeness, code-gen scaffold inputs, ARCH+EDD review thoroughness.
- **Suggested fix**: Add §3.8.X subsections inside EDD that embed (or link to) the 3 missing diagram files in `docs/diagrams/`.
- **Auto-fixable**: YES.

### [HIGH] D5-02 — Class Diagram lacks composition / aggregation / inheritance

- **Source**: EDD §3.8 Class Diagram (lines 262-329)
- **Description**: Diagram has 6 classes (User, Pet, ClaimCode, ArenaMatch, TrainingLog, Leaderboard) — meets the ≥6 threshold. Relationships used are exclusively associations (`--`). Missing all of: inheritance (`<|--`), composition (`*--`), aggregation (`o--`). Domain has obvious composition candidates (e.g., ArenaMatch *-- battle_log entries; Pet *-- TrainingLog history) and at least one inheritance opportunity (admin role hierarchy: Admin <|-- SuperAdmin / Moderator / ReadOnly).
- **Affected scope**: Domain model expressiveness, ORM cascade rules, scaffold generation.
- **Suggested fix**: Enrich diagram with composition for ArenaMatch→TrainingLog, aggregation where lifetime is independent, and inheritance for AdminUser role hierarchy. Add at least one of each of the 3 missing relationship types.
- **Auto-fixable**: YES.

### [MEDIUM] D5-03 — Two RTM artifacts (RTM.md + RTM.csv); machine-readable RTM exists but Markdown copy is stale

- See D4-05.

### [MEDIUM] D5-04 — Class diagram entity names diverge from SCHEMA table names

- See D1-10. Class diagram uses `User` / `Leaderboard`; SCHEMA uses `claim_identities` / `leaderboard_snapshots`.

### [MEDIUM] D5-05 — Some PUML files are stubs

- **Source**: docs/diagrams/puml/*.puml (5 files)
- **Description**: 5 .puml source files exist (class-diagram.puml, component-diagram.puml, dataflow-diagram.puml, deployment.puml, sequence-auth.puml). EDD prose declares "All diagrams are authored in PlantUML; source files are maintained in `docs/diagrams/puml/`" but several diagrams in EDD §3.8 are inlined as fenced ` ``` puml ` blocks rather than `!include`-ing the .puml files. Risk of EDD inline diagram and standalone .puml drifting apart.
- **Suggested fix**: Either inline-only (delete .puml files) or sourced-only (replace EDD inline blocks with references). Pick one strategy.
- **Auto-fixable**: YES.

---

## Action Recommendation

Run `/gendoc-align-fix all` to address auto-fixable items in priority order:

1. **CRITICAL** D4-01 (features/ duplication) — must resolve before any test execution
2. **HIGH** D1-01, D1-02, D1-03 (table-name divergences) — block scaffold generation and migrations
3. **HIGH** D1-04 (couples to D4-01)
4. **HIGH** D1-05, D1-06, D4-03, D4-04 (RTM staleness — regenerate RTM)
5. **HIGH** D5-01, D5-02 (UML completeness + class diagram quality)
6. **MEDIUM** D1-07, D1-08, D1-09, D1-10, D4-02, D4-05, D4-06, D5-05
7. **LOW** D1-11, D1-12 (cleanup during regeneration)

After fixes, re-run `/gendoc-align-check` (the `ALIGN-VERIFY` step) to confirm the report converges on 0 findings before proceeding to CONTRACTS / MOCK / PROTOTYPE / HTML steps.

**Note on Dimensions 2 and 3**: These are intentionally N/A in this report because `src/` and `tests/` do not yet exist (pre-implementation state). They will become relevant after the CONTRACTS step generates `docs/blueprint/scaffold/src/` and the implementation phase begins. Re-scan at that time.

---

*Report generated by `/gendoc-align-check` — read-only audit, no files modified except this report.*
