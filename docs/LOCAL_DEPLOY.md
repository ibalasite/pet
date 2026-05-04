# Local Development Setup — pixel-pet-arena

This guide walks a developer joining the project for the first time through every step required to run all three services locally: the Fastify API, the React/Phaser player frontend, and the Vue 3 admin portal.

---

## Prerequisites

Before you begin, make sure the following software is installed and available on your `PATH`.

### Required versions

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20.x | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions |
| pnpm | 9.x | Install with `npm install -g pnpm@latest` |
| Docker Desktop | 24.x or higher | Required to run the Supabase local stack; must be running before `supabase start` |
| Git | 2.x | Any modern version works |

Check your versions before continuing:

```bash
node --version   # should print v20.x.x or higher
pnpm --version   # should print 9.x.x or higher
docker --version # should print Docker version 24.x or higher
```

### Supabase CLI (required for local setup)

The Supabase CLI is required for Steps 2 and 3 (`supabase start`, `supabase db push`). Install it before proceeding:

```bash
# macOS — Homebrew
brew install supabase/tap/supabase

# Linux — Homebrew (recommended)
brew install supabase/tap/supabase
```

Verify installation:
```bash
supabase --version   # should print 2.x.x or higher
```

### Optional tools

- **Redis CLI** — useful for inspecting cache state. Install via Homebrew (`brew install redis`) on macOS; on Linux, install the `redis-tools` package. You do not need a locally installed Redis server — the Docker container is sufficient.

### Platform notes

- **macOS** is the primary development environment assumed throughout this guide. All commands are written for zsh/bash on macOS.
- **Linux** users: all commands work without modification. Ensure Docker Engine (not just Docker CLI) is running. You may need to prefix Docker commands with `sudo` depending on your group membership.
- **Windows (WSL2)**: run all commands inside a WSL2 terminal (Ubuntu 22.04 recommended). Docker Desktop for Windows with the WSL2 backend must be enabled. Paths and line endings should be handled automatically inside WSL2.

---

## Environment Setup

Each application in the monorepo has its own environment file. You must copy and populate all three before starting any service.

### Clone the repository

```bash
git clone https://github.com/<your-org>/pixel-pet-arena.git
cd pixel-pet-arena
```

### Copy environment files

```bash
cp apps/api/.env.example     apps/api/.env.local
cp apps/player/.env.example  apps/player/.env.local
cp apps/admin/.env.example   apps/admin/.env.local
```

### Key environment variables

Open each `.env.local` file and set the values listed below. Variables marked **required** will cause the service to fail on startup if missing or empty.

#### `apps/api/.env.local`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Leave blank for now — the value is printed by `supabase start` in Setup Steps step 2 (looks like `postgresql://postgres:postgres@localhost:54322/postgres`) |
| `REDIS_URL` | Yes | Redis connection string; use `redis://localhost:6379` for the local Docker container |
| `JWT_SECRET` | Yes | Used to sign the short-lived TOTP setup token returned during first-time admin account enrollment; not used for player authentication (players use raw bearer tokens) |
| `EMAIL_ENCRYPTION_KEY` | Yes | A 32-byte AES-256 key used to decrypt stored email addresses; generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SENDGRID_API_KEY` | No | Can be any non-empty dummy string locally; emails are captured by the Supabase Inbucket testing inbox and viewable at `http://localhost:54324` |
| `ADMIN_TOTP_ISSUER` | Yes | The issuer name shown in your authenticator app, e.g. `pixel-pet-arena-local` |

#### `apps/player/.env.local`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Set to `http://localhost:3000` |

#### `apps/admin/.env.local`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Set to `http://localhost:3000` |

### Generating a JWT_SECRET

Use Node.js to generate a cryptographically random secret. Run this command and paste the output into `apps/api/.env.local`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

The output will be a base64url-encoded string of 64 random bytes. Keep this value private and never commit it to source control.

### Feature flags

The following feature flags have recommended local defaults. Set them in `apps/api/.env.local` to override behaviour without changing application code:

```bash
FF_MARKETPLACE=false
FF_ARENA_SUMO=true
```

---

## Setup Steps

Follow these steps in order. Each step depends on the previous one completing successfully.

1. **Install all workspace dependencies.**

   Run this from the repository root. pnpm will link workspace packages via symlinks and resolve shared dependencies through its virtual store.

   ```bash
   pnpm install
   ```

