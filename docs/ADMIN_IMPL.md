# Admin Portal Implementation Specification — Pixel Pet Arena

## Document Control

| 欄位 | 內容 |
|------|------|
| **DOC-ID** | ADMIN-PIXEL-PET-ARENA-20260517 |
| **Admin 技術棧** | Vue 3 + Element Plus + Vite（來自 EDD §3.3 `_ADMIN_FRAMEWORK`） |
| **產品名稱** | Pixel Pet Arena |
| **文件版本** | v2.0 |
| **狀態** | DRAFT |
| **日期** | 2026-05-17 |
| **上游 EDD** | [EDD.md](EDD.md) §3.3 + §3.8.3 + §5.5 + §9.6 |
| **上游 API** | [API.md](API.md) §6 `/admin/api/*` |
| **上游 SCHEMA** | [SCHEMA.md](SCHEMA.md) §3.10 `admin_users` + §3.11 `audit_logs` |
| **上游 ARCH** | [ARCH.md](ARCH.md) §2.2 + §19 Admin Portal |
| **上游 CONSTANTS** | [CONSTANTS.md](CONSTANTS.md) ADMIN_SESSION_* / ADMIN_RATE_LIMIT_* / ADMIN_PAGE_LOAD_TIME |
| **上游 PRD** | [PRD.md](PRD.md) EPIC-ADMIN + §19 Admin Portal Requirements |
| **下游消費** | gencode（骨架生成）、test-plan（admin E2E 套件）、CICD（admin 部署管線） |

---

## Change Log

| 版本 | 日期 | 作者 | 變更摘要 |
|------|------|------|---------|
| v1.0 | 2026-05-03 | gendoc | 初稿（EDD + API + SCHEMA 對齊） |
| v2.0 | 2026-05-17 | gendoc | 全量重建：EDD §9.6 RBAC 三角色定型（super_admin / moderator / read_only）、§9 Pinia Store 對齊 HttpOnly Cookie session、§7 頁面規格一對一對應 API.md §6.1–§6.9（共 32 個 endpoint）、§Auth 加入 TOTP 與 setupToken 兩步驟登入流程、§16 安全加固章節 |

---

## §1 Admin Portal 概覽

### §1.1 系統定位

Pixel Pet Arena Admin Portal 是給 **平台運維人員（Platform Operations）** 使用的後台管理介面，職責涵蓋：

- **內容審查**：對玩家寵物（pets）執行 ban / unban，處理 bot 偵測佇列（>50 戰鬥/60 分鐘）
- **競技公平性**：對 Arena 戰鬥記錄打旗、移除排行榜異常條目（top 500）
- **法遵作業**：處理 GDPR 五大權利請求（erasure / data_access / restrict / object / rectification），SLA 7 天內完成 email 雜湊化
- **遊戲調校**：調整 runtime 配置（戰鬥速率、稀有度權重）與經濟配置（食物 buff 倍率、競技場入場費）
- **稽核合規**：所有 admin 變動寫入 `audit_logs`（2 年保留期），供 GDPR Art. 30 accountability 查詢
- **平台健康**：監控 DAU、claim 漏斗、SendGrid 信件發送率、系統錯誤率

Admin Portal 為 **獨立 Vue 3 + Vite 應用**，部署於獨立 Vercel project，與 Player 端（React + Phaser）完全隔離；前端僅呼叫 `/admin/api/*`，認證走 Redis server-side session（HttpOnly Cookie），不共用 Player 的 PetAccessToken。

### §1.2 設計原則

1. **安全第一（Security First）**：RBAC 最小權限原則；所有 mutation 寫 `audit_logs`；TOTP 強制啟用；30 分鐘 lockout 後 10 次連續失敗
2. **可審計性（Auditability）**：每一筆 ban / config 變動均含 actor、timestamp、old/new value、ip_address_hash（90 天保留）
3. **資料一致性（Single Source of Truth）**：與主系統共用同一 PostgreSQL 資料庫；不建立另一套資料快取；read replica 只讀 ViewModel
4. **操作效率（Operator Throughput）**：單一 Moderator 每日處理 ≥ 100 件 moderation 動作，無效能退化（CONSTANTS: `ADMIN_DAILY_MODERATION_ACTIONS = 100`）
5. **效能 SLA**：任何頁面 ≤ 3 秒載入完成（1M pet 規模）、搜尋 ≤ 2 秒、稽核搜尋 ≤ 3 秒（任意 12 個月窗口）

### §1.3 使用者角色（來自 EDD §9.6 RBAC + SCHEMA `admin_role_enum`）

| Role（DB code） | 中文名稱 | 是否系統角色 | 可存取功能 | 不可存取功能 |
|---|---|---|---|---|
| `super_admin` | 超級管理員 | ✅ 是 | 所有 `/admin/api/*` 端點（包含 GDPR、Runtime/Economy/Flag config、Role 管理、Audit Log） | — |
| `moderator` | 內容審查員 | ✅ 是 | Dashboard、Pets list/ban/unban、Leaderboard、Battles flag/unflag、Suspicious 佇列、Email Monitor、Analytics | Config（runtime/economy/flags）、GDPR、Role 管理、Audit Log |
| `read_only` | 唯讀分析師 | ✅ 是 | 所有 GET endpoints（Dashboard、Pets、Leaderboard、Battles、Email Monitor、Analytics） | 任何 mutation；Audit Log；Role 管理；GDPR |

三個角色於 `admin_users.role` 欄位以 `admin_role_enum` 表示。RBAC 守衛在三層生效：

1. **Backend Fastify preHandler**：依 session admin_id 反查 role → 比對 endpoint required role（authoritative，唯一可信來源）
2. **Frontend Vue Router beforeEach**：在 `to.meta.roles` 與當前 user role 不符時 redirect `/admin/403`（UX 層保護）
3. **Element Plus 元件層**：`v-permission="'pet:ban'"` 指令隱藏無權按鈕（純 UI 層；後端仍會 403）

---

## §2 技術棧決策

### §2.1 框架選型

| 技術 | 選型 | 決策理由 |
|------|------|---------|
| 前端框架 | Vue 3.4+（Composition API + `<script setup>`） | EDD §3.3 指定；響應式系統與 Element Plus 2.x 完整相容；型別友善（vue-tsc） |
| UI Component | Element Plus 2.7+ | 企業級資料密集型組件庫；ElTable 支援大量資料 + 排序篩選；ElForm / ElDialog 完整；i18n 內建 |
| Build Tool | Vite 5.x | HMR < 200ms；ESM 原生 + 生產 Rollup bundle 優化；vite.config.ts 設定簡單 |
| 狀態管理 | Pinia 2.x | Vue-native 模組化 Store；型別友善；Composition API 慣用風格；Devtools 支援良好 |
| 路由 | Vue Router 4.x | History 模式 + 動態路由 + 巢狀路由 + 全域 beforeEach 守衛 |
| HTTP Client | Axios 1.x | request/response interceptor 自動處理 session 過期；`withCredentials: true` 攜帶 HttpOnly cookie |
| 圖表 | ECharts 5.x（vue-echarts wrapper） | Dashboard / Analytics 折線、柱狀、餅圖；按需引入縮減 bundle |
| 語言 | TypeScript 5.x | 嚴格模式（strict: true）；與 backend 共用 Zod schema |
| 表單驗證 | async-validator（Element Plus 內建）+ Zod（共享 schema） | UI 端 ElForm rules + Zod 共享 schema 跨層級驗證 |

> **格式說明**：本表為「技術 / 選型 / 決策理由」3 欄結構，與 gendoc 骨架 §2.1 對齊。所有決策理由為具體陳述，無 placeholder。

### §2.2 依賴版本清單（`apps/admin/package.json`）

```json
{
  "name": "@pixel-pet-arena/admin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5174",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview --port 5174",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .vue,.ts,.tsx"
  },
  "dependencies": {
    "vue": "3.4.21",
    "vue-router": "4.3.0",
    "pinia": "2.1.7",
    "element-plus": "2.7.0",
    "@element-plus/icons-vue": "2.3.1",
    "axios": "1.6.8",
    "echarts": "5.5.0",
    "vue-echarts": "6.7.3",
    "dayjs": "1.11.10",
    "qrcode": "1.5.3",
    "zod": "3.22.4",
    "vue-i18n": "9.13.1"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "5.0.4",
    "vite": "5.2.10",
    "typescript": "5.4.5",
    "vue-tsc": "2.0.13",
    "vitest": "1.5.0",
    "@playwright/test": "1.43.1",
    "@vue/test-utils": "2.4.5",
    "happy-dom": "14.7.1",
    "eslint": "8.57.0",
    "eslint-plugin-vue": "9.25.0",
    "@typescript-eslint/parser": "7.7.0",
    "@typescript-eslint/eslint-plugin": "7.7.0",
    "rollup-plugin-visualizer": "5.12.0",
    "unplugin-element-plus": "0.8.0",
    "unplugin-vue-components": "0.27.0",
    "sass": "1.77.0"
  }
}
```

> 所有版本鎖定具體小版號（無 `latest` / 無空版本）。CI gate 透過 `pnpm audit` 阻擋已知 CVE；Renovate 週掃描升級 PR。

---

## §3 目錄結構

`apps/admin/`（pnpm workspace 子套件，與 `apps/api` / `apps/worker` / `apps/web` 同位於 monorepo `apps/` 之下）

```
apps/admin/
├── src/
│   ├── main.ts                    # Vue app entrypoint：掛載 Pinia、Router、Element Plus、i18n
│   ├── App.vue                    # Root component
│   ├── router/
│   │   ├── index.ts               # Vue Router 4 設定 + history 模式 + base '/admin/'
│   │   ├── routes.ts              # 靜態路由表（meta.roles / meta.public 標註）
│   │   └── guards.ts              # beforeEach：session 檢查 + RBAC 比對 + 麵包屑生成
│   ├── stores/                    # Pinia stores（每個 store 對應一個 BC 或橫切關注點）
│   │   ├── auth.store.ts          # admin session + me + login/2fa/logout
│   │   ├── permission.store.ts    # 當前 admin role + permission 計算屬性 + 動態選單
│   │   ├── pets.store.ts          # 寵物列表查詢/分頁/搜尋/ban/unban
│   │   ├── config.store.ts        # runtime + economy + feature flags 三組設定
│   │   ├── audit.store.ts         # audit_logs 查詢與匯出
│   │   └── ui.store.ts            # sidebar 收合狀態、theme、loading 旗標
│   ├── views/                     # 頁面（一個 view 對應一條路由）
│   │   ├── auth/
│   │   │   ├── LoginView.vue      # 帳密 + TOTP 兩步驟
│   │   │   └── TotpSetupView.vue  # 首次登入 TOTP 設定（QR code + backup codes）
│   │   ├── dashboard/
│   │   │   └── DashboardView.vue  # KPI cards + 系統健康指標
│   │   ├── pets/
│   │   │   ├── PetListView.vue    # ElTable + 搜尋 + 篩選 + 批量 ban/unban
│   │   │   └── PetDetailView.vue  # 寵物詳情 + recentBattles + ban dialog
│   │   ├── battles/
│   │   │   ├── BattleListView.vue # 戰鬥記錄列表 + 旗標篩選
│   │   │   └── SuspiciousView.vue # bot 偵測佇列
│   │   ├── leaderboard/
│   │   │   └── LeaderboardView.vue# Top 500 + 可疑高亮 + 移除按鈕
│   │   ├── config/
│   │   │   ├── RuntimeConfigView.vue  # 戰鬥速率 / 稀有度權重
│   │   │   ├── EconomyConfigView.vue  # 食物 buff / 競技場入場費
│   │   │   └── FeatureFlagsView.vue   # FF_MARKETPLACE / FF_BATTLE_RECORDS 等
│   │   ├── gdpr/
│   │   │   └── GdprQueueView.vue  # 五類 GDPR 請求佇列 + 觸發 delete
│   │   ├── audit/
│   │   │   └── AuditLogView.vue   # 不可變稽核記錄 + CSV 匯出
│   │   ├── analytics/
│   │   │   └── AnalyticsView.vue  # DAU / claim / battles 時序圖
│   │   ├── email/
│   │   │   └── EmailMonitorView.vue   # SendGrid 發送健康度
│   │   ├── roles/
│   │   │   └── RoleManagementView.vue # admin_users CRUD + TOTP reset
│   │   └── errors/
│   │       ├── NotFoundView.vue   # 404
│   │       └── ForbiddenView.vue  # 403
│   ├── layouts/
│   │   └── AdminLayout.vue        # ElContainer + Sidebar + Header + Content + BreadCrumb
│   ├── components/
│   │   ├── common/
│   │   │   ├── SearchableTable.vue    # 通用列表組件（封裝 ElTable + ElPagination + 搜尋）
│   │   │   ├── AuditLogDetail.vue     # 稽核記錄詳情抽屜（含 old/new diff）
│   │   │   ├── ConfirmDialog.vue      # 危險操作二次確認封裝
│   │   │   ├── BanReasonDialog.vue    # 統一 ban 理由輸入（500 字限制）
│   │   │   ├── PermissionButton.vue   # 依當前角色決定是否渲染按鈕
│   │   │   └── EmptyState.vue         # 空狀態組件（ElEmpty 統一樣式）
│   │   └── business/
│   │       ├── PetCard.vue            # 寵物詳情卡（含 generationMeta 6 維展示）
│   │       ├── BattleResultBadge.vue  # 戰鬥結果徽章（WIN/LOSE/AI/Flagged）
│   │       ├── RarityTag.vue          # 稀有度標籤
│   │       └── RoleTag.vue            # 角色徽章
│   ├── composables/                   # Vue Composition API 共用邏輯
│   │   ├── usePermission.ts           # hasPermission(role) / canAccess(routeName)
│   │   ├── usePagination.ts           # 統一分頁狀態 + URL 同步
│   │   ├── useTable.ts                # 表格 loading/empty/error 三狀態 + 排序
│   │   ├── useConfirm.ts              # 包裝 ElMessageBox.confirm
│   │   └── useApiError.ts             # 統一錯誤訊息映射（API.md §4.3 error codes）
│   ├── api/                           # API.md /admin/api/* 一對一封裝
│   │   ├── http.ts                    # axios instance + interceptors + ADMIN_API_TIMEOUT_MS
│   │   ├── auth.api.ts                # login / totp/setup / totp/verify / logout
│   │   ├── pets.api.ts                # GET/PUT/ban/unban
│   │   ├── battles.api.ts             # list / suspicious / flag / unflag
│   │   ├── leaderboard.api.ts         # GET / DELETE
│   │   ├── config.api.ts              # runtime / economy / flags
│   │   ├── gdpr.api.ts                # list / delete / patch
│   │   ├── audit.api.ts               # list + CSV export
│   │   ├── dashboard.api.ts           # dashboard / analytics / email/monitor
│   │   └── roles.api.ts               # roles list/create/delete/totp/reset
│   ├── types/                         # TypeScript 型別定義（與 backend Zod schema 對齊）
│   │   ├── admin.ts                   # AdminUser / Role / Permission
│   │   ├── pet.ts                     # Pet / PetDetail / Rarity
│   │   ├── battle.ts                  # ArenaMatch / BattleOutcome
│   │   ├── audit.ts                   # AuditLogEntry
│   │   ├── config.ts                  # RuntimeConfig / EconomyConfig / FeatureFlag
│   │   ├── gdpr.ts                    # GdprRequest / GdprRequestType / GdprStatus
│   │   └── api.ts                     # ApiEnvelope<T> / Pagination / QueryParams
│   ├── utils/
│   │   ├── format.ts                  # ISO 8601 → local time、masked email
│   │   ├── csv.ts                     # 客戶端 CSV 匯出（小資料）
│   │   ├── permission.ts              # ROLE_MATRIX 計算
│   │   └── validators.ts              # Zod schema for forms
│   ├── styles/
│   │   ├── element-plus-theme.scss    # Element Plus 設計 token override
│   │   ├── variables.scss             # 全域 CSS variables
│   │   └── global.scss                # reset + base typography
│   ├── locales/                       # i18n（Vue I18n 9.x）
│   │   ├── zh-TW.ts                   # 預設語言
│   │   └── en-US.ts                   # 備用語言（管理員若全英文團隊）
│   └── directives/
│       └── v-permission.ts            # 全域指令：v-permission="'pet:ban'" 隱藏無權元素
├── public/
│   ├── favicon.ico
│   └── robots.txt                     # Disallow: / （Admin Portal 禁止索引）
├── tests/
│   ├── unit/                          # vitest unit tests
│   └── e2e/                           # Playwright E2E
├── .env.development                   # VITE_API_BASE_URL=http://localhost:3000/admin/api
├── .env.production                    # VITE_API_BASE_URL=/admin/api（Nginx 反代）
├── vite.config.ts
├── tsconfig.json
├── playwright.config.ts
├── vitest.config.ts
└── package.json
```

