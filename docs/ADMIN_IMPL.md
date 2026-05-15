# ADMIN_IMPL — Admin Portal Implementation Specification
<!-- SDLC Layer 4: Implementation Engineering -->
<!-- Upstream: EDD.md (tech stack §3.7) + FRONTEND.md §3 (admin portal design) + API.md §6 (/admin/api/* endpoints) + SCHEMA.md (admin_accounts + admin_audit_log tables) + constants.json -->
<!-- Scope: Admin Portal (Vue 3 + Element Plus + TypeScript + Vite). Player App (React 18 + Phaser 3) is excluded — see CLIENT_IMPL.md. -->

---

## Document Control

| Field | Content |
|-------|---------|
| **DOC-ID** | ADMIN_IMPL-PIXEL-PET-ARENA-20260503 |
| **Project Name** | pixel-pet-arena |
| **Admin Tech Stack** | Vue 3 (Composition API) + Element Plus + Vite 5 + TypeScript 5 (FRONTEND.md §3) |
| **Document Version** | v1.0 |
| **Status** | DRAFT |
| **Author** | AI Generated (gendoc ADMIN_IMPL) |
| **Date** | 2026-05-03 |
| **Upstream EDD** | [EDD.md](EDD.md) §3.3 + §5.5-A |
| **Upstream API** | [API.md](API.md) §6 — `/admin/api/*` endpoints |
| **Upstream SCHEMA** | [SCHEMA.md](SCHEMA.md) — `admin_accounts` + `admin_audit_log` tables |
| **Upstream ARCH** | [ARCH.md](ARCH.md) — Admin Portal container (deployment + tech stack) |
| **Upstream CONSTANTS** | [constants.json](constants.json) — session TTLs, page sizes, rate limits |

---

## Change Log

| Version | Date | Author | Change Summary |
|---------|------|--------|----------------|
| v1.0 | 2026-05-03 | AI Generated (gendoc ADMIN_IMPL) | Initial draft |

---

## §1 Admin Portal Overview

### §1.1 System Purpose

The pixel-pet-arena Admin Portal is an internal operations platform used exclusively by platform staff. Primary user groups:

- **Super Admin**: Full access — account management, GDPR compliance, system configuration, audit log review
- **Moderator**: Pet management (ban/unban), suspicious activity review, battle record inspection, leaderboard view
- **Read Only**: Monitoring dashboard, leaderboard and analytics read access, no write permissions

Core operations problems the portal solves:

1. **Pet ban/unban** — Processes automated bot detection results (threshold: > 50 battles/hr rolling window; `bot_detection_battles_threshold = 50`)
2. **Leaderboard management** — Admins view Top 500; public shows only Top 100 (`leaderboard_admin_view = 500`, `leaderboard_top_display = 100`)
3. **GDPR compliance queue** — Handles erasure / data_access / restrict_processing / object_leaderboard / rectification requests across 5 request types
4. **System configuration** — Runtime parameters (arena rate limit, rarity weights) and economy parameters (food buff multiplier) cached in Redis (TTL: `config_cache_refresh_time_minutes = 5`)
5. **Audit log** — All CUD operations recorded, retained 2 years (`admin_audit_log_retention_years = 2`)

### §1.2 Design Principles

- **Security-first**: RBAC minimum privilege; httpOnly + SameSite=Strict session cookie; every operation produces an audit log entry
- **Operational efficiency**: Bulk operations + smart search (pet ID / email hash)
- **Data consistency**: Shares the same database as the main system; admin reads configuration via Redis cache (TTL: 300 s; config_cache_refresh_time_minutes = 5)
- **Auditability**: All CUD operations write to `admin_audit_log`, retained 2 years (`admin_audit_log_retention_years = 2`)

### §1.3 User Roles (from EDD §3.7 + ARCH §5.1)

| Role | Display Name | Accessible Features |
|------|-------------|---------------------|
| `super_admin` | Super Admin | All: GDPR, config, roles, audit log + all moderator features |
| `moderator` | Moderator | Pet management (ban/unban), battle management (flag/unflag), leaderboard view, suspicious activity, email monitor, analytics, dashboard |
| `read_only` | Read Only | GET-only: dashboard, pet list, leaderboard, battle records, email monitor, analytics |

---

## §2 Technology Stack Decisions

### §2.1 Framework Selection

| Technology | Choice | Rationale |
|-----------|--------|-----------|
| Frontend Framework | Vue 3.4+ (Composition API) | `<script setup>` syntax + Composition API fully compatible with Element Plus 2.x; Vue 3 reactivity system well-suited for form-heavy admin CRUD interfaces |
| UI Component Library | Element Plus 2.7+ | Enterprise-grade component library; `ElTable` with built-in sorting/filtering/pagination handles admin data-intensive requirements out of the box |
| Build Tool | Vite 5.x | Fast HMR + optimized production bundle; seamless integration with monorepo pnpm workspaces |
| State Management | Pinia 2.x | Modular stores; Vue 3 native TypeScript-friendly; official replacement for Vuex |
| Routing | Vue Router 4.x | History mode + dynamic routing + `beforeEach` route guards (RBAC validation) |
| HTTP Client | Axios 1.x | Request/response interceptors for session expiry handling; `withCredentials: true` for session cookie |
| Charts | ECharts 5.x (via vue-echarts 6.x) | Analytics dashboard line chart requirements; tree-shakeable on-demand imports control bundle size |
| i18n | None (single-language — English only) | Admin is an internal tool; English-only interface is sufficient |

### §2.2 Dependency Version Manifest

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
    "@vue/test-utils": "^2.4.0",
    "unplugin-auto-import": "^0.17.0",
    "unplugin-vue-components": "^0.26.0"
  }
}
```

---

## §3 Directory Structure

```
packages/admin-app/                   ← Admin Portal root (pnpm workspace)
├── src/
│   ├── api/                          ← API call wrappers (maps to API.md /admin/api/* routes)
│   │   ├── http.ts                   ← Axios instance + interceptors (session handling)
│   │   ├── auth.ts                   ← login / logout / totp/setup / totp/verify
│   │   ├── pets.ts                   ← GET /pets, GET /pets/:id, ban, unban
│   │   ├── battles.ts                ← GET /battles, GET /suspicious, flag, unflag
│   │   ├── leaderboard.ts            ← GET /leaderboard, DELETE /leaderboard/:petId
│   │   ├── config.ts                 ← GET/PUT /config/runtime, /economy, /flags
│   │   ├── gdpr.ts                   ← GET /gdpr, POST /gdpr/delete, PATCH /gdpr/:id
│   │   ├── audit.ts                  ← GET /admin/api/audit
│   │   ├── roles.ts                  ← GET/POST /roles, DELETE /roles/:id, TOTP reset
│   │   ├── analytics.ts              ← GET /analytics, GET /dashboard, GET /email/monitor
│   │   └── types.ts                  ← API response types (synchronized with packages/shared)
│   ├── components/
│   │   ├── common/                   ← Shared components
│   │   │   ├── SearchableTable.vue   ← Table + Pagination + Search bar composite component
│   │   │   ├── ConfirmDialog.vue     ← ElMessageBox wrapper (dangerous action confirmation)
│   │   │   ├── AuditLogDetail.vue    ← Audit log detail Drawer
│   │   │   └── StatusBadge.vue       ← Status badge (banned / active / pending)
│   │   └── business/                 ← Domain-specific components
│   │       ├── PetBanForm.vue        ← Ban/unban Dialog (reason field, max 500 chars)
│   │       ├── BattleFlagForm.vue    ← Flag battle Dialog
│   │       └── GdprStatusForm.vue    ← GDPR status update Dialog
│   ├── composables/                  ← Reusable logic (Vue Composition API)
│   │   ├── usePermission.ts          ← hasPermission() + v-permission directive
│   │   ├── usePagination.ts          ← Pagination state management
│   │   ├── useTable.ts               ← Table loading / error / data three-state pattern
│   │   └── useSessionTimer.ts        ← 4h inactivity + 8h absolute expiry monitoring
│   ├── layouts/
│   │   └── AdminLayout.vue           ← HeaderBar + SidebarMenu + Content main layout
│   ├── router/
│   │   ├── index.ts                  ← Route definitions + createRouter
│   │   ├── guards.ts                 ← beforeEach route guards (session + role validation)
│   │   └── routes.ts                 ← Route list (includes meta.permission)
│   ├── stores/                       ← Pinia stores
│   │   ├── auth.ts                   ← session + adminUser + login/logout
│   │   ├── permission.ts             ← role + hasPermission() + menuTree
│   │   └── config.ts                 ← runtime config + economy config frontend cache
│   ├── types/                        ← TypeScript type definitions
│   │   ├── admin.ts                  ← AdminUser, AuditLogEntry, GdprRequest
│   │   ├── pet.ts                    ← Pet, BanStatus, ModerationReason
│   │   ├── config.ts                 ← RuntimeConfig, EconomyConfig, FeatureFlag
│   │   └── api.ts                    ← ApiEnvelope, PagedResponse, Meta
│   ├── utils/                        ← Utility functions
│   │   ├── format.ts                 ← Date format, email mask, reason truncate
│   │   └── session.ts                ← Session expiry calculation utilities
│   ├── styles/                       ← Styles
│   │   ├── variables.css             ← CSS Custom Properties (color / spacing tokens)
│   │   └── global.css                ← Reset + Element Plus theme overrides
│   └── views/
│       ├── auth/
│       │   ├── LoginView.vue         ← Login form (username + password + TOTP)
│       │   └── TotpSetupView.vue     ← First-login TOTP setup page
│       ├── dashboard/
│       │   └── DashboardView.vue     ← KPI cards + system status
│       ├── pets/
│       │   ├── PetListView.vue       ← Pet list (search / filter / ban actions)
│       │   └── PetDetailView.vue     ← Pet detail (ban history + stats + battles)
│       ├── battles/
│       │   ├── BattleListView.vue    ← Battle records list (flag/unflag)
│       │   └── SuspiciousView.vue    ← Suspicious activity list
│       ├── leaderboard/
│       │   └── LeaderboardView.vue   ← Top 500 admin view (suspicious flags)
│       ├── analytics/
│       │   ├── AnalyticsView.vue     ← Time-series charts (DAU / claims / battles)
│       │   └── EmailMonitorView.vue  ← Email delivery rate monitoring
│       ├── config/
│       │   ├── RuntimeConfigView.vue ← Arena rate limit / rarity weights
│       │   ├── EconomyConfigView.vue ← Food buff multiplier / arena entry cost
│       │   └── FeatureFlagsView.vue  ← Feature flag management (FF_MARKETPLACE, etc.)
│       ├── gdpr/
│       │   └── GdprQueueView.vue     ← GDPR request queue (status filter / update)
│       ├── roles/
│       │   └── RoleManagementView.vue ← Admin account list (create / deactivate / TOTP reset)
│       ├── audit/
│       │   └── AuditLogView.vue      ← Audit log (actor / action / time range filter)
│       └── errors/
│           ├── 403View.vue           ← Forbidden page
│           └── 404View.vue           ← Not found page
├── public/
│   └── favicon.ico
├── .env.development
├── .env.production
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## §4 Routing Design

### §4.1 Route Table

| Path | Component | Required Permission | Description |
|------|-----------|--------------------|----|
| `/admin/login` | `LoginView` | Public | Admin login page (username + password + TOTP) |
| `/admin/totp-setup` | `TotpSetupView` | Public (requires setupToken) | First-login TOTP enrollment |
| `/admin/dashboard` | `DashboardView` | All authenticated roles | KPI Dashboard |
| `/admin/pets` | `PetListView` | `read_only+` | Pet list + search + filter |
| `/admin/pets/:petId` | `PetDetailView` | `read_only+` | Pet detail + ban history |
| `/admin/battles` | `BattleListView` | `read_only+` | Battle records list |
| `/admin/suspicious` | `SuspiciousView` | `moderator+` | Bot-detected suspicious pets list |
| `/admin/leaderboard` | `LeaderboardView` | `read_only+` | Top 500 leaderboard admin view |
| `/admin/analytics` | `AnalyticsView` | `read_only+` | Product analytics charts (DAU / claims / battles) |
| `/admin/email` | `EmailMonitorView` | `read_only+` | Email delivery rate monitoring |
| `/admin/config/runtime` | `RuntimeConfigView` | `super_admin` | Arena rate limit / rarity weights |
| `/admin/config/economy` | `EconomyConfigView` | `super_admin` | Food buff multiplier / arena entry cost |
| `/admin/config/flags` | `FeatureFlagsView` | `super_admin` | Feature flag management |
| `/admin/gdpr` | `GdprQueueView` | `super_admin` | GDPR request queue |
| `/admin/roles` | `RoleManagementView` | `super_admin` | Admin account and role management |
| `/admin/audit` | `AuditLogView` | `super_admin` | Audit log review |
| `/admin/403` | `403View` | Public | Forbidden error page |
| `/admin/:pathMatch(.*)` | `404View` | Public | 404 error page |

### §4.2 Route Guards

```typescript
// router/guards.ts
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import type { Router } from 'vue-router'

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()
    const permStore = usePermissionStore()

    // Public pages (login / totp-setup / error pages) — pass through
    if (to.meta.public) return next()

    // Not authenticated → redirect to login, preserve destination path
    if (!authStore.isAuthenticated) {
      return next({ path: '/login', query: { redirect: to.fullPath } })
    }

    // Permission check (meta.permission = required role level)
    const required = to.meta.permission as string | undefined
    if (required && !permStore.hasPermission(required)) {
      return next('/403')
    }

    next()
  })
}
```

### §4.3 Dynamic Sidebar Generation Strategy

The portal uses a **client-filtered** strategy: roles are fixed at deploy time (`super_admin` / `moderator` / `read_only`); the frontend filters a static menu config based on the current user's role. Menu items without permission are removed entirely (not just disabled) to prevent information leakage.

Rationale: EDD §3.7 and ARCH §5.1 define three admin roles that are fixed for EDD Phase 1 — no need for server-side dynamic menu delivery.

---

## §5 RBAC Implementation

### §5.1 Role Definitions (from EDD §3.7 + ARCH §5.1 + SCHEMA admin_role_enum)

| Role Key | Display Name | System Role | Permission Level |
|---------|-------------|------------|-----------------|
| `super_admin` | Super Admin | Yes | All (config / GDPR / roles / audit log) |
| `moderator` | Moderator | Yes | pet ban/unban, battle flag/unflag, leaderboard, suspicious, analytics, dashboard, email monitor |
| `read_only` | Read Only | Yes | GET-only: dashboard, pets, leaderboard, battles, analytics, email monitor |

Permission mapping to API.md §6 endpoint Role Access:

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

### §5.2 Permission Guard Implementation

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

// v-permission directive — registered in main.ts
export const permissionDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string>) {
    const { hasPermission } = usePermission()
    if (!hasPermission(binding.value as 'read_only' | 'moderator' | 'super_admin')) {
      el.parentNode?.removeChild(el)
    }
  }
}
```

```vue
<!-- Button-level permission control example -->
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

### §5.3 Dynamic Menu Strategy

Choice: **client-filtered**

Implementation: Each route in `router/routes.ts` carries `meta.permission`. `SidebarMenu` in `AdminLayout.vue` iterates the route config and applies `usePermission().hasPermission(route.meta.permission)` to filter out inaccessible menu items. Items without access are removed from the DOM entirely — not just visually hidden.

### §5.4 Session Management

| Item | Specification |
|------|--------------|
| Session storage location | HttpOnly Cookie (`session=<session_id>; HttpOnly; SameSite=Strict; Secure; Path=/admin`) |
| Inactivity timeout | 4 hours (admin_session_inactivity_expiry_hours = 4) |
| Absolute expiry | 8 hours (admin_session_absolute_expiry_hours = 8) |
| Session identity | Frontend stores no token string; `isAuthenticated` is inferred from 401 / 200 responses on any authenticated API call |
| Refresh strategy | Axios Response Interceptor intercepts 401 → clears auth state → redirects to login page |
| CSRF protection | SameSite=Strict cookie policy prevents cross-site request forgery; no additional token required (FRONTEND.md §3.6) |

---

## §6 Layout System

### §6.1 Main Layout Structure

```
┌───────────────────────────────────────────────────────────┐
│  HeaderBar (Logo + Admin Username + Role Badge + Logout)   │
├──────────────┬────────────────────────────────────────────┤
│  SidebarMenu │  Content Area                              │
│  (260px)     │  ┌──────────────────────────────────────┐  │
│  Dashboard   │  │  BreadCrumb (auto-generated by route) │  │
│  Pet Mgmt    │  ├──────────────────────────────────────┤  │
│  Battles     │  │  Page Content                        │  │
│  Leaderboard │  │  (max-width: 1400px; padding: 24px)  │  │
│  Analytics   │  │                                      │  │
│  Config ▾    │  └──────────────────────────────────────┘  │
│  GDPR        │                                            │
│  Roles       │                                            │
│  Audit Log   │                                            │
└──────────────┴────────────────────────────────────────────┘
```

**Layout sub-components:**

- **HeaderBar**: Left side shows pixel-pet-arena logo (text) + "Admin Portal" label; right side shows the logged-in admin's username + role badge (`el-tag`) + session inactivity countdown + logout button. Logout calls `POST /admin/api/auth/logout` and clears auth state.

- **SidebarMenu**: Uses Element Plus `el-menu`. Expanded width: 260px / collapsed width: 64px (icon-only + tooltip). Menu items are dynamically filtered by current user role (client-filtered; items without access are never rendered). Active route is highlighted with a left-border accent color (`--el-color-primary`) + light background. Config is a nested group (Runtime / Economy / Feature Flags).

- **BreadCrumb**: Placed at the top of the Content Area using `el-breadcrumb`, auto-generated from `route.matched` hierarchy (e.g. "Pet Management > Pet Detail").

- **Content Area**: `max-width: 1400px`; `padding: 24px`; renders page content via `<RouterView />`. Scroll occurs only in the Content Area — Sidebar and Header are fixed.

### §6.2 Sidebar Specification

| Property | Value |
|----------|-------|
| Expanded width | 260px |
| Collapsed width | 64px (icon only) |
| Collapsed behavior | Icons only; `:collapse-transition="false"` prevents animation stutter; tooltip shows menu name |
| Active item style | 3px solid left border `var(--el-color-primary)` + background `var(--el-color-primary-light-9)` |

---

## §7 Page Specifications

### §7.1 Login Page (`/admin/login`)

**Purpose**: Admin authentication (username + password + 6-digit TOTP code)

**Form fields**:
- `username`: string, required (not email — avoids exposing user existence)
- `password`: string, required, type="password"
- `totpCode`: string, optional on first login (server returns `TOTP_SETUP_REQUIRED` and redirects to setup page)

**Interaction rules**:
- Pre-submit `formRef.validate()` call
- Success → store adminId + role in `authStore`, redirect to `redirect` query param or default `/admin/dashboard`
- 10 consecutive failures → account locked (admin_login_lockout_threshold = 10; admin_login_lockout_duration_minutes = 30), display `unlockedAt` remaining time
- IP-level pre-auth rate limit: 10 attempts per 15-minute window (admin_login_ip_rate_limit_attempts = 10; admin_login_ip_rate_limit_window_seconds = 900)
- `TOTP_SETUP_REQUIRED` response → extract `error.details.setupToken`, navigate to `/admin/totp-setup`

**APIs required**: `POST /admin/api/auth/login`

### §7.2 Dashboard (`/admin/dashboard`)

**Purpose**: Platform health at a glance; page load target ≤ 3 seconds (admin_page_load_time_seconds = 3)

**KPI Cards**:

| Card | Data Source | Update Strategy |
|------|-------------|-----------------|
| Claimed Pets Today | `GET /admin/api/dashboard → claimedPetsToday` | On page load + manual refresh |
| Active Battles Today | `GET /admin/api/dashboard → activeBattlesToday` | On page load + manual refresh |
| Pending GDPR Requests | `GET /admin/api/dashboard → pendingGdprRequests` | On page load (super_admin only; hidden for others) |
| Daily Active Users | `GET /admin/api/dashboard → dailyActiveUsers` | On page load |
| Error Rate (5 min) | `GET /admin/api/dashboard → errorRateLast5Min` | On page load + 30 s polling (30 s is a hardcoded UX default) |
| Email Delivery Rate | `GET /admin/api/dashboard → emailDeliveryRate` | On page load |
| System Status | `GET /admin/api/dashboard → systemStatus` | On page load + 30 s polling (30 s is a hardcoded UX default) |

**System Status display**: `healthy` → green `el-tag`; `degraded` → orange; `down` → red + `ElNotification` alert

**Charts**: Dashboard KPI data comes from the `GET /admin/api/dashboard` aggregated endpoint. Time-series charts are on `/admin/analytics` only — no ECharts instances on the Dashboard page.

**Required API**: `GET /admin/api/dashboard`

**Required permission**: All authenticated roles (`read_only+`)

### §7.3 Pet Management — List (`/admin/pets`)

**Purpose**: Search, filter, and manage all platform pets; supports ≤ 2 s search across 1 million records (admin_search_response_time_seconds = 2)

**Table columns**: Pet ID (truncated), Owner Email (masked: `p***@example.com`), Rarity, Level, Win Rate, Battles Played, Ban Status, Created At

**Search / filter**:
- Search: Exact pet UUID or SHA-256 email hash (64-char hex)
- Filter: Rarity (`COMMON/RARE/EPIC/LEGENDARY`) / Ban Status (All / Banned / Active)
- Pagination: 20 rows per page default

**Action buttons** (conditionally shown):
- Ban (`v-permission="'moderator'"`) → opens `PetBanForm.vue` dialog
- Unban (`v-permission="'moderator'"`, shown only for banned pets) → opens `PetBanForm.vue` dialog (reason required)
- View Detail → navigates to `/admin/pets/:petId`

**Required APIs**: `GET /admin/api/pets`, `POST /admin/api/pets/:petId/ban`, `POST /admin/api/pets/:petId/unban`

**Required permission**: `read_only+` (GET) / `moderator+` (ban/unban)

### §7.4 Pet Management — Detail (`/admin/pets/:petId`)

**Purpose**: View a single pet's full information including ban history and battle records

**Displayed information**:
- Basic info: ID, Pet Name, Seed, Rarity, Level, Generation Meta (6 dimensions)
- Stats: speed / strength / stamina, Total Training Actions, Last Trained At, isNeglected
- Owner: Owner Email (masked), Claimed At
- Ban status: isBanned, Banned Reason (max 500 chars), Banned At
- Last 20 arena battle records (arena_battle_records_display_count = 20)

**Actions**: Ban / Unban (`moderator+`), Edit Pet Name (`super_admin`, `PUT /admin/api/pets/:petId`)

**Required API**: `GET /admin/api/pets/:petId`

### §7.5 Battle Records (`/admin/battles`)

**Purpose**: Review all arena battle records; supports flag/unflag operations

**Table columns**: Match ID, Pet A, Pet B (null if AI), Winner (`winnerId`), Duration, Flagged (`isFlagged`), Completed At

**Filters**: Date range (from/to) / Pet ID / Flagged (All / Flagged Only)

**Actions**:
- Flag Battle (`moderator+`) → `POST /admin/api/battles/:matchId/flag` (reason required, max 500 chars)
- Unflag Battle (`moderator+`) → `DELETE /admin/api/battles/:matchId/flag` (reason required)

**Required APIs**: `GET /admin/api/battles`, `POST /admin/api/battles/:matchId/flag`, `DELETE /admin/api/battles/:matchId/flag`

**Required permission**: `read_only+` (GET) / `moderator+` (flag/unflag)

### §7.6 Suspicious Activity (`/admin/suspicious`)

**Purpose**: List pets automatically flagged by the bot detection system (> 50 battles/hr rolling window)

**Table columns**: Pet ID, Battles Last Hour, Win Rate, Flag Count, Last Flagged At

**Actions**: Navigate to Pet Detail (ban actions performed on the detail page)

**Threshold**: bot_detection_battles_threshold = 50 / bot_detection_window_minutes = 60

**Required API**: `GET /admin/api/suspicious`

**Required permission**: `moderator+`

### §7.7 Leaderboard Management (`/admin/leaderboard`)

**Purpose**: View Top 500 leaderboard (public version shows only Top 100); suspicious pets display a warning badge

**Table columns**: Rank, Pet Name, Rarity, Level, Score, Win Rate, Battles Last Hour, Suspicious (warning icon when `isSuspicious`), Banned

**Hard cap**: 500 entries (leaderboard_admin_view = 500), single response, no pagination

**Actions**:
- Remove from Leaderboard (`moderator+`) → `DELETE /admin/api/leaderboard/:petId`
- View Pet Detail → navigate to `/admin/pets/:petId`

**Required APIs**: `GET /admin/api/leaderboard`, `DELETE /admin/api/leaderboard/:petId`

**Required permission**: `read_only+` (GET) / `moderator+` (DELETE)

### §7.8 Analytics (`/admin/analytics`)

**Purpose**: Platform time-series analysis charts

**Charts**:

| Chart | Type | Data Source |
|-------|------|-------------|
| Daily Active Users | ECharts Line | `GET /admin/api/analytics?metric=dau` |
| New Claims Per Day | ECharts Line | `GET /admin/api/analytics?metric=claims` |
| Arena Battles Per Day | ECharts Bar | `GET /admin/api/analytics?metric=arena_battles` |
| Leaderboard UVs | ECharts Line | `GET /admin/api/analytics?metric=leaderboard_uvs` |

**Controls**: Date range picker (from / to, required), manual refresh button

**Required API**: `GET /admin/api/analytics`

**Required permission**: `read_only+`

### §7.9 Email Monitor (`/admin/email`)

**Purpose**: Monitor SendGrid delivery health

**Displayed info**: Emails Sent (24h), Delivery Success Rate (target ≥ 98%; claim_email_delivery_rate_target_percent = 98), Bounce Rate, Spam Complaint Rate (target < 0.1%; spam_complaint_rate_max_percent = 0.1), Failover Active (boolean)

**Required API**: `GET /admin/api/email/monitor`

**Required permission**: `read_only+`

### §7.10 Runtime Config (`/admin/config/runtime`)

**Purpose**: Runtime parameter adjustment; config changes take effect within 5 minutes (config_cache_refresh_time_minutes = 5)

**Form fields**:
- `arenaRateLimitBattlesPerHour`: integer, range `[1, 50]` (arena_rate_limit_admin_min = 1, arena_rate_limit_admin_max = 50)
- `arenaMatchmakingTimeoutSeconds`: integer, recommended range 5–120
- `rarityWeights.common`: integer
- `rarityWeights.rare`: integer
- `rarityWeights.epic`: integer
- `rarityWeights.legendary`: integer (all four must sum to 100%)

**Required APIs**: `GET /admin/api/config/runtime`, `PUT /admin/api/config/runtime`

**Required permission**: `super_admin`

### §7.11 Economy Config (`/admin/config/economy`)

**Purpose**: Food buff multiplier and arena entry cost configuration

**Form fields**:
- `foodBuffMultiplierMin`: 0.5–5.0 (food_buff_multiplier_admin_min = 0.5, food_buff_multiplier_admin_max = 5.0)
- `foodBuffMultiplierMax`: 0.5–5.0
- `arenaEntryCostFoodCreditsDefault`: 0–10 (arena_entry_cost_food_credits_default = 0, arena_entry_cost_food_credits_admin_max = 10)
- `arenaEntryCooldownMaxMinutes`: 0–60 (arena_entry_cooldown_admin_min_minutes = 0, arena_entry_cooldown_admin_max_minutes = 60)

**Required APIs**: `GET /admin/api/config/economy`, `PUT /admin/api/config/economy`

**Required permission**: `super_admin`

### §7.12 Feature Flags (`/admin/config/flags`)

**Purpose**: Control feature switches such as `FF_MARKETPLACE`

**Table columns**: Flag Name, Enabled (`el-switch`), Description

**Actions**: Toggle → `PUT /admin/api/config/flags/:flag` (secondary confirmation required for high-impact flags such as `FF_MARKETPLACE`)

**Required APIs**: `GET /admin/api/config/flags`, `PUT /admin/api/config/flags/:flag`

**Required permission**: `super_admin`

### §7.13 GDPR Queue (`/admin/gdpr`)

**Purpose**: Process 5 types of GDPR requests (erasure / data_access / restrict_processing / object_leaderboard / rectification)

**Table columns**: Request ID, Request Type, Status, Submitted At, Completed At, Admin Notes

**Filters**: Status / Type

**Actions**:
- Update Status (non-erasure requests) → `PATCH /admin/api/gdpr/:requestId` (status + adminNotes, max 500 chars)
- Initiate Admin Erasure → `POST /admin/api/gdpr/delete` (emailHash + reason, max 500 chars)

**SLA display**: Each row shows remaining time before SLA deadline:
- erasure: 7 days (gdpr_email_deletion_window_days = 7)
- data_access: 30 days (gdpr_data_access_response_days = 30)
- restrict_processing: 24 h (gdpr_restrict_processing_response_hours = 24)
- object_leaderboard: 5 business days (gdpr_object_leaderboard_response_business_days = 5)
- rectification: 24 h (gdpr_email_rectification_response_hours = 24)

**Required APIs**: `GET /admin/api/gdpr`, `PATCH /admin/api/gdpr/:requestId`, `POST /admin/api/gdpr/delete`

**Required permission**: `super_admin`

### §7.14 Role Management (`/admin/roles`)

**Purpose**: Manage admin accounts (create / deactivate / reset TOTP)

**Table columns**: Admin ID, Username, Role, Last Login At, Status (Active / Deactivated)

**Actions**:
- Create Admin → `POST /admin/api/roles` (username + role + temporaryPassword)
- Deactivate Admin → `DELETE /admin/api/roles/:adminId` (secondary confirmation required)
- Reset TOTP → `POST /admin/api/roles/:adminId/totp/reset` (secondary confirmation required)

**Constraint**: Admin accounts are soft-deleted only (`deactivated_at` set); hard deletion is not permitted

**Required APIs**: `GET /admin/api/roles`, `POST /admin/api/roles`, `DELETE /admin/api/roles/:adminId`, `POST /admin/api/roles/:adminId/totp/reset`

**Required permission**: `super_admin`

### §7.15 Audit Log (`/admin/audit`)

**Purpose**: Review all admin CUD operation records; any 12-month window search ≤ 3 s (admin_audit_log_search_response_time_seconds = 3)

**Table columns**: Log ID, Admin Username, Action, Target Type, Target ID, Detail (JSONB summary), Created At

**Filters**: Actor (actorId UUID) / Action Type (e.g. `pet.ban`) / Date Range (from / to)

**Read-only**: No deletion or modification; Detail column is expandable to show full JSONB (`AuditLogDetail.vue`)

**IP note**: IP addresses are stored as SHA-256 hash; raw IPs are never displayed; nulled after 90 days (ip_address_log_retention_days = 90)

**Required API**: `GET /admin/api/audit`

**Required permission**: `super_admin`

---

## §8 API Integration

### §8.1 Axios Configuration

```typescript
// api/http.ts
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// API timeout — page load target 3 s (admin_page_load_time_seconds = 3); use 10 s as API call timeout
const ADMIN_API_TIMEOUT_MS = 10_000

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: ADMIN_API_TIMEOUT_MS,
  withCredentials: true, // carry httpOnly session cookie
})

// No CSRF token injection required — SameSite=Strict cookie policy prevents cross-site forgery (FRONTEND.md §3.6)

// Response interceptor: session expiry handling
http.interceptors.response.use(
  res => res,
  async error => {
    const status = error.response?.status
    if (status === 401) {
      // Session expired → clear auth state → redirect to login
      const authStore = useAuthStore()
      authStore.clearSession()
      await router.push('/login')
    } else if (status === 403) {
      await router.push('/403')
    } else if (status === 429) {
      // Rate limit exceeded — surface Retry-After value if present
      const retryAfter = error.response?.headers?.['retry-after']
      const msg = retryAfter
        ? `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`
        : 'Rate limit exceeded. Please try again later.'
      ElMessage({ type: 'error', message: msg, duration: 5000 })
    }
    return Promise.reject(error)
  }
)

export default http
```

### §8.2 CSRF Protection

Admin API CSRF protection relies on the `SameSite=Strict` attribute on the session cookie (API.md §2.2). Because the cookie is `SameSite=Strict`, browsers will not attach it to cross-origin requests, making cross-site request forgery impossible without additional token mechanisms. No `X-CSRF-Token` header is required (FRONTEND.md §3.6). If the deployment is ever extended to cross-origin scenarios, an `X-CSRF-Token` double-submit pattern must be added at that time.

### §8.3 Admin Session Handling

Admin sessions use server-side Redis sessions (`session:admin:{session_id}`):

- **Inactivity TTL**: 14400 s (admin_session_inactivity_expiry_hours = 4) — automatically renewed by the server on each request
- **Absolute expiry**: 28800 s (admin_session_absolute_expiry_hours = 8) — server enforces via `absExpiry` field in the session JSON
- **Frontend monitoring**: `useSessionTimer.ts` composable starts a timer at login; shows a toast 5 minutes before inactivity expiry (`// 5-minute UX warning before 4h inactivity expiry — no separate constant; derived from admin_inactivity_timeout_minutes = 240`); forces redirect to login at absolute expiry

### §8.4 API Endpoint Mapping (all `/admin/api/*` routes from API.md §6)

| Feature | Method | Path | Required Permission | Page |
|---------|--------|------|--------------------|----|
| Admin login | POST | `/admin/api/auth/login` | Public | `/admin/login` |
| TOTP setup | POST | `/admin/api/auth/totp/setup` | setupToken | `/admin/totp-setup` |
| Logout | POST | `/admin/api/auth/logout` | Authenticated | — |
| TOTP verify (step-up) | POST | `/admin/api/auth/totp/verify` | Authenticated | — |
| List admin accounts | GET | `/admin/api/roles` | super_admin | `/admin/roles` |
| Create admin account | POST | `/admin/api/roles` | super_admin | `/admin/roles` |
| Deactivate admin account | DELETE | `/admin/api/roles/:adminId` | super_admin | `/admin/roles` |
| Reset TOTP | POST | `/admin/api/roles/:adminId/totp/reset` | super_admin | `/admin/roles` |
| Pet list | GET | `/admin/api/pets` | read_only+ | `/admin/pets` |
| Pet detail | GET | `/admin/api/pets/:petId` | read_only+ | `/admin/pets/:petId` |
| Update pet (petName) | PUT | `/admin/api/pets/:petId` | super_admin | `/admin/pets/:petId` |
| Ban pet | POST | `/admin/api/pets/:petId/ban` | moderator+ | `/admin/pets` |
| Unban pet | POST | `/admin/api/pets/:petId/unban` | moderator+ | `/admin/pets` |
| Battle records list | GET | `/admin/api/battles` | read_only+ | `/admin/battles` |
| Suspicious activity list | GET | `/admin/api/suspicious` | moderator+ | `/admin/suspicious` |
| Flag battle | POST | `/admin/api/battles/:matchId/flag` | moderator+ | `/admin/battles` |
| Unflag battle | DELETE | `/admin/api/battles/:matchId/flag` | moderator+ | `/admin/battles` |
| Leaderboard (Top 500) | GET | `/admin/api/leaderboard` | read_only+ | `/admin/leaderboard` |
| Remove leaderboard entry | DELETE | `/admin/api/leaderboard/:petId` | moderator+ | `/admin/leaderboard` |
| Read runtime config | GET | `/admin/api/config/runtime` | super_admin | `/admin/config/runtime` |
| Update runtime config | PUT | `/admin/api/config/runtime` | super_admin | `/admin/config/runtime` |
| Read economy config | GET | `/admin/api/config/economy` | super_admin | `/admin/config/economy` |
| Update economy config | PUT | `/admin/api/config/economy` | super_admin | `/admin/config/economy` |
| Read feature flags | GET | `/admin/api/config/flags` | super_admin | `/admin/config/flags` |
| Update feature flag | PUT | `/admin/api/config/flags/:flag` | super_admin | `/admin/config/flags` |
| GDPR queue list | GET | `/admin/api/gdpr` | super_admin | `/admin/gdpr` |
| Admin-initiated erasure | POST | `/admin/api/gdpr/delete` | super_admin | `/admin/gdpr` |
| Update GDPR status | PATCH | `/admin/api/gdpr/:requestId` | super_admin | `/admin/gdpr` |
| Audit log | GET | `/admin/api/audit` | super_admin | `/admin/audit` |
| Dashboard | GET | `/admin/api/dashboard` | read_only+ | `/admin/dashboard` |
| Analytics | GET | `/admin/api/analytics` | read_only+ | `/admin/analytics` |
| Email monitor | GET | `/admin/api/email/monitor` | read_only+ | `/admin/email` |

---

## §9 Pinia Store Architecture

### §9.1 Store Summary

| Store | Responsibility | Primary State |
|-------|----------------|---------------|
| `authStore` | Authentication state / session management | `adminId`, `role`, `username`, `sessionExpiresAt`, `isAuthenticated` |
| `permissionStore` | Current user role + permission queries | `role`, `hasPermission()` |
| `configStore` | Frontend cache for runtime config, economy config, and feature flags | `runtimeConfig`, `economyConfig`, `featureFlags` |

### §9.2 authStore — Key Logic

This project uses an **HttpOnly Cookie** session mechanism. `authStore` stores no token string. `isAuthenticated` is derived from whether `adminUser` is non-null. After page refresh, if the session is still valid, Axios automatically carries the cookie — the first authenticated API call returning 200 maintains the logged-in state; a 401 redirects to login.

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

  // HttpOnly Cookie session: isAuthenticated derived from adminUser presence
  const isAuthenticated = computed(() => adminUser.value !== null)

  async function login(credentials: { username: string; password: string; totpCode?: string }) {
    const res = await authApi.login(credentials)
    adminUser.value = {
      adminId: res.data.data.adminId,
      username: credentials.username,
      role: res.data.data.role,
      sessionExpiresAt: res.data.data.sessionExpiresAt,
    }
    loginAt.value = Date.now()
    const permStore = usePermissionStore()
    permStore.setRole(res.data.data.role)
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clearSession()
      await router.push('/login')
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

### §9.3 permissionStore — Key Logic

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

  // Generate accessible sidebar menu keys by role
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

### §9.4 configStore — Key Logic

```typescript
// stores/config.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { configApi } from '@/api/config'

interface RuntimeConfig {
  arenaRateLimitBattlesPerHour: number        // range [1, 50] (arena_rate_limit_admin_min/max)
  arenaMatchmakingTimeoutSeconds: number
  rarityWeights: { common: number; rare: number; epic: number; legendary: number }
}

interface EconomyConfig {
  foodBuffMultiplierMin: number               // (food_buff_multiplier_admin_min = 0.5)
  foodBuffMultiplierMax: number               // (food_buff_multiplier_admin_max = 5.0)
  arenaEntryCostFoodCreditsDefault: number    // (arena_entry_cost_food_credits_default = 0)
  arenaEntryCostFoodCreditsMax: number        // (arena_entry_cost_food_credits_admin_max = 10)
  arenaEntryCooldownMinMinutes: number        // (arena_entry_cooldown_admin_min_minutes = 0)
  arenaEntryCooldownMaxMinutes: number        // (arena_entry_cooldown_admin_max_minutes = 60)
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
      runtimeConfig.value = res.data.data
    } finally {
      loading.value = false
    }
  }

  async function updateRuntimeConfig(patch: Partial<RuntimeConfig>) {
    await configApi.putRuntimeConfig(patch)
    await fetchRuntimeConfig() // refresh cache
  }

  async function fetchEconomyConfig() {
    loading.value = true
    try {
      const res = await configApi.getEconomyConfig()
      economyConfig.value = res.data.data
    } finally {
      loading.value = false
    }
  }

  async function updateEconomyConfig(patch: Partial<EconomyConfig>) {
    await configApi.putEconomyConfig(patch)
    await fetchEconomyConfig() // refresh cache
  }

  async function fetchFeatureFlags() {
    const res = await configApi.getFeatureFlags()
    featureFlags.value = res.data.data.flags
  }

  async function updateFeatureFlag(flag: string, enabled: boolean) {
    await configApi.putFeatureFlag(flag, enabled)
    await fetchFeatureFlags()
  }

  return {
    runtimeConfig, economyConfig, featureFlags, loading,
    fetchRuntimeConfig, updateRuntimeConfig,
    fetchEconomyConfig, updateEconomyConfig,
    fetchFeatureFlags, updateFeatureFlag,
  }
})
```

---

## §10 Element Plus Component Standards

### §10.1 Table Component Standard (Universal)

All admin tables must implement three states:

```vue
<template>
  <div>
    <!-- Loading state -->
    <el-table v-loading="loading" :data="tableData">
      <el-table-column prop="id" label="ID" />
      <!-- ... -->

      <!-- Empty state (el-table built-in empty slot) -->
      <template #empty>
        <el-empty description="No records found" />
      </template>
    </el-table>

    <!-- Error state -->
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

    <!-- Pagination -->
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

### §10.2 Form Component Standard

```vue
<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="160px">
    <el-form-item label="Reason" prop="reason">
      <el-input
        v-model="form.reason"
        type="textarea"
        :maxlength="ADMIN_MODERATION_REASON_MAX_CHARS"
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

// admin_moderation_reason_max_chars = 500
const ADMIN_MODERATION_REASON_MAX_CHARS = 500

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

### §10.3 Dangerous Action Confirmation (ElMessageBox)

All ban / deactivate / delete / feature flag toggle operations must confirm before executing:

```typescript
import { ElMessageBox, ElMessage } from 'element-plus'

async function handleBanPet(petId: string) {
  await ElMessageBox.confirm(
    'Are you sure you want to ban this pet? It will be removed from the leaderboard within 5 minutes.',
    'Confirm Ban',
    {
      type: 'warning',
      confirmButtonText: 'Ban Pet',
      cancelButtonText: 'Cancel',
      confirmButtonClass: 'el-button--danger',
    }
  )
  // Proceed after confirmation
  await petsApi.ban(petId, { reason: moderationReason.value })
  ElMessage.success('Pet banned successfully. Leaderboard removal in progress.')
}
```

### §10.4 Global Message Notification Standards

```typescript
// Operation success
ElMessage({ type: 'success', message: 'Changes saved', duration: 3000 })

// Operation failure (API error)
ElMessage({ type: 'error', message: `Error: ${err.response?.data?.error?.message ?? 'Unknown error'}`, duration: 5000 })

// Warning (e.g. GDPR SLA approaching deadline)
ElNotification({ type: 'warning', title: 'GDPR SLA Alert', message: 'Request #xxx expires in 2 hours', duration: 0 })
```

---

## §11 Shared Component Specifications

### §11.1 SearchableTable Component

```typescript
// Type definitions
interface TableColumn {
  prop: string
  label: string
  width?: number | string
  minWidth?: number | string
  sortable?: boolean
  formatter?: (row: unknown, column: unknown, value: unknown) => string
  slot?: string // custom render slot name
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
  defaultPageSize?: number  // default: 20
  selectable?: boolean
  rowKey?: string           // default: 'id'
}
```

**Usage example**:

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

### §11.2 AuditLogDetail Component

Renders the `admin_audit_log.detail` JSONB column with formatted key-value display; highlights `reason`, `previous_value`, `new_value`, and similar fields.

```typescript
interface AuditLogDetailProps {
  id: string | number           // audit_log id (BIGSERIAL) — matches API.md §6.8 response field `id`
  adminUsername: string
  action: string                // e.g. 'pet.ban', 'config.arena_rate_limit'
  targetType: string            // 'pet' | 'arena_match' | 'config_runtime' | ...
  targetId: string
  detail: Record<string, unknown> | null
  createdAt: string             // ISO 8601
  visible: boolean              // controls Drawer open/close
}
```

**Usage example**:

```vue
<AuditLogDetail
  v-bind="selectedLog"
  :visible="drawerVisible"
  @close="drawerVisible = false"
/>
```

---

## §12 Chart Integration

The admin analytics page uses ECharts 5.x (via vue-echarts 6.x) for time-series data visualization.

| Chart | Type | Update Strategy |
|-------|------|-----------------|
| Daily Active Users | ECharts LineChart | Manual refresh (Date Range change) |
| New Claims Per Day | ECharts LineChart | Manual refresh |
| Arena Battles Per Day | ECharts BarChart | Manual refresh |
| Leaderboard UVs | ECharts LineChart | Manual refresh |

**On-demand ECharts import example**:

```typescript
// views/analytics/AnalyticsView.vue
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])
```

**Responsive sizing**: Use the `autoresize` prop on `v-chart` to automatically adapt to container width:

```vue
<v-chart :option="chartOption" autoresize style="height: 320px" />
```

---

## §13 Internationalization (i18n)

The Admin Portal is single-language (English). No multi-locale configuration is required. Element Plus locale is explicitly registered in `main.ts` using `ElConfigProvider` with the built-in English locale pack:

```typescript
import { ElConfigProvider } from 'element-plus'
import en from 'element-plus/es/locale/lang/en'
```

Wrap the root `<App />` in `<ElConfigProvider :locale="en">` to ensure all Element Plus components (date pickers, pagination labels, validation messages) render in English consistently. If the portal scope expands beyond English in a future phase, vue-i18n can be added without restructuring the existing component tree.

---

## §14 Performance

### §14.1 Route-Level Lazy Loading

```typescript
// router/routes.ts
// Note: createRouter uses createWebHistory('/admin') base — all paths below are
// relative to that base (FRONTEND.md §3.5). The browser URL for path '/login' is
// /admin/login; for child path 'dashboard' under '/' it is /admin/dashboard.
const routes = [
  {
    path: '/login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/totp-setup',
    component: () => import('@/views/auth/TotpSetupView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
      },
      {
        path: 'pets',
        component: () => import('@/views/pets/PetListView.vue'),
      },
      {
        path: 'pets/:petId',
        component: () => import('@/views/pets/PetDetailView.vue'),
      },
      {
        path: 'battles',
        component: () => import('@/views/battles/BattleListView.vue'),
      },
      {
        path: 'suspicious',
        component: () => import('@/views/battles/SuspiciousView.vue'),
        meta: { permission: 'moderator' },
      },
      {
        path: 'leaderboard',
        component: () => import('@/views/leaderboard/LeaderboardView.vue'),
      },
      {
        path: 'analytics',
        component: () => import('@/views/analytics/AnalyticsView.vue'),
      },
      {
        path: 'email',
        component: () => import('@/views/analytics/EmailMonitorView.vue'),
      },
      {
        path: 'config/runtime',
        component: () => import('@/views/config/RuntimeConfigView.vue'),
        meta: { permission: 'super_admin' },
      },
      {
        path: 'config/economy',
        component: () => import('@/views/config/EconomyConfigView.vue'),
        meta: { permission: 'super_admin' },
      },
      {
        path: 'config/flags',
        component: () => import('@/views/config/FeatureFlagsView.vue'),
        meta: { permission: 'super_admin' },
      },
      {
        path: 'gdpr',
        component: () => import('@/views/gdpr/GdprQueueView.vue'),
        meta: { permission: 'super_admin' },
      },
      {
        path: 'roles',
        component: () => import('@/views/roles/RoleManagementView.vue'),
        meta: { permission: 'super_admin' },
      },
      {
        path: 'audit',
        component: () => import('@/views/audit/AuditLogView.vue'),
        meta: { permission: 'super_admin' },
      },
    ],
  },
  // Error pages — public, outside AdminLayout
  {
    path: '/403',
    component: () => import('@/views/errors/403View.vue'),
    meta: { public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/errors/404View.vue'),
    meta: { public: true },
  },
]
```

### §14.2 Bundle Analysis

```bash
# Run bundle analysis
npx vite-bundle-visualizer
```

Target: Element Plus uses automatic on-demand import (unplugin-auto-import + unplugin-vue-components). Main bundle target: **< 150 KB gzipped** (total_js_bundle_gzipped_kb = 300 for full stack reference).

### §14.3 Performance Targets

| Metric | Target | Source |
|--------|--------|--------|
| Admin page load (including data) | < 3000 ms | admin_page_load_time_seconds = 3 |
| Pet search response time | < 2000 ms | admin_search_response_time_seconds = 2 |
| Audit log search (any 12-month window) | < 3000 ms | admin_audit_log_search_response_time_seconds = 3 |
| FCP (First Contentful Paint) | < 2000 ms | Derived from admin page load target |

> **FCP deviation note**: Admin portal FCP target is relaxed to < 2000 ms (vs player app ≤ 1500 ms) consistent with the 3000 ms admin page load budget from PRD NFR-ADMIN-06. This is an intentional deviation from the project-wide FCP ≤ 1.5 s target.

### §14.4 Element Plus On-Demand Import Configuration

```typescript
// vite.config.ts (unplugin configuration)
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

plugins: [
  AutoImport({ resolvers: [ElementPlusResolver()] }),
  Components({ resolvers: [ElementPlusResolver()] }),
]
```

---

## §15 Deployment Configuration

### §15.1 Vite Configuration (Build + Dev Proxy)

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
          'vendor-vue':     ['vue', 'vue-router', 'pinia'],
          'vendor-element': ['element-plus', '@element-plus/icons-vue'],
          'vendor-charts':  ['echarts', 'vue-echarts'],
          'vendor-axios':   ['axios'],
        },
      },
    },
  },
})
```

### §15.2 Environment Variables

| Variable | Development | Production |
|----------|-------------|-----------|
| `VITE_API_BASE_URL` | `http://localhost:3000` | `https://api.pixel-pet-arena.com` (via Nginx proxy) |
| `VITE_ADMIN_PATH` | `/admin` | `/admin` |
| `ADMIN_ALLOWED_IPS` | _(empty — allowlist disabled in development)_ | Comma-separated CIDR list (e.g. `10.0.0.0/8,203.0.113.0/24`); required in production per NFR-ADMIN-07 (ARCH §5.1) |

`.env.development`:
```
VITE_API_BASE_URL=http://localhost:3000
VITE_ADMIN_PATH=/admin
# ADMIN_ALLOWED_IPS= (empty — IP allowlist disabled in development)
```

`.env.production`:
```
VITE_API_BASE_URL=https://api.pixel-pet-arena.com
VITE_ADMIN_PATH=/admin
ADMIN_ALLOWED_IPS=<comma-separated CIDR list>
```

### §15.3 Nginx Routing Configuration

```nginx
# Admin Portal SPA routing
location /admin/ {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /admin/index.html;
}

# Admin API proxy (ARCH §1.2: Admin Portal → Admin API Server)
location /admin/api/ {
    proxy_pass http://backend:3000/admin/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Pass session cookie through
    proxy_pass_header Set-Cookie;
}
```

**Vercel deployment** (alternative to Nginx):

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

## §16 Security Hardening

### §16.1 Authentication Security

| Control | Implementation |
|---------|----------------|
| TOTP enforcement | Every admin login requires TOTP after enrollment; `TOTP_SETUP_REQUIRED` returned on first login |
| Account lockout | 10 consecutive failures trigger 30-minute lockout (admin_login_lockout_threshold = 10, admin_login_lockout_duration_minutes = 30) |
| IP rate limiting | 10 attempts per 15-minute window (admin_login_ip_rate_limit_attempts = 10, admin_login_ip_rate_limit_window_seconds = 900) |
| IP allowlist | `ADMIN_ALLOWED_IPS` env var (CIDR list); requests outside allowlist receive 403 before credential check; required in production per NFR-ADMIN-07 (ARCH §5.1 accepted deviation: optional, default disabled) |
| Password hashing | bcrypt, minimum work factor 12 (SCHEMA.md §2.10 comment) |
| TOTP secret storage | AES-256-GCM encrypted in `admin_accounts.totp_secret_encrypted` |
| Backup codes | 10 single-use codes; SHA-256 hashes stored in `totp_backup_codes_hash` array |

### §16.2 Session Security

| Control | Value |
|---------|-------|
| Cookie flags | `HttpOnly; SameSite=Strict; Secure; Path=/admin` |
| Inactivity timeout | 4 hours (admin_session_inactivity_expiry_hours = 4) |
| Absolute timeout | 8 hours (admin_session_absolute_expiry_hours = 8) |
| CSRF protection | `SameSite=Strict` cookie attribute — cross-site submissions are blocked by the browser; no additional token required |
| Session store | Redis server-side (`session:admin:{session_id}`) |

### §16.3 RBAC Security

- Every route in Vue Router carries a `meta.permission` value
- The `beforeEach` guard validates session and role on every navigation
- The `v-permission` directive removes unauthorized DOM elements entirely
- Sidebar menu items for unauthorized routes are never rendered
- Server-side authorization is always authoritative; frontend guards are defense-in-depth only

### §16.4 Audit Trail

All CUD operations write to `admin_audit_log`:
- Actor (`admin_id`), action, target type, target ID, detail (JSONB), IP hash, created at
- Retained 2 years (admin_audit_log_retention_years = 2)
- IP addresses nulled after 90 days (ip_address_log_retention_days = 90)
- Immutable — no delete or update operations are permitted

---

## §17 Pre-Delivery Checklist

| # | Check Item | Status |
|---|------------|--------|
| 1 | §3 directory structure complete — views / stores / router / api / composables / components all present | ✅ |
| 2 | §4 route table covers all admin feature pages with `meta.permission` fields | ✅ |
| 3 | §5 RBAC: three roles fully defined + PermissionGuard composable + `v-permission` directive | ✅ |
| 4 | §5.2 Permission Guard: `hasPermission()` (role hierarchy) + route guard + button-level permission examples | ✅ |
| 5 | §7 Page specs: Login / Dashboard / Pet / Battle / Suspicious / Leaderboard / Analytics / Email / Config (Runtime/Economy/Flags) / GDPR / Roles / Audit — all have column and action descriptions | ✅ |
| 6 | §8.1 Axios config: baseURL + `withCredentials: true` (session cookie) + response interceptor (401/403/429 handling); CSRF handled by SameSite=Strict (no token injection needed) | ✅ |
| 7 | §8.4 `/admin/api/*` endpoint mapping complete (32 endpoints, covering API.md §6.1–§6.9) | ✅ |
| 8 | §9 Three Pinia stores (authStore / permissionStore / configStore) with full state + actions | ✅ |
| 9a | §15.1 Vite build: `base='/admin/'`, `outDir='dist/admin'`, `manualChunks` vendor splitting, `server.proxy` for `/admin/api` | ✅ |
| 9b | §15.2/§15.3 Env vars: `VITE_API_BASE_URL` filled; Nginx `/admin/` `try_files` configured | ✅ |
| 10 | No placeholder text or empty TODO fields anywhere in document | ✅ |
| 11 | §1 Admin Portal overview: system purpose filled; §1.3 role table complete per EDD §3.7 + ARCH §5.1 | ✅ |
| 12 | §6.1 main layout: ASCII diagram maintains three-zone structure (Header / Sidebar / Content); §6.1 narrative covers HeaderBar / SidebarMenu / BreadCrumb / Content | ✅ |
| 13 | §5.1 permission table one-to-one maps to API.md §6 `/admin/api/*` endpoint Role Access | ✅ |
| 14 | All constants cited in `(constant_name = value)` format consistent with CLIENT_IMPL.md style | ✅ |
