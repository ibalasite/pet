# Cross-Document Alignment Report — pixel-pet-arena

**DOC-ID**: ALIGN-PIXEL-PET-ARENA-20260504
**Status**: FIXES APPLIED
**Generated**: 2026-05-04
**Fixes Applied**: 2026-05-04
**Scope**: docs/EDD.md, docs/API.md, docs/SCHEMA.md, docs/PRD.md, docs/ARCH.md,
docs/CICD.md, docs/FRONTEND.md, docs/test-plan.md, docs/RTM.md,
docs/LOCAL_DEPLOY.md, docs/runbook.md, docs/DEVELOPER_GUIDE.md

---

## Alignment Issues

Each issue is cited with the exact document and section where the inconsistency or error
was found, compared against the authoritative facts established in the project ground
truth.

---

### ISSUE-001 — Health endpoint path: runbook.md uses `/api/v1/health` instead of `/health`

**Location**: `docs/runbook.md` — §Deployment / Post-Deployment Smoke Tests (line 129),
§Deployment / Backend Deployment Steps (lines 71, 76), §Incident Response / P0 (line 156,
164), §Health Checks and Monitoring (line 435), §On-Call Quick Reference (line 572).

**Description**: The authoritative health endpoint is `GET /health` (no `/api/v1` prefix).
`docs/API.md §10` explicitly defines `GET /health` and the response
`{"status":"healthy","checks":{...},"timestamp":"..."}`. `docs/CICD.md` correctly uses
`/health` throughout (lines 52, 452, 660, 901, 1276–1277). However, `docs/runbook.md`
repeatedly refers to the endpoint as `/api/v1/health` — e.g., post-deploy smoke test step 1
reads "GET `/api/v1/health` returns HTTP 200 with `\"status\": \"ok\"`", and the P0
definition uses `GET /api/v1/health`. This means on-call engineers following the runbook
would poll a path that returns HTTP 404 during an incident.

**Severity**: HIGH — operational impact during real incidents.

**Recommendation**: Replace every occurrence of `/api/v1/health` in `docs/runbook.md` with
`/health` to match the canonical definition in `docs/API.md §10` and `docs/CICD.md`.

---

### ISSUE-002 — Health response body: runbook.md uses `"status":"ok"` instead of `"status":"healthy"`

**Location**: `docs/runbook.md` — §Deployment / Post-Deployment Smoke Tests (line 129),
§Deployment / Backend Deployment Steps (line 76), §Health Checks and Monitoring (line 445).

**Description**: The authoritative health response (from `docs/API.md §10` and confirmed in
`docs/CICD.md` line 1277) uses `"status":"healthy"` for a fully operational API. The runbook
smoke-test checklist says "returns HTTP 200 with `\"status\": \"ok\"`", and the detailed
health schema in the runbook shows `"status": "ok"` as the top-level healthy value (line 445).
The runbook also defines a three-value `status` field (`ok`, `degraded`, `error`) rather than
the API-spec values (`healthy`, `degraded`, `down`). An operator verifying a deployment
against the runbook schema will apply the wrong acceptance criteria.

**Severity**: HIGH — the runbook is the canonical operational reference for on-call
engineers. An incorrect expected response body leads to incorrect incident triage.

**Recommendation**: Correct runbook.md §Health Checks and Monitoring to use `"status":"healthy"` (200),
`"status":"degraded"` (200 with partial failures), and `"status":"down"` (503), matching
`docs/API.md §10`. Remove the extended fields (`version`, `buildSha`, `featureFlags`,
`email` check) unless those fields are also added to `docs/API.md §10`.

---

### ISSUE-003 — JWT_SECRET purpose mislabelled in runbook.md On-Call Quick Reference

**Location**: `docs/runbook.md` — §On-Call Quick Reference (line 586).

