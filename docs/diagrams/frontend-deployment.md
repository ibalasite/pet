---
diagram: frontend-deployment
uml-type: Deployment Diagram（Frontend Build / Deploy Pipeline）
source: docs/FRONTEND.md §1.3 Build + docs/ARCH.md §7.1 + docs/CICD.md §4 ArgoCD
generated: 2026-05-08T00:00:00Z
---

# Frontend Deployment Diagram — Build & Distribution Pipeline

> 來源：docs/FRONTEND.md §1.3 Build Tooling + docs/ARCH.md §7.1 Infrastructure Overview + docs/CICD.md §4 ArgoCD

描述 Player App 與 Admin Portal 的建構平台、CDN 分發、靜態資源版本控制策略。

```mermaid
graph TD
    subgraph Source ["Source Repository"]
        Repo["GitHub<br/>github.com/owner/pixel-pet-arena<br/>monorepo (pnpm workspace)"]
        PlayerSrc["packages/player-app/<br/>React 18 + Phaser.js 3 +<br/>TypeScript 5 + Vite 5"]
        AdminSrc["packages/admin-app/<br/>Vue 3 + Element Plus +<br/>TypeScript 5 + Vite 5"]
        Repo --> PlayerSrc
        Repo --> AdminSrc
    end

    subgraph BuildPipeline ["GitHub Actions Build Pipeline"]
        BuildPlayer["build-player<br/>tool: vite build<br/>output: dist/player-app/<br/>JS chunks ≤300KB gzipped<br/>CSS ≤30KB"]
        BuildAdmin["build-admin<br/>tool: vite build<br/>output: dist/admin-app/<br/>JS chunks ≤500KB gzipped<br/>CSS ≤80KB (Element Plus base)"]

        DockerImagePlayer["docker build player-app<br/>Image: ghcr.io/owner/player-app:sha-XXXXXXX<br/>base: nginx:alpine 1.27.x<br/>config: serve dist/ on :80"]
        DockerImageAdmin["docker build admin-app<br/>Image: ghcr.io/owner/admin-app:sha-XXXXXXX<br/>base: nginx:alpine 1.27.x"]

        PlayerSrc --> BuildPlayer
        AdminSrc --> BuildAdmin
        BuildPlayer --> DockerImagePlayer
        BuildAdmin --> DockerImageAdmin
    end

    subgraph Registry ["Container Registry"]
        GHCR[("ghcr.io/owner/player-app<br/>tags: sha-XXXXXXX (staging),<br/>v1.x.x (production)<br/>retention: 90 days")]
        GHCRAdmin[("ghcr.io/owner/admin-app<br/>(same tagging)")]
        DockerImagePlayer -->|"docker push HTTPS:443"| GHCR
        DockerImageAdmin -->|"docker push HTTPS:443"| GHCRAdmin
    end

    subgraph K8sStaging ["K8s Cluster — Staging Namespace"]
        ArgoStaging["ArgoCD Application<br/>(syncs k8s/staging/ overlay)<br/>poll: every 3 min"]
        PlayerSvcStaging["player-app Service<br/>type: ClusterIP, :80<br/>replicas: 2"]
        AdminSvcStaging["admin-app Service<br/>type: ClusterIP, :80<br/>replicas: 1"]
        IngressStaging["nginx Ingress<br/>host: staging.pet.local (player)<br/>host: admin-staging.pet.local (admin)<br/>TLS 1.3 via cert-manager<br/>Replicas: 2"]
        ArgoStaging -->|"kubectl apply"| PlayerSvcStaging
        ArgoStaging -->|"kubectl apply"| AdminSvcStaging
        IngressStaging -->|"HTTP:80 path-based"| PlayerSvcStaging
        IngressStaging -->|"HTTP:80 path-based"| AdminSvcStaging
        GHCR -.->|"docker pull HTTPS:443<br/>(via imagePullSecret)"| PlayerSvcStaging
        GHCRAdmin -.->|"docker pull"| AdminSvcStaging
    end

    subgraph K8sProd ["K8s Cluster — Production Namespace"]
        ArgoProd["ArgoCD Application<br/>(syncs k8s/production/ overlay)<br/>tag-based: v*.*.* trigger"]
        PlayerSvcProd["player-app Service<br/>replicas: 3, HPA 3-20"]
        AdminSvcProd["admin-app Service<br/>replicas: 2, HPA 2-10"]
        IngressProd["nginx Ingress<br/>host: pet.local (player)<br/>host: admin.pet.local (admin)<br/>TLS 1.3 via cert-manager<br/>Replicas: 3 (HA)"]
        ArgoProd -->|"kubectl apply"| PlayerSvcProd
        ArgoProd -->|"kubectl apply"| AdminSvcProd
        IngressProd -->|"HTTP:80"| PlayerSvcProd
        IngressProd -->|"HTTP:80"| AdminSvcProd
        GHCR -.->|"docker pull"| PlayerSvcProd
        GHCRAdmin -.->|"docker pull"| AdminSvcProd
    end

    subgraph CDN ["CDN / Edge (optional, future)"]
        Cloudflare["Cloudflare CDN<br/>(future: pet.example.com)<br/>cache-control: 1 year hash assets<br/>HTML: no-store"]
    end

    subgraph BrowserClients ["Browser Clients (worldwide)"]
        BrowserPlayer["Player Browser<br/>Chrome / Firefox / Safari<br/>iOS Safari 17+"]
        BrowserAdmin["Admin Browser<br/>Chrome / Edge<br/>(corporate)"]
    end

    BrowserPlayer -->|"HTTPS:443<br/>TLS 1.3<br/>cert: pet.local (cert-manager)"| IngressProd
    BrowserPlayer -.->|"future: HTTPS:443<br/>via Cloudflare"| Cloudflare
    Cloudflare -.->|"origin pull"| IngressProd
    BrowserAdmin -->|"HTTPS:443<br/>+ IP whitelist"| IngressProd

    classDef sourceClass fill:#fff4e0,stroke:#963
    classDef buildClass fill:#e8f0ff,stroke:#369
    classDef regClass fill:#fff0f8,stroke:#963
    classDef k8sClass fill:#e8ffe8,stroke:#393
    classDef edgeClass fill:#f8e8ff,stroke:#639
    classDef clientClass fill:#fffce0,stroke:#996

    class Repo,PlayerSrc,AdminSrc sourceClass
    class BuildPlayer,BuildAdmin,DockerImagePlayer,DockerImageAdmin buildClass
    class GHCR,GHCRAdmin regClass
    class ArgoStaging,PlayerSvcStaging,AdminSvcStaging,IngressStaging,ArgoProd,PlayerSvcProd,AdminSvcProd,IngressProd k8sClass
    class Cloudflare edgeClass
    class BrowserPlayer,BrowserAdmin clientClass
```

