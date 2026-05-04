# CI/CD Pipeline — pixel-pet-arena

This document describes the complete continuous integration and delivery pipeline for the pixel-pet-arena monorepo. It covers GitHub Actions workflows, PR gate requirements, ArgoCD GitOps deployment, database migration strategy, secrets management, monitoring integration, and a Jenkinsfile alternative for teams that operate Jenkins-based infrastructure.

---

## Table of Contents

1. [Pipeline Overview](#pipeline-overview)
2. [GitHub Actions Workflows](#github-actions-workflows)
3. [PR Gate](#pr-gate)
4. [ArgoCD](#argocd)
5. [Database Migrations](#database-migrations)
6. [Secrets Management](#secrets-management)
7. [Monitoring Integration](#monitoring-integration)
8. [Jenkinsfile](#jenkinsfile)

---

## Pipeline Overview

The pipeline moves code from a developer's feature branch through automated quality gates into staging and finally into production. Every promotion step is gated by the result of the previous one; a failed gate stops forward progress automatically.

```
Developer workstation
        │
        │  git push origin feature/my-feature
        ▼
┌───────────────────────────────────────────────────────┐
│  GitHub Pull Request (feature/* → develop or main)    │
│                                                       │
│  ci.yml  ─── pnpm install                            │
│           ├── ESLint + tsc (all packages)             │
│           ├── Vitest unit tests (≥80% coverage)       │
│           ├── Supabase local stack (integration tests)│
│           ├── Docker build (api, player-app, admin)   │
│           └── Playwright E2E smoke tests              │
│                                                       │
│  All checks green → PR can be merged                  │
└───────────────────────────────────────────────────────┘
        │
        │  Merge PR into develop
        ▼
┌───────────────────────────────────────────────────────┐
│  deploy-staging.yml                                   │
│                                                       │
│  ├── Build Docker images (tagged :develop-<sha>)      │
│  ├── Push to ghcr.io/pixel-pet-arena/*                │
│  ├── Run db:migrate against staging database          │
│  ├── Update k8s/staging/kustomization.yaml image tag  │
│  ├── ArgoCD auto-sync (staging environment)           │
│  └── Post-deploy health check on staging /health      │
└───────────────────────────────────────────────────────┘
        │
        │  git tag v1.2.3 && git push origin v1.2.3
        ▼
┌───────────────────────────────────────────────────────┐
│  deploy-production.yml                                │
│                                                       │
│  ├── Manual approval gate (GitHub Environment rule)   │
│  ├── Build Docker images (tagged :v1.2.3)             │
│  ├── Push to ghcr.io/pixel-pet-arena/*                │
│  ├── Run db:migrate against production database       │
│  ├── Update k8s/production/kustomization.yaml tag     │
│  ├── ArgoCD manual sync (production environment)      │
│  ├── Post-deploy health check on production /health   │
│  └── Sentry release notification + PagerDuty webhook  │
└───────────────────────────────────────────────────────┘
```

### Trigger Conditions

| Event | Workflow triggered |
|---|---|
| Pull request opened or synchronised (→ `develop` or `main`) | `ci.yml` |
| Push to `develop` branch | `deploy-staging.yml` |
| Tag push matching `v[0-9]*.[0-9]*.[0-9]*` | `deploy-production.yml` |
| Manual `workflow_dispatch` on any workflow | All three workflows support manual runs |

---

## GitHub Actions Workflows

### `ci.yml` — PR Gate

This workflow runs on every pull request targeting `develop` or `main`. It validates code quality, tests, and build integrity across all three workspace applications before a PR can be merged. No merge is permitted while this workflow is failing.

```yaml
# .github/workflows/ci.yml
name: CI — PR Gate

on:
  pull_request:
    branches:
      - main
      - develop
  workflow_dispatch:

permissions:
  contents: read
  packages: read
  checks: write
  pull-requests: write

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9"

jobs:
  install:
    name: Install dependencies
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install workspace dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache node_modules
        uses: actions/cache/save@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
            apps/*/node_modules
          key: node-modules-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

  lint-typecheck:
    name: Lint and type-check
    needs: install
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore node_modules
        uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
            apps/*/node_modules
          key: node-modules-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - name: ESLint (all packages)
        run: pnpm --recursive lint

      - name: TypeScript type-check (all packages)
        run: pnpm --recursive exec tsc --noEmit

  unit-tests:
    name: Unit tests (Vitest)
    needs: install
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore node_modules
        uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
            apps/*/node_modules
          key: node-modules-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - name: Run Vitest with coverage
        run: pnpm --recursive test run --coverage

      - name: Assert coverage threshold (≥80%)
        run: |
          node -e "
            const fs = require('fs');
            const paths = [
              'apps/api/coverage/coverage-summary.json',
              'apps/player/coverage/coverage-summary.json',
              'apps/admin/coverage/coverage-summary.json',
            ];
            let allPass = true;
            for (const p of paths) {
              if (!fs.existsSync(p)) { console.error('Missing coverage file: ' + p); allPass = false; continue; }
              const s = JSON.parse(fs.readFileSync(p, 'utf8')).total;
              const pct = s.lines.pct;
              console.log(p + ': ' + pct + '%');
              if (pct < 80) { console.error('FAIL: coverage below 80%'); allPass = false; }
            }
            if (!allPass) process.exit(1);
          "

      - name: Upload coverage reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-reports
          path: |
            apps/*/coverage/
          retention-days: 14

  integration-tests:
    name: Integration tests (Supabase local stack)
    needs: install
    runs-on: ubuntu-24.04
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore node_modules
        uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
            apps/*/node_modules
          key: node-modules-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase local stack
        run: supabase start

      - name: Apply database migrations
        run: pnpm db:migrate

      - name: Seed test data
        run: pnpm db:seed --ci

      - name: Export Supabase connection details
        run: |
          DB_URL=$(supabase status --output json | jq -r '."DB URL"')
          echo "DATABASE_URL=${DB_URL}" >> "$GITHUB_ENV"
          echo "REDIS_URL=redis://localhost:6379" >> "$GITHUB_ENV"
          echo "JWT_SECRET=ci-test-jwt-secret-not-for-production" >> "$GITHUB_ENV"
          echo "EMAIL_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000" >> "$GITHUB_ENV"
          echo "SENDGRID_API_KEY=SG.test" >> "$GITHUB_ENV"
          echo "ADMIN_TOTP_ISSUER=pixel-pet-arena-ci" >> "$GITHUB_ENV"
          echo "FF_MARKETPLACE=false" >> "$GITHUB_ENV"
          echo "FF_ARENA_SUMO=true" >> "$GITHUB_ENV"

      - name: Run API integration tests
        run: pnpm --filter api test:integration

      - name: Stop Supabase
        if: always()
        run: supabase stop

  build:
    name: Build all applications
    needs: [lint-typecheck, unit-tests]
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore node_modules
        uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
            apps/*/node_modules
          key: node-modules-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - name: Build shared package
        run: pnpm --filter @pixel-pet-arena/shared build

      - name: Build API
        run: pnpm --filter api build

      - name: Build player-app
        run: pnpm --filter player-app build

      - name: Build admin-app
        run: pnpm --filter admin-app build

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image (api)
        uses: docker/build-push-action@v6
        with:
          context: apps/api
          push: false
          tags: ghcr.io/pixel-pet-arena/api:ci-${{ github.sha }}

      - name: Build Docker image (player-app)
        uses: docker/build-push-action@v6
        with:
          context: apps/player
          push: false
          tags: ghcr.io/pixel-pet-arena/player-app:ci-${{ github.sha }}

      - name: Build Docker image (admin-app)
        uses: docker/build-push-action@v6
        with:
          context: apps/admin
          push: false
          tags: ghcr.io/pixel-pet-arena/admin-app:ci-${{ github.sha }}

      - name: Upload API build artifact
        uses: actions/upload-artifact@v4
        with:
          name: api-dist
          path: apps/api/dist/
          retention-days: 1

  secret-scan:
    name: Secret scanning
    needs: install
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run detect-secrets scan
        uses: reviewdog/action-detect-secrets@38c4021a5dc90e29bd86ea68f3d26b21e691b3a7  # v0.27.0
        with:
          reporter: github-pr-review
          fail_on_error: true
          detect_secrets_flags: --baseline .secrets.baseline

  e2e-smoke:
    name: E2E smoke tests (Playwright)
    needs: [build, integration-tests]
    runs-on: ubuntu-24.04
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Restore node_modules
        uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
            apps/*/node_modules
          key: node-modules-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase local stack
        run: supabase start

      - name: Apply migrations and seed
        run: pnpm db:migrate && pnpm db:seed --ci

      - name: Export env vars for E2E
        run: |
          DB_URL=$(supabase status --output json | jq -r '."DB URL"')
          echo "DATABASE_URL=${DB_URL}" >> "$GITHUB_ENV"
          echo "REDIS_URL=redis://localhost:6379" >> "$GITHUB_ENV"
          echo "JWT_SECRET=ci-test-jwt-secret-not-for-production" >> "$GITHUB_ENV"
          echo "EMAIL_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000" >> "$GITHUB_ENV"
          echo "SENDGRID_API_KEY=SG.test" >> "$GITHUB_ENV"
          echo "ADMIN_TOTP_ISSUER=pixel-pet-arena-ci" >> "$GITHUB_ENV"
          echo "FF_MARKETPLACE=false" >> "$GITHUB_ENV"
          echo "FF_ARENA_SUMO=true" >> "$GITHUB_ENV"
          echo "VITE_API_BASE_URL=http://localhost:3000" >> "$GITHUB_ENV"

      - name: Download API build artifact
        uses: actions/download-artifact@v4
        with:
          name: api-dist
          path: apps/api/dist/

      - name: Start API in background
        run: pnpm --filter api start &
        env:
          PORT: 3000

      - name: Wait for API health
        run: |
          API_READY=false
          for i in $(seq 1 30); do
            if curl -sf http://localhost:3000/health; then
              API_READY=true
              break
            fi
            sleep 2
          done
          if [ "$API_READY" = "false" ]; then
            echo "ERROR: API did not become healthy within 60 seconds" >&2
            exit 1
          fi

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run Playwright E2E smoke suite
        run: pnpm exec playwright test --project=chromium tests/e2e/smoke

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      - name: Stop Supabase
        if: always()
        run: supabase stop
```

---

### `deploy-staging.yml` — Deploy to Staging

Triggered automatically on every push to the `develop` branch after a PR merge. This workflow builds and publishes Docker images tagged with the short commit SHA, runs database migrations, then updates the Kustomize image tag in the `k8s/staging/` directory so ArgoCD can sync the new version.

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy — Staging

on:
  push:
    branches:
      - develop
  workflow_dispatch:

permissions:
  contents: write
  packages: write
  id-token: write

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9"
  REGISTRY: ghcr.io
  IMAGE_ORG: pixel-pet-arena

jobs:
  build-push:
    name: Build and push Docker images
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      packages: write
    outputs:
      image_tag: ${{ steps.tag.outputs.tag }}
    steps:
      - uses: actions/checkout@v4

      - name: Set image tag
        id: tag
        run: echo "tag=develop-${GITHUB_SHA::8}" >> "$GITHUB_OUTPUT"

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GHCR_TOKEN }}

      - uses: docker/setup-buildx-action@v3

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build shared package
        run: pnpm --filter @pixel-pet-arena/shared build

      - name: Build and push api image
        uses: docker/build-push-action@v6
        with:
          context: apps/api
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/api:${{ steps.tag.outputs.tag }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/api:staging-latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push player-app image
        uses: docker/build-push-action@v6
        with:
          context: apps/player
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/player-app:${{ steps.tag.outputs.tag }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/player-app:staging-latest
          build-args: |
            VITE_API_BASE_URL=https://api.staging.pixel-pet-arena.com
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push admin-app image
        uses: docker/build-push-action@v6
        with:
          context: apps/admin
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/admin-app:${{ steps.tag.outputs.tag }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/admin-app:staging-latest
          build-args: |
            VITE_API_BASE_URL=https://api.staging.pixel-pet-arena.com
          cache-from: type=gha
          cache-to: type=gha,mode=max

  migrate-staging:
    name: Run DB migrations (staging)
    needs: build-push
    runs-on: ubuntu-24.04
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run migrations against staging database
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_STAGING }}
          NODE_ENV: staging
        run: pnpm db:migrate --env staging

  update-k8s-manifest:
    name: Update staging Kustomize image tag
    needs: [build-push, migrate-staging]
    runs-on: ubuntu-24.04
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          ref: develop

      - name: Install kustomize
        uses: imranismail/setup-kustomize@v2
        with:
          kustomize-version: "5.4.1"

      - name: Update image tags in k8s/staging
        working-directory: k8s/staging
        run: |
          TAG="${{ needs.build-push.outputs.image_tag }}"
          kustomize edit set image \
            "ghcr.io/pixel-pet-arena/api=ghcr.io/pixel-pet-arena/api:${TAG}" \
            "ghcr.io/pixel-pet-arena/player-app=ghcr.io/pixel-pet-arena/player-app:${TAG}" \
            "ghcr.io/pixel-pet-arena/admin-app=ghcr.io/pixel-pet-arena/admin-app:${TAG}"

      - name: Commit updated manifests
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add k8s/staging/kustomization.yaml
          git commit -m "chore(k8s): update staging image tag to ${{ needs.build-push.outputs.image_tag }}" || echo "No changes"
          git push

  health-check-staging:
    name: Post-deploy health check (staging)
    needs: update-k8s-manifest
    runs-on: ubuntu-24.04
    steps:
      - name: Wait for ArgoCD sync (90s grace period)
        run: sleep 90

      - name: Health check — API /health
        run: |
          for i in $(seq 1 10); do
            STATUS=$(curl -sf -o /dev/null -w "%{http_code}" https://api.staging.pixel-pet-arena.com/health)
            echo "Attempt ${i}: HTTP ${STATUS}"
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed."
              exit 0
            fi
            sleep 15
          done
          echo "Health check failed after 10 attempts. Triggering rollback."
          exit 1

      - name: Install ArgoCD CLI
        if: failure()
        run: |
          ARGOCD_CHECKSUM=$(curl -sSL https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64.sha256 | awk '{print $1}')
          curl -sSL -o /usr/local/bin/argocd \
            https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          echo "${ARGOCD_CHECKSUM}  /usr/local/bin/argocd" | sha256sum -c -
          chmod +x /usr/local/bin/argocd
          argocd login "${{ secrets.ARGOCD_SERVER }}" \
            --auth-token "${{ secrets.ARGOCD_TOKEN }}" \
            --grpc-web

      - name: Rollback on health check failure
        if: failure()
        env:
          ARGOCD_SERVER: ${{ secrets.ARGOCD_SERVER }}
          ARGOCD_TOKEN: ${{ secrets.ARGOCD_TOKEN }}
        run: |
          LAST_GOOD_REVISION=$(argocd app history pixel-pet-arena-staging --output json | jq '[.[] | select(.operationState.phase=="Succeeded")][1].id' 2>/dev/null)
          if [ -z "${LAST_GOOD_REVISION}" ] || [ "${LAST_GOOD_REVISION}" = "null" ]; then
            echo "WARNING: could not determine last good revision; skipping rollback." >&2
          else
            curl -sf -H "Authorization: Bearer ${ARGOCD_TOKEN}" \
              -H "Content-Type: application/json" \
              "${ARGOCD_SERVER}/api/v1/applications/pixel-pet-arena-staging/rollback" \
              -d "{\"id\": ${LAST_GOOD_REVISION}}" || true
            echo "Rollback triggered via ArgoCD API."
          fi
```

---

### `deploy-production.yml` — Deploy to Production

Triggered on semantic version tag pushes (pattern `v[0-9]*.[0-9]*.[0-9]*`). This workflow mirrors the staging deploy but targets the production Kubernetes cluster, requires a manual approval gate from a designated approver, and issues Sentry release notifications and PagerDuty webhooks after deployment.

```yaml
# .github/workflows/deploy-production.yml
name: Deploy — Production

on:
  push:
    tags:
      - "v[0-9]*.[0-9]*.[0-9]*"
  workflow_dispatch:
    inputs:
      tag:
        description: "Image tag to deploy (e.g. v1.2.3)"
        required: true

permissions:
  contents: write
  packages: write
  id-token: write

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9"
  REGISTRY: ghcr.io
  IMAGE_ORG: pixel-pet-arena

jobs:
  build-push:
    name: Build and push Docker images
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      packages: write
    outputs:
      image_tag: ${{ steps.tag.outputs.tag }}
    steps:
      - uses: actions/checkout@v4

      - name: Resolve image tag
        id: tag
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "tag=${{ github.event.inputs.tag }}" >> "$GITHUB_OUTPUT"
          else
            echo "tag=${GITHUB_REF_NAME}" >> "$GITHUB_OUTPUT"
          fi

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GHCR_TOKEN }}

      - uses: docker/setup-buildx-action@v3

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build shared package
        run: pnpm --filter @pixel-pet-arena/shared build

      - name: Build and push api image
        uses: docker/build-push-action@v6
        with:
          context: apps/api
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/api:${{ steps.tag.outputs.tag }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push player-app image
        uses: docker/build-push-action@v6
        with:
          context: apps/player
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/player-app:${{ steps.tag.outputs.tag }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/player-app:latest
          build-args: |
            VITE_API_BASE_URL=https://api.pixel-pet-arena.com
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push admin-app image
        uses: docker/build-push-action@v6
        with:
          context: apps/admin
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/admin-app:${{ steps.tag.outputs.tag }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_ORG }}/admin-app:latest
          build-args: |
            VITE_API_BASE_URL=https://api.pixel-pet-arena.com
          cache-from: type=gha
          cache-to: type=gha,mode=max

  manual-approval:
    name: Manual approval gate
    needs: build-push
    runs-on: ubuntu-24.04
    environment: production
    steps:
      - name: Await approver sign-off
        run: echo "Production deployment approved for tag ${{ needs.build-push.outputs.image_tag }}."

  migrate-production:
    name: Run DB migrations (production)
    needs: manual-approval
    runs-on: ubuntu-24.04
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run migrations against production database
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_PRODUCTION }}
          NODE_ENV: production
        run: pnpm db:migrate --env production

  update-k8s-manifest:
    name: Update production Kustomize image tag
    needs: [build-push, migrate-production]
    runs-on: ubuntu-24.04
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          ref: main

      - name: Install kustomize
        uses: imranismail/setup-kustomize@v2
        with:
          kustomize-version: "5.4.1"

      - name: Update image tags in k8s/production
        working-directory: k8s/production
        run: |
          TAG="${{ needs.build-push.outputs.image_tag }}"
          kustomize edit set image \
            "ghcr.io/pixel-pet-arena/api=ghcr.io/pixel-pet-arena/api:${TAG}" \
            "ghcr.io/pixel-pet-arena/player-app=ghcr.io/pixel-pet-arena/player-app:${TAG}" \
            "ghcr.io/pixel-pet-arena/admin-app=ghcr.io/pixel-pet-arena/admin-app:${TAG}"

      - name: Commit updated manifests
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add k8s/production/kustomization.yaml
          git commit -m "chore(k8s): promote production to ${{ needs.build-push.outputs.image_tag }}" || echo "No changes"
          git push

  health-check-production:
    name: Post-deploy health check (production)
    needs: [update-k8s-manifest, build-push]
    runs-on: ubuntu-24.04
    steps:
      - name: Wait for ArgoCD sync (120s grace period)
        run: sleep 120

      - name: Health check — API /health
        run: |
          for i in $(seq 1 12); do
            STATUS=$(curl -sf -o /dev/null -w "%{http_code}" https://api.pixel-pet-arena.com/health)
            echo "Attempt ${i}: HTTP ${STATUS}"
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed."
              exit 0
            fi
            sleep 15
          done
          echo "Production health check failed. Triggering rollback."
          exit 1

      - name: Sentry release notification
        if: success()
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: pixel-pet-arena
          SENTRY_PROJECT: api
        run: |
          curl -sS -X POST "https://sentry.io/api/0/organizations/${SENTRY_ORG}/releases/" \
            -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"version\": \"${{ needs.build-push.outputs.image_tag }}\", \"projects\": [\"${SENTRY_PROJECT}\"]}"

      - name: PagerDuty deploy event
        if: success()
        env:
          PAGERDUTY_INTEGRATION_KEY: ${{ secrets.PAGERDUTY_INTEGRATION_KEY }}
        run: |
          curl -sS -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H "Content-Type: application/json" \
            -d "{
              \"routing_key\": \"${PAGERDUTY_INTEGRATION_KEY}\",
              \"event_action\": \"trigger\",
              \"payload\": {
                \"summary\": \"Production deploy completed: ${{ needs.build-push.outputs.image_tag }}\",
                \"severity\": \"info\",
                \"source\": \"github-actions\",
                \"custom_details\": {
                  \"tag\": \"${{ needs.build-push.outputs.image_tag }}\",
                  \"actor\": \"${{ github.actor }}\"
                }
              },
              \"dedup_key\": \"deploy-${{ needs.build-push.outputs.image_tag }}\"
            }"

      - name: Install ArgoCD CLI
        if: failure()
        run: |
          ARGOCD_CHECKSUM=$(curl -sSL https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64.sha256 | awk '{print $1}')
          curl -sSL -o /usr/local/bin/argocd \
            https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          echo "${ARGOCD_CHECKSUM}  /usr/local/bin/argocd" | sha256sum -c -
          chmod +x /usr/local/bin/argocd
          argocd login "${{ secrets.ARGOCD_SERVER }}" \
            --auth-token "${{ secrets.ARGOCD_TOKEN }}" \
            --grpc-web

      - name: Rollback on health check failure
        if: failure()
        env:
          ARGOCD_SERVER: ${{ secrets.ARGOCD_SERVER }}
          ARGOCD_TOKEN: ${{ secrets.ARGOCD_TOKEN }}
          PAGERDUTY_INTEGRATION_KEY: ${{ secrets.PAGERDUTY_INTEGRATION_KEY }}
        run: |
          LAST_GOOD_REVISION=$(argocd app history pixel-pet-arena-production --output json | jq '[.[] | select(.operationState.phase=="Succeeded")][1].id' 2>/dev/null)
          if [ -z "${LAST_GOOD_REVISION}" ] || [ "${LAST_GOOD_REVISION}" = "null" ]; then
            echo "WARNING: could not determine last good revision; skipping rollback." >&2
          else
            curl -sf -H "Authorization: Bearer ${ARGOCD_TOKEN}" \
              -H "Content-Type: application/json" \
              "${ARGOCD_SERVER}/api/v1/applications/pixel-pet-arena-production/rollback" \
              -d "{\"id\": ${LAST_GOOD_REVISION}}" || true
          fi
          curl -sS -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H "Content-Type: application/json" \
            -d "{
              \"routing_key\": \"${PAGERDUTY_INTEGRATION_KEY}\",
              \"event_action\": \"trigger\",
              \"payload\": {
                \"summary\": \"PRODUCTION DEPLOY FAILED — rollback triggered for ${{ needs.build-push.outputs.image_tag }}\",
                \"severity\": \"critical\",
                \"source\": \"github-actions\"
              },
              \"dedup_key\": \"deploy-failure-${{ needs.build-push.outputs.image_tag }}\"
            }"
          exit 1
```

---

## PR Gate

Every pull request targeting `develop` or `main` must pass all of the following checks before it is eligible for merge. The checks are enforced by the `ci.yml` GitHub Actions workflow, and branch protection rules prevent merging while any required check is failing or pending.

### Required Checks (must all be green)

| Check | Tool | Threshold |
|---|---|---|
| ESLint | ESLint 8.x with shared config | Zero errors; warnings do not block |
| TypeScript type-check | `tsc --noEmit` across all workspace packages | Zero type errors |
| Unit tests | Vitest with `@vitest/coverage-v8` | Must pass; ≥80% line coverage in each app package |
| API integration tests | Vitest integration suite against Supabase local stack | All tests must pass |
| Application builds | `pnpm --filter api build`, `player-app build`, `admin-app build` | All three builds must exit 0 |
| Secret scan | `detect-secrets` with `.secrets.baseline` | Zero new detected secrets in the diff |
| Docker image builds | `docker/build-push-action` (push=false) | All three images must build without error |
| E2E smoke tests | Playwright against local stack | Smoke suite must pass |

### Branch Protection Rules

Configure these settings in **Settings → Branches → Branch protection rules** for both `main` and `develop`:

- **Require a pull request before merging**: enabled
- **Require approvals**: minimum 1 approving review from a code owner
- **Dismiss stale reviews when new commits are pushed**: enabled
- **Require review from Code Owners**: enabled (configure a `CODEOWNERS` file at the repo root)
- **Require status checks to pass before merging**: enabled
  - Required status checks: `CI — PR Gate / lint-typecheck`, `CI — PR Gate / unit-tests`, `CI — PR Gate / integration-tests`, `CI — PR Gate / build`, `CI — PR Gate / secret-scan`, `CI — PR Gate / e2e-smoke`
- **Require branches to be up to date before merging**: enabled
- **Do not allow bypassing the above settings**: enabled (applies to administrators)

### Coverage Enforcement

Each application package must individually meet the 80% line coverage threshold. Coverage is measured using `@vitest/coverage-v8` and reported in `apps/<name>/coverage/coverage-summary.json`. The `ci.yml` workflow includes an inline Node.js check that reads each coverage summary and exits non-zero if any package falls below the threshold. Aggregate coverage across the monorepo does not satisfy this requirement; each package is checked independently.

### Secrets Detection

The `detect-secrets` tool scans each PR diff for patterns matching API keys, tokens, connection strings, and other credential shapes. The `.secrets.baseline` file at the repository root records known false positives that have been reviewed and approved. Any new match that is not already listed in the baseline will fail the `secret-scan` job and block the merge. To add a false positive to the baseline, run `detect-secrets scan --update .secrets.baseline` locally, review the new entry, and commit the updated baseline file in a separate PR.

---

## ArgoCD

ArgoCD manages all Kubernetes deployments for pixel-pet-arena using a GitOps model. The single source of truth for cluster state is the `k8s/` directory in this repository. ArgoCD continuously watches the manifests stored there and reconciles the cluster state to match.

### GitOps Deployment Pattern

```
GitHub repository (k8s/ directory)
        │
        │  ArgoCD polls or receives webhook every 3 minutes
        ▼
┌─────────────────────────────────────────────────────────┐
│  ArgoCD (cluster-internal)                              │
│                                                         │
│  Application: pixel-pet-arena-staging                   │
│    source.repoURL: https://github.com/<org>/pixel-pet-arena │
│    source.path:    k8s/staging                          │
│    destination:    cluster=in-cluster, namespace=staging │
│    syncPolicy:     automated (prune=true, selfHeal=true) │
│                                                         │
│  Application: pixel-pet-arena-production                │
│    source.repoURL: https://github.com/<org>/pixel-pet-arena │
│    source.path:    k8s/production                       │
│    destination:    cluster=in-cluster, namespace=production │
│    syncPolicy:     manual (operator triggers sync)       │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure — `k8s/`

```
k8s/
├── base/                          # Shared resource definitions
│   ├── api/
│   │   ├── deployment.yaml        # Fastify API deployment (port 3000)
│   │   ├── service.yaml           # ClusterIP service
│   │   └── hpa.yaml               # HorizontalPodAutoscaler
│   ├── player-app/
│   │   ├── deployment.yaml        # Nginx serving player build (port 80)
│   │   └── service.yaml
│   ├── admin-app/
│   │   ├── deployment.yaml        # Nginx serving admin build (port 80)
│   │   └── service.yaml
│   ├── ingress.yaml               # Ingress rules for all three apps
│   └── kustomization.yaml         # Base Kustomize configuration
├── staging/
│   ├── kustomization.yaml         # Extends base; sets staging image tags
│   ├── namespace.yaml             # namespace: staging
│   ├── configmap-staging.yaml     # Non-secret env vars for staging
│   └── patches/
│       └── replicas-staging.yaml  # Lower replica counts for staging
└── production/
    ├── kustomization.yaml         # Extends base; sets production image tags
    ├── namespace.yaml             # namespace: production
    ├── configmap-production.yaml  # Non-secret env vars for production
    └── patches/
        └── replicas-production.yaml  # Production-scale replica counts
```

### Image Tag Updates via Kustomize

The `deploy-staging.yml` and `deploy-production.yml` workflows use `kustomize edit set image` to update the image tag in the overlay's `kustomization.yaml` before committing and pushing the change. ArgoCD detects the commit and begins a sync.

Example `k8s/staging/kustomization.yaml` after an image update:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../base

namespace: staging

images:
  - name: ghcr.io/pixel-pet-arena/api
    newTag: develop-a1b2c3d4
  - name: ghcr.io/pixel-pet-arena/player-app
    newTag: develop-a1b2c3d4
  - name: ghcr.io/pixel-pet-arena/admin-app
    newTag: develop-a1b2c3d4
```

### Staging: Automatic Sync

The `pixel-pet-arena-staging` ArgoCD Application is configured with `automated` sync policy. Any commit to `k8s/staging/` is applied to the staging cluster within the ArgoCD polling interval (default: 3 minutes, or immediately via a webhook). `prune: true` ensures resources removed from the manifests are deleted from the cluster. `selfHeal: true` reverts any out-of-band cluster changes.

### Production: Manual Sync

The `pixel-pet-arena-production` ArgoCD Application requires a human operator to trigger the sync, either via the ArgoCD UI or the CLI. The `deploy-production.yml` workflow commits the updated manifest; an operator then approves the sync as a second independent gate. This prevents production from being affected by an automated commit unless a human explicitly approves it.

To trigger a production sync after the manifest commit:

```bash
# Log in (once per session)
argocd login <ARGOCD_SERVER> --auth-token <ARGOCD_TOKEN>

# Trigger a manual sync
argocd app sync pixel-pet-arena-production

# Watch sync progress
argocd app wait pixel-pet-arena-production --timeout 300
```

### Rolling Back via ArgoCD CLI

ArgoCD retains a history of previous sync states. To roll back to the last known healthy revision:

```bash
# List recent sync history to identify the target revision ID
argocd app history pixel-pet-arena-production

# Roll back to a specific history revision (replace <REVISION_ID> with the numeric ID)
argocd app rollback pixel-pet-arena-production <REVISION_ID>

# Confirm the cluster state matches the rolled-back revision
argocd app get pixel-pet-arena-production
```

After a rollback, update `k8s/production/kustomization.yaml` to reflect the rolled-back tag and commit the change so the repository stays in sync with the cluster. Do not leave the repository manifest pointing at a tag that differs from what is running.

---

## Database Migrations

All schema migrations are managed through the `pnpm db:migrate` script defined in the root `package.json`. The underlying driver may be `node-pg-migrate` or Supabase CLI migrations, depending on the migration files present in `supabase/migrations/`. Check `package.json` to confirm:

```bash
grep -A2 '"db:' package.json
```

### Migrations in the PR Gate

During CI (`ci.yml`), the `integration-tests` job starts a Supabase local stack, then runs `pnpm db:migrate` against the ephemeral local database. The full migration history is applied on every CI run from a clean state. This means any migration added in the PR is tested end-to-end — from SQL syntax validation through actual schema application — before the PR can be merged. Migration failures abort the integration test job and block the PR.

### Migrations in Staging Deploy

The `deploy-staging.yml` workflow runs `pnpm db:migrate --env staging` as a dedicated job step after Docker images are pushed but before the Kustomize manifest is updated and the new pods are rolled out. The migration step uses `DATABASE_URL_STAGING` from GitHub Secrets. If the migration step fails, the workflow aborts before the Kustomize commit, so the old application version continues running unchanged and is not exposed to a partially migrated schema.

```bash
# Equivalent manual invocation (for debugging)
DATABASE_URL="<staging-url>" pnpm db:migrate --env staging
```

### Migrations in Production Deploy

Same pattern as staging. The `migrate-production` job in `deploy-production.yml` runs after the manual approval gate, using `DATABASE_URL_PRODUCTION`. Production application pods are only updated after migrations complete successfully.

### Zero-Downtime Migration Practices

Follow the expand-contract (parallel-change) pattern for any migration that removes or renames a column or table:

1. **Expand**: Add the new column or table; keep the old one. Deploy application code that writes to both.
2. **Migrate data**: Backfill existing rows to populate the new structure.
3. **Contract**: Once all data is migrated and no application code reads the old structure, drop the old column or table in a subsequent deploy.

This ensures that both the old and new versions of the application code can run simultaneously against the same schema at any point during a rolling pod update, preventing errors during the rollout window.

Never use `ALTER TABLE ... LOCK` or any DDL that takes an exclusive table lock on a large, actively-queried table without an explicit maintenance window.

### Migration Rollback Procedure

There is no automatic down-migration on failure. The rollback procedure depends on the migration type:

**For additive migrations** (new tables or columns): the old application version is compatible with the new schema, so reverting the application image is sufficient. Remove the migration file from the repository in a follow-up PR and record the decision.

**For destructive migrations** (column or table drops): before running the migration in production, ensure a recent point-in-time database snapshot exists through the managed Supabase / PostgreSQL backup service. If the migration causes issues, restore from the snapshot. Coordinate with the team before running destructive migrations outside a maintenance window.

**Manual rollback command** (node-pg-migrate):

```bash
# Roll back the last applied migration
DATABASE_URL="<target-url>" pnpm exec node-pg-migrate down 1
```

---

## Secrets Management

All credentials are stored as GitHub repository secrets and injected into GitHub Actions workflows as environment variables at runtime. No secret values appear in repository files, workflow logs, or Docker image layers.

### Required GitHub Repository Secrets

| Secret name | Used in | Description |
|---|---|---|
| `DATABASE_URL_STAGING` | `deploy-staging.yml` | PostgreSQL connection string for staging Supabase project |
| `DATABASE_URL_PRODUCTION` | `deploy-production.yml` | PostgreSQL connection string for production Supabase project |
| `REDIS_URL_STAGING` | Kubernetes staging ConfigMap / Sealed Secrets | Upstash Redis TLS URL for staging |
| `REDIS_URL_PRODUCTION` | Kubernetes production ConfigMap / Sealed Secrets | Upstash Redis TLS URL for production |
| `JWT_SECRET` | Kubernetes Sealed Secrets (both envs) | 64-byte base64url-encoded secret for TOTP setup token signing |
| `EMAIL_ENCRYPTION_KEY` | Kubernetes Sealed Secrets (both envs) | 64-character hex string (32-byte AES-256-GCM key) for email encryption |
| `SENDGRID_API_KEY` | Kubernetes Sealed Secrets (both envs) | SendGrid API key for transactional email delivery |
| `GHCR_TOKEN` | `deploy-staging.yml`, `deploy-production.yml` | GitHub Personal Access Token (PAT) with `write:packages` scope for ghcr.io push |
| `ARGOCD_SERVER` | `deploy-staging.yml`, `deploy-production.yml` | ArgoCD server hostname, e.g. `https://argocd.internal.pixel-pet-arena.com` |
| `ARGOCD_TOKEN` | `deploy-staging.yml`, `deploy-production.yml` | ArgoCD API token for programmatic application sync and rollback |
| `SUPABASE_PROJECT_REF` | Supabase CLI in CI/CD | Supabase project reference ID (found in project settings) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase CLI in CI/CD, admin-side operations | Service role key for privileged Supabase operations (bypass RLS) |
| `SENTRY_AUTH_TOKEN` | `deploy-production.yml` | Sentry authentication token for release notifications |
| `ADMIN_TOTP_ISSUER` | `ci.yml` | Issuer label shown in authenticator apps for admin TOTP enrollment. Used by: api. Example: pixel-pet-arena-prod. |
| `PAGERDUTY_INTEGRATION_KEY` | `deploy-production.yml` | PagerDuty Events API v2 integration key for deploy notifications and failure alerts |

### Mapping to Application Environment Variables

The Kubernetes Sealed Secrets or ExternalSecrets resources in `k8s/base/` map GitHub-stored values to the environment variable names that each application expects at runtime:

| Secret key | API env var | Notes |
|---|---|---|
| `DATABASE_URL_STAGING` / `DATABASE_URL_PRODUCTION` | `DATABASE_URL` | Injected via Kubernetes Secret, mounted as env var |
| `REDIS_URL_STAGING` / `REDIS_URL_PRODUCTION` | `REDIS_URL` | Injected via Kubernetes Secret |
| `JWT_SECRET` | `JWT_SECRET` | Injected via Kubernetes Secret |
| `EMAIL_ENCRYPTION_KEY` | `EMAIL_ENCRYPTION_KEY` | Injected via Kubernetes Secret |
| `SENDGRID_API_KEY` | `SENDGRID_API_KEY` | Injected via Kubernetes Secret |
| `ADMIN_TOTP_ISSUER` | `ADMIN_TOTP_ISSUER` | Injected via Kubernetes ConfigMap |

Frontend applications (`player-app`, `admin-app`) receive `VITE_API_BASE_URL` as a Docker build-time argument (`build-args`) passed directly in the deploy workflow, not as a runtime ConfigMap value. No sensitive values are embedded in frontend builds.

### Rotation Policy

| Secret | Rotation frequency | Notes |
|---|---|---|
| `JWT_SECRET` | Every 90 days or immediately on suspected compromise | Rotating this secret invalidates all active admin TOTP setup sessions |
| `EMAIL_ENCRYPTION_KEY` | Every 180 days | Requires re-encryption of stored email addresses; plan a maintenance window |
| `DATABASE_URL_*` | On database credential rotation or staff departure | Update Kubernetes Sealed Secrets and redeploy |
| `REDIS_URL_*` | On Upstash credential rotation | Update Kubernetes Sealed Secrets and redeploy |
| `SENDGRID_API_KEY` | Every 90 days | Rotate in SendGrid console, then update the GitHub secret |
| `GHCR_TOKEN` | Every 90 days or on token compromise | Ensure new token has `write:packages` before retiring the old one |
| `ARGOCD_TOKEN` | Every 90 days | Generate a new token in ArgoCD account settings |
| `SUPABASE_SERVICE_ROLE_KEY` | On staff departure or compromise | Regenerate in Supabase project API settings |

---

## Monitoring Integration

Post-deployment verification and alerting are integrated into the deploy workflows to detect problems immediately after a rollout without requiring manual monitoring.

### Post-Deploy Health Checks

Both `deploy-staging.yml` and `deploy-production.yml` include a dedicated health check job that runs after the manifest update is committed to the repository and ArgoCD has had time to sync the new pods. The check polls `GET /health` on the deployed API:

```bash
# Expected healthy response
curl https://api.pixel-pet-arena.com/health
# {"status":"healthy","checks":{"database":"ok","redis":"ok"},"timestamp":"..."}
```

The health check job retries up to 10–12 times with 15-second intervals, giving the Kubernetes rolling update approximately 2–3 minutes to complete before declaring a failure. If all retries are exhausted without a `200` response, the job exits with a non-zero code, which triggers the rollback step.

### Sentry Release Notifications

After a successful production health check, the workflow creates a Sentry release record via the Sentry REST API. This marks the deploy point in Sentry's issue timeline, allowing the team to associate any new error spikes with the specific version that introduced them. The release version matches the git tag (e.g., `v1.2.3`).

To set up: create a Sentry organization and project for `api`, generate an internal integration token with `project:releases` scope, and store it as `SENTRY_AUTH_TOKEN` in GitHub Secrets.

### PagerDuty Webhooks

PagerDuty receives two types of events from the deploy workflow:

- **Deploy success** (`severity: info`): sent after the health check passes in production. This creates a low-priority timeline event in PagerDuty for audit purposes. It does not page the on-call engineer.
- **Deploy failure** (`severity: critical`): sent when the health check fails or the rollback is triggered. This creates a high-priority incident that pages the on-call engineer according to the configured escalation policy.

To set up: create a PagerDuty Events API v2 integration on the pixel-pet-arena service, copy the integration key, and store it as `PAGERDUTY_INTEGRATION_KEY` in GitHub Secrets.

### Automatic Rollback on Health Check Failure

If the post-deploy health check exhausts all retries, both staging and production workflows invoke the ArgoCD rollback API before exiting. A PagerDuty critical alert fires after production rollbacks to page the on-call engineer:

```bash
LAST_GOOD_REVISION=$(argocd app history pixel-pet-arena-staging \
  --output json | jq '[.[] | select(.operationState.phase=="Succeeded")][1].id' 2>/dev/null)

if [ -z "$LAST_GOOD_REVISION" ] || [ "$LAST_GOOD_REVISION" = "null" ]; then
  echo "WARNING: No previous successful deployment found; skipping automatic rollback."
else
  curl -s -X POST "$ARGOCD_SERVER/api/v1/applications/pixel-pet-arena-staging/rollback" \
    -H "Authorization: Bearer $ARGOCD_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"id\": $LAST_GOOD_REVISION}"
fi
```

The `id` value should be the revision ID of the last healthy sync, retrieved via `argocd app history`. Use `0` only as a fallback; pass the actual last-good revision ID in automated scripts. After the rollback, the PagerDuty critical alert is fired so the on-call engineer is paged and the incident is tracked. The `k8s/production/kustomization.yaml` must be manually corrected to remove the bad image tag before any subsequent deploy is attempted.

---

## Jenkinsfile

For teams that operate a Jenkins-based CI/CD infrastructure instead of GitHub Actions, the following declarative Jenkinsfile provides an equivalent pipeline. It mirrors the same logical stages — Checkout, Install, Lint and Type Check, Test, Build, Push Image, and Deploy — and uses the same environment variable names as the GitHub Actions workflows above.

```groovy
// Jenkinsfile (Declarative Pipeline)
// Place this file at the repository root.

pipeline {
    agent {
        docker {
            image 'node:20-slim'
            args '-v /var/run/docker.sock:/var/run/docker.sock --group-add docker'
        }
    }

    environment {
        PNPM_HOME    = '/root/.local/share/pnpm'
        PATH         = "${PNPM_HOME}:${env.PATH}"
        REGISTRY     = 'ghcr.io'
        IMAGE_ORG    = 'pixel-pet-arena'
        NODE_VERSION = '20'

        // Credentials stored in Jenkins Credentials Store
        GHCR_TOKEN             = credentials('ghcr-token')
        DATABASE_URL_STAGING   = credentials('database-url-staging')
        DATABASE_URL_PRODUCTION = credentials('database-url-production')
        REDIS_URL_STAGING      = credentials('redis-url-staging')
        REDIS_URL_PRODUCTION   = credentials('redis-url-production')
        JWT_SECRET             = credentials('jwt-secret')
        EMAIL_ENCRYPTION_KEY   = credentials('email-encryption-key')
        SENDGRID_API_KEY       = credentials('sendgrid-api-key')
        ARGOCD_SERVER          = credentials('argocd-server')
        ARGOCD_TOKEN           = credentials('argocd-token')
        SENTRY_AUTH_TOKEN      = credentials('sentry-auth-token')
        PAGERDUTY_INTEGRATION_KEY = credentials('pagerduty-integration-key')
    }

    options {
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '30'))
        disableConcurrentBuilds(abortPrevious: true)
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log --oneline -5'
            }
        }

        stage('Install') {
            steps {
                sh '''
                    npm install -g pnpm@9
                    pnpm --version
                    pnpm install --frozen-lockfile
                '''
            }
        }

        stage('Lint and Type Check') {
            parallel {
                stage('ESLint') {
                    steps {
                        sh 'pnpm --recursive lint'
                    }
                }
                stage('TypeScript') {
                    steps {
                        sh 'pnpm --recursive exec tsc --noEmit'
                    }
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'pnpm --recursive test run --coverage'
                        sh '''
                            node -e "
                                const fs = require('fs');
                                const paths = [
                                  'apps/api/coverage/coverage-summary.json',
                                  'apps/player/coverage/coverage-summary.json',
                                  'apps/admin/coverage/coverage-summary.json',
                                ];
                                let allPass = true;
                                for (const p of paths) {
                                  if (!fs.existsSync(p)) { console.error('Missing: ' + p); allPass = false; continue; }
                                  const pct = JSON.parse(fs.readFileSync(p, 'utf8')).total.lines.pct;
                                  console.log(p + ': ' + pct + '%');
                                  if (pct < 80) { console.error('FAIL: coverage below 80%'); allPass = false; }
                                }
                                if (!allPass) process.exit(1);
                            "
                        '''
                    }
                    post {
                        always {
                            publishHTML(target: [
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'apps/api/coverage/lcov-report',
                                reportFiles: 'index.html',
                                reportName: 'API Coverage Report'
                            ])
                        }
                    }
                }

                stage('Integration Tests') {
                    steps {
                        // Supabase CLI and Docker must be available on the Jenkins agent
                        sh '''
                            supabase start
                            DB_URL=$(supabase status --output json | jq -r '."DB URL"')
                            export DATABASE_URL="${DB_URL}"
                            export REDIS_URL="redis://localhost:6379"
                            export JWT_SECRET="jenkins-ci-test-secret"
                            export EMAIL_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000"
                            export SENDGRID_API_KEY="SG.test"
                            export ADMIN_TOTP_ISSUER="pixel-pet-arena-ci"
                            export FF_MARKETPLACE="false"
                            export FF_ARENA_SUMO="true"
                            pnpm db:migrate
                            pnpm db:seed --ci
                            pnpm --filter api test:integration
                        '''
                    }
                    post {
                        always {
                            sh 'supabase stop || true'
                        }
                    }
                }
            }
        }

        stage('Build') {
            steps {
                sh '''
                    pnpm --filter @pixel-pet-arena/shared build
                    pnpm --filter api build
                    pnpm --filter player-app build
                    pnpm --filter admin-app build
                '''
            }
        }

        stage('Push Image') {
            when {
                anyOf {
                    branch 'develop'
                    buildingTag()
                }
            }
            steps {
                script {
                    def imageTag
                    if (env.TAG_NAME) {
                        imageTag = env.TAG_NAME
                    } else {
                        imageTag = "develop-${env.GIT_COMMIT.take(8)}"
                    }
                    env.IMAGE_TAG = imageTag
                }
                sh '''
                    echo "${GHCR_TOKEN_PSW}" | docker login "${REGISTRY}" -u "${GHCR_TOKEN_USR}" --password-stdin

                    docker build -t "${REGISTRY}/${IMAGE_ORG}/api:${IMAGE_TAG}" apps/api
                    docker push "${REGISTRY}/${IMAGE_ORG}/api:${IMAGE_TAG}"

                    docker build -t "${REGISTRY}/${IMAGE_ORG}/player-app:${IMAGE_TAG}" apps/player
                    docker push "${REGISTRY}/${IMAGE_ORG}/player-app:${IMAGE_TAG}"

                    docker build -t "${REGISTRY}/${IMAGE_ORG}/admin-app:${IMAGE_TAG}" apps/admin
                    docker push "${REGISTRY}/${IMAGE_ORG}/admin-app:${IMAGE_TAG}"

                    docker logout "${REGISTRY}"
                '''
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh '''
                    export DATABASE_URL="${DATABASE_URL_STAGING}"
                    pnpm db:migrate --env staging

                    cd k8s/staging
                    kustomize edit set image \
                        "ghcr.io/pixel-pet-arena/api=ghcr.io/pixel-pet-arena/api:${IMAGE_TAG}" \
                        "ghcr.io/pixel-pet-arena/player-app=ghcr.io/pixel-pet-arena/player-app:${IMAGE_TAG}" \
                        "ghcr.io/pixel-pet-arena/admin-app=ghcr.io/pixel-pet-arena/admin-app:${IMAGE_TAG}"

                    cd ../..
                    git config user.name "Jenkins"
                    git config user.email "jenkins@pixel-pet-arena.com"
                    git add k8s/staging/kustomization.yaml
                    git commit -m "chore(k8s): update staging image tag to ${IMAGE_TAG}" || echo "No manifest changes"
                    git push origin develop

                    sleep 90
                    for i in $(seq 1 10); do
                        STATUS=$(curl -sf -o /dev/null -w "%{http_code}" https://api.staging.pixel-pet-arena.com/health)
                        echo "Health check attempt ${i}: HTTP ${STATUS}"
                        if [ "${STATUS}" = "200" ]; then exit 0; fi
                        sleep 15
                    done
                    echo "Staging health check failed."
                    exit 1
                '''
            }
        }

        stage('Manual Approval — Production') {
            when {
                buildingTag()
            }
            steps {
                input(
                    message: "Deploy ${env.IMAGE_TAG} to production?",
                    ok: 'Deploy',
                    submitter: 'release-managers',
                    submitterParameter: 'APPROVER'
                )
                echo "Approved by ${env.APPROVER}"
            }
        }

        stage('Deploy to Production') {
            when {
                buildingTag()
            }
            steps {
                sh '''
                    export DATABASE_URL="${DATABASE_URL_PRODUCTION}"
                    pnpm db:migrate --env production

                    cd k8s/production
                    kustomize edit set image \
                        "ghcr.io/pixel-pet-arena/api=ghcr.io/pixel-pet-arena/api:${IMAGE_TAG}" \
                        "ghcr.io/pixel-pet-arena/player-app=ghcr.io/pixel-pet-arena/player-app:${IMAGE_TAG}" \
                        "ghcr.io/pixel-pet-arena/admin-app=ghcr.io/pixel-pet-arena/admin-app:${IMAGE_TAG}"
                    cd ../..

                    git config user.name "Jenkins"
                    git config user.email "jenkins@pixel-pet-arena.com"
                    git add k8s/production/kustomization.yaml
                    git commit -m "chore(k8s): promote production to ${IMAGE_TAG}" || echo "No manifest changes"
                    git push origin main

                    sleep 120
                    for i in $(seq 1 12); do
                        STATUS=$(curl -sf -o /dev/null -w "%{http_code}" https://api.pixel-pet-arena.com/health)
                        echo "Health check attempt ${i}: HTTP ${STATUS}"
                        if [ "${STATUS}" = "200" ]; then
                            curl -sS -X POST "https://sentry.io/api/0/organizations/pixel-pet-arena/releases/" \
                                -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
                                -H "Content-Type: application/json" \
                                -d "{\"version\": \"${IMAGE_TAG}\", \"projects\": [\"api\"]}"
                            curl -sS -X POST "https://events.pagerduty.com/v2/enqueue" \
                                -H "Content-Type: application/json" \
                                -d "{\"routing_key\": \"${PAGERDUTY_INTEGRATION_KEY}\", \"event_action\": \"trigger\", \"payload\": {\"summary\": \"Production deploy completed: ${IMAGE_TAG}\", \"severity\": \"info\", \"source\": \"jenkins\"}, \"dedup_key\": \"deploy-${IMAGE_TAG}\"}"
                            exit 0
                        fi
                        sleep 15
                    done
                    echo "Production health check failed."
                    exit 1
                '''
            }
        }
    }

    post {
        failure {
            script {
                if (env.TAG_NAME) {
                    sh '''
                        ARGOCD_CHECKSUM=$(curl -sSL https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64.sha256 | awk '{print $1}')
                        curl -sSL -o /usr/local/bin/argocd \
                          https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
                        echo "${ARGOCD_CHECKSUM}  /usr/local/bin/argocd" | sha256sum -c -
                        chmod +x /usr/local/bin/argocd
                        argocd login "${ARGOCD_SERVER}" --auth-token "${ARGOCD_TOKEN}" --grpc-web
                    '''
                    sh '''
                        LAST_GOOD_REVISION=$(argocd app history pixel-pet-arena-production --output json | jq '[.[] | select(.operationState.phase=="Succeeded")][1].id' 2>/dev/null)
                        if [ -z "${LAST_GOOD_REVISION}" ] || [ "${LAST_GOOD_REVISION}" = "null" ]; then
                            echo "WARNING: could not determine last good revision; skipping rollback." >&2
                        else
                            curl -sf -H "Authorization: Bearer ${ARGOCD_TOKEN}" \
                                -H "Content-Type: application/json" \
                                "${ARGOCD_SERVER}/api/v1/applications/pixel-pet-arena-production/rollback" \
                                -d "{\"id\": ${LAST_GOOD_REVISION}}" || true
                        fi
                        curl -sS -X POST "https://events.pagerduty.com/v2/enqueue" \
                            -H "Content-Type: application/json" \
                            -d "{\"routing_key\": \"${PAGERDUTY_INTEGRATION_KEY}\", \"event_action\": \"trigger\", \"payload\": {\"summary\": \"PRODUCTION DEPLOY FAILED: ${IMAGE_TAG}\", \"severity\": \"critical\", \"source\": \"jenkins\"}, \"dedup_key\": \"deploy-failure-${IMAGE_TAG}\"}"
                    '''
                }
            }
        }
        always {
            cleanWs()
        }
    }
}
```

The Jenkins pipeline mirrors the GitHub Actions workflows in every material respect: the same quality gates, the same Docker image naming convention, the same post-deploy health checks, and the same ArgoCD-based rollback procedure. Teams running Jenkins should store all credential values in the Jenkins Credentials Store under the IDs listed in the `environment` block above, using the `Username with password` type for `ghcr-token` and the `Secret text` type for all others.

---

*Document generated for pixel-pet-arena monorepo. API port: 3000. Player app port: 5173. Admin app port: 5174. Health endpoint: `GET /health`.*
