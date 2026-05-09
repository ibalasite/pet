---
diagram: sequence-claim-flow
uml-type: 順序圖 — Claim Flow（OTP 領養）
source: docs/EDD.md §4.5.4
generated: 2026-05-10T00:50:00Z
---

# Sequence Diagram — Claim Flow

完整領養流程：Player 提交 email + 寵物 ID → API 進行 rate limit 檢查 → 產生 6-digit OTP 並發送至 SendGrid → Player 收信回填 OTP → API 驗證雜湊與過期時間 → 完成 token 寫入並回傳 petToken / petUrl。

```mermaid
sequenceDiagram
    participant P as Player Browser
    participant API as API Server (Fastify)
    participant DB as PostgreSQL
    participant R as Redis
    participant SG as SendGrid

    P->>API: POST /api/v1/claim {email, petId, ageConfirmed}
    API->>R: INCR rl:claim:{email_hash} (TTL 3600)
    alt rate limit > 5
        R-->>API: counter > 5
        API-->>P: HTTP 429 Retry-After
    else within limit
        API->>API: generate 6-digit OTP
        API->>DB: INSERT claim_codes(pet_id, email_hash, code_hash, expires_at)
        API->>SG: send email with OTP
        SG-->>API: 202 Accepted
        API-->>P: HTTP 200 {claimId, expiresAt}
    end

    Note over P,SG: User receives email, enters code in browser

    P->>API: POST /api/v1/claim/verify {claimId, code}
    API->>R: INCR rl:code_entry:{session_id}
    API->>DB: SELECT claim_codes WHERE id=$1 AND expires_at > NOW() AND used_at IS NULL
    API->>API: SHA-256(code) compare with code_hash
    alt valid
        API->>DB: BEGIN; UPSERT claim_identities; UPDATE pets SET owner_token_hash=$1, claimed_at=NOW(); UPDATE claim_codes SET used_at=NOW(); COMMIT
        API->>R: SET token:blacklist (no-op for first claim)
        API-->>P: HTTP 200 {petToken, petUrl}
    else invalid / expired
        API-->>P: HTTP 400 {INVALID_CODE | CODE_EXPIRED}
    end
```

> 安全要點：OTP 僅以 SHA-256 hash 落 DB；rate limit 同時針對發碼與輸入錯誤兩個層級。
