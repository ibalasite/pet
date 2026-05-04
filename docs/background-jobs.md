# Background Jobs Specification

<!-- Recurring and async job definitions for pixel-pet-arena backend -->
<!-- Upstream: EDD.md (§4), SCHEMA.md (§2) -->
<!-- Date: 2026-05-04 -->

---

## Overview

This document specifies all background jobs and async cleanup processes that run on the pixel-pet-arena backend. These jobs maintain data consistency, enforce retention windows, and clean up expired records.

---

## 1. Claim Code Cleanup

**Schedule:** Every 6 hours  
**EDD Reference:** §4.3 (Email Claim Flow)  
**SCHEMA Reference:** §2.3 (`claim_codes` table), indexes `idx_claim_codes_created_at`, `idx_claim_codes_used_at`  
**Related Constant:** `CLAIM_TOKEN_CLEANUP_TTL_HOURS = 72`

**Description:**  
Deletes claim code records that are older than 72 hours, calculated as the maximum of:
- Creation time (`created_at`) + 72 hours, or
- First use time (`used_at`) + 72 hours

After deletion, the associated `claim_identities` row may remain (if no other claims link to it), but the specific code is removed.

**Query Target:**
```sql
DELETE FROM claim_codes
WHERE (created_at + INTERVAL '72 hours' < NOW())
   OR (used_at IS NOT NULL AND used_at + INTERVAL '72 hours' < NOW());
```

**Impact:** Prevents unbounded growth of historical claim records; maintains GDPR right to be forgotten.

---

## 2. Unclaimed Pet Cleanup

**Schedule:** Every 6 hours  
**EDD Reference:** §4.2 (Pet Data Model)  
**SCHEMA Reference:** §2.2 (`pets` table), index `idx_pets_reserved_until`  
**Related Constant:** `PET_RESERVATION_TTL_HOURS = 24`

**Description:**  
Deletes pets that have been in guest preview mode (unclaimed) for longer than 24 hours. A pet is considered unclaimed if:
- `owner_token_hash IS NULL` (never claimed), and
- `reserved_until < NOW()` (reservation window expired)

**Query Target:**
```sql
DELETE FROM pets
WHERE owner_token_hash IS NULL
  AND reserved_until IS NOT NULL
  AND reserved_until < NOW();
```

**Impact:** Frees database storage; prevents accumulation of abandoned guest pets; ensures claimed pets (with `reserved_until = NULL`) are never deleted.

---

## 3. Leaderboard Snapshot Sync

**Schedule:** Every 30 seconds  
**EDD Reference:** §4.9 (Leaderboard System)  
**SCHEMA Reference:** §2.5 (`leaderboard_snapshots` table)  
**Related Constant:** `LEADERBOARD_UPDATE_LAG_MAX_SECONDS = 30`

**Description:**  
Syncs the in-memory Redis leaderboard (`leaderboard:global` sorted set) to PostgreSQL for durability and fallback. This job:
1. Reads all entries from Redis `leaderboard:global` via `ZRANGE ... WITHSCORES`
2. Upserts top 1,000 entries into `leaderboard_snapshots` table
3. Deletes rows representing banned pets (status = 'BANNED' in pets table)
4. Updates `snapshot_updated_at` timestamp

On Redis unavailability, the API falls back to querying the PostgreSQL snapshot and returns `"degraded": true`.

**Impact:** Ensures leaderboard persistence; enables fallback during Redis outages.

---

## 4. Food Buff Record Cleanup

**Schedule:** Every 12 hours  
**EDD Reference:** §4.7 (Food System)  
**SCHEMA Reference:** §2.6 (`food_buffs` table), index `idx_food_buffs_record_expires`  
**Related Constant:** `FOOD_BUFF_EXAMPLE_TEMP_DURATION_HOURS = 24`

**Description:**  
Deletes historical food buff records that have expired. Buffs are marked with `record_expires_at` at application time; this job removes rows where:
- `record_expires_at < NOW()`

Active buffs (not yet expired) are NOT deleted; `record_expires_at` is nullable for permanent buffs.

**Query Target:**
```sql
DELETE FROM food_buffs
WHERE record_expires_at IS NOT NULL
  AND record_expires_at < NOW();
```

**Impact:** Prevents unbounded growth of historical buff records; does not affect active buff application (checked at read time, not deletion time).

---

## 5. GDPR Email Hashing (Async)

