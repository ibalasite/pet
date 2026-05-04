# Runbook — pixel-pet-arena

**DOC-ID**: RUNBOOK-PIXEL-PET-ARENA-20260504
**Status**: ACTIVE
**Last Updated**: 2026-05-04
**Maintainer**: [ON-CALL-ENGINEER]

---

## Table of Contents

1. [Deployment](#deployment)
2. [Incident Response](#incident-response)
3. [Rollback](#rollback)
4. [Health Checks and Monitoring](#health-checks-and-monitoring)
5. [On-Call Quick Reference](#on-call-quick-reference)

---

## Deployment

This section covers the full deployment lifecycle for the pixel-pet-arena stack: Node.js/Fastify backend, React player frontend, and Vue 3 admin portal. Always run through the pre-deployment checklist before promoting any change to production.

### Pre-Deployment Checklist

Complete every item before starting a deploy. A missed item can cause downtime or data corruption.

1. **Database migrations** — verify all pending Supabase migrations have been reviewed and tested in staging. Run `pnpm db:migrate:status` to confirm no unexecuted migrations remain.
2. **Environment variables** — confirm the following are set in the target environment (Railway/Fly.io dashboard or secrets manager):
   - `DATABASE_URL` (Supabase connection string with connection pooling via PgBouncer)
   - `REDIS_URL` (Upstash Redis URL with TLS)
   - `JWT_SECRET` (≥ 32 bytes, base64url)
   - `SENDGRID_API_KEY`
   - `ADMIN_TOTP_ISSUER`
   - `FF_MARKETPLACE` (default: `false`)
   - `FF_ARENA_SUMO` (default: `true`)
   - `NODE_ENV=production`
   - `LOG_LEVEL` (e.g. `info`)
3. **Feature flags** — review `FF_MARKETPLACE` and `FF_ARENA_SUMO` values. `FF_MARKETPLACE` is disabled by default and must not be toggled without meeting the DAU threshold of 1,000 sustained for 2 weeks (`dau_marketplace_trigger = 1000`).
4. **CI pipeline** — confirm all CI checks (lint, type-check, unit tests at ≥ 80% coverage, build) are green on the target commit SHA.
5. **Staging smoke test** — validate that staging passed smoke tests (see Post-Deployment Smoke Tests below) within the last 24 hours.
6. **Change window** — schedule deploys outside peak hours (UTC 14:00–22:00 covers US evening prime time; prefer UTC 06:00–10:00).
7. **Rollback plan** — identify the last known-good image tag or commit SHA before starting.

### Backend Deployment Steps

The backend is a Node.js 20 / Fastify 4 / TypeScript service deployed on Railway or Fly.io.

1. Pull the target branch and verify the commit SHA:
   ```bash
   git fetch origin
   git checkout <SHA-or-tag>
   ```
2. Build the production artifact:
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```
3. Push or trigger the platform deployment:
   ```bash
   # Railway
   railway up --service api --environment production

   # Fly.io
   fly deploy --app pixel-pet-arena-api --image registry.fly.io/pixel-pet-arena-api:<tag>
   ```
4. Wait for the new instance to pass the health check. Poll until HTTP 200:
   ```bash
   until curl -sf https://api.pixel-pet-arena.com/api/v1/health; do
     echo "Waiting for health check…"; sleep 5
   done
   echo "Backend healthy"
   ```
5. Confirm the `/api/v1/health` response body includes `"status": "ok"` and reports database and Redis as connected (see [Health Checks and Monitoring](#health-checks-and-monitoring)).
6. Monitor error rate in the observability dashboard for 5 minutes. If error rate exceeds 1% per the `observability_error_rate_alert_window = 5` minute window, initiate rollback immediately.

### Frontend (Player) Build and CDN Deploy

The player frontend is React 18 + Phaser 3, built with Vite 5.

1. Build the production bundle:
   ```bash
   cd apps/player
   pnpm install --frozen-lockfile
   pnpm build
   # Output: dist/
   ```
2. Verify bundle sizes meet budget (JS gzipped < 300 KB, CSS gzipped < 50 KB):
   ```bash
   pnpm build:analyze
   ```
3. Deploy to CDN (e.g. Vercel or Cloudflare Pages):
   ```bash
   # Vercel
   vercel deploy --prod --token $VERCEL_TOKEN

   # Cloudflare Pages
   wrangler pages deploy dist --project-name pixel-pet-arena-player --branch main
   ```
4. Confirm the deployment URL returns the updated `<meta name="build-sha">` matching the target commit.

### Admin Portal Build and Deploy

The admin portal is Vue 3 + Element Plus + Pinia, also built with Vite 5.

1. Build the admin portal bundle:
   ```bash
   cd apps/admin
   pnpm install --frozen-lockfile
   pnpm build
   # Output: dist/
   ```
2. Deploy (separate CDN project or subdomain — admin portal must not be served from the same origin as the player frontend):
   ```bash
   # Vercel (separate project)
   vercel deploy --prod --token $VERCEL_TOKEN

   # Or Cloudflare Pages
   wrangler pages deploy dist --project-name pixel-pet-arena-admin --branch main
   ```
3. Confirm that accessing `https://admin.pixel-pet-arena.com/` redirects unauthenticated requests to the login page.

### Post-Deployment Smoke Tests

Run these checks within 10 minutes of every production deploy:

1. **Health endpoint** — `GET /api/v1/health` returns HTTP 200 with `"status": "ok"`.
2. **Leaderboard** — `GET /api/v1/leaderboard` returns HTTP 200 with a `data` array of up to 100 entries (`leaderboard_top_display = 100`).
3. **Public pet page** — `GET /api/v1/pets/:knownPetId` returns HTTP 200 with correct pet sprite seed and stats.
4. **Arena entry** (use a test pet token) — `POST /api/v1/arena/enter` with a valid pet token returns HTTP 200 or HTTP 202, not a 5xx.
5. **Admin login** — Access `https://admin.pixel-pet-arena.com/login`; verify the TOTP login form renders without JS errors.
6. **Static assets** — Confirm player frontend loads at root URL with FCP under 1.5 seconds (`fcp_target = 1.5s`).
7. **Feature flag state** — `GET /admin/api/config/runtime` (authenticated) confirms `FF_MARKETPLACE = false` and `FF_ARENA_SUMO` matches the intended state.

### Zero-Downtime Strategy

Both Railway and Fly.io support rolling deploys. The backend is stateless (session state stored in Redis, not in-process), making this safe.

- Railway: rolling deploy is the default; old instances drain existing connections while new instances accept new ones.
- Fly.io: `fly deploy` performs a rolling replacement by default with health check gating. Set `[deploy] strategy = "rolling"` in `fly.toml` to be explicit.
- Database migrations that are additive (add column, add index, add table) are safe to run before the deploy. Destructive migrations (drop column, rename) must be staged across two deploys: first deploy ignores the old column in code, second deploy drops it.
- CDN deploys for frontend and admin portal are atomic; new assets are hashed by Vite so old and new versions can coexist in cache during the cutover window.

---

## Incident Response

This section defines severity levels, SLAs, escalation paths, and first-responder playbooks for common failure scenarios.

### Severity Matrix

| Severity | Definition | Response SLA | Escalation |
|----------|-----------|-------------|-----------|
| **P0** | Complete outage — all users cannot play; `GET /api/v1/health` returns non-200 or is unreachable | Acknowledge within 5 min; resolve or roll back within 30 min | Page [ON-CALL-ENGINEER] immediately; escalate to platform lead if not resolved in 15 min |
| **P1** | Degraded performance — error rate > 5% or P99 latency > 2 s for any player-facing endpoint | Acknowledge within 15 min; restore to SLO within 60 min | Notify [ON-CALL-ENGINEER] via PagerDuty; loop in database/infra owner if DB or Redis implicated |
| **P2** | Minor issue — single feature broken, workaround available (e.g. arena battles fail but training works) | Acknowledge within 1 hour; resolve within 4 hours or next business day | Notify [ON-CALL-ENGINEER] via Slack `#incidents`; no escalation required unless degrading to P1 |

### P0 — Complete Outage

**First responder actions (in order):**

1. Check `/api/v1/health` from an external network. Note the HTTP status and response body.
2. Check the observability dashboard (Railway metrics / Fly.io metrics) for CPU, memory, and restart storms.
3. Check Supabase dashboard for database health, connection count, and recent query errors.
4. Check Upstash Redis dashboard for connectivity and memory usage.
5. If the backend process is crash-looping, roll back immediately (see [Rollback](#rollback)).
6. If the database is unreachable, check Supabase status page (`status.supabase.com`). If a platform incident is confirmed, post status update and wait; do not attempt a migration during a DB outage.
7. Communicate status in `#incidents` every 15 minutes until resolved.

### P1 — Degraded Performance

**First responder actions:**

1. Identify the affected endpoint(s) from dashboard latency percentiles. Compare against SLO targets: read endpoints < 200 ms P99, write endpoints < 500 ms P99.
2. Check DB connection pool utilization. Alert threshold is 80% (`infra_db_pool_alert_threshold = 80`). If pool is saturated, reduce traffic via rate limits or consider scaling the backend replicas.
3. Check Redis memory usage. Alert threshold is 80% (`infra_redis_alert_threshold = 80`).
4. If a recent deploy correlates with the degradation window, initiate rollback.
5. If the issue is isolated to a feature protected by a flag (`FF_ARENA_SUMO`), disable the flag (see Feature Flag Emergency Toggle below).

### P2 — Minor Issue

**First responder actions:**

1. Confirm the scope: which endpoint(s) are affected; what percentage of users are impacted.
2. Identify whether a workaround is available (e.g. arena disabled but leaderboard works). Document the workaround in `#incidents`.
3. Create a GitHub issue with full reproduction steps and link it in `#incidents`.
4. If the issue affects a feature behind a flag, consider disabling the flag as a temporary mitigation.

---

### Specific Incident Playbooks

#### Redis Unavailable → Leaderboard Fallback

Redis is used for rate-limiting counters and the arena matchmaking queue. When Redis is unavailable:

- **Leaderboard**: The frontend displays a stale-data banner (reads fall back to the last successful PostgreSQL snapshot). This is acceptable for up to `leaderboard_update_lag_max = 30` seconds; beyond that, the banner is surfaced to players automatically.
- **Arena rate limiting**: Arena battle rate limits are **fail-open** — if Redis is unavailable, rate limits are not enforced. This is an accepted risk designed to keep gameplay running; the failure is logged as an alert.
- **OTP code entry rate limiting**: This is **fail-closed** — code entry is blocked when Redis is down to prevent brute-force bypass.
- **Matchmaking queue**: Arena enter requests will time out after `arena_matchmaking_timeout = 30` seconds and fall back to an AI opponent.

**Actions:**

1. Check Upstash Redis status dashboard and connection string in environment variables.
2. If `REDIS_URL` is correct and Upstash reports healthy, check for network/TLS issues from the backend host.
3. If the Upstash outage is confirmed as a platform issue, open a support ticket with Upstash and set severity to P1.
4. Do not restart the backend process for a Redis outage alone; the system is designed to degrade gracefully.

#### Database Connection Pool Exhausted

The DB connection pool minimum is 20 connections (`db_connection_pool_min_connections = 20`). Alert fires at 80% pool utilization.

**Actions:**

1. Check the observability dashboard for `db_connection_pool_utilization`. If above 80%, proceed.
2. Identify long-running queries in Supabase dashboard (`Query Performance` tab). Kill any query running longer than 30 seconds that is blocking connections.
3. Check for connection leaks: look for backend instances that have open idle connections but are not processing requests.
4. If the backend is scaled to multiple replicas, reduce the per-instance pool size or scale back replicas temporarily.
5. If Supabase's free-tier connection limit is the bottleneck, enable PgBouncer (Supabase → Database → Connection Pooling → Transaction mode).
6. After connection count normalizes, monitor for 10 minutes before clearing the incident.

#### Admin Portal Locked Out

Admin accounts lock after `admin_login_lockout_threshold = 10` consecutive failed login attempts. The lockout duration is 30 minutes (`admin_login_lockout_duration_minutes = 30`).

**Actions (if waiting 30 minutes is acceptable):**

1. Wait for the lockout to expire automatically (30-minute window).
2. Advise the locked-out admin to ensure their TOTP code is from the correct time-synced authenticator app.

**Actions (if immediate access is required):**

1. Connect to the Supabase database (use the connection string from secrets manager, not from the locked-out admin's session):
   ```sql
   -- Find the locked account
   SELECT id, username, locked_until
   FROM admin_users
   WHERE username = '<admin_username>';

   -- Clear the lockout (run only with explicit approval from platform lead)
   UPDATE admin_users
   SET locked_until = NULL, failed_login_count = 0
   WHERE username = '<admin_username>';
   ```
2. Log the manual unlock action in the `#admin-ops` Slack channel with timestamp, operator, and reason. Supabase audit logs will also capture the query.
3. If the account was locked due to a suspected credential compromise rather than operator error, do not unlock until the credential has been rotated.

#### Bot Detection Alert Flood (> 50 battles / 60 min from one pet)

The system auto-flags any pet with more than `bot_detection_battles_threshold = 50` battles within any 60-minute rolling window as `SUSPICIOUS`.

**Actions:**

1. In the admin portal, navigate to **Moderation → Flagged Pets**. Confirm the flagged pet's battle history using `GET /admin/api/battles?petId=<id>&limit=100`.
2. Review the timestamps. If battles are uniformly spaced to the second or all originate from one IP, this is strong evidence of automation.
3. If confirmed bot activity, ban the pet via `POST /admin/api/pets/:petId/ban` with a moderation reason (max 500 characters, `admin_moderation_reason_max_chars = 500`).
4. If the alert is a false positive (e.g. a legitimate stress test or event), dismiss the flag and document the reason in the audit log.
5. If the alert volume exceeds 5 distinct pets in 1 hour, escalate to P1 — this may indicate a coordinated bot attack. Consider temporarily lowering `arena_rate_limit_battles_per_hour` to 1 via the admin config endpoint.

#### Feature Flag Emergency Toggle

Feature flags are environment variables read at startup and cached in memory. Config changes propagate within 5 minutes (`config_cache_refresh_time_minutes = 5`).

**To disable FF_ARENA_SUMO (e.g. sumo battles causing data corruption):**

Option A — Runtime config (preferred, no restart required, takes effect within 5 min):
```bash
# Authenticated admin call
curl -X PUT https://api.pixel-pet-arena.com/admin/api/config/runtime \
  -H "Cookie: session=<admin_session_id>" \
  -H "Content-Type: application/json" \
  -d '{"key": "FF_ARENA_SUMO", "value": false}'
```

Option B — Environment variable (requires redeploy):
1. In Railway or Fly.io dashboard, set `FF_ARENA_SUMO=false`.
2. Trigger a redeploy (see Backend Deployment Steps).

**To enable FF_MARKETPLACE (e.g. manually enabling for a qualifying DAU milestone):**

Confirm DAU ≥ 1,000 sustained for 2 weeks before enabling. Then:
```bash
curl -X PUT https://api.pixel-pet-arena.com/admin/api/config/runtime \
  -H "Cookie: session=<admin_session_id>" \
  -H "Content-Type: application/json" \
  -d '{"key": "FF_MARKETPLACE", "value": true}'
```

Verify the change was applied within 5 minutes by calling `GET /admin/api/config/runtime` and confirming the new value.

---

## Rollback

Rollback is the primary recovery tool for deploy-caused regressions. Act quickly: the window for a safe rollback narrows as new data written under the new schema diverges from the old schema.

### Backend Rollback Procedure

1. Identify the last known-good image tag or commit SHA from the deployment history (Railway deploy log or Fly.io release list):
   ```bash
   # Fly.io — list recent releases
   fly releases --app pixel-pet-arena-api

   # Railway — view deployment history in dashboard, note the deployment ID
   ```
2. Roll back to the previous image:
   ```bash
   # Fly.io
   fly deploy --app pixel-pet-arena-api --image registry.fly.io/pixel-pet-arena-api:<previous-tag>

   # Railway — redeploy a previous deployment from the dashboard (Deployments → select previous → Redeploy)
   ```
3. Wait for the health check to pass:
   ```bash
   until curl -sf https://api.pixel-pet-arena.com/api/v1/health; do
     echo "Waiting…"; sleep 5
   done
   ```
4. Run the post-deployment smoke tests (see [Deployment](#deployment)). Confirm all 7 checks pass.
5. Open a GitHub issue documenting what went wrong, the rollback action taken, and the incident timeline.

### Database Migration Rollback

> **WARNING**: Database rollbacks are potentially destructive and irreversible. A migration rollback that drops columns or tables will permanently delete data written after the migration ran. Never execute a down-migration in production without explicit written approval from the platform lead and a confirmed backup.

**Safe rollback (additive migrations only):**

If the migration only added columns or indexes and no application code has written to them yet, a rollback is relatively safe:

```bash
# Run the down migration (if one exists)
pnpm db:migrate:down --target <previous-version>

# Verify schema is back to expected state
pnpm db:migrate:status
```

**Unsafe rollback (destructive migrations):**

If the migration dropped or renamed columns, or if the new application code has already written data to new columns:

1. **Do not run a down migration.** Instead, forward-fix (see When NOT to Rollback below).
2. If data loss already occurred, restore from the most recent Supabase point-in-time backup (Supabase → Database → Backups).
3. Contact Supabase support if the backup restore window does not cover the incident.

### Frontend and Admin Portal CDN Cache Invalidation

Vite produces content-hashed asset filenames, so a new deploy automatically serves new assets to users loading a fresh page. However, the entry-point HTML files (`index.html`) may be cached at the CDN edge.

1. Invalidate the CDN cache for `index.html` after every rollback:
   ```bash
   # Vercel — purge cache via API
   curl -X POST "https://api.vercel.com/v1/projects/<project-id>/purge-cache" \
     -H "Authorization: Bearer $VERCEL_TOKEN" \
     -d '{"files": ["/index.html"]}'

   # Cloudflare — purge by URL
   curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/purge_cache" \
     -H "Authorization: Bearer $CF_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"files": ["https://pixel-pet-arena.com/index.html"]}'
   ```
2. Confirm users loading the site receive the rolled-back version by checking the `<meta name="build-sha">` tag.

### When NOT to Rollback (Forward-Fix Instead)

Prefer a forward-fix (deploy a corrected version forward) in these situations:

- The migration has already written significant data under the new schema. Rolling back would delete that data.
- The bug is in a code path not yet exercised by users (e.g. a feature flag is still off). Deploy a fix forward without rolling back.
- The rollback would re-introduce a previously patched security vulnerability.
- More than 30 minutes have elapsed since the bad deploy and user data has been created under the new schema.
- The error is a configuration issue (wrong env var value), not a code issue. Fix the config and trigger a new deploy rather than reverting the image.

In all forward-fix cases, acknowledge the incident, communicate the fix ETA, and deploy the corrected build through the normal CI pipeline.

---

## Health Checks and Monitoring

The `/api/v1/health` endpoint is the canonical liveness and readiness signal for the pixel-pet-arena backend. All load balancers and deployment platforms should use this endpoint for health-gating.

### `/api/v1/health` Response Schema

The endpoint must respond within `health_check_response_time = 500` ms.

**Healthy response (HTTP 200):**

```json
{
  "status": "ok",
  "version": "1.4.2",
  "buildSha": "a3f9c12",
  "timestamp": "2026-05-04T08:00:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "connectionPoolUtilization": 0.32,
      "latencyMs": 4
    },
    "redis": {
      "status": "ok",
      "memoryUsagePercent": 41,
      "latencyMs": 1
    },
    "email": {
      "status": "ok",
      "provider": "sendgrid"
    }
  },
  "featureFlags": {
    "FF_MARKETPLACE": false,
    "FF_ARENA_SUMO": true
  }
}
```

**Degraded response (HTTP 200 with partial failures):**

```json
{
  "status": "degraded",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "error", "error": "Connection refused" },
    "email": { "status": "ok" }
  }
}
```

**Unhealthy response (HTTP 503):**

Returned when the database is unreachable (the system cannot serve any requests without the database).

```json
{
  "status": "error",
  "checks": {
    "database": { "status": "error", "error": "ECONNREFUSED" },
    "redis": { "status": "ok" },
    "email": { "status": "ok" }
  }
}
```

### Key Metrics to Watch

| Metric | Alert Threshold | Source |
|--------|----------------|--------|
| API P99 latency (read) | > 200 ms | Observability dashboard |
| API P99 latency (write) | > 500 ms | Observability dashboard |
| Error rate (5-min window) | > 1% | `observability_error_rate_alert_window = 5 min` |
| DB connection pool utilization | > 80% | `infra_db_pool_alert_threshold = 80` |
| Redis memory usage | > 80% | `infra_redis_alert_threshold = 80` |
| Arena battle queue depth | > 100 concurrent entries | `arena_matchmaking_concurrent_entries = 100` |
| Leaderboard update lag | > 60 s | `observability_leaderboard_lag_alert = 60 s` |
| Pet claims rate | < 5 claims/hr for 2 h | `observability_pet_claims_drop_threshold = 5` |
| Arena battles rate | < 10 battles/hr for 2 h | `observability_arena_battles_drop_threshold = 10` |
| SendGrid failure rate | > 2% over 30 min | `observability_email_failure_alert_window = 30 min` |
| Any endpoint P99 | > 1,000 ms | `observability_latency_alert_threshold = 1000 ms` |

### Alert Thresholds Summary

Configure the following alerts in your observability platform (Datadog, Grafana, or Railway's built-in metrics):

```yaml
alerts:
  - name: high_error_rate
    condition: error_rate_5m > 0.01
    severity: P1

  - name: high_latency
    condition: p99_latency_ms > 1000
    severity: P1

  - name: db_pool_saturation
    condition: db_pool_utilization > 0.80
    severity: P1

  - name: redis_memory_high
    condition: redis_memory_percent > 80
    severity: P1

  - name: leaderboard_lag
    condition: leaderboard_update_lag_seconds > 60
    severity: P2

  - name: low_pet_claims
    condition: pet_claims_per_hour < 5 for 120m
    severity: P2

  - name: sendgrid_failure_rate
    condition: email_failure_rate_30m > 0.02
    severity: P2
```

---

## On-Call Quick Reference

A compact reference card for the first responder. Full API documentation is in `docs/API.md`.

### Critical Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/health` | Liveness and readiness check; first thing to hit during any incident |
| `GET` | `/api/v1/leaderboard` | Top 100 pets by arena score; verifies Redis + DB read path |
| `POST` | `/api/v1/arena/enter` | Player enters matchmaking queue; verifies arena write path and Redis queue |
| `GET` | `/api/v1/pets/:petId` | Public pet profile; verifies DB read and sprite seed generation |
| `PUT` | `/admin/api/config/runtime` | Toggle feature flags and arena rate limits without a redeploy |
| `GET` | `/admin/api/pets?flagged=true` | List SUSPICIOUS-flagged pets; used during bot detection incidents |

### Environment Variables Checklist

Confirm all of the following are present and non-empty before any deployment or debugging session:

```
DATABASE_URL          # Supabase PostgreSQL connection string (pooler preferred)
REDIS_URL             # Upstash Redis TLS URL
JWT_SECRET            # ≥ 32 bytes base64url; used for claim token signing
SENDGRID_API_KEY      # SendGrid API key for transactional email
ADMIN_TOTP_ISSUER     # Displayed in authenticator apps (e.g. "PixelPetArena Admin")
FF_MARKETPLACE        # "false" (default) or "true"
FF_ARENA_SUMO         # "true" (default) or "false"
NODE_ENV              # Must be "production" in production
LOG_LEVEL             # "info" or "warn" in production; "debug" for local troubleshooting
PORT                  # Default 3000; set by platform automatically
```

### Common Error Codes

All API errors use the standard envelope defined in `docs/API.md §4.1`. Key error codes encountered during incidents:

| Error Code | HTTP Status | Meaning | Likely Cause |
|-----------|-------------|---------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid Bearer token / admin session cookie | Expired session; token revoked; incorrect auth header format |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions | Correct user, wrong role; pet banned (`PET_BANNED`) |
| `ACCOUNT_LOCKED` | 403 | Admin account locked after 10 failed logins | Brute-force lockout; mistyped password; TOTP drift |
| `TOTP_SETUP_REQUIRED` | 403 | First admin login; TOTP not yet enrolled | New admin account that has not completed TOTP setup flow |
| `RATE_LIMITED` | 429 | Too many requests; `Retry-After` header present | Arena: > 10 battles/hr per pet; Admin: > 100 req/min |
| `PET_BANNED` | 403 | Pet account is banned | Moderation action; bot detection ban |
| `TRAINING_LIMIT_REACHED` | 400 | Pet has used all 3 training actions for today | Normal game limit (`training_actions_per_day = 3`); resets at UTC 00:00 |
| `STAT_AT_MAXIMUM` | 400 | Stat is already at 100 | Pet stat has reached the cap (`pet_stat_max = 100`) |
| `FF_DISABLED` | 403 | Feature is behind a disabled flag | `FF_MARKETPLACE = false` — marketplace not yet enabled |
| `NOT_FOUND` | 404 | Resource does not exist | Incorrect pet ID or battle ID in the request path |
| `CONFLICT` | 409 | Duplicate resource | Attempt to re-enter matchmaking while already queued |

### Contact List

| Role | Contact |
|------|---------|
| Primary on-call engineer | [ON-CALL-ENGINEER] |
| Platform lead (escalation) | [ON-CALL-ENGINEER] — escalate via PagerDuty P0 policy |
| Database owner (Supabase issues) | [ON-CALL-ENGINEER] — open Supabase support ticket if platform incident confirmed |
| Upstash Redis support | https://upstash.com/support |
| SendGrid support | https://support.sendgrid.com |
| Railway support | https://railway.app/help |
| Fly.io support | https://fly.io/docs/support/ |