2. **Start the Supabase local stack.**

   This starts a PostgreSQL database, the Supabase Studio web UI, a local email testing inbox, and several supporting services inside Docker containers. Docker Desktop must be running before executing this command.

   ```bash
   supabase start
   ```

   The command prints connection details when it finishes, including a `DB URL` value. Copy the `DB URL` (it will look like `postgresql://postgres:postgres@localhost:54322/postgres`) and set it as `DATABASE_URL` in `apps/api/.env.local`.

   Supabase Studio is accessible at `http://localhost:54323` once the stack is running.

3. **Run database migrations.**

   Apply all pending schema migrations to the local PostgreSQL database. The canonical command is:

   ```bash
   supabase db push
   ```

   If the repository defines a `pnpm db:migrate` script in the root `package.json`, use that instead of running `supabase db push` directly — do **not** run both, as this will double-apply migrations. The `db:migrate` script may use a different migration driver (such as `node-pg-migrate`) rather than the Supabase CLI directly. Check `package.json` to see which is available:

   ```bash
   grep -A2 '"db:' package.json
   ```

4. **Seed the database.**

   This command inserts initial data including a default admin account, starter pets, and arena configuration. The seed script prints the TOTP secret for the local admin account — **save this output now**. You will need it in the Verification section to log into the admin portal. If you lose it, run `pnpm db:seed --reset-admin` to regenerate a new TOTP secret (see *TOTP setup for the local admin account* in Troubleshooting).

   ```bash
   pnpm db:seed
   ```

5. **Start the local Redis container.**

   The API uses Redis for caching and the job queue. Pull and run the official `redis:7-alpine` image on the default port:

   ```bash
   docker run -d --name pixel-pet-redis -p 6379:6379 redis:7-alpine
   ```

   If you already have a Redis container from a previous session, start it again with:

   ```bash
   docker start pixel-pet-redis
   ```

   Confirm Redis is reachable:

   ```bash
   docker exec -it pixel-pet-redis redis-cli ping
   # Expected output: PONG
   ```

6. **Start the backend API.**

   The API runs on port 3000 with hot reload enabled via `ts-node-dev` or the equivalent configured in the `api` package.

   ```bash
   pnpm --filter api dev
   ```

   Wait until the console prints something like `Server listening at http://0.0.0.0:3000` before proceeding.

7. **Start the player frontend.**

   The React + Phaser frontend runs on Vite's dev server at port 5173 with hot module replacement enabled.

   ```bash
   pnpm --filter player-app dev
   ```

8. **Start the admin portal.**

   The Vue 3 admin portal runs on its own Vite dev server at port 5174.

   ```bash
   pnpm --filter admin-app dev
   ```

   Each of the three services in steps 6–8 should be run in separate terminal tabs or panes so you can observe their output simultaneously.

---

## Verification

Once all three services are running, use the following checks to confirm a healthy local environment.

### API health check

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"healthy","checks":{"database":"ok","redis":"ok"},"timestamp":"2026-05-03T12:00:00Z"}
```

Any non-200 response or a connection refusal indicates the API is not running or one or more upstream dependencies (database or Redis) are unhealthy.

### Player frontend

Open `http://localhost:5173` in your browser. You should see either a pet displayed on a pixel-art background, or a prompt asking you to generate your first pet. If the page is blank or shows a network error, check that the API is running and that `VITE_API_BASE_URL` is set correctly in `apps/player/.env.local`.

### Admin portal login page

Open `http://localhost:5174/admin/login` in your browser. A TOTP login form should appear with fields for username and one-time password. If the page does not load, check that the admin dev server started without errors on port 5174.

### Leaderboard endpoint

```bash
curl http://localhost:3000/api/v1/leaderboard
```

Expected response: a JSON array (empty `[]` is fine on a freshly seeded database). A 500 error here usually indicates a database connectivity problem.

### Test admin account

The `pnpm db:seed` command creates a default admin user. The seed script prints the username, initial password, and TOTP secret to the console. To log in to the admin portal:

1. Open `http://localhost:5174/admin/login`.
2. Enter the seeded credentials (username and password printed by `db:seed`).
3. Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and manually enter the TOTP secret printed by `db:seed`. The issuer name will match the `ADMIN_TOTP_ISSUER` value you set in the environment file.
4. Enter the six-digit TOTP code from your authenticator app to complete login.

---

## Common Issues and Troubleshooting

### Supabase will not start

**Symptom:** `supabase start` hangs or prints a Docker-related error.

- Verify Docker Desktop is running. The Docker icon should be visible in the macOS menu bar.
- Run `docker info` to confirm the Docker daemon is responsive.
- If a previous Supabase session left containers running in a broken state, stop and reset everything:

  ```bash
  supabase stop --no-backup
  supabase start
  ```

- Check for port conflicts. Supabase uses ports `54321` (API), `54322` (PostgreSQL), `54323` (Studio), and `54324` (email). Run `lsof -i :54322` to see if anything else is using that port and stop it before retrying.

