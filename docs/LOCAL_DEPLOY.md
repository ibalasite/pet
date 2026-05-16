# LOCAL_DEPLOY — Local Development Deployment Guide (Rancher Desktop + Kubernetes)

<!-- SDLC Layer 9 — Local Developer Onboarding -->
<!-- Upstream: EDD-PIXEL-PET-ARENA-20260503, ARCH-PIXEL-PET-ARENA-20260503, SCHEMA-PIXEL-PET-ARENA-20260503, ADMIN_IMPL.md, runbook.md, CICD.md -->

---

## Document Control

| Field | Value |
|-------|-------|
| **DOC-ID** | LOCAL_DEPLOY-PIXEL-PET-ARENA-20260517 |
| **Project** | Pixel Pet Arena |
| **Version** | v3.0 |
| **Status** | DRAFT |
| **Author** | AI Generated (gendoc local-deploy) |
| **Date** | 2026-05-17 |
| **Upstream EDD** | [EDD.md](EDD.md) |
| **Last Verified** | 2026-05-17 |
| **Verified By** | AI Generated (gendoc local-deploy regen) |
| **client_type** | game (HTML5 browser, Phaser 3) |
| **has_admin_backend** | true |

---

## Change Log

| 版本 | 日期 | 作者 | 變更摘要 |
|------|------|------|---------|
| v1.x | 2026-05-03 | AI Generated | 初稿：pnpm + Supabase + Docker Redis 本地單機流程（已淘汰）|
| v2.x | 2026-05-10 | AI Generated | 補充 Docker Compose、TOTP 設定、Vite HMR Troubleshooting |
| v3.0 | 2026-05-17 | AI Generated (gendoc local-deploy regen) | **完整重寫至 K8s-First 規範**：所有 service 部署於 Rancher Desktop k3s namespace `pixel-pet-arena-local`；新增 §3.5 Secret Bootstrap、§4.8 Bounded Context 獨立啟動驗證、§17 Tunnel Access、§18 AI Agent Quick Start、§19 Docker Compose 輔助方案、§19.1 nginx proxy 單 port 模式、§20 k9s 快速參考、§21 Jenkins on k3s。Admin Portal `base: '/admin/'` 與 SPA fallback 完整覆蓋。 |

---

## 1. Prerequisites

請在開始前完整安裝下列工具並驗證版本。