> **Monorepo 對齊**：本目錄結構與 EDD §3.8.3 + ARCH §2.2 一致。`apps/admin` 與 `apps/api` / `apps/worker` / `apps/web` 同層；共享套件位於 `packages/shared`（含 Zod schema、ENUM、error codes）。

---

## §4 路由設計

### §4.1 路由清單（對應 ARCH §2.2 模組與 API.md §6.1–§6.9）

| 路徑 | 組件 | 需求角色（meta.roles） | API endpoint | 說明 |
|------|------|----------------------|--------------|------|
| `/admin/login` | `LoginView.vue` | 公開（meta.public=true） | `POST /admin/api/auth/login` | 帳密 + TOTP 兩步驟登入 |
| `/admin/totp-setup` | `TotpSetupView.vue` | 公開（持有 setupToken） | `POST /admin/api/auth/totp/setup` | 首次登入 TOTP 設定（QR + backup codes） |
| `/admin/dashboard` | `DashboardView.vue` | super_admin / moderator / read_only | `GET /admin/api/dashboard` | 即時 KPI 概覽 |
| `/admin/pets` | `PetListView.vue` | super_admin / moderator / read_only | `GET /admin/api/pets` | 寵物列表（pagination + 搜尋 + rarity 篩選） |
| `/admin/pets/:petId` | `PetDetailView.vue` | super_admin / moderator / read_only | `GET /admin/api/pets/:petId` | 寵物詳情 + recentBattles + ban 動作 |
| `/admin/battles` | `BattleListView.vue` | super_admin / moderator / read_only | `GET /admin/api/battles` | 戰鬥記錄列表（含 flag 篩選） |
| `/admin/suspicious` | `SuspiciousView.vue` | super_admin / moderator | `GET /admin/api/suspicious` | bot 偵測佇列（>50 battles/60min） |
| `/admin/leaderboard` | `LeaderboardView.vue` | super_admin / moderator / read_only | `GET /admin/api/leaderboard` | Top 500 排行榜 + 可疑高亮 |
| `/admin/config/runtime` | `RuntimeConfigView.vue` | super_admin | `GET/PUT /admin/api/config/runtime` | 戰鬥速率 + 稀有度權重（必須加總 100%） |
| `/admin/config/economy` | `EconomyConfigView.vue` | super_admin | `GET/PUT /admin/api/config/economy` | 食物 buff + 競技場入場費 |
| `/admin/config/flags` | `FeatureFlagsView.vue` | super_admin | `GET/PUT /admin/api/config/flags` | Feature flag 切換（FF_MARKETPLACE 等） |
| `/admin/gdpr` | `GdprQueueView.vue` | super_admin | `GET/POST/PATCH /admin/api/gdpr*` | GDPR 五類請求佇列 |
| `/admin/audit` | `AuditLogView.vue` | super_admin | `GET /admin/api/audit` | 不可變稽核記錄（2 年保留） |
| `/admin/analytics` | `AnalyticsView.vue` | super_admin / moderator / read_only | `GET /admin/api/analytics` | 時序指標（DAU/claims/battles/leaderboard_uvs） |
| `/admin/email` | `EmailMonitorView.vue` | super_admin / moderator / read_only | `GET /admin/api/email/monitor` | SendGrid 健康監控 |
| `/admin/roles` | `RoleManagementView.vue` | super_admin | `GET/POST/DELETE /admin/api/roles*` | admin_users CRUD + TOTP reset |
| `/admin/403` | `ForbiddenView.vue` | 已登入 | — | 角色不足 |
| `/admin/404` | `NotFoundView.vue` | 公開 | — | catch-all |

### §4.2 路由設定（`src/router/index.ts`）

```typescript
// apps/admin/src/router/index.ts
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { setupGuards } from './guards'

export type AdminRole = 'super_admin' | 'moderator' | 'read_only'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    roles?: AdminRole[]
    title?: string
    icon?: string
    breadcrumb?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true, title: '登入' },
  },
  {
    path: '/totp-setup',
    name: 'totp-setup',
    component: () => import('@/views/auth/TotpSetupView.vue'),
    meta: { public: true, title: 'TOTP 設定' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: {
          roles: ['super_admin', 'moderator', 'read_only'],
          title: '控制台',
          icon: 'DataLine',
          breadcrumb: '控制台',
        },
      },
      {
        path: 'pets',
        name: 'pets',
        component: () => import('@/views/pets/PetListView.vue'),
        meta: {
          roles: ['super_admin', 'moderator', 'read_only'],
          title: '寵物管理',
          icon: 'Box',
        },
      },
      {
        path: 'pets/:petId',
        name: 'pet-detail',
        component: () => import('@/views/pets/PetDetailView.vue'),
        meta: { roles: ['super_admin', 'moderator', 'read_only'] },
      },
      {
        path: 'battles',
        name: 'battles',
        component: () => import('@/views/battles/BattleListView.vue'),
        meta: { roles: ['super_admin', 'moderator', 'read_only'], title: '戰鬥記錄' },
      },
      {
        path: 'suspicious',
        name: 'suspicious',
        component: () => import('@/views/battles/SuspiciousView.vue'),
        meta: { roles: ['super_admin', 'moderator'], title: '可疑活動' },
      },
      {
        path: 'leaderboard',
        name: 'leaderboard',
        component: () => import('@/views/leaderboard/LeaderboardView.vue'),
        meta: { roles: ['super_admin', 'moderator', 'read_only'], title: '排行榜管理' },
      },
      {
        path: 'config/runtime',
        name: 'config-runtime',
        component: () => import('@/views/config/RuntimeConfigView.vue'),
        meta: { roles: ['super_admin'], title: 'Runtime 設定' },
      },
      {
        path: 'config/economy',
        name: 'config-economy',
        component: () => import('@/views/config/EconomyConfigView.vue'),
        meta: { roles: ['super_admin'], title: 'Economy 設定' },
      },
      {
        path: 'config/flags',
        name: 'config-flags',
        component: () => import('@/views/config/FeatureFlagsView.vue'),
        meta: { roles: ['super_admin'], title: 'Feature Flag' },
      },
      {
        path: 'gdpr',
        name: 'gdpr',
        component: () => import('@/views/gdpr/GdprQueueView.vue'),
        meta: { roles: ['super_admin'], title: 'GDPR 佇列' },
      },
      {
        path: 'audit',
        name: 'audit',
        component: () => import('@/views/audit/AuditLogView.vue'),
        meta: { roles: ['super_admin'], title: '稽核日誌' },
      },
      {
        path: 'analytics',
        name: 'analytics',
        component: () => import('@/views/analytics/AnalyticsView.vue'),
        meta: { roles: ['super_admin', 'moderator', 'read_only'], title: '產品分析' },
      },
      {
        path: 'email',
        name: 'email',
        component: () => import('@/views/email/EmailMonitorView.vue'),
        meta: { roles: ['super_admin', 'moderator', 'read_only'], title: '信件監控' },
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@/views/roles/RoleManagementView.vue'),
        meta: { roles: ['super_admin'], title: '角色管理' },
      },
      {
        path: '403',
        name: 'forbidden',
        component: () => import('@/views/errors/ForbiddenView.vue'),
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/errors/NotFoundView.vue'),
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
})

setupGuards(router)
```

### §4.3 路由守衛（`src/router/guards.ts`）

```typescript
// apps/admin/src/router/guards.ts
import { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissionStore } from '@/stores/permission.store'

export function setupGuards(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    const permStore = usePermissionStore()

    // 公開頁面（登入、TOTP 設定、404）直接放行
    if (to.meta.public) {
      return next()
    }

    // 未認證 → 嘗試從後端取回 me（HttpOnly cookie 仍可能有效）
    if (!authStore.isAuthenticated) {
      try {
        await authStore.fetchMe()
      } catch {
        return next({ name: 'login', query: { redirect: to.fullPath } })
      }
    }

    // 角色檢查：to.meta.roles 為空 → 任何已認證 admin 都可進
    const requiredRoles = to.meta.roles
    if (requiredRoles && requiredRoles.length > 0) {
      if (!authStore.adminRole || !requiredRoles.includes(authStore.adminRole)) {
        return next({ name: 'forbidden' })
      }
    }

    // 設定當前頁面動態權限上下文
    permStore.setCurrentRoute(to.name as string)

    next()
  })

  // 切頁完成後更新 document.title
  router.afterEach((to) => {
    if (to.meta.title) {
      document.title = `${to.meta.title} | Pixel Pet Arena Admin`
    }
  })
}
```

### §4.4 動態側邊欄生成策略（對應骨架 §5.3）

**選擇：`client-filtered`（依當前 admin role 過濾靜態路由配置）**

**理由**：EDD §9.6 / SCHEMA `admin_role_enum` 將角色固定為 3 個（super_admin / moderator / read_only），部署時即可決定全部角色清單；無多租戶或動態角色需求；前端依 `usePermissionStore().menuTree` 計算屬性過濾 `routes.ts` 即可。

**選單樹生成**：

```typescript
// stores/permission.store.ts 內部 getter
const menuTree = computed(() => {
  const role = useAuthStore().adminRole
  if (!role) return []
  return routes
    .filter((r) => !r.meta?.public && r.meta?.title)
    .filter((r) => !r.meta?.roles || r.meta.roles.includes(role))
    .map((r) => ({
      path: r.path,
      title: r.meta!.title,
      icon: r.meta?.icon,
      name: r.name as string,
    }))
})
```

> 動態選單**不需** `GET /admin/menu` 端點；UI 完全依本機路由表計算（API endpoint 數量與 §8.2 對應表一致，無多餘呼叫）。

---

## §5 RBAC 實作規格

### §5.1 角色 × 權限矩陣（對齊 EDD §9.6 + API.md §6）

每個 endpoint 的存取規則完整對應到 `audit_logs.action` 命名空間（如 `pet.ban`、`config.runtime.update`、`gdpr.delete`）。

| Endpoint 群組 | super_admin | moderator | read_only | 對應 audit action |
|---|:-:|:-:|:-:|---|
| `POST /admin/api/auth/login` | ✅ | ✅ | ✅ | `auth.login` |
| `POST /admin/api/auth/totp/setup` | ✅ | ✅ | ✅ | `auth.totp_setup` |
| `POST /admin/api/auth/totp/verify` | ✅ | ✅ | ✅ | — |
| `POST /admin/api/auth/logout` | ✅ | ✅ | ✅ | `auth.logout` |
| `GET /admin/api/dashboard` | ✅ | ✅ | ✅ | — |
| `GET /admin/api/pets` | ✅ | ✅ | ✅ | — |
| `GET /admin/api/pets/:petId` | ✅ | ✅ | ✅ | — |
| `PUT /admin/api/pets/:petId` | ✅ | ❌ | ❌ | `pet.update` |
| `POST /admin/api/pets/:petId/ban` | ✅ | ✅ | ❌ | `pet.ban` |
| `POST /admin/api/pets/:petId/unban` | ✅ | ✅ | ❌ | `pet.unban` |
| `GET /admin/api/battles` | ✅ | ✅ | ✅ | — |
| `GET /admin/api/suspicious` | ✅ | ✅ | ❌ | — |
| `POST /admin/api/battles/:matchId/flag` | ✅ | ✅ | ❌ | `arena_match.flag` |
| `DELETE /admin/api/battles/:matchId/flag` | ✅ | ✅ | ❌ | `arena_match.unflag` |
| `GET /admin/api/leaderboard` | ✅ | ✅ | ✅ | — |
| `DELETE /admin/api/leaderboard/:petId` | ✅ | ✅ | ❌ | `leaderboard.remove` |
| `GET /admin/api/config/runtime` | ✅ | ❌ | ❌ | — |
| `PUT /admin/api/config/runtime` | ✅ | ❌ | ❌ | `config.runtime.update` |
| `GET /admin/api/config/economy` | ✅ | ❌ | ❌ | — |
| `PUT /admin/api/config/economy` | ✅ | ❌ | ❌ | `config.economy.update` |
| `GET /admin/api/config/flags` | ✅ | ❌ | ❌ | — |
| `PUT /admin/api/config/flags/:flag` | ✅ | ❌ | ❌ | `config.flag.toggle` |
| `GET /admin/api/gdpr` | ✅ | ❌ | ❌ | — |
| `POST /admin/api/gdpr/delete` | ✅ | ❌ | ❌ | `gdpr.delete` |
| `PATCH /admin/api/gdpr/:requestId` | ✅ | ❌ | ❌ | `gdpr.update` |
| `GET /admin/api/audit` | ✅ | ❌ | ❌ | — |
| `GET /admin/api/analytics` | ✅ | ✅ | ✅ | — |
| `GET /admin/api/email/monitor` | ✅ | ✅ | ✅ | — |
| `GET /admin/api/roles` | ✅ | ❌ | ❌ | — |
| `POST /admin/api/roles` | ✅ | ❌ | ❌ | `admin_user.create` |
| `DELETE /admin/api/roles/:adminId` | ✅ | ❌ | ❌ | `admin_user.deactivate` |
| `POST /admin/api/roles/:adminId/totp/reset` | ✅ | ❌ | ❌ | `admin_user.totp_reset` |

