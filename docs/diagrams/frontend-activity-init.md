---
diagram: frontend-activity-init
uml-type: Activity Diagram（Frontend Client Initialization）
source: docs/FRONTEND.md §1 Overview + §2.4 State Management + §6 Performance
generated: 2026-05-08T00:00:00Z
---

# Frontend Activity Diagram — Client Initialization

> 來源：docs/FRONTEND.md §1 Overview + §6 Performance Budget + §8.1 Token Storage

描述客戶端從首次載入到完成初始化的完整序列，包含資源預載、token 驗證、Service Worker 啟動、
Phaser 引擎初始化等步驟，並標注每步的 timeout 與 fallback。

```mermaid
flowchart TD
    Start(["瀏覽器訪問 https://pet.local/"]) --> SW

    subgraph BootPhase ["Boot Phase（critical path: ~600ms target）"]
        SW{"Service Worker<br/>已註冊？"}
        SW -->|NO| RegSW["registerServiceWorker<br/>('/sw.js')"]
        SW -->|YES| HtmlParse
        RegSW --> HtmlParse["瀏覽器解析 index.html<br/>+ critical CSS inline"]
        HtmlParse --> JsLoad["loading vendor.js + main.js<br/>(deferred + module preload)"]
        JsLoad --> ReactBoot["React.createRoot + render<br/>App.tsx"]
    end

    subgraph HydratePhase ["Hydrate Phase（runs in parallel）"]
        ReactBoot --> ParallelHydrate
        ParallelHydrate{"並行初始化"}
        ParallelHydrate -->|fork| InitTokenStore["TokenStore.hydrate()<br/>讀 localStorage.pet_access_token"]
        ParallelHydrate -->|fork| InitUiStore["UiStore.hydrate()<br/>讀 theme + reducedMotion"]
        ParallelHydrate -->|fork| InitTelemetry["TelemetryClient.init<br/>(Sentry SDK lazy)"]
        InitTokenStore --> JoinHydrate
        InitUiStore --> JoinHydrate
        InitTelemetry --> JoinHydrate
        JoinHydrate{"join: stores ready"}
    end

    subgraph TokenPhase ["Token Validation Phase"]
        JoinHydrate --> TokenCheck{"TokenStore<br/>has token？"}
        TokenCheck -->|NO| ToLanding["render LandingPage<br/>fetchRandomPet()"]
        TokenCheck -->|YES| TokenValidate["validate format<br/>(32-byte base64url regex)"]

        TokenValidate -->|invalid format| TokenInvalid(["clear token<br/>navigate /"]) --> ToLanding
        TokenValidate -->|valid format| FetchOwnPet["GET /api/v1/pets/:petId<br/>Header: X-Pet-Token"]

        FetchOwnPet --> ApiResp{"API 回應？"}
        ApiResp -->|200| LoadPet["PetStore.setPet(pet)<br/>render PetPage"]
        ApiResp -->|401 token invalid| TokenInvalid
        ApiResp -->|404 pet not found| PetMissing(["clear token<br/>navigate / + toast"])
        ApiResp -->|5xx server error| RetryOrFallback{"retry attempt<br/>< 3?"}
        ApiResp -->|network timeout 5s| RetryOrFallback

        RetryOrFallback -->|YES retry| BackoffWait["exponential wait<br/>(1s / 2s / 4s)"] --> FetchOwnPet
        RetryOrFallback -->|NO max retried| OfflineFallback(["render OfflineBanner<br/>store last good state"])

        PetMissing --> ToLanding
    end

    subgraph PhaserPhase ["Phaser Engine Init Phase"]
        LoadPet --> InitPhaser{"PetCanvas<br/>mounted？"}
        InitPhaser -->|YES| PhaserConfig["build Phaser.GameConfig<br/>type=AUTO, size 640x360"]
        PhaserConfig --> PhaserCreate["new Phaser.Game(config)<br/>~150ms typical"]
        PhaserCreate --> PreloadAssets

        subgraph AtlasLoad ["Asset Preload"]
            PreloadAssets["preload sprite atlases<br/>(common.atlas, rarity-{R}.atlas)"]
            PreloadAssets --> LoadProgress{"loading<br/>progress?"}
            LoadProgress -->|< 100%| ProgressBar["更新 LoadingBar UI"]
            LoadProgress -->|100%| AssetsReady["all atlases loaded"]
            ProgressBar --> LoadProgress
        end

        AssetsReady --> SceneStart["scene.start('IdlePet', {pet})"]
        SceneStart --> AnimRun["Phaser scene running<br/>(60 FPS WebGL)"]
    end

    subgraph BackgroundPhase ["Background Tasks（non-blocking）"]
        ReactBoot --> StartHealthCheck
        StartHealthCheck["start /health/ready<br/>polling every 30s"]
        StartHealthCheck --> HealthOk{"online？"}
        HealthOk -->|YES| Listening["UiStore.online = true"]
        HealthOk -->|NO 3 consecutive fails| OfflineBanner(["UiStore.online = false<br/>show OfflineBanner"])

        ReactBoot --> ServiceWorkerActivate
        ServiceWorkerActivate["Service Worker activate<br/>cache 'critical.v{version}'"]
        ServiceWorkerActivate --> SwReady["Service Worker controlling page"]
    end

    AnimRun --> Done(["✓ Client fully initialized<br/>main thread idle, ready for input"])
    ToLanding --> Done
    OfflineFallback --> Done

    classDef errClass fill:#ffe0e0,stroke:#d33
    classDef okClass fill:#e0ffe0,stroke:#393
    classDef bgClass fill:#f4f4ff,stroke:#669
    class TokenInvalid,PetMissing,OfflineFallback,OfflineBanner errClass
    class LoadPet,Done,Listening,SwReady okClass
    class StartHealthCheck,HealthOk,ServiceWorkerActivate,SwReady bgClass
```

