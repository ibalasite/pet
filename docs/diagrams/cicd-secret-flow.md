---
diagram: cicd-secret-flow
uml-type: Component Diagram（CI/CD Secret Flow）
source: docs/CICD.md §6 Secrets Management + docs/LOCAL_DEPLOY.md §5 Secret Bootstrap
generated: 2026-05-08T00:00:00Z
---

# CI/CD Secret Flow Diagram — pixel-pet-arena

> 來源：docs/CICD.md §6 Secrets Management + §3.2 detect-secrets + docs/LOCAL_DEPLOY.md §5

描述 CI/CD pipeline 中 Secret 的來源、儲存與使用流向，覆蓋 `detect-secrets` 預防、GitHub Actions Secrets 注入、k8s Secret 與運行時環境變數注入的完整路徑。

```mermaid
flowchart LR
    subgraph Sources["Secret 來源"]
        direction TB
        OSKeychain["OS Keychain<br/>(macOS Keychain /<br/>Windows Credential Manager)<br/>scope: developer-local"]
        EnvFile[".env.local<br/>(gitignored, ephemeral)<br/>scope: developer-local"]
        OnePassword["1Password Vault<br/>(team-shared)<br/>scope: shared dev secrets"]
        ProdVault["AWS Secrets Manager<br/>(production runtime secrets)<br/>scope: ops only"]
    end

    subgraph PreCommit["Pre-Commit Defense"]
        direction TB
        DetectBaseline[".secrets.baseline<br/>(committed, allow-list)"]
        DetectScan["detect-secrets v1.5.0<br/>scan --baseline .secrets.baseline"]
        Lefthook["Lefthook pre-commit hook<br/>(.lefthook.yml)"]
        Lefthook --> DetectScan
        DetectScan --> DetectBaseline
    end

    subgraph GitHubSecrets["GitHub Repository Secrets<br/>(scope: Actions runners only)"]
        direction TB
        GH_GHCR["GHCR_PAT<br/>(read+write packages scope)"]
        GH_KubeConfig["KUBECONFIG_STAGING<br/>(base64 staging cluster admin)"]
        GH_KubeConfigProd["KUBECONFIG_PROD<br/>(base64 prod cluster admin)"]
        GH_Slack["SLACK_WEBHOOK_URL<br/>(#deploys / #ci-alerts)"]
        GH_SendGrid["SENDGRID_API_KEY<br/>(deploy-time only)"]
    end

    subgraph CI["GitHub Actions Runners"]
        direction TB
        CIWorkflow["ci.yml / deploy-staging.yml /<br/>deploy-production.yml"]
        DockerBuild["docker build + push to ghcr.io<br/>(uses GHCR_PAT)"]
        KubeApply["kubectl apply -k k8s/staging<br/>(uses KUBECONFIG_STAGING)"]
        SlackNotify["slack-notify@v2<br/>(uses SLACK_WEBHOOK_URL)"]
        CIWorkflow --> DockerBuild
        CIWorkflow --> KubeApply
        CIWorkflow --> SlackNotify
    end

    subgraph K8sSecrets["k8s Secrets<br/>(per-namespace, encrypted at rest by k3s)"]
        direction TB
        SecAppStaging["app-secrets-staging<br/>(SESSION_SECRET, JWT_SECRET,<br/>EMAIL_ENCRYPTION_KEY)"]
        SecDBStaging["db-credentials-staging<br/>(PG_USER, PG_PASSWORD)"]
        SecRedisStaging["redis-credentials-staging<br/>(REDIS_PASSWORD)"]
        SecSendGridStaging["sendgrid-credentials<br/>(SENDGRID_API_KEY)"]

        SecAppProd["app-secrets-prod"]
        SecDBProd["db-credentials-prod"]
        SecRedisProd["redis-credentials-prod"]
    end

    subgraph Runtime["Runtime Pods"]
        direction TB
        APIPod["api Pod<br/>(envFrom: secretRef)"]
        Migrations["postgres-migrations Job<br/>(secretKeyRef: db-credentials)"]
        EmailWorker["email-worker Pod<br/>(secretKeyRef: sendgrid)"]
    end

    subgraph BootstrapScript["Local Bootstrap<br/>(LOCAL_DEPLOY.md §5)"]
        Script["./scripts/bootstrap-secrets.sh"]
        Script -->|"prompt + read"| OSKeychain
        Script -->|"prompt + read"| OnePassword
        Script -->|"kubectl create secret"| K8sSecrets
    end

    OSKeychain -->|"developer machine,<br/>never committed"| EnvFile
    EnvFile -.->|"gitignored<br/>(detect-secrets baseline)"| DetectBaseline

    OnePassword -->|"manual export by ops"| GH_GHCR
    OnePassword -->|"manual export by ops"| GH_SendGrid
    OnePassword -->|"manual export by ops"| GH_Slack
    ProdVault -->|"sync via External Secrets Operator<br/>(future, not yet deployed)"| SecAppProd

    GH_GHCR -->|"injected as env<br/>${{ secrets.GHCR_PAT }}"| DockerBuild
    GH_KubeConfig -->|"injected as env"| KubeApply
    GH_KubeConfigProd -->|"injected as env"| KubeApply
    GH_Slack -->|"injected as env"| SlackNotify
    GH_SendGrid -->|"echo to k8s Secret<br/>(or use ESO long-term)"| SecSendGridStaging

    KubeApply -->|"kubectl apply"| SecAppStaging
    KubeApply -->|"kubectl apply"| SecDBStaging
    KubeApply -->|"kubectl apply"| SecRedisStaging
    KubeApply -->|"kubectl apply"| SecSendGridStaging

    SecAppStaging -->|"envFrom: secretRef:<br/>app-secrets-staging"| APIPod
    SecDBStaging -->|"envFrom: secretRef:<br/>db-credentials-staging"| APIPod
    SecRedisStaging -->|"envFrom: secretRef"| APIPod
    SecSendGridStaging -->|"envFrom: secretRef"| EmailWorker
    SecDBStaging -->|"secretKeyRef: PG_PASSWORD"| Migrations

    SecAppProd -->|"envFrom"| APIPod
    SecDBProd -->|"envFrom"| APIPod

    classDef sourceClass fill:#fff4e0,stroke:#963
    classDef defenseClass fill:#ffe8e8,stroke:#c33
    classDef ghClass fill:#e8f0ff,stroke:#369
    classDef k8sClass fill:#e8ffe8,stroke:#393
    classDef runClass fill:#f8e8ff,stroke:#639

    class OSKeychain,EnvFile,OnePassword,ProdVault sourceClass
    class DetectBaseline,DetectScan,Lefthook defenseClass
    class GH_GHCR,GH_KubeConfig,GH_KubeConfigProd,GH_Slack,GH_SendGrid ghClass
    class SecAppStaging,SecDBStaging,SecRedisStaging,SecSendGridStaging,SecAppProd,SecDBProd,SecRedisProd k8sClass
    class APIPod,Migrations,EmailWorker runClass
```

