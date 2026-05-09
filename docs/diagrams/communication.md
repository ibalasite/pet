---
diagram: communication
uml-type: 通訊圖（Communication Diagram）
source: docs/EDD.md §4.5.5
generated: 2026-05-10T00:50:00Z
---

# Communication Diagram — Claim Pet Flow

以 Communication Diagram 形式呈現 Claim Pet UseCase 的物件協作與訊息順序（編號 1–7、5.1–5.3）。Player 透過 ClaimController 觸發 ClaimPetUseCase；UseCase 委派 ClaimCodeService 建立 OTP 並寫入 PostgresClaimCodeRepo，再以 EmailDeliveryPort（SendGridAdapter 實作）寄送驗證信。

```mermaid
flowchart LR
    P["Player"]
    CC["ClaimController"]
    CUC["ClaimPetUseCase"]
    CCS["ClaimCodeService"]
    EDP["EmailDeliveryPort"]
    PR["PostgresClaimCodeRepo"]
    SG["SendGridAdapter"]

    P -->|"1: POST /claim"| CC
    CC -->|"2: execute(input)"| CUC
    CUC -->|"3: issue(email, petId)"| CCS
    CCS -->|"4: insertCode"| PR
    CUC -->|"5: send(email, otp)"| EDP
    EDP -->|"5.1: deliver"| SG
    SG -->|"5.2: 202 OK"| EDP
    EDP -->|"5.3: success"| CUC
    CUC -->|"6: result"| CC
    CC -->|"7: HTTP 200"| P
```

> 訊息順序以「主步驟.子步驟」標註，與 Sequence Diagram 對應但更強調物件協作關係。