## Phase Timing Targets（FRONTEND.md §6.1 CWV）

| Phase | Target | Critical Metric |
|-------|--------|-----------------|
| Boot Phase | ≤ 600ms | FCP (First Contentful Paint) ≤ 1.5s |
| Hydrate Phase | ≤ 200ms | TBT (Total Blocking Time) ≤ 200ms |
| Token Phase | ≤ 300ms | LCP including pet sprite ≤ 2.5s |
| Phaser Phase | ≤ 400ms | Phaser Game ready event |
| Total | ≤ 1.5s | Pet visible & interactive |

## Timeout / Fallback per Step

| Step | Timeout | On Failure |
|------|---------|-----------|
| RegSW | non-blocking | Continue without SW; report to telemetry |
| FetchOwnPet | 5s timeout | Exponential backoff (1s, 2s, 4s); max 3 retries |
| PhaserCreate | 1s | Hide canvas; show static fallback image |
| PreloadAssets | 3s per atlas | Show error state with retry button |
| Health Check | 5s | Mark offline after 3 consecutive failures |

## Fork/Join Operations

**HydratePhase** 包含 3 條並行：TokenStore / UiStore / Telemetry — 任一完成不依賴其他兩個。
**BackgroundPhase** 與 main path 並行：Health check 與 SW activate 不阻塞首屏渲染。

## Error Recovery / Retry

- 所有 5xx 與 timeout 進入 `RetryOrFallback`，最多 3 次 exponential backoff
- 401 token invalid 直接清除 token 並導去登入頁（不重試）
- Asset preload 失敗時，提供「重試」按鈕讓使用者主動重試
- Service Worker 註冊失敗不影響 critical path（telemetry 記錄即可）

## Service Worker Cache Strategy

- `cache_first`：static atlases、CSS、JS chunks
- `network_first`：API responses（fallback to cache only when offline）
- `stale_while_revalidate`：HTML shell（fast paint + background update）
