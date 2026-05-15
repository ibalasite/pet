<!--
  DOC-ID:  README-PIXEL-PET-ARENA-20260516
  Version: v1.7
  Status:  DRAFT
  Author:  AI Generated (gendoc readme)
  Date:    2026-05-16
  Upstream docs:
    - BRD: docs/BRD.md  (Business Requirements Document — BRD-PIXEL-PET-ARENA-20260503)
    - PRD: docs/PRD.md  (Product Requirements Document — PRD-PIXEL-PET-ARENA-20260503)
    - PDD: docs/PDD.md  (Product Design Document — PDD-PIXEL-PET-ARENA-20260503)
    - EDD: docs/EDD.md  (Engineering Design Document — EDD-PIXEL-PET-ARENA-20260503 v2.0)
    - ARCH: docs/ARCH.md (Architecture Document)
    - API: docs/API.md  (REST API Reference)
  Change log:
    v1.7  2026-05-16  AI Generated (gendoc readme)  Full regeneration from updated upstream docs post align-fix
-->

# Pixel Pet Arena

> Zero-signup HTML5 pixel pet game — claim your pet via email OTP, train it, and battle in a global arena without ever creating a password.

[![CI](https://github.com/pixel-pet-arena/pixel-pet-arena/actions/workflows/ci.yml/badge.svg)](https://github.com/pixel-pet-arena/pixel-pet-arena/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/pixel-pet-arena/pixel-pet-arena/branch/main/graph/badge.svg)](https://codecov.io/gh/pixel-pet-arena/pixel-pet-arena)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Quick Reference](#api-quick-reference)
- [Directory Structure](#directory-structure)
- [Documentation](#documentation)
- [Testing](#testing)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)
- [Architecture Quick Reference](#architecture-quick-reference)
- [Security Policy](#security-policy)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [License](#license)

---

## Overview

**Pixel Pet Arena** is a browser-native HTML5 SaaS platform where players discover, claim, train, and battle procedurally generated pixel-art pets — with zero account creation and zero installation.

It was built to solve the **high barrier of entry that prevents casual players from experiencing persistent virtual pet games** — a gap that matters to **casual and retro gaming audiences** because traditional platforms demand account registration before any meaningful play can begin.

Identity is entirely token-based: a 6-digit OTP code sent by email generates a 32-byte cryptographic URL token. Players bookmark that URL to return to their pet. No passwords. No accounts. No friction.

The project is governed by the upstream documents below; every design decision maps to a tracked requirement:

| Document | Purpose |
|----------|---------|
| [BRD](docs/BRD.md) | Business goals, ROI analysis, stakeholder sign-off |
| [PRD](docs/PRD.md) | User stories, acceptance criteria, priority tiers |
| [PDD](docs/PDD.md) | UX flows, interaction specs, design tokens |
| [EDD](docs/EDD.md) | Architecture decisions, technology choices, data models |

See [System Architecture](#system-architecture) below for a visual overview, and [Documentation](#documentation) for the full HTML reference site.

---

## Core Features

**P0 — Must ship for v1.0:**

- **Zero-Signup Guest Play** — Any visitor instantly gets a randomly generated pixel pet (1 billion+ unique combinations across 6 attribute dimensions: body, head, color_palette, accessory, rarity_trait, pattern). No account required.
- **Email Claim Flow** — Players send their email to receive a 6-digit OTP; on verification they get a unique 32-byte URL token. Bookmark the URL to return. No passwords. Rarity: Common 60% / Rare 25% / Epic 12% / Legendary 3%.
- **Pet Training & Feeding** — Up to 3 training actions per day (resets UTC 00:00) to raise Speed, Strength, and Stamina stats (range 1–100, capped at level 100). Special food items provide stat boosts. Neglect for 3+ days triggers a visual neglect animation state.
- **Arena Battle System** — Race mode (Speed stat) and Sumo mode (Strength stat) with ±15% seeded random modifier for fairness. Real-time matchmaking via Redis ZPOPMIN; AI bot fallback after 30-second timeout. Battle rate limit: 10 battles/hour per pet (admin-tunable).
- **Global Leaderboard** — Top 100 pets by win rate, updated with ≤30-second lag via Redis sorted set. Shareable URL per pet.
- **Battle Records Page** — Per-pet battle history page with Open Graph social share card generation. Last 20 battles displayed publicly via shareable URL.

**P1 — Post-MVP:**

- **Sumo Arena Mode** — Strength-based battle variant (feature flag `FF_ARENA_SUMO`, default enabled in local dev)
- **Pet Marketplace / Trading** — 5% platform fee per trade (feature flag `FF_MARKETPLACE`, off by default)

---

## System Architecture

```mermaid
graph TB
    subgraph Actors
        Guest["Guest Player<br/>(no account)"]
        Owner["Pet Owner<br/>(email-claimed, URL token)"]
        Comp["Competitive Player<br/>(token + arena)"]
        AdminOp["Admin Operator<br/>(TOTP session)"]
        Job["System Scheduled Jobs<br/>(cron / cleanup)"]
    end

    subgraph "Pixel Pet Arena Platform"
        PPA["pixel-pet-arena<br/>HTML5 browser game + REST API + Admin Portal<br/>(React 18 + Phaser 3 / Vue 3 / Fastify 4 / Node 20)"]
    end

    subgraph "External Systems"
        SG["SendGrid v3 API<br/>(transactional email, primary)"]
        SMTP["Nodemailer SMTP<br/>(email fallback after 3 failures)"]
        SB["Supabase<br/>(PostgreSQL 15 managed)"]
        UP["Upstash Redis<br/>(serverless cache + leaderboard)"]
        VC["Vercel Edge CDN<br/>(static SPA bundles + global PoP)"]
        S3["S3-compatible Storage<br/>(DB backups)"]
        Social["Social Share<br/>(Open Graph / battle result cards)"]
    end

    Guest -->|"HTTPS / browse pet preview"| PPA
    Owner -->|"HTTPS / pet URL token"| PPA
    Comp -->|"HTTPS / arena interactions"| PPA
    AdminOp -->|"HTTPS / admin session (TOTP 2FA)"| PPA
    Job -->|"cron triggers (GDPR erasure, leaderboard snapshot)"| PPA

    PPA -->|"send OTP claim email"| SG
    SG -.->|"fallback after 3 failures"| SMTP
    PPA -->|"persist all durable data"| SB
    PPA -->|"cache + leaderboard sorted set + rate-limit counters"| UP
    PPA -->|"static assets served via"| VC
    SB -->|"daily automated backup"| S3
    PPA -->|"battle result social cards"| Social
```

> For component-level detail, data flow diagrams, and ADR records see:
> - [PDD — Product Design Document](docs/PDD.md) (UX + interaction specs)
> - [EDD — Engineering Design Document](docs/EDD.md) (architecture + implementation)
> - [ARCH — Architecture Document](docs/ARCH.md) (ADRs, C4 diagrams, security model)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Player Frontend** | React 18 + Phaser 3 + TypeScript 5 + Vite | HTML5 SPA; Phaser isolated in `PetCanvasEngine` component; React for all UI chrome |
| **Admin Frontend** | Vue 3 + Element Plus + TypeScript 5 + Vite | Admin portal SPA; separated to avoid pixel-art design system pollution |
| **Backend API** | Node.js 20 LTS + Fastify 4 + TypeScript 5 | Modular Monolith; Clean Architecture layers (Controller → Service → Repository) |
| **Database** | PostgreSQL 15 (Supabase managed) | Primary durable store for pets, battles, users, audit logs |
| **Cache / Queue** | Redis (Upstash serverless) | Leaderboard sorted sets, rate-limit counters, arena matchmaking queue (ZPOPMIN) |
| **Email** | SendGrid v3 API (primary) + Nodemailer SMTP (fallback) | OTP claim emails; fallback triggered after 3 consecutive SendGrid failures |
| **Infrastructure** | Docker + Railway + Supabase + Vercel Edge CDN | Containerized API on Railway; static SPAs on Vercel; PostgreSQL on Supabase |
| **CI / CD** | GitHub Actions | `ci.yml` (lint + test + build, Node 20/22 matrix); `deploy.yml` (staging/prod) |
| **Observability** | Prometheus + Grafana + OpenTelemetry | SLO: 99.9% monthly uptime; P99 read <200ms at 100 RPS |
| **Testing** | Vitest (unit/integration) + Playwright (E2E) + Cucumber (BDD) | 80%+ coverage target; 215 BDD scenarios (82 server + 133 client) |

---

## Quick Start

### Prerequisites

All three installation paths share these requirements:

- [Git](https://git-scm.com/) 2.40+
- [Node.js](https://nodejs.org/) 20 LTS + npm 10+
- An `.env.local` file — copy from `.env.example` (see [Environment Variables](#environment-variables))

---

### Docker (Recommended)

The fastest path to a running instance. Docker Compose starts all services — API, PostgreSQL, and Redis — with a single command.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) 24+ (includes Compose v2)

```bash
git clone https://github.com/pixel-pet-arena/pixel-pet-arena.git
cd pixel-pet-arena

# Configure environment
cp .env.example .env.local
# Edit .env.local — at minimum set JWT_SECRET and EMAIL_ENCRYPTION_KEY

# Start all services (API + PostgreSQL + Redis)
docker compose up -d

# Verify everything is healthy
docker compose ps
# Expected: all services show "running (healthy)"
```

Verify the API is responding:

```bash
curl http://localhost:3000/health
# {"status":"ok","version":"1.0.0","uptime":3}
```

---

### macOS / Linux (Native)

**Prerequisites:**

- Node.js 20 LTS ([install via nvm](https://github.com/nvm-sh/nvm))
- PostgreSQL 15+ (local) or Supabase connection string in `DATABASE_URL`
- Redis 7+ (local) or Upstash connection string in `REDIS_URL`

```bash
git clone https://github.com/pixel-pet-arena/pixel-pet-arena.git
cd pixel-pet-arena

# Install all workspace dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local — fill DATABASE_URL, REDIS_URL, JWT_SECRET, EMAIL_ENCRYPTION_KEY
# Generate JWT_SECRET:
#   node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
# Generate EMAIL_ENCRYPTION_KEY:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Run database migrations
npm run db:migrate

# Start the API development server
npm run dev:api
# → Fastify API listening on http://localhost:3000

# In a second terminal, start the player frontend
npm run dev:player
# → Vite player app at http://localhost:5173

# In a third terminal, start the admin portal
npm run dev:admin
# → Vite admin portal at http://localhost:5174
```

Expected API startup output:

```
[pixel-pet-arena] Fastify listening on http://0.0.0.0:3000
[pixel-pet-arena] PostgreSQL: connected (pool min=20 max=50)
[pixel-pet-arena] Redis: connected
[pixel-pet-arena] SendGrid: configured (dummy key for local dev — emails captured by Inbucket at :54324)
```

---

### Windows (PowerShell)

> **Recommendation:** Use [WSL 2](https://learn.microsoft.com/windows/wsl/install) + Docker Desktop for the smoothest experience on Windows.

**Prerequisites:** Node.js 20 LTS via [winget](https://learn.microsoft.com/windows/package-manager/) or the [official installer](https://nodejs.org/), PostgreSQL 15+, Redis 7+.

```powershell
git clone https://github.com/pixel-pet-arena/pixel-pet-arena.git
Set-Location pixel-pet-arena

# Install all workspace dependencies
npm install

# Configure environment
Copy-Item .env.example .env.local
# Open .env.local in your editor and fill in DATABASE_URL, REDIS_URL, JWT_SECRET, EMAIL_ENCRYPTION_KEY

# Run database migrations
npm run db:migrate

# Start the API development server
npm run dev:api
```

Verify the server started:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

---

## Environment Variables

Copy `.env.example` to `.env.local` before starting the application. The API validates all required variables at startup and exits with a clear error if any are missing.

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | — | `postgresql://postgres:postgres@localhost:54322/postgres` |
| `REDIS_URL` | Redis / Upstash connection string | Yes | — | `redis://localhost:6379` |
| `JWT_SECRET` | TOTP setup token signer (64-byte base64url) | Yes | — | *(generate via node crypto)* |
| `EMAIL_ENCRYPTION_KEY` | AES-256-GCM key for GDPR email hashing (32-byte hex) | Yes | — | *(generate via node crypto)* |
| `SENDGRID_API_KEY` | SendGrid v3 API key | Yes | `any-dummy-string-for-local` | `SG.xxxx` |
| `ADMIN_TOTP_ISSUER` | TOTP issuer name shown in authenticator app | No | `pixel-pet-arena-local` | `pixel-pet-arena-prod` |
| `POSTGRES_DB` | Database name (docker-compose) | No | `pixel_pet_arena` | `pixel_pet_arena` |
| `POSTGRES_USER` | DB user (docker-compose) | No | `postgres` | `postgres` |
| `POSTGRES_PASSWORD` | DB password (docker-compose) | No | `changeme_local` | *(strong password for prod)* |
| `FF_MARKETPLACE` | Feature flag — enable Marketplace (post-MVP) | No | `false` | `true` |
| `FF_ARENA_SUMO` | Feature flag — enable Sumo arena mode (P1) | No | `true` | `true` |
| `FF_RARITY_DISPLAY` | Feature flag — display rarity badges in UI | No | `true` | `true` |
| `VITE_API_BASE_URL` | API base URL for frontend SPAs | No | `http://localhost:3000` | `https://api.pixelpetarena.com` |

See `.env.example` for the full annotated list and optional tuning parameters.

---

## API Quick Reference

All player endpoints are prefixed with `/api/v1`. Authentication uses the pet's URL token in `Authorization: Bearer <token>` for owner-restricted actions. Admin endpoints use `/admin/api/` with TOTP-based session cookies.

| Method + Path | Auth | Description |
|---------------|------|-------------|
| `GET /api/v1/pets/random` | None | Get a randomly generated unclaimed pet for guest preview |
| `POST /api/v1/claim` | None | Initiate email claim flow — sends 6-digit OTP to player email |
| `POST /api/v1/claim/verify` | None | Submit OTP code — returns 32-byte URL token on success |
| `POST /api/v1/claim/recover` | None | Recover lost pet access via email re-verification |
| `POST /api/v1/pets/:petId/train` | Bearer | Perform a training action (max 3/day, resets UTC 00:00) |
| `POST /api/v1/pets/:petId/feed` | Bearer | Feed special food item to boost stats |
| `POST /api/v1/arena/enter` | Bearer | Enter arena matchmaking queue (rate limit: 10 battles/hour) |
| `GET /api/v1/arena/match/:matchId` | None | Retrieve full battle record with deterministic replay log |
| `GET /api/v1/arena/history/:petId` | None | Per-pet battle history (last 20 battles + OG metadata for share card) |
| `GET /api/v1/leaderboard` | None | Global leaderboard — top 100 pets by win rate |
| `POST /api/v1/gdpr/request` | Bearer | Submit GDPR erasure request (email deleted within 7 days) |

For request/response schemas, error codes, rate limits, and pagination see the full API reference:

- Markdown source: [docs/API.md](docs/API.md)
- HTML online: [docs/pages/api.html](docs/pages/api.html)

---

## Directory Structure

```
pixel-pet-arena/
├── .github/                  # GitHub Actions CI/CD workflows
│   └── workflows/
│       ├── ci.yml            # Lint, typecheck, test (Node 20/22 matrix), build on every PR
│       └── deploy.yml        # Deploy to staging / production (Railway + Vercel)
├── docs/                     # Markdown source for all design documents
│   ├── BRD.md                # Business Requirements Document
│   ├── PRD.md                # Product Requirements Document (18 User Stories)
│   ├── PDD.md                # Product Design Document (UX + interaction specs)
│   ├── EDD.md                # Engineering Design Document (v2.0)
│   ├── ARCH.md               # Architecture + ADRs (C4 diagrams)
│   ├── API.md                # REST API reference (28 endpoints)
│   ├── SCHEMA.md             # PostgreSQL schema reference (42 entities) + migration SQL
│   ├── CONSTANTS.md          # All numeric constants (single source of truth)
│   ├── ANIM.md               # Phaser animation state machine + sprite specs
│   ├── FRONTEND.md           # Frontend architecture (React + Phaser + Vue)
│   ├── ADMIN_IMPL.md         # Admin portal implementation spec (Vue 3)
│   ├── CLIENT_IMPL.md        # Player app implementation spec (React + Phaser)
│   ├── ALIGN_REPORT.md       # Six-dimension alignment check report (91% AI Gencode Ready)
│   ├── RTM.md                # Requirements Traceability Matrix
│   ├── test-plan.md          # Test plan + tooling
│   ├── CICD.md               # CI/CD pipeline specification
│   ├── LOCAL_DEPLOY.md       # Local development environment setup guide
│   ├── runbook.md            # Operations runbook (incident response)
│   ├── BDD-server.md         # BDD server scenario index (12 feature files, 82 scenarios)
│   └── pages/                # HTML documentation site (auto-generated by gendoc)
├── features/                 # BDD Gherkin feature files — Server (Cucumber)
│   ├── arena-battle.feature
│   ├── pet-training.feature
│   ├── claim-flow.feature
│   └── ... (12 server feature files, 82 scenarios total)
│   └── client/               # BDD Gherkin feature files — Client E2E (10 files, 133 scenarios)
├── docker-compose.yml        # Local multi-service development stack
└── .env.example              # Annotated environment variable template
```

> **Note:** `src/` and `tests/` directories will be created during the AI codegen phase. This repo represents the complete pre-implementation design — 215 BDD scenarios, OpenAPI contracts, TypeScript interfaces, and SQL schemas are all ready for code generation.

---

## Documentation

The full documentation suite is auto-generated into a static HTML site at **[docs/pages/index.html](docs/pages/index.html)**.

| Document | Markdown Source | HTML | Description |
|----------|----------------|------|-------------|
| BRD | [docs/BRD.md](docs/BRD.md) | [brd.html](docs/pages/brd.html) | Business goals, ROI analysis, stakeholder sign-off |
| PRD | [docs/PRD.md](docs/PRD.md) | [prd.html](docs/pages/prd.html) | User stories (18 US), acceptance criteria, priority tiers |
| PDD | [docs/PDD.md](docs/PDD.md) | [pdd.html](docs/pages/pdd.html) | UX flows, wireframes, component specs, design tokens |
| EDD | [docs/EDD.md](docs/EDD.md) | [edd.html](docs/pages/edd.html) | Architecture, tech stack, data models, ADRs |
| ARCH | [docs/ARCH.md](docs/ARCH.md) | [arch.html](docs/pages/arch.html) | C4 diagrams, ADRs, security model (STRIDE/OWASP) |
| API | [docs/API.md](docs/API.md) | [api.html](docs/pages/api.html) | REST API endpoints (28), request/response schemas, error codes |
| SCHEMA | [docs/SCHEMA.md](docs/SCHEMA.md) | [schema.html](docs/pages/schema.html) | PostgreSQL table definitions (42 entities), ERD, migration SQL |
| CONSTANTS | [docs/CONSTANTS.md](docs/CONSTANTS.md) | [constants.html](docs/pages/constants.html) | All numeric constants (authoritative source) |
| BDD-Server | [features/](features/) | [bdd-server.html](docs/pages/bdd-server.html) | 12 server feature files, 82 Gherkin scenarios |
| BDD-Client | [features/client/](features/client/) | [bdd-client.html](docs/pages/bdd-client.html) | 10 client feature files, 133 E2E scenarios |
| ANIM | [docs/ANIM.md](docs/ANIM.md) | [anim.html](docs/pages/anim.html) | Phaser animation state machine, sprite atlas spec |
| CICD | [docs/CICD.md](docs/CICD.md) | [cicd.html](docs/pages/cicd.html) | CI/CD pipeline (GitHub Actions, Node 20/22 matrix) |
| LOCAL_DEPLOY | [docs/LOCAL_DEPLOY.md](docs/LOCAL_DEPLOY.md) | [local_deploy.html](docs/pages/local_deploy.html) | Local docker-compose setup guide |

---

## Testing

### Run All Tests

```bash
npm test
# Runs Vitest unit + integration + Playwright E2E + Cucumber BDD
```

### Generate Coverage Report

```bash
npm run test:coverage
# Coverage report written to coverage/lcov-report/index.html
```

Coverage target: **80% lines, branches, functions.** The CI pipeline fails if coverage drops below this threshold (enforced via `COVERAGE_THRESHOLD=80` in GitHub Actions matrix across Node 20 and 22).

### Individual Test Types

```bash
# Unit tests only (Vitest)
npm run test:unit

# Integration tests (requires DATABASE_URL and REDIS_URL)
npm run test:integration

# BDD / Cucumber server feature tests (82 scenarios)
npm run test:bdd

# BDD / Cucumber client E2E tests (133 scenarios, requires running app)
npm run test:bdd:client

# Playwright E2E tests (requires running player + admin apps)
npm run test:e2e
```

### BDD Coverage

| Layer | Feature Files | Scenarios | Status |
|-------|-------------|----------|--------|
| Server (Cucumber) | 12 | 82 | Step stubs generated — ready for implementation |
| Client E2E (Playwright + Cucumber) | 10 | 133 | Step stubs generated — ready for implementation |
| **Total** | **22** | **215** | **Pre-implementation design phase** |

---

## Development Workflow

### Branch Strategy

| Branch | Purpose | Direct Push |
|--------|---------|-------------|
| `main` | Production-ready code, tagged releases | No — PR only |
| `develop` | Integration branch; staging deploys from here | No — PR only |
| `feature/US-XXX-short-description` | New features (link to PRD User Story) | Yes (author) |
| `fix/TC-XXX-short-description` | Bug fixes (link to BDD test case) | Yes (author) |
| `chore/short-description` | Tooling and maintenance | Yes (author) |

### Commit Message Format

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary in imperative mood>

[optional body — what and why, not how]

[optional footer — BREAKING CHANGE, closes #issue]
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `ci`

Examples:
```
feat(arena): implement race battle matchmaking via Redis ZPOPMIN
fix(claim): reject OTP codes older than 15 minutes (CLAIM_CODE_EXPIRY_MINUTES)
docs(readme): update quick-start for monorepo workspace structure
test(bdd): add step definitions for arena rate-limit scenarios
```

### Pull Request Checklist

Before requesting review, confirm all of the following:

- [ ] All CI checks are green (build, lint, type-check, tests on Node 20 + 22 matrix)
- [ ] Coverage has not dropped below 80%
- [ ] New API behavior is documented in `docs/API.md`
- [ ] All numeric values reference `CONSTANTS.md` — no magic numbers in code
- [ ] BDD scenarios exist for new AC before implementation (TDD)
- [ ] Breaking schema changes include migration SQL in `docs/SCHEMA.md`

---

## Deployment

### Staging

Staging deploys automatically on every merge to `develop`. The pipeline runs the full test suite on Node.js 20 and 22 matrix, builds Docker images, and deploys to Railway staging environment.

```bash
# Trigger a manual staging deploy (GitHub Actions)
gh workflow run deploy.yml -f environment=staging -f ref=develop
```

### Production

Production deploys are triggered by tagging a release on `main`:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

The CI pipeline promotes the staging image (already tested) to production without a rebuild. Vercel deploys frontend SPAs automatically on every `main` push.

### Rollback

If a production issue is detected (SLO: 99.9% monthly, ≤43.8 min downtime/month):

```bash
# Roll back Railway API deployment
railway rollback --service api

# Or identify previous stable tag via GitHub releases
gh release list --limit 5
```

For full incident response procedures including database rollback and GDPR emergency erasure see [docs/runbook.md](docs/runbook.md).

---

## Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| `Error: connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL not running or `DATABASE_URL` wrong | Start PostgreSQL or Supabase (`supabase start`), verify `DATABASE_URL` in `.env.local`, run `npm run db:migrate` |
| `Error: Redis connection refused` | Redis not running or `REDIS_URL` wrong | Start Redis (`redis-server`) and confirm `REDIS_URL=redis://localhost:6379` in `.env.local` |
| OTP email not received locally | SendGrid not configured for local dev | Expected — use Supabase Inbucket at `http://localhost:54324` to capture local emails |
| `TOTP_SETUP_REQUIRED` on admin login | Admin account has no TOTP configured | Complete TOTP setup via `POST /admin/api/auth/totp/setup` with the `setupToken` from the 403 response |
| Arena matchmaking stuck / no opponent | Only one pet in queue; AI fallback pending | Wait 30 seconds (`ARENA_MATCHMAKING_TIMEOUT_SECONDS = 30`); AI bot opponent is paired automatically |
| `429 Too Many Requests` on `/arena/enter` | Exceeded 10 battles/hour default limit | Wait for the hourly window to reset. Admin can adjust via `PUT /admin/api/config/runtime` |
| `JWT_SECRET` validation error at startup | Missing or short JWT_SECRET env var | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"` |
| Docker Compose services restart repeatedly | Missing `.env.local` required values | Run `docker compose logs api` to see the startup validation error; confirm all required vars are set |

---

## Known Limitations

- **RBAC role count**: FRONTEND/ADMIN_IMPL currently implement 3 roles (`super_admin`, `moderator`, `read_only`) while PRD §9.6 defines 4 (`super_admin`, `moderator`, `analyst`, `support_agent`). The 3-role model is a deliberate MVP simplification pending product decision on role granularity.
- **Notification Bounded Context**: EDD §4 ADR for notification service architecture (embedded vs. separate BC) is pending documentation. Current implementation uses embedded email within the claim BC.
- **US-ADMIN-003 BDD**: Admin GDPR audit trail user story lacks server-side BDD scenarios. These will be added in the post-MVP sprint.
- **Pre-implementation phase**: `src/` and `tests/` directories do not yet exist. This repo represents the complete design phase — all 215 BDD scenarios, OpenAPI contracts, TypeScript interfaces, and SQL schemas are ready for AI codegen.

---

## Architecture Quick Reference

| Key Decision | Choice | Document |
|-------------|------|---------|
| API paradigm | REST (Fastify 4 + JSON Schema validation) | [docs/ARCH.md](docs/ARCH.md#adr) |
| Database | PostgreSQL 15 (Supabase managed, 42 entity types) | [docs/SCHEMA.md](docs/SCHEMA.md) |
| Authentication | Email OTP (6-digit, 15-min TTL) → 32-byte URL token (no passwords) | [docs/ARCH.md](docs/ARCH.md#security) |
| Arena matchmaking | Redis ZPOPMIN + AI bot fallback after 30s timeout | [docs/EDD.md](docs/EDD.md) |
| Identity model | No traditional accounts; URL token as identity anchor; GDPR erasure within 7 days | [docs/PRD.md](docs/PRD.md) |

Primary ADRs: [docs/ARCH.md — ADR section](docs/ARCH.md#adr) — covers modular monolith, React/Phaser split, dual-stack frontend, token identity model.

---

## Security Policy

如發現安全漏洞，請**不要**透過公開 Issue 回報。

**負責任揭露（Responsible Disclosure）：**
- 使用 GitHub 私人漏洞回報：[Security Advisories](https://github.com/pixel-pet-arena/pixel-pet-arena/security/advisories/new)
- 或發送 Email 至：`security@pixelpetarena.com`

**回應承諾（SLA）：**

| 嚴重等級 | 確認 | 修復目標 |
|--------|------|---------|
| Critical | 48 小時內確認 | 72 小時內修復 |
| High | 48 小時內確認 | 7 日內修復 |
| Medium / Low | 48 小時內確認 | 90 日內修復並公開披露（CVE） |

詳見 [SECURITY.md](SECURITY.md)

---

## Contributing

Contributions are welcome. Please read this section before submitting a pull request.

### Fork and PR Flow

1. Fork the repository on GitHub
2. Create a feature branch from `develop`: `git checkout -b feature/US-XXX-your-feature develop`
3. Write BDD scenarios first (in `features/`) — TDD approach is required
4. Commit using Conventional Commits format (see [Development Workflow](#development-workflow))
5. Push your branch and open a PR against `develop` (not `main`)
6. Address all review feedback; request re-review after each update

### Code Style

- Code is formatted by **Prettier** on save (configured in `.prettierrc`)
- Lint rules defined in `.eslintrc.cjs` (TypeScript ESLint + Unicorn plugin)
- Type-checking: `npm run typecheck` — CI blocks on type errors
- Run `npm run format` locally before committing to avoid CI failures
- Module size hard limits: 800 lines/module, 50 lines/function (enforced by ESLint `max-lines`)
- No magic numbers — all numeric constants must reference `CONSTANTS.md`

---

## Code of Conduct

本專案採用 [Contributor Covenant](https://www.contributor-covenant.org/) v2.1 作為行為準則。
詳見 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

如有違規事宜，請聯繫 `conduct@pixelpetarena.com`

---

## License

MIT License

Copyright (c) 2026 Pixel Pet Arena Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

See [LICENSE](LICENSE) for the full text.

---

> *This README and all docs under `docs/` were generated by [gendoc](https://github.com/ibalasite/gendoc) — a document-driven design pipeline for AI-assisted software development. Every section traces to a tracked requirement in BRD/PRD/EDD.*