## Secret Inventory（CICD.md §6.1）

| Secret Name | Sensitivity | Storage | Rotation Cadence |
|-------------|-------------|---------|------------------|
| `GHCR_PAT` | High | GitHub Repo Secrets | 90 days (CICD.md §6.4) |
| `KUBECONFIG_STAGING` | High | GitHub Repo Secrets | on cluster rebuild |
| `KUBECONFIG_PROD` | Critical | GitHub Repo Secrets + 1Password | on cluster rebuild |
| `SLACK_WEBHOOK_URL` | Medium | GitHub Repo Secrets | annual |
| `SENDGRID_API_KEY` | High | GitHub + k8s Secret | 90 days |
| `SESSION_SECRET` | Critical | k8s Secret only | 90 days (CICD.md §6.4) |
| `JWT_SECRET` | Critical | k8s Secret only | 90 days |
| `EMAIL_ENCRYPTION_KEY` | Critical | k8s Secret only | yearly (data re-encryption required) |
| `PG_PASSWORD` | Critical | k8s Secret only | 90 days |
| `REDIS_PASSWORD` | High | k8s Secret only | 90 days |

## Defense Layers

1. **Pre-commit**: `detect-secrets` scans staged files against baseline; new findings block commit (Lefthook).
2. **CI Verification**: Stage 9 of `ci.yml` re-runs `detect-secrets scan --baseline .secrets.baseline`.
3. **Storage**: Production secrets only in k8s Secret + 1Password; never in `.env.production` or git history.
4. **Runtime injection**: Pods consume via `envFrom: secretRef:` — never via image-bake-time `ARG` or `ENV`.
5. **Rotation**: Quarterly rotation cadence (90-day) for HIGH+; documented in `runbook.md` Secret Rotation procedure.

## Notes

- Production target eventually adopts **External Secrets Operator (ESO)** to sync from AWS Secrets Manager → k8s Secret automatically; current stage uses manual `kubectl create secret` from bootstrap script.
- All secrets are stored in `bytes` form; admin tools never display the plain value (CICD.md §6.3).
- Audit log captures secret access events: who, when, which key, target pod.
