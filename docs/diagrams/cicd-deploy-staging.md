# Staging Deployment Flow (deploy-staging.yml)

This document describes the staging deployment pipeline triggered by merges to the `main` branch of the pixel-pet-arena monorepo. The flow builds Docker multi-stage images for the `api`, `player-app`, and `admin-app` services, pushes them to the GitHub Container Registry (`ghcr.io`), updates the Kustomize overlay in `k8s/staging/`, and relies on ArgoCD v2.11.3 to sync the changes to the staging Kubernetes cluster. Health check verification is performed after sync to confirm successful rollout before the pipeline reports success.

## Trigger and Prerequisites

The `deploy-staging.yml` workflow is triggered by a `push` event on the `main` branch after the `ci.yml` PR gate has completed successfully. Build secrets (`GHCR_TOKEN`, `SUPABASE_SERVICE_KEY`, `REDIS_URL_STAGING`) are injected from GitHub Actions repository secrets. The `VITE_API_BASE_URL` for the staging environment is passed as a Docker `--build-arg` so it is baked into the Vite bundle at compile time.

```mermaid
flowchart TD
    TRIGGER([Push to main\ngithub.event push])

    subgraph BUILD_PHASE [Build Phase — parallel]
        BUILD_API[docker build --target production\napi · Node.js 20 Alpine\nghcr.io/org/pixel-pet-arena-api]
        BUILD_PLAYER[docker build --target production\nplayer-app · React 18 + Phaser 3\nnginx Alpine · port 80\n--build-arg VITE_API_BASE_URL=https://api.staging.pixel-pet-arena.io]
        BUILD_ADMIN[docker build --target production\nadmin-app · Vue 3 + Element Plus\nnginx Alpine · port 80\n--build-arg VITE_API_BASE_URL=https://api.staging.pixel-pet-arena.io]
    end

    subgraph PUSH_PHASE [Push Phase — parallel]
        PUSH_API[docker push\nghcr.io/org/pixel-pet-arena-api:staging-SHA]
        PUSH_PLAYER[docker push\nghcr.io/org/pixel-pet-arena-player:staging-SHA]
        PUSH_ADMIN[docker push\nghcr.io/org/pixel-pet-arena-admin:staging-SHA]
    end

    KUST_UPDATE[Update k8s/staging/ Kustomize manifests\nkustomize edit set image ... :staging-SHA\ngit commit + push to main]

    ARGOCD_SYNC[ArgoCD App Sync\nargocd app sync pixel-pet-arena-staging\n--revision HEAD --prune]

    ARGOCD_WAIT[ArgoCD Wait for Healthy\nargocd app wait pixel-pet-arena-staging\n--health --timeout 300]

    HEALTH_CHECK{All Deployments\nHealthy?}

    ROLLBACK[kubectl rollout undo\ndeployment/api -n staging\ndeployment/player-app -n staging\ndeployment/admin-app -n staging]

    NOTIFY_FAIL([Notify Slack #deploys\nStaging FAILED — SHA rollback])
    NOTIFY_OK([Notify Slack #deploys\nStaging LIVE — SHA])

    TRIGGER --> BUILD_PHASE
    BUILD_PHASE --> PUSH_PHASE
    PUSH_PHASE --> KUST_UPDATE
    KUST_UPDATE --> ARGOCD_SYNC
    ARGOCD_SYNC --> ARGOCD_WAIT
    ARGOCD_WAIT --> HEALTH_CHECK
    HEALTH_CHECK -- Unhealthy --> ROLLBACK
    ROLLBACK --> NOTIFY_FAIL
    HEALTH_CHECK -- Healthy --> NOTIFY_OK

    style HEALTH_CHECK fill:#f0a500,color:#000
    style ROLLBACK fill:#e63946,color:#fff
    style NOTIFY_FAIL fill:#e63946,color:#fff
    style NOTIFY_OK fill:#2a9d8f,color:#fff
```

## Docker Multi-Stage Build Structure

Each service uses a multi-stage Dockerfile to keep the final runtime image lean. The `api` image compiles TypeScript in a `builder` stage using Node.js 20, then copies compiled output into a minimal Alpine runtime stage. The `player-app` and `admin-app` images run `vite build` in the builder stage and copy the `dist/` directory into an `nginx:alpine` image. The `VITE_API_BASE_URL` build argument is consumed during the Vite build step, baking the staging API endpoint URL into the JavaScript bundle.

```mermaid
sequenceDiagram
    participant GH as GitHub Actions
    participant GHCR as ghcr.io Registry
    participant GIT as Git Repository
    participant ARGOCD as ArgoCD v2.11.3
    participant K8S as Kubernetes Staging

    GH->>GH: docker build api (Node 20 Alpine multi-stage)
    GH->>GH: docker build player-app (Vite → nginx:alpine, VITE_API_BASE_URL baked)
    GH->>GH: docker build admin-app (Vite → nginx:alpine, VITE_API_BASE_URL baked)
    GH->>GHCR: docker push pixel-pet-arena-api:staging-SHA
    GH->>GHCR: docker push pixel-pet-arena-player:staging-SHA
    GH->>GHCR: docker push pixel-pet-arena-admin:staging-SHA
    GHCR-->>GH: push confirmed
    GH->>GIT: kustomize edit set image (k8s/staging/)
    GH->>GIT: git commit -m "chore: bump staging images to SHA"
    GIT-->>GH: commit pushed
    GH->>ARGOCD: argocd app sync pixel-pet-arena-staging
    ARGOCD->>GIT: pull k8s/staging/ manifests
    ARGOCD->>K8S: apply Deployment / Service / ConfigMap
    K8S-->>ARGOCD: rollout in progress
    ARGOCD->>K8S: watch rollout status
    K8S-->>ARGOCD: all pods Running
    ARGOCD-->>GH: app health = Healthy
    GH-->>GH: deployment complete
```

## Kustomize Overlay Structure

The staging overlay at `k8s/staging/` uses `kustomization.yaml` with image patches to pin each Deployment to its SHA-tagged image from `ghcr.io`. Environment-specific ConfigMaps provide staging database DSNs, Redis connection strings, and feature flag values (`FF_MARKETPLACE=false`, `FF_ARENA_SUMO=true`). Sensitive values (database passwords, JWT secrets) are referenced as Kubernetes Secret objects whose data is managed separately via GitHub Actions secrets and injected into the cluster by a sealed-secrets or equivalent controller — not stored in Git.

## Health Check and Rollback Criteria

ArgoCD's built-in health assessment checks that all Kubernetes Deployments have their desired replica count fully available and that no Pod is in a `CrashLoopBackOff` or `Error` state. If the `argocd app wait` command times out (300 seconds) or returns an unhealthy status, the GitHub Actions job executes `kubectl rollout undo` for each affected Deployment, reverting to the previous ReplicaSet. ArgoCD is subsequently re-synced to the last healthy Git commit so the GitOps source of truth stays consistent with the running cluster state.