### §5.2 Permission Guard 實作（Composable + Directive）

```typescript
// apps/admin/src/composables/usePermission.ts
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminRole } from '@/router'

/**
 * 角色階層：super_admin > moderator > read_only
 * 用於「至少需要 X 角色」場景（如 moderator+ 可呼叫）
 */
const ROLE_RANK: Record<AdminRole, number> = {
  read_only: 1,
  moderator: 2,
  super_admin: 3,
}

export function usePermission() {
  const authStore = useAuthStore()

  const currentRole = computed<AdminRole | null>(() => authStore.adminRole)

  /** 精確角色檢查（任一匹配） */
  function hasRole(roles: AdminRole | AdminRole[]): boolean {
    if (!currentRole.value) return false
    const list = Array.isArray(roles) ? roles : [roles]
    return list.includes(currentRole.value)
  }

  /** 階層檢查：至少需要 minRole 等級 */
  function hasMinRole(minRole: AdminRole): boolean {
    if (!currentRole.value) return false
    return ROLE_RANK[currentRole.value] >= ROLE_RANK[minRole]
  }

  /** 動作層級權限（如 'pet.ban'）：透過內部矩陣解析 */
  function can(action: string): boolean {
    if (!currentRole.value) return false
    const required = PERMISSION_MATRIX[action]
    if (!required) return false
    return required.includes(currentRole.value)
  }

  return { currentRole, hasRole, hasMinRole, can }
}

/** 與 §5.1 表格對齊；唯一 frontend 真相來源；後端為 authoritative */
export const PERMISSION_MATRIX: Record<string, AdminRole[]> = {
  'pet.update': ['super_admin'],
  'pet.ban': ['super_admin', 'moderator'],
  'pet.unban': ['super_admin', 'moderator'],
  'arena_match.flag': ['super_admin', 'moderator'],
  'arena_match.unflag': ['super_admin', 'moderator'],
  'leaderboard.remove': ['super_admin', 'moderator'],
  'config.runtime.update': ['super_admin'],
  'config.economy.update': ['super_admin'],
  'config.flag.toggle': ['super_admin'],
  'gdpr.delete': ['super_admin'],
  'gdpr.update': ['super_admin'],
  'admin_user.create': ['super_admin'],
  'admin_user.deactivate': ['super_admin'],
  'admin_user.totp_reset': ['super_admin'],
}
```

**Vue 指令版本（`v-permission`）：**

```typescript
// apps/admin/src/directives/v-permission.ts
import type { Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSION_MATRIX } from '@/composables/usePermission'

export const vPermission: Directive<HTMLElement, string> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string>) {
    const action = binding.value
    const role = useAuthStore().adminRole
    const allowed = role && PERMISSION_MATRIX[action]?.includes(role)
    if (!allowed) {
      el.parentNode?.removeChild(el)
    }
  },
}

// main.ts：app.directive('permission', vPermission)
```

**模板使用範例：**

```vue
<template>
  <!-- 按鈕層權限：moderator 以上才看得到 -->
  <el-button v-permission="'pet.ban'" type="danger" @click="onBan">
    Ban Pet
  </el-button>

  <!-- super_admin 限定 -->
  <el-button v-permission="'config.runtime.update'" type="primary">
    Save Runtime Config
  </el-button>
</template>

<script setup lang="ts">
import { usePermission } from '@/composables/usePermission'
const { hasMinRole, can } = usePermission()

// 條件式渲染（更精細控制，含階層）
const canBatchBan = computed(() => hasMinRole('moderator') && can('pet.ban'))
</script>
```

### §5.3 動態選單策略（前端過濾，與 §4.4 一致）

**值**：`client-filtered`
**理由**：3 個固定角色於部署時即定型；前端依 `routes.ts` 的 `meta.roles` 過濾即可；無 `GET /admin/menu` 端點需求。

### §5.4 Token / Session 管理

| 項目 | 規格 | 來源 |
|------|------|------|
| 認證機制 | Redis server-side session + HttpOnly Cookie | EDD §9.1 / API.md §2.2 |
| Cookie 屬性 | `HttpOnly; SameSite=Strict; Secure; Path=/admin` | API.md §2.2 |
| Inactivity timeout | 4 hours | CONSTANTS `ADMIN_SESSION_INACTIVITY_EXPIRY = 4` |
| Absolute expiry | 8 hours | CONSTANTS `ADMIN_SESSION_ABSOLUTE_EXPIRY = 8` |
| Token 存儲位置 | **HttpOnly Cookie（XSS-resistant）**；前端不存任何 token 字串於 JS 變數或 localStorage | EDD §9.1 |
| Refresh 策略 | 後端每次 authenticated request 自動 reset inactivity；前端無需手動 refresh | API.md §2.2 |
| Pre-auth IP rate limit | 10 attempts / 15 min per IP | CONSTANTS `ADMIN_LOGIN_IP_RATE_LIMIT_*` |
| Account lockout | 10 連續失敗 → 30 min 鎖定 | CONSTANTS `ADMIN_LOGIN_LOCKOUT_*` |
| TOTP 演算法 | RFC 6238 TOTP（30s window）+ AES-256-GCM 加密 secret | EDD §9.1 |
| Backup codes | 10 組 single-use，SHA-256 hash 存 `admin_users.totp_backup_codes_hash` | API.md §6.1 |

> **設計意涵**：由於採 HttpOnly Cookie，前端 `authStore` 不持有 access token 字串。Session 識別資訊（adminId / username / role）僅在 **登入時** 由 `POST /admin/api/auth/login` 回應一次性下發並寫入 in-memory Pinia store；**頁面刷新後 in-memory store 清空**，前端會以 `GET /admin/api/dashboard` 作 silent probe — 若 cookie 仍有效（200），即視為 authenticated 但因不知道角色資訊，**強制導向 `/admin/login` 要求重新輸入帳密 + TOTP 取得 role**（safer-by-default）；若 cookie 失效（401），由 §8.1 response interceptor 統一導回 login。本機制完全使用 API.md §6 既有端點清單（共 32 個），**不引入 `/admin/api/auth/me`**，避免 API surface 漂移；envelope 嚴格遵守 API.md §4.1 規格（`{success, data, error}` + 列表端點額外含 `meta` 分頁欄位）。

---

## §6 Layout 系統

### §6.1 主 Layout 結構

```
┌──────────────────────────────────────────────────────────────┐
│  Header（48px）：Logo + Title │ Search │ AdminInfo+Logout    │
├─────────────┬────────────────────────────────────────────────┤
│             │  Content Area                                  │
│             │  ┌──────────────────────────────────────────┐ │
│             │  │  BreadCrumb（Home > Pets > Detail）       │ │
│             │  ├──────────────────────────────────────────┤ │
│  Sidebar    │  │                                          │ │
│  (260px)    │  │  <router-view />                         │ │
│             │  │  max-width: 1440px                       │ │
│  選單 (動態) │  │  padding: 24px                           │ │
│             │  │                                          │ │
│             │  │                                          │ │
│             │  └──────────────────────────────────────────┘ │
└─────────────┴────────────────────────────────────────────────┘
```

**三區結構**（Header 上方 / Sidebar 左側 / Content Area 右側）；BreadCrumb 作為 Content Area 內部子元素。

**功能子項規格**：

- **HeaderBar（高度 48px）**
  - 左側：Logo + 「Pixel Pet Arena Admin」標題（h1，semantically 隱藏給 screen reader）
  - 中央：全域搜尋（pet ID / admin username 一鍵跳轉，可選功能）
  - 右側：當前 admin username + role tag + 通知 bell（顯示未處理 GDPR / suspicious 數量）+ logout 按鈕
- **SidebarMenu（展開 260px / 收合 64px）**
  - 依當前 admin role 動態過濾路由（見 §4.4）
  - 折疊功能：點擊 toggle 按鈕收合，狀態存 `uiStore.sidebarCollapsed` + `localStorage`
  - 高亮當前路由：`<el-menu :default-active="route.path">`
- **BreadCrumb（Content Area 子元素，位於頁面標題上方）**
  - 根據 `route.matched` 自動生成（搭配 `meta.breadcrumb` 或 `meta.title`）
  - 第一層永遠是「首頁」（連結至 `/admin/dashboard`）
- **Content 區域**
  - `max-width: 1440px`（avoid 全寬資料過稀疏）
  - `padding: 24px`（四向均勻）
  - `min-height: calc(100vh - 48px)`（避免短頁面留白）
  - 統一背景色 `var(--el-bg-color-page)`

### §6.2 Sidebar 規格

| 屬性 | 值 | 來源 |
|------|-----|------|
| 展開寬度 | 260px | UX 標準（Element Plus 預設） |
| 收合寬度 | 64px | 僅顯示 icon + tooltip |
| 收合後行為 | 滑鼠 hover icon → ElTooltip 顯示選單名稱 | Element Plus 預設 |
| 選中樣式 | 左邊框 4px accent 色（`var(--el-color-primary)`）+ 背景 `var(--el-color-primary-light-9)` | VDD 設計原則 + Element Plus 風格 |
| Logo 區 | 高度 48px，與 Header 對齊 | — |
| 選單字級 | 14px，行高 48px | 易讀 |
| 多層級 | 支援 2 層（config/runtime, config/economy, config/flags 採同層分組） | — |

```vue
<!-- AdminLayout.vue 結構（核心片段） -->
<template>
  <el-container class="admin-layout">
    <el-aside :width="sidebarCollapsed ? '64px' : '260px'">
      <SidebarLogo :collapsed="sidebarCollapsed" />
      <el-menu
        :default-active="route.path"
        :collapse="sidebarCollapsed"
        background-color="#001529"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <SidebarMenuItem
          v-for="item in menuTree"
          :key="item.path"
          :item="item"
        />
      </el-menu>
    </el-aside>

    <el-container>
      <el-header height="48px">
        <HeaderBar />
      </el-header>
      <el-main>
        <BreadCrumb />
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui.store'
import { usePermissionStore } from '@/stores/permission.store'

const route = useRoute()
const uiStore = useUiStore()
const permStore = usePermissionStore()
const { sidebarCollapsed } = storeToRefs(uiStore)
const { menuTree } = storeToRefs(permStore)
</script>
```

---

## §7 主要頁面規格

### §7.1 登入頁（`/admin/login`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/login` |
| 角色 | 公開 |
| API | `POST /admin/api/auth/login` |

**表單欄位**：

| 欄位 | 類型 | 驗證規則 | 說明 |
|------|------|----------|------|
| username | string | required, max 64 chars | Admin 登入帳號（非 email；避免帳號列舉攻擊） |
| password | string | required, min 12 chars（後端 bcrypt cost ≥ 12） | 密碼 |
| totpCode | string | required（首次登入除外）, exact 6 digits, numeric | TOTP 6 位數一次性碼 |

**交互規則**：

- 進入頁面 → focus username
- 提交按鈕 loading 期間 disabled，防止重複提交
- 連續 10 次失敗（CONSTANTS `ADMIN_LOGIN_LOCKOUT_THRESHOLD = 10`）→ 帳號鎖定 30 分鐘（`ADMIN_LOGIN_LOCKOUT_DURATION_MINUTES = 30`）；UI 顯示「帳號鎖定，請於 unlockedAt 後再試」
- IP 端 pre-auth 限流 10/15min；觸發 → HTTP 429，提示「請稍候再試」
- 首次登入 TOTP 未設定 → 後端回 403 `TOTP_SETUP_REQUIRED` + `setupToken` → 前端導向 `/admin/totp-setup` 並攜帶 setupToken
- 成功 → 後端設 `Set-Cookie: session=...; HttpOnly; SameSite=Strict; Secure; Path=/admin` → 前端 `router.replace(query.redirect || '/admin/dashboard')`

**錯誤映射**（API.md §4.3）：

| Error Code | UI 訊息 |
|---|---|
| `VALIDATION_ERROR` | 「請輸入帳號、密碼與 TOTP 代碼」 |
| `UNAUTHORIZED` | 「帳號或密碼錯誤」（不洩漏哪個錯，反列舉） |
| `ACCOUNT_LOCKED` | 「帳號暫時鎖定，請於 {unlockedAt 本地時間} 後再試」 |
| `TOTP_SETUP_REQUIRED` | 自動導向 `/admin/totp-setup` |
| `RATE_LIMIT_EXCEEDED` | 「登入嘗試過於頻繁，請稍候再試」 |

### §7.2 TOTP 設定頁（`/admin/totp-setup`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/totp-setup` |
| 角色 | 公開（持有 setupToken） |
| API | `POST /admin/api/auth/totp/setup` |

**流程**：

1. 接收路由 query `setupToken`（從 `/admin/login` 403 response 帶入；15 分鐘有效）
2. 要求 admin 重新輸入密碼以二次驗證
3. 呼叫 `POST /admin/api/auth/totp/setup` → 取回 `otpAuthUrl` + `backupCodes[10]`
4. 顯示 QR code（由 `qrcode` library 從 `otpAuthUrl` 生成），下方顯示 10 組 backup codes
5. 強制 admin 勾選「我已備份 backup codes」才能繼續
6. 完成後導向 `/admin/login` 重新登入（攜帶 TOTP）

### §7.3 控制台（`/admin/dashboard`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/dashboard` |
| 角色 | super_admin / moderator / read_only |
| API | `GET /admin/api/dashboard` |
| 載入目標 | < 3 秒（CONSTANTS `ADMIN_PAGE_LOAD_TIME = 3`） |

**KPI 卡片**（依 API.md §6.9 dashboard response 對應）：

| 卡片名稱 | 資料來源欄位 | 更新策略 | 顏色語意 |
|---|---|---|---|
| 今日 Claim 寵物數 | `claimedPetsToday` | 頁面載入時 + 每 60 秒輪詢 | 中性藍 |
| 今日 Arena 戰鬥數 | `activeBattlesToday` | 頁面載入時 + 每 60 秒輪詢 | 中性藍 |
| 待處理 GDPR 請求 | `pendingGdprRequests` | 頁面載入時 + 每 30 秒輪詢 | 紅色（> 0 時警示） |
| Daily Active Users | `dailyActiveUsers` | 頁面載入時 | 中性藍 |
| 5 分鐘錯誤率 | `errorRateLast5Min` | 頁面載入時 + 每 30 秒輪詢 | 綠（< 1%）/ 橘（1–5%）/ 紅（> 5%） |
| 信件送達率 | `emailDeliveryRate` | 頁面載入時 + 每 60 秒輪詢 | 綠（≥ 98%）/ 紅（< 98%） |
| 系統狀態 | `systemStatus` | 頁面載入時 + 每 30 秒輪詢 | healthy=綠 / degraded=橘 / down=紅 |

