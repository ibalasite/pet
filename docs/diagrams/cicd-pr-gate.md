# PR Gate Workflow (ci.yml)

This document details the PR gate workflow defined in `.github/workflows/ci.yml` for the pixel-pet-arena monorepo. Every pull request targeting `main` must pass all checks before it is eligible for merge. The gate runs lint, TypeScript type-checking, unit tests, integration tests, Docker builds for all three services, an end-to-end smoke test against the built containers, and a `detect-secrets` security scan to prevent credential leakage into the repository history.

## Workflow Trigger and Runner Context

The `ci.yml` workflow triggers on `pull_request` events targeting `main` and on direct pushes to `main`. Jobs run on `ubuntu-latest` GitHub-hosted runners. The pnpm workspace is bootstrapped with Node.js 20 and the lockfile is used for deterministic installs. A PostgreSQL service container and a Redis service container are started as job services for the integration test job.

```mermaid
flowchart TD
    PUSH([PR Opened / Pushed\ngithub.event pull_request])

    subgraph LINT_TC [Lint & Type-Check — parallel]
        LINT[pnpm lint\nESLint across api · player-app · admin-app]
        TC[pnpm typecheck\ntsc --noEmit all packages]
    end

    subgraph UNIT [Unit Tests — parallel per package]
        UNIT_API[api unit tests\nVitest · coverage ≥ 80%]
        UNIT_PLAYER[player-app unit tests\nVitest · coverage ≥ 80%]
        UNIT_ADMIN[admin-app unit tests\nVitest · coverage ≥ 80%]
    end

    subgraph INTEGRATION [Integration Tests]
        PG_SVC[PostgreSQL 15 service\nlocalhost:5432]
        REDIS_SVC[Redis 7 service\nlocalhost:6379]
        SUPABASE_MIG[supabase migration up\napply schema to test DB]
        INT_API[api integration tests\nFastify inject · DB + Redis]
    end

    subgraph BUILD [Docker Builds — parallel]
        BUILD_API[docker build api\nmulti-stage TypeScript compile]
        BUILD_PLAYER[docker build player-app\nnginx:alpine · port 80]
        BUILD_ADMIN[docker build admin-app\nnginx:alpine · port 80]
    end

    E2E[E2E Smoke Tests\nPlaywright against docker-compose stack]

    SEC_SCAN[detect-secrets scan\n--baseline .secrets.baseline\nfail on new secrets]

    RESULT{All checks\npassed?}
    BLOCK([PR Blocked\nCheck annotations on diff])
    PASS([PR Gate Passed\nReady for merge])

    PUSH --> LINT_TC
    LINT_TC --> UNIT
    UNIT --> INTEGRATION
    PG_SVC --> SUPABASE_MIG
    SUPABASE_MIG --> INT_API
    REDIS_SVC --> INT_API
    INTEGRATION --> BUILD
    BUILD --> E2E
    E2E --> SEC_SCAN
    SEC_SCAN --> RESULT
    RESULT -- No --> BLOCK
    RESULT -- Yes --> PASS

    style BLOCK fill:#e63946,color:#fff
    style PASS fill:#2a9d8f,color:#fff
    style RESULT fill:#f0a500,color:#000
    style SEC_SCAN fill:#457b9d,color:#fff
```

## Job Dependency Graph

The jobs are structured to maximise parallelism while preserving correctness. Lint and type-check run concurrently in the first wave. Unit tests fan out across the three workspace packages in parallel once the lint/type-check wave succeeds. Integration tests require a clean schema applied via `supabase migration up` against the PostgreSQL service container. Docker builds fan out after integration tests pass. The E2E smoke test runs after all three images are built and a temporary `docker-compose` stack is started. The security scan runs last but is non-blocking for unrelated job failures — it only fails the gate if `detect-secrets` reports new findings not present in `.secrets.baseline`.

```mermaid
sequenceDiagram
    participant GH as GitHub Actions Runner
    participant LINT as ESLint / tsc
    participant TEST as Vitest (unit + integration)
    participant DB as PostgreSQL 15 (service)
    participant REDIS as Redis 7 (service)
    participant DOCKER as Docker Build
    participant PW as Playwright Smoke
    participant DS as detect-secrets

    GH->>LINT: Run ESLint (all packages)
    GH->>LINT: Run tsc --noEmit (all packages)
    LINT-->>GH: lint OK / fail annotations
    GH->>TEST: Run unit tests (api, player-app, admin-app)
    TEST-->>GH: unit coverage reports
    GH->>DB: Start PostgreSQL service container
    GH->>REDIS: Start Redis service container
    DB-->>GH: ready
    REDIS-->>GH: ready
    GH->>DB: supabase migration up
    DB-->>GH: schema applied
    GH->>TEST: Run integration tests (api)
    TEST-->>GH: integration results
    GH->>DOCKER: Build api image (multi-stage)
    GH->>DOCKER: Build player-app image (nginx)
    GH->>DOCKER: Build admin-app image (nginx)
    DOCKER-->>GH: images built
    GH->>PW: docker-compose up + playwright test
    PW-->>GH: smoke test results
    GH->>DS: detect-secrets scan
    DS-->>GH: baseline diff result
    GH-->>GH: Aggregate job results → pass/fail
```

## Security Scan Details

The `detect-secrets` scanner runs with `--baseline .secrets.baseline` so that pre-approved findings are suppressed. Any newly detected high-entropy string, AWS key pattern, GitHub token, or database DSN that does not appear in the baseline causes the job to exit with a non-zero status, blocking the merge. The baseline file is committed to the repository and updated deliberately via `detect-secrets scan --baseline .secrets.baseline` in a dedicated housekeeping PR. This ensures the PR gate enforces a zero-tolerance policy on newly introduced secrets without penalising developers for existing managed entries.

## Test Coverage Requirements

All three workspace packages are required to meet an 80% line coverage threshold enforced by Vitest's built-in coverage reporter. Coverage reports are uploaded as GitHub Actions artifacts and are also reported as PR check annotations. A coverage drop below threshold fails the unit test job and blocks the PR gate.