**Description**: The runbook quick-reference table describes `JWT_SECRET` as "used for claim
token signing". The authoritative description — confirmed in `docs/LOCAL_DEPLOY.md §Key
environment variables` (line 86), `docs/DEVELOPER_GUIDE.md §2.4` (line 856), `docs/CICD.md
§Secrets Management` (line 1222), and `docs/API.md §2.2` — is that `JWT_SECRET` signs the
short-lived **TOTP setup token** returned during first-time admin enrollment only. It is
explicitly **not** used for claim tokens (player auth uses raw opaque bearer tokens) and not
used for admin sessions (those are Redis-backed httpOnly cookies). Describing it as "claim
token signing" could mislead an on-call engineer into believing player tokens are JWTs, which
would cause incorrect incident diagnosis.

**Severity**: MEDIUM — misleading description may cause incorrect debugging decisions.

**Recommendation**: Update the quick-reference entry in `docs/runbook.md` to read: "signs the
short-lived TOTP setup token returned during first-time admin enrollment only — not used for
player auth or admin sessions."

---

### ISSUE-004 — Local migration command: LOCAL_DEPLOY.md uses `supabase db push`; authoritative command is `supabase migration up`

**Location**: `docs/LOCAL_DEPLOY.md` — §Setup Steps / Step 3 (lines 153–162).

**Description**: `docs/LOCAL_DEPLOY.md` step 3 tells developers to run `supabase db push` and
mentions `pnpm db:migrate` as an alternative. The Supabase CLI v2 canonical local migration
command for replaying pending migration files is `supabase migration up`. `docs/DEVELOPER_GUIDE.md`
(lines 277, 825) and `docs/diagrams/cicd-pr-gate.md` (lines 27, 88) consistently use
`supabase migration up`. `supabase db push` is a Supabase-hosted-project command that pushes a
local schema diff to a remote project — it is not the correct command for applying migration
files to a local Supabase Docker stack and may produce unexpected behaviour on a fresh clone.

**Severity**: MEDIUM — causes confusion for new developers onboarding to the project.

**Recommendation**: Replace `supabase db push` in `docs/LOCAL_DEPLOY.md §Step 3` with
`supabase migration up`, consistent with `docs/DEVELOPER_GUIDE.md` and the CI gate diagram.

---

### ISSUE-005 — detect-secrets baseline update command: CICD.md uses `--update` flag; DEVELOPER_GUIDE.md and all diagrams use `--baseline`

**Location**: `docs/CICD.md` — §Secrets Detection (line 1029); `docs/DEVELOPER_GUIDE.md`
(line 684); `docs/diagrams/cicd-secrets-rotation.md` (line 30, 141); `docs/diagrams/cicd-pr-gate.md` (line 39, 105).

**Description**: `docs/CICD.md §Secrets Detection` instructs developers to run
`detect-secrets scan --update .secrets.baseline` to add a false positive to the baseline.
In contrast, `docs/DEVELOPER_GUIDE.md` (line 684), `docs/diagrams/cicd-secrets-rotation.md`,
and `docs/diagrams/cicd-pr-gate.md` all show `detect-secrets scan --baseline .secrets.baseline`.
The authoritative command per the known facts is `detect-secrets scan --baseline .secrets.baseline`.
The `--update` flag variant is used in older versions of detect-secrets; using the wrong flag
on the installed version will either fail silently or not update the baseline, potentially
blocking a legitimate PR permanently.

**Severity**: MEDIUM — affects developer experience on any PR that triggers a false positive.

**Recommendation**: Align `docs/CICD.md §Secrets Detection` to use
`detect-secrets scan --baseline .secrets.baseline`, matching all other documents and the
authoritative command.

---

### ISSUE-006 — RTM user story count (17) disagrees with test-plan.md user story count (18)

**Location**: `docs/RTM.md` — Overview (line 14) and Coverage table (line 86);
`docs/test-plan.md` — §1.1 (line 39), §2.2 (line 83).

**Description**: `docs/RTM.md` states "all 17 user stories" and the coverage table shows 17
total rows. `docs/test-plan.md §1.1` lists "the 18 user stories" and enumerates them by ID,
including US-ADMIN-006 (Game Economy Configuration). Counting the RTM requirements table
confirms that US-ADMIN-006 is absent from `docs/RTM.md`. US-ADMIN-006 is a P1 story with
acceptance criteria defined in the PRD and integration/E2E test requirements listed in
`docs/test-plan.md §2.2`. Its omission from the RTM leaves a traceability gap for that story.

**Severity**: MEDIUM — traceability gap for a P1 user story; compliance risk for any audit
requiring a complete RTM.

**Recommendation**: Add a US-ADMIN-006 row to `docs/RTM.md`, mapping it to
`admin-portal.feature` (client BDD), integration tests, and E2E tests as documented in
`docs/test-plan.md §2.2`, and update the total count from 17 to 18.

---

### ISSUE-007 — test-plan.md unit test file paths use `packages/` directory layout; CICD.md and DEVELOPER_GUIDE.md use `apps/` layout

**Location**: `docs/test-plan.md` — §5 Unit Tests (lines 298, 330, 362, 401, 433, 451),
§6 Integration Tests (lines 480, 526, 551, 590), §13.1 Coverage table (lines 1506–1510);
`docs/CICD.md` — coverage assertion paths (lines 203–205); `docs/DEVELOPER_GUIDE.md`
(line 430, 657, 663).

**Description**: Unit and integration test file paths throughout `docs/test-plan.md` are
written as `packages/api/src/...`, `packages/player-app/src/...`, and
`packages/admin-app/src/...`. The project's directory layout as consistently used by
`docs/CICD.md`, `docs/DEVELOPER_GUIDE.md`, and `docs/LOCAL_DEPLOY.md` is `apps/api/`,
`apps/player/`, and `apps/admin/`. The CICD coverage assertion script reads
`apps/api/coverage/`, `apps/player/coverage/`, and `apps/admin/coverage/`. A developer
navigating the test-plan paths will not find the files.

**Severity**: LOW — documentation inconsistency; no runtime impact, but impairs
onboarding and code review.

**Recommendation**: Update all `packages/api/`, `packages/player-app/`, and
`packages/admin-app/` path references in `docs/test-plan.md` to `apps/api/`, `apps/player/`,
and `apps/admin/` respectively, to match the canonical directory layout.

---

## Cross-Document Gaps

The following items are present or clearly specified in one document but absent from or
contradicted by one or more others. Each entry references the source document and the
document(s) where the item is missing.

---

### GAP-001 — runbook.md health schema includes fields (`version`, `buildSha`, `featureFlags`, `email`) absent from API.md §10

**Present in**: `docs/runbook.md §Health Checks and Monitoring` (the healthy JSON example
includes `"status":"ok"`, `"version"`, `"buildSha"`, `"featureFlags"`, and an `"email"` check
block).

**Absent from / contradicted by**: `docs/API.md §10` (lines 2489–2515), which defines the
health response as containing only `status`, `checks.database`, `checks.redis`, and
`timestamp`. The CICD expected response at line 1277 also shows only those four fields.

**Impact**: Operators reading the runbook will expect richer fields that the API does not
return. Load balancer or monitoring configurations built from the runbook schema will check
for fields that do not exist.

---

### GAP-002 — US-ADMIN-006 missing from RTM but tested in test-plan.md

**Present in**: `docs/test-plan.md §2.2` (US-ADMIN-006 row), `docs/PRD.md` (US-ADMIN-006
defined as P1 story), `docs/CICD.md §Coverage Enforcement` (implicit coverage requirement).

**Absent from**: `docs/RTM.md` requirements table and test-cases table.

**Impact**: If the RTM is used as the traceability artifact for a compliance review or sprint
sign-off, US-ADMIN-006's test coverage is invisible. See also ISSUE-006 above.

---

### GAP-003 — runbook.md health checks reference `/api/v1/health` while CICD.md and API.md use `/health`

Detailed in ISSUE-001. As a cross-document gap, the runbook represents the only document in
the set that uses the wrong path. All other documents (`docs/API.md`, `docs/CICD.md`,
`docs/LOCAL_DEPLOY.md`, `docs/DEVELOPER_GUIDE.md`) correctly use `GET /health`.

---

### GAP-004 — detect-secrets `--update` vs `--baseline` flag undocumented discrepancy

**Present in (--update variant)**: `docs/CICD.md §Secrets Detection`.

**Present in (--baseline variant, authoritative)**: `docs/DEVELOPER_GUIDE.md`,
`docs/diagrams/cicd-secrets-rotation.md`, `docs/diagrams/cicd-pr-gate.md`.

**Impact**: A developer who finds the instructions in `docs/CICD.md` first may run the wrong
command when attempting to add a false positive to the baseline. See ISSUE-005.

---

### GAP-005 — runbook.md JWT_SECRET description disagrees with all other documents

**Described correctly in**: `docs/LOCAL_DEPLOY.md §Key environment variables`,
`docs/DEVELOPER_GUIDE.md §2.4`, `docs/CICD.md §Secrets Management`, `docs/API.md §2.2`,
`docs/test-plan.md §3.3`.

**Described incorrectly in**: `docs/runbook.md §On-Call Quick Reference` ("used for claim
token signing"). See ISSUE-003.

---

### GAP-006 — LOCAL_DEPLOY.md uses `supabase db push` while other documents use `supabase migration up`

**Present in (supabase db push)**: `docs/LOCAL_DEPLOY.md §Step 3`.

**Absent from / contradicted by**: `docs/DEVELOPER_GUIDE.md` (lines 277, 825, 1042),
`docs/diagrams/cicd-pr-gate.md` (lines 27, 88) — all of which use `supabase migration up`.

**Impact**: Developers following LOCAL_DEPLOY.md will run an incorrect command. See ISSUE-004.

---

### GAP-007 — Runbook health check schema has three-value `status` (`ok`, `degraded`, `error`) vs API.md three-value (`healthy`, `degraded`, `down`)

**Present in**: `docs/runbook.md §Health Checks and Monitoring` — the degraded example uses
`"status": "degraded"` and the unhealthy response uses `"status": "error"` (line 491).

**Contradicted by**: `docs/API.md §10` (line 2515), which defines: `healthy`, `degraded`,
`down`. The CICD comment at line 1277 also shows `"status":"healthy"`. The runbook uses `"ok"`
for the healthy state and `"error"` for the fully down state — two of three values differ.

---

## Alignment Summary

Overall, the pixel-pet-arena documentation set is well-structured and shows strong
internal consistency across the majority of its documents. The CONSTANTS.md source of truth
is consistently referenced by ID across EDD.md, API.md, SCHEMA.md, ARCH.md, and PRD.md with
no detected numeric contradictions. Authentication model (raw opaque bearer tokens for
players, Redis-backed httpOnly cookies for admins, JWT used only for TOTP setup token) is
correctly and consistently described in API.md, EDD.md, ARCH.md, FRONTEND.md, LOCAL_DEPLOY.md,
DEVELOPER_GUIDE.md, and test-plan.md. pnpm filter names (`api`, `player-app`, `admin-app`)
are used consistently in CICD.md, DEVELOPER_GUIDE.md, and LOCAL_DEPLOY.md. Email encryption
(AES-256-GCM via EMAIL_ENCRYPTION_KEY) is consistently described in all documents that
reference it. Redis roles (leaderboard, job queue, admin session store, rate limits, token
blacklist) are consistently enumerated in EDD.md, ARCH.md, and API.md.

**Issues found**: 7 alignment issues across 5 document pairs.

**Severity breakdown**:
- HIGH: 2 (ISSUE-001, ISSUE-002) — both in runbook.md, affecting the health endpoint path
  and response schema used during live incidents.
- MEDIUM: 4 (ISSUE-003, ISSUE-004, ISSUE-005, ISSUE-006) — JWT_SECRET mislabel, local
  migration command, detect-secrets flag variant, RTM traceability gap.
- LOW: 1 (ISSUE-007) — test file path layout in test-plan.md.

**Coverage metrics**:

| Document | Issues found | Role |
|---|---|---|
| runbook.md | 3 (ISSUE-001, 002, 003) | Operational reference — highest priority fixes |
| LOCAL_DEPLOY.md | 1 (ISSUE-004) | Developer onboarding |
| CICD.md | 1 (ISSUE-005) | CI/CD pipeline spec |
| RTM.md | 1 (ISSUE-006) | Traceability matrix |
| test-plan.md | 1 (ISSUE-007) | Test specification |

**Recommended fix priority**:
1. Correct runbook.md health endpoint path to `GET /health` and response body to `"status":"healthy"` (ISSUE-001, ISSUE-002).
2. Correct runbook.md JWT_SECRET description (ISSUE-003).
3. Align LOCAL_DEPLOY.md migration command to `supabase migration up` (ISSUE-004).
4. Align CICD.md detect-secrets flag to `--baseline` (ISSUE-005).
5. Add US-ADMIN-006 to RTM.md (ISSUE-006).
6. Update test-plan.md file path layout from `packages/` to `apps/` (ISSUE-007).

All 7 issues are correctible without architectural change. None affect the EDD, API,
SCHEMA, or ARCH documents, which are internally consistent and mutually aligned.

---

## Fix Status

All 7 alignment issues have been resolved in commit `docs(gendoc)[ALIGN-FIX]`.

| Issue | Severity | File | Fix Applied |
|---|---|---|---|
| ISSUE-001 | HIGH | `docs/runbook.md` | All occurrences of `/api/v1/health` replaced with `/health` (lines 17, 71, 76, 129, 156, 164, 346, 435, 437, 572) |
| ISSUE-002 | HIGH | `docs/runbook.md` | Health response status values corrected: `"ok"` → `"healthy"`, `"error"` → `"down"`; schema aligned to `docs/API.md §10` |
| ISSUE-003 | MEDIUM | `docs/runbook.md` | `JWT_SECRET` description updated to "used for TOTP setup token signing only — not for player auth or admin sessions" |
| ISSUE-004 | MEDIUM | `docs/LOCAL_DEPLOY.md` | `supabase db push` replaced with `supabase migration up` in Step 3 |
| ISSUE-005 | MEDIUM | `docs/CICD.md` | `detect-secrets scan --update` replaced with `detect-secrets scan --baseline` |
| ISSUE-006 | MEDIUM | `docs/RTM.md` | US-ADMIN-006 (Game Economy Configuration, P1) added to requirements table, test-cases table, and coverage summary; total count updated from 17 to 18 |
| ISSUE-007 | LOW | `docs/test-plan.md` | All `packages/api/`, `packages/player-app/`, `packages/admin-app/` paths updated to `apps/api/`, `apps/player/`, `apps/admin/` |
