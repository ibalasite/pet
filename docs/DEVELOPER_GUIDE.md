# Developer Guide — pixel-pet-arena

**DOC-ID**: DEVGUIDE-PIXEL-PET-ARENA-20260504
**Status**: ACTIVE
**Last Updated**: 2026-05-04
**Audience**: Engineers working day-to-day on the pixel-pet-arena monorepo

This guide is your practical day-to-day reference. It covers the most common tasks you will encounter, how to diagnose CI failures, and a quick-reference cheat sheet. For deep architecture detail see `docs/ARCH.md`; for deployment runbooks see `docs/runbook.md`; for CI pipeline specs see `docs/CICD.md`.

---

## Table of Contents

1. [Daily Scenarios](#1-daily-scenarios)
2. [Architecture Overview](#2-architecture-overview)
3. [Testing Guide](#3-testing-guide)
4. [CI/CD Diagnosis](#4-cicd-diagnosis)
5. [Quick Reference](#5-quick-reference)
6. [Troubleshooting Runbook](#6-troubleshooting-runbook)

---

## 1. Daily Scenarios

This section walks you through the most common engineering tasks step by step. Each scenario names the exact files to touch, the commands to run, and how to verify your work is correct before opening a pull request.

---

### 1.1 Adding a New API Endpoint

The API lives in `apps/api/` and is built on Fastify 4 with TypeScript. Routes are organised by domain under `apps/api/src/`.

**Step 1 — Create the route file.**

Place a new file alongside its domain siblings. For example, a new endpoint on the arena resource goes in `apps/api/src/arena/arena.routes.ts`. Follow the existing pattern: a default-exported async function that accepts a `FastifyInstance` and registers routes on it.

```typescript
// apps/api/src/arena/arena.routes.ts
import type { FastifyInstance } from 'fastify';
import { ArenaService } from './arena.service';
import { getBattleSchema } from './arena.schema';

export default async function arenaRoutes(app: FastifyInstance) {
  const service = new ArenaService(app.db, app.redis);

  app.get('/arena/battles/:battleId', {
    schema: getBattleSchema,
  }, async (request, reply) => {
    const { battleId } = request.params as { battleId: string };
    const battle = await service.getBattle(battleId);
    return reply.send(battle);
  });
}
```

**Step 2 — Define the JSON schema.**

All request and response shapes are defined as Fastify/JSON Schema objects in a co-located schema file, e.g. `apps/api/src/arena/arena.schema.ts`. This drives automatic validation and OpenAPI generation. Import shared Zod schemas from `packages/shared/src/` and convert them with `zodToJsonSchema` where applicable.

**Step 3 — Register the route plugin.**

Open the router index (typically `apps/api/src/router.ts` or `apps/api/src/app.ts`) and register your new route module under the correct prefix:

```typescript
await app.register(arenaRoutes, { prefix: '/api/v1' });
```

**Step 4 — Implement the service layer.**

Business logic belongs in `apps/api/src/arena/arena.service.ts`. The service constructor receives `db` (the `pg` pool) and `redis` (the ioredis client) via dependency injection from the Fastify instance. Never put SQL directly in a route handler.

**Step 5 — Write tests before committing.**

Create `apps/api/src/arena/arena.service.test.ts` for unit tests and `apps/api/src/arena/arena.routes.test.ts` for integration tests that spin up the full Fastify app against the local Supabase stack. Run the new test in watch mode while you implement:

```bash
pnpm --filter api test -- --watch src/arena/arena.routes.test.ts
```

**Step 6 — Verify end-to-end locally.**

With the API running (`pnpm --filter api dev`), hit the new endpoint:

```bash
curl -X GET http://localhost:3000/api/v1/arena/battles/<uuid>
```

---

### 1.2 Adding a React Component to the Player Frontend

The player frontend is `apps/player/` — React 18 + Phaser 3, bundled by Vite 5.

**Step 1 — Create the component directory.**

Organise components by feature, not by file type. A new pet status card goes under `apps/player/src/components/pet-status/`:

```
apps/player/src/components/pet-status/
├── PetStatusCard.tsx
├── PetStatusCard.test.tsx
└── pet-status.css
```

**Step 2 — Write the component with TypeScript props.**

```typescript
// apps/player/src/components/pet-status/PetStatusCard.tsx
import type { Pet } from '@pixel-pet-arena/shared';
import './pet-status.css';

interface PetStatusCardProps {
  pet: Pet;
  onTrain: (statType: 'speed' | 'strength' | 'stamina') => void;
}

export function PetStatusCard({ pet, onTrain }: PetStatusCardProps) {
  return (
    <section className="pet-status-card" aria-label={`${pet.name} status`}>
      <h2>{pet.name}</h2>
      <p>Level {pet.level}</p>
      <button onClick={() => onTrain('speed')}>Train Speed</button>
    </section>
  );
}
```

**Step 3 — Connect to the API via TanStack Query.**

Data fetching belongs in a custom hook in `apps/player/src/hooks/`. Use `useQuery` for reads and `useMutation` for writes. The API base URL comes from `import.meta.env.VITE_API_BASE_URL`.

```typescript
// apps/player/src/hooks/usePet.ts
import { useQuery } from '@tanstack/react-query';

export function usePet(petToken: string) {
  return useQuery({
    queryKey: ['pet', petToken],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/v1/pets/${petToken}`
      );
      if (!res.ok) throw new Error('Failed to fetch pet');
      return res.json();
    },
  });
}
```

**Step 4 — Validate hot reload is working.**

The Vite dev server is already running at `http://localhost:5173`. Edit the component source — changes should appear in the browser within a few hundred milliseconds without a full page reload. If HMR stops working, see the [Troubleshooting Runbook](#6-troubleshooting-runbook).

**Step 5 — Use shared types from `@pixel-pet-arena/shared`.**

Always import domain types from the shared package rather than duplicating them. The shared package is linked via pnpm workspaces so changes to `packages/shared/src/` are available immediately without a separate build step in dev mode.

---

### 1.3 Adding a Vue Component to the Admin Portal

The admin portal is `apps/admin/` — Vue 3 with the Composition API, Element Plus, Pinia, and Vite 5.

**Step 1 — Create the component file.**

Use PascalCase filenames and single-file components. A new ban-management card goes under:

```
apps/admin/src/components/ban-management/
├── BanManagementCard.vue
└── ban-management.css
```

**Step 2 — Write the component using `<script setup>` syntax.**

```vue
<!-- apps/admin/src/components/ban-management/BanManagementCard.vue -->
<template>
  <el-card class="ban-management-card">
    <template #header>
      <span>Moderation — {{ pet.name }}</span>
    </template>
    <el-button type="danger" @click="handleBan">Ban Pet</el-button>
  </el-card>
</template>

<script setup lang="ts">
import { ElCard, ElButton } from 'element-plus';
import type { Pet } from '@pixel-pet-arena/shared';
import { useModerationStore } from '@/stores/moderation';

const props = defineProps<{ pet: Pet }>();
const store = useModerationStore();

function handleBan() {
  store.banPet(props.pet.id);
}
</script>
```

**Step 3 — Update the Pinia store if new state is needed.**

Pinia stores live in `apps/admin/src/stores/`. Each store is a composable defined with `defineStore`. Add a new action for any API call you introduce:

```typescript
// apps/admin/src/stores/moderation.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useModerationStore = defineStore('moderation', () => {
  const bannedPetIds = ref<string[]>([]);

  async function banPet(petId: string) {
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/api/pets/${petId}/ban`, {
      method: 'POST',
      credentials: 'include',
    });
    bannedPetIds.value.push(petId);
  }

  return { bannedPetIds, banPet };
});
```

**Step 4 — Follow Element Plus conventions.**

Import Element Plus components explicitly rather than using global registration. This keeps the bundle size predictable. Use `el-form` + `el-form-item` for all admin input forms, and `el-table` for data tables. Admin sessions use httpOnly cookies — always pass `credentials: 'include'` in fetch calls to the admin API.

**Step 5 — Start the admin dev server and verify.**

```bash
pnpm --filter admin-app dev
```

Open `http://localhost:5174`. Changes hot-reload automatically.

