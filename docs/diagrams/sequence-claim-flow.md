# Sequence Diagram — Pet Claim Email OTP Flow

## Overview

The claim flow is the identity foundation of pixel-pet-arena. Because there are no traditional user
accounts, a 6-digit email OTP (`claim_code_digits = 6`) is the only mechanism by which a player
takes ownership of a pet. On successful verification the server issues a 32-byte URL-safe Base64
token (`pet_access_token_min_bytes = 32`) that becomes the player's permanent credential — stored
only as a SHA-256 hash in `pets.owner_token_hash`. The raw token is transmitted exactly once and
must be bookmarked by the player.

This diagram covers:
1. Guest arrives and gets a random pet displayed (GET /api/v1/pets/random).
2. Player initiates the claim (POST /api/v1/claim).
3. Player enters the OTP (POST /api/v1/claim/verify).
4. Token recovery via POST /api/v1/claim/recover follows the same verify path.

## Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant PlayerApp as Player App<br/>(React + Phaser.js)
    participant API as Game API Server<br/>(Fastify)
    participant Redis
    participant PG as PostgreSQL
    participant Email as Email Service<br/>(SendGrid / Nodemailer)

    Note over Player,Email: Phase 1 — Guest Preview

    Player->>PlayerApp: Visit landing page
    PlayerApp->>API: GET /api/v1/pets/random
    API->>PG: INSERT INTO pets (seed, rarity, generation_meta,<br/>reserved_until = NOW()+24h (pet_reservation_ttl_hours = 24))
    PG-->>API: petId, seed, rarity, stats
    API-->>PlayerApp: { petId, seed, rarity, petName, stats, reservedUntil }
    PlayerApp->>Player: Render Phaser.js 32×32 px sprite<br/>Show RarityBadge + ClaimCTA

    Note over Player,Email: Phase 2 — Claim Initiation (POST /api/v1/claim)

    Player->>PlayerApp: Enter email, check age confirmation
    PlayerApp->>API: POST /api/v1/claim<br/>{ email, petId, ageConfirmed: true }
    API->>Redis: INCR rl:claim:{email_hash} TTL=3600s<br/>(limit: 5 attempts/hr — auth_rate_limit_claim_attempts_per_hour = 5)
    alt Rate limit exceeded
        Redis-->>API: count > 5
        API->>Redis: SET rl:claim:cooldown:{email_hash} TTL=60s<br/>(claim_email_retry_cooldown_seconds = 60)
        API-->>PlayerApp: HTTP 429 Retry-After: 60
        PlayerApp-->>Player: "Too many attempts. Try again in 60 s."
    else Within limit
        Redis-->>API: count ≤ 5
        API->>PG: SELECT owner_token_hash FROM pets WHERE id = petId
        alt Pet already claimed
            PG-->>API: owner_token_hash IS NOT NULL
            API-->>PlayerApp: HTTP 400 { code: "ALREADY_CLAIMED" }
        else Pet unclaimed
            PG-->>API: owner_token_hash IS NULL
            API->>API: code = crypto.randomInt(100000, 1000000)<br/>code_hash = SHA-256(code)<br/>expires_at = NOW() + 15 min (claim_code_expiry_minutes = 15)
            API->>PG: INSERT INTO claim_identities (email_hash, email_encrypted)<br/>ON CONFLICT (email_hash) DO NOTHING<br/>RETURNING id (or SELECT id WHERE email_hash = ?)
            PG-->>API: identityId
            API->>PG: INSERT INTO claim_codes<br/>(pet_id, email_hash, code_hash, expires_at)
            PG-->>API: claimId
            API->>Email: sendClaimCode(to: email, code, petName)
            Email-->>API: delivered (or failover to Nodemailer after 3 failures<br/>sendgrid_failover_consecutive_failures = 3)
            API-->>PlayerApp: HTTP 200 { claimId, expiresAt }
            PlayerApp-->>Player: Show 6-digit code entry form<br/>Display 15-min countdown timer
        end
    end

    Note over Player,Email: Phase 3 — OTP Verification (POST /api/v1/claim/verify)

    Player->>PlayerApp: Enter 6-digit OTP code
    PlayerApp->>API: POST /api/v1/claim/verify<br/>{ claimId, code }
    API->>Redis: INCR rl:code_entry:{session_id} TTL=900s<br/>(limit: 10 — auth_rate_limit_code_entry_attempts_per_session = 10)
    alt Code entry limit exceeded (fail-closed)
        Redis-->>API: count > 10 OR Redis unavailable
        API->>Redis: SET rl:code_entry:cooldown:{session_id} TTL=60s
        API-->>PlayerApp: HTTP 429 { code: "MAX_ATTEMPTS_REACHED" }
    else Within limit
        API->>PG: SELECT * FROM claim_codes<br/>WHERE id = claimId AND expires_at > NOW()
        alt Code not found or expired
            PG-->>API: no row
            API-->>PlayerApp: HTTP 400 { code: "CODE_EXPIRED" }
        else Code found
            PG-->>API: code_hash, email_hash, pet_id
            API->>API: Verify SHA-256(code) == stored code_hash
            alt Code invalid
                API->>PG: UPDATE claim_codes SET attempts = attempts + 1
                API-->>PlayerApp: HTTP 400 { code: "INVALID_CODE" }
            else Code valid
                API->>API: petToken = crypto.randomBytes(32) base64url<br/>tokenHash = SHA-256(petToken)
                API->>PG: BEGIN TRANSACTION<br/>UPDATE pets SET owner_token_hash = tokenHash,<br/>  claimed_at = NOW(), reserved_until = NULL,<br/>  claim_identity_id = identityId<br/>UPDATE claim_codes SET used_at = NOW()<br/>COMMIT
                PG-->>API: updated
                API->>Redis: DEL rl:code_entry:{session_id}
                API-->>PlayerApp: HTTP 200<br/>{ petToken, petId, petUrl }
                PlayerApp-->>Player: URLReveal component<br/>"Bookmark this URL — it is your only access key"
            end
        end
    end

    Note over Player,Email: Background — Cleanup Jobs

    Note right of PG: Claim codes purged 72h after creation or<br/>first use (claim_token_cleanup_ttl_hours = 72)
    Note right of PG: Unclaimed pets deleted every 6h where<br/>reserved_until < NOW() AND owner_token_hash IS NULL<br/>(pet_reservation_ttl_hours = 24)
```

## Notes

- **Fail-closed on Redis unavailability**: OTP code entry (`rl:code_entry:{session_id}`) is
  fail-closed — if Redis is unreachable, the verify endpoint returns HTTP 429 rather than allowing
  brute-force bypass (ARCH P5).
- **Anti-enumeration**: `POST /api/v1/claim/recover` always returns HTTP 200 with a `claimId`
  regardless of whether the email/petId match, preventing email enumeration. The `claimId` is
  functional only when the combination matches a claimed pet.
- **Token transmission**: `petToken` is transmitted exactly once in the HTTP 200 response body.
  The server stores only `SHA-256(petToken)` in `pets.owner_token_hash`. A lost token requires
  the recovery flow.
- **Email OTP expiry warning**: The UI displays an accessibility warning at 2 minutes remaining
  (`a11y_claim_code_warning_before_expiry_minutes = 2`) using an `aria-live` region.
- **GDPR**: Raw email is never written to the database. Only `email_hash` (SHA-256 of lowercased
  email) and `email_encrypted` (AES-256-GCM) are persisted in `claim_identities`.