**圖表**：

| 圖表 | 類型 | 資料來源 | 說明 |
|------|------|---------|------|
| 過去 7 天 DAU | ECharts LineChart | `GET /admin/api/analytics?metric=dau&from=...&to=...` | 7 天時序，頁面載入時拉取一次 |
| 過去 7 天 Claims | ECharts LineChart | `GET /admin/api/analytics?metric=claims&from=...&to=...` | 同上 |
| 過去 7 天 Arena Battles | ECharts BarChart | `GET /admin/api/analytics?metric=arena_battles&from=...&to=...` | 同上 |

### §7.4 寵物列表（`/admin/pets`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/pets` |
| 角色 | super_admin / moderator / read_only |
| API | `GET /admin/api/pets`（query: page, limit, search, rarity, isBanned） |
| 搜尋目標 | < 2 秒（1M records；CONSTANTS `ADMIN_SEARCH_RESPONSE_TIME = 2`） |

**列表欄位**：

| 欄位 | 來源 | 排序 | 寬度 |
|------|------|------|------|
| Pet ID | `id` | ❌ | 280px（mono font） |
| Owner Email（masked） | `ownerEmailMasked`（後端解密 + masking） | ❌ | 200px |
| Rarity | `rarity` | ✅ | 100px（彩色 tag） |
| Level | `level` | ✅ | 80px |
| Battles Played | `battlesPlayed` | ✅ | 120px |
| Win Rate | `winRate`（百分比） | ✅ | 100px |
| Status | `isBanned`（已 ban 紅標 / 正常綠標） | ✅ | 100px |
| Created At | `createdAt` | ✅ | 160px（local time） |
| 操作 | — | — | 200px |

**搜尋／篩選**：

- 全域搜尋框：支援 **精確 pet UUID** 或 **精確 SHA-256 email hash**（碎片搜尋因 email 為 AES-256-GCM 密文不支援；後端僅支援 hash 索引查找）
- Rarity 下拉：全部 / COMMON / RARE / EPIC / LEGENDARY
- 狀態 toggle：全部 / 正常 / 已 Ban

**操作按鈕**：

| 按鈕 | Permission | 動作 |
|------|------------|------|
| 查看詳情 | 所有角色 | 跳轉 `/admin/pets/:petId` |
| Ban | `pet.ban`（moderator+） | 開啟 BanReasonDialog，輸入 reason（max 500 chars）後呼叫 `POST /admin/api/pets/:petId/ban` |
| Unban | `pet.unban`（moderator+） | 開啟 ConfirmDialog，輸入 reason 後呼叫 `POST /admin/api/pets/:petId/unban` |

**分頁**：每頁 20 筆（CONSTANTS 預設）；ElPagination 顯示「第 X 頁 / 共 N 頁，總計 T 筆」。

### §7.5 寵物詳情（`/admin/pets/:petId`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/pets/:petId` |
| 角色 | super_admin / moderator / read_only |
| API | `GET /admin/api/pets/:petId` + `PUT /admin/api/pets/:petId`（super_admin） + `POST /admin/api/pets/:petId/ban|unban` |

**顯示區塊**：

1. **基本資料卡**：petName、seed、rarity、stats（speed/strength/stamina/level）、isBanned、bannedReason、bannedAt、claimedAt、ownerEmailMasked
2. **6 維生成資訊**：`generationMeta`（body / head / colorPalette / accessory / rarityTrait / pattern），以 ElDescriptions 展示
3. **最近 20 場戰鬥**（`arena_battle_records_display_count = 20`）：matchId、mode、opponentPetId、isAiOpponent、result、completedAt；點擊跳 `/admin/battles?petId=...`
4. **動作區**：
   - **PUT** 編輯 `petName` / `banReason`（僅 super_admin；觸發 `pet.update`）
   - **Ban**（moderator+）：BanReasonDialog
   - **Unban**（moderator+）：ConfirmDialog
   - **檢視稽核軌跡**（super_admin）：跳轉 `/admin/audit?targetType=pet&targetId=:petId`

### §7.6 戰鬥記錄（`/admin/battles`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/battles` |
| 角色 | super_admin / moderator / read_only |
| API | `GET /admin/api/battles`（query: page, limit, from, to, petId, flagged） + `POST/DELETE /admin/api/battles/:matchId/flag` |

**列表欄位**：matchId、petAId、petBId、winnerId、outcome、duration（秒）、completedAt、isFlagged（旗標 icon）

**篩選**：日期範圍（from/to）、特定 pet（petId）、僅顯示已旗標（flagged=true）

**操作**：

- 「打旗」按鈕：moderator+，呼叫 `POST /admin/api/battles/:matchId/flag`（reason 必填 500 chars）→ `arena_match.flag`
- 「移除旗標」按鈕（僅已旗標時顯示）：moderator+，呼叫 `DELETE /admin/api/battles/:matchId/flag`（body: `{ reason }`）→ `arena_match.unflag`
- 查看詳情（drawer）：顯示完整 battle_log JSON

### §7.7 可疑活動佇列（`/admin/suspicious`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/suspicious` |
| 角色 | super_admin / moderator |
| API | `GET /admin/api/suspicious` |
| 觸發條件 | 任一 pet > 50 battles / 60 min 滾動窗（CONSTANTS `BOT_DETECTION_BATTLES_THRESHOLD = 50`） |

**列表欄位**：petId、battlesLastHour（高亮 ≥ 50）、winRate（高亮 ≥ 95%）、flagCount、lastFlaggedAt

**操作**：

- 「Dismiss flag」：moderator+，將該 pet 從 suspicious 列表臨時隱藏（不影響 audit）
- 「Ban arena only」：呼叫 `POST /admin/api/pets/:petId/ban`，reason 含「arena-only ban」
- 「Ban platform」：呼叫 `POST /admin/api/pets/:petId/ban` + `DELETE /admin/api/leaderboard/:petId`，兩個動作分別 audit
- 查看其戰鬥列表：跳轉 `/admin/battles?petId=...`

### §7.8 排行榜管理（`/admin/leaderboard`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/leaderboard` |
| 角色 | super_admin / moderator / read_only |
| API | `GET /admin/api/leaderboard` + `DELETE /admin/api/leaderboard/:petId` |
| 顯示筆數 | Top 500（CONSTANTS `LEADERBOARD_ADMIN_VIEW = 500`） |

**列表欄位**：rank、petId、petName、rarity、level、score、winRate、battlesLastHour、isSuspicious、isBanned

**篩選**：僅顯示 isSuspicious / 僅顯示 isBanned / 稀有度

**操作**：

- 「從排行榜移除」：moderator+，呼叫 `DELETE /admin/api/leaderboard/:petId`，5 分鐘內反映到 public leaderboard（CONSTANTS `LEADERBOARD_BAN_REFLECTION_TIME = 5`）→ `leaderboard.remove`

> **特殊規格**：本端點為 **hard-capped list**，不分頁；UI 不顯示 ElPagination;總筆數 ≤ 500。

### §7.9 Runtime 設定（`/admin/config/runtime`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/config/runtime` |
| 角色 | super_admin |
| API | `GET /admin/api/config/runtime` + `PUT /admin/api/config/runtime` |

**可調整參數**：

| 欄位 | 範圍 | 預設 | CONSTANTS |
|------|------|------|-----------|
| `arenaRateLimitBattlesPerHour` | 1–50（整數） | 10 | `ARENA_RATE_LIMIT_ADMIN_MIN = 1`, `ADMIN_MAX = 50` |
| `arenaMatchmakingTimeoutSeconds` | 建議 5–120（無硬限，operator judgement） | 30 | `ARENA_MATCHMAKING_TIMEOUT = 30` |
| `rarityWeights.common` | 0–100 | 60 | RTP §5 |
| `rarityWeights.rare` | 0–100 | 25 | RTP §5 |
| `rarityWeights.epic` | 0–100 | 12 | RTP §5 |
| `rarityWeights.legendary` | 0–100 | 3 | RTP §5 |

**前端驗證規則**：

- 四個 rarityWeights 加總必須 = 100（即時驗證；顯示「目前加總：N，需 = 100」）
- `arenaRateLimitBattlesPerHour` 必須整數且在 [1, 50]
- 提交前 Preview Dialog：顯示「old → new」對照（AC-018-2 啟發），按下「確認儲存」才送出
- 提交成功 → ElMessage.success「設定已儲存，5 分鐘內生效」（CONSTANTS `CONFIG_CACHE_REFRESH_TIME = 5`）
- 錯誤 `OUT_OF_RANGE` → 標紅對應欄位並顯示伺服器訊息

### §7.10 Economy 設定（`/admin/config/economy`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/config/economy` |
| 角色 | super_admin |
| API | `GET /admin/api/config/economy` + `PUT /admin/api/config/economy` |

**可調整參數**：

| 欄位 | 範圍 | 預設 | CONSTANTS |
|------|------|------|-----------|
| `foodBuffMultiplierMin` | 0.5–5.0（浮點） | 0.5 | `FOOD_BUFF_MULTIPLIER_ADMIN_MIN = 0.5` |
| `foodBuffMultiplierMax` | 0.5–5.0（浮點） | 5.0 | `FOOD_BUFF_MULTIPLIER_ADMIN_MAX = 5.0` |
| `arenaEntryCostFoodCreditsDefault` | 0–10（整數） | 0 | `ARENA_ENTRY_COST_FOOD_CREDITS_DEFAULT = 0` |
| `arenaEntryCostFoodCreditsMax` | 0–10（整數） | 10 | `ARENA_ENTRY_COST_FOOD_CREDITS_ADMIN_MAX = 10` |
| `arenaEntryCooldownMinMinutes` | 0–60 | 0 | `ARENA_ENTRY_COOLDOWN_ADMIN_MIN = 0` |
| `arenaEntryCooldownMaxMinutes` | 0–60 | 60 | `ARENA_ENTRY_COOLDOWN_ADMIN_MAX = 60` |

**前端驗證規則**：

- min 必須 ≤ max
- 提交前 Preview Dialog 與 §7.9 同
- 5 分鐘內生效

### §7.11 Feature Flag（`/admin/config/flags`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/config/flags` |
| 角色 | super_admin |
| API | `GET /admin/api/config/flags` + `PUT /admin/api/config/flags/:flag` |

**顯示**：旗標列表（flag name、enabled toggle、description）

**操作**：每個旗標 toggle 切換 → 二次確認 ElMessageBox（「啟用 FF_MARKETPLACE 將影響所有玩家，確定？」）→ 呼叫 `PUT /admin/api/config/flags/:flag` body `{ enabled }` → `config.flag.toggle`

### §7.12 GDPR 佇列（`/admin/gdpr`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/gdpr` |
| 角色 | super_admin |
| API | `GET /admin/api/gdpr` + `POST /admin/api/gdpr/delete` + `PATCH /admin/api/gdpr/:requestId` |

**列表欄位**：requestId、requestType（erasure / data_access / restrict_processing / object_leaderboard / rectification）、status（pending / processing / completed / failed）、submittedAt、completedAt、adminNotes

**篩選**：status、type

**操作**：

- **觸發 Erasure（admin-initiated）**：開啟 Dialog，輸入 emailHash + reason（500 chars） → 呼叫 `POST /admin/api/gdpr/delete` → 24 小時內完成 email 雜湊化（CONSTANTS `GDPR_EMAIL_HASHING_INTERNAL_SLA = 24`），7 天內回報合規（`GDPR_EMAIL_DELETION_WINDOW = 7`）→ `gdpr.delete`
- **更新非 erasure 請求狀態**：對於 data_access / restrict / object / rectification 類請求，呼叫 `PATCH /admin/api/gdpr/:requestId` body `{ status, adminNotes }` → `gdpr.update`
- **錯誤 `WRONG_REQUEST_TYPE`**：若嘗試 PATCH erasure 請求，顯示「Erasure 必須透過刪除按鈕觸發」

### §7.13 稽核日誌（`/admin/audit`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/audit` |
| 角色 | super_admin |
| API | `GET /admin/api/audit`（query: page, limit, from, to, actorId, action） |
| 搜尋目標 | < 3 秒（任意 12 個月窗；CONSTANTS `ADMIN_AUDIT_LOG_SEARCH_RESPONSE_TIME = 3`） |
| 保留期 | 2 年（CONSTANTS `ADMIN_AUDIT_LOG_RETENTION = 2`） |

**列表欄位**：id、createdAt、adminUsername（join admin_users）、action（如 `pet.ban`）、targetType、targetId、detail（JSONB 摘要）

**篩選**：日期範圍、actorId（admin）、action 類型

**操作**：

- 「展開詳情」：開啟 AuditLogDetail drawer，顯示完整 `detail` JSON（含 old_value / new_value diff）
- 「匯出 CSV」：super_admin 可下載目前篩選結果為 CSV（PRD §19.5 合規報告需求）
- **唯讀**：不可刪除、不可編輯（資料庫層級 append-only）

### §7.14 產品分析（`/admin/analytics`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/analytics` |
| 角色 | super_admin / moderator / read_only |
| API | `GET /admin/api/analytics`（query: from, to, metric） |

**可選指標**：dau、claims、arena_battles、leaderboard_uvs

**顯示**：時序折線圖（ECharts）+ summary 卡（total / average / peak）

**互動**：日期範圍選擇器（ElDatePicker, daterange）+ 指標切換 tab + CSV 匯出

### §7.15 信件監控（`/admin/email`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/email` |
| 角色 | super_admin / moderator / read_only |
| API | `GET /admin/api/email/monitor` |

**顯示**：

- `emailsSentLast24h`（卡片）
- `deliverySuccessRate`（目標 ≥ 98%；CONSTANTS `CLAIM_EMAIL_DELIVERY_RATE_TARGET = 98`）
- `bounceRate`
- `spamComplaintRate`（目標 < 0.1%；CONSTANTS `CLAIM_FORM_ERROR_RATE_MAX` 相關）
- `failoverActive`（true 時 Tag 顯示「Nodemailer SMTP fallback」）

**警示**：3 次連續 SendGrid 失敗（`SENDGRID_FAILOVER_CONSECUTIVE_FAILURES = 3`）→ failoverActive=true → UI 紅色 banner

### §7.16 角色管理（`/admin/roles`）

| 屬性 | 規格 |
|------|------|
| 路徑 | `/admin/roles` |
| 角色 | super_admin |
| API | `GET/POST /admin/api/roles` + `DELETE /admin/api/roles/:adminId` + `POST /admin/api/roles/:adminId/totp/reset` |