---

### 1.4 Adding a New Database Table

The database is PostgreSQL 15 managed via Supabase. All schema changes are tracked as migration files under `supabase/migrations/`.

**Step 1 — Generate a new migration file.**

Use the Supabase CLI to create a timestamped migration file:

```bash
supabase migration new add_food_inventory_table
```

This creates `supabase/migrations/<timestamp>_add_food_inventory_table.sql`.

**Step 2 — Write the DDL.**

Open the generated file and write your `CREATE TABLE` statement. Follow the existing schema conventions: UUID primary keys with `gen_random_uuid()`, `snake_case` column names, and explicit `NOT NULL` or `NULL` declarations on every column. Add `created_at` and `updated_at` timestamp columns with defaults.

```sql
CREATE TABLE food_inventory (
    id           UUID        NOT NULL DEFAULT gen_random_uuid(),
    pet_id       UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    food_type    TEXT        NOT NULL,
    quantity     INTEGER     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_food_inventory PRIMARY KEY (id)
);

CREATE INDEX idx_food_inventory_pet_id ON food_inventory (pet_id);
```

**Step 3 — Apply the migration to your local database.**

```bash
supabase db push
```

Supabase CLI applies all pending migrations in chronological order. Verify the table appeared in Supabase Studio at `http://localhost:54323`.