| Tool | Min Version | Install | Verify |
|------|------------|---------|--------|
| macOS | 13.0+ | — | `sw_vers -productVersion` |
| **Rancher Desktop** | 1.13 | [rancherdesktop.io](https://rancherdesktop.io) | `rdctl version` |
| kubectl | 1.29 | Bundled with Rancher Desktop | `kubectl version --client` |
| helm | 3.14 | Bundled with Rancher Desktop | `helm version` |
| nerdctl | 1.7 | Bundled with Rancher Desktop | `nerdctl version` |
| k9s（選配） | ≥ 0.32 | macOS/Linux: `brew install derailed/k9s/k9s`<br>Windows: `choco install k9s` 或 `scoop install k9s` | `k9s version` |
| skaffold（選配） | 2.11 | `brew install skaffold` | `skaffold version` |
| psql client | 15 | `brew install libpq && brew link libpq` | `psql --version` |
| redis-cli | 7 | `brew install redis` | `redis-cli --version` |
| mkcert | 1.4 | `brew install mkcert` | `mkcert --version` |
| Node.js（HMR / Playwright 用） | 20 LTS | `brew install node@20` 或 nvm | `node --version` |
| pnpm | 9 | `npm install -g pnpm@latest` | `pnpm --version` |
| Git | 2.40 | `brew install git` | `git --version` |
| Make | 4.3 | `brew install make` | `make --version` |
| curl | 8.0 | Pre-installed | `curl --version` |

> **Rancher Desktop 設定：** 啟動後進入 **Preferences > Virtual Machine > Resources**，至少配置 **8 GB RAM / 4 CPU**（本 stack 含 2 × API + 2 × Worker + Postgres + Redis + MinIO + Mailpit + pgadmin + Admin SPA，建議 12 GB）。Container engine 必須選 **containerd**（nerdctl）。
> **kubectl context：** Rancher Desktop 啟動後會自動注入 `rancher-desktop` context。執行 `kubectl config use-context rancher-desktop` 確認。
> **Node.js 與 pnpm：** Node 20 用於本機跑 Playwright E2E、生成憑證、Admin SPA / Player SPA build。如果只用 K8s 內 build（透過 `make image-build-all`），Node 可省略。

---

## 2. Architecture Overview

本地環境完全於 Kubernetes 內執行，與 staging / production 採用相同 K8s 資源模型（Deployment、Service、ConfigMap、Secret、Ingress）。開發者透過 Ingress（k3s 內建 Traefik）或 `kubectl port-forward` 存取各服務。

**所有服務均在 namespace `pixel-pet-arena-local` 內。**

```mermaid
graph TB
    Dev["Developer<br/>(localhost)"]
    Ingress["Ingress (Traefik)<br/>pixel-pet-arena.local"]

    subgraph K8s["K8s Namespace: pixel-pet-arena-local"]
        Web["web-app (Player)<br/>Deployment<br/>:80 (nginx serve)"]
        Admin["admin-app (Vue 3 SPA)<br/>Deployment<br/>:80 (nginx serve)"]
        API["api-server (Fastify 4)<br/>Deployment ≥ 2 replicas<br/>:8080"]
        Worker["worker (jobs)<br/>Deployment ≥ 2 replicas<br/>:8081"]
        DB[("postgres<br/>StatefulSet<br/>:5432")]
        Cache[("redis<br/>StatefulSet<br/>:6379")]
        Storage["minio<br/>Deployment<br/>:9000"]
        Mail["mailpit<br/>Deployment<br/>:8025 / SMTP 1025"]
        PGA["pgadmin<br/>Deployment<br/>:80"]
    end

    Dev -->|Ingress / port-forward| Ingress
    Ingress -->|/| Web
    Ingress -->|/admin| Admin
    Ingress -->|/api| API
    Ingress -->|/mailpit| Mail
    Ingress -->|/minio-console| Storage
    Ingress -->|/pgadmin| PGA
    Dev -->|kubectl port-forward 5432| DB
    Dev -->|kubectl port-forward 6379| Cache
    Web -->|ClusterIP| API
    Admin -->|ClusterIP| API
    API -->|ClusterIP| DB
    API -->|ClusterIP| Cache
    API -->|ClusterIP| Storage
    API -->|ClusterIP| Mail
    Worker -->|ClusterIP| DB
    Worker -->|ClusterIP| Cache
    Worker -->|ClusterIP| Mail
```

**K8s 資源對照：**

| 服務 | Kind | Image | ConfigMap | Secret |
|------|------|-------|-----------|--------|
| web-app | Deployment | `pixel-pet-arena/web:local` | `pixel-pet-arena-web-config` | — |
| admin-app | Deployment | `pixel-pet-arena/admin:local` | `pixel-pet-arena-admin-config` | — |
| api-server | Deployment（≥ 2 replicas） | `pixel-pet-arena/api:local` | `pixel-pet-arena-api-config` | `pixel-pet-arena-api-secret` |
| worker | Deployment（≥ 2 replicas） | `pixel-pet-arena/worker:local` | `pixel-pet-arena-api-config` | `pixel-pet-arena-api-secret` |
| postgres | StatefulSet | `postgres:15-alpine` | — | `pixel-pet-arena-db-secret` |
| redis | StatefulSet | `redis:7-alpine` | — | — |
| minio | Deployment | `minio/minio:RELEASE.2024-08-01T00-00-00Z` | — | `pixel-pet-arena-minio-secret` |
| mailpit | Deployment | `axllent/mailpit:latest` | — | — |
| pgadmin | Deployment | `dpage/pgadmin4:latest` | — | `pixel-pet-arena-pgadmin-secret` |

> **K8s manifest 位置：** `k8s/overlays/local/`（Kustomize）。Helm chart skeleton 位於 `docs/blueprint/infra/helm/`。

### 2.1 Bounded Context 子系統拆解對照（Modular Monolith）

本地環境以 **Modular Monolith** 方式部署，所有 BC（Bounded Context）共用同一個 `api-server` Deployment。各 BC 在程式碼層已完全隔離（依 EDD §3.4 Schema Ownership Table），可隨時將任一 BC 獨立拉出為微服務（見 §4.8 單一子系統啟動驗證）。

| BC（子系統） | TypeScript 模組路徑 | 擁有的 DB Tables | Public API Prefix | 發布的 Event Topics |
|-------------|---------------------|-----------------|-------------------|-------------------|
| Identity | `apps/api/src/routes/identity` | `claim_identities`, `claim_codes`, `gdpr_requests` | `/api/v1/claim`, `/api/v1/gdpr` | `IdentityClaimed`, `GdprErasureRequested`, `GdprErasureCompleted` |
| Pet | `apps/api/src/routes/pet` | `pets`, `training_logs`, `food_buffs` | `/api/v1/pets` | `PetGenerated`, `PetClaimed`, `PetTrained`, `PetFoodConsumed`, `PetBanned` |
| Arena | `apps/api/src/routes/arena` | `arena_matches` | `/api/v1/arena` | `ArenaMatchStarted`, `ArenaMatchCompleted` |
| Leaderboard | `apps/api/src/routes/leaderboard` | `leaderboard_snapshots` | `/api/v1/leaderboard` | `LeaderboardUpdated`, `LeaderboardEntryRemoved` |
| Admin | `apps/api/src/routes/admin`（mounted under `/admin/api`） | `admin_users`, `audit_logs` | `/admin/api/*` | `AdminUserCreated`, `AdminActionLogged`, `SuspiciousPetFlagged` |

> BC 一覽以 EDD §3.4 / SCHEMA.md §2 為準。Marketplace BC 為 P2（FF_MARKETPLACE off by default）。

---

## 3. Quick Start（5 分鐘上手）

適合熟悉 K8s 的工程師；初次設定請走 §4 Step-by-Step。

```bash
# 1. Clone 並進入專案
git clone git@github.com:pixel-pet-arena/pixel-pet-arena.git
cd pixel-pet-arena

# 2. 確認 kubectl context 為 Rancher Desktop
kubectl config use-context rancher-desktop

# 3. 建立 namespace 與基礎 Secret（從 secrets.example.env 複製假值）
make k8s-init

# 4. Build 並載入所有 image（api / worker / web / admin）
make image-build-all

# 5. 部署所有 K8s 資源
make k8s-apply

# 6. 等待所有 Pod 就緒
kubectl wait --for=condition=Ready pods --all -n pixel-pet-arena-local --timeout=180s

# 7. 初始化資料庫（migration + seed）
make db-migrate
make db-seed

# 8. 驗證所有服務健康
make health-check
```

預期輸出：

```
[OK] web-app     http://pixel-pet-arena.local
[OK] admin-app   http://pixel-pet-arena.local/admin/
[OK] api-server  http://pixel-pet-arena.local/api/health
[OK] postgres    pod/postgres-0 — Running
[OK] redis       pod/redis-0 — Running
[OK] minio       pod/minio — Running
[OK] mailpit     pod/mailpit — Running
[OK] api-server  replicas=2/2 Ready
[OK] worker      replicas=2/2 Ready
```

如有任何 `[FAIL]`，請進入 §10（Common Issues）。

---

## 3.5 Secret Bootstrap（密碼安全管理）

> **原則**：所有 K8s Secret **禁止進 git**。禁止使用靜態明文密碼。本節定義三層密碼策略，確保本地開發環境的安全性符合企業標準。

### 禁止規則

以下檔案 **必須** 加入 `.gitignore`（違規視為安全事故）：

```gitignore
# Secret files — never commit
*.env
.env
.env.*
secrets.env
k8s/overlays/local/secrets.env
scripts/bootstrap-secrets.sh.local
apps/api/.env.local
apps/web/.env.local
apps/admin/.env.local
```

### 三層 Secret 策略

| 層 | 類型 | 適用密碼 | 管理方式 |
|----|------|---------|---------|
| **層 1** | Ephemeral（每次重生成） | DB password、Redis AUTH、JWT secret、`EMAIL_ENCRYPTION_KEY`（AES-256-GCM）、Admin init password | 每次 `make k8s-init` 或 `make secrets-rotate` 重生成 |
| **層 2** | OS Keychain（固定憑證） | ghcr.io image registry token、npm 私有 registry token | macOS Keychain / Windows Credential Manager |
| **層 3** | Enterprise Password Manager（可選） | 真實 SendGrid API key、Sentry DSN（若於本機驗證上傳）| 1Password `op inject` 或 Bitwarden Secrets Manager |

---

### 層 1：Ephemeral 密碼 Bootstrap（必做）

每次重啟 cluster 或執行 `make k8s-clean` 後，執行以下 bootstrap script 重新生成所有密碼。

**macOS / Linux（`scripts/bootstrap-secrets.sh`）：**

```bash
#!/usr/bin/env bash
# Auto-generate ephemeral K8s secrets — never commit this output
set -euo pipefail

NAMESPACE="pixel-pet-arena-local"

echo "[bootstrap-secrets] Generating ephemeral secrets for namespace: ${NAMESPACE}"

# Ensure namespace exists
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# Delete existing secrets to force regeneration
kubectl delete secret app-secrets -n "${NAMESPACE}" --ignore-not-found

# Generate and apply
kubectl create secret generic app-secrets \
  -n "${NAMESPACE}" \
  --from-literal=DB_PASSWORD="$(openssl rand -hex 32)" \
  --from-literal=REDIS_AUTH="$(openssl rand -hex 32)" \
  --from-literal=JWT_SECRET="$(openssl rand -hex 64)" \
  --from-literal=EMAIL_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  --from-literal=ADMIN_INIT_PASSWORD="$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)" \
  --from-literal=ENCRYPTION_KEY="$(openssl rand -hex 32)"

echo "[bootstrap-secrets] ✅ Ephemeral secrets created in ${NAMESPACE}"
echo "[bootstrap-secrets] ⚠️  Secrets are ephemeral — regenerated on every cluster restart"
```

```bash
# 每次 cluster 啟動時執行
chmod +x scripts/bootstrap-secrets.sh
./scripts/bootstrap-secrets.sh

# 或透過 make target
make secrets-rotate
```

**Windows（PowerShell，`scripts/bootstrap-secrets.ps1`）：**

```powershell
# Auto-generate ephemeral K8s secrets — never commit this output
param(
    [string]$Namespace = "pixel-pet-arena-local"
)

Write-Host "[bootstrap-secrets] Generating ephemeral secrets for namespace: $Namespace"

kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -
kubectl delete secret app-secrets -n $Namespace --ignore-not-found

function New-RandomHex([int]$bytes) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $arr = New-Object byte[] $bytes
    $rng.GetBytes($arr)
    return ([System.BitConverter]::ToString($arr) -replace '-','').ToLower()
}

kubectl create secret generic app-secrets `
    -n $Namespace `
    --from-literal="DB_PASSWORD=$(New-RandomHex 32)" `
    --from-literal="REDIS_AUTH=$(New-RandomHex 32)" `
    --from-literal="JWT_SECRET=$(New-RandomHex 64)" `
    --from-literal="EMAIL_ENCRYPTION_KEY=$(New-RandomHex 32)" `
    --from-literal="ENCRYPTION_KEY=$(New-RandomHex 32)" `
    --from-literal="ADMIN_INIT_PASSWORD=$(New-RandomHex 16)"

Write-Host "[bootstrap-secrets] ✅ Ephemeral secrets created in $Namespace"
Write-Host "[bootstrap-secrets] ⚠️  Secrets are ephemeral — regenerated on every cluster restart"
```

```powershell
# 執行
.\scripts\bootstrap-secrets.ps1
```

**重生成時機：**

```bash
make k8s-clean        # 刪除 namespace（所有 secret 一起被刪）
make cluster-reset    # 完全重建 cluster
make secrets-rotate   # 主動輪換（安全需求或 secret 洩漏後）
```

---

### 層 2：OS Keychain 固定憑證（視需求）

適用於 **不能每次重生成** 的憑證，例如 ghcr.io / npm private registry token。

**macOS Keychain（`security` CLI）：**

```bash
# 儲存憑證到 macOS Keychain（首次設定）
security add-generic-password \
  -s "pixel-pet-arena-registry" \
  -a "dev" \
  -w "<YOUR_GHCR_TOKEN>"

# 讀取憑證並登入
REGISTRY_TOKEN=$(security find-generic-password -w -s "pixel-pet-arena-registry" -a "dev")
echo "${REGISTRY_TOKEN}" | nerdctl login ghcr.io --username dev --password-stdin

# 儲存 npm registry token
security add-generic-password \
  -s "pixel-pet-arena-npm-token" \
  -a "dev" \
  -w "<YOUR_NPM_TOKEN>"
```

**Windows Credential Manager（PowerShell）：**

```powershell
Install-Module -Name CredentialManager -Force
New-StoredCredential -Target "pixel-pet-arena-registry" -UserName "dev" -Password "<YOUR_GHCR_TOKEN>"
$cred = Get-StoredCredential -Target "pixel-pet-arena-registry"
$token = $cred.GetNetworkCredential().Password
echo $token | nerdctl login ghcr.io --username dev --password-stdin
```

---

### 層 3：mittwald/kubernetes-secret-generator（進階選項）

如果偏好 **in-cluster 全自動生成**（無需手動執行 bootstrap script）：

```bash
helm repo add mittwald https://helm.mittwald.de
helm upgrade --install secret-generator mittwald/kubernetes-secret-generator \
  -n kube-system
```

```yaml
# k8s/overlays/local/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: pixel-pet-arena-local
  annotations:
    secret-generator.v1.mittwald.de/autogenerate: "DB_PASSWORD,REDIS_AUTH,JWT_SECRET,EMAIL_ENCRYPTION_KEY,ENCRYPTION_KEY"
    secret-generator.v1.mittwald.de/length: "64"
    secret-generator.v1.mittwald.de/type: "string"
type: Opaque
```

> mittwald/secret-generator 適合不需要在 bootstrap script 中讀取密碼的場景（如 app 直接從 K8s Secret 讀取）。若需要在腳本中取得生成的密碼值，層 1（openssl rand）更直接。

---

### 驗證 Secret 已正確建立

```bash
# 確認 secret 存在（不顯示值）
kubectl get secret app-secrets -n pixel-pet-arena-local

# 確認所有 key 都存在
kubectl get secret app-secrets -n pixel-pet-arena-local -o jsonpath='{.data}' | python3 -c "
import sys, json
keys = list(json.load(sys.stdin).keys())
required = ['DB_PASSWORD', 'REDIS_AUTH', 'JWT_SECRET', 'EMAIL_ENCRYPTION_KEY', 'ENCRYPTION_KEY', 'ADMIN_INIT_PASSWORD']
missing = [k for k in required if k not in keys]
print('Missing:', missing) if missing else print('✅ All required secrets present')
"

# 確認 .gitignore 涵蓋 secret 檔案
grep -E '\.env|secrets\.env' .gitignore && echo "✅ .gitignore OK" || echo "❌ .gitignore missing secret patterns"
```

---

## 4. Step-by-Step Setup

### 4.1 Clone & Configure

```bash
git clone git@github.com:pixel-pet-arena/pixel-pet-arena.git
cd pixel-pet-arena

git status
# Expected: On branch main / develop
```

### 4.2 Rancher Desktop 設定

```bash
# 1. 確認 k3s context 已注入
kubectl config get-contexts
# 應看到 rancher-desktop 並標示 *（current）

kubectl config use-context rancher-desktop

# 2. 確認 K8s API server 可連線
kubectl cluster-info
# Expected: Kubernetes control plane is running at https://127.0.0.1:6443

# 3. 建立本地 namespace
kubectl create namespace pixel-pet-arena-local --dry-run=client -o yaml | kubectl apply -f -

# 4. 設定 /etc/hosts（一次性）— 讓 Ingress domain 可解析
echo "127.0.0.1   pixel-pet-arena.local api.pixel-pet-arena.local admin.pixel-pet-arena.local" | sudo tee -a /etc/hosts
```

### 4.3 建立 K8s Secret

Secret 不走 ConfigMap，不提交到 git。Local 環境全為開發假值，直接從範例複製即可，**無需人工填寫**：

```bash
# 從範例複製（local 假值，不需修改）
[[ ! -f k8s/overlays/local/secrets.env ]] && \
  cp k8s/overlays/local/secrets.example.env k8s/overlays/local/secrets.env

# 建立 K8s Secret（從 secrets.env 讀取，並執行 bootstrap 隨機 secret）
make k8s-init
# 等同執行：
# 1) ./scripts/bootstrap-secrets.sh                      # 生成 ephemeral 隨機 secrets
# 2) kubectl create secret generic pixel-pet-arena-api-secret \
#      --from-env-file=k8s/overlays/local/secrets.env \
#      -n pixel-pet-arena-local --dry-run=client -o yaml | kubectl apply -f -
```

> `k8s/overlays/local/secrets.env` 已加入 `.gitignore`。`secrets.example.env` 是變數名稱的唯一來源；新增變數時需同步更新範例檔案。

### 4.4 Build & 載入 Image

Rancher Desktop 使用 containerd runtime，需用 nerdctl build 並直接載入 k3s 內部 registry（不需 push）。

```bash
# 一次 build 全部 image
make image-build-all

# 等同：
nerdctl build -t pixel-pet-arena/api:local    -f docker/api/Dockerfile    .
nerdctl build -t pixel-pet-arena/worker:local -f docker/worker/Dockerfile .
nerdctl build -t pixel-pet-arena/web:local    -f docker/web/Dockerfile    .
nerdctl build -t pixel-pet-arena/admin:local  -f docker/admin/Dockerfile  .

# 確認 image 存在
nerdctl images | grep pixel-pet-arena
```

> **imagePullPolicy：** 本地環境所有 Deployment 設定 `imagePullPolicy: Never`，確保使用本機 build 的 image，不從 registry 拉取。

> **客戶端引擎特定 Build 說明**（`_CLIENT_ENGINE = "Phaser 3 over HTML5 Canvas"`，標準 Web HTML5 / Phaser）：
>
> | 引擎類型 | Dockerfile 策略 | `make image-build-web` 前置步驟 |
> |---------|----------------|-------------------------------|
> | Web / HTML5 / **Phaser 3**（本專案） | multi-stage：`node:20 build` → Vite 產出 `dist/` → `nginx:alpine` serve | 無，直接執行 `make image-build-web`；CI 與本機相同 |
>
> Phaser 3 編譯為靜態資產 (HTML + JS + sprite assets)，nginx 透過 `/` 路徑提供；無 Unity/Cocos License 限制，無 Editor 預先 build。

> **Admin Frontend Build 約束**（has_admin_backend=true，必須遵守）：
>
> ```ts
> // apps/admin/vite.config.ts — base path 必須與 Ingress /admin 路徑一致
> import { defineConfig } from 'vite';
> export default defineConfig({
>   base: '/admin/',
>   // ...
> });
> ```
>
> 打包驗證指令（確認 asset path 含 `/admin/` 前綴）：
>
> ```bash
> nerdctl run --rm pixel-pet-arena/admin:local sh -c 'cat /usr/share/nginx/html/index.html' \
>   | grep -q 'src="/admin/' && echo "OK: base path correct" || echo "ERROR: missing /admin/ base"
> ```

### 4.5 部署所有 K8s 資源

> **Iron Constraint — Replicas ≥ 2**：本地環境 `api-server` 與 `worker` 的 `spec.replicas` 均設為 **2**（EDD §3.7.3 Min-HA 強制；HC-1）。任何 < 2 視為 SPOF，CI gate 拒絕。

```bash
# 使用 Kustomize 部署 local overlay
make k8s-apply
# 等同：
# kubectl apply -k k8s/overlays/local/

# 觀察 Pod 啟動狀態（Ctrl+C 結束）
kubectl get pods -n pixel-pet-arena-local -w

# 等待全部 Ready
kubectl wait --for=condition=Ready pods --all -n pixel-pet-arena-local --timeout=180s
```

預期 Pod 狀態（全部 `Running`）：

> Local 環境 API Server 維持 ≥ 2 replica，用以驗證 HA 邏輯（共享 session、distributed lock via Redis SETNX、cross-replica pub/sub）。詳見 EDD §3.7 圖 B。

```
NAME                              READY   STATUS    RESTARTS   AGE
api-server-<hash1>                1/1     Running   0          60s
api-server-<hash2>                1/1     Running   0          60s
worker-<hash1>                    1/1     Running   0          60s
worker-<hash2>                    1/1     Running   0          60s
web-app-<hash>                    1/1     Running   0          60s
admin-app-<hash>                  1/1     Running   0          60s
postgres-0                        1/1     Running   0          60s
redis-0                           1/1     Running   0          60s
minio-<hash>                      1/1     Running   0          60s
mailpit-<hash>                    1/1     Running   0          60s
pgadmin-<hash>                    1/1     Running   0          60s
```

**HA 副本數驗證**：

```bash
kubectl get pods -n pixel-pet-arena-local -l app=api-server
# Expected: 2 個 api-server Pod 狀態為 Running

kubectl get pods -n pixel-pet-arena-local -l app=worker
# Expected: 2 個 worker Pod 狀態為 Running
```

如有 Pod 停在 `Pending` 或 `CrashLoopBackOff`，請見 §10。

### 4.6 初始化資料庫

> **遷移工具**：本專案使用 SQL migrations + pnpm script `db:migrate`（無 ORM 自動遷移）。Migration SQL 檔位於 `db/migrations/V001_*` ~ `V021_*`（見 SCHEMA.md §8.1）。

```bash
# 執行所有 pending migration
make db-migrate
# 等同：
# kubectl exec -n pixel-pet-arena-local deploy/api-server -- pnpm db:migrate

# 載入 seed / fixture 資料
make db-seed
# 等同：
# kubectl exec -n pixel-pet-arena-local deploy/api-server -- pnpm db:seed
```

預期 migration 輸出：

```
Running migration V001_create_enums.sql                OK
Running migration V002_create_claim_identities.sql     OK
Running migration V003_create_claim_codes.sql          OK
Running migration V004_create_gdpr_requests.sql        OK
Running migration V005_create_pets.sql                 OK
Running migration V006_create_training_logs.sql        OK
Running migration V007_create_food_buffs.sql           OK
Running migration V008_create_arena_matches.sql        OK
Running migration V009_create_leaderboard_snapshots.sql OK
Running migration V010_create_admin_users.sql          OK
Running migration V011_create_audit_logs.sql           OK
...
All migrations applied. Schema is up to date.
```

### 4.7 驗證所有服務健康

```bash
make health-check
```

個別驗證：

```bash
# Player（web-app）透過 Ingress
curl -s -o /dev/null -w "%{http_code}\n" http://pixel-pet-arena.local/
# Expected: 200

# Admin SPA 透過 Ingress
curl -s -o /dev/null -w "%{http_code}\n" http://pixel-pet-arena.local/admin/
# Expected: 200

# API health 透過 Ingress
curl -s http://pixel-pet-arena.local/api/health | python3 -m json.tool
# Expected: {"status":"healthy","checks":{"database":"ok","redis":"ok"},"version":"<sha>"}

# PostgreSQL（port-forward 後）
kubectl port-forward -n pixel-pet-arena-local statefulset/postgres 5432:5432 &
# ⚠️  WARNING: 密碼 'secret' 僅為本機開發預設值，staging / production 環境禁止使用。
psql "postgres://app:secret@localhost:5432/pixel_pet_arena_dev" -c "SELECT 1;"
# Expected: 1 row

# Redis（port-forward 後）
kubectl port-forward -n pixel-pet-arena-local statefulset/redis 6379:6379 &
redis-cli ping
# Expected: PONG
```

### 4.8 單一子系統獨立啟動驗證（Decomposability Test）

此步驟驗證每個 Bounded Context 可以在其他 BC 完全不運行的情況下獨立冷啟動，確認微服務可拆解性（HC-2 / HC-4）。

> **何時執行：** (1) 新增跨 BC 依賴前 (2) 每週架構守護 CI (3) BC 提取前的可行性確認

```bash
# 啟動基礎設施（DB、Redis）但不啟動其他 BC 的 API
make k8s-apply-infra        # 僅部署 postgres, redis, minio, mailpit

# 啟動單一 BC（其他 BC 以 WireMock stub 替代）
make k8s-apply-bc BC=pet
# 等同：
# kubectl apply -k k8s/overlays/local-bc-pet/
# （此 overlay 只包含 pet BC routes 啟用 + 其依賴 BC 的 WireMock stub）

# 驗證 pet BC 獨立健康
curl -s http://pixel-pet-arena.local/api/health | python3 -c "import sys,json; print(json.load(sys.stdin)['subsystems']['pet'])"
# Expected: {"status":"up","tables":["pets","training_logs","food_buffs"]}

# 執行單一 BC 的整合測試（其他 BC 為 stub）
make test-integration-bc BC=pet
# Expected: 所有 pet BC 測試通過；跨 BC 呼叫命中 WireMock stub（HTTP 200 mock response）

# 清理
make k8s-delete-bc BC=pet
```

**各 BC 獨立啟動指令對照：**

| BC | 啟動指令 | Stub 替代的其他 BC | 健康檢查 URL |
|----|---------|-------------------|------------|
| identity | `make k8s-apply-bc BC=identity` | pet, arena, leaderboard, admin | `/api/health?bc=identity` |
| pet | `make k8s-apply-bc BC=pet` | identity, arena, leaderboard, admin | `/api/health?bc=pet` |
| arena | `make k8s-apply-bc BC=arena` | identity, pet, leaderboard, admin | `/api/health?bc=arena` |
| leaderboard | `make k8s-apply-bc BC=leaderboard` | identity, pet, arena, admin | `/api/health?bc=leaderboard` |
| admin | `make k8s-apply-bc BC=admin` | identity, pet, arena, leaderboard | `/admin/api/health?bc=admin` |

> **Stub 設定位置：** `k8s/overlays/local-bc-<bc>/wiremock-<dep_bc>.yaml`
> WireMock mapping 來源：`apps/api/test/wiremock/<dep_bc>/**/*.json`（與 Pact Consumer test 共用 stub 定義）

---

## 5. Service Reference

### Ingress 存取（需 /etc/hosts 設定）

| 服務 | URL | 說明 |
|------|-----|------|
| web-app（Player） | `http://pixel-pet-arena.local/` | React + Phaser 3 前端 |
| **admin-app（Vue 3 SPA）** | `http://pixel-pet-arena.local/admin/` | Admin 後台 SPA（`base: '/admin/'`）|
| api-server | `http://pixel-pet-arena.local/api` | REST API（Fastify 4）|
| mailpit web UI | `http://pixel-pet-arena.local/mailpit` | 攔截所有 outgoing email |
| minio console | `http://pixel-pet-arena.local/minio-console` | 物件儲存 web UI |
| pgadmin | `http://pixel-pet-arena.local/pgadmin` | 資料庫瀏覽器 |

> **Admin SPA 路由限制（has_admin_backend=true 必讀）：**
> Admin 前端打包時 **必須** 設定 `base: '/admin/'`（Vite）。
> Admin container 內建 nginx 必須含 SPA fallback（`try_files $uri $uri/ /admin/index.html;`），
> 否則 `/admin/users/123` 等子路徑 reload 時會 404。詳見下方 §5 Ingress YAML 與 nginx.conf 片段。

### kubectl port-forward 存取（直連 Pod / Service）

| 服務 | 指令 | 本地 URL |
|------|------|---------|
| api-server | `kubectl port-forward -n pixel-pet-arena-local deploy/api-server 8080:8080` | `http://localhost:8080` |
| postgres | `kubectl port-forward -n pixel-pet-arena-local statefulset/postgres 5432:5432` | `localhost:5432` |
| redis | `kubectl port-forward -n pixel-pet-arena-local statefulset/redis 6379:6379` | `localhost:6379` |
| minio (S3 API) | `kubectl port-forward -n pixel-pet-arena-local deploy/minio 9000:9000` | `http://localhost:9000` |
| mailpit (web UI) | `kubectl port-forward -n pixel-pet-arena-local deploy/mailpit 8025:8025` | `http://localhost:8025` |
| pgadmin | `kubectl port-forward -n pixel-pet-arena-local deploy/pgadmin 5050:80` | `http://localhost:5050` |

> **Make shortcuts：** `make pf-api`、`make pf-db`、`make pf-redis`、`make pf-minio`、`make pf-mail`、`make pf-pgadmin`、`make pf-all`、`make pf-stop`。

### Admin SPA Ingress 設定（has_admin_backend=true 強制）

**`k8s/overlays/local/ingress.yaml`（完整 Ingress 設定，路由順序：`/api` → `/admin` → `/`）：**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: pixel-pet-arena-local
  namespace: pixel-pet-arena-local
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
spec:
  ingressClassName: traefik
  rules:
    - host: pixel-pet-arena.local
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-server-svc
                port:
                  number: 8080
          - path: /admin
            pathType: Prefix
            backend:
              service:
                name: admin-app-svc
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app-svc
                port:
                  number: 80
```

> **Traefik 版本注意：** k3s 內建 Traefik 不支援 nginx 風格 `configuration-snippet` annotation。SPA fallback 需在 admin container 自身的 nginx 處理（見下方 nginx.conf）。

**Admin SPA nginx.conf（`docker/admin/nginx.conf`，container 內建）：**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA deep-link fallback（配合 base: '/admin/' 打包設定）
    location /admin {
        try_files $uri $uri/ /admin/index.html;
    }

    # 健康檢查（K8s liveness / readiness probe）
    location /healthz {
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }
}
```

**Admin 前端打包設定（必須與 Ingress base path 一致）：**

```ts
// apps/admin/vite.config.ts
import { defineConfig } from 'vite';
export default defineConfig({
  base: '/admin/',   // 必須與 Ingress /admin 路徑一致；若改路徑，nginx.conf 須同步更新
  // ...
});
```

**驗證 Admin SPA Ingress 正確性：**

```bash
# 1. 驗證 /admin 根路徑可存取
curl -s -o /dev/null -w "%{http_code}\n" http://pixel-pet-arena.local/admin/
# Expected: 200

# 2. 驗證 deep link reload（SPA 子路徑）
curl -s -o /dev/null -w "%{http_code}\n" http://pixel-pet-arena.local/admin/users/123
# Expected: 200（不得回傳 404）

# 3. 驗證靜態資源路徑正確（必須含 /admin/ 前綴）
curl -s http://pixel-pet-arena.local/admin/ | grep -o 'src="/admin/[^"]*"' | head -3
# Expected: src="/admin/assets/index-xxx.js" 等（不得出現 src="/assets/xxx.js"）
```

---

## 6.0 Monorepo Package 命名一致性（前置強制規則）

本文件所有 `pnpm --filter <name>` 與目錄路徑均依據 EDD §3.8.1 授權的 package name：

| 正確（EDD §3.8.1 授權）| 錯誤（禁止使用）|
|---------------------|-------------------|
| `pnpm --filter @pixel-pet-arena/api`  → 或 `pnpm --filter api`        | `pnpm --filter apps/api` |
| `pnpm --filter @pixel-pet-arena/worker` → 或 `pnpm --filter worker`     | — |
| `pnpm --filter @pixel-pet-arena/web`    → 或 `pnpm --filter web`        | `pnpm --filter player-app` |
| `pnpm --filter @pixel-pet-arena/admin`  → 或 `pnpm --filter admin`      | `pnpm --filter admin-app` |
| `cd apps/web && pnpm dev`                                                | `cd apps/player && pnpm dev` |

> 統一 monorepo 名稱以 `@pixel-pet-arena/<short>` 為原則；`--filter` 接受 short name 或 fully-qualified name。

---

## 6. Development Commands

所有 `make` 指令從 repo root 執行。

### Image & Deployment

| 指令 | 等同底層命令 | 使用時機 |
|------|------------|---------|
| `make image-build-api` | `nerdctl build -t pixel-pet-arena/api:local -f docker/api/Dockerfile .` | 修改後端程式碼後 |
| `make image-build-worker` | `nerdctl build -t pixel-pet-arena/worker:local -f docker/worker/Dockerfile .` | 修改 worker job 後 |
| `make image-build-web` | `nerdctl build -t pixel-pet-arena/web:local -f docker/web/Dockerfile .` | 修改 Player 前端後 |
| `make image-build-admin` | `nerdctl build -t pixel-pet-arena/admin:local -f docker/admin/Dockerfile .` | 修改 Admin 前端後 |
| `make image-build-all` | 依序執行上四條 nerdctl build 命令 | 初次設定或全面更新 |
| `make k8s-apply` | `kubectl apply -k k8s/overlays/local/` | 變更 K8s manifest 後 |
| `make k8s-restart-api` | `kubectl rollout restart deploy/api-server -n pixel-pet-arena-local` | Build 新 image 後套用 |
| `make k8s-restart-worker` | `kubectl rollout restart deploy/worker -n pixel-pet-arena-local` | Build 新 image 後套用 |
| `make k8s-restart-web` | `kubectl rollout restart deploy/web-app -n pixel-pet-arena-local` | Build 新 image 後套用 |
| `make k8s-restart-admin` | `kubectl rollout restart deploy/admin-app -n pixel-pet-arena-local` | Build 新 image 後套用 |
| `make k8s-restart-all` | `kubectl rollout restart deployment --all -n pixel-pet-arena-local` | 更新 ConfigMap / Secret 後 |
| `make k8s-delete` | `kubectl delete -k k8s/overlays/local/` | 重新部署時（保留 PVC）|
| `make k8s-clean` | `kubectl delete namespace pixel-pet-arena-local` | 完全重置（銷毀所有資料）|

### 觀察 & 偵錯

| 指令 | 說明 |
|------|------|
| `make pods` | `kubectl get pods -n pixel-pet-arena-local` |
| `make logs-api` | `kubectl logs -f deploy/api-server -n pixel-pet-arena-local` |
| `make logs-worker` | `kubectl logs -f deploy/worker -n pixel-pet-arena-local` |
| `make logs-web` | `kubectl logs -f deploy/web-app -n pixel-pet-arena-local` |
| `make logs-admin` | `kubectl logs -f deploy/admin-app -n pixel-pet-arena-local` |
| `make shell-api` | `kubectl exec -it deploy/api-server -n pixel-pet-arena-local -- sh` |
| `make shell-db` | `kubectl exec -it -n pixel-pet-arena-local statefulset/postgres -- psql -U app -d pixel_pet_arena_dev` |
| `make health-check` | 依序執行 `curl -s http://pixel-pet-arena.local/api/health`、`kubectl get pods -n pixel-pet-arena-local`（見 §4.7 個別驗證）|
| `make k9s` | `k9s -n pixel-pet-arena-local`（需已安裝 k9s）|

### 測試

| 指令 | 說明 |
|------|------|
| `make test-unit` | 在本機執行 unit test（不需 K8s）— 等同 `pnpm test`（Vitest） |
| `make test-integration` | `kubectl exec -it deploy/api-server -n pixel-pet-arena-local -- pnpm test:integration` |
| `make test-e2e` | 執行 E2E test（Playwright）— 等同 `pnpm exec playwright test --base-url http://pixel-pet-arena.local` |
| `make lint` | Lint 全部原始碼 — 等同 `pnpm lint`（ESLint + tsc --noEmit） |

### 子系統隔離測試（Modular Monolith HC-1/HC-2）

| 指令 | 說明 |
|------|------|
| `make k8s-apply-infra` | 只啟動基礎設施（DB / Redis / MinIO / Mailpit），不啟動任何 BC |
| `make k8s-apply-bc BC=<bc_name>` | 啟動指定 BC，其他 BC 以 WireMock stub 替代（見 §4.8） |
| `make k8s-delete-bc BC=<bc_name>` | 移除指定 BC 的 K8s 資源 |
| `make test-integration-bc BC=<bc_name>` | 執行指定 BC 的整合測試（其他 BC 為 stub） |
| `make test-pact-consumer` | 執行所有 Pact Consumer 測試（記錄 interaction） |
| `make test-pact-provider BC=<bc_name>` | 執行指定 BC 的 Pact Provider 驗證 |
| `make test-schema-isolation` | 執行跨 BC SQL 違規掃描（HC-1）— 應輸出 `cross_bc_queries: 0` |

---

## 7. Database Operations

### 進入 psql Shell

> ⚠️ **安全注意：** 下方連線字串中的密碼 `secret` 僅為本機開發預設值，禁止複製至 staging / production 環境。正式環境請從 Vault / Supabase Secret Manager 取得憑證。

```bash
# 方法 1：透過 kubectl exec（不需 port-forward）
kubectl exec -it -n pixel-pet-arena-local statefulset/postgres -- \
  psql -U app -d pixel_pet_arena_dev

# 方法 2：port-forward 後用本地 psql client
kubectl port-forward -n pixel-pet-arena-local statefulset/postgres 5432:5432 &
# ⚠️  WARNING: 密碼 'secret' 僅為本機開發預設值，staging / production 環境禁止使用。
psql "postgres://app:secret@localhost:5432/pixel_pet_arena_dev"

# Make shortcut
make shell-db
```

### 執行 Migration

```bash
# 執行所有 pending migration
make db-migrate
# 等同：
# kubectl exec -n pixel-pet-arena-local deploy/api-server -- pnpm db:migrate

# 查看 migration 狀態
make db-status
# 等同：
# kubectl exec -n pixel-pet-arena-local deploy/api-server -- pnpm db:status

# Rollback 最後一個 migration
make db-rollback
# 等同：
# kubectl exec -n pixel-pet-arena-local deploy/api-server -- pnpm db:rollback
```

### Seed 測試資料

```bash
# 載入所有 seed（idempotent，可重複執行）
make db-seed

# 載入特定 seed
kubectl exec -n pixel-pet-arena-local deploy/api-server -- \
  pnpm db:seed --file seeds/admin.sql
```

### 重置為乾淨狀態

```bash
# Drop + recreate + migrate + seed（銷毀所有本地資料）
make db-reset
# Warning: PVC 內資料全部清除
```

### Backup / Restore

> ⚠️ **安全注意：** 下方連線字串中的密碼 `secret` 僅為本機開發預設值，禁止複製至 staging / production 環境。

```bash
# Backup（port-forward 後執行）
kubectl port-forward -n pixel-pet-arena-local statefulset/postgres 5432:5432 &
pg_dump "postgres://app:secret@localhost:5432/pixel_pet_arena_dev" \
  > backups/local-$(date +%Y%m%d-%H%M%S).sql

# Restore
psql "postgres://app:secret@localhost:5432/pixel_pet_arena_dev" \
  < backups/local-20260517-093000.sql
```

---

## 8. Test Data & Fixtures

`make db-seed` 後以下帳號與資料固定可用（依 PRD 角色 + SCHEMA.md Seed Data 部分）。

### Default User Accounts

> Player 端無傳統帳號（採 6-digit OTP email claim → URL token），表中 Player 角色為「測試 pet 持有人」，登入透過 `http://pixel-pet-arena.local/pet/<token>` URL。

| Role | Email / Identity | Password / Token | 說明 |
|------|------------------|------------------|------|
| **Guest Player** | n/a | n/a（直接瀏覽 `/`）| 未認領寵物的訪客（觸發 random pet display）|
| **Pet Owner** | `owner@pixel-pet-arena.local` | URL token (seed 印出) | 已 claim 寵物，透過 URL token 存取 |
| **Arena Competitor** | `competitor@pixel-pet-arena.local` | URL token (seed 印出) | 排行榜上 active 競技者 |
| **Admin — super_admin** | `admin@pixel-pet-arena.local` | `Password1!` + TOTP | 全權限（含 GDPR、config）|
| **Admin — moderator** | `moderator@pixel-pet-arena.local` | `Password1!` + TOTP | 寵物與用戶 moderation |
| **Admin — read_only** | `readonly@pixel-pet-arena.local` | `Password1!` + TOTP | 只讀稽核 |

> Admin 密碼為 seed 預設值；正式啟用時請從 K8s Secret `ADMIN_INIT_PASSWORD` 讀取，並要求首次登入更改 + 設定 TOTP。

### Sample Data

| Entity（依 SCHEMA.md §3）| Count | 說明 |
|--------------------------|-------|------|
| `claim_identities` | 5 | 涵蓋已 hash / 未 hash / pending GDPR erasure |
| `claim_codes` | 10 | 涵蓋 active / used / expired（15-min 過期）|
| `pets` | 50 | 涵蓋 6 rarity tier、4 鎖定狀態（active / banned / archived / reserved）；含 1 隻 max-stat（100/100/100）邊界 pet；含 1 隻 Unicode CJK 名稱 |
| `training_logs` | 100 | 對應 50 pets × 不同 stat_delta；涵蓋 neglect 3 日 / 30 日邊界 |
| `food_buffs` | 20 | 涵蓋 active / consumed / expired（30d record_expires_at）|
| `arena_matches` | 50 | 涵蓋 RACE / SUMO 模式；涵蓋 completed / in_progress / abandoned |
| `leaderboard_snapshots` | 5 | 涵蓋過去 24 小時 5 個時點的 top-500 entries JSONB |
| `admin_users` | 3 | super_admin / moderator / read_only 各一 |
| `audit_logs` | 30 | 涵蓋 11 種 admin action 類型 |
| **Edge case set** | — | 含 1 row：所有 VARCHAR 欄位填到最大長度 + Unicode CJK + emoji；2 row：CONSTANTS 邊界值（`PET_STAT_MAX=100`、`ARENA_BATTLE_RECORDS_DISPLAY_COUNT=20` 邊緣）|

### pgadmin 登入

- URL：`http://pixel-pet-arena.local/pgadmin`（或 port-forward `5050`）
- Email：`admin@pixel-pet-arena.local`
- Password：從 `pixel-pet-arena-pgadmin-secret` 讀取（預設 `pgadmin-local-secret`，僅本機開發用；如需修改，請更新 `k8s/overlays/local/secrets.env` 並重新執行 `make k8s-init`）
- 新增 Server：Host = `postgres`（K8s service 名稱），Port = `5432`，DB = `pixel_pet_arena_dev`

---

## 9. ConfigMap & Secret Reference

### ConfigMap — `pixel-pet-arena-api-config`

| Key | Default | 說明 |
|-----|---------|------|
| `NODE_ENV` | `development` | Runtime 環境 |
| `PORT` | `8080` | API 監聽 port（K8s service port）|
| `WORKER_PORT` | `8081` | Worker health probe port |
| `DATABASE_URL` | `postgres://app:secret@postgres:5432/pixel_pet_arena_dev` | PostgreSQL 連線字串（K8s service DNS）|
| `REDIS_URL` | `redis://redis:6379/0` | Redis 連線字串 |
| `LOG_LEVEL` | `debug` | `debug` / `info` / `warn` / `error` |
| `CORS_ORIGINS` | `http://pixel-pet-arena.local` | 允許的 CORS origins |
| `STORAGE_ENDPOINT` | `http://minio:9000` | S3-compatible storage URL |
| `STORAGE_BUCKET` | `pixel-pet-arena-local` | 預設 bucket 名稱 |
| `SMTP_HOST` | `mailpit` | SMTP server（K8s service DNS）|
| `SMTP_PORT` | `1025` | SMTP port |
| `ADMIN_TOTP_ISSUER` | `pixel-pet-arena-local` | TOTP issuer name |
| `FF_MARKETPLACE` | `false` | Feature flag for Marketplace BC（P2）|
| `FF_ARENA_SUMO` | `true` | Feature flag for Arena Sumo mode（P1）|

### ConfigMap — `pixel-pet-arena-web-config`（Player）

| Key | Default | 說明 |
|-----|---------|------|
| `VITE_API_BASE_URL` | `http://pixel-pet-arena.local/api` | Player 前端 API base URL（由 Ingress 路由）|
| `VITE_ENV` | `local` | 環境識別 |
| `VITE_FEATURE_FLAGS` | `{"FF_ARENA_SUMO":true}` | Player 前端可見的 Feature flag |

### ConfigMap — `pixel-pet-arena-admin-config`（Admin）

| Key | Default | 說明 |
|-----|---------|------|
| `VITE_ADMIN_API_BASE_URL` | `http://pixel-pet-arena.local/admin/api` | Admin 前端 API base URL |
| `VITE_ADMIN_BASE_PATH` | `/admin/` | 必須與 `vite.config.ts base` 一致 |
| `VITE_ENV` | `local` | 環境識別 |

### Secret — `pixel-pet-arena-api-secret`（從 `k8s/overlays/local/secrets.env` + `app-secrets` 建立）

| Key | 說明 | 設定方式 |
|-----|------|---------|
| `DB_PASSWORD` | PostgreSQL `app` user 密碼 | `bootstrap-secrets.sh` 隨機生成 |
| `REDIS_AUTH` | Redis password（若啟用 AUTH）| `bootstrap-secrets.sh` 隨機生成 |
| `JWT_SECRET` | Admin TOTP setup token signing key | `bootstrap-secrets.sh` 隨機生成（64 byte）|
| `EMAIL_ENCRYPTION_KEY` | AES-256-GCM key（32 byte），加密儲存 email | `bootstrap-secrets.sh` 隨機生成 |
| `ENCRYPTION_KEY` | 通用 envelope encryption key | `bootstrap-secrets.sh` 隨機生成 |
| `ADMIN_INIT_PASSWORD` | seed admin 帳號初始密碼 | `bootstrap-secrets.sh` 隨機生成（16 char） |
| `SENDGRID_API_KEY` | 本機假值（任意非空字串即可）| `secrets.env` |
| `STORAGE_ACCESS_KEY` | MinIO access key（local 假值）| `secrets.env` |
| `STORAGE_SECRET_KEY` | MinIO secret key（local 假值）| `secrets.env` |

### 查看目前 ConfigMap / Secret

```bash
# 查看 ConfigMap 內容
kubectl get configmap pixel-pet-arena-api-config -n pixel-pet-arena-local -o yaml

# 查看 Secret key 清單（值會 base64 遮罩）
kubectl get secret pixel-pet-arena-api-secret -n pixel-pet-arena-local -o yaml

# 解碼特定 secret 值（謹慎使用，僅 debug）
kubectl get secret app-secrets -n pixel-pet-arena-local \
  -o jsonpath='{.data.JWT_SECRET}' | base64 -d
```

### 更新 ConfigMap / Secret 並套用

```bash
# 修改 ConfigMap
kubectl edit configmap pixel-pet-arena-api-config -n pixel-pet-arena-local
# 或直接重新 apply：
kubectl apply -k k8s/overlays/local/

# 更新後需 rolling restart 才生效
make k8s-restart-all
```

---

## 10. Common Issues & Fixes

| Issue | Symptom | Root Cause | Fix |
|-------|---------|------------|-----|
| Pod stuck in `Pending` | `kubectl get pods` 顯示 Pending | 資源不足或 namespace 未建立 | `kubectl describe pod <name> -n pixel-pet-arena-local` 查看 Events；增加 Rancher Desktop RAM 至 8 GB（建議 12 GB）|
| Pod in `CrashLoopBackOff` | Pod 反覆重啟 | 應用程式啟動失敗（env 缺失、DB 未就緒）| `kubectl logs <pod> -n pixel-pet-arena-local --previous` 查看上次崩潰日誌 |
| `ImagePullBackOff` | Pod 無法找到 image | image 未 build 或 tag 錯誤 | `nerdctl images \| grep pixel-pet-arena`；重新執行 `make image-build-all`；確認 Deployment 為 `imagePullPolicy: Never` |
| Ingress 無法解析 | `curl: Could not resolve host pixel-pet-arena.local` | /etc/hosts 未設定 | 確認 `/etc/hosts` 含 `127.0.0.1 pixel-pet-arena.local`；`kubectl get pod -n kube-system -l app.kubernetes.io/name=traefik` 確認 traefik Running |
| DB 連線拒絕 | api-server log: `ECONNREFUSED postgres` | postgres pod 未就緒 / K8s DNS 異常 | `kubectl wait --for=condition=Ready pod/postgres-0 -n pixel-pet-arena-local --timeout=60s`；`kubectl exec deploy/api-server -n pixel-pet-arena-local -- nslookup postgres` |
| Migration 失敗（`relation already exists`） | `pnpm db:migrate` 報錯 | Migration 被部分執行過 | `make db-reset`（銷毀資料）；或 `kubectl exec deploy/api-server -- pnpm db:migrate:resolve --applied V00X`（手動標記）|
| Secret 找不到 | Pod 事件：`secret "app-secrets" not found` | `make k8s-init` 未執行 | 重新執行 `make k8s-init` → `kubectl get secret -n pixel-pet-arena-local` 確認 |
| port-forward 斷線 | port-forward 背景 process 結束 | 網路超時或 Pod 重啟 | `make pf-api`（會在背景自動重啟）；或在另一個 terminal 重新執行 |
| Rancher Desktop K8s 未啟動 | `kubectl: The connection to the server localhost:8080 was refused` | k3s 服務未運行 | 開啟 Rancher Desktop GUI → **Kubernetes** 頁面確認已啟用並等待 Ready |
| nerdctl build 失敗（network） | Build 時 `npm install` 連線失敗 | containerd sandbox DNS 問題 | 嘗試 `nerdctl build --network=host ...`；或重啟 Rancher Desktop |
| 舊 ConfigMap 未更新 | 修改 configmap 後服務行為未變 | Pod 未重啟，仍用舊版設定 | `make k8s-restart-all` |
| **Admin 靜態資源 404** | `curl http://pixel-pet-arena.local/admin/` 回 404，或 `.js`/`.css` 回 404 | Admin 前端未設定 `base: '/admin/'`，打包 asset path 以 `/` 為根 | 確認 `apps/admin/vite.config.ts` 含 `base: '/admin/'`；重新建置：`make image-build-admin && make k8s-restart-admin` |
| **Admin 頁面 Refresh 後 404** | 直接訪問 `/admin/users` 回 404 | admin-app nginx 未設定 SPA fallback | 確認 `docker/admin/nginx.conf` 含 `try_files $uri $uri/ /admin/index.html;`；參考 §5 nginx.conf 範例 |
| Redis maxmemory 警告 | `OOM command not allowed when used memory > 'maxmemory'` | Redis dev 預設無 maxmemory 上限導致 PVC 撐爆 | 編輯 `k8s/base/redis/configmap.yaml`：`maxmemory 256mb` + `maxmemory-policy allkeys-lru`；`make k8s-restart-all` |
| TOTP 失效 / 密碼遺失 | Admin login 卡在 TOTP step | seed 印出的 TOTP secret 未保存 | `kubectl exec deploy/api-server -n pixel-pet-arena-local -- pnpm db:seed --reset-admin`；新 TOTP secret 印至 stdout，重新加入 authenticator app |

---

## 11. Logs & Debugging

### 查看 Pod 日誌

```bash
# 即時 tail 指定服務
kubectl logs -f deploy/api-server  -n pixel-pet-arena-local
kubectl logs -f deploy/worker      -n pixel-pet-arena-local
kubectl logs -f deploy/web-app     -n pixel-pet-arena-local
kubectl logs -f deploy/admin-app   -n pixel-pet-arena-local
kubectl logs -f statefulset/postgres -n pixel-pet-arena-local
kubectl logs -f statefulset/redis    -n pixel-pet-arena-local

# Make shortcuts
make logs-api
make logs-worker
make logs-web
make logs-admin

# 查看上次 crash 日誌
kubectl logs deploy/api-server -n pixel-pet-arena-local --previous

# 多 container pod（若有 sidecar）
kubectl logs deploy/api-server -n pixel-pet-arena-local -c api-server
```

### 進入 Pod Shell

```bash
# api-server shell
kubectl exec -it deploy/api-server -n pixel-pet-arena-local -- sh
# Make shortcut：
make shell-api

# 查看環境變數（含 ConfigMap + Secret 注入的值）
kubectl exec deploy/api-server -n pixel-pet-arena-local -- env | sort

# 在 pod 內執行一次性指令
kubectl exec deploy/api-server -n pixel-pet-arena-local -- node --version
```

### 查看 Pod 事件（啟動失敗時最有用）

```bash
kubectl describe pod <pod-name> -n pixel-pet-arena-local
# 重點看 Events 區塊的 Warning 訊息
```

### 常見 Log 模式

| Pattern | 含義 | 處理 |
|---------|------|------|
| `[ERROR] Database connection failed` | postgres pod 未就緒或 K8s DNS 解析失敗 | 確認 postgres pod Running；確認 Service 名稱為 `postgres` |
| `[WARN] Redis connection lost, retrying` | Redis 暫時不可用 | 通常自動恢復；`kubectl get pod redis-0 -n pixel-pet-arena-local` |
| `[ERROR] Migration V00X_create_*.sql failed` | Migration SQL 異常 | 查看完整錯誤訊息；`make db-rollback` 或手動修正 migration 狀態 |
| `[INFO] Worker job gdpr-erasure completed` | GDPR Erasure 工作正常完成 | 正常，無需處理 |
| `[INFO] Worker job leaderboard-snapshot completed` | Leaderboard snapshot 工作正常完成 | 正常，無需處理 |
| `[ERROR] Worker job gdpr-erasure failed after 3 retries` | Job 已耗盡重試次數 | 查看 job 參數；確認外部服務可用；檢視 audit_logs |

### 使用 k9s（推薦）

```bash
# 開啟 k9s，自動切換至 local namespace
k9s -n pixel-pet-arena-local
# 在 k9s 內：
#   :pod   — 查看所有 pod
#   :log   — 查看 log
#   s      — 進入 pod shell
#   d      — describe resource
#   Ctrl+K — 刪除 resource
```

---

## 12. Port Reference

### Ingress（需 /etc/hosts 設定）

| Path | 服務 | 說明 |
|------|------|------|
| `http://pixel-pet-arena.local/` | web-app | Player 前端（React 18 + Phaser 3）|
| `http://pixel-pet-arena.local/admin/` | admin-app | Admin Portal（Vue 3 + Element Plus） |
| `http://pixel-pet-arena.local/api` | api-server | REST API（含 `/api/health`、`/api/docs`） |
| `http://pixel-pet-arena.local/admin/api` | api-server | Admin REST API（mounted under `/admin/api/*`） |
| `http://pixel-pet-arena.local/mailpit` | mailpit | Email 預覽 UI |
| `http://pixel-pet-arena.local/minio-console` | minio console | 物件儲存 web UI |
| `http://pixel-pet-arena.local/pgadmin` | pgadmin | 資料庫瀏覽器 |

### port-forward（直連 ClusterIP Service）

| 服務 | 指令 | 本地 Port |
|------|------|---------|
| api-server | `make pf-api` | `8080` |
| web-app（偵錯用，通常透過 Ingress 存取） | `kubectl port-forward -n pixel-pet-arena-local deploy/web-app 5173:80` | `5173` |
| admin-app（偵錯用，通常透過 Ingress 存取） | `kubectl port-forward -n pixel-pet-arena-local deploy/admin-app 5174:80` | `5174` |
| postgres | `make pf-db` | `5432` |
| redis | `make pf-redis` | `6379` |
| minio (S3 API) | `make pf-minio` | `9000` |
| mailpit (web UI) | `make pf-mail` | `8025` |
| pgadmin | `make pf-pgadmin` | `5050` |

> 全部 port-forward：`make pf-all`。停止：`make pf-stop`。

---

## 13. Local HTTPS 設定

部分功能需要 HTTPS（OAuth 回調若未來導入、`SameSite=Secure` Cookie、Service Worker、ngrok https 一致性）。本專案 MVP 階段不使用 OAuth，可視需要選擇性執行本節。

```bash
# 1. 建立本地 CA（只需執行一次）
mkcert -install

# 2. 為本地 domain 生成憑證
mkcert "pixel-pet-arena.local" "*.pixel-pet-arena.local"
# 生成 pixel-pet-arena.local+1.pem 和 pixel-pet-arena.local+1-key.pem

# 3. 建立 K8s TLS Secret
kubectl create secret tls pixel-pet-arena-local-tls \
  --cert=pixel-pet-arena.local+1.pem \
  --key=pixel-pet-arena.local+1-key.pem \
  -n pixel-pet-arena-local \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. 啟用 HTTPS Ingress（已在 k8s/overlays/local/ 提供，預設 disabled）
# 編輯 k8s/overlays/local/kustomization.yaml，啟用 tls-ingress patch：
# patches:
#   - path: patches/ingress-tls.yaml   # 取消此行註解

kubectl apply -k k8s/overlays/local/
```

**`.gitignore` 補充憑證私鑰**：

```gitignore
pixel-pet-arena.local-key.pem
pixel-pet-arena.local+1-key.pem
```

---

## 14. Mock Services & External Integration Stubs

第三方服務在本地開發時使用 Mock，避免消耗真實 API 配額。所有 mock service 已包含在 K8s local overlay 內。

| 外部服務（EDD §2.1）| 本地替代方案 | K8s Service DNS | 說明 |
|---------------------|------------|----------------|------|
| **SendGrid v3**（transactional email）| **mailpit** | `mailpit:1025`（SMTP）/ `mailpit:8025`（web UI）| SMTP trap + web UI；本地端視 SendGrid API key 為任意非空假值 |
| **Nodemailer SMTP fallback** | **mailpit**（同上）| `mailpit:1025` | 與 SendGrid 共用同一 mailpit；測試 3-failure 切換邏輯時可注入 chaos |
| **Supabase（PostgreSQL）**| 本地 PostgreSQL StatefulSet | `postgres:5432` | 直接使用標準 PostgreSQL 15；不啟動 Supabase Studio stack |
| **Upstash Redis** | 本地 Redis StatefulSet | `redis:6379` | 標準 Redis 7-alpine；無 REST gateway，使用 ioredis 連線 |
| **Vercel CDN**（static assets）| 本地 nginx serve（直接由 web/admin Deployment 提供）| — | local 環境無 CDN；HTTP cache header 仍生效 |
| **S3-compatible Storage**（DB backups / object storage）| **minio** | `minio:9000`（API）/ `minio:9001`（console）| S3-compatible API；access key / secret 從 `app-secrets` 取得 |
| **Datadog / Grafana Cloud**（observability）| log to stdout（Pino）| — | 本地不上傳；APM / metrics 可選擇性啟動 Grafana stack（見 `k8s/overlays/local/grafana.yaml`，預設 disabled）|

### 14.1 跨 BC 內部 Stub（HC-2 驗證）

當只開發某個 BC 時，其他 BC 的 Public API 以 **WireMock stub** 替代，確保不需要啟動全部子系統、且程式碼只透過 Public API 呼叫（HC-2）。

**WireMock stub 設定位置：**

```
apps/api/test/wiremock/
  identity/
    get-identity-by-id.json    ← stub: GET /api/v1/identities/{id}
    verify-claim.json          ← stub: POST /api/v1/claim/verify
  pet/
    get-pet-by-id.json         ← stub: GET /api/v1/pets/{id}
    pet-train.json             ← stub: POST /api/v1/pets/{id}/train
  arena/
    get-match-by-id.json       ← stub: GET /api/v1/arena/matches/{id}
  leaderboard/
    get-top-100.json           ← stub: GET /api/v1/leaderboard?limit=100
```

**WireMock stub 範本（`get-pet-by-id.json`）：**

```json
{
  "request": {
    "method": "GET",
    "urlPathPattern": "/api/v1/pets/([a-f0-9-]+)"
  },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "jsonBody": {
      "id": "{{request.pathSegments.3}}",
      "name": "stub_pet",
      "rarity": "common",
      "stats": { "speed": 10, "strength": 10, "stamina": 10 }
    }
  }
}
```

**K8s WireMock Deployment（`k8s/overlays/local-bc-pet/wiremock-arena.yaml`）：**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wiremock-arena
  namespace: pixel-pet-arena-local
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: wiremock
          image: wiremock/wiremock:3.x
          args:
            - --root-dir=/home/wiremock
            - --port=8080
          volumeMounts:
            - name: stubs
              mountPath: /home/wiremock/mappings
      volumes:
        - name: stubs
          configMap:
            name: wiremock-arena-stubs
---
apiVersion: v1
kind: Service
metadata:
  name: arena-svc          # 與正式 service 同名，呼叫方零配置切換
  namespace: pixel-pet-arena-local
spec:
  selector:
    app: wiremock-arena
  ports:
    - port: 8080
      targetPort: 8080
```

> WireMock Service 名稱必須與正式 BC Service 同名，呼叫方程式碼不需修改即可在 stub / 真實 BC 之間切換（HC-2 的 Public API 封裝效益）。

---

## 15. Inner Loop — 快速迭代開發

每次修改程式碼後不需要重建整個環境。

### 後端（api-server / worker）

```bash
# 方法 1：重 build + rolling restart（約 30-60 秒）
make image-build-api && make k8s-restart-api
make image-build-worker && make k8s-restart-worker

# 方法 2：skaffold（自動偵測檔案變更，約 10-20 秒）
skaffold dev --profile local
# skaffold 會 watch 原始碼，變更後自動 build + sync + restart
```

### 前端（Web / HTML5 / **Phaser 3** Player client）

```bash
# 方法 1：重 build + rolling restart
make image-build-web && make k8s-restart-web

# 方法 2：本機 Vite dev server + 透過 port-forward 連 K8s 內 API（推薦 inner loop）
# Vite HMR 對 Phaser 3 source code 改動 < 1s 反映；遊戲 scene 熱重載
cd apps/web
pnpm dev   # localhost:5173 (Vite)
# 另一 terminal：
make pf-api   # localhost:8080 → K8s api-server
# apps/web/.env.local 設定 VITE_API_BASE_URL=http://localhost:8080
```

### 前端（**Admin Vue 3 + Element Plus** SPA）

```bash
# 方法 1：重 build + rolling restart
make image-build-admin && make k8s-restart-admin

# 方法 2：本機 Vite dev server（HMR）+ 連 K8s 內 API
cd apps/admin
pnpm dev   # localhost:5174 (Vite，base: '/admin/')
# 另一 terminal：
make pf-api
# apps/admin/.env.local 設定 VITE_ADMIN_API_BASE_URL=http://localhost:8080/admin/api
```

> Vue 3 single-file components 與 Pinia stores 改動即時 HMR；Element Plus 主題 token 變更需重新 build。

### 使用 skaffold（完整 inner loop）

`skaffold.yaml` 已設定在 repo root，`local` profile 對應 `k8s/overlays/local/`：

```bash
# 啟動 skaffold watch 模式（Ctrl+C 停止）
skaffold dev --profile local

# 一次性 build + deploy（不 watch）
skaffold run --profile local

# 清除 skaffold 部署的資源
skaffold delete --profile local
```

---

## 16. Cleanup

### 停止 port-forward

```bash
make pf-stop
```

### 刪除所有 K8s 資源（保留 PVC 資料）

```bash
make k8s-delete
# 等同：
kubectl delete -k k8s/overlays/local/
```

### 完全重置（刪除所有資源 + 資料）

```bash
make k8s-clean
# 等同：
kubectl delete namespace pixel-pet-arena-local
# Warning: 所有 PVC（資料庫、minio 資料）永久刪除
```

### 重建本地環境

```bash
make k8s-clean && make k8s-init && make image-build-all && make k8s-apply && \
  kubectl wait --for=condition=Ready pods --all -n pixel-pet-arena-local --timeout=180s && \
  make db-migrate && make db-seed
```

### 確認清除乾淨

```bash
kubectl get namespace pixel-pet-arena-local
# Expected: Error from server (NotFound)

nerdctl images | grep pixel-pet-arena
# 若需清除 local image：
nerdctl rmi pixel-pet-arena/api:local pixel-pet-arena/worker:local \
            pixel-pet-arena/web:local pixel-pet-arena/admin:local
```

---

## 17. Tunnel Access（單一對外 Port，AI 可測試模式）

所有服務均透過同一個 Ingress（port 80）路由，tunnel 只需暴露一個 port。

### ngrok（推薦）

```bash
# 安裝（一次性）
brew install ngrok

# 啟動 tunnel → Ingress port 80
ngrok http 80 --host-header=pixel-pet-arena.local

# 輸出範例：
# Forwarding  https://a1b2c3d4.ngrok-free.app -> http://localhost:80
# 記錄此 URL，後續測試步驟使用 _TUNNEL_URL
_TUNNEL_URL="https://a1b2c3d4.ngrok-free.app"
```

### Cloudflare Tunnel（無公開 URL 限制）

```bash
# 安裝 cloudflared（一次性）
brew install cloudflared

# 快速 tunnel（dev mode，無需帳號）
cloudflared tunnel --url http://localhost:80

# 輸出範例：
# https://random-name.trycloudflare.com
_TUNNEL_URL="https://random-name.trycloudflare.com"
```

### 設定 Ingress Host header（ngrok / tunnel 需）

Ingress 預設只接受 `pixel-pet-arena.local`，tunnel 需額外設定：

```bash
# 方法 1：啟動 ngrok 時加 --host-header（推薦）
ngrok http 80 --host-header=pixel-pet-arena.local

# 方法 2：Ingress 加 wildcard host（更彈性）
# 編輯 k8s/overlays/local/patches/ingress-tunnel.yaml：
# spec.rules[0].host: ""  # 空字串 = 接受所有 host
kubectl apply -k k8s/overlays/local/
```

### 驗證 Tunnel 可存取

```bash
# Player 前端 UI 可存取（HTTP 200）
curl -s -o /dev/null -w "%{http_code}\n" "${_TUNNEL_URL}/"
# Expected: 200

# Admin SPA 可存取
curl -s -o /dev/null -w "%{http_code}\n" "${_TUNNEL_URL}/admin/"
# Expected: 200

# API health 可存取
curl -s "${_TUNNEL_URL}/api/health" | python3 -m json.tool
# Expected: {"status":"healthy","checks":{"database":"ok","redis":"ok"},...}

# 開啟瀏覽器測試前端
open "${_TUNNEL_URL}"
```

---

## 18. AI Agent Quick Start

AI 代理可執行以下完整腳本，從零啟動完整本地環境並驗證前端可存取，**無需任何人工介入**。

```bash
#!/usr/bin/env bash
# ai-quickstart.sh — AI 一鍵啟動 Pixel Pet Arena 本地 K8s 環境
set -e

echo "=== [1/6] 確認 kubectl context ==="
kubectl config use-context rancher-desktop
kubectl cluster-info

echo "=== [2/6] 初始化 namespace + Secret（自動從 example 建立 local 假值）==="
# local 環境全為開發假值，直接從範例複製，無需人工填寫
[[ ! -f k8s/overlays/local/secrets.env ]] && \
  cp k8s/overlays/local/secrets.example.env k8s/overlays/local/secrets.env
make k8s-init

echo "=== [3/6] 建置所有 Image（api / worker / web / admin）==="
make image-build-all

echo "=== [4/6] 部署所有 K8s 資源 ==="
make k8s-apply
kubectl wait --for=condition=Ready pods --all \
  -n pixel-pet-arena-local --timeout=300s

echo "=== [5/6] 初始化資料庫 ==="
make db-migrate
make db-seed

echo "=== [6/6] 驗證環境健康 ==="
make health-check

echo ""
echo "✅ Pixel Pet Arena 本地環境已就緒"
echo "   Player UI → http://pixel-pet-arena.local"
echo "   Admin UI  → http://pixel-pet-arena.local/admin/"
echo "   API       → http://pixel-pet-arena.local/api/health"
echo ""
echo "如需 Tunnel 存取（AI 測試 / ngrok）："
echo "  ngrok http 80 --host-header=pixel-pet-arena.local"
```

> **AI 測試前端的完整流程**：執行 `ai-quickstart.sh` → 啟動 ngrok tunnel → 使用 Playwright 開啟 `_TUNNEL_URL` 驗證 Player 與 Admin 頁面可見、主要功能可操作（見 `features/client/*.feature`）。

---

## 19. Docker Compose（輔助方案）

> **定位**：Docker Compose 是 K8s 的 **輔助工具**，非主要部署方式。用於以下場景：
> - 不需要 K8s 完整功能時的快速驗證（如單純測試 API 回應）
> - CI 環境中的輕量 integration test
> - 開發者偏好 Docker Compose 作為入門較低門檻的初次了解環境
>
> **所有功能與行為必須與 K8s 環境一致**；如有差異，以 K8s 為準。

### 服務對照

| K8s Deployment / StatefulSet | Docker Compose Service | Image |
|------------------------------|------------------------|-------|
| api-server | `api` | `pixel-pet-arena/api:local` |
| worker | `worker` | `pixel-pet-arena/worker:local` |
| web-app | `web` | `pixel-pet-arena/web:local` |
| admin-app | `admin` | `pixel-pet-arena/admin:local` |
| postgres | `db` | `postgres:15-alpine` |
| redis | `cache` | `redis:7-alpine` |
| minio | `storage` | `minio/minio` |
| mailpit | `mail` | `axllent/mailpit` |

> **Iron Constraint — Replicas ≥ 2**：`services.api.deploy.replicas: 2`、`services.worker.deploy.replicas: 2`。

**`docker-compose.yml`（核心片段）：**

```yaml
services:
  api:
    image: pixel-pet-arena/api:local
    deploy:
      replicas: 2  # 本地 HA 最小副本數，禁止填 1
    env_file:
      - ./k8s/overlays/local/secrets.env
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/pixel_pet_arena_dev
      REDIS_URL: redis://cache:6379/0
    expose:
      - "8080"

  worker:
    image: pixel-pet-arena/worker:local
    deploy:
      replicas: 2  # 本地 HA 最小副本數，禁止填 1
    env_file:
      - ./k8s/overlays/local/secrets.env
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/pixel_pet_arena_dev
      REDIS_URL: redis://cache:6379/0
    expose:
      - "8081"

  web:
    image: pixel-pet-arena/web:local
    expose:
      - "80"

  admin:
    image: pixel-pet-arena/admin:local
    expose:
      - "80"

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: pixel_pet_arena_dev
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  storage:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  mail:
    image: axllent/mailpit
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # web UI

volumes:
  db_data:
  redis_data:
  minio_data:
```

### 啟動步驟

```bash
# 1. 確認 Docker 執行中（Rancher Desktop container engine 即可）
docker info

# 2. 建置所有 image
docker compose build

# 3. 啟動所有服務（背景執行）
docker compose up -d

# 4. 確認所有容器啟動
docker compose ps
# Expected: api 顯示 2 個 Running 實例、worker 顯示 2 個 Running 實例

# 5. 初始化資料庫
docker compose exec api pnpm db:migrate
docker compose exec api pnpm db:seed

# 6. 驗證 API 健康（透過 §19.1 nginx proxy）
curl -s http://localhost/api/health | python3 -m json.tool
# Expected: {"status":"healthy","checks":{"database":"ok","redis":"ok"},"version":"v3.0"}
```

### 對外 Port（docker-compose 模式，**無 nginx proxy 時各服務直連**）

| 服務 | 本地 Port | 說明 |
|------|---------|------|
| postgres | `5432` | DB（直連，本地工具用）|
| redis | `6379` | Cache（直連，本地工具用）|
| minio S3 API | `9000` | 物件儲存 |
| minio console | `9001` | minio web UI |
| mailpit SMTP | `1025` | SMTP server（供 api 寄信）|
| mailpit web UI | `8025` | Email 預覽 UI |

> **注意**：上表為 docker-compose 預設 expose 的 host port。如需與 K8s 一致的單一 port 80 模式，**必須**啟用下方 §19.1 nginx proxy 方案（Player + Admin + API + Mail 全部走 port 80）。

### 19.1 Docker Compose 單一 Port Nginx Proxy（整合 Player + Admin + API）

此方案讓 Docker Compose 模式與 K8s Ingress 行為完全一致：對外只暴露 port 80，適合分享測試連結（AI agent 測試 / QA 驗收 / 跨團隊協作）。

**`docker/nginx-proxy/nginx.conf`：**

```nginx
# docker/nginx-proxy/nginx.conf
# 單一對外 port 80；路由規則與 K8s Ingress 保持一致

events { worker_connections 1024; }

http {
    upstream api_backend {
        server api:8080;
    }

    upstream web_frontend {
        server web:80;
    }

    upstream admin_frontend {
        server admin:80;
    }

    server {
        listen 80;
        server_name localhost;

        # API 路由
        location /api/ {
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Admin SPA（has_admin_backend=true）
        location /admin {
            proxy_pass http://admin_frontend;
            proxy_set_header Host $host;
            # SPA fallback：nginx proxy 無法直接 try_files，由 admin container 自身 nginx 處理
            proxy_intercept_errors on;
            error_page 404 = @admin_fallback;
        }
        location @admin_fallback {
            proxy_pass http://admin_frontend/admin/index.html;
        }

        # Player SPA（/ 根路徑，所有非 /api / /admin 的請求）
        location / {
            proxy_pass http://web_frontend;
            proxy_set_header Host $host;
        }
    }
}
```

**`docker-compose.yml`（新增 nginx proxy service）：**

```yaml
services:
  # ... 現有 services（api, worker, web, admin, db, cache 等）...

  # 單一 port nginx proxy（與 K8s Ingress 行為一致）
  proxy:
    image: nginx:alpine
    ports:
      - "80:80"        # 對外只暴露 port 80
    volumes:
      - ./docker/nginx-proxy/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - web
      - admin
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3
```

**啟動並驗證單一 port 模式：**

```bash
# 啟動含 proxy 的完整環境
docker compose up -d

# 副本數驗證
docker compose ps
# Expected：api 顯示 2 個 Running 實例、worker 顯示 2 個 Running 實例

# 驗證單一 port 路由
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/
# Expected: 200（Player SPA）

curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/health
# Expected: 200（API）

# Admin SPA（has_admin_backend=true）
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/admin/
# Expected: 200

curl -s -o /dev/null -w "%{http_code}\n" http://localhost/admin/users/123
# Expected: 200（SPA deep link，不得 404）

# 確認沒有其他 port 對外暴露（api, web, admin 只 expose，不 ports）
docker compose ps --format json | python3 -c "
import json,sys
for line in sys.stdin:
    svc = json.loads(line)
    print(svc.get('Name','?'), '→', svc.get('Publishers','[]'))
"
# Expected: 只有 proxy 有 0.0.0.0:80->80/tcp；api/web/admin 無對外 port
```

### 測試（docker-compose 模式）

```bash
# Unit test（不需 Docker，直接在本機執行）
pnpm test

# Integration test（在 api container 內執行）
docker compose exec api pnpm test:integration

# E2E test（Playwright，連 §19.1 nginx proxy）
pnpm exec playwright test --base-url http://localhost
```

### 停止與清除

```bash
# 停止（保留資料）
docker compose stop

# 停止並移除 container（保留 volume 資料）
docker compose down

# 完全重置（移除 container + volume）
docker compose down -v
# Warning: 所有 DB、minio 資料永久刪除
```

---

## 20. k9s Quick Reference（互動式 K8s 操作）

> **定位**：k9s 是 kubectl 的互動式補充層，適合 on-call 快速診斷與資源瀏覽。所有操作等同 kubectl 指令，但以鍵盤驅動，不適合腳本化。`kubectl` 仍是 canonical 工具（腳本、CI、Makefile 均用 kubectl）；k9s 是 power user 效率層。

### 啟動

```bash
# 指定 namespace 啟動（推薦）
k9s -n pixel-pet-arena-local

# 全 cluster 啟動
k9s --all-namespaces
```

### 資源切換（命令模式，按 `:` 進入後輸入）

| 命令 | 說明 |
|------|------|
| `:pod` | 查看所有 Pod |
| `:deploy` | 查看 Deployment |
| `:svc` | 查看 Service |
| `:cm` | 查看 ConfigMap |
| `:secret` | 查看 Secret |
| `:hpa` | 查看 HorizontalPodAutoscaler |
| `:job` | 查看 Job |
| `:cronjob` | 查看 CronJob |
| `:node` | 查看 Node |
| `:ns` | 切換 Namespace |
| `:netpol` | 查看 NetworkPolicy |
| `:pvc` | 查看 PersistentVolumeClaim |
| `:event` | 查看 Events（等同 `kubectl get events`） |

### 常用按鍵（Resource 選中後）

| 按鍵 | 說明 | kubectl 等效 |
|------|------|------------|
| `l` | 查看 logs（即時串流） | `kubectl logs -f` |
| `p` | 查看前次容器 logs（CrashLoopBackOff 用） | `kubectl logs --previous` |
| `s` | exec 進入 container shell | `kubectl exec -it -- sh` |
| `d` | describe | `kubectl describe` |
| `e` | edit（直接編輯 YAML） | `kubectl edit` |
| `ctrl-d` | delete resource（會要求確認） | `kubectl delete` |
| `shift-f` | port-forward | `kubectl port-forward` |
| `f` | fullscreen logs 切換 | — |
| `/` | 文字篩選（過濾清單，支援正則） | `grep` |
| `Esc` | 返回上層 / 清除篩選 | — |
| `?` | 顯示所有按鍵說明 | — |
| `q` | 退出 k9s | — |

### 篩選技巧

```bash
# 在 :pod 清單中篩選 api server
/api-server

# 在 :event 中篩選 Warning 事件
/Warning

# 在 :pod 中篩選崩潰中的 Pod
/CrashLoop

# 在 :pod 中按 BC label 篩選
/bc=pet
```

### Scale Deployment（互動式）

```
1. 進入 k9s -n pixel-pet-arena-local
2. 輸入 :deploy
3. 選中目標 Deployment（如 api-server）
4. 按 s → 輸入新 replica 數（≥ 2）→ 確認
```

### 皮膚與設定

```bash
# k9s 設定目錄
ls ~/.config/k9s/

# 設定 default namespace（config.yml 範例）
# currentContext: rancher-desktop
# namespace: pixel-pet-arena-local

# 推薦 skin（deep sea 或 dracula）
# 下載：https://github.com/derailed/k9s/tree/master/skins
```

### 與 Makefile 整合

```bash
# §6 Development Commands 已提供
make k9s   # 等同 k9s -n pixel-pet-arena-local
```

---

## 21. CI/CD 本地模擬（Jenkins on k3s）

> 本節讓開發者在本機完整重現 CI/CD Pipeline，確保 GitHub Actions workflow 與 `make ci-*` targets 在 commit 前可驗證，避免 PR 被 pipeline 失敗 reject。
>
> **預設值說明**：本專案 EDD §3.3 + CICD.md 定義 CI = **GitHub Actions**、CD = **ArgoCD**。本節以 Jenkins 作為 **離線 CI 等效模擬器**（讓無 GitHub 連線時亦可驗證 pipeline 邏輯），實際 production CI 仍為 GitHub Actions（見 CICD.md `ci.yml`）。

### 21.0 Local Developer Platform 整體架構

本節說明本地 CI/CD 平台的整體架構。所有元件均在 Rancher Desktop k3s cluster 內執行，開發者 push 到本地 Gitea 即可觸發完整 CI/CD 流程，不依賴外部服務。

```mermaid
graph LR
    subgraph DevMachine["開發者本機（Rancher Desktop k3s）"]
        subgraph DevTools["dev-tools namespace"]
            Gitea["Gitea<br/>(ClusterIP:3000)<br/>Local Git Server"]
        end
        subgraph CI["ci namespace"]
            Jenkins["Jenkins<br/>(ClusterIP:8080)<br/>CI Pipeline"]
        end
        subgraph ArgoNS["argocd namespace"]
            Argo["ArgoCD<br/>(ClusterIP:443)<br/>CD GitOps"]
        end
        subgraph App["pixel-pet-arena-local namespace"]
            AppPods["App Pods<br/>(Ingress port 80)"]
        end
    end
    Dev["Developer<br/>git push"] --> Gitea
    Gitea -->|"Webhook POST"| Jenkins
    Jenkins -->|"build image<br/>update helm values"| Gitea
    Argo -->|"watch repo"| Gitea
    Argo -->|"sync"| AppPods
```

**元件說明**：

| 元件 | Namespace | ClusterIP Port | 本地存取（port-forward）|
|------|-----------|---------------|----------------------|
| Gitea（Local Git）| `dev-tools` | 3000 | `make dev-tools-forward` → http://localhost:3000 |
| Jenkins（CI）| `ci` | 8080 | `make dev-tools-forward` → http://localhost:8080 |
| ArgoCD（CD）| `argocd` | 443 | `make dev-tools-forward` → https://localhost:8443 |
| App Ingress | `pixel-pet-arena-local` | 80 | http://pixel-pet-arena.local |

> **Port 分離原則**：App domain（port 80 via Ingress）與 dev-tools domain（3000/8080/8443 via port-forward）完全隔離，不互相干擾。詳細 Gitea 安裝與 Jenkins Webhook 設定見 [CICD.md](CICD.md)；Makefile dev-tools targets 見 CICD.md。

### 21.1 Jenkins on k3s 安裝

**前提**：Rancher Desktop 已執行（見 §1），k3s cluster 可用。

```bash
# 新增 Jenkins Helm repo
helm repo add jenkins https://charts.jenkins.io
helm repo update

# 安裝 Jenkins（使用 k8s/jenkins/jenkins-values.yaml）
kubectl create namespace ci
helm install jenkins jenkins/jenkins \
  --namespace ci \
  --values k8s/jenkins/jenkins-values.yaml \
  --version 5.1.x

# 等待 Jenkins 就緒（約 2~3 分鐘）
kubectl rollout status deployment/jenkins -n ci --timeout=300s

# 取得初始密碼
kubectl exec -n ci \
  $(kubectl get pod -n ci -l app.kubernetes.io/name=jenkins -o name) \
  -- cat /run/secrets/additional/chart-admin-password
```

**Port Forward 到本地**：

```bash
kubectl port-forward svc/jenkins -n ci 8080:8080
# 開啟瀏覽器：http://localhost:8080
# 帳號：admin  密碼：上方取得的密碼
```

### 21.2 Pipeline 設定（Multibranch Pipeline）

1. New Item → Multibranch Pipeline → 命名 `pixel-pet-arena`
2. Branch Sources → Git → `git@github.com:pixel-pet-arena/pixel-pet-arena.git`
3. Credentials → 選擇 `git-credentials`（見 §21.4）
4. Build Configuration → by Jenkinsfile → 路徑 `Jenkinsfile`
5. Scan Now → 自動偵測所有 branch

### 21.3 jenkinsfile-runner（快速本地 Dry-Run，無需 Jenkins Server）

> 適合在 push 前快速驗證 `Jenkinsfile` 語法和邏輯，不需啟動完整 Jenkins。

**安裝**：

```bash
# macOS / Linux（Homebrew）
brew install jenkins-x/jx/jfr

# 或直接下載 jar（版本 1.0-beta-33+）
curl -Lo jenkinsfile-runner.jar \
  https://github.com/jenkinsci/jenkinsfile-runner/releases/download/1.0-beta-33/jenkinsfile-runner-1.0-beta-33.jar

# 驗證
jfr version    # 或 java -jar jenkinsfile-runner.jar --version
```

**Dry-Run 執行**：

```bash
# 設定 mock secrets（避免 CI 憑證外洩）
export REGISTRY_TOKEN="mock-token"
export DB_PASSWORD="mock-db-password"
export REDIS_AUTH="mock-redis-auth"
export JWT_SECRET="mock-jwt-secret-64chars"

# 執行 dry-run
jfr run \
  --file Jenkinsfile \
  --workspace /tmp/jfr-workspace-pixel-pet-arena \
  --no-sandbox

# 或使用 make target
make ci-dry-run
```

**預期輸出**：

```
[Pipeline] Start of Pipeline
[Pipeline] stage (Checkout)
[Pipeline] stage (Build)
[Pipeline] stage (Unit Test)
[Pipeline] stage (Integration Test)
[Pipeline] stage (E2E Smoke)
...
[Pipeline] End of Pipeline
Finished: SUCCESS
```

### 21.4 CI 所需 Secrets 設定（Jenkins Credentials）

```bash
# Registry Token（用於 Image Push 至 ghcr.io）
kubectl create secret generic registry-credentials \
  --from-literal=username=pixel-pet-arena-bot \
  --from-literal=password=$(security find-generic-password -w -s "pixel-pet-arena-registry" -a "dev") \
  -n ci

# Git Credentials（SSH key 或 Personal Access Token）
kubectl create secret generic git-credentials \
  --from-literal=username=pixel-pet-arena-bot \
  --from-literal=password=$(security find-generic-password -w -s "pixel-pet-arena-git" -a "dev") \
  -n ci

# DB + Redis（從 §3.5 bootstrap-secrets.sh 讀取的 ephemeral secret）
kubectl create secret generic app-secrets \
  --from-env-file=k8s/overlays/local/secrets.env \
  -n ci

# 確認所有 secrets 存在
kubectl get secret -n ci
```

### 21.5 ArgoCD CD 層設定（GitOps）

```bash
# 安裝 ArgoCD（若尚未安裝）
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 等待就緒
kubectl rollout status deployment/argocd-server -n argocd --timeout=300s

# Port Forward
kubectl port-forward svc/argocd-server -n argocd 8443:443

# 取得初始密碼
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# 登入 CLI
argocd login localhost:8443 --username admin --insecure

# 建立 Application（對應 k8s/overlays/local）
argocd app create pixel-pet-arena-local \
  --repo git@github.com:pixel-pet-arena/pixel-pet-arena.git \
  --path k8s/overlays/local \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace pixel-pet-arena-local \
  --sync-policy automated
```

### 21.6 Shared Make Targets（CI ↔ 本地對齊）

| Target | 作用 | CI 呼叫（GitHub Actions stage） | 本地可重現 |
|--------|------|-------------------------------|-----------|
| `make ci-build` | 編譯所有 packages | `ci.yml` Build | ✅ |
| `make ci-test-unit` | Vitest 單元測試（≥ 80% coverage） | `ci.yml` Unit Test | ✅ |
| `make ci-test-integration` | 整合測試（含 K8s testcontainers） | `ci.yml` Integration Test | ✅（需 k3s 運行）|
| `make ci-build-image` | nerdctl build 所有 image | `ci.yml` Docker Build | ✅ |
| `make ci-deploy` | 部署到 local k3s | `deploy-staging.yml` Deploy | ✅ |
| `make ci-smoke` | Smoke test（curl /api/health + Playwright key flows）| `ci.yml` E2E Smoke | ✅ |
| `make ci-rollback` | 回滾到前一版本（kubectl rollout undo） | `deploy-production.yml` post-failure | ✅ |
| `make ci-dry-run` | jenkinsfile-runner Jenkinsfile dry-run | 手動觸發 | ✅ |

> 確保 Makefile 中以上 8 個 targets 全部存在，CI 和本地使用完全相同的 target 名稱。

### 21.7 PR Gate 驗證（Pre-Push Checklist）

在 push 到 feature branch 之前，確認以下項目：

```bash
# 1. 所有 CI targets 本地通過
make ci-build
make ci-test-unit
make ci-test-integration   # 需 k3s 運行

# 2. Jenkinsfile dry-run 無錯誤
make ci-dry-run

# 3. Image 可本地 build
make ci-build-image

# 4. Deploy + Smoke 通過
make ci-deploy && make ci-smoke

# 全部通過後才 push
git push origin feature/your-branch
```

### 21.8 常見問題排查

| 問題 | 原因 | 解決 |
|------|------|------|
| `jenkinsfile-runner: command not found` | jfr 未安裝 | `brew install jenkins-x/jx/jfr` |
| `Pipeline: No such DSL method 'kubernetes'` | Kubernetes plugin 未載入 | 確認 `k8s/jenkins/jenkins-values.yaml` plugins 清單含 kubernetes plugin |
| `ImagePullBackOff` in ci namespace | Registry credentials 未設定 | 執行 §21.4 registry-credentials |
| `ArgoCD: App not synced` | Git commit 未 push 或 path 錯誤 | 確認 `spec.source.path: k8s/overlays/local` |
| `make ci-test-integration` 失敗 | k3s 未運行 | 啟動 Rancher Desktop → 執行 §4 setup |

---

## Service Startup / Shutdown Sequencing

### 啟動順序（Dependency Graph）

```mermaid
flowchart TD
  subgraph Infra["Infrastructure Layer"]
    PG["PostgreSQL<br/>(pg_isready / SELECT 1)"]
    Redis["Redis<br/>(redis-cli PING)"]
    Mail["mailpit<br/>(SMTP :1025 listening)"]
    MinIO["minio<br/>(HTTP /minio/health/ready)"]
  end
  subgraph App["Application Layer"]
    API["api-server (Fastify 4)<br/>(GET /health/ready)"]
    Worker["worker<br/>(GET /health/ready)"]
  end
  subgraph FrontEnd["Frontend Layer"]
    Web["web-app (Player SPA)"]
    Admin["admin-app (Vue 3 SPA)"]
  end
  subgraph GW["Gateway Layer"]
    Ingress["Traefik Ingress<br/>(host route)"]
  end

  PG --> API
  Redis --> API
  Mail --> API
  MinIO --> API
  PG --> Worker
  Redis --> Worker
  API --> Ingress
  Web --> Ingress
  Admin --> Ingress
```

### 每個服務的就緒判斷（readiness gate）

| 服務 | Readiness Check | 逾時 | 失敗行為 |
|-----|----------------|------|---------|
| PostgreSQL | `pg_isready -h localhost -p 5432` | 30s | 停止啟動，顯示錯誤 |
| Redis | `redis-cli ping` → PONG | 10s | 停止啟動 |
| MinIO | `curl -s http://minio:9000/minio/health/ready` → 200 | 30s | 停止啟動 |
| Mailpit | `nc -z mailpit 1025` | 10s | 警告但繼續（email 為 non-critical）|
| api-server | `GET /api/health/ready` → 200 + `{"status":"healthy"}` | 60s | 停止啟動 |
| worker | `GET :8081/health/ready` → 200 | 60s | 停止啟動 |
| Ingress (Traefik) | 所有 backend Service /health 通過 | 90s | 停止啟動 |

### 優雅關閉（Graceful Shutdown，依 EDD §3.6.5）

| 關閉順序 | 服務 | drain timeout | 強制 kill timeout |
|---------|-----|--------------|-----------------|
| 1 | Traefik Ingress | 30s（等待進行中請求完成） | 60s |
| 2 | api-server | 30s（in-flight requests + DB/Redis pool close） | 35s（terminationGracePeriodSeconds，EDD §3.5d）|
| 3 | worker | 30s（complete current jobs，idempotent design） | 35s |
| 4 | web-app / admin-app | 5s（nginx 靜態服務）| 10s |
| 5 | postgres / redis / minio | 不主動 drain（StatefulSet）| 10s |

> **禁止**：任何服務啟動時不檢查上游依賴 readiness（會導致 first-request 失敗）。Fastify Plugin 順序（EDD §3.8.2）已強制 env → db → redis → auth → routes → errorHandler。

---

## Self-Check Checklist

**欄位提取正確性**

- [x] PROJECT_SLUG = `pixel-pet-arena`（從 EDD Document Control / 全文一致）
- [x] GITHUB_ORG + GITHUB_REPO = `pixel-pet-arena/pixel-pet-arena`（git clone URL 含真實值）
- [x] K8S_NAMESPACE = `pixel-pet-arena-local`（PROJECT_SLUG-local，全文一致）
- [x] 所有 port 號碼來自 EDD §3.5b 服務 Port 對照表
- [x] DB_PORT 為 5432（StatefulSet 內部 port，port-forward 映射至 localhost:5432）
- [x] MIGRATE_CMD = `pnpm db:migrate`（依 SCHEMA.md §8 + EDD §3.3 推斷）
- [x] WEB_DEV_CMD = `pnpm dev`（Phaser 3 + Vite）
- [x] ConfigMap 中所有 URL 使用 K8s internal DNS（service 名稱），非 localhost
- [x] secrets.env 路徑與 `--from-env-file` 建立方式已正確記錄
- [x] Quick Start 的 git clone URL 含真實 GITHUB_ORG 和 GITHUB_REPO

**結構完整性**

- [x] §1 Prerequisites 採 Rancher Desktop（非 Docker Desktop）
- [x] §2 Architecture 的 Mermaid 圖節點 port 標注與 §12 Port Reference 一致
- [x] §4.3 明確說明 secrets.env 已加入 .gitignore
- [x] §4.4 包含 `imagePullPolicy: Never` 說明
- [x] §5 port-forward 表與 §12 Port Reference 完全一致
- [x] §8 Test Data 角色清單來自 BRD/PRD/SCHEMA Admin Seed（含 super_admin / moderator / read_only + Pet Owner + Arena Competitor）
- [x] §10 Common Issues 涵蓋 Pending / CrashLoopBackOff / ImagePullBackOff / Ingress 解析失敗 / DB 連線拒絕 + Admin SPA 404
- [x] §11 Logs & Debugging 所有 kubectl 命令使用真實 namespace
- [x] §14 Mock Services 表從 EDD §2.1 外部依賴生成
- [x] §15 Inner Loop 包含正確的引擎特定小節（Phaser 3 / Vue 3 Admin）
- [x] §4.4 Build 策略說明與 CLIENT_ENGINE = Phaser 3 一致

**安全性**

- [x] §7 Database Operations 所有含明文密碼 `secret` 的連線字串前均有安全警示注釋
- [x] Secret 建立使用 `--from-env-file` + `bootstrap-secrets.sh` 隨機生成
- [x] §13 Local HTTPS 使用 mkcert（非自簽憑證），憑證私鑰加入 .gitignore
- [x] pgadmin Secret 密碼注釋「本機使用，勿使用於其他環境」
- [x] §3.5 Secret Bootstrap 存在，bootstrap script 使用 `openssl rand`（無靜態明文密碼）
- [x] `.gitignore` 涵蓋 `*.env`、`secrets.env`、`.env.*`、`apps/*/.env.local`
- [x] bootstrap-secrets.sh 和 .ps1 均以 `openssl rand` / PowerShell CSPRNG 生成密碼

**裸 placeholder 掃描**

- [x] 全文無裸 `{{PROJECT_NAME}}`、`{{PROJECT_SLUG}}`、`{{K8S_NAMESPACE}}`
- [x] 全文無裸 `{{API_PORT}}`、`{{WEB_PORT}}`、`{{DB_PORT}}`、`{{REDIS_PORT}}`
- [x] Admin Ingress YAML、nginx.conf、Vite base 設定三方一致（`/admin/`）

**K8s-First + HA 合規**

- [x] 文件主架構為 k8s；Docker Compose 僅於 §19 輔助說明
- [x] API Server replicas = 2、Worker replicas = 2，且含 HA 驗證 kubectl 指令
- [x] §19 Docker Compose `services.api.deploy.replicas: 2`、`services.worker.deploy.replicas: 2`
- [x] §17 Tunnel 與 §18 AI Quick Start 末尾僅一個 tunnel URL（Ingress 80）

---

> 本 LOCAL_DEPLOY 為 Layer 9 Local Developer Onboarding 文件；所有指令必須與 EDD（Layer 4）/ SCHEMA（Layer 5）/ CICD（Layer 10）保持同步。發現衝突請先更新上游文件並重新跑 `gendoc local-deploy`。
