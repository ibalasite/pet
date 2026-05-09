---
diagram: use-case
uml-type: 使用案例圖（Use Case Diagram）
source: docs/EDD.md §4.5.1
generated: 2026-05-10T00:50:00Z
---

# Use Case Diagram

本圖呈現 Pet Battle Arena 系統四類 actor（Guest / Owner / Admin / System Job）與 15 個主要使用案例之間的互動。Guest 可瀏覽寵物與排行榜並啟動領養流程；Owner 可訓練、餵食、進入競技場、查看戰績、申請 GDPR 抹除；Admin 負責 Ban / Config / Audit 三大管理面；System Job 自動處理過期清理、排行榜快照、GDPR 抹除。

```mermaid
graph LR
    Guest["Guest Player"]
    Owner["Pet Owner"]
    Admin["Admin"]
    Job["System Job"]

    UC1((View Random Pet))
    UC2((Claim Pet via Email OTP))
    UC3((Train Pet))
    UC4((Feed Pet))
    UC5((Enter Arena))
    UC6((View Battle Records))
    UC7((View Leaderboard))
    UC8((Request GDPR Erasure))
    UC9((Ban Pet))
    UC10((Tune Runtime Config))
    UC11((Configure Economy))
    UC12((View Audit Log))
    UC13((Cleanup Expired Claim Codes))
    UC14((Snapshot Leaderboard))
    UC15((Process GDPR Erasure Job))

    Guest --> UC1
    Guest --> UC7
    Guest --> UC2
    Owner --> UC3
    Owner --> UC4
    Owner --> UC5
    Owner --> UC6
    Owner --> UC8
    Admin --> UC9
    Admin --> UC10
    Admin --> UC11
    Admin --> UC12
    Job --> UC13
    Job --> UC14
    Job --> UC15
```

> Actor 數量 ≥ 4，符合 QG-UML-07。