**Step 4 — Generate TypeScript types.**

After applying the migration, regenerate the TypeScript database types so application code can reference the new table with full type safety:

```bash
supabase gen types typescript --local > packages/shared/src/database.types.ts
```

Commit both the migration file and the updated `database.types.ts` in the same PR.

**Step 5 — Verify the migration runs cleanly from scratch.**

Reset the local database and re-apply all migrations to confirm the new migration does not conflict with earlier ones:

```bash
supabase db reset
pnpm db:seed
```

---

### 1.5 Enabling or Disabling a Feature Flag

Feature flags are environment variables read at runtime. Two flags are defined:

| Flag | Default | Purpose |
|---|---|---|
| `FF_MARKETPLACE` | `false` | Pet trading marketplace UI and API routes |
| `FF_ARENA_SUMO` | `true` | Sumo battle mode in the arena |

**Step 1 — Edit the API environment file.**

Feature flags are consumed by the API. Open `apps/api/.env.local` and set the value:

```bash
# Enable the marketplace during local development
FF_MARKETPLACE=true

# Disable sumo mode if you're working on race-only flows
FF_ARENA_SUMO=false
```

**Step 2 — Restart the API.**

The API reads environment variables at startup. Kill the running dev server and restart it:

```bash
# Stop with Ctrl+C, then:
pnpm --filter api dev
```

**Step 3 — Confirm the flag took effect.**

Check the `/health` endpoint or look for a log line during startup that lists active feature flags. Alternatively, call a flag-gated endpoint — if `FF_MARKETPLACE=false` and you call a marketplace route, the API should return `404` or `503`.

**Deployment implications**: Feature flags are set as environment variables in the production deployment environment (Railway dashboard or Kubernetes secret). The `FF_MARKETPLACE` flag must not be enabled in production until the DAU threshold of 1,000 sustained users for two consecutive weeks is met. Changes to production feature flags require a deployment restart or a dynamic config reload if the API supports it — check `apps/api/src/config.ts` for the reload mechanism.

---

### 1.6 Resetting the Local Development Environment

Run through this sequence any time your local environment is in an inconsistent state — after pulling a branch with new migrations, after a Supabase upgrade, or when debugging unexplained test failures.

```bash
# 1. Reset the Supabase database — drops all data, replays all migrations
supabase db reset

# 2. Re-seed the database with initial data (saves admin TOTP secret to stdout)
pnpm db:seed

# 3. Confirm the Redis container is running
docker start pixel-pet-redis

# 4. Verify Redis responds
docker exec -it pixel-pet-redis redis-cli ping
# Expected: PONG

# 5. Restart the API
pnpm --filter api dev

# 6. Confirm the API is healthy
curl http://localhost:3000/health
# Expected: {"status":"healthy","checks":{"database":"ok","redis":"ok"},...}

# 7. Restart the frontends (in separate terminals)
pnpm --filter player-app dev
pnpm --filter admin-app dev
```

Save the TOTP secret printed by `pnpm db:seed`. You need it to log into the admin portal at `http://localhost:5174/admin/login`. If you lose it, run `pnpm db:seed --reset-admin` to generate a new one.

---

## 2. Architecture Overview

This section gives a practical map of "where does X live?" For full architectural detail and design rationale, read `docs/ARCH.md`.

### 2.1 Request Lifecycle — Player Browser to API

```
Player browser
  │  HTTPS
  ▼
Vite dev server (localhost:5173)  ← HMR websocket for .tsx/.ts/.css changes
  │  fetch() to localhost:3000
  ▼
Fastify API (localhost:3000)
  │
  ├── Route plugin (apps/api/src/<domain>/<domain>.routes.ts)
  ├── JSON Schema validation (Fastify built-in, schema from <domain>.schema.ts)
  ├── Service layer (apps/api/src/<domain>/<domain>.service.ts)
  │
  ├── PostgreSQL (Supabase local, port 54322)  ← durable data
  └── Redis (Docker container, port 6379)      ← leaderboard + rate limits
```