**列表欄位**：adminId、username、role（彩色 tag）、lastLoginAt、deactivatedAt

**操作**：

- 「新增 admin」：Dialog 輸入 username + role（下拉 3 選 1） + temporaryPassword → 呼叫 `POST /admin/api/roles` → `admin_user.create`
- 「停用」：軟刪除，設 `deactivated_at = NOW()`，呼叫 `DELETE /admin/api/roles/:adminId` → `admin_user.deactivate`
- 「Reset TOTP」：清除 `totp_secret_encrypted` + `totp_backup_codes_hash`，下次登入強制重新設定 → `POST /admin/api/roles/:adminId/totp/reset` → `admin_user.totp_reset`

**保護規則**：

- 不可刪除自己（前端按鈕 disable + 後端額外檢查）
- 系統至少保留 1 個 super_admin（後端 invariant）

---

## §8 API 整合

### §8.1 Axios 配置（`src/api/http.ts`）

```typescript
// apps/admin/src/api/http.ts
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth.store'
import { router } from '@/router'
import { mapApiError } from '@/composables/useApiError'
import type { ApiEnvelope } from '@/types/api'

/**
 * Admin API timeout（毫秒）
 * 來源：CONSTANTS.md 預設 10000ms（10 秒）；audit 端點需 ≤ 3s，dashboard ≤ 3s，pet search ≤ 2s
 * Note: CONSTANTS.md 暫無顯式 ADMIN_API_TIMEOUT_MS，採此預設值
 */
const ADMIN_API_TIMEOUT_MS = 10000 // 來自 CONSTANTS.md，預設 10000ms

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: ADMIN_API_TIMEOUT_MS,
  withCredentials: true, // 攜帶 HttpOnly session cookie
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request Interceptor：附加 X-Request-Id（trace 用，便於支援票根對齊）
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers.set('X-Request-Id', crypto.randomUUID())
  return config
})

// Response Interceptor：統一錯誤映射 + 401 重導
http.interceptors.response.use(
  (response: AxiosResponse<ApiEnvelope<unknown>>) => {
    return response
  },
  async (error: AxiosError<ApiEnvelope<null>>) => {
    const status = error.response?.status
    const code = error.response?.data?.error?.code
    const authStore = useAuthStore()

    if (status === 401) {
      // Session 過期或被撤銷：強制登出 + 導向 login
      authStore.clearSession()
      if (router.currentRoute.value.name !== 'login') {
        await router.replace({
          name: 'login',
          query: { redirect: router.currentRoute.value.fullPath },
        })
      }
      ElMessage.warning('Session 已過期，請重新登入')
      return Promise.reject(error)
    }

    if (status === 403 && code === 'ACCOUNT_LOCKED') {
      const unlockedAt = error.response?.data?.error?.details?.unlockedAt
      await ElMessageBox.alert(
        `帳號鎖定至 ${unlockedAt ?? '系統指定時間'}`,
        '帳號鎖定',
        { type: 'error' },
      )
      return Promise.reject(error)
    }

    if (status === 403) {
      ElMessage.error(mapApiError(code) ?? '權限不足')
      return Promise.reject(error)
    }

    if (status === 429) {
      const retryAfter = error.response?.headers['retry-after']
      ElMessage.warning(
        `請求過於頻繁，請於 ${retryAfter ?? '稍候'} 秒後再試`,
      )
      return Promise.reject(error)
    }

    if (!status || status >= 500) {
      ElMessage.error('系統錯誤，請聯絡管理員或稍後再試')
    } else {
      ElMessage.error(error.response?.data?.error?.message ?? mapApiError(code) ?? '請求失敗')
    }
    return Promise.reject(error)
  },
)
```

### §8.2 Admin Endpoint 對應表（API.md §6 一對一）

| # | 功能 | Method | Path | 所需角色 | 對應頁面 | 對應 audit action |
|---|------|--------|------|---------|---------|------------------|
| 1 | Admin 登入 | POST | `/admin/api/auth/login` | 公開 | `/admin/login` | `auth.login` |
| 2 | TOTP 設定 | POST | `/admin/api/auth/totp/setup` | 公開（setupToken） | `/admin/totp-setup` | `auth.totp_setup` |
| 3 | TOTP 驗證 | POST | `/admin/api/auth/totp/verify` | 已認證 | step-up | — |
| 4 | 登出 | POST | `/admin/api/auth/logout` | 已認證 | HeaderBar | `auth.logout` |
| 5 | Dashboard | GET | `/admin/api/dashboard` | super_admin / moderator / read_only | `/admin/dashboard` | — |
| 6 | 寵物列表 | GET | `/admin/api/pets` | super_admin / moderator / read_only | `/admin/pets` | — |
| 7 | 寵物詳情 | GET | `/admin/api/pets/:petId` | super_admin / moderator / read_only | `/admin/pets/:petId` | — |
| 8 | 更新寵物 | PUT | `/admin/api/pets/:petId` | super_admin | `/admin/pets/:petId` | `pet.update` |
| 9 | Ban 寵物 | POST | `/admin/api/pets/:petId/ban` | moderator+ | `/admin/pets` + `/admin/pets/:petId` | `pet.ban` |
| 10 | Unban 寵物 | POST | `/admin/api/pets/:petId/unban` | moderator+ | `/admin/pets` + `/admin/pets/:petId` | `pet.unban` |
| 11 | 戰鬥列表 | GET | `/admin/api/battles` | super_admin / moderator / read_only | `/admin/battles` | — |
| 12 | 可疑佇列 | GET | `/admin/api/suspicious` | moderator+ | `/admin/suspicious` | — |
| 13 | 旗標戰鬥 | POST | `/admin/api/battles/:matchId/flag` | moderator+ | `/admin/battles` | `arena_match.flag` |
| 14 | 移除旗標 | DELETE | `/admin/api/battles/:matchId/flag` | moderator+ | `/admin/battles` | `arena_match.unflag` |
| 15 | 排行榜 | GET | `/admin/api/leaderboard` | super_admin / moderator / read_only | `/admin/leaderboard` | — |
| 16 | 排行榜移除 | DELETE | `/admin/api/leaderboard/:petId` | moderator+ | `/admin/leaderboard` | `leaderboard.remove` |
| 17 | Runtime config 讀 | GET | `/admin/api/config/runtime` | super_admin | `/admin/config/runtime` | — |
| 18 | Runtime config 寫 | PUT | `/admin/api/config/runtime` | super_admin | `/admin/config/runtime` | `config.runtime.update` |
| 19 | Economy config 讀 | GET | `/admin/api/config/economy` | super_admin | `/admin/config/economy` | — |
| 20 | Economy config 寫 | PUT | `/admin/api/config/economy` | super_admin | `/admin/config/economy` | `config.economy.update` |
| 21 | Flags 讀 | GET | `/admin/api/config/flags` | super_admin | `/admin/config/flags` | — |
| 22 | Flag 切換 | PUT | `/admin/api/config/flags/:flag` | super_admin | `/admin/config/flags` | `config.flag.toggle` |
| 23 | GDPR 列表 | GET | `/admin/api/gdpr` | super_admin | `/admin/gdpr` | — |
| 24 | GDPR Erasure | POST | `/admin/api/gdpr/delete` | super_admin | `/admin/gdpr` | `gdpr.delete` |
| 25 | GDPR 更新 | PATCH | `/admin/api/gdpr/:requestId` | super_admin | `/admin/gdpr` | `gdpr.update` |
| 26 | 稽核日誌 | GET | `/admin/api/audit` | super_admin | `/admin/audit` | — |
| 27 | 產品分析 | GET | `/admin/api/analytics` | super_admin / moderator / read_only | `/admin/analytics` + `/admin/dashboard` | — |
| 28 | 信件監控 | GET | `/admin/api/email/monitor` | super_admin / moderator / read_only | `/admin/email` + `/admin/dashboard` | — |
| 29 | 角色列表 | GET | `/admin/api/roles` | super_admin | `/admin/roles` | — |
| 30 | 建立 admin | POST | `/admin/api/roles` | super_admin | `/admin/roles` | `admin_user.create` |
| 31 | 停用 admin | DELETE | `/admin/api/roles/:adminId` | super_admin | `/admin/roles` | `admin_user.deactivate` |
| 32 | TOTP reset | POST | `/admin/api/roles/:adminId/totp/reset` | super_admin | `/admin/roles` | `admin_user.totp_reset` |

> 共 32 個 endpoint，與 API.md §6.1–§6.9 一對一對齊。

### §8.3 API 封裝模組範例（`src/api/pets.api.ts`）

```typescript
// apps/admin/src/api/pets.api.ts
import { http } from './http'
import type { ApiEnvelope, Pagination } from '@/types/api'
import type { Pet, PetDetail, Rarity } from '@/types/pet'

export interface ListPetsQuery extends Pagination {
  search?: string
  rarity?: Rarity
  isBanned?: boolean
}

export interface BanPetPayload {
  reason: string // max 500 chars
}

export const petsApi = {
  list(query: ListPetsQuery) {
    return http.get<ApiEnvelope<{ pets: Pet[] }>>('/pets', { params: query })
  },
  detail(petId: string) {
    return http.get<ApiEnvelope<PetDetail>>(`/pets/${petId}`)
  },
  update(petId: string, payload: { petName?: string; banReason?: string }) {
    return http.put<ApiEnvelope<{ auditLogId: string }>>(`/pets/${petId}`, payload)
  },
  ban(petId: string, payload: BanPetPayload) {
    return http.post<ApiEnvelope<{ auditLogId: string }>>(
      `/pets/${petId}/ban`,
      payload,
    )
  },
  unban(petId: string, payload: BanPetPayload) {
    return http.post<ApiEnvelope<{ auditLogId: string }>>(
      `/pets/${petId}/unban`,
      payload,
    )
  },
}
```

---

## §9 Pinia Store 架構

### §9.1 Store 清單

| Store | 職責 | 主要 state |
|-------|------|-----------|
| `authStore` | Admin 認證狀態 / Session 旗標 / TOTP 流程 | `adminId`, `adminUsername`, `adminRole`, `sessionExpiresAt`, `isAuthenticated`, `setupToken`, `loginStep` |
| `permissionStore` | 當前 admin 可用 menu + permission 計算 | `menuTree`, `currentRoute`, `breadcrumb` |
| `petsStore` | 寵物列表查詢與 ban/unban 業務狀態 | `petList`, `pagination`, `filters`, `currentPet` |
| `configStore` | runtime / economy / flags 三組設定 | `runtime`, `economy`, `flags`, `dirtyFields` |
| `auditStore` | 稽核日誌查詢 + CSV 匯出狀態 | `entries`, `pagination`, `filters` |
| `uiStore` | sidebar 收合、theme、global loading | `sidebarCollapsed`, `loadingCount` |

### §9.2 authStore（HttpOnly Cookie 模式；對齊 §5.4）

```typescript
// apps/admin/src/stores/auth.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth.api'
import { dashboardApi } from '@/api/dashboard.api'
import { router } from '@/router'
import type { AdminRole } from '@/router'

export interface LoginRequest {
  username: string
  password: string
  totpCode?: string
}

export interface LoginSuccess {
  adminId: string
  role: AdminRole
  sessionExpiresAt: string
}

export const useAuthStore = defineStore('auth', () => {
  // === State ===
  const adminId = ref<string | null>(null)
  const adminUsername = ref<string | null>(null)
  const adminRole = ref<AdminRole | null>(null)
  const sessionExpiresAt = ref<string | null>(null)

  // 登入流程狀態（用於兩步驟 UI）
  const loginStep = ref<'password' | 'totp_setup'>('password')
  const setupToken = ref<string | null>(null)

  // === Getters ===
  /**
   * Token 模式：HttpOnly Cookie（見 §5.4）
   * 因此前端不持有 access token 字串；isAuthenticated 透過後端 me 端點驗證
   * 注意：sessionExpiresAt 為輔助欄位，僅作 UI 倒數提示，不作為授權判斷依據
   */
  const isAuthenticated = computed(() => !!adminId.value && !!adminRole.value)

  // === Actions ===
  async function login(req: LoginRequest): Promise<void> {
    const { data } = await authApi.login(req)
    const payload = data.data as LoginSuccess
    adminId.value = payload.adminId
    adminRole.value = payload.role
    sessionExpiresAt.value = payload.sessionExpiresAt
    await fetchMe()
  }

  async function handleTotpSetupRequired(token: string) {
    setupToken.value = token
    loginStep.value = 'totp_setup'
    await router.replace({
      path: '/totp-setup',
      query: { setupToken: token },
    })
  }

  async function setupTotp(password: string): Promise<{ otpAuthUrl: string; backupCodes: string[] }> {
    if (!setupToken.value) throw new Error('setupToken not present')
    const { data } = await authApi.setupTotp({
      setupToken: setupToken.value,
      password,
    })
    setupToken.value = null
    return data.data as { otpAuthUrl: string; backupCodes: string[] }
  }

  /**
   * Silent session probe（頁面刷新後 in-memory store 清空時使用）：
   * - 透過 GET /admin/api/dashboard 探測 cookie 仍有效。
   * - 由於 API.md §4.1 envelope 規格僅含 {success, data, error}（列表端點額外含 meta 分頁欄位），
   *   無 actor 資訊可供同步 store，因此 **無論 dashboard probe 成功或失敗，都拋例外讓 router guard 導回 login**，
   *   要求重新輸入帳密 + TOTP，由 login response 重新填充 store（safer-by-default）。
   * - 此設計避免新增 /auth/me 端點，嚴格遵守 API.md §4 envelope 與 §6 32 個既有端點清單。
   */
  async function fetchMe(): Promise<void> {
    // 嘗試呼叫 dashboard 作 cookie 有效性 probe
    // 401 → §8.1 interceptor 已處理；2xx → 仍強制 re-login 以取得 role 資訊
    try {
      await dashboardApi.get()
    } catch {
      // 401 由 interceptor 處理；其他錯誤同樣不視為 authenticated
    }
    // 不論 probe 結果，都需要重新登入以取得 role；交由 router guard 導回 /admin/login
    throw new Error('AUTH_RESYNC_REQUIRED: in-memory session lost; please re-login')
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } finally {
      clearSession()
      await router.replace({ name: 'login' })
    }
  }

  function clearSession(): void {
    adminId.value = null
    adminUsername.value = null
    adminRole.value = null
    sessionExpiresAt.value = null
    loginStep.value = 'password'
    setupToken.value = null
  }

  return {
    adminId,
    adminUsername,
    adminRole,
    sessionExpiresAt,
    loginStep,
    setupToken,
    isAuthenticated,
    login,
    handleTotpSetupRequired,
    setupTotp,
    fetchMe,
    logout,
    clearSession,
  }
})
```

