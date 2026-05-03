# Admin Portal 實作規格書

## §0 文件資訊

| 欄位 | 說明 |
|------|------|
| DOC-ID | ADMIN-pixel-pet-arena-20260503 |
| Admin 技術棧 | Vue 3 (Composition API) + Element Plus + Vite 5 + TypeScript 5（來自 EDD §3.7） |
| 上游 EDD | [EDD.md](EDD.md) §3.3 + §5.5-A |
| 上游 API | [API.md](API.md) /admin/api/* 章節 |
| 上游 SCHEMA | [SCHEMA.md](SCHEMA.md) admin_accounts + admin_audit_log 資料表章節 |
| 上游 ARCH | [ARCH.md](ARCH.md) Admin Portal 容器（部署位置 + 技術棧） |
| 上游 CONSTANTS | [CONSTANTS.md](CONSTANTS.md) Token TTL + API Timeout + pageSize 等常數 |

---

## §1 Admin Portal 概覽

### §1.1 系統定位

pixel-pet-arena Admin Portal 是一套供平台運營人員使用的後台管理系統，主要目標用戶為：
- **Super Admin（超級管理員）**：負責帳號管理、GDPR 合規、系統配置、稽核追蹤
- **Moderator（版主）**：負責寵物管理（封禁/解封）、可疑活動審查、戰鬥記錄查閱
- **Read Only（唯讀角色）**：監控 Dashboard、查看排行榜與分析數據，無任何寫入權限

核心解決的運維問題：
1. 寵物封禁/解封 — 處理 Bot 行為偵測結果（50 battles/hr 閾值觸發）
2. 排行榜管理 — 管理員可查看 Top 500，公開僅顯示 Top 100
3. GDPR 合規佇列 — 處理 erasure / data_access / restrict_processing 等 5 種請求
4. 系統配置 — 運行時參數（arena rate limit、rarity weights）和經濟參數（food buff multiplier）
5. 稽核日誌 — 所有 CUD 操作追蹤，保留 2 年

### §1.2 設計原則

- **安全第一**：RBAC 最小權限；httpOnly + SameSite=Strict Session Cookie；所有操作留稽核日誌
- **操作效率**：批量操作 + 智慧搜尋（ pet ID / email hash）
- **資料一致性**：與主系統同一資料庫；Admin 透過 Redis 快取讀取配置（TTL 300s）
- **可審計性**：所有 CUD 操作寫入 `admin_audit_log`，保留 2 年（ADMIN_AUDIT_LOG_RETENTION_YEARS = 2）

### §1.3 使用者角色（來自 EDD §3.7 + ARCH §5.1）

| 角色 | 說明 | 可存取功能 |
|------|------|-----------|
| `super_admin` | 超級管理員 | 全部：GDPR、config、roles、audit log + 所有 moderator 功能 |
| `moderator` | 版主 | 寵物管理（ban/unban）、戰鬥管理（flag/unflag）、leaderboard 查看、可疑活動、email monitor、analytics、dashboard |
| `read_only` | 唯讀角色 | GET-only：dashboard、pet list、leaderboard、battle records、email monitor、analytics |

---

## §2 技術棧決策

### §2.1 框架選型

| 技術 | 選型 | 決策理由 |
|------|------|---------|
| 前端框架 | Vue 3.4+ (Composition API) | `<script setup>` 語法 + Composition API 與 Element Plus 2.x 完整相容；Vue 3 reactivity 系統適合 form-heavy admin CRUD 介面 |
| UI Component | Element Plus 2.7+ | 企業級元件庫，內建 sorting/filtering/pagination 的 ElTable 可直接處理 Admin 的資料密集需求 |
| Build Tool | Vite 5.x | HMR 快速 + 生產 bundle 優化；與 monorepo pnpm workspaces 無縫整合 |
| 狀態管理 | Pinia 2.x | 模組化 Store，Vue 3 原生型別友善；取代 Vuex 成為官方推薦 |
| 路由 | Vue Router 4.x | History 模式 + 動態路由 + beforeEach 路由守衛（RBAC 驗證） |
| HTTP Client | Axios 1.x | Request/Response Interceptors 處理 session 過期與 CSRF token 注入 |
| 圖表 | ECharts 5.x（via vue-echarts 6.x） | Analytics Dashboard 折線圖需求；按需引入控制 bundle size |
| 國際化 | 無（本專案單語言，見 §13） | Admin 為內部工具，英文介面即可 |

### §2.2 依賴版本清單

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "element-plus": "^2.7.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "axios": "^1.6.0",
    "echarts": "^5.5.0",
    "vue-echarts": "^6.7.0",
    "@element-plus/icons-vue": "^2.3.0"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.4.0",
    "vue-tsc": "^2.0.0",
    "@types/node": "^20.0.0",
    "vitest": "^1.4.0",
    "@vue/test-utils": "^2.4.0"
  }
}
```

---

## §3 目錄結構

```
packages/admin-app/                   ← Admin Portal 根目錄（pnpm workspace）
├── src/
│   ├── api/                          ← API 呼叫封裝（對應 API.md /admin/api/* 路由）
│   │   ├── http.ts                   ← Axios instance + interceptors（CSRF + session）
│   │   ├── auth.ts                   ← login / logout / totp/setup / totp/verify
│   │   ├── pets.ts                   ← GET /pets, GET /pets/:id, ban, unban
│   │   ├── battles.ts                ← GET /battles, GET /suspicious, flag, unflag
│   │   ├── leaderboard.ts            ← GET /leaderboard, DELETE /leaderboard/:petId
│   │   ├── config.ts                 ← GET/PUT /config/runtime, /economy, /flags
│   │   ├── gdpr.ts                   ← GET /gdpr, POST /gdpr/delete, PATCH /gdpr/:id
│   │   ├── audit.ts                  ← GET /admin/api/audit
│   │   ├── roles.ts                  ← GET/POST /roles, DELETE /roles/:id, TOTP reset
│   │   ├── analytics.ts              ← GET /analytics, GET /dashboard, GET /email/monitor
│   │   └── types.ts                  ← API response types（與 packages/shared 同步）
│   ├── components/
│   │   ├── common/                   ← 通用組件
│   │   │   ├── SearchableTable.vue   ← Table + Pagination + 搜尋欄複合組件
│   │   │   ├── ConfirmDialog.vue     ← ElMessageBox 包裝（危險操作確認）
│   │   │   ├── AuditLogDetail.vue    ← 稽核日誌詳情 Drawer
│   │   │   └── StatusBadge.vue       ← 狀態徽章（banned / active / pending）
│   │   └── business/                 ← 業務組件
│   │       ├── PetBanForm.vue        ← 封禁/解封 Dialog（reason 欄位，max 500 chars）
│   │       ├── BattleFlagForm.vue    ← 旗標 Battle Dialog
│   │       └── GdprStatusForm.vue    ← GDPR 狀態更新 Dialog
│   ├── composables/                  ← 可重用邏輯（Vue Composition API）
│   │   ├── usePermission.ts          ← hasPermission() + v-permission directive
│   │   ├── usePagination.ts          ← 分頁狀態管理
│   │   ├── useTable.ts               ← Table loading/error/data 三狀態
│   │   └── useSessionTimer.ts        ← 4h inactivity + 8h absolute expiry 監控
│   ├── layouts/
│   │   └── AdminLayout.vue           ← HeaderBar + SidebarMenu + Content 主佈局
│   ├── router/
│   │   ├── index.ts                  ← 路由定義 + createRouter
│   │   ├── guards.ts                 ← beforeEach 路由守衛（session + role 驗證）
│   │   └── routes.ts                 ← 路由清單（含 meta.permission）
│   ├── stores/                       ← Pinia stores
│   │   ├── auth.ts                   ← session + adminUser + login/logout
│   │   ├── permission.ts             ← role + hasPermission + menuTree
│   │   └── config.ts                 ← runtime config + economy config cache
│   ├── types/                        ← TypeScript 型別定義
│   │   ├── admin.ts                  ← AdminUser, AuditLogEntry, GdprRequest
│   │   ├── pet.ts                    ← Pet, BanStatus, ModerationReason
│   │   ├── config.ts                 ← RuntimeConfig, EconomyConfig, FeatureFlag
│   │   └── api.ts                    ← ApiEnvelope, PagedResponse, Meta
│   ├── utils/                        ← 工具函式
│   │   ├── format.ts                 ← 日期格式、email mask、reason truncate
│   │   ├── csrf.ts                   ← X-CSRF-Token 讀取與注入
│   │   └── session.ts                ← Session expiry 計算工具
│   ├── styles/                       ← 樣式
│   │   ├── variables.css             ← CSS Custom Properties（色彩 / 間距 token）
│   │   └── global.css                ← Reset + Element Plus theme overrides
│   └── views/
│       ├── auth/
│       │   ├── LoginView.vue         ← 登入表單（username + password + TOTP）
│       │   └── TotpSetupView.vue     ← 首次登入 TOTP 設定頁
│       ├── dashboard/
│       │   └── DashboardView.vue     ← KPI Cards + system status
│       ├── pets/
│       │   ├── PetListView.vue       ← 寵物列表（搜尋 / 篩選 / 封禁操作）
│       │   └── PetDetailView.vue     ← 寵物詳情（ban history + stats + battles）
│       ├── battles/
│       │   ├── BattleListView.vue    ← 戰鬥記錄列表（flag/unflag）
│       │   └── SuspiciousView.vue    ← 可疑活動清單
│       ├── leaderboard/
│       │   └── LeaderboardView.vue   ← Top 500 admin view（suspicious 標記）
│       ├── analytics/
│       │   ├── AnalyticsView.vue     ← 時序圖表（DAU / claims / battles）
│       │   └── EmailMonitorView.vue  ← Email 交付率監控
│       ├── config/
│       │   ├── RuntimeConfigView.vue ← arena rate limit / rarity weights
│       │   ├── EconomyConfigView.vue ← food buff multiplier / arena entry cost
│       │   └── FeatureFlagsView.vue  ← FF_MARKETPLACE 等 Feature Flag 管理
│       ├── gdpr/
│       │   └── GdprQueueView.vue     ← GDPR 請求佇列（status filter / update）
│       ├── roles/
│       │   └── RoleManagementView.vue ← Admin 帳號清單（新增 / 停用 / TOTP reset）
│       ├── audit/
│       │   └── AuditLogView.vue      ← 稽核日誌（actor / action / time range filter）
│       └── errors/
│           ├── 403View.vue           ← 無權限頁面
│           └── 404View.vue           ← 找不到頁面
├── public/
│   └── favicon.ico
├── .env.development
├── .env.production
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## §4 路由設計

### §4.1 路由清單

| 路徑 | 組件 | 需求權限 | 說明 |
|------|------|---------|------|
| `/admin/login` | `LoginView` | 公開 | Admin 登入頁（username + password + TOTP） |
| `/admin/totp/setup` | `TotpSetupView` | 公開（需 setupToken） | 首次登入 TOTP 設定 |
| `/admin/dashboard` | `DashboardView` | 所有已驗證角色 | KPI Dashboard |
| `/admin/pets` | `PetListView` | `read_only+` | 寵物列表 + 搜尋 + 篩選 |
| `/admin/pets/:petId` | `PetDetailView` | `read_only+` | 寵物詳情 + 封禁歷史 |
| `/admin/battles` | `BattleListView` | `read_only+` | 戰鬥記錄列表 |
| `/admin/suspicious` | `SuspiciousView` | `moderator+` | Bot 偵測可疑寵物清單 |
| `/admin/leaderboard` | `LeaderboardView` | `read_only+` | Top 500 排行榜 Admin 視圖 |
| `/admin/analytics` | `AnalyticsView` | `read_only+` | 產品分析圖表（DAU / claims / battles） |
| `/admin/email` | `EmailMonitorView` | `read_only+` | Email 交付率監控 |
| `/admin/config/runtime` | `RuntimeConfigView` | `super_admin` | Arena rate limit / rarity weights |
| `/admin/config/economy` | `EconomyConfigView` | `super_admin` | Food buff / arena entry cost |
| `/admin/config/flags` | `FeatureFlagsView` | `super_admin` | Feature Flag 管理 |
| `/admin/gdpr` | `GdprQueueView` | `super_admin` | GDPR 請求佇列 |
| `/admin/roles` | `RoleManagementView` | `super_admin` | Admin 帳號與角色管理 |
| `/admin/audit` | `AuditLogView` | `super_admin` | 稽核日誌查閱 |
| `/admin/403` | `403View` | 公開 | 無權限錯誤頁 |
| `/admin/:pathMatch(.*)` | `404View` | 公開 | 404 錯誤頁 |

### §4.2 動態路由守衛

```typescript
// router/guards.ts
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import type { Router } from 'vue-router'

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()
    const permStore = usePermissionStore()

    // 公開頁面（login / totp/setup / error pages）直接放行
    if (to.meta.public) return next()

    // 未登入 → 重導登入頁，保留目標路徑
    if (!authStore.isAuthenticated) {
      return next({ path: '/admin/login', query: { redirect: to.fullPath } })
    }

    // 驗證 Permission（meta.permission = required role level）
    const required = to.meta.permission as string | undefined
    if (required && !permStore.hasPermission(required)) {
      return next('/admin/403')
    }

    next()
  })
}
```

### §4.3 動態側邊欄生成規則

採用 **client-filtered** 策略：角色定義在部署時固定（`super_admin` / `moderator` / `read_only`），前端依用戶 role 過濾靜態選單配置。無權限的選單項目完全不顯示（非僅 disabled），防止資訊洩露。

理由：EDD §3.7 和 ARCH §5.1 的三個 Admin 角色在 EDD Phase 1 已固定，不需後端動態下發選單結構。

---

## §5 RBAC 實作規格

### §5.1 角色定義（來自 EDD §3.7 + ARCH §5.1 + SCHEMA admin_role_enum）

| 角色 key | 顯示名稱 | 是否系統角色 | Permission 層級 |
|---------|---------|-----------|----------------|
| `super_admin` | Super Admin | ✅ 是 | 全部（含 config / GDPR / roles / audit）|
| `moderator` | Moderator | ✅ 是 | pet ban/unban, battle flag/unflag, leaderboard, suspicious, analytics, dashboard, email monitor |
| `read_only` | Read Only | ✅ 是 | GET-only：dashboard, pets, leaderboard, battles, analytics, email monitor |

Permission 對應 API.md §6 各 endpoint 的 Role Access：

| Resource | Action | Required Role |
|----------|--------|--------------|
| dashboard | view | read_only+ |
| pets | list / view | read_only+ |
| pets | ban / unban | moderator+ |
| pets | edit (PUT) | super_admin |
| battles | list / view | read_only+ |
| battles | flag / unflag | moderator+ |
| suspicious | view | moderator+ |
| leaderboard | view | read_only+ |
| leaderboard | remove entry | moderator+ |
| analytics | view | read_only+ |
| email | monitor | read_only+ |
| config | read | super_admin |
| config | write | super_admin |
| gdpr | view / process | super_admin |
| roles | view / manage | super_admin |
| audit | view | super_admin |

### §5.2 Permission Guard 實作

```typescript
// composables/usePermission.ts
import { usePermissionStore } from '@/stores/permission'
import type { DirectiveBinding } from 'vue'

export function usePermission() {
  const permStore = usePermissionStore()

  const hasPermission = (requiredRole: 'read_only' | 'moderator' | 'super_admin'): boolean => {
    const roleHierarchy = { read_only: 0, moderator: 1, super_admin: 2 }
    const userLevel = roleHierarchy[permStore.role] ?? -1
    const requiredLevel = roleHierarchy[requiredRole] ?? 99
    return userLevel >= requiredLevel
  }

  return { hasPermission }
}

// v-permission directive — 掛載於 main.ts
export const permissionDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string>) {
    const permStore = usePermissionStore()
    const { hasPermission } = usePermission()
    if (!hasPermission(binding.value as 'read_only' | 'moderator' | 'super_admin')) {
      el.parentNode?.removeChild(el)
    }
  }
}
```

```vue
<!-- 按鈕層級 Permission 控制範例 -->
<template>
  <el-button
    v-permission="'moderator'"
    type="danger"
    @click="handleBan(pet.id)"
  >
    Ban Pet
  </el-button>
</template>
```

### §5.3 動態選單策略

選擇：**client-filtered**

實作：`router/routes.ts` 的每個路由帶有 `meta.permission`，`AdminLayout.vue` 中的 `SidebarMenu` 遍歷路由配置，使用 `usePermission().hasPermission(route.meta.permission)` 過濾掉無存取權的選單項。

### §5.4 Token / Session 管理

| 項目 | 規格 |
|------|------|
| Session 存儲位置 | HttpOnly Cookie（`session=<session_id>; HttpOnly; SameSite=Strict; Secure; Path=/admin`） |
| Inactivity Timeout | 4 小時（ADMIN_SESSION_INACTIVITY_EXPIRY_HOURS = 4） |
| Absolute Expiry | 8 小時（ADMIN_SESSION_ABSOLUTE_EXPIRY_HOURS = 8） |
| Session 識別 | 前端不存放 token 字串；`isAuthenticated` 由 `GET /admin/api/dashboard`（或任意需驗證 API）的 401 / 200 回應判斷 |
| Refresh 策略 | Axios Response Interceptor 攔截 401 → 清除 auth state → 重導登入頁 |
| CSRF 保護 | `X-CSRF-Token` header（見 §8.1 + §8.3） |

---

## §6 Layout 系統

### §6.1 主 Layout 結構

```
┌───────────────────────────────────────────────────────────┐
│  HeaderBar（Logo + Admin Username + Role Badge + Logout）  │
├──────────────┬────────────────────────────────────────────┤
│  SidebarMenu │  Content Area                              │
│  (260px)     │  ┌──────────────────────────────────────┐  │
│  Dashboard   │  │  BreadCrumb（自動依路由生成）          │  │
│  Pet Mgmt    │  ├──────────────────────────────────────┤  │
│  Battles     │  │  Page Content                        │  │
│  Leaderboard │  │  （max-width: 1400px; padding: 24px）  │  │
│  Analytics   │  │                                      │  │
│  Config ▾    │  └──────────────────────────────────────┘  │
│  GDPR        │                                            │
│  Roles       │                                            │
│  Audit Log   │                                            │
└──────────────┴────────────────────────────────────────────┘
```

**§6.1 功能子項說明：**

- **HeaderBar**：左側 pixel-pet-arena Logo（文字）+ Admin Portal 標籤；右側顯示已登入管理員的 username + role badge（`el-tag`）+ Session 剩餘時間提示（距 inactivity 過期）+ 登出按鈕。按下登出呼叫 `POST /admin/api/auth/logout` 並清除 auth state。

- **SidebarMenu**：使用 Element Plus `el-menu`，展開寬度 260px / 收合寬度 64px（icon-only + Tooltip 顯示名稱）。依當前使用者 role 動態過濾選單項（client-filtered，無權限項目完全不顯示）。選中路由以左邊框 accent 色（`--el-color-primary`）+ 淡背景色標示。Config 選單為巢狀群組（Runtime / Economy / Feature Flags）。

- **BreadCrumb**：Content Area 頂部，使用 `el-breadcrumb`，依 `route.matched` 自動生成層級路徑（如 Pet Management > Pet Detail）。

- **Content 區域**：`max-width: 1400px`；`padding: 24px`；使用 `<RouterView />` 渲染各功能頁。Scroll 僅在 Content 區發生，Sidebar 和 Header 固定不捲動。

### §6.2 Sidebar 規格

| 屬性 | 值 |
|------|-----|
| 展開寬度 | 260px |
| 收合寬度 | 64px（icon only） |
| 收合後行為 | 僅顯示 icon，`:collapse-transition="false"` 防止動畫卡頓；Tooltip 顯示選單名稱 |
| 選中樣式 | 左邊框 3px 實線 `var(--el-color-primary)` + 背景 `var(--el-color-primary-light-9)` |

---

## §7 主要頁面規格

### §7.1 登入頁（/admin/login）

**頁面用途**：Admin 身份驗證（username + password + TOTP 6-digit code）

**表單欄位**：
- `username`：string，必填（不使用 email，防止暴露使用者存在）
- `password`：string，必填，type="password"
- `totpCode`：string，選填（首次登入時不填，系統返回 TOTP_SETUP_REQUIRED 後導向設定頁）

**交互規則**：
- 提交前執行 `formRef.validate()`
- 成功 → 儲存 adminId + role 至 `authStore`，重導 `redirect` query 或預設 `/admin/dashboard`
- 失敗 10 次 → 帳號鎖定（ADMIN_LOGIN_LOCKOUT_THRESHOLD = 10；ADMIN_LOGIN_LOCKOUT_DURATION_MINUTES = 30），顯示 `unlockedAt` 剩餘時間
- IP 層級：10 次/15 分鐘（ADMIN_LOGIN_IP_RATE_LIMIT_ATTEMPTS = 10）
- 返回 `TOTP_SETUP_REQUIRED` → 取出 `error.details.setupToken`，攜帶導向 `/admin/totp/setup`

**所需 API**：`POST /admin/api/auth/login`、`POST /admin/api/auth/totp/setup`

### §7.2 Dashboard（/admin/dashboard）

**頁面用途**：平台運行健康狀態一覽，頁面載入 ≤ 3 秒（ADMIN_PAGE_LOAD_TIME = 3s）

**KPI Cards（統計卡）**：

| 卡片 | 資料來源 | 更新策略 |
|------|---------|---------|
| Claimed Pets Today | `GET /admin/api/dashboard → claimedPetsToday` | 頁面載入時 + 手動刷新按鈕 |
| Active Battles Today | `GET /admin/api/dashboard → activeBattlesToday` | 頁面載入時 + 手動刷新按鈕 |
| Pending GDPR Requests | `GET /admin/api/dashboard → pendingGdprRequests` | 頁面載入時（super_admin 顯示，其餘隱藏） |
| Daily Active Users | `GET /admin/api/dashboard → dailyActiveUsers` | 頁面載入時 |
| Error Rate (5min) | `GET /admin/api/dashboard → errorRateLast5Min` | 頁面載入時 + 30s 輪詢 |
| Email Delivery Rate | `GET /admin/api/dashboard → emailDeliveryRate` | 頁面載入時 |
| System Status | `GET /admin/api/dashboard → systemStatus` | 頁面載入時 + 30s 輪詢 |

**System Status 顯示規則**：`healthy` → 綠色 `el-tag`；`degraded` → 橘色；`down` → 紅色 + 通知 ElNotification

**圖表**：本專案 Dashboard KPI 卡片資料來自 `GET /admin/api/dashboard` 聚合端點，不在 Dashboard 頁面顯示時序圖表（時序圖表置於 /admin/analytics 專頁）。本節無獨立 ECharts 圖表需求。

**所需 API**：`GET /admin/api/dashboard`

**所需 Permission**：所有已驗證角色（`read_only+`）

### §7.3 寵物管理 — 列表頁（/admin/pets）

**頁面用途**：搜尋、篩選、管理平台所有寵物，支援 100 萬筆記錄下 ≤ 2 秒搜尋（ADMIN_SEARCH_RESPONSE_TIME = 2s）

**列表欄位**：Pet ID（truncate）、Owner Email（masked：`p***@example.com`）、Rarity、Level、Win Rate、Battles Played、Ban Status、Created At

**搜尋 / 篩選**：
- 搜尋：Pet UUID（完整）或 Email Hash（SHA-256，64-char hex）
- 篩選：Rarity（`COMMON/RARE/EPIC/LEGENDARY`）/ Ban Status（All / Banned / Active）
- 分頁：每頁 20 筆（預設）

**操作按鈕**（條件顯示）：
- Ban（`v-permission="'moderator'"`）→ 開啟 `PetBanForm.vue` Dialog
- Unban（`v-permission="'moderator'"`，僅 banned 寵物顯示）→ 開啟 `PetBanForm.vue` Dialog（reason 必填）
- View Detail → 導向 `/admin/pets/:petId`

**所需 API**：`GET /admin/api/pets`、`POST /admin/api/pets/:petId/ban`、`POST /admin/api/pets/:petId/unban`

**所需 Permission**：`read_only+`（GET）/ `moderator+`（ban/unban）

### §7.4 寵物管理 — 詳情頁（/admin/pets/:petId）

**頁面用途**：查看單一寵物完整資訊，含封禁歷史與戰鬥記錄

**顯示資訊**：
- 基本資料：ID、Pet Name、Seed、Rarity、Level、Generation Meta（6 dimensions）
- 統計：speed / strength / stamina、Total Training Actions、Last Trained At、is_neglected
- Owner：Owner Email Masked、Claimed At
- Ban 狀態：is_banned、Banned Reason（max 500 chars）、Banned At
- 最近 20 場戰鬥記錄（Arena Battle Records）

**操作**：Ban / Unban（`moderator+`）、Edit Pet Name（`super_admin`，`PUT /admin/api/pets/:petId`）

**所需 API**：`GET /admin/api/pets/:petId`

### §7.5 戰鬥記錄（/admin/battles）

**頁面用途**：查閱所有 arena 戰鬥記錄，支援 flag/unflag 操作

**列表欄位**：Match ID、Mode（RACE/SUMO）、Pet A、Pet B（null if AI）、Winner、Duration、Flagged、Completed At

**篩選**：Date Range（from/to）/ Pet ID / Flagged（All / Flagged Only）

**操作**：
- Flag Battle（`moderator+`）→ `POST /admin/api/battles/:matchId/flag`（reason 必填，max 500 chars）
- Unflag Battle（`moderator+`）→ `DELETE /admin/api/battles/:matchId/flag`（reason 必填）

**所需 API**：`GET /admin/api/battles`、`POST /admin/api/battles/:matchId/flag`、`DELETE /admin/api/battles/:matchId/flag`

**所需 Permission**：`read_only+`（GET）/ `moderator+`（flag/unflag）

### §7.6 可疑活動（/admin/suspicious）

**頁面用途**：列出 Bot 偵測系統自動標記的寵物（> 50 battles/hr rolling window）

**列表欄位**：Pet ID、Battles Last Hour、Win Rate、Flag Count、Last Flagged At

**操作**：前往 Pet Detail（Ban 操作在詳情頁執行）

**閾值說明**：BOT_DETECTION_BATTLES_THRESHOLD = 50 / BOT_DETECTION_WINDOW = 60 分鐘

**所需 API**：`GET /admin/api/suspicious`

**所需 Permission**：`moderator+`

### §7.7 排行榜管理（/admin/leaderboard）

**頁面用途**：查看 Top 500 排行榜（公開版僅 Top 100），可疑寵物帶有 suspicious 標記

**列表欄位**：Rank、Pet Name、Rarity、Level、Score、Win Rate、Battles Last Hour、Suspicious（⚠️ icon if `isSuspicious`）、Banned

**硬上限**：500 筆（LEADERBOARD_ADMIN_VIEW = 500），單次回應，不分頁

**操作**：
- Remove from Leaderboard（`moderator+`）→ `DELETE /admin/api/leaderboard/:petId`
- View Pet Detail → 導向 `/admin/pets/:petId`

**所需 API**：`GET /admin/api/leaderboard`、`DELETE /admin/api/leaderboard/:petId`

**所需 Permission**：`read_only+`（GET）/ `moderator+`（DELETE）

### §7.8 Analytics（/admin/analytics）

**頁面用途**：平台時序分析圖表

**圖表**：
| 圖表 | 類型 | 資料來源 |
|------|------|---------|
| Daily Active Users | ECharts 折線圖 | `GET /admin/api/analytics?metric=dau` |
| New Claims | ECharts 折線圖 | `GET /admin/api/analytics?metric=claims` |
| Arena Battles | ECharts 柱狀圖 | `GET /admin/api/analytics?metric=arena_battles` |
| Leaderboard UVs | ECharts 折線圖 | `GET /admin/api/analytics?metric=leaderboard_uvs` |

**操作**：Date Range 選擇器（from / to，必填），手動刷新

**所需 API**：`GET /admin/api/analytics`

**所需 Permission**：`read_only+`

### §7.9 Email Monitor（/admin/email）

**頁面用途**：監控 SendGrid 交付健康狀況

**顯示資訊**：Emails Sent (24h)、Delivery Success Rate（目標 ≥ 98%）、Bounce Rate、Spam Complaint Rate（目標 < 0.1%）、Failover Active（boolean）

**所需 API**：`GET /admin/api/email/monitor`

**所需 Permission**：`read_only+`

### §7.10 系統配置（/admin/config/runtime）

**頁面用途**：運行時參數調整，配置變更 5 分鐘內生效（CONFIG_CACHE_REFRESH_TIME = 5 min）

**表單欄位**：
- `arenaRateLimitBattlesPerHour`：integer，範圍 `[1, 50]`（ARENA_RATE_LIMIT_ADMIN_MIN / MAX）
- `arenaMatchmakingTimeoutSeconds`：integer，建議範圍 5–120
- `rarityWeights.common`：integer
- `rarityWeights.rare`：integer
- `rarityWeights.epic`：integer
- `rarityWeights.legendary`：integer（四項必須合計 = 100%）

**所需 API**：`GET /admin/api/config/runtime`、`PUT /admin/api/config/runtime`

**所需 Permission**：`super_admin`

### §7.11 經濟配置（/admin/config/economy）

**頁面用途**：Food Buff 倍率與 Arena 進入費用設定

**表單欄位**：
- `foodBuffMultiplierMin`：0.5–5.0（FOOD_BUFF_MULTIPLIER_ADMIN_MIN / MAX）
- `foodBuffMultiplierMax`：0.5–5.0
- `arenaEntryCostFoodCreditsDefault`：0–10（ARENA_ENTRY_COST_FOOD_CREDITS_DEFAULT / ADMIN_MAX）
- `arenaEntryCooldownMaxMinutes`：0–60（ARENA_ENTRY_COOLDOWN_ADMIN_MIN / MAX）

**所需 API**：`GET /admin/api/config/economy`、`PUT /admin/api/config/economy`

**所需 Permission**：`super_admin`

### §7.12 Feature Flags（/admin/config/flags）

**頁面用途**：控制 FF_MARKETPLACE 等功能開關

**列表欄位**：Flag Name、Enabled（`el-switch`）、Description

**操作**：Toggle → `PUT /admin/api/config/flags/:flag`（需二次確認對 `FF_MARKETPLACE` 等影響重大的 flag）

**所需 API**：`GET /admin/api/config/flags`、`PUT /admin/api/config/flags/:flag`

**所需 Permission**：`super_admin`

### §7.13 GDPR 佇列（/admin/gdpr）

**頁面用途**：處理 5 種 GDPR 請求（erasure / data_access / restrict_processing / object_leaderboard / rectification）

**列表欄位**：Request ID、Request Type、Status、Submitted At、Completed At、Admin Notes

**篩選**：Status / Type

**操作**：
- Update Status（non-erasure requests）→ `PATCH /admin/api/gdpr/:requestId`（status + adminNotes，max 500 chars）
- Initiate Admin Erasure → `POST /admin/api/gdpr/delete`（emailHash + reason，max 500 chars）

**SLA 顯示**：每行顯示距 SLA deadline 的剩餘時間（erasure: 7 天；data_access: 30 天；restrict_processing: 24h；object_leaderboard: 5 business days；rectification: 24h）

**所需 API**：`GET /admin/api/gdpr`、`PATCH /admin/api/gdpr/:requestId`、`POST /admin/api/gdpr/delete`

**所需 Permission**：`super_admin`

### §7.14 角色管理（/admin/roles）

**頁面用途**：管理 Admin 帳號（新增 / 停用 / TOTP 重置）

**列表欄位**：Admin ID、Username、Role、Last Login At、Status（Active / Deactivated）

**操作**：
- Create Admin → `POST /admin/api/roles`（username + role + temporaryPassword）
- Deactivate Admin → `DELETE /admin/api/roles/:adminId`（需二次確認）
- Reset TOTP → `POST /admin/api/roles/:adminId/totp/reset`（需二次確認）

**約束**：Admin 帳號僅 soft-delete（`deactivated_at`），不可硬刪除

**所需 API**：`GET /admin/api/roles`、`POST /admin/api/roles`、`DELETE /admin/api/roles/:adminId`、`POST /admin/api/roles/:adminId/totp/reset`

**所需 Permission**：`super_admin`

### §7.15 稽核日誌（/admin/audit）

**頁面用途**：查閱所有 Admin CUD 操作記錄，任意 12 個月視窗搜尋 ≤ 3 秒（ADMIN_AUDIT_LOG_SEARCH_RESPONSE_TIME = 3s）

**列表欄位**：Log ID、Admin Username、Action、Target Type、Target ID、Detail（JSONB 摘要）、Created At

**篩選**：Actor（actorId UUID）/ Action Type（如 `pet.ban`）/ Date Range（from / to）

**唯讀**：不可刪除、不可修改；Detail 欄位可展開查看完整 JSONB（`AuditLogDetail.vue`）

**IP 說明**：IP 地址以 SHA-256 hash 存儲，原始 IP 不顯示；保留 90 天（IP_ADDRESS_LOG_RETENTION_DAYS = 90）後設為 NULL

**所需 API**：`GET /admin/api/audit`

**所需 Permission**：`super_admin`

---

## §8 API 串接規格

### §8.1 Axios 配置

```typescript
// api/http.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// 來自 CONSTANTS.md：admin_page_load_time = 3s，取 10s 作為 API 逾時
const ADMIN_API_TIMEOUT_MS = 10_000 // 預設 10000ms，CONSTANTS.md 無 ADMIN_API_TIMEOUT_MS 欄位

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: ADMIN_API_TIMEOUT_MS,
  withCredentials: true, // 攜帶 httpOnly session cookie
})

// Request Interceptor：注入 X-CSRF-Token header（API.md §2.2）
http.interceptors.request.use(config => {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1]
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

// Response Interceptor：session 過期處理
http.interceptors.response.use(
  res => res,
  async error => {
    const status = error.response?.status
    if (status === 401) {
      // Session 過期 → 清除 auth state → 重導登入頁
      const authStore = useAuthStore()
      authStore.clearSession()
      await router.push('/admin/login')
    } else if (status === 403) {
      await router.push('/admin/403')
    }
    return Promise.reject(error)
  }
)

export default http
```

### §8.2 CSRF 保護（API.md §2.2）

Admin API 使用 `X-CSRF-Token` header 保護 state-changing 請求：
1. Server 在 session 建立後，以 `csrf_token=<token>` 設置為 SameSite=Strict Cookie（非 httpOnly，供 JS 讀取）
2. 前端 Axios request interceptor（見 §8.1）從 Cookie 讀取並附加為 `X-CSRF-Token` header
3. Server 驗證 header 與 session 綁定的 CSRF token 一致

### §8.3 Admin Session 處理

Admin session 使用 server-side Redis session（`session:admin:{session_id}`）：
- **Inactivity TTL**：14400s（ADMIN_SESSION_INACTIVITY_EXPIRY_HOURS = 4h）— 每次請求由 server 自動 renew TTL
- **Absolute Expiry**：28800s（ADMIN_SESSION_ABSOLUTE_EXPIRY_HOURS = 8h）— server 在 session JSON 中以 `absExpiry` 欄位檢查
- **前端監控**：`useSessionTimer.ts` composable 在 login 時啟動計時，距 inactivity 5 分鐘前提示 toast；達 absolute expiry 強制導向登入

### §8.4 API Endpoints 對應表（API.md §6 全部 /admin/api/* 路由）

| 功能 | Method | Path | 所需 Permission | 對應頁面 |
|------|--------|------|----------------|---------|
| Admin 登入 | POST | `/admin/api/auth/login` | 公開 | `/admin/login` |
| TOTP 設定 | POST | `/admin/api/auth/totp/setup` | setupToken | `/admin/totp/setup` |
| 登出 | POST | `/admin/api/auth/logout` | 已驗證 | — |
| TOTP 驗證（step-up） | POST | `/admin/api/auth/totp/verify` | 已驗證 | — |
| Admin 帳號列表 | GET | `/admin/api/roles` | super_admin | `/admin/roles` |
| 新增 Admin 帳號 | POST | `/admin/api/roles` | super_admin | `/admin/roles` |
| 停用 Admin 帳號 | DELETE | `/admin/api/roles/:adminId` | super_admin | `/admin/roles` |
| 重置 TOTP | POST | `/admin/api/roles/:adminId/totp/reset` | super_admin | `/admin/roles` |
| 寵物列表 | GET | `/admin/api/pets` | read_only+ | `/admin/pets` |
| 寵物詳情 | GET | `/admin/api/pets/:petId` | read_only+ | `/admin/pets/:petId` |
| 更新寵物（petName） | PUT | `/admin/api/pets/:petId` | super_admin | `/admin/pets/:petId` |
| 封禁寵物 | POST | `/admin/api/pets/:petId/ban` | moderator+ | `/admin/pets` |
| 解封寵物 | POST | `/admin/api/pets/:petId/unban` | moderator+ | `/admin/pets` |
| 戰鬥記錄列表 | GET | `/admin/api/battles` | read_only+ | `/admin/battles` |
| 可疑活動列表 | GET | `/admin/api/suspicious` | moderator+ | `/admin/suspicious` |
| 旗標戰鬥 | POST | `/admin/api/battles/:matchId/flag` | moderator+ | `/admin/battles` |
| 移除旗標 | DELETE | `/admin/api/battles/:matchId/flag` | moderator+ | `/admin/battles` |
| 排行榜（Top 500） | GET | `/admin/api/leaderboard` | read_only+ | `/admin/leaderboard` |
| 移除排行榜條目 | DELETE | `/admin/api/leaderboard/:petId` | moderator+ | `/admin/leaderboard` |
| 讀取 Runtime Config | GET | `/admin/api/config/runtime` | super_admin | `/admin/config/runtime` |
| 更新 Runtime Config | PUT | `/admin/api/config/runtime` | super_admin | `/admin/config/runtime` |
| 讀取 Economy Config | GET | `/admin/api/config/economy` | super_admin | `/admin/config/economy` |
| 更新 Economy Config | PUT | `/admin/api/config/economy` | super_admin | `/admin/config/economy` |
| 讀取 Feature Flags | GET | `/admin/api/config/flags` | super_admin | `/admin/config/flags` |
| 更新 Feature Flag | PUT | `/admin/api/config/flags/:flag` | super_admin | `/admin/config/flags` |
| GDPR 佇列列表 | GET | `/admin/api/gdpr` | super_admin | `/admin/gdpr` |
| Admin 發起刪除請求 | POST | `/admin/api/gdpr/delete` | super_admin | `/admin/gdpr` |
| 更新 GDPR 狀態 | PATCH | `/admin/api/gdpr/:requestId` | super_admin | `/admin/gdpr` |
| 稽核日誌 | GET | `/admin/api/audit` | super_admin | `/admin/audit` |
| Dashboard | GET | `/admin/api/dashboard` | read_only+ | `/admin/dashboard` |
| Analytics | GET | `/admin/api/analytics` | read_only+ | `/admin/analytics` |
| Email Monitor | GET | `/admin/api/email/monitor` | read_only+ | `/admin/email` |

---

## §9 Pinia Store 架構

### §9.1 Store 清單

| Store | 職責 | 主要狀態 |
|-------|------|---------|
| `authStore` | 認證狀態 / Session 管理 | `adminId`, `role`, `username`, `sessionExpiresAt`, `isAuthenticated` |
| `permissionStore` | 當前使用者 Role + Permission 查詢 | `role`, `hasPermission()` |
| `configStore` | Runtime Config + Economy Config + Feature Flags 的前端快取 | `runtimeConfig`, `economyConfig`, `featureFlags` |

### §9.2 authStore 關鍵邏輯

本專案採用 **HttpOnly Cookie** session 機制，`authStore` 不存放 token 字串。`isAuthenticated` 依登入 API 成功回應後設定的 flag 判斷；頁面刷新後若 session 仍有效，Axios 自動攜帶 cookie，第一個需驗證的 API 呼叫若回傳 200 則維持登入態，若 401 則重導登入頁。

```typescript
// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePermissionStore } from './permission'
import { authApi } from '@/api/auth'
import router from '@/router'

interface AdminUser {
  adminId: string
  username: string
  role: 'super_admin' | 'moderator' | 'read_only'
  sessionExpiresAt: string
}

export const useAuthStore = defineStore('auth', () => {
  const adminUser = ref<AdminUser | null>(null)
  const loginAt = ref<number | null>(null)

  // HttpOnly Cookie session：isAuthenticated 由 adminUser 是否存在判斷
  const isAuthenticated = computed(() => adminUser.value !== null)

  async function login(credentials: { username: string; password: string; totpCode?: string }) {
    const res = await authApi.login(credentials)
    adminUser.value = {
      adminId: res.data.adminId,
      username: credentials.username,
      role: res.data.role,
      sessionExpiresAt: res.data.sessionExpiresAt,
    }
    loginAt.value = Date.now()
    const permStore = usePermissionStore()
    permStore.setRole(res.data.role)
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clearSession()
      await router.push('/admin/login')
    }
  }

  function clearSession() {
    adminUser.value = null
    loginAt.value = null
    const permStore = usePermissionStore()
    permStore.clearRole()
  }

  return { adminUser, isAuthenticated, loginAt, login, logout, clearSession }
})
```

### §9.3 permissionStore 關鍵邏輯

```typescript
// stores/permission.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

type AdminRole = 'super_admin' | 'moderator' | 'read_only'

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  read_only: 0,
  moderator: 1,
  super_admin: 2,
}

export const usePermissionStore = defineStore('permission', () => {
  const role = ref<AdminRole | null>(null)

  function setRole(r: AdminRole) {
    role.value = r
  }

  function clearRole() {
    role.value = null
  }

  function hasPermission(requiredRole: AdminRole): boolean {
    if (!role.value) return false
    return (ROLE_HIERARCHY[role.value] ?? -1) >= (ROLE_HIERARCHY[requiredRole] ?? 99)
  }

  // 依 role 生成有權限的 sidebar menu keys
  const accessibleMenuKeys = () => {
    if (!role.value) return []
    const all = ['dashboard', 'pets', 'battles', 'suspicious', 'leaderboard', 'analytics', 'email']
    const superOnly = ['config', 'gdpr', 'roles', 'audit']
    if (role.value === 'super_admin') return [...all, ...superOnly]
    if (role.value === 'moderator') return all
    return all.filter(k => !['suspicious'].includes(k))
  }

  return { role, setRole, clearRole, hasPermission, accessibleMenuKeys }
})
```

### §9.4 configStore 關鍵邏輯

```typescript
// stores/config.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { configApi } from '@/api/config'

interface RuntimeConfig {
  arenaRateLimitBattlesPerHour: number
  arenaMatchmakingTimeoutSeconds: number
  rarityWeights: { common: number; rare: number; epic: number; legendary: number }
}

interface EconomyConfig {
  foodBuffMultiplierMin: number
  foodBuffMultiplierMax: number
  arenaEntryCostFoodCreditsDefault: number
  arenaEntryCostFoodCreditsMax: number
  arenaEntryCooldownMinMinutes: number
  arenaEntryCooldownMaxMinutes: number
}

interface FeatureFlag {
  flag: string
  enabled: boolean
  description: string
}

export const useConfigStore = defineStore('config', () => {
  const runtimeConfig = ref<RuntimeConfig | null>(null)
  const economyConfig = ref<EconomyConfig | null>(null)
  const featureFlags = ref<FeatureFlag[]>([])
  const loading = ref(false)

  async function fetchRuntimeConfig() {
    loading.value = true
    try {
      const res = await configApi.getRuntimeConfig()
      runtimeConfig.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function updateRuntimeConfig(patch: Partial<RuntimeConfig>) {
    await configApi.putRuntimeConfig(patch)
    await fetchRuntimeConfig() // 刷新快取
  }

  async function fetchFeatureFlags() {
    const res = await configApi.getFeatureFlags()
    featureFlags.value = res.data.flags
  }

  async function toggleFlag(flag: string, enabled: boolean) {
    await configApi.putFeatureFlag(flag, enabled)
    await fetchFeatureFlags()
  }

  return {
    runtimeConfig, economyConfig, featureFlags, loading,
    fetchRuntimeConfig, updateRuntimeConfig, fetchFeatureFlags, toggleFlag,
  }
})
```

---

## §10 Element Plus 組件規範

### §10.1 Table 組件標準（通用）

所有 Admin Table 必須實作三狀態：

```vue
<template>
  <div>
    <!-- Loading 狀態 -->
    <el-table v-loading="loading" :data="tableData">
      <el-table-column prop="id" label="ID" />
      <!-- ... -->
    </el-table>

    <!-- Empty 狀態（el-table 內建 empty-text） -->
    <!-- el-table 空資料時自動顯示 empty slot -->
    <template #empty>
      <el-empty description="No records found" />
    </template>

    <!-- Error 狀態 -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
    >
      <template #default>
        <el-button size="small" @click="fetchData">Retry</el-button>
      </template>
    </el-alert>

    <!-- 分頁 -->
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      @change="fetchData"
    />
  </div>
</template>
```

### §10.2 Form 組件標準

```vue
<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="160px">
    <el-form-item label="Reason" prop="reason">
      <el-input
        v-model="form.reason"
        type="textarea"
        :maxlength="500"
        show-word-limit
        :rows="4"
        placeholder="Enter moderation reason (max 500 characters)"
      />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        Confirm
      </el-button>
      <el-button @click="handleCancel">Cancel</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'

const ADMIN_MODERATION_REASON_MAX_CHARS = 500 // 來自 CONSTANTS.md

const formRef = ref<FormInstance>()
const form = ref({ reason: '' })
const submitting = ref(false)

const rules = {
  reason: [
    { required: true, message: 'Reason is required', trigger: 'blur' },
    { max: ADMIN_MODERATION_REASON_MAX_CHARS, message: `Max ${ADMIN_MODERATION_REASON_MAX_CHARS} characters`, trigger: 'change' },
  ],
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    // ... API call
    ElMessage.success('Action completed successfully')
  } finally {
    submitting.value = false
  }
}
</script>
```

### §10.3 確認危險操作（ElMessageBox）

所有 ban / deactivate / delete / feature flag toggle 等危險操作：

```typescript
import { ElMessageBox, ElMessage } from 'element-plus'

async function handleBanPet(petId: string) {
  await ElMessageBox.confirm(
    `Are you sure you want to ban this pet? It will be removed from the leaderboard within 5 minutes.`,
    'Confirm Ban',
    {
      type: 'warning',
      confirmButtonText: 'Ban Pet',
      cancelButtonText: 'Cancel',
      confirmButtonClass: 'el-button--danger',
    }
  )
  // 確認後執行操作
  await petsApi.ban(petId, { reason: moderationReason.value })
  ElMessage.success('Pet banned successfully. Leaderboard removal in progress.')
}
```

### §10.4 全局 Message 提示標準

```typescript
// 操作成功
ElMessage({ type: 'success', message: 'Changes saved', duration: 3000 })

// 操作失敗（API error）
ElMessage({ type: 'error', message: `Error: ${err.response?.data?.error?.message ?? 'Unknown error'}`, duration: 5000 })

// 警告（如 GDPR SLA 即將到期）
ElNotification({ type: 'warning', title: 'GDPR SLA Alert', message: 'Request #xxx expires in 2 hours', duration: 0 })
```

---

## §11 通用組件規格

### §11.1 SearchableTable 組件

```typescript
// 型別定義
interface TableColumn {
  prop: string
  label: string
  width?: number | string
  minWidth?: number | string
  sortable?: boolean
  formatter?: (row: unknown, column: unknown, value: unknown) => string
  slot?: string // 自訂渲染 slot name
}

interface SearchField {
  prop: string
  label: string
  type: 'input' | 'select' | 'date-range'
  placeholder?: string
  options?: { label: string; value: string | number | boolean }[]
}

interface PagedResponse<T> {
  data: { [key: string]: T[] }
  meta: { total: number; page: number; limit: number }
}

interface SearchableTableProps {
  columns: TableColumn[]
  fetchFn: (params: Record<string, unknown>) => Promise<PagedResponse<unknown>>
  searchFields?: SearchField[]
  defaultPageSize?: number // 預設 20
  selectable?: boolean
  rowKey?: string // 預設 'id'
}
```

**使用範例**：

```vue
<SearchableTable
  :columns="petColumns"
  :fetch-fn="fetchPets"
  :search-fields="petSearchFields"
  :default-page-size="20"
>
  <template #actions="{ row }">
    <el-button v-permission="'moderator'" size="small" type="danger" @click="banPet(row)">
      Ban
    </el-button>
  </template>
</SearchableTable>
```

### §11.2 AuditLogDetail 組件

顯示 `admin_audit_log.detail` JSONB 的格式化內容，支援 key-value 高亮顯示 `reason`、`previous_value`、`new_value` 等欄位。

```typescript
interface AuditLogDetailProps {
  logId: string | number        // audit_log id (BIGSERIAL)
  adminUsername: string
  action: string                // e.g. 'pet.ban', 'config.arena_rate_limit'
  targetType: string            // 'pet' | 'arena_match' | 'config_runtime' | ...
  targetId: string
  detail: Record<string, unknown> | null
  createdAt: string             // ISO 8601
  visible: boolean              // 控制 Drawer 開關
}
```

**使用範例**：

```vue
<AuditLogDetail
  v-bind="selectedLog"
  :visible="drawerVisible"
  @close="drawerVisible = false"
/>
```

---

## §12 圖表整合規格

本專案 Admin Analytics 頁面使用 ECharts 5.x（via vue-echarts 6.x）顯示時序數據。

| 圖表 | 類型 | 更新策略 |
|------|------|---------|
| Daily Active Users | ECharts 折線圖（LineChart） | 手動刷新（Date Range 變更） |
| New Claims Per Day | ECharts 折線圖（LineChart） | 手動刷新 |
| Arena Battles Per Day | ECharts 柱狀圖（BarChart） | 手動刷新 |
| Leaderboard UVs | ECharts 折線圖（LineChart） | 手動刷新 |

**ECharts 按需引入範例**：

```typescript
// views/analytics/AnalyticsView.vue
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])
```

**響應式尺寸**：使用 `v-chart` 的 `autoresize` prop 自動適應容器寬度：

```vue
<v-chart :option="chartOption" autoresize style="height: 320px" />
```

---

## §13 國際化（i18n）

本專案 Admin Portal 為單語言（English），略過多語言配置。Element Plus locale 使用預設 `en` locale 即可。

---

## §14 效能優化

### §14.1 Lazy Loading（路由層）

```typescript
// router/routes.ts
const routes = [
  {
    path: '/admin/login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/admin/dashboard',
    component: () => import('@/views/dashboard/DashboardView.vue'),
  },
  {
    path: '/admin/pets',
    component: () => import('@/views/pets/PetListView.vue'),
  },
  {
    path: '/admin/pets/:petId',
    component: () => import('@/views/pets/PetDetailView.vue'),
  },
  {
    path: '/admin/battles',
    component: () => import('@/views/battles/BattleListView.vue'),
  },
  {
    path: '/admin/suspicious',
    component: () => import('@/views/battles/SuspiciousView.vue'),
    meta: { permission: 'moderator' },
  },
  {
    path: '/admin/leaderboard',
    component: () => import('@/views/leaderboard/LeaderboardView.vue'),
  },
  {
    path: '/admin/analytics',
    component: () => import('@/views/analytics/AnalyticsView.vue'),
  },
  {
    path: '/admin/email',
    component: () => import('@/views/analytics/EmailMonitorView.vue'),
  },
  {
    path: '/admin/config/runtime',
    component: () => import('@/views/config/RuntimeConfigView.vue'),
    meta: { permission: 'super_admin' },
  },
  {
    path: '/admin/config/economy',
    component: () => import('@/views/config/EconomyConfigView.vue'),
    meta: { permission: 'super_admin' },
  },
  {
    path: '/admin/config/flags',
    component: () => import('@/views/config/FeatureFlagsView.vue'),
    meta: { permission: 'super_admin' },
  },
  {
    path: '/admin/gdpr',
    component: () => import('@/views/gdpr/GdprQueueView.vue'),
    meta: { permission: 'super_admin' },
  },
  {
    path: '/admin/roles',
    component: () => import('@/views/roles/RoleManagementView.vue'),
    meta: { permission: 'super_admin' },
  },
  {
    path: '/admin/audit',
    component: () => import('@/views/audit/AuditLogView.vue'),
    meta: { permission: 'super_admin' },
  },
]
```

### §14.2 Bundle 分析

```bash
# 執行 bundle 分析
npx vite-bundle-visualizer
```

目標：Element Plus 使用自動按需引入（unplugin-auto-import + unplugin-vue-components），主 bundle **< 150 KB gzipped**。

### §14.3 首屏時間目標

| 目標 | 數值 | 來源 |
|------|------|------|
| 關鍵頁面首屏時間（FCP） | < 2000ms | 預設值（CONSTANTS.md 無 ADMIN_FCP_TARGET_MS 欄位）；Admin 頁面載入目標 3s (ADMIN_PAGE_LOAD_TIME = 3s) 對應 FCP < 2s |
| Admin 頁面載入（含資料） | < 3000ms | ADMIN_PAGE_LOAD_TIME = 3（CONSTANTS.md）|
| Pet 搜尋回應 | < 2000ms | ADMIN_SEARCH_RESPONSE_TIME = 2（CONSTANTS.md）|

### §14.4 Element Plus 按需引入配置

```typescript
// vite.config.ts（unplugin 配置）
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

plugins: [
  AutoImport({ resolvers: [ElementPlusResolver()] }),
  Components({ resolvers: [ElementPlusResolver()] }),
]
```

---

## §15 部署配置

### §15.1 Vite 設定（Build + Dev Proxy）

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  base: '/admin/',
  plugins: [
    vue(),
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/admin/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/admin',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-element': ['element-plus', '@element-plus/icons-vue'],
          'vendor-charts': ['echarts', 'vue-echarts'],
          'vendor-axios': ['axios'],
        },
      },
    },
  },
})
```

### §15.2 環境變數

| 變數 | Development | Production |
|------|-------------|-----------|
| `VITE_API_BASE_URL` | `http://localhost:3000` | `https://api.pixel-pet-arena.com`（Nginx 反代）|
| `VITE_ADMIN_PATH` | `/admin` | `/admin` |

`.env.development`：
```
VITE_API_BASE_URL=http://localhost:3000
VITE_ADMIN_PATH=/admin
```

`.env.production`：
```
VITE_API_BASE_URL=https://api.pixel-pet-arena.com
VITE_ADMIN_PATH=/admin
```

### §15.3 Nginx 路由配置

```nginx
# Admin Portal SPA routing
location /admin/ {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /admin/index.html;
}

# Admin API proxy（對應 ARCH §1.2 Admin Portal → Admin API Server 連線路徑）
location /admin/api/ {
    proxy_pass http://backend:3000/admin/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # 傳遞 CSRF token cookie
    proxy_pass_header Set-Cookie;
}
```

**Vercel 部署**（替代 Nginx）：

`packages/admin-app/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/admin/api/(.*)", "destination": "https://api.pixel-pet-arena.com/admin/api/$1" },
    { "source": "/admin/(.*)", "destination": "/admin/index.html" }
  ]
}
```

---

## §16 Self-Check Checklist（開發者交付前驗收）

| # | 檢查項目 | 狀態 |
|---|----------|------|
| 1 | §3 目錄結構完整，含 views/stores/router/api/composables/components | ✅ |
| 2 | §4 路由表覆蓋所有 Admin 功能頁面，含 meta.permission 欄位 | ✅ |
| 3 | §5 RBAC：三個 Role 定義完整 + PermissionGuard composable + v-permission directive | ✅ |
| 4 | §5.2 Permission Guard：hasPermission() 實作（role hierarchy）+ 路由守衛 + 按鈕層級控制說明 | ✅ |
| 5 | §7 頁面規格：Login / Dashboard / Pet / Battle / Suspicious / Leaderboard / Analytics / Email / Config (Runtime/Economy/Flags) / GDPR / Roles / Audit 全部有欄位與操作說明 | ✅ |
| 6 | §8 Axios 配置有 baseURL + request interceptor（CSRF token 注入）+ response interceptor（401/403 處理）說明 | ✅ |
| 7 | §8 /admin/api/* endpoint 對應表完整（31 個端點，含 API.md §6.1–§6.9 全部路徑）| ✅ |
| 8 | §9 三個 Pinia Store（authStore / permissionStore / configStore）有完整 state + actions | ✅ |
| 9a | §15.1 Vite Build：`base='/admin/'`、`outDir='dist/admin'` 已填入、`manualChunks` vendor 切割已設定、`server.proxy` 代理 `/admin/api` 已設定 | ✅ |
| 9b | §15.2/§15.3 環境變數：`VITE_API_BASE_URL` 已填入；Nginx `/admin/` `try_files` 已設定 | ✅ |
| 10 | 全文無 `{{PLACEHOLDER}}` / TODO 空欄 | ✅ |
| 11 | §1 Admin Portal 概覽：系統定位已填入；§1.3 角色表格已依 EDD §3.7 + ARCH §5.1 完整填入三個角色，無 placeholder | ✅ |
| 12 | §6.1 主 Layout 結構：ASCII 框線圖維持三區（Header / Sidebar / Content Area）；§6.1 文字說明涵蓋 HeaderBar / SidebarMenu / BreadCrumb / Content 四個功能子項 | ✅ |
| 13 | §5.1 Permission 清單與 API.md §6 /admin/api/* endpoint 的 Role Access 一對一對應 | ✅ |