In production the Vite dev server is replaced by Vercel CDN serving the built static assets, and the API runs as a containerised Node.js process behind a load balancer.

### 2.2 Request Lifecycle — Admin Portal to API

```
Admin browser
  │  HTTPS
  ▼
Vite dev server (localhost:5174)
  │  fetch() with credentials:include → localhost:3000/admin/api/*
  ▼
Fastify API — Admin namespace plugin
  │  httpOnly + SameSite=Strict cookie auth
  │
  ├── TOTP session validation
  ├── Admin service layer (apps/api/src/admin/<feature>.service.ts)
  │
  ├── PostgreSQL (same database, restricted admin queries)
  └── Redis (leaderboard admin view, rate-limit config)
```

The admin portal always communicates with the same Fastify process as the player API; the admin routes are scoped under `/admin/api/` and protected by a separate authentication mechanism (TOTP session cookies rather than player bearer tokens).

### 2.3 Shared Types

The `@pixel-pet-arena/shared` package lives in `packages/shared/`. It exports:

- **Database types** — auto-generated from the Supabase schema in `src/database.types.ts`
- **Domain types** — hand-authored TypeScript interfaces in `src/types/`
- **Zod schemas** — validation schemas shared between the API (server-side validation) and the frontends (client-side form validation)
- **Constants** — numeric and string constants that must be consistent across the stack

Both `apps/api`, `apps/player`, and `apps/admin` import from `@pixel-pet-arena/shared`. Because pnpm workspaces link the package via symlinks, changes to `packages/shared/src/` are available immediately in all consumers during development — no separate build step is needed in watch mode.

### 2.4 Environment File Priority

Each app reads its own `.env.local` file. Vite apps also support `.env.development` and `.env.production`. The precedence order from highest to lowest is:

| Priority | File | Scope |
|---|---|---|
| 1 (highest) | `apps/<name>/.env.local` | Local machine only, gitignored |
| 2 | `apps/<name>/.env.development` | Shared dev defaults, committed |
| 3 | `apps/<name>/.env` | Fallback defaults, committed |
| 4 (lowest) | Process environment variables | CI / container runtime |

For the API, Node.js does not load `.env` files automatically — the API uses `dotenv` or equivalent. Check `apps/api/src/config.ts` to confirm the exact load order. Never commit `.env.local` files — they are in `.gitignore` and contain secrets.

---

## 3. Testing Guide

The project uses Vitest for unit and integration tests and Playwright for end-to-end tests. All three packages must maintain at least 80% line coverage for the CI gate to pass.

### 3.1 Running All Tests

```bash
# Run all Vitest tests across all packages
pnpm --recursive test run

# Run all Vitest tests in watch mode during development
pnpm --recursive test
```

### 3.2 Running Tests for a Specific Package

```bash
# API unit + integration tests
pnpm --filter api test

# Player frontend tests
pnpm --filter player-app test

# Admin portal tests
pnpm --filter admin-app test
```

### 3.3 Running a Single Test File

Pass the file path as a positional argument after `--`:

```bash
# Run a single file in the api package
pnpm --filter api test -- src/arena/arena.service.test.ts

# Run a single file in the player-app package
pnpm --filter player-app test -- src/components/pet-status/PetStatusCard.test.tsx
```

### 3.4 Running E2E Tests

Playwright E2E tests require all three services to be running. Start them first:

```bash
# Terminal 1
pnpm --filter api dev

# Terminal 2
pnpm --filter player-app dev

# Terminal 3
pnpm --filter admin-app dev
```

Then in a fourth terminal:

```bash
pnpm test:e2e
```

To run only a specific E2E spec file:

```bash
pnpm exec playwright test tests/e2e/arena.spec.ts
```

### 3.5 Writing a New Vitest Test

**File naming convention**: test files must end in `.test.ts` (or `.test.tsx` for React components). Place the test file adjacent to the source file it tests.

```
apps/api/src/arena/
├── arena.routes.ts
├── arena.routes.test.ts   ← integration test (Fastify app + Supabase)
├── arena.service.ts
└── arena.service.test.ts  ← unit test (mock db/redis)
```

**Fixtures**: shared test fixtures belong in `apps/<name>/src/__fixtures__/` or co-located `__fixtures__/` directories next to the test file.

**Using the Supabase test client**: Integration tests that require a real database connection use the local Supabase stack. The test setup file (typically `apps/api/src/test-setup.ts`) exports a pre-configured `pg` pool pointed at `localhost:54322`. Import it directly:

```typescript
import { testDb } from '../test-setup';

describe('ArenaService', () => {
  it('creates a battle record', async () => {
    // Arrange
    const service = new ArenaService(testDb, mockRedis);

    // Act
    const battle = await service.createBattle(petId1, petId2);

    // Assert
    expect(battle.id).toBeDefined();
    expect(battle.status).toBe('pending');
  });
});
```

### 3.6 Coverage Report

```bash
# Generate coverage report for the API
pnpm --filter api test:coverage

# Coverage HTML report opens at apps/api/coverage/index.html
```

CI enforces 80% minimum line coverage across all three packages. If you add new code, add matching tests.

### 3.7 Updating Playwright Snapshots

When a UI change intentionally alters visual output, update the Playwright visual regression snapshots:

```bash
pnpm exec playwright test --update-snapshots
```

Review the diff images in the `playwright-report/` directory before committing the updated snapshots. Never bulk-update snapshots without reviewing each changed image.

---

## 4. CI/CD Diagnosis

When a PR gate fails or a deploy goes wrong, use this section to reproduce the failure locally and understand the fix.

### 4.1 PR Gate Failed — Lint or Type Errors

**What CI runs:**

```yaml
pnpm --recursive lint
pnpm --recursive exec tsc --noEmit
```

**How to reproduce locally:**

```bash
# Run ESLint across all packages
pnpm --recursive lint

# Run TypeScript type-check across all packages
pnpm --recursive exec tsc --noEmit
```

**Reading tsc output**: Each error line shows `<file>(<line>,<col>): error TS<code>: <message>`. The most common CI-only failures are:
- Missing return types on exported functions — add explicit return type annotations
- Implicit `any` in new files — the strict tsconfig in CI may differ from VS Code defaults; run `pnpm --filter api exec tsc --noEmit --strict` to check
- Type errors in generated files (`database.types.ts`) — regenerate types with `supabase gen types typescript --local`

Fix all errors, then re-run both commands locally to confirm zero output before pushing.

### 4.2 PR Gate Failed — Unit Tests

**What CI runs:**

```bash
pnpm --recursive test run --coverage
```

**How to reproduce locally:**

```bash
# Exact equivalent of the CI command
pnpm --recursive test run --coverage
```

If a specific package is failing, isolate it:

```bash
pnpm --filter api test run --coverage
```

Check that `supabase start` is running locally for integration tests. If you see database connection errors in test output, the Supabase local stack is likely not running or the `DATABASE_URL` environment variable is not set. Run `supabase status` to check.

If a test is flaky (fails intermittently), check for shared mutable state between tests. Vitest runs tests in parallel by default — use `vi.restoreAllMocks()` in `afterEach` and avoid global state.

### 4.3 PR Gate Failed — Build

**What CI runs:**

```bash
pnpm --filter @pixel-pet-arena/shared build
pnpm --filter api build
pnpm --filter player-app build
pnpm --filter admin-app build
```

Followed by Docker builds for each app.

**How to reproduce the TypeScript build locally:**

```bash
pnpm --filter @pixel-pet-arena/shared build && \
pnpm --filter api build && \
pnpm --filter player-app build && \
pnpm --filter admin-app build
```

**How to reproduce the Docker build locally:**

```bash
# API
docker build -t pixel-pet-arena/api:local apps/api

# Player frontend (VITE_API_BASE_URL is a build-time arg)
docker build \
  --build-arg VITE_API_BASE_URL=http://localhost:3000 \
  -t pixel-pet-arena/player-app:local \
  apps/player

# Admin portal
docker build \
  --build-arg VITE_API_BASE_URL=http://localhost:3000 \
  -t pixel-pet-arena/admin-app:local \
  apps/admin
```

Common Docker build failures:
- Missing `COPY` of `packages/shared` in the Dockerfile — the shared package must be available inside the build context
- `pnpm install --frozen-lockfile` fails because `pnpm-lock.yaml` is out of date — run `pnpm install` locally and commit the updated lockfile

### 4.4 PR Gate Failed — Secrets Detection

CI runs `detect-secrets` against the full git history using `.secrets.baseline` as the baseline.

**How to update the baseline after a false positive:**

```bash
# Install detect-secrets
pip install detect-secrets

# Audit the current scan results interactively
detect-secrets audit .secrets.baseline

# After marking false positives as non-secrets in the audit, regenerate the baseline
detect-secrets scan > .secrets.baseline
```