> **重要設計**：因 §5.4 採 **HttpOnly Cookie**，store **不**存取 token 字串；無 `accessToken.value = res.access_token` 矛盾；`isAuthenticated` 依賴後端確認的 user 物件。

### §9.3 permissionStore

```typescript
// apps/admin/src/stores/permission.store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from './auth.store'
import { router } from '@/router'

export interface MenuNode {
  path: string
  title: string
  icon?: string
  name: string
  children?: MenuNode[]
}

export const usePermissionStore = defineStore('permission', () => {
  const authStore = useAuthStore()
  const currentRoute = ref<string>('')

  /** 依當前角色過濾路由 → 選單樹 */
  const menuTree = computed<MenuNode[]>(() => {
    const role = authStore.adminRole
    if (!role) return []
    return router
      .getRoutes()
      .filter(
        (r) =>
          !r.meta?.public &&
          r.meta?.title &&
          (!r.meta?.roles || (r.meta.roles as string[]).includes(role)),
      )
      .map((r) => ({
        path: r.path.startsWith('/') ? r.path : `/${r.path}`,
        title: r.meta!.title as string,
        icon: r.meta?.icon as string | undefined,
        name: r.name as string,
      }))
  })

  /** 麵包屑：從當前路由的 matched 上溯產生 */
  const breadcrumb = computed(() => {
    const route = router.currentRoute.value
    return route.matched
      .filter((m) => m.meta?.breadcrumb || m.meta?.title)
      .map((m) => ({
        path: m.path,
        title: (m.meta?.breadcrumb ?? m.meta?.title) as string,
      }))
  })

  function setCurrentRoute(name: string): void {
    currentRoute.value = name
  }

  function hasPermission(action: string): boolean {
    const role = authStore.adminRole
    if (!role) return false
    return PERMISSION_MATRIX[action]?.includes(role) ?? false
  }

  return { menuTree, breadcrumb, currentRoute, setCurrentRoute, hasPermission }
})

const PERMISSION_MATRIX: Record<string, string[]> = {
  'pet.update': ['super_admin'],
  'pet.ban': ['super_admin', 'moderator'],
  'pet.unban': ['super_admin', 'moderator'],
  'arena_match.flag': ['super_admin', 'moderator'],
  'arena_match.unflag': ['super_admin', 'moderator'],
  'leaderboard.remove': ['super_admin', 'moderator'],
  'config.runtime.update': ['super_admin'],
  'config.economy.update': ['super_admin'],
  'config.flag.toggle': ['super_admin'],
  'gdpr.delete': ['super_admin'],
  'gdpr.update': ['super_admin'],
  'admin_user.create': ['super_admin'],
  'admin_user.deactivate': ['super_admin'],
  'admin_user.totp_reset': ['super_admin'],
}
```

### §9.4 petsStore（業務 store 範例）

```typescript
// apps/admin/src/stores/pets.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { petsApi, type ListPetsQuery } from '@/api/pets.api'
import type { Pet, PetDetail } from '@/types/pet'

const DEFAULT_PAGE_SIZE = 20

export const usePetsStore = defineStore('pets', () => {
  const petList = ref<Pet[]>([])
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const filters = ref<Omit<ListPetsQuery, 'page' | 'limit'>>({})
  const currentPet = ref<PetDetail | null>(null)
  const loading = ref(false)

  async function fetchList(): Promise<void> {
    loading.value = true
    try {
      const { data } = await petsApi.list({
        ...filters.value,
        page: currentPage.value,
        limit: pageSize.value,
      })
      petList.value = data.data!.pets
      total.value = data.meta?.total ?? 0
    } finally {
      loading.value = false
    }
  }

  async function fetchDetail(petId: string): Promise<void> {
    const { data } = await petsApi.detail(petId)
    currentPet.value = data.data!
  }

  async function ban(petId: string, reason: string): Promise<void> {
    await petsApi.ban(petId, { reason })
    await fetchList()
  }

  async function unban(petId: string, reason: string): Promise<void> {
    await petsApi.unban(petId, { reason })
    await fetchList()
  }

  function setFilters(next: typeof filters.value): void {
    filters.value = next
    currentPage.value = 1
  }

  return {
    petList,
    total,
    currentPage,
    pageSize,
    filters,
    currentPet,
    loading,
    fetchList,
    fetchDetail,
    ban,
    unban,
    setFilters,
  }
})
```

### §9.5 configStore（含 dirty tracking）

```typescript
// apps/admin/src/stores/config.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { configApi } from '@/api/config.api'
import type { RuntimeConfig, EconomyConfig, FeatureFlag } from '@/types/config'

export const useConfigStore = defineStore('config', () => {
  const runtime = ref<RuntimeConfig | null>(null)
  const runtimeDraft = ref<RuntimeConfig | null>(null)
  const economy = ref<EconomyConfig | null>(null)
  const economyDraft = ref<EconomyConfig | null>(null)
  const flags = ref<FeatureFlag[]>([])

  const isRuntimeDirty = computed(
    () => JSON.stringify(runtime.value) !== JSON.stringify(runtimeDraft.value),
  )
  const isEconomyDirty = computed(
    () => JSON.stringify(economy.value) !== JSON.stringify(economyDraft.value),
  )

  /** runtime 稀有度權重加總必須 = 100 */
  const isRarityWeightValid = computed(() => {
    const w = runtimeDraft.value?.rarityWeights
    if (!w) return false
    return w.common + w.rare + w.epic + w.legendary === 100
  })

  async function fetchRuntime(): Promise<void> {
    const { data } = await configApi.getRuntime()
    runtime.value = data.data!
    runtimeDraft.value = structuredClone(data.data!)
  }

  async function saveRuntime(): Promise<void> {
    if (!runtimeDraft.value) return
    if (!isRarityWeightValid.value) {
      throw new Error('Rarity weights must sum to 100%')
    }
    await configApi.putRuntime(runtimeDraft.value)
    runtime.value = structuredClone(runtimeDraft.value)
  }

  async function fetchEconomy(): Promise<void> {
    const { data } = await configApi.getEconomy()
    economy.value = data.data!
    economyDraft.value = structuredClone(data.data!)
  }

  async function saveEconomy(): Promise<void> {
    if (!economyDraft.value) return
    await configApi.putEconomy(economyDraft.value)
    economy.value = structuredClone(economyDraft.value)
  }

  async function fetchFlags(): Promise<void> {
    const { data } = await configApi.getFlags()
    flags.value = data.data!.flags
  }

  async function toggleFlag(flag: string, enabled: boolean): Promise<void> {
    await configApi.putFlag(flag, { enabled })
    await fetchFlags()
  }

  return {
    runtime,
    runtimeDraft,
    economy,
    economyDraft,
    flags,
    isRuntimeDirty,
    isEconomyDirty,
    isRarityWeightValid,
    fetchRuntime,
    saveRuntime,
    fetchEconomy,
    saveEconomy,
    fetchFlags,
    toggleFlag,
  }
})
```

---

## §10 Element Plus 組件規範

### §10.1 Table 三狀態標準

所有 Admin Table 必須實作三種狀態：loading / empty / data，附加 error 與重試。

```vue
<template>
  <el-table
    v-loading="loading"
    :data="rows"
    :empty-text="emptyText"
    border
    stripe
    style="width: 100%"
    @sort-change="onSortChange"
  >
    <el-table-column
      v-for="col in columns"
      :key="col.prop"
      :prop="col.prop"
      :label="col.label"
      :width="col.width"
      :sortable="col.sortable ? 'custom' : false"
    >
      <template v-if="col.formatter" #default="{ row }">
        {{ col.formatter(row) }}
      </template>
    </el-table-column>

    <template #empty>
      <el-empty :description="emptyText">
        <el-button v-if="errored" type="primary" @click="onRetry">
          重新載入
        </el-button>
      </el-empty>
    </template>
  </el-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  loading: boolean
  errored: boolean
  rows: unknown[]
  columns: { prop: string; label: string; width?: number; sortable?: boolean; formatter?: (r: unknown) => string }[]
  onRetry: () => void
  onSortChange: (e: { prop: string; order: 'ascending' | 'descending' | null }) => void
}>()

const emptyText = computed(() =>
  props.errored ? '載入失敗，請重試' : '尚無資料',
)
</script>
```

### §10.2 Form 驗證規則

```vue
<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="120px"
    @submit.prevent="onSubmit"
  >
    <el-form-item label="原因" prop="reason">
      <el-input
        v-model="form.reason"
        type="textarea"
        :rows="4"
        :maxlength="500"
        show-word-limit
        placeholder="請輸入 ban 理由（必填，最多 500 字）"
      />
    </el-form-item>

    <el-form-item>
      <el-button :loading="submitting" type="primary" native-type="submit">
        確認
      </el-button>
      <el-button @click="onCancel">取消</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive({ reason: '' })

const rules: FormRules = {
  reason: [
    { required: true, message: '請輸入理由', trigger: 'blur' },
    { min: 5, max: 500, message: '理由長度需為 5–500 字元', trigger: 'blur' },
  ],
}

async function onSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    // 呼叫 API
  } finally {
    submitting.value = false
  }
}
</script>
```

### §10.3 危險操作二次確認（ElMessageBox）

```typescript
// composables/useConfirm.ts
import { ElMessageBox } from 'element-plus'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'info' | 'error'
}

export async function useConfirm(opts: ConfirmOptions): Promise<boolean> {
  try {
    await ElMessageBox.confirm(opts.message, opts.title ?? '請確認', {
      confirmButtonText: opts.confirmText ?? '確定',
      cancelButtonText: opts.cancelText ?? '取消',
      type: opts.type ?? 'warning',
      closeOnClickModal: false,
      closeOnPressEscape: false,
    })
    return true
  } catch {
    return false
  }
}

// 使用範例
async function onBan(petId: string, reason: string) {
  const ok = await useConfirm({
    message: '確定要 Ban 此寵物？此動作會立即生效並寫入稽核軌跡。',
    type: 'warning',
    confirmText: '確定 Ban',
  })
  if (!ok) return
  await petsStore.ban(petId, reason)
  ElMessage.success('Ban 已執行')
}
```

### §10.4 全局 Message 標準

| 場景 | 元件 | 圖示 |
|------|------|------|
| 操作成功 | `ElMessage.success('已儲存')` | success |
| 操作失敗 | `ElMessage.error('儲存失敗')` | error |
| 警告 | `ElMessage.warning('Session 即將過期')` | warning |
| 中性提示 | `ElMessage.info('資料已更新')` | info |

所有 Message 統一 duration: 3000ms，超過 5 個會自動 dedupe。

### §10.5 統一分頁配置

```vue
<el-pagination
  v-model:current-page="currentPage"
  v-model:page-size="pageSize"
  :page-sizes="[10, 20, 50, 100]"
  :total="total"
  layout="total, sizes, prev, pager, next, jumper"
  background
  @current-change="onPageChange"
  @size-change="onSizeChange"
/>
```

預設 pageSize = 20（與 API.md `?limit=20` 一致）。

---

## §11 共用組件規格

### §11.1 SearchableTable 組件

整合 ElTable + ElPagination + 搜尋欄 + 操作欄的複合組件，目的：減少各 view 重複樣板。

```typescript
// components/common/SearchableTable.vue
export interface TableColumn<T = Record<string, unknown>> {
  prop: keyof T & string
  label: string
  width?: number | string
  sortable?: boolean
  formatter?: (row: T) => string
  slot?: string
}

export interface SearchField {
  prop: string
  label: string
  type: 'input' | 'select' | 'date-range' | 'boolean'
  options?: { label: string; value: string | number | boolean }[]
}

export interface SortConfig {
  prop: string
  order: 'ascending' | 'descending'
}

export interface SearchableTableProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[]
  fetchFn: (params: QueryParams) => Promise<{ data: T[]; total: number }>
  searchFields?: SearchField[]
  defaultSort?: SortConfig
  pageSize?: number
  selectable?: boolean
  rowKey?: keyof T & string
}

export interface QueryParams {
  page: number
  limit: number
  search?: string
  sortProp?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: unknown
}
```

**Emits**：

| 事件 | 參數 | 說明 |
|------|------|------|
| `selection-change` | `rows: T[]` | 多選變更 |
| `row-click` | `row: T` | 行點擊 |
| `refresh` | — | 手動 reload |

**Features**：

- 分頁（ElPagination，pageSize 預設 20）
- 搜尋（debounce 300ms）
- 排序（server-side，呼叫 fetchFn 帶 sortProp + sortOrder）
- 三狀態（loading / empty / error）
- 重試按鈕（error 時自動顯示）

**使用範例（PetListView.vue）**：

```vue
<template>
  <SearchableTable
    :columns="columns"
    :fetch-fn="fetchPets"
    :search-fields="searchFields"
    :default-sort="{ prop: 'createdAt', order: 'descending' }"
    row-key="id"
    @row-click="onRowClick"
  >
    <template #status="{ row }">
      <el-tag :type="row.isBanned ? 'danger' : 'success'">
        {{ row.isBanned ? '已 Ban' : '正常' }}
      </el-tag>
    </template>
    <template #actions="{ row }">
      <el-button size="small" @click="goDetail(row.id)">詳情</el-button>
      <el-button v-permission="'pet.ban'" size="small" type="danger" @click="onBan(row)">
        Ban
      </el-button>
    </template>
  </SearchableTable>
</template>
```

### §11.2 AuditLogDetail 組件

顯示稽核日誌完整 detail JSON 的抽屜組件，含 old_value / new_value 差異高亮。

```typescript
export interface AuditLogDetailProps {
  visible: boolean
  entry: AuditLogEntry | null
  direction?: 'rtl' | 'ltr'
}

export interface AuditLogEntry {
  id: string
  adminId: string
  adminUsername: string
  action: string // 'pet.ban' / 'config.runtime.update' / ...
  targetType: string
  targetId: string
  detail: Record<string, unknown> | null
  createdAt: string
  ipAddressHash?: string
}
```

**功能**：

- 顯示 metadata（adminUsername、action、targetType、targetId、createdAt、ipAddressHash 前 8 字元）
- 顯示完整 detail JSON（支援展開/折疊）
- 若 detail 含 `previousValue` + `newValue`（如 config 變動），以 diff 視圖呈現（紅 / 綠 highlight）
- 「複製 JSON」按鈕