**Trigger:** User initiates via POST /api/v1/gdpr/request  
**Schedule:** Background processing, internal SLA 24 hours  
**EDD Reference:** §4.4 (GDPR & Privacy)  
**SCHEMA Reference:** §2.1 (`claim_identities` table), index `idx_claim_identities_deletion`  
**Related Constants:** `GDPR_EMAIL_HASHING_INTERNAL_SLA_HOURS = 24`, `GDPR_EMAIL_DELETION_WINDOW_DAYS = 7`

**Description:**  
On GDPR erasure request, an async job is enqueued. The job:
1. Finds the `claim_identities` row where `deletion_requested_at IS NOT NULL`
2. Verifies `email_encrypted IS NOT NULL` (not already hashed)
3. Sets `email_encrypted = NULL`, leaving only the SHA-256 hash (`email_hash`)
4. Updates `updated_at` timestamp
5. Optionally removes the associated pet(s) from Redis leaderboard via `ZREM leaderboard:global <pet_id>` for each claimed pet

**SLA:** Complete within 24 hours (internal commitment). User notified within 7 days (external GDPR window).

**Impact:** Ensures compliance with GDPR Article 17 (right to erasure); SHA-256 hash retained for anti-re-registration verification.

---

## 6. Pet Reservation Expiry (Part of Cleanup)

**Schedule:** Every 6 hours (combined with claim code cleanup)  
**EDD Reference:** §4.2 (Pet Data Model)  
**SCHEMA Reference:** §2.2 (`pets` table)  
**Related Constant:** `PET_RESERVATION_TTL_HOURS = 24`

**Description:**  
When a guest claims a pet, `reserved_until` is set to NULL. This prevents the pet from being cleaned up by the unclaimed pet cleanup job. If a pet remains unclaimed after 24 hours, the cleanup job (see §2 above) removes it entirely.

No separate job needed; handled as part of Unclaimed Pet Cleanup.

---

## 7. Suspicious Pet Detection

**Schedule:** Every 5 minutes  
**EDD Reference:** §4.11 (Admin Moderation System)  
**SCHEMA Reference:** §2.4 (`battles` table), §2.11 (`admin_audit_log`)  
**Related Constants:** `BOT_DETECTION_BATTLES_THRESHOLD = 50`, `BOT_DETECTION_WINDOW_MINUTES = 60`

**Description:**  
Scans for pets that have completed more than 50 battles in the last 60 minutes. Flags them as SUSPICIOUS for manual review:
1. Query: Find pets where `SELECT COUNT(*) FROM battles WHERE pet_id = X AND created_at > NOW() - INTERVAL '60 minutes' > 50`
2. For each qualifying pet, update pets.status = 'SUSPICIOUS'
3. Create a moderation alert in the admin review queue

Moderators then manually review and ban if warranted.

**Impact:** Early detection of bot/spam behavior; flag for manual review, not automatic ban.

---

## 8. Marketplace Listing Expiry

**Schedule:** Every 30 minutes  
**EDD Reference:** §4.12 (Marketplace)  
**SCHEMA Reference:** §2.8 (`marketplace_listings` table), index `idx_marketplace_listings_expires_at`  
**Related Constant:** None (configurable per listing via `expires_at`)

**Description:**  
Transitions marketplace listings to 'cancelled' status if their `expires_at` timestamp has passed:
1. Query: `SELECT * FROM marketplace_listings WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW()`
2. Update `status = 'cancelled'`, set `completed_at = NOW()`
3. Return the pet to the seller's inventory (no explicit API call needed; listing presence determines availability)

**Impact:** Enforces listing duration limits; auto-expires unsold listings.

---

## Job Execution Strategy

**Orchestration:** Node.js task queue (Bull/Bee-Queue) or simple cron jobs with PostgreSQL LISTEN/NOTIFY for robustness.

**Monitoring:**
- Track job completion time and error rate
- Alert if any job fails more than 3 times consecutively
- Log job start/end with duration

**Concurrency:**
- All cleanup jobs are idempotent (DELETE WHERE ... is safe to retry)
- GDPR erasure job is idempotent (SET email_encrypted = NULL is safe if already NULL)
- Leaderboard sync is idempotent (UPSERT logic)

---

## Testing

All background jobs should have:
1. Unit test verifying the query logic
2. Integration test with test PostgreSQL + test Redis (where applicable)
3. Concurrency test to ensure idempotency under parallel execution

Example (Vitest):
```typescript
test('Unclaimed pet cleanup deletes only expired, unclaimed pets', async () => {
  // Create claimed pet (should NOT delete)
  // Create unclaimed pet with reserved_until < NOW() (should delete)
  // Create unclaimed pet with reserved_until > NOW() (should NOT delete)
  // Run cleanup job
  // Assert: only expired, unclaimed pet is deleted
})
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-04  
**Maintainer:** Platform Engineering Team
