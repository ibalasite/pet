# MANIFEST — gendoc Pipeline Execution Plan

**Project**: pixel-pet-arena  
**Generated**: 2026-05-03  
**Pipeline Version**: 3.0  
**Status**: IN PROGRESS

---

## §1 Baseline Metrics

Computed from upstream documents (EDD.md, PRD.md, ARCH.md, API.md):

| Metric | Value | Source |
|--------|-------|--------|
| Domain entity count | 13 | EDD.md §4 Data Models (13 subsections) |
| REST endpoint count | 53 | API.md (53 `#### \`METHOD /...\`` definitions) |
| User story count | 18 | PRD.md (18 unique US-xxx-nnn IDs) |
| Architecture layer count | 8 | ARCH.md (8 top-level §§ sections) |
| BDD scenario minimum | 15 | ceil(18 × 0.8) |
| Test plan minimum sections | 10 | arch_layers + 2 |

---

## §2 Pipeline Configuration

### §2.1 Session Config

| Setting | Value |
|---------|-------|
| `client_type` | `web` |
| `has_admin_backend` | `true` |
| `execution_mode` | `full-auto` |
| `review_strategy` | `exhaustive` |

### §2.2 Active vs Skipped Steps

**Active steps (32)**: All steps execute for `client_type=web, has_admin_backend=true`.

**Skipped steps (2)**:

| Step | Condition | Reason |
|------|-----------|--------|
| AUDIO | `client_type == game` | `client_type=web` — not a game project |
| ANIM | `client_type == game` | `client_type=web` — not a game project |

---

## §3 Mandatory Steps Checklist

| # | Step ID | Type | Output | Status |
|---|---------|------|--------|--------|
| 1 | IDEA | Concept | docs/IDEA.md | ✅ COMPLETE |
| 2 | BRD | Business | docs/BRD.md | ✅ COMPLETE |
| 3 | PRD | Product | docs/PRD.md | ✅ COMPLETE |
| 4 | CONSTANTS | Constants | docs/CONSTANTS.md | ✅ COMPLETE |
| 5 | PDD | Design | docs/PDD.md | ✅ COMPLETE |
| 6 | VDD | Visual | docs/VDD.md | ✅ COMPLETE |
| 7 | EDD | Engineering | docs/EDD.md | ✅ COMPLETE |
| 8 | ARCH | Architecture | docs/ARCH.md | ✅ COMPLETE |
| 9 | DRYRUN | Special | docs/MANIFEST.md + .gendoc-rules/ | ✅ COMPLETE |
| 10 | API | API | docs/API.md | ✅ COMPLETE |
| 11 | SCHEMA | Schema | docs/SCHEMA.md | ✅ COMPLETE |
| 12 | FRONTEND | Frontend | docs/FRONTEND.md | ✅ COMPLETE |
| 13 | CLIENT_IMPL | Implementation | docs/CLIENT_IMPL.md | ✅ COMPLETE |
| 14 | ADMIN_IMPL | Implementation | docs/ADMIN_IMPL.md | ✅ COMPLETE |
| 15 | RESOURCE | Infrastructure | docs/RESOURCE.md | ✅ COMPLETE |
| 16 | UML | Diagrams | docs/diagrams/ (≥9 files) | ✅ COMPLETE |
| 17 | test-plan | Testing | docs/test-plan.md | ✅ COMPLETE |
| 18 | BDD-server | features/server/ (6 files, 18 scenarios) | ✅ COMPLETE |
| 19 | BDD-client | BDD | features/client/ (≥15 scenarios) | ✅ COMPLETE |
| 20 | RTM | Traceability | docs/RTM.md | ✅ COMPLETE |
| 21 | runbook | Operations | docs/runbook.md | ✅ COMPLETE |
| 22 | LOCAL_DEPLOY | DevEx | docs/LOCAL_DEPLOY.md | ✅ COMPLETE |
| 23 | CICD | CI/CD | docs/CICD.md | ✅ COMPLETE |
| 24 | DEVELOPER_GUIDE | DevEx | docs/DEVELOPER_GUIDE.md | ✅ COMPLETE |
| 25 | UML-CICD | Diagrams | docs/diagrams/cicd-*.md (≥5 files) | ✅ COMPLETE |
| 26 | ALIGN | Alignment | docs/ALIGN-REPORT.md | ✅ COMPLETE |
| 27 | ALIGN-FIX | Alignment | docs/ALIGN-REPORT.md (fixed) | PENDING |
| 28 | ALIGN-VERIFY | Alignment | docs/ALIGN-REPORT.md (verified) | PENDING |
| 29 | CONTRACTS | Contracts | docs/contracts/ (≥3 files) | PENDING |
| 30 | MOCK | Mock Data | docs/mock-data/ (≥3 files) | PENDING |
| 31 | PROTOTYPE | Prototype | docs/prototype/ (≥3 files) | PENDING |
| 32 | HTML | HTML | docs/pages/ (≥3 files) | PENDING |

