// features/support/hooks.ts
import { Before, BeforeAll, After, AfterAll } from '@cucumber/cucumber';
import type { AppWorld } from './world';

// Shared infrastructure handles — initialised once, closed once
let _sharedDb: AppWorld['db'] | null = null;
let _sharedRedis: AppWorld['redis'] | null = null;

// ---------------------------------------------------------------------------
// BeforeAll — flush Redis test DB so every suite starts from a clean slate
// ---------------------------------------------------------------------------
BeforeAll(async function () {
  // The test runner must set TEST_REDIS_URL and TEST_DATABASE_URL in env.
  // Real client initialisation (pg-pool, ioredis) lives in an injector module.
  // Here we only call flushdb if a shared client was already wired up; otherwise
  // individual Before hooks handle per-scenario isolation via db.clean().
  if (_sharedRedis !== null) {
    await _sharedRedis.flushdb();
  }
});

// ---------------------------------------------------------------------------
// Before — reset DB + Redis + World state before each scenario
// ---------------------------------------------------------------------------
Before(async function (this: AppWorld) {
  // 1. Roll back DB rows from the previous scenario
  if (this.db) {
    try {
      await this.db.clean();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[Before hook] db.clean() failed — aborting scenario to prevent dirty state: ${msg}`);
    }
  }

  // 2. Flush Redis keys written by the previous scenario
  if (this.redis) {
    try {
      await this.redis.flushdb();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[Before hook] redis.flushdb() failed — aborting scenario to prevent dirty state: ${msg}`);
    }
  }

  // 3. Reset all World-level identity / response state
  this.lastResponse = { status: 0, body: null, headers: {} };
  this.authToken = null;
  this.adminSessionCookie = null;
  this.petId = null;
  this.claimId = null;
  this.claimCode = null;
  this.matchId = null;
  this.jobId = null;
  this.listingId = null;
});

// ---------------------------------------------------------------------------
// After — idempotent cleanup after each scenario
// ---------------------------------------------------------------------------
After(async function (this: AppWorld) {
  if (this.db) {
    try {
      await this.db.clean();
    } catch (err: unknown) {
      // Log but do not rethrow — scenario result is already recorded
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[After hook] db.clean() failed: ${msg}`);
    }
  }
});

// ---------------------------------------------------------------------------
// AfterAll — release shared connections to prevent resource leaks
// ---------------------------------------------------------------------------
AfterAll(async function () {
  const errors: string[] = [];

  if (_sharedRedis !== null) {
    try {
      await _sharedRedis.flushdb();
    } catch (err: unknown) {
      errors.push(`Redis final flush: ${err instanceof Error ? err.message : String(err)}`);
    }
    _sharedRedis = null;
  }

  if (_sharedDb !== null) {
    // DbClient implementors should expose a close/destroy method;
    // cast here keeps the interface minimal for step authors.
    const closeable = _sharedDb as unknown as { close?: () => Promise<void> };
    if (typeof closeable.close === 'function') {
      try {
        await closeable.close();
      } catch (err: unknown) {
        errors.push(`DB pool close: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    _sharedDb = null;
  }

  if (errors.length > 0) {
    console.warn('[AfterAll hook] teardown warnings:\n' + errors.join('\n'));
  }
});