### Port already in use (3000, 5173, 5174)

**Symptom:** A service fails to start with `EADDRINUSE` or a similar error.

Find and kill the conflicting process:

```bash
lsof -ti :3000 | xargs kill -9
lsof -ti :5173 | xargs kill -9
lsof -ti :5174 | xargs kill -9
```

On Linux, substitute `fuser -k 3000/tcp` if `lsof` is not installed.

### Redis connection refused or port 6379 already in use

**Symptom A — `docker run` fails with `port is already allocated`:**

Port 6379 is already bound by a native Redis installation (e.g. installed via Homebrew or `apt`). Stop it before starting the Docker container:

```bash
# macOS (Homebrew)
brew services stop redis

# Linux (systemd)
sudo systemctl stop redis
```

Then re-run `docker run -d --name pixel-pet-redis -p 6379:6379 redis:7-alpine`.

**Symptom B — The API logs `Error: connect ECONNREFUSED 127.0.0.1:6379`:**

- Check that the Redis Docker container is running:

  ```bash
  docker ps --filter name=pixel-pet-redis
  ```

- If the container is not listed, start it again (see Setup Steps, step 5).
- If the container is listed but the API still cannot connect, verify that `REDIS_URL=redis://localhost:6379` is set in `apps/api/.env.local`.

### TOTP setup for the local admin account

If you lose the seed output or need to reset the admin TOTP:

1. Reset the admin account's TOTP secret by running the seed command again:

   ```bash
   pnpm db:seed --reset-admin
   ```

2. The new TOTP secret will be printed to the console. Remove the old entry from your authenticator app and add the new secret.
3. Alternatively, query the `admin_users` table directly in Supabase Studio (`http://localhost:54323`) to retrieve the raw TOTP secret for manual entry.

### Database migration errors

**Symptom:** `supabase db push` fails with schema conflicts or missing tables.

The safest fix for a local database is a full reset. This wipes all local data and re-applies every migration from scratch:

```bash
supabase db reset
pnpm db:seed
```

Do not run `db reset` against any shared or staging environment — it is destructive.

### pnpm workspace dependency issues

**Symptom:** Imports from workspace packages fail, or you see `Cannot find module` errors after adding a new package.

- Re-run `pnpm install` from the repository root. This rebuilds the workspace symlinks.
- If a specific package was added to a sub-app, ensure the version specifier in that app's `package.json` uses the `workspace:*` protocol:

  ```json
  "dependencies": {
    "@pixel-pet-arena/shared": "workspace:*"
  }
  ```

- Clear the pnpm cache and reinstall if problems persist:

  ```bash
  pnpm store prune
  pnpm install --force
  ```

---

## Development Workflow Tips

### Hot reload

- **Player frontend** (`apps/player`): Vite HMR is enabled by default. Changes to `.tsx`, `.ts`, `.css`, and Phaser scene files are reflected in the browser within milliseconds without a full page reload.
- **Admin portal** (`apps/admin`): Vite HMR is also enabled. Vue single-file components update in place.
- **Backend API** (`apps/api`): The API process is managed by `ts-node-dev` (or an equivalent nodemon configuration). The process restarts automatically when any `.ts` source file changes. Allow one to two seconds for the TypeScript compiler to pick up changes.

### Running tests

Run the full test suite from the repository root:

```bash
pnpm test
```

Run end-to-end tests (requires all three services to be running):

```bash
pnpm test:e2e
```

Run tests for a specific workspace package:

```bash
pnpm --filter api test
pnpm --filter player-app test
pnpm --filter admin-app test
```

### Supabase Studio

The Supabase Studio web interface is available at `http://localhost:54323` while `supabase start` is running. Use it to:

- Browse and edit table data directly.
- Inspect the `admin_users` table for TOTP secrets.
- Monitor SQL query activity in the Logs section.
- Manage Row Level Security policies during development.

### Feature flag overrides

Feature flags are read from environment variables at API startup. Override them in `apps/api/.env.local` without touching any application code:

```bash
# Enable the marketplace feature locally
FF_MARKETPLACE=true

# Disable the arena sumo mode locally
FF_ARENA_SUMO=false
```

Restart the API process after changing flag values for them to take effect.

### Useful one-liners

```bash
# Tail API logs
pnpm --filter api dev 2>&1 | tee /tmp/api.log

# Check Supabase service status
supabase status

# Inspect Redis keys
docker exec -it pixel-pet-redis redis-cli KEYS "*"

# Reset everything and start fresh
supabase db reset && pnpm db:seed
```
