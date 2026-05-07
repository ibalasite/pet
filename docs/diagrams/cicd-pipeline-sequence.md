---
diagram: cicd-pipeline-sequence
uml-type: Sequence Diagram（CI/CD Pipeline）
source: docs/CICD.md §2 GitHub Actions + §4 ArgoCD + §8 Jenkinsfile
generated: 2026-05-08T00:00:00Z
---

# CI Pipeline Sequence Diagram — pixel-pet-arena

> 來源：docs/CICD.md §2 GitHub Actions Workflows + §3 PR Gate + §4 ArgoCD GitOps

描述從 `git push` / Pull Request 觸發到 staging Smoke Test 的完整 CI/CD pipeline 執行順序。

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Git as GitHub Repo
    participant GHA as GitHub Actions Runner
    participant Reg as ghcr.io Registry
    participant K8s as K8s Cluster (staging)
    participant Argo as ArgoCD v2.11.3
    participant Slack as Slack Notifier

    Dev->>Git: git push origin feature/xyz
    Dev->>Git: open Pull Request to main

    rect rgba(220, 240, 255, 0.4)
        Note over Git,GHA: PR Gate Workflow (.github/workflows/ci.yml)
        Git->>GHA: Webhook trigger (pull_request event)
        GHA->>GHA: Stage 1: Checkout + actions/cache
        GHA->>GHA: Stage 2: pnpm install --frozen-lockfile
        GHA->>GHA: Stage 3: pnpm lint (ESLint + Prettier)
        GHA->>GHA: Stage 4: pnpm typecheck (tsc --noEmit)
        GHA->>GHA: Stage 5: pnpm test:unit (Jest, coverage ≥80%)
        GHA->>GHA: Stage 6: pnpm test:integration (Testcontainers PG+Redis)
        GHA->>GHA: Stage 7: docker build (api / player-app / admin-app)
        GHA->>GHA: Stage 8: pnpm test:e2e:smoke
        GHA->>GHA: Stage 9: detect-secrets scan
        alt All gates PASS
            GHA-->>Git: GitHub Status: success ✓
            Git-->>Dev: PR ready to merge
        else any FAIL
            GHA-->>Git: GitHub Status: failure ✗
            GHA->>Slack: notify #ci-alerts (failed stage + log URL)
            Git-->>Dev: PR blocked — fix issues
        end
    end

    Note over Dev,Git: Reviewer approves PR → Squash-merge to main

    rect rgba(220, 255, 220, 0.4)
        Note over Git,Argo: Staging Deploy Workflow (.github/workflows/deploy-staging.yml)
        Git->>GHA: Webhook trigger (push to main)
        GHA->>GHA: docker build --tag ghcr.io/owner/api:sha-XXXXXXX
        GHA->>Reg: docker push ghcr.io/owner/api:sha-XXXXXXX
        GHA->>GHA: docker build --tag ghcr.io/owner/player-app:sha-XXXXXXX
        GHA->>Reg: docker push ghcr.io/owner/player-app:sha-XXXXXXX
        GHA->>GHA: docker build --tag ghcr.io/owner/admin-app:sha-XXXXXXX
        GHA->>Reg: docker push ghcr.io/owner/admin-app:sha-XXXXXXX
        GHA->>Git: kustomize edit set image (k8s/staging/) + git commit
        GHA->>Git: git push to main (auto-update overlay)
        Argo->>Git: poll repo (every 3 min) — detects overlay change
        Argo->>K8s: kubectl apply -f staging manifests (sync)
        K8s->>K8s: rolling update Deployments
        K8s-->>Argo: Pods Ready (readinessProbe pass)
        Argo->>GHA: webhook notify sync result
        GHA->>K8s: curl -fsS https://staging.example.com/health/ready
        alt Health PASS
            K8s-->>GHA: 200 OK { status: "ready" }
            GHA->>Slack: notify #deploys ✓ staging deploy success
        else Health FAIL within 5 min
            K8s-->>GHA: 503 / timeout
            GHA->>Argo: argocd app rollback (revert last sync)
            GHA->>Slack: notify #ci-alerts ✗ staging deploy failed (auto-rollback)
        end
    end

    Note over Dev,Slack: For production: tag push v*.*.* triggers deploy-production.yml<br/>with manual environment approval gate before deploy.
```

## Notes

- All Stage commands match `.github/workflows/ci.yml` definitions (docs/CICD.md §2.1).
- Image tag format: `ghcr.io/{owner}/{service}:sha-{git_sha_short}` (`pipeline_image_tag_format` in CONSTANTS).
- ArgoCD sync wave is configured with `argocd.argoproj.io/sync-wave: "0"` for app pods, `"-1"` for migrations (CICD.md §4.4).
- Health check polls `https://staging.example.com/health/ready` with 5-minute timeout (`pipeline_smoke_test_timeout_seconds = 300` in CONSTANTS).
- detect-secrets scan threshold: any new secret triggers `failure` status (CICD.md §3.2).

## 對應 API.md / EDD §10.3 CI/CD Overview

| Pipeline Stage | Workflow File | Key Make Target |
|---------------|---------------|-----------------|
| PR Gate | `.github/workflows/ci.yml` | `pnpm verify` |
| Staging Deploy | `.github/workflows/deploy-staging.yml` | `pnpm deploy:staging` |
| Production Deploy | `.github/workflows/deploy-production.yml` | manual approval + `pnpm deploy:prod` |
