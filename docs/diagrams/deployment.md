---
diagram: deployment
uml-type: 部署圖（Deployment Diagram）
source: docs/EDD.md §4.5.9
generated: 2026-05-10T00:50:00Z
---

# Deployment Diagram

雲端部署拓撲：Vercel Edge（Player + Admin 靜態 SPA）→ Railway Compute us-east（LB + 2× api pod + 2× worker pod）→ Supabase（PG Primary + Standby）+ Upstash（Redis Primary + Replica）→ External（SendGrid、S3 backup）。

```mermaid
graph TB
    subgraph "Vercel Edge"
        CDN["Global CDN"]
        Static["Player + Admin Static SPA"]
    end

    subgraph "Railway Compute (us-east)"
        LB["LB / HPA 70% CPU"]
        API1["api-pod-1 :8080"]
        API2["api-pod-2 :8080"]
        W1["worker-pod-1"]
        W2["worker-pod-2"]
    end

    subgraph "Supabase"
        PGP["PG Primary"]
        PGS["PG Standby"]
    end

    subgraph "Upstash"
        RP["Redis Primary"]
        RR["Redis Replica"]
    end

    subgraph "External"
        SG["SendGrid API"]
        S3["S3 Backups"]
    end

    CDN --> LB
    LB --> API1
    LB --> API2
    API1 --> PGP
    API2 --> PGP
    API1 --> RP
    API2 --> RP
    PGP --> PGS
    RP --> RR
    PGP --> S3
    W1 --> PGP
    W2 --> PGP
    API1 --> SG
    W1 --> SG
```

> HPA 觸發於 70% CPU；PG Primary 採流式複寫到 Standby（Supabase 託管），故障自動切換 RTO ≤ 60s。