## Build Targets

| Target | Tool | Output | Bundle Budget |
|--------|------|--------|--------------|
| Player App (Web/H5) | Vite 5 (rolldown roadmap) | `dist/player-app/` | JS ≤ 300KB gz, CSS ≤ 30KB |
| Admin Portal | Vite 5 | `dist/admin-app/` | JS ≤ 500KB gz, CSS ≤ 80KB |
| Phaser atlases | Phaser TexturePacker | `public/atlases/{rarity}/` | each atlas ≤ 256KB |
| Sprite generation | seed-deterministic | runtime canvas | (no bundle impact) |

## Static Asset Versioning

- **Hashed file names**：`main.[hash].js`、`vendor.[hash].js`、`pet-{rarity}-[hash].png`
- **Cache-Control**：靜態 hash 檔 `max-age=31536000, immutable`（1 year）
- **HTML shell**：`Cache-Control: no-store, must-revalidate`（每次重打）
- **Service Worker**：cache versioning by app version stamp（`v1.4.2-{sha}`）

## Deployment Targets

| Environment | URL | Trigger | Tag |
|------------|-----|---------|-----|
| Staging Player | staging.pet.local | merge to main | `sha-XXXXXXX` |
| Staging Admin | admin-staging.pet.local | merge to main | `sha-XXXXXXX` |
| Production Player | pet.local | push tag `v*.*.*` | `v1.x.x` |
| Production Admin | admin.pet.local | push tag `v*.*.*` | `v1.x.x` |

## Build Toolchain（CICD.md §4）

```
git push → GitHub Actions
  → pnpm install (cached)
  → pnpm --filter player-app build (vite build)
  → pnpm --filter admin-app build
  → docker build (per-app multi-stage Dockerfile)
  → docker push to ghcr.io
  → kustomize edit set image (k8s/staging/)
  → git commit + push (overlay update)
  → ArgoCD detects → syncs to k8s
  → readinessProbe → traffic shift
```

## Notes

- 兩個 SPA 共享同一個 Container Registry，但部署為獨立 Deployment + Service
- nginx Ingress 用 host-based routing 區分 player vs admin（不同 hostname）
- Cloudflare 為未來 plan，目前直接走 K8s Ingress
- Production 部署需要手動 approve GitHub Environment（CICD.md §5）
