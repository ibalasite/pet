# CI/CD Pipeline Overview

This document provides a high-level view of the complete CI/CD pipeline for the pixel-pet-arena monorepo, from a developer pushing code through PR validation, staging deployment, and production release to Kubernetes via ArgoCD GitOps. It covers PR gate enforcement, environment promotion, health check gates, and the rollback paths available at each stage of the pipeline.

## Pipeline Stages

The pipeline consists of four major stages: PR Gate (ci.yml), Staging Deployment (deploy-staging.yml), Production Deployment (deploy-production.yml), and Rollback recovery. Each stage builds on the previous, ensuring only validated artifacts reach production.

```mermaid
flowchart TD
    DEV([Developer Push / PR])
    PR_GATE{PR Gate\nci.yml}
    GATE_FAIL([PR Blocked\nFix Required])
    GATE_PASS([PR Approved\nMerge to main])

    BUILD_IMGS[Build Docker Images\napi · player-app · admin-app]
    PUSH_GHCR[Push to ghcr.io\nTagged :staging-SHA]
    UPDATE_KUST_STG[Update Kustomize\nk8s/staging/ manifests]
    ARGOCD_STG[ArgoCD Sync\nStaging Cluster]
    STG_HEALTH{Staging Health\nCheck}
    STG_FAIL([Staging Rollback\nk8s rollout undo])
    STG_OK([Staging Verified\nNotify Team])

    TAG_TRIGGER([Git Tag Push\nvX.Y.Z])
    BUILD_PROD[Build Docker Images\napi · player-app · admin-app]
    PUSH_PROD[Push to ghcr.io\nTagged :vX.Y.Z]
    APPROVAL{Manual Approval\nGitHub Environment Gate}
    REJECTED([Deployment Rejected\nHold])
    UPDATE_KUST_PROD[Update Kustomize\nk8s/production/ manifests]
    ARGOCD_PROD[ArgoCD Sync\nProduction Cluster]
    PROD_HEALTH{Production Health\nCheck}
    PROD_FAIL([Production Rollback\nArgoCD Rollback SHA])
    PROD_OK([Production Live\nRelease Tagged])

    DEV --> PR_GATE
    PR_GATE -- Checks Fail --> GATE_FAIL
    PR_GATE -- Checks Pass --> GATE_PASS
    GATE_PASS --> BUILD_IMGS
    BUILD_IMGS --> PUSH_GHCR
    PUSH_GHCR --> UPDATE_KUST_STG
    UPDATE_KUST_STG --> ARGOCD_STG
    ARGOCD_STG --> STG_HEALTH
    STG_HEALTH -- Unhealthy --> STG_FAIL
    STG_HEALTH -- Healthy --> STG_OK

    STG_OK -.->|Release decision| TAG_TRIGGER
    TAG_TRIGGER --> BUILD_PROD
    BUILD_PROD --> PUSH_PROD
    PUSH_PROD --> APPROVAL
    APPROVAL -- Rejected --> REJECTED
    APPROVAL -- Approved --> UPDATE_KUST_PROD
    UPDATE_KUST_PROD --> ARGOCD_PROD
    ARGOCD_PROD --> PROD_HEALTH
    PROD_HEALTH -- Unhealthy --> PROD_FAIL
    PROD_HEALTH -- Healthy --> PROD_OK

    STG_FAIL -.->|Re-push fix| DEV
    PROD_FAIL -.->|Hotfix branch| DEV

    style PR_GATE fill:#f0a500,color:#000
    style STG_HEALTH fill:#f0a500,color:#000
    style PROD_HEALTH fill:#f0a500,color:#000
    style APPROVAL fill:#d62828,color:#fff
    style GATE_FAIL fill:#e63946,color:#fff
    style STG_FAIL fill:#e63946,color:#fff
    style PROD_FAIL fill:#e63946,color:#fff
    style PROD_OK fill:#2a9d8f,color:#fff
    style STG_OK fill:#2a9d8f,color:#fff
```

## Environment Promotion Strategy

Promotion between environments is controlled by Git artifacts rather than manual triggers where possible. Merging to `main` triggers staging deployment automatically. Production deployment requires a semver Git tag (`vX.Y.Z`) and a manual approval gate configured in the GitHub Actions environment protection rules. This ensures every production deployment has an explicit human sign-off and a traceable release artifact.

| Trigger | Target Environment | Approval Required |
|---|---|---|
| PR merged to `main` | Staging | No |
| Git tag `vX.Y.Z` pushed | Production | Yes — GitHub Environment gate |
| Hotfix branch + tag | Production | Yes — expedited review |

## Rollback Paths

Two rollback mechanisms are available depending on the failure point:

- **Staging rollback**: `kubectl rollout undo deployment/<name> -n staging` reverts the Kubernetes Deployment to the previous ReplicaSet. ArgoCD detects drift and re-syncs to the last known-good manifest stored in Git.
- **Production rollback**: ArgoCD supports rollback to any prior synced revision via `argocd app rollback pixel-pet-arena-prod <revision>`. The Kustomize overlay in `k8s/production/` is also reverted via a revert commit to maintain GitOps source-of-truth.

## Feature Flag Integration

Feature flags (`FF_MARKETPLACE=false`, `FF_ARENA_SUMO=true`) are injected as environment variables in the Kubernetes manifests managed by Kustomize overlays. Staging and production overlays can carry different flag values, enabling safe validation of new features in staging before they are promoted to production without requiring a separate code deployment.
