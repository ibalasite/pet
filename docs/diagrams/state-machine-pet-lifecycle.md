---
diagram: state-machine-pet-lifecycle
uml-type: 狀態機圖 — Pet Lifecycle
source: docs/EDD.md §4.5.6
generated: 2026-05-10T00:50:00Z
---

# State Machine Diagram — Pet Lifecycle

寵物從生成到刪除的完整生命週期：GENERATED → UNCLAIMED → CLAIMED（IDLE / TRAINING / BATTLING / RESTING 四個子狀態） → DELETED。CLAIMED 與 BANNED 之間可由 Admin 雙向切換；任意時點均可由 GDPR Erasure 直接進入 DELETED。

```mermaid
stateDiagram-v2
    [*] --> GENERATED
    GENERATED --> UNCLAIMED : reservedUntil set
    UNCLAIMED --> CLAIMED : claim_code_verified
    UNCLAIMED --> DELETED : reservation expired (24h)
    CLAIMED --> IDLE : default
    IDLE --> TRAINING : train action
    IDLE --> BATTLING : enter arena
    IDLE --> RESTING : 3+ days no training
    TRAINING --> IDLE : action complete
    BATTLING --> IDLE : match complete
    RESTING --> IDLE : daily reset
    CLAIMED --> BANNED : admin ban
    BANNED --> CLAIMED : admin unban
    CLAIMED --> DELETED : gdpr erasure
    DELETED --> [*]
```

> 狀態轉換 label 不含 `<br/>`，符合 QG-UML-04（避免 Safari/Firefox 破圖）。
