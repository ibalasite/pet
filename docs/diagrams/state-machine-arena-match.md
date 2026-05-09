---
diagram: state-machine-arena-match
uml-type: 狀態機圖 — Arena Match
source: docs/EDD.md §4.5.6
generated: 2026-05-10T00:50:00Z
---

# State Machine Diagram — Arena Match

ArenaMatch entity 從 CREATED → FINDING_OPPONENT（最多 30 秒）→ READY → IN_PROGRESS → RESOLVED → ARCHIVED；超時無 AI fallback 則進入 CANCELLED；ARCHIVED 後可由 Admin 設為 FLAGGED 並還原。

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> FINDING_OPPONENT : enqueue
    FINDING_OPPONENT --> READY : opponent found
    FINDING_OPPONENT --> READY : 30s timeout AI fallback
    FINDING_OPPONENT --> CANCELLED : timeout no AI
    READY --> IN_PROGRESS : start_match
    IN_PROGRESS --> RESOLVED : duration complete
    RESOLVED --> ARCHIVED : completed_at set
    ARCHIVED --> FLAGGED : admin flag
    FLAGGED --> ARCHIVED : admin unflag
    ARCHIVED --> [*]
    CANCELLED --> [*]
```

> FLAGGED 狀態用於 Admin 將疑似不公或外掛比賽標註，但不刪除原始 record，以保留 audit trail。
