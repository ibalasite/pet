---
diagram: sequence-gdpr-erasure
uml-type: 順序圖 — GDPR Erasure
source: docs/EDD.md §4.5.4
generated: 2026-05-10T00:50:00Z
---

# Sequence Diagram — GDPR Erasure

Owner 提交抹除申請後，API 寫入 `gdpr_requests` 為 pending；GDPR Worker 每 5 分鐘輪詢，將 `claim_identities.email_encrypted` 設為 NULL、移除排行榜分數、寫回 `pets.owner_token_hash=NULL`，最後將 request 標記為 completed。

```mermaid
sequenceDiagram
    participant P as Player
    participant API as API Server
    participant DB as PostgreSQL
    participant R as Redis
    participant W as GDPR Worker

    P->>API: POST /api/v1/gdpr/request {type=erasure} (Bearer pet token)
    API->>DB: INSERT gdpr_requests(claim_identity_id, type=erasure, status=pending)
    API-->>P: HTTP 202 {jobId}

    loop every 5 min cron
        W->>DB: SELECT gdpr_requests WHERE status=pending AND type=erasure LIMIT 10
        W->>DB: BEGIN
        W->>DB: UPDATE claim_identities SET email_encrypted=NULL, deletion_requested_at=NOW() WHERE id=$1
        W->>DB: SELECT pets WHERE claim_identity_id=$1
        loop for each pet
            W->>R: ZREM leaderboard:global pet_id
            W->>DB: UPDATE pets SET owner_token_hash=NULL, claimed_at=NULL
        end
        W->>DB: UPDATE gdpr_requests SET status=completed, completed_at=NOW()
        W->>DB: COMMIT
    end

    P->>API: GET /api/v1/gdpr/request/status?jobId=...
    API-->>P: HTTP 200 {status: completed, completedAt}
```

> SLA：7 天內完成（GDPR Art. 17）；email_encrypted 改為 NULL 即視為「不可逆抹除」，hash 仍保留以避免同 email 再次領養衝突。