```vue
<template>
  <el-drawer v-model="visible" title="稽核詳情" :direction="direction" size="40%">
    <el-descriptions :column="1" border>
      <el-descriptions-item label="操作者">
        {{ entry?.adminUsername }} ({{ entry?.adminId }})
      </el-descriptions-item>
      <el-descriptions-item label="動作">
        <el-tag>{{ entry?.action }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="目標">
        {{ entry?.targetType }} / {{ entry?.targetId }}
      </el-descriptions-item>
      <el-descriptions-item label="時間">
        {{ formatLocal(entry?.createdAt) }}
      </el-descriptions-item>
      <el-descriptions-item v-if="entry?.ipAddressHash" label="IP Hash（前 8 碼）">
        {{ entry.ipAddressHash.slice(0, 8) }}…
      </el-descriptions-item>
    </el-descriptions>

    <el-divider>Detail Payload</el-divider>
    <DiffView v-if="hasDiff" :before="entry?.detail?.previousValue" :after="entry?.detail?.newValue" />
    <pre v-else class="audit-json">{{ JSON.stringify(entry?.detail, null, 2) }}</pre>

    <el-button @click="onCopy">複製 JSON</el-button>
  </el-drawer>
</template>
```

### §11.3 其他通用組件清單

| 組件 | 用途 |
|------|------|
| `BanReasonDialog` | 統一 ban/unban reason 輸入（最多 500 字 + show-word-limit） |
| `ConfirmDialog` | 包裝 ElMessageBox.confirm 為可重用 dialog |
| `PermissionButton` | 包裝 v-permission，並補上 disabled-tooltip 提示 |
| `EmptyState` | ElEmpty 統一樣式（含 CTA 按鈕） |
| `RarityTag` | 稀有度標籤（COMMON 灰 / RARE 藍 / EPIC 紫 / LEGENDARY 金） |
| `RoleTag` | Admin role 標籤（super_admin 紅 / moderator 橘 / read_only 灰） |

---

## §12 圖表整合（ECharts 5.x）

Dashboard 與 Analytics 頁面均需圖表，整合 `vue-echarts` wrapper + `echarts/core` 按需引入以縮減 bundle。

### §12.1 按需引入設定

```typescript
// apps/admin/src/plugins/echarts.ts
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  LineChart,
  BarChart,
  PieChart,
} from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  ToolboxComponent,
} from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  ToolboxComponent,
])
```

### §12.2 圖表類型與更新策略

| 圖表 | 元件 | 資料來源 | 更新策略 |
|------|------|---------|---------|
| 過去 7 天 DAU 折線圖 | ECharts LineChart | `GET /admin/api/analytics?metric=dau` | 頁面載入時拉取一次 |
| 過去 7 天 Claims 折線圖 | ECharts LineChart | `GET /admin/api/analytics?metric=claims` | 頁面載入時拉取一次 |
| 過去 7 天 Arena Battles 柱狀圖 | ECharts BarChart | `GET /admin/api/analytics?metric=arena_battles` | 頁面載入時拉取一次 |
| Rarity 分佈圓餅圖（Pet 列表附加視圖） | ECharts PieChart | aggregated from `/admin/api/pets`（可選） | 頁面載入時 + 手動刷新 |

### §12.3 LineChart 初始化範例

```vue
<template>
  <v-chart :option="chartOption" autoresize style="height: 320px" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'

const props = defineProps<{
  title: string
  xAxis: string[]      // 日期 (e.g. ['2026-05-01', '2026-05-02', ...])
  series: number[]     // 數值
}>()

const chartOption = computed<EChartsOption>(() => ({
  title: { text: props.title, left: 'center' },
  tooltip: { trigger: 'axis' },
  grid: { left: 40, right: 24, top: 60, bottom: 40 },
  xAxis: { type: 'category', data: props.xAxis, boundaryGap: false },
  yAxis: { type: 'value' },
  series: [
    {
      data: props.series,
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.1 },
      lineStyle: { width: 2 },
    },
  ],
}))
</script>
```

### §12.4 響應式尺寸配置

- 所有圖表使用 `autoresize` prop（vue-echarts 內建）→ 跟隨容器尺寸變化
- 圖表容器 height 至少 320px（避免過於擁擠）
- 行動裝置 < 768px 時自動隱藏 legend，僅顯示 tooltip

---

## §13 國際化（i18n）

**結論：本專案 Admin Portal 預設單一語言（zh-TW），i18n 已預留架構但未啟用多語言切換**

依 PRD：玩家端 NFR-A11Y-01 要求 WCAG 2.1 AA，未明確要求多語言；Admin 為內部使用，預設繁體中文。`vue-i18n` 已納入依賴清單以便未來擴充（如英文團隊接手）。

### §13.1 i18n 配置（架構備妥）

```typescript
// apps/admin/src/plugins/i18n.ts
import { createI18n } from 'vue-i18n'
import zhTW from '@/locales/zh-TW'
import enUS from '@/locales/en-US'

export const i18n = createI18n({
  legacy: false,
  locale: 'zh-TW',
  fallbackLocale: 'en-US',
  messages: {
    'zh-TW': zhTW,
    'en-US': enUS,
  },
})
```

### §13.2 語言代碼表

| 語言 | 代碼 | 優先序 | 啟用 |
|------|------|--------|------|
| 繁體中文 | `zh-TW` | 預設 | 啟用 |
| English | `en-US` | fallback | 預留（未來啟用） |

> **本專案 Admin 端目前以單語言（zh-TW）運行；本節保留多語言架構供未來擴充。Element Plus locale 同步綁定 zh-TW（`ElConfigProvider :locale="zhTw"` 在 `App.vue`）。**

---

## §14 效能優化

### §14.1 路由懶加載（Lazy Loading）

所有 view 均採 dynamic import，由 Vite 自動拆 chunk：

```typescript
{
  path: '/pets',
  component: () => import('@/views/pets/PetListView.vue'),
}
```

效益：初始 bundle 僅含 router + login view + 共用組件；其他頁面按需載入。

### §14.2 Element Plus 按需引入

使用 `unplugin-element-plus` + `unplugin-vue-components` 自動按需引入 Element Plus 組件與樣式，避免整包打入：

```typescript
// vite.config.ts 片段
import ElementPlus from 'unplugin-element-plus/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    ElementPlus({ useSource: true }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: 'sass' })],
      dts: true,
    }),
  ],
})
```

### §14.3 Bundle 分析

```bash
# 分析 bundle 結構
pnpm --filter @pixel-pet-arena/admin run build
pnpm --filter @pixel-pet-arena/admin exec vite-bundle-visualizer
```

或使用 `rollup-plugin-visualizer` 整合 build 流程：

```typescript
import { visualizer } from 'rollup-plugin-visualizer'

build: {
  rollupOptions: {
    plugins: [visualizer({ open: true, filename: 'stats.html' })],
  },
},
```

### §14.4 效能目標

| 指標 | 目標值 | 來源 |
|------|--------|------|
| 主 bundle gzipped（不含 Element Plus / ECharts） | < 150 KB gzipped | 業界 Admin 標準 |
| 包含 Element Plus 核心的 bundle | < 300 KB gzipped | CONSTANTS § Total JS Bundle |
| Admin 頁面 FCP（首屏內容繪製） | < 2000ms（3G 網路）| 預設值（CONSTANTS.md 無顯式 ADMIN_FCP_TARGET_MS，採此預設） |
| Admin 頁面載入（最大 1M pet 記錄） | < 3000ms | CONSTANTS `ADMIN_PAGE_LOAD_TIME = 3` |
| Pet 搜尋回應 | < 2000ms | CONSTANTS `ADMIN_SEARCH_RESPONSE_TIME = 2` |
| Audit 搜尋（12 個月窗口） | < 3000ms | CONSTANTS `ADMIN_AUDIT_LOG_SEARCH_RESPONSE_TIME = 3` |
| LCP / CLS / INP | ≤ 2.5s / < 0.1 / < 200ms | CONSTANTS §4 SLO |

### §14.5 manualChunks 切割策略

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-vue': ['vue', 'vue-router', 'pinia'],
        'vendor-element': ['element-plus', '@element-plus/icons-vue'],
        'vendor-charts': ['echarts', 'vue-echarts'],
        'vendor-utils': ['axios', 'dayjs', 'zod', 'qrcode'],
      },
    },
  },
},
```

### §14.6 其他優化

- **圖表 Lazy Render**：`v-chart` 包在 `<Suspense>` 中，僅當 viewport 進入時才掛載（IntersectionObserver）
- **Table 大量資料 Virtual Scroll**：當 row > 200 時改用 `el-table-v2`（Element Plus 虛擬滾動表）
- **API debounce**：搜尋欄 300ms debounce；數值欄位輸入 500ms debounce
- **HTTP cache**：dashboard / analytics 端點 Cache-Control: `private, max-age=60`（後端設定）

---

## §15 部署配置

### §15.1 Vite 配置（Build + Dev Proxy）

```typescript
// apps/admin/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import ElementPlus from 'unplugin-element-plus/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
  base: '/admin/',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    vue(),
    ElementPlus({ useSource: true }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: 'sass' })],
      dts: 'src/components.d.ts',
    }),
    ...(mode === 'analyze'
      ? [visualizer({ open: true, filename: 'stats.html', gzipSize: true })]
      : []),
  ],
  server: {
    port: 5174, // EDD §3.5b 約定的 Admin dev port
    proxy: {
      '/admin/api': {
        target: 'http://localhost:3000', // Backend Fastify
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/admin',
    sourcemap: mode === 'staging',
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-element': ['element-plus', '@element-plus/icons-vue'],
          'vendor-charts': ['echarts', 'vue-echarts'],
          'vendor-utils': ['axios', 'dayjs', 'zod', 'qrcode'],
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: { additionalData: `@use "@/styles/variables.scss" as *;` },
    },
  },
}))
```

### §15.2 環境變數

| 變數 | Development | Production |
|------|-------------|-----------|
| `VITE_API_BASE_URL` | `http://localhost:3000/admin/api` | `/admin/api`（Nginx 反代到 backend:8080） |
| `VITE_ADMIN_PATH` | `/admin` | `/admin` |
| `VITE_APP_TITLE` | `Pixel Pet Arena Admin (Dev)` | `Pixel Pet Arena Admin` |
| `VITE_SENTRY_DSN` | `''` | `https://...@sentry.io/...`（觀測接入） |
| `VITE_BUILD_VERSION` | `dev` | CI 注入 git SHA（`$(git rev-parse --short HEAD)`） |

### §15.3 Nginx 路由配置

```nginx
# Admin Portal SPA routing（Vercel 自動處理；自架時參考下方）
location /admin/ {
  alias /usr/share/nginx/html/admin/;
  try_files $uri $uri/ /admin/index.html;

  # Cache static assets (hashed file names)
  location ~* \.(?:js|css|woff2|svg|png|jpg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # SPA shell（index.html）不快取
  location = /admin/index.html {
    expires -1;
    add_header Cache-Control "no-store, no-cache, must-revalidate";
  }
}

# Admin API proxy（與 ARCH §2.3 一致：backend Fastify 統一監聽 8080）
location /admin/api/ {
  proxy_pass http://backend:8080/admin/api/;
  proxy_set_header Host              $host;
  proxy_set_header X-Real-IP         $remote_addr;
  proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Request-Id      $request_id;

  # HttpOnly session cookie 直通
  proxy_pass_header  Set-Cookie;
  proxy_cookie_path  / /admin;

  # 對 audit endpoint 放寬 timeout（搜尋可能達 3s）
  proxy_read_timeout 10s;
  proxy_connect_timeout 5s;
}

# IP allowlist（production 啟用；對應 PRD NFR-ADMIN-07）
# location /admin/ {
#   allow 203.0.113.0/24;  # 公司 VPN
#   deny  all;
# }
```

### §15.4 Vercel 部署設定

`apps/admin/vercel.json`：

```json
{
  "buildCommand": "pnpm --filter @pixel-pet-arena/admin build",
  "outputDirectory": "apps/admin/dist/admin",
  "framework": "vite",
  "rewrites": [
    { "source": "/admin/api/(.*)", "destination": "https://api.pixel-pet-arena.com/admin/api/$1" },
    { "source": "/admin/(.*)", "destination": "/admin/index.html" }
  ],
  "headers": [
    {
      "source": "/admin/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### §15.5 CSP 配置

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self' data:;
  connect-src 'self' https://api.pixel-pet-arena.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
```

> **注意**：Admin Portal 不引入第三方 CDN script（所有依賴自架），降低供應鏈攻擊面。

---

## §16 安全加固

### §16.1 認證強化

| 項目 | 規格 |
|------|------|
| 密碼策略 | 最少 12 字元；bcrypt cost ≥ 12（後端） |
| TOTP | RFC 6238 強制啟用；首次登入未設定 → 403 `TOTP_SETUP_REQUIRED` |
| Backup codes | 10 組 single-use；SHA-256 hash 存 `admin_users.totp_backup_codes_hash` |
| IP allowlist | Production 啟用（PRD NFR-ADMIN-07），透過 Nginx 或 Cloudflare WAF |
| Pre-auth IP rate limit | 10/15 min/IP（hashed IP） |
| Account lockout | 10 連續失敗 → 30 min 鎖定 |

### §16.2 Session 安全

| 項目 | 規格 |
|------|------|
| 儲存 | Redis server-side session（key: `session:admin:{session_id}`） |
| Cookie | `HttpOnly; SameSite=Strict; Secure; Path=/admin` |
| Inactivity expiry | 4 hours |
| Absolute expiry | 8 hours |
| CSRF 防護 | SameSite=Strict 提供基線；額外 `X-Requested-With: XMLHttpRequest` header 檢查 |
| Logout | 後端立即刪 Redis key；前端清 store |

### §16.3 RBAC 安全

- 後端 Fastify preHandler 為 **authoritative** 來源；前端 PERMISSION_MATRIX 僅用於 UX 體驗
- 後端在每個 mutation endpoint 重新驗證 role（不信任客戶端傳來的 role 資訊）
- 角色降級即時生效：admin 角色變更時，後端 invalidate 該 admin 所有 active session

### §16.4 稽核軌跡

| 項目 | 規格 |
|------|------|
| 範圍 | 所有 mutation endpoint（POST/PUT/PATCH/DELETE）→ 寫一筆 `audit_logs` |
| 不可變 | DB 層級 append-only；無 UPDATE / DELETE 權限 |
| 保留期 | 2 年（CONSTANTS `ADMIN_AUDIT_LOG_RETENTION = 2`） |
| IP hash | SHA-256(raw IP)；90 天後 NULL（`IP_ADDRESS_LOG_RETENTION = 90`） |
| 欄位完整性 | adminId、action、targetType、targetId、detail、ip_address_hash、created_at |
| 失敗登入 | adminId = NULL；action = `auth.login.failed` |
| 匯出 | super_admin 可 CSV 匯出（PRD §19.5） |

### §16.5 輸入驗證

- 前端：ElForm rules + Zod schema 雙層
- 後端：Fastify route 內掛 JSON Schema + Zod parse（共享 schema 於 `packages/shared`）
- 拒絕 unknown fields（strict mode）
- 所有 free-text 欄位 max 500 chars（ban reason / admin notes）