Commit the updated `.secrets.baseline`. Never mark a real secret as a false positive — if a genuine secret was committed, rotate it immediately in the relevant service dashboard and remove it from the git history using `git filter-repo`.

### 4.5 Staging Deploy Failed — Migration

**Where to find migration logs:**

1. In GitHub Actions, open the `deploy-staging.yml` run and expand the **Run db:migrate** step.
2. In Supabase, connect to the staging project and run `SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;` to see which migrations have been applied.

**Check migration status locally (against staging, read-only):**

```bash
supabase db remote diff --linked
```

**Rollback procedure:**

If a migration caused data corruption or a production outage, the safest rollback path is to revert the migration manually using a down migration script (if one exists in `supabase/migrations/`) and then roll back the application image via ArgoCD (see §4.6). Supabase does not automatically reverse migrations — you must write and apply a compensating migration. Co-ordinate with the team lead before touching production data directly.

### 4.6 Staging Deploy Failed — ArgoCD Sync

**Check ArgoCD app status:**

```bash
argocd app get pixel-pet-arena-staging
```

Look for `Sync Status` and `Health Status`. Common failure reasons:
- `OutOfSync` — the k8s manifest in the repo diverged from the live cluster; this is expected mid-deploy
- `Degraded` — a pod is crash-looping; check pod logs with `kubectl logs -n pixel-pet-arena-staging <pod-name> --previous`

**Diff the manifests:**

```bash
argocd app diff pixel-pet-arena-staging
```

**Force a sync** (use only when ArgoCD is stuck, not as a substitute for diagnosing the root cause):

```bash
argocd app sync pixel-pet-arena-staging --force
```

**Rollback via ArgoCD** (reverts to the last successful sync):

```bash
argocd app history pixel-pet-arena-staging
# Find the ID of the last known-good sync
argocd app rollback pixel-pet-arena-staging <history-id>
```

### 4.7 Production Deploy Blocked — Manual Approval

Production deploys require a manual approval via the GitHub Environment protection rule on the `production` environment.

