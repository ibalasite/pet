<!--
  DOC-ID:  README-PIXEL-PET-ARENA-20260505
  Version: v1.1
  Status:  DRAFT
  Author:  AI Generated (gendoc readme)
  Date:    2026-05-05
  Upstream docs:
    - BRD: docs/BRD.md   (BRD-PIXEL-PET-ARENA-20260503)
    - PRD: docs/PRD.md   (PRD-PIXEL-PET-ARENA-20260503)
    - PDD: docs/PDD.md   (PDD-PIXEL-PET-ARENA-20260503)
    - EDD: docs/EDD.md   (EDD-PIXEL-PET-ARENA-20260503)
    - ARCH: docs/ARCH.md (ARCH-PIXEL-PET-ARENA-20260503)
    - API: docs/API.md   (API-PIXEL-PET-ARENA-20260503)
  Change log:
    v1.0  2026-05-05  AI Generated (gendoc readme)  Initial generated draft
    v1.1  2026-05-05  AI Generated (gendoc readme)  Fix GitHub repo URLs to ibalasite/pet
-->

# pixel-pet-arena

> Zero-account-barrier HTML5 browser game where players claim, train, and battle procedurally-generated pixel pets via email — no registration required.

[![CI](https://github.com/ibalasite/pet/actions/workflows/ci.yml/badge.svg)](https://github.com/ibalasite/pet/actions/workflows/ci.yml)
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
- [Known Limitations](#known-limitations)
- [Changelog](#changelog)
- [Development Guide](#development-guide)
- [License](#license)
- [Security Policy](#security-policy)
- [Architecture Quick Reference](#architecture-quick-reference)
- [Code of Conduct](#code-of-conduct)

---

## Overview

**pixel-pet-arena** is a zero-account-barrier HTML5 browser game where players discover and claim procedurally-generated pixel pets using only their email address — no account registration, no password to remember.

It was built to solve the mutual exclusivity between "no account barrier" and "persistent data" that has prevented casual players from truly owning virtual pets on the web. The core innovation is **email as a lightweight identity layer**: a 6-digit OTP produces a 32-byte cryptographic URL token. Players bookmark their unique URL — that URL is their identity.

The project is governed by the upstream documents below; every design decision maps to a tracked requirement:

| Document | Purpose |
|----------|---------|
| [BRD](docs/BRD.md) | Business goals, success metrics, stakeholder sign-off |
| [PRD](docs/PRD.md) | User stories, acceptance criteria, priority tiers |
| [PDD](docs/PDD.md) | UX flows, interaction specs, design tokens |
| [EDD](docs/EDD.md) | Architecture decisions, technology choices, data models |

See [System Architecture](#system-architecture) below for a visual overview, and [Documentation](#documentation) for the full HTML reference site.

---

## Core Features

**P0 — Must ship for v1.0:**

- **Random Pixel Pet Generation** — Each pet is procedurally generated across 6 attribute dimensions (body, head, color_palette, accessory, rarity_trait, pattern) guaranteeing ≥ 1 billion unique combinations. 32×32 px sprite rendered on HTML5 Canvas via Phaser.js 3.
- **Email Claim Flow** — Guests interact immediately with no login wall. Entering an email sends a 6-digit OTP + permanent unique URL. The pet is accessible from any device via that bookmarked URL forever.
- **Pet Training & Feeding System** — 3 training actions per day (reset UTC 00:00). Special food items grant stat buffs to Speed, Strength, or Stamina (max 100 each). Pets visually degrade after 3 days of neglect.
- **Arena Combat** — Race mode (Speed-weighted) and Sumo mode (Strength-weighted) with ±15% seeded random modifier. Real-time matchmaking with 30-second AI fallback. Rate-limited to 10 battles/hour per pet.
- **Global Leaderboard** — Top 100 pets by win rate, updated within 30 seconds via Redis sorted set. Filterable by rarity tier (Common / Rare / Epic / Legendary).
- **Battle Records Page** — Shareable URL displaying the last 20 battles per pet with outcomes, stat snapshots, and opponent info.

**P1 — Roadmap:**

- Rarity scoring system (Common 60% / Rare 25% / Epic 12% / Legendary 3%) with visual badges.
- Sumo arena mode (Strength-weighted) as additional arena variant.

**P2 — Future:**

- Pet trading marketplace (5% platform fee), tournament system, seasonal competitions.

---

## System Architecture

```mermaid
flowchart TB
    subgraph Browser["Browser — Vercel CDN"]
        PA["Player App\nReact 18 + Phaser.js 3\nVite 5 / TypeScript 5"]
        AP["Admin Portal\nVue 3 + Element Plus\nVite 5 / TypeScript 5"]
    end

    subgraph API["API Layer — Railway (autoscale HPA 70% CPU)"]
        GA["Game API\nFastify 4 / Node.js 20 LTS\n≥ 2 replicas"]
        AA["Admin API\nFastify 4 / Node.js 20 LTS\n1 replica"]
    end

    subgraph Data["Data Tier"]
        PG[("PostgreSQL 15+\nSupabase managed\nDaily S3 backup")]
        RD[("Redis 7+\nUpstash serverless\nLeaderboard · Rate-limits · Sessions")]
    end

    subgraph Email["Email Services"]
        SG["SendGrid v3\nprimary"]
        NM["Nodemailer SMTP\nfallback — activates after\n3 consecutive SendGrid failures"]
    end

    PA -->|"REST /api/v1/*"| GA
    AP -->|"REST /admin/api/*"| AA
    GA --> PG
    GA --> RD
    AA --> PG
    AA --> RD
    GA -->|"transactional email"| SG
    SG -.->|"failover"| NM
```

> For component-level detail, data flow diagrams, and ADR records see:
> - [EDD — Engineering Design Document](docs/EDD.md) (architecture + implementation)
> - [ARCH — System Architecture](docs/ARCH.md) (C4 diagrams + ADRs)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend (Player)** | React 18 + Phaser.js 3 + Vite 5 + TypeScript 5 | Canvas rendering for pixel pets; TanStack Query v5, Zustand, React Hook Form + Zod |
| **Frontend (Admin)** | Vue 3 + Element Plus + Vite 5 + TypeScript 5 | Data-dense admin portal; separate Vite build deployed independently |
| **Backend** | Node.js 20 LTS + Fastify 4 | Game API + Admin API as two Fastify plugins in one monorepo |
| **Database** | PostgreSQL 15+ (Supabase managed) | Primary writer + 1 read replica; auto-failover 60s; daily S3 backup |
| **Cache / Queue** | Redis 7+ (Upstash serverless) | Leaderboard sorted set, rate-limit counters, admin sessions, matchmaking queue |
| **Infrastructure** | Vercel (frontend CDN) + Railway (API, autoscale) | HPA triggers at 70% CPU; ≥ 2 API replicas for game server |
| **CI / CD** | GitHub Actions | Lint → Test → Build → Deploy pipeline; coverage gate ≥ 80% |
| **Email** | SendGrid v3 (primary) + Nodemailer SMTP (fallback) | Failover after 3 consecutive SendGrid failures; SPF + DKIM configured |
| **Testing** | Vitest (unit) + Supertest (integration) + Playwright (E2E) + Cucumber (BDD) | 80% coverage enforced as CI gate |

---

## Quick Start

### Prerequisites

- [Git](https://git-scm.com/) 2.40+
- An `.env` file — copy from `.env.example` (see [Environment Variables](#environment-variables))

---

### Docker (Recommended)

The fastest path: Docker Compose starts the app, PostgreSQL, Redis, and MailHog (local email catcher) with a single command.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) 24+ (includes Compose v2)

```bash
git clone https://github.com/ibalasite/pet.git
cd pet

# Configure environment
cp .env.example .env
# Edit .env — at minimum confirm POSTGRES_PASSWORD and generate EMAIL_ENCRYPTION_KEY:
# openssl rand -hex 32

# Start all services (app + postgres + redis + mailhog)
docker compose up -d

# Confirm everything is healthy
docker compose ps
# Expected: all services show "running (healthy)"
```

Verify the app is responding:

```bash
curl http://localhost:3000/health
# {"status":"ok","version":"1.0.0","uptime":3}
```

Open the player app at **http://localhost:5173** and the admin portal at **http://localhost:5174**.

MailHog web UI (captured claim emails): **http://localhost:8025**

---

### macOS / Linux (Native)

**Prerequisites:**

- Node.js 20 LTS ([install guide](https://nodejs.org/en/download/))
- PostgreSQL 15+ (local) or a remote Supabase connection string
- Redis 7+ (local) or a remote Upstash connection string

```bash
git clone https://github.com/ibalasite/pet.git
cd pet

# Install all workspace dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your local database, Redis, and email credentials

# Run database migrations
npm run db:migrate

# Start the development servers (API + player app + admin portal concurrently)
npm run dev
```

Expected output:

```
[game-api]  Listening on http://localhost:3000
[game-api]  Database: connected (postgres://localhost:5432/pixel_pet_arena)
[game-api]  Redis: connected (redis://localhost:6379)
[player-app] VITE v5.x.x  ready in 800 ms  →  http://localhost:5173/
[admin-app]  VITE v5.x.x  ready in 900 ms  →  http://localhost:5174/
```

---

### Windows (PowerShell)

> **Recommendation:** Use [WSL 2](https://learn.microsoft.com/windows/wsl/install) + Docker Desktop for the smoothest experience. The commands below work in PowerShell 7+ natively.

**Prerequisites:** Node.js 20 LTS, PostgreSQL 15+, Redis 7+ (all installable via [winget](https://learn.microsoft.com/windows/package-manager/)).

```powershell
git clone https://github.com/ibalasite/pet.git
Set-Location pet

# Install all workspace dependencies
npm install

# Configure environment
Copy-Item .env.example .env
# Open .env in your editor and fill in database / Redis / email credentials

# Run database migrations
npm run db:migrate

# Start the development servers
npm run dev
```

Verify the server started:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

---

## Environment Variables

Copy `.env.example` to `.env` before starting. The app validates all required variables at startup and exits with a clear error if any are missing.

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `POSTGRES_DB` | PostgreSQL database name | Yes | — | `pixel_pet_arena` |
| `POSTGRES_USER` | PostgreSQL username | Yes | — | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | Yes | — | `changeme_local` |
| `SENDGRID_API_KEY` | SendGrid v3 API key for transactional email | Yes (prod) | — | `SG.xxxxx` |
| `EMAIL_ENCRYPTION_KEY` | AES-256-GCM key for GDPR email storage (hex 32 bytes) | Yes | — | `openssl rand -hex 32` |
| `REDIS_URL` | Redis connection string (Upstash or local) | No | `redis://localhost:6379` | `rediss://user:pass@host:6380` |
| `DATABASE_URL` | Full PostgreSQL connection string (overrides POSTGRES_* vars) | No | built from POSTGRES_* | `postgresql://user:pass@localhost:5432/pixel_pet_arena` |
| `APP_PORT` | HTTP port the Game API listens on | No | `3000` | `8080` |
| `LOG_LEVEL` | Minimum log level (`debug`, `info`, `warn`, `error`) | No | `info` | `debug` |
| `ADMIN_TOTP_SECRET` | TOTP secret for admin 2FA (base32) | Yes (prod) | — | `JBSWY3DPEHPK3PXP` |

See `.env.example` for the full annotated list and optional tuning parameters.

---

## API Quick Reference

All player-facing endpoints use `/api/v1/` prefix. All admin endpoints use `/admin/api/` prefix. Authentication: pet endpoints use `Authorization: Bearer <pet_access_token>`; admin endpoints use httpOnly session cookie + TOTP.

| Method + Path | Auth | Description |
|---------------|------|-------------|
| `POST /api/v1/claim/initiate` | None | Send 6-digit OTP to email address to begin claim |
| `POST /api/v1/claim/verify` | None | Verify OTP code → receive permanent pet access token + URL |
| `GET /api/v1/pets/:petId` | None | Retrieve public pet profile (stats, appearance, rarity) |
| `POST /api/v1/pets/:petId/train` | Pet token | Perform 1 training action (max 3/day, reset UTC 00:00) |
| `GET /api/v1/leaderboard` | None | Top 100 pets by win rate; filterable by rarity |
| `GET /api/v1/arena/battles/:petId` | None | Last 20 battle records for a pet (shareable URL) |
| `POST /api/v1/arena/enter` | Pet token | Enter arena queue (race or sumo mode); rate-limited 10/hr |
| `GET /health` | None | Service health check with version and uptime |

For full request/response schemas, error codes, rate limits, and admin endpoints see:

- Markdown source: [docs/API.md](docs/API.md)
- HTML online: [docs/pages/api.html](docs/pages/api.html)

---

## Directory Structure

```
pixel-pet-arena/
├── .github/                    # GitHub Actions CI/CD workflows
│   └── workflows/
│       ├── ci.yml              # Lint, test, build on every PR
│       └── deploy.yml          # Deploy to Railway + Vercel
├── apps/
│   ├── game-api/               # Fastify 4 Game API (Node.js 20 LTS)
│   │   ├── src/
│   │   │   ├── claim/          # OTP generation, email dispatch, token issuance
│   │   │   ├── pets/           # Pet CRUD, training, feeding
│   │   │   ├── arena/          # Matchmaking, battle engine, result recording
│   │   │   ├── leaderboard/    # Redis sorted set reads + PostgreSQL fallback
│   │   │   └── shared/         # Config, logger, Zod schemas, DB client
│   │   └── package.json
│   ├── admin-api/              # Fastify 4 Admin API (Node.js 20 LTS)
│   │   └── src/
│   │       ├── auth/           # TOTP login, session management
│   │       ├── pets/           # Admin pet management, ban, override
│   │       ├── gdpr/           # GDPR queue processing
│   │       └── config/         # Runtime parameter tuning
│   ├── player-app/             # React 18 + Phaser.js 3 player SPA
│   │   └── src/
│   │       ├── game/           # Phaser.js canvas engine, sprite generator
│   │       ├── claim/          # Claim flow (3-step compound component)
│   │       ├── arena/          # Arena lobby, match UI
│   │       └── leaderboard/    # Leaderboard page
│   └── admin-portal/           # Vue 3 + Element Plus admin SPA
├── packages/
│   ├── shared-types/           # Shared TypeScript types across all apps
│   └── constants/              # Shared game constants from constants.json
├── docs/                       # Markdown source for all design documents
│   ├── BRD.md                  # Business Requirements Document
│   ├── PRD.md                  # Product Requirements Document
│   ├── PDD.md                  # Product Design Document (UX)
│   ├── EDD.md                  # Engineering Design Document
│   ├── ARCH.md                 # System Architecture + ADRs
│   ├── API.md                  # REST API reference
│   ├── SCHEMA.md               # Database schema reference
│   ├── test-plan.md            # Test Plan + RTM
│   └── pages/                  # Generated HTML documentation site
├── features/                   # Cucumber/Gherkin BDD feature files (server)
│   ├── claim-flow.feature
│   ├── arena-battle.feature
│   ├── leaderboard.feature
│   └── client/                 # Playwright E2E feature files
├── docs/pages/prototype/       # Interactive HTML/CSS/JS prototype
├── .env.example                # Annotated environment variable template
├── docker-compose.yml          # Local multi-service development stack
└── package.json                # Monorepo root (npm workspaces)
```

---

## Documentation

The full documentation suite is generated into a static HTML site in `docs/pages/`.

| Document | Markdown Source | HTML | Description |
|----------|----------------|------|-------------|
| BRD | [docs/BRD.md](docs/BRD.md) | [brd.html](docs/pages/brd.html) | Business goals, ROI analysis, stakeholder sign-off |
| PRD | [docs/PRD.md](docs/PRD.md) | [prd.html](docs/pages/prd.html) | User stories, acceptance criteria, priority tiers |
| PDD | [docs/PDD.md](docs/PDD.md) | [pdd.html](docs/pages/pdd.html) | UX flows, wireframes, component specs |
| EDD | [docs/EDD.md](docs/EDD.md) | [edd.html](docs/pages/edd.html) | Architecture, technology choices, data models |
| ARCH | [docs/ARCH.md](docs/ARCH.md) | [arch.html](docs/pages/arch.html) | C4 diagrams, component architecture, ADRs |
| API | [docs/API.md](docs/API.md) | [api.html](docs/pages/api.html) | REST API endpoints, schemas, error codes |
| SCHEMA | [docs/SCHEMA.md](docs/SCHEMA.md) | [schema.html](docs/pages/schema.html) | Database table definitions and ERD |
| BDD | [features/](features/) | [bdd-server.html](docs/pages/bdd-server.html) | Gherkin server feature files |
| E2E BDD | [features/client/](features/client/) | [bdd-client.html](docs/pages/bdd-client.html) | Playwright E2E feature files |
| Test Plan | [docs/test-plan.md](docs/test-plan.md) | [test-plan.html](docs/pages/test-plan.html) | Test strategy, coverage matrix, RTM |

Regenerate the HTML site:

```bash
python3 ~/.claude/skills/gendoc/tools/bin/gen_html.py
# Output: docs/pages/*.html
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Generate Coverage Report

```bash
npm run test:coverage
# Report written to coverage/lcov-report/index.html
```

Coverage target: **80% lines, branches, functions.** The CI pipeline fails if coverage drops below this threshold.

### Individual Test Types

```bash
# Unit tests only (Vitest)
npm run test:unit

# Integration tests (requires DATABASE_URL and REDIS_URL)
npm run test:integration

# BDD / Cucumber feature tests (server)
npm run test:bdd

# End-to-end tests (Playwright, requires a running app instance)
npm run test:e2e
```

### Performance Targets

| Metric | Target |
|--------|--------|
| P99 read latency | < 200 ms at 100 RPS |
| P99 write latency | < 500 ms at 100 RPS |
| LCP (player app) | < 2.5 s |
| FCP (player app) | < 1.5 s |
| CLS | < 0.1 |

---

## Known Limitations

1. **Email pre-scan (Gmail/Outlook)**: Email clients may auto-click URLs in emails. Mitigated by using a 6-digit numeric code + separate URL (not a magic-link), requiring manual code entry.
2. **Token enumeration surface**: Pet access tokens are 32-byte cryptographically random — brute-force infeasible — but long-lived. Pets with no owner interaction for `PET_RESERVATION_TTL_HOURS` (24h) are cleaned up.
3. **Arena matchmaking at low CCU**: With < ~50 online players, AI-controlled opponents fill matchmaking after the 30-second timeout. AI fallback stats are seeded from the global average.
4. **Leaderboard eventual consistency**: Redis sorted set may lag up to 30 seconds behind the authoritative PostgreSQL `battle_records` table during peak load. Displayed with a "last updated" timestamp.
5. **Marketplace (P2) not yet implemented**: Pet trading feature (`FF_MARKETPLACE`) is behind a feature flag and not available in v1.0.

---

## Changelog

See [GitHub Releases](https://github.com/ibalasite/pet/releases) for versioned release notes.

---

## Development Guide

> This README is auto-generated from `docs/BRD.md`, `docs/PRD.md`, `docs/EDD.md`, `docs/ARCH.md`, and related upstream documents via the `gendoc` pipeline. To regenerate: `/gendoc readme`.

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for the full onboarding guide including branch strategy, commit message format, PR checklist, local environment tips, and release process.

---

## License

MIT License

Copyright (c) 2026 pixel-pet-arena contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

See [LICENSE](LICENSE) for the full text.

---

## Security Policy

### Responsible Disclosure

If you discover a security vulnerability, **do not open a public GitHub Issue**. Instead, email **security@pixel-pet-arena.com** with:

1. A description of the vulnerability and its potential impact
2. Steps to reproduce
3. Any suggested mitigations

**Response SLA:**

| Severity | Acknowledgement | Initial Assessment | Patch Target |
|----------|----------------|-------------------|--------------|
| Critical | 72 hours | 72 hours | 7 days |
| High | 72 hours | 7 days | 30 days |
| Medium | 72 hours | 14 days | 90 days |

We credit responsible disclosures in release notes. See [SECURITY.md](SECURITY.md) for the full policy.

---

## Architecture Quick Reference

| Key Decision | Choice | Document |
|-------------|--------|---------|
| API paradigm | REST (`/api/v1/`, `/admin/api/`) | [docs/ARCH.md §ADR](docs/ARCH.md#adr) |
| Database | PostgreSQL 15+ (Supabase managed) + Redis 7+ (Upstash) | [docs/SCHEMA.md](docs/SCHEMA.md) |
| Authentication | Email OTP → 32-byte cryptographic URL token (no sessions for players); TOTP for admin | [docs/ARCH.md §5 Security](docs/ARCH.md#5-security-architecture) |
| Frontend separation | Player app (React + Phaser.js) and Admin portal (Vue 3) as separate Vite builds | [docs/EDD.md §1](docs/EDD.md) |
| Deployment platform | Vercel (frontend CDN) + Railway (API, autoscale HPA 70% CPU) | [docs/LOCAL_DEPLOY.md](docs/LOCAL_DEPLOY.md) |

Main ADRs: [docs/ARCH.md — Architecture Decision Records](docs/ARCH.md#14-architecture-decision-records)

---

## Code of Conduct

This project adopts the [Contributor Covenant](https://www.contributor-covenant.org/) v2.1 as its Code of Conduct.

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for the full text.

For violations, contact the maintainers at **conduct@pixel-pet-arena.com**.
