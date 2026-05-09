---
diagram: activity-claim-flow
uml-type: 活動圖 — Claim Flow
source: docs/EDD.md §4.5.7
generated: 2026-05-10T00:50:00Z
---

# Activity Diagram — Claim Flow

完整領養活動：使用者瀏覽寵物 → 決定領養 → 表單驗證 → rate limit 檢查 → OTP 寄送 → OTP 驗證（含重試上限）→ DB transaction → 顯示 Pet URL。

```mermaid
flowchart TB
    Start([User on landing page]) --> View[View random pet]
    View --> Decide{Wants to keep?}
    Decide -->|No| Exit([Leave])
    Decide -->|Yes| Form[Enter email + age13 checkbox]
    Form --> Validate{Form valid?}
    Validate -->|No| Form
    Validate -->|Yes| RateCheck{Rate limit OK?}
    RateCheck -->|No| Err429[Show 429 cooldown]
    RateCheck -->|Yes| GenOTP[Generate OTP, INSERT claim_codes]
    GenOTP --> SendEmail[Send email via SendGrid]
    SendEmail --> Wait[User waits, enters OTP]
    Wait --> Verify{OTP valid?}
    Verify -->|No| RetryCount{Attempts &lt; 10?}
    RetryCount -->|Yes| Wait
    RetryCount -->|No| Err429
    Verify -->|Yes| TX[BEGIN: UPSERT identity + UPDATE pet token + mark code used]
    TX --> Commit[COMMIT]
    Commit --> Reveal[Show pet URL]
    Reveal --> End([User bookmarks URL])
```

> Retry 上限為 10 次，超過視為 abuse 並觸發 Rate Limit；DB 寫入採用單一 transaction 確保 identity / pet / claim_code 三表一致性。
