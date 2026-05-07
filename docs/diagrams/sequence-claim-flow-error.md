---
diagram: sequence-claim-flow-error
uml-type: Sequence Diagram（Claim Flow — Error Paths）
source: docs/API.md §5.1 + §4.1 Error envelope
generated: 2026-05-08T00:00:00Z
---

# Sequence Diagram — Claim Flow Error Paths

> 來源：docs/API.md §5.1 Claim Endpoints + §4 Error Code Reference

聚焦 Claim Flow 的 4 條獨立 Error Path：(1) Email schema 違規、(2) OTP wrong/expired、(3) 帳號鎖定、(4) Email service outage。

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant App as Player App (React)
    participant API as Game API Server
    participant DB as PostgreSQL
    participant Email as SendGrid

    Note over Player,Email: Error Path 1 — Email Schema Validation Failure

    Player->>App: enter "not-an-email"
    App->>App: client-side validation (regex)
    alt client-side fail
        App-->>Player: show inline "Invalid email format"
        Note right of App: 不送 API（節省 round-trip）
    else passes client-side
        App->>API: POST /api/v1/claim {email: "spaced @ wrong"}
        API->>API: ajv validate body schema
        API-->>App: 400 Bad Request {error: "VALIDATION_FAILED", details: [{path: "email", code: "format"}]}
        App-->>Player: highlight email field
    end

    Note over Player,Email: Error Path 2 — OTP Wrong or Expired

    Player->>App: enter OTP "999999"
    App->>API: POST /api/v1/claim/verify {claimId, otpCode: "999999", petId}
    API->>DB: SELECT * FROM claim_codes WHERE id = $1
    alt code not found
        DB-->>API: 0 rows
        API-->>App: 404 Not Found {error: "CLAIM_NOT_FOUND"}
        App-->>Player: "Invalid claim. Restart from email."
    else code expired (now > expires_at)
        DB-->>API: claim row, expires_at < now
        API-->>App: 410 Gone {error: "OTP_EXPIRED"}
        App-->>Player: "Code expired. Re-send a new OTP."
    else hash mismatch (wrong code)
        DB-->>API: claim row, code_hash != hash($otpCode)
        API->>DB: UPDATE claim_codes SET attempts = attempts + 1
        alt attempts < 5 (claim_otp_max_attempts = 5)
            API-->>App: 401 Unauthorized {error: "INVALID_OTP", attemptsRemaining: 5-N}
            App-->>Player: show counter "N attempts remaining"
        else attempts >= 5
            API-->>App: 429 Too Many Requests {error: "CLAIM_LOCKED", lockoutSeconds: 900}
            App-->>Player: "Locked for 15 minutes. Try later."
        end
    end

    Note over Player,Email: Error Path 3 — Identity Already Locked / Pet Already Owned

    Player->>App: enter same email twice rapidly
    App->>API: POST /api/v1/claim {email, petId}
    API->>DB: SELECT * FROM pets WHERE id = $1
    alt pet has owner_token_hash != NULL
        DB-->>API: pet row, owner_token_hash IS NOT NULL
        API-->>App: 409 Conflict {error: "PET_ALREADY_CLAIMED"}
        App-->>Player: "This pet is already owned. Try /recover instead."
    else pet has reserved_until in the future
        DB-->>API: pet row, reserved_until > now (not by this email)
        API-->>App: 423 Locked {error: "PET_RESERVED_BY_OTHER", retryAfter: ttl}
        App-->>Player: "Wait {ttl} seconds. Pet reserved by another claim attempt."
    end

    Note over Player,Email: Error Path 4 — Email Service Outage / Server Failure

    Player->>App: submit valid email
    App->>API: POST /api/v1/claim {email, petId}
    API->>DB: INSERT claim_codes (...)
    DB-->>API: rowsAffected: 1
    API->>Email: SendGrid POST /v3/mail/send {to, otpHtml}
    alt SendGrid 5xx (transient)
        Email-->>API: 503 Service Unavailable
        API->>API: retry × 2 (exponential 1s, 2s)
        alt all retries fail
            API->>DB: DELETE claim_codes WHERE id = $1 (cleanup)
            API-->>App: 503 Service Unavailable {error: "EMAIL_DELIVERY_FAILED", retryAfter: 60}
            App-->>Player: "Email service down. Try again in 1 minute."
        end
    else SendGrid 4xx (e.g., invalid recipient)
        Email-->>API: 400 Bad Request {error: "invalid_recipient"}
        API->>DB: DELETE claim_codes WHERE id = $1
        API-->>App: 400 Bad Request {error: "EMAIL_DELIVERY_FAILED", reason: "invalid_recipient"}
        App-->>Player: "Cannot deliver to this address. Check spelling."
    else network timeout (5s)
        API->>API: AbortController fires
        API->>DB: DELETE claim_codes WHERE id = $1
        API-->>App: 504 Gateway Timeout {error: "UPSTREAM_TIMEOUT", retryAfter: 30}
        App-->>Player: "Email service slow. Try again in 30s."
    end
```

## Error Path 對應 API.md §4.3 Error Codes

| Path | Error Code | HTTP Status | Recovery Action |
|------|-----------|-------------|----------------|
| 1. Email schema | `VALIDATION_FAILED` | 400 | client-side regex prevention |
| 2a. Code not found | `CLAIM_NOT_FOUND` | 404 | restart claim flow |
| 2b. Code expired | `OTP_EXPIRED` | 410 | re-send OTP |
| 2c. Wrong OTP < 5 attempts | `INVALID_OTP` | 401 | retry input |
| 2d. Wrong OTP ≥ 5 attempts | `CLAIM_LOCKED` | 429 | wait 15 min |
| 3a. Pet already claimed | `PET_ALREADY_CLAIMED` | 409 | use /recover |
| 3b. Pet reserved | `PET_RESERVED_BY_OTHER` | 423 | wait TTL |
| 4a. SendGrid 5xx | `EMAIL_DELIVERY_FAILED` | 503 | retry 1 min |
| 4b. SendGrid 4xx | `EMAIL_DELIVERY_FAILED` | 400 | check email |
| 4c. Network timeout | `UPSTREAM_TIMEOUT` | 504 | retry 30s |

## Notes

- Email service outage path（4）會回滾 DB 中的 claim_code（避免「OTP 已寄出但用戶從未收到」造成髒資料）
- 帳號鎖定路徑（2d）使用 exponential backoff（首次 15 min，第二次 30 min...）
- 所有 error response 統一用 API.md §4.1 error envelope `{error: {code, message, details, traceId}}`