---

## §4 Per-Step Completeness Standards

Each step must pass the following gate checks before being marked COMPLETE.

### §4.1 Document Steps

| Step | Output | Min §§ | Required Sections | Special Rules |
|------|--------|--------|-------------------|---------------|
| IDEA | docs/IDEA.md | 3 | Problem Statement, Target Users, Core Value | — |
| BRD | docs/BRD.md | 5 | Business Objectives, Stakeholders, Success Metrics | — |
| PRD | docs/PRD.md | 5 | User Stories, Acceptance Criteria, Out of Scope | — |
| CONSTANTS | docs/CONSTANTS.md | 3 | Business Rules, System Parameters | — |
| PDD | docs/PDD.md | 4 | Product Vision, Feature List, Roadmap | — |
| VDD | docs/VDD.md | 3 | Design Principles, Visual Language | — |
| EDD | docs/EDD.md | 8 | Domain Model, Service Architecture, Data Flow | — |
| ARCH | docs/ARCH.md | 5 | Architecture Overview, Tech Stack, Component Design | — |
| API | docs/API.md | 6 | API Overview, Authentication, Endpoints, Error Codes | min_endpoint_count = 53 |
| SCHEMA | docs/SCHEMA.md | 5 | Overview, Tables, Indexes | min_table_count = 13 |
| FRONTEND | docs/FRONTEND.md | 4 | Page Structure, Component Design, State Management | — |
| CLIENT_IMPL | docs/CLIENT_IMPL.md | 4 | Technology Stack, Project Structure, Build Process | — |
| ADMIN_IMPL | docs/ADMIN_IMPL.md | 4 | Admin Architecture, Feature Modules, Access Control | — |
| RESOURCE | docs/RESOURCE.md | 3 | Infrastructure Overview, Resource Allocation | — |
| test-plan | docs/test-plan.md | 10 | Test Objectives, Test Scope, Test Cases | — |
| RTM | docs/RTM.md | 3 | Requirements, Test Cases, Coverage | min_row_count = 18 |
| runbook | docs/runbook.md | 4 | Deployment, Incident Response, Rollback | — |
| LOCAL_DEPLOY | docs/LOCAL_DEPLOY.md | 5 | Prerequisites, Setup Steps, Verification | — |
| CICD | docs/CICD.md | 6 | Pipeline Overview, Jenkinsfile, PR Gate, ArgoCD | — |
| DEVELOPER_GUIDE | docs/DEVELOPER_GUIDE.md | 5 | Daily Scenarios, CI/CD Diagnosis, Quick Reference | — |
| ALIGN | docs/ALIGN-REPORT.md | 3 | Alignment Issues, Cross-Document Gaps | — |

### §4.2 Multi-File Steps

| Step | Output Glob | Min Files | Special Rules |
|------|-------------|-----------|---------------|
| UML | docs/diagrams/*.md | 9 | — |
| BDD-server | features/server/*.feature | — | min_scenario_count = 15 |
| BDD-client | features/client/*.feature | — | min_scenario_count = 15 |
| UML-CICD | docs/diagrams/cicd-*.md | 5 | — |
| CONTRACTS | docs/contracts/*.md | 3 | min_h2_per_file = 3 |
| MOCK | docs/mock-data/* | 3 | — |
| PROTOTYPE | docs/prototype/* | 3 | — |
| HTML | docs/pages/*.html | 3 | — |

### §4.3 Universal Anti-Fake Rules (All Steps)

All generated documents must pass:

1. **No bare placeholders**: No `{{PLACEHOLDER}}` strings in output
2. **No duplicate paragraphs**: Paragraphs ≥150 chars must not repeat verbatim
3. **Minimum section words**: Each section must contain ≥30 words
4. **No trivial entity names**: No generic names like "Entity1", "Component2"

---

## §5 Gate Check Rules Location

Individual gate rules are stored in `.gendoc-rules/<STEP-ID>-rules.json`.

These files are used by `gate-check.sh` before each step's review loop begins.

| File | Step | Key Rule |
|------|------|----------|
| `.gendoc-rules/API-rules.json` | API | min_endpoint_count = 53 |
| `.gendoc-rules/SCHEMA-rules.json` | SCHEMA | min_table_count = 13 |
| `.gendoc-rules/RTM-rules.json` | RTM | min_row_count = 18 |
| `.gendoc-rules/BDD-server-rules.json` | BDD-server | min_scenario_count = 15 |
| `.gendoc-rules/BDD-client-rules.json` | BDD-client | min_scenario_count = 15 |
| `.gendoc-rules/test-plan-rules.json` | test-plan | min_h2_sections = 10 |