**Who approves**: the designated release approver (see your team's Notion runbook for the current on-call approver list). Approvals can be granted from the GitHub Actions UI on the blocked workflow run.

**What to check before approving:**
- Staging smoke tests passed within the last 24 hours
- No active P0/P1 incidents on staging or production
- Feature flags are set to their intended values for this release
- The migration (if any) has been reviewed and a rollback plan exists
- The PR was reviewed and merged by at least one reviewer other than the author

**How to reject**: click "Reject" on the pending approval in the GitHub Actions UI. Leave a comment explaining the reason. The deploy workflow will be cancelled and the team notified.

### 4.8 Post-Deploy Health Check Failed

The health check polls `GET /health` and expects HTTP 200 with the following JSON body:

```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "redis": "ok"
  },
  "timestamp": "2026-05-04T12:00:00Z"
}
```

**Diagnosing a non-200 response:**

| Symptom | Likely cause | Action |
|---|---|---|
| `"database": "error"` | PostgreSQL connection failed | Check `DATABASE_URL` env var; check Supabase service health in Supabase dashboard |
| `"redis": "error"` | Redis connection failed | Check `REDIS_URL` env var; check Upstash Redis dashboard; API operates in degraded mode (leaderboard falls back to DB) |
| Connection refused | API process did not start | Check pod logs: `kubectl logs -n pixel-pet-arena <pod>` |
| HTTP 500 | Unhandled startup error | Check pod logs for a stack trace; common cause is a missing required env var |

**Check locally:**

```bash
curl -v http://localhost:3000/health
```

If the database check fails locally, run `supabase status` to confirm the local stack is running, and check that `DATABASE_URL` in `apps/api/.env.local` matches the URL printed by `supabase start`.

---

## 5. Quick Reference

### 5.1 Ports

| Service | Port | URL |
|---|---|---|
| API (Fastify) | 3000 | `http://localhost:3000` |
| Player frontend (Vite) | 5173 | `http://localhost:5173` |
| Admin portal (Vite) | 5174 | `http://localhost:5174` |
| Supabase Studio | 54323 | `http://localhost:54323` |
| Supabase API | 54321 | `http://localhost:54321` |
| Supabase PostgreSQL | 54322 | `postgresql://postgres:postgres@localhost:54322/postgres` |
| Inbucket (email testing) | 54324 | `http://localhost:54324` |
| Redis | 6379 | `redis://localhost:6379` |

### 5.2 Key Commands

```bash
# Start all services (three separate terminals)
pnpm --filter api dev              # Terminal 1 — API on :3000
pnpm --filter player-app dev       # Terminal 2 — Player frontend on :5173
pnpm --filter admin-app dev        # Terminal 3 — Admin portal on :5174

# Run all tests
pnpm --recursive test run

# Run tests for one package
pnpm --filter api test
pnpm --filter player-app test
pnpm --filter admin-app test

# Reset the local database
supabase db reset

# Re-seed the database
pnpm db:seed

# Apply pending migrations
supabase db push

# Generate a new migration file
supabase migration new <migration_name>

# Regenerate TypeScript types from schema
supabase gen types typescript --local > packages/shared/src/database.types.ts

# API health check
curl http://localhost:3000/health

# Install all workspace dependencies
pnpm install

# Build all packages
pnpm --filter @pixel-pet-arena/shared build && \
pnpm --filter api build && \
pnpm --filter player-app build && \
pnpm --filter admin-app build

# Run E2E tests
pnpm test:e2e

# Coverage report (API)
pnpm --filter api test:coverage
```

### 5.3 Environment Files

| File | Who reads it | What it configures |
|---|---|---|
| `apps/api/.env.local` | API (dotenv at startup) | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `EMAIL_ENCRYPTION_KEY`, `SENDGRID_API_KEY`, `ADMIN_TOTP_ISSUER`, feature flags |
| `apps/player/.env.local` | Vite (build + dev server) | `VITE_API_BASE_URL` |
| `apps/admin/.env.local` | Vite (build + dev server) | `VITE_API_BASE_URL` |

All `.env.local` files are gitignored. Copy from the corresponding `.env.example` file on first setup.

### 5.4 Feature Flags

| Flag | Default | Where to set | Effect |
|---|---|---|---|
| `FF_MARKETPLACE` | `false` | `apps/api/.env.local` | Enables pet trading marketplace routes and UI. Do not enable in production until DAU ≥ 1,000 for 2 weeks. |
| `FF_ARENA_SUMO` | `true` | `apps/api/.env.local` | Enables sumo battle mode in the arena. Set `false` to show race mode only. |

To toggle a flag locally: edit `apps/api/.env.local`, then restart the API with `pnpm --filter api dev`.

### 5.5 Useful One-Liners

```bash
# Tail API logs (when running pnpm --filter api dev, logs are in the terminal)
# For a running Docker container:
docker logs -f pixel-pet-redis

# Inspect Redis — list all keys
docker exec -it pixel-pet-redis redis-cli KEYS '*'

# Inspect a specific Redis key
docker exec -it pixel-pet-redis redis-cli GET 'leaderboard:global'

# Check Supabase local stack status
supabase status

# Kill a stuck process on a specific port (macOS/Linux)
lsof -ti:3000 | xargs kill -9   # Kill whatever is on port 3000
lsof -ti:5173 | xargs kill -9   # Kill whatever is on port 5173
lsof -ti:5174 | xargs kill -9   # Kill whatever is on port 5174

# Check which process is using a port
lsof -i :3000

# Generate a JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"

# Generate an EMAIL_ENCRYPTION_KEY (32 random bytes as hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Flush all Redis keys (local dev only — never run in production)
docker exec -it pixel-pet-redis redis-cli FLUSHALL
```

### 5.6 Git Workflow

**Branch naming:**

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<short-description>` | `feature/arena-sumo-mode` |
| Bug fix | `fix/<short-description>` | `fix/leaderboard-cache-miss` |
| Chore / maintenance | `chore/<short-description>` | `chore/upgrade-fastify-4.2` |
| Documentation | `docs/<short-description>` | `docs/update-developer-guide` |

**Commit message format** (Conventional Commits):

```
<type>: <description>

<optional body — explain the why, not the what>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Examples:
```
feat: add sumo battle outcome calculation
fix: handle Redis timeout in leaderboard fallback path
chore: bump pnpm to 9.5
```

**Merge strategy**: squash-merge feature branches into `develop`. Use merge commits when promoting `develop` → `main`. Never force-push to `develop` or `main`.

**PR template**: opening a PR automatically populates the template from `.github/pull_request_template.md`. Fill in all sections — summary, test plan, and any migration notes — before requesting review.

---

## 6. Troubleshooting Runbook

### 6.1 Port Already in Use (EADDRINUSE)

A service fails to start with `Error: listen EADDRINUSE :::3000` (or 5173, 5174).

```bash
# Find what is using the port
lsof -i :3000

# Kill the process by PID
kill -9 <PID>

# Or kill all processes on the port in one step
lsof -ti:3000 | xargs kill -9
```

If the port keeps being claimed after restart, check whether a previous dev server is still running in a background terminal pane.

### 6.2 Supabase Won't Start

Symptoms: `supabase start` hangs or prints Docker errors.

```bash
# Ensure Docker Desktop is running
docker info

# If Docker is running but Supabase is stuck, stop and restart the stack
supabase stop --no-backup
supabase start

# If containers are in a broken state, remove them and retry
docker ps -a | grep supabase
docker rm -f $(docker ps -aq --filter "name=supabase")
supabase start
```

If you upgraded the Supabase CLI and the local stack version changed, you may need to reset:

```bash
supabase db reset
pnpm db:seed
```

### 6.3 Redis Connection Refused

The API starts but logs `Redis connection refused` or the health check shows `"redis": "error"`.

```bash
# Check whether the container is running
docker ps | grep pixel-pet-redis

# Start it if it is stopped
docker start pixel-pet-redis

# If the container does not exist, create it
docker run -d --name pixel-pet-redis -p 6379:6379 redis:7-alpine

# Verify Redis responds
docker exec -it pixel-pet-redis redis-cli ping
# Expected: PONG
```

Confirm that `REDIS_URL=redis://localhost:6379` is set in `apps/api/.env.local`.

### 6.4 pnpm Workspace Symlink Issues

After pulling changes or switching branches, imports from `@pixel-pet-arena/shared` fail with `Cannot find module` errors, or you see stale type definitions.

```bash
# Force a clean reinstall of all workspace dependencies
pnpm install --force

# If the problem persists, clear the pnpm cache and reinstall
pnpm store prune
pnpm install --force
```

### 6.5 Hot Reload Not Working

The Vite dev server is running but changes to `.tsx`, `.ts`, or `.css` files do not appear in the browser without a full page refresh.

1. Check the Vite dev server terminal for HMR errors — these are usually printed inline.
2. Confirm your editor is writing files to disk (some editors write to a temp file first).
3. Verify `vite.config.ts` in the affected app has `server.watch` set to use the polling strategy if you are running inside a Docker container or a network-mounted filesystem:

   ```typescript
   server: {
     watch: {
       usePolling: true,
     },
   }
   ```

4. If HMR breaks only for React components, ensure each component file exports the component as a named export (not only as a default export with an anonymous function) — React Fast Refresh requires stable component identities.

### 6.6 TypeScript Errors After Pulling Latest

You pull changes and suddenly see TypeScript errors that were not present before.

**Most likely causes and fixes:**

1. **New dependencies added** — run `pnpm install` to link new packages.
2. **Schema changed** — run `supabase gen types typescript --local > packages/shared/src/database.types.ts` to regenerate types, then apply pending migrations with `supabase db push`.
3. **Shared package API changed** — check `packages/shared/CHANGELOG.md` (if present) for breaking type changes. Update your call sites accordingly.
4. **tsconfig.json changed** — review the diff of any `tsconfig*.json` files in the PR you pulled; a stricter setting may now flag previously passing code.

After any of the above, run `pnpm --recursive exec tsc --noEmit` to confirm zero errors before continuing.

### 6.7 TOTP Login Failing for Admin

The admin portal at `http://localhost:5174/admin/login` rejects your TOTP code.

**Cause 1 — Lost the TOTP secret.** Re-run the seed with the reset flag to generate a new admin account and TOTP secret:

```bash
pnpm db:seed --reset-admin
```

Save the new TOTP secret printed to stdout and scan the new QR code (or enter the secret manually) into your authenticator app.

**Cause 2 — Clock skew.** TOTP codes are time-based and valid for a 30-second window. If your system clock is more than 30 seconds out of sync, codes will be rejected. On macOS: `sudo sntp -sS time.apple.com`. On Linux: `sudo timedatectl set-ntp true`.

**Cause 3 — Database was reset without re-seeding.** After `supabase db reset`, always run `pnpm db:seed` to recreate the admin account. Without it there is no admin account in the database and all TOTP attempts will return `401`.

**Cause 4 — Using the wrong issuer in your authenticator app.** The issuer name for local development is set by `ADMIN_TOTP_ISSUER` in `apps/api/.env.local` (default: `pixel-pet-arena-local`). If you enrolled the token under a different issuer, delete the old entry from your authenticator app and re-scan.