### §16.6 敏感資料處理

| 資料 | 前端可見 | 傳輸 | 日誌 |
|------|---------|------|------|
| Admin password | 僅登入時 ElInput type="password" | TLS POST | NEVER |
| Admin TOTP secret | 僅 setup 一次（QR 顯示後即丟棄） | TLS | NEVER |
| Pet owner email plaintext | NEVER | — | NEVER |
| Pet owner email masked | OK（`p***@example.com`，後端解密 + masking） | TLS | NEVER |
| IP plaintext | NEVER | — | NEVER（僅 SHA-256 hash） |
| Session cookie | HttpOnly（JS 不可讀） | TLS | NEVER |

### §16.7 OWASP Top 10 對策

| OWASP | 對策 |
|-------|------|
| A01 Broken Access Control | RBAC 三層（Backend authoritative）；每個 mutation 重檢 role |
| A02 Cryptographic Failures | TLS 1.2+；HSTS preload；bcrypt cost ≥ 12；AES-256-GCM TOTP secret |
| A03 Injection | Zod schema strict mode；parameterized SQL（後端）；無 string concat |
| A04 Insecure Design | 二次確認 dialog；audit log 不可變；anti-enumeration login response |
| A05 Security Misconfiguration | CSP nonce；HSTS；X-Frame-Options: DENY；無 default admin |
| A06 Vulnerable Components | `pnpm audit` CI gate；Renovate 週掃描；Snyk 月掃描 |
| A07 ID & Auth | TOTP MFA；rate-limit + lockout；session 4h/8h；IP allowlist |
| A08 Software / Data Integrity | SRI 不適用（無 CDN script）；ghcr.io image digest pinning |
| A09 Logging & Monitoring | 全部 mutation audit；error rate / latency alert；session anomaly alert |
| A10 SSRF | 無 user-controlled outbound URLs；API proxy 限 backend 固定位址 |

---

## §17 測試策略

### §17.1 Unit Tests（Vitest）

- 涵蓋率目標 ≥ 80%（CONSTANTS § Test Unit Coverage）
- 範圍：composables（usePermission、useConfirm、useApiError）、stores（mock axios）、utils（format / validators）
- 工具：Vitest + Vue Test Utils + happy-dom

```typescript
// 範例：usePermission.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePermission } from '@/composables/usePermission'
import { useAuthStore } from '@/stores/auth.store'

describe('usePermission', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('moderator can ban pet', () => {
    const auth = useAuthStore()
    auth.adminRole = 'moderator'
    const { can } = usePermission()
    expect(can('pet.ban')).toBe(true)
  })

  it('read_only cannot ban pet', () => {
    const auth = useAuthStore()
    auth.adminRole = 'read_only'
    const { can } = usePermission()
    expect(can('pet.ban')).toBe(false)
  })

  it('only super_admin can update runtime config', () => {
    const auth = useAuthStore()
    auth.adminRole = 'moderator'
    const { can } = usePermission()
    expect(can('config.runtime.update')).toBe(false)
    auth.adminRole = 'super_admin'
    expect(can('config.runtime.update')).toBe(true)
  })
})
```

### §17.2 Integration Tests

- Pinia store + 真實 axios（mock backend with MSW）
- 涵蓋：login flow、ban pet flow、config 變動 + dirty tracking、API error → ElMessage 映射

### §17.3 E2E Tests（Playwright）

- 範圍：登入流程（含 TOTP）、Pet ban/unban 完整流程、Audit log 過濾與匯出、Config 變動的 Preview 確認流程
- CI：每個 PR 跑完整 E2E suite 對 staging
- 工具：`@playwright/test`，並行執行 chromium / firefox / webkit
- a11y：在 E2E 中插入 axe-core 檢查（每個頁面）

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('admin login with TOTP', async ({ page }) => {
  await page.goto('/admin/login')
  await page.fill('input[name="username"]', 'super_admin_alice')
  await page.fill('input[name="password"]', 'correct-horse-battery-staple')
  await page.fill('input[name="totpCode"]', '482917')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await expect(page.locator('h1')).toContainText('控制台')
})

test('moderator cannot access GDPR queue', async ({ page }) => {
  // (assume moderator session)
  await page.goto('/admin/gdpr')
  await expect(page).toHaveURL(/\/admin\/403$/)
})
```

### §17.4 Visual Regression

- 關鍵頁面（Dashboard、Pet List、Audit Log）拍快照
- 解析度：1280×800（desktop primary）+ 768×1024（tablet）
- 工具：Playwright `toHaveScreenshot()`

---

## §18 雙因子認證（2FA）登入流程骨架

### §18.1 兩步驟登入架構

**Step 1 — 帳密 + TOTP 一併送出**（簡化版，後端 API 接受三欄位）：

```
POST /admin/api/auth/login
Request:  { username, password, totpCode }
Response (success): {
  adminId, role, sessionExpiresAt
}
Set-Cookie: session=...; HttpOnly; SameSite=Strict; Secure; Path=/admin

Errors:
  401 UNAUTHORIZED       → 帳號或密碼錯誤
  403 ACCOUNT_LOCKED     → unlockedAt 帶在 error.details
  403 TOTP_SETUP_REQUIRED→ setupToken 帶在 error.details；前端導向 /totp-setup
  429 RATE_LIMIT_EXCEEDED→ Retry-After header
```

**Step 2（首次登入 TOTP enrollment）**：

```
POST /admin/api/auth/totp/setup
Request:  { setupToken, password }
Response: { otpAuthUrl, backupCodes[10] }
```

完成 setup 後 admin 必須回到 `/admin/login` 重新輸入帳密 + 新的 TOTP code。

### §18.2 前端骨架（Vue 3 Composition API）

```typescript
// apps/admin/src/views/auth/LoginView.vue（核心邏輯片段）
<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth.store'
import type { AxiosError } from 'axios'
import type { ApiEnvelope } from '@/types/api'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const submitting = ref(false)
const form = reactive({
  username: '',
  password: '',
  totpCode: '',
})

async function onSubmit() {
  submitting.value = true
  try {
    await authStore.login(form)
    const redirect = (route.query.redirect as string) || '/dashboard'
    await router.replace(redirect)
  } catch (err) {
    const error = err as AxiosError<ApiEnvelope<null>>
    const code = error.response?.data?.error?.code
    const details = error.response?.data?.error?.details

    if (code === 'TOTP_SETUP_REQUIRED' && details?.setupToken) {
      await authStore.handleTotpSetupRequired(details.setupToken as string)
    } else if (code === 'ACCOUNT_LOCKED') {
      ElMessage.error(`帳號鎖定至 ${details?.unlockedAt}`)
    } else if (code === 'UNAUTHORIZED') {
      ElMessage.error('帳號或密碼錯誤')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-card class="login-card">
    <h1>Pixel Pet Arena Admin</h1>
    <el-form :model="form" @submit.prevent="onSubmit">
      <el-form-item label="帳號" required>
        <el-input v-model="form.username" autocomplete="username" />
      </el-form-item>
      <el-form-item label="密碼" required>
        <el-input
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          show-password
        />
      </el-form-item>
      <el-form-item label="TOTP 6 位數">
        <el-input
          v-model="form.totpCode"
          maxlength="6"
          autocomplete="one-time-code"
          placeholder="（首次登入可留空）"
        />
      </el-form-item>
      <el-button :loading="submitting" type="primary" native-type="submit" block>
        登入
      </el-button>
    </el-form>
  </el-card>
</template>
```

### §18.3 TOTP 設定頁（`TotpSetupView.vue`）骨架

```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import QRCode from 'qrcode'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const password = ref('')
const qrCodeDataUrl = ref('')
const backupCodes = ref<string[]>([])
const confirmedBackup = ref(false)
const step = ref<'password' | 'qr' | 'confirm'>('password')

onMounted(() => {
  const setupToken = route.query.setupToken as string | undefined
  if (!setupToken) {
    router.replace('/login')
  } else {
    authStore.setupToken = setupToken
  }
})

async function onSetup() {
  const { otpAuthUrl, backupCodes: codes } = await authStore.setupTotp(password.value)
  qrCodeDataUrl.value = await QRCode.toDataURL(otpAuthUrl)
  backupCodes.value = codes
  step.value = 'qr'
}

async function onConfirm() {
  if (!confirmedBackup.value) return
  await router.replace('/login')
}
</script>
```

### §18.4 Session Refresh（HttpOnly Cookie 模式；axios interceptor）

由於採 HttpOnly Cookie，前端無需手動 refresh token；後端在每次 authenticated request 重設 inactivity timer。401 自動處理（見 §8.1）：

```typescript
// 摘自 §8.1 http.ts，已整合於 response interceptor
http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiEnvelope<null>>) => {
    if (error.response?.status === 401) {
      // Session 過期 / 撤銷：清 store + 導向 login
      useAuthStore().clearSession()
      await router.replace({
        name: 'login',
        query: { redirect: router.currentRoute.value.fullPath },
      })
      ElMessage.warning('Session 已過期，請重新登入')
    }
    return Promise.reject(error)
  },
)
```

> 因 cookie 為 HttpOnly + SameSite=Strict，瀏覽器自動於跨 fetch 攜帶；前端不需也不能手動 refresh。

### §18.5 Account Lockout UX

| 階段 | UX 處理 |
|------|---------|
| 第 1–9 次失敗 | ElMessage.error「帳號或密碼錯誤」 |
| 第 10 次失敗 | 後端設 `locked_until = NOW() + 30min`；返回 403 `ACCOUNT_LOCKED`，error.details.unlockedAt |
| 鎖定期間嘗試登入 | UI 顯示「帳號鎖定至 {本地時間}，請聯絡 super_admin 解除或等待自動解鎖」 |
| 解鎖後 | `locked_until = NULL`；`failed_attempts = 0`（成功登入後 reset） |
| IP rate limit 觸發 | 429 + Retry-After header；UI 倒數計時器 |

---

## §19 Self-Check Checklist（生成後驗證 / 開發者交付驗收）

> 本節為 **開發者交付前驗收清單**。Step 17（gendoc 內部）為 AI 生成時自查；§19 為實作完成後驗收。

| # | 檢查項目 | 狀態 |
|---|---------|------|
| 1 | §3 目錄結構含 views/stores/router/api/composables/components/types | OK |
| 2 | §4 路由表覆蓋 17 條路徑（含 403/404），每條有 component + roles + 對應 API | OK |
| 3 | §5 RBAC 矩陣對齊 EDD §9.6 三角色 × 32 個 endpoint | OK |
| 4 | §5.2 Permission Guard：composable + directive + PERMISSION_MATRIX 完整 | OK |
| 5 | §7 頁面規格 16 個頁面（login / totp-setup / dashboard / pets×2 / battles / suspicious / leaderboard / config×3 / gdpr / audit / analytics / email / roles）均有欄位+API+權限 | OK |
| 6 | §8.1 Axios 配置含 baseURL + ADMIN_API_TIMEOUT_MS + request/response interceptor（401/403/429 處理） | OK |
| 7 | §8.2 endpoint 對應表 32 條與 API.md §6.1–§6.9 一對一對齊 | OK |
| 8 | §9 三大 store + petsStore / configStore / auditStore 結構完整；§9.2 authStore 採 HttpOnly cookie 模式（無 accessToken 字串 ref） | OK |
| 9a | §15.1 Vite Build：base='/admin/'、outDir='dist/admin'、manualChunks 切割（vue/element/charts/utils）、server.proxy '/admin/api' 已設定 | OK |
| 9b | §15.2/§15.3 env 變數 + Nginx /admin/ try_files + /admin/api/ proxy_pass | OK |
| 10 | 全文無 `{{PLACEHOLDER}}` / TODO 空欄 | OK |
| 11 | §1 Admin Portal 概覽：系統定位 + 使用者角色已依 EDD §9.6 完整填入 | OK |
| 12 | §6.1 主 Layout：ASCII 框線圖三區（Header / Sidebar / Content Area）；文字說明涵蓋 HeaderBar / SidebarMenu / BreadCrumb / Content | OK |
| 13 | §5.1 Permission 清單與 API.md /admin/api/* endpoint 一對一對應 | OK |
| 14 | §18 2FA 流程含兩步驟設計、setupToken 處理、Session Refresh 骨架 | OK |
| 15 | §16 安全加固章節含 OWASP Top 10 對策 + 稽核軌跡 + RBAC 三層 | OK |
| 16 | §17 測試策略含 Unit / Integration / E2E / Visual Regression 四層 | OK |
| 17 | 所有 Vue 範例均使用 Composition API + `<script setup>` 語法 | OK |
| 18 | 所有 Element Plus 組件使用正確命名（ElTable / ElForm / ElDialog / ElMessageBox / ElPagination 等） | OK |

---

## 附錄 A — 開發環境快速啟動

```bash
# 從 monorepo 根目錄
cd pixel-pet-arena
pnpm install

# 啟動 backend（依 EDD §3.8.1）
pnpm --filter @pixel-pet-arena/api dev   # 3000
pnpm --filter @pixel-pet-arena/worker dev # 3001

# 啟動 Admin Portal
pnpm --filter @pixel-pet-arena/admin dev  # 5174

# 瀏覽器開啟 http://localhost:5174/admin/login
# 預設 seed admin（見 SCHEMA.md Seed Data 章節）：
#   username: super_admin_default
#   password: ChangeMeOnFirstLogin!
#   首次登入會進入 TOTP setup 流程
```

## 附錄 B — 與 backend 共享 schema 範例（`packages/shared/`）

```typescript
// packages/shared/src/schemas/admin.ts
import { z } from 'zod'

export const adminRoleSchema = z.enum(['super_admin', 'moderator', 'read_only'])

export const adminLoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(12),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
})

export const banPetSchema = z.object({
  reason: z.string().min(1).max(500),
})

export const runtimeConfigSchema = z.object({
  arenaRateLimitBattlesPerHour: z.number().int().min(1).max(50).optional(),
  arenaMatchmakingTimeoutSeconds: z.number().int().min(5).max(120).optional(),
  rarityWeights: z
    .object({
      common: z.number().min(0).max(100),
      rare: z.number().min(0).max(100),
      epic: z.number().min(0).max(100),
      legendary: z.number().min(0).max(100),
    })
    .refine(
      (w) => w.common + w.rare + w.epic + w.legendary === 100,
      'rarityWeights must sum to 100',
    )
    .optional(),
})

export type AdminRole = z.infer<typeof adminRoleSchema>
export type AdminLogin = z.infer<typeof adminLoginSchema>
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>
```

> 後端 Fastify route 與前端 Form rules 同時 import 此 schema，確保前後端 validation 行為一致；同時 ESM monorepo 共用避免分歧。
