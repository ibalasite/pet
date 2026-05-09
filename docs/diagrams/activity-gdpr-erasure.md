---
diagram: activity-gdpr-erasure
uml-type: 活動圖 — GDPR Erasure
source: docs/EDD.md §4.5.7
generated: 2026-05-10T00:50:00Z
---

# Activity Diagram — GDPR Erasure

GDPR 抹除背景作業：API 收 request 後 INSERT pending → 5 分鐘 cron worker 取鎖 → 逐筆處理：清空 email_encrypted、移除 leaderboard 分數、清空 owner_token_hash → 寫入 audit_log 並寄送確認信。

```mermaid
flowchart TB
    Start([Owner submits erasure]) --> API[POST /api/v1/gdpr/request type=erasure]
    API --> Insert[INSERT gdpr_requests status=pending]
    Insert --> Queue([HTTP 202 jobId])
    Queue --> Cron[Cron worker every 5min]
    Cron --> Lock[Redis SETNX gdpr_lock]
    Lock --> Fetch[SELECT pending erasure ≤ 10]
    Fetch --> ForEach{For each request}
    ForEach --> NullEmail[UPDATE claim_identities SET email_encrypted=NULL]
    NullEmail --> Pets[SELECT pets WHERE claim_identity_id]
    Pets --> ForPet{For each pet}
    ForPet --> ZREM[ZREM leaderboard:global pet_id]
    ZREM --> NullToken[UPDATE pets SET owner_token_hash=NULL]
    NullToken --> NextPet{More pets?}
    NextPet -->|Yes| ForPet
    NextPet -->|No| Mark[UPDATE gdpr_requests status=completed]
    Mark --> Audit[INSERT audit_logs]
    Audit --> Notify[Send confirmation email]
    Notify --> End([Done within 7 days])
```

> Redis SETNX 提供分散式互斥鎖（避免多 worker 同時處理同一筆 request 造成重複 NULL 化）。
