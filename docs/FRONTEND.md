# FRONTEND.md — pixel-pet-arena

**DOC-ID**: FRONTEND-PIXEL-PET-ARENA-20260503
**Status**: DRAFT
**Upstream**: EDD-PIXEL-PET-ARENA-20260503, PDD-PIXEL-PET-ARENA-20260503, VDD-PIXEL-PET-ARENA-20260503, PRD-PIXEL-PET-ARENA-20260503, API-PIXEL-PET-ARENA-20260503, CONSTANTS-PIXEL-PET-ARENA-20260503

---

## 1. Overview

### 1.1 Two-App Architecture

pixel-pet-arena ships two independently-deployed frontend applications that share the same backend API infrastructure but are built on separate stacks by design.

| App | Stack | Audience | Auth model | Deployment |
|-----|-------|----------|------------|------------|
| **Player App** | React 18 + Phaser.js + TypeScript | Casual players, competitive gamers, collectors | `pet_access_token` (32-byte URL-safe base64, stored in `localStorage`) | Vercel CDN — SPA, no SSR |
| **Admin Portal** | Vue 3 + Element Plus + TypeScript | Operators, moderators, super admins | httpOnly session cookie (server-side Redis session) | Vercel CDN — separate route/subdomain |

The stack separation is intentional: the pixel-art CSS design system used in the player app must not bleed into the data-dense admin interface. Element Plus provides production-grade data tables, forms, and pagination for admin CRUD workflows that would require significant custom code in React.

### 1.2 Tech Stack Summary

**Player App**

| Layer | Technology | Version |
|-------|-----------|---------|
| UI framework | React | 18.x |
| Game canvas | Phaser.js | 3.x (dynamically imported) |
| Language | TypeScript | 5.x |
| Build tool | Vite | 5.x |
| Server state | TanStack Query | 5.x |
| Client state | Zustand | 4.x |
| Form state | React Hook Form | 7.x |
| Schema validation | Zod | 3.x |
| Routing | React Router | 6.x |
| Testing — unit | Vitest | 1.x |
| Testing — E2E | Playwright | 1.x |

**Admin Portal**

| Layer | Technology | Version |
|-------|-----------|---------|
| UI framework | Vue 3 (Composition API) | 3.x |
| Component library | Element Plus | latest |
| Language | TypeScript | 5.x |
| Build tool | Vite | 5.x |
| State management | Pinia | 2.x |
| HTTP client | Axios | 1.x |
| Charts | ECharts (via vue-echarts) | latest |
| Routing | Vue Router | 4.x |

### 1.3 Build Tooling

Both apps use **Vite 5** for development and production builds. Key configuration:

- HMR in development with instant TypeScript feedback
- Code splitting per route (dynamic `import()`)
- Phaser.js loaded via `import()` — never included in the initial bundle
- Tree-shaking via ES module imports
- `pnpm` as the package manager across both workspaces

---

## 2. Player App Architecture

### 2.1 Directory Structure

```
apps/player/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx                    # Entry point; React root
│   ├── App.tsx                     # Router + Layout wrapper
│   ├── components/
│   │   ├── layout/
│   │   │   ├── NavBar.tsx
│   │   │   └── Layout.tsx
│   │   ├── landing/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── ClaimCTA.tsx
│   │   │   ├── RarityHint.tsx
│   │   │   └── SocialProofCounter.tsx
│   │   ├── claim/
│   │   │   ├── ClaimPage.tsx
│   │   │   ├── ClaimFlow.tsx
│   │   │   ├── ClaimEmailForm.tsx
│   │   │   ├── ClaimCodeForm.tsx
│   │   │   ├── ExpiryWarning.tsx
│   │   │   └── URLReveal.tsx
│   │   ├── pet/
│   │   │   ├── PetPage.tsx
│   │   │   ├── RarityBadge.tsx
│   │   │   ├── StatsPanel.tsx
│   │   │   ├── StatBar.tsx
│   │   │   ├── TrainingEntry.tsx
│   │   │   ├── FoodInventory.tsx
│   │   │   ├── FoodItem.tsx
│   │   │   ├── ArenaEntry.tsx
│   │   │   └── NeglectedState.tsx
│   │   ├── training/
│   │   │   ├── TrainingPage.tsx
│   │   │   ├── TrainingActions.tsx
│   │   │   ├── TrainingActionCard.tsx
│   │   │   ├── StatChangeIndicator.tsx
│   │   │   ├── DailyResetTimer.tsx
│   │   │   └── TrainingStreak.tsx
│   │   ├── arena/
│   │   │   ├── ArenaPage.tsx
│   │   │   ├── ArenaScene.tsx          # Phaser.js battle animation scene
│   │   │   ├── ModeSelector.tsx
│   │   │   ├── PreBattlePanel.tsx
│   │   │   ├── MatchmakingStatus.tsx
│   │   │   ├── AIOfferModal.tsx
│   │   │   ├── RateLimitBanner.tsx
│   │   │   ├── BattleResultPage.tsx
│   │   │   ├── BattleResultCard.tsx
│   │   │   ├── StatComparison.tsx
│   │   │   └── ShareBattleButton.tsx
│   │   ├── leaderboard/
│   │   │   ├── LeaderboardPage.tsx
│   │   │   ├── LeaderboardTable.tsx
│   │   │   ├── LeaderboardRow.tsx
│   │   │   ├── RarityFilter.tsx
│   │   │   └── OwnerRankBanner.tsx
│   │   ├── records/
│   │   │   ├── BattleRecordsPage.tsx
│   │   │   ├── PetSummaryCard.tsx
│   │   │   └── BattleHistoryTable.tsx
│   │   ├── gdpr/
│   │   │   ├── GdprPage.tsx
│   │   │   ├── GdprRequestForm.tsx
│   │   │   └── GdprStatusBanner.tsx
│   │   ├── marketplace/               # FF_MARKETPLACE only
│   │   │   └── MarketplacePage.tsx
│   │   └── canvas/
│   │       ├── PetCanvas.tsx          # React host for Phaser instance
│   │       └── PetCanvasEngine.ts     # Phaser.js lifecycle manager
│   ├── hooks/
│   │   ├── usePet.ts
│   │   ├── useLeaderboard.ts
│   │   ├── useArenaHistory.ts
│   │   ├── useTraining.ts
│   │   ├── useFeed.ts
│   │   ├── useClaim.ts
│   │   ├── useReducedMotion.ts
│   │   └── usePetToken.ts
│   ├── store/
│   │   └── useAppStore.ts             # Zustand store (slices: arena, claim, toast)
│   ├── lib/
│   │   ├── apiClient.ts               # Axios/fetch wrapper with token attachment
│   │   ├── tokenStorage.ts            # localStorage read/write for pet_access_token
│   │   ├── petGeneration.ts           # Seed → attribute vector (deterministic)
│   │   └── spriteLoader.ts            # Phaser preload helpers
│   ├── schemas/
│   │   ├── pet.ts                     # Zod schemas for pet API responses
│   │   ├── claim.ts
│   │   ├── arena.ts
│   │   └── leaderboard.ts
│   ├── styles/
│   │   ├── tokens.css                 # CSS custom properties (design tokens)
│   │   ├── typography.css
│   │   ├── rarity.css                 # Rarity tier animations and borders
│   │   └── global.css
│   └── constants.ts                   # Re-exports of constants.json values as typed TS consts
```

### 2.2 React Component Tree (Top Level)

```
App
├── Layout
│   ├── NavBar                          (hasPetToken prop drives "My Pet" visibility)
│   └── Router (React Router v6)
│       ├── LandingPage             /
│       │   ├── PetCanvas           (Phaser.js instance via PetCanvasEngine)
│       │   ├── RarityHint
│       │   ├── ClaimCTA
│       │   └── SocialProofCounter
│       ├── ClaimPage               /claim
│       │   └── ClaimFlow           (compound, max 3 steps — email_claim_flow_steps_max = 3)
│       │       ├── ClaimEmailForm
│       │       ├── ClaimCodeForm
│       │       └── URLReveal
│       ├── PetPage                 /pet/:petId
│       │   ├── PetCanvas
│       │   ├── RarityBadge
│       │   ├── StatsPanel → StatBar × 3
│       │   ├── TrainingEntry
│       │   ├── FoodInventory → FoodItem × N
│       │   ├── ArenaEntry
│       │   └── NeglectedState      (conditional — training_neglect_threshold_days = 3)
│       ├── TrainingPage            /pet/:petId/train
│       │   ├── TrainingActions → TrainingActionCard × 3
│       │   ├── StatChangeIndicator (visible 2s — training_stat_display_duration_seconds = 2)
│       │   ├── DailyResetTimer
│       │   └── TrainingStreak
│       ├── BattleRecordsPage       /pet/:petId/records
│       │   ├── PetSummaryCard
│       │   └── BattleHistoryTable  (last 20 — arena_battle_records_display_count = 20)
│       ├── ArenaPage               /arena
│       │   ├── ModeSelector        (RACE / SUMO)
│       │   ├── PreBattlePanel
│       │   ├── MatchmakingStatus
│       │   ├── AIOfferModal        (offered after arena_matchmaking_timeout_seconds = 30)
│       │   └── RateLimitBanner
│       ├── BattleResultPage        /arena/result/:matchId
│       │   ├── BattleResultCard    (WIN / LOSS variants)
│       │   ├── StatComparison
│       │   ├── ShareBattleButton
│       │   └── ActionButtons
│       ├── LeaderboardPage         /leaderboard
│       │   ├── RarityFilter
│       │   ├── LeaderboardTable → LeaderboardRow × 100  (leaderboard_top_display = 100)
│       │   └── OwnerRankBanner     (if pet token present)
│       ├── GdprPage                /gdpr        (owner auth required)
│       │   ├── GdprRequestForm     (type selector: erasure / data_access / restrict_processing / object_leaderboard / rectification)
│       │   └── GdprStatusBanner    (polls GET /api/v1/gdpr/request/status by jobId)
│       └── MarketplacePage         /marketplace  (FF_MARKETPLACE only)
```

### 2.3 Phaser.js Integration Pattern

Phaser.js is integrated as a side-effectful singleton managed inside a dedicated `PetCanvasEngine` class. No component other than `src/components/canvas/PetCanvas.tsx` may import Phaser directly.

**Pattern: React host + Phaser canvas**

```tsx
// src/components/canvas/PetCanvas.tsx
import { useEffect, useRef } from 'react';
import type { PetCanvasEngine } from './PetCanvasEngine';

interface PetCanvasProps {
  seed: bigint;  // API returns seed as a JSON number; callers must convert: BigInt(apiResponse.seed)
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  interactive?: boolean;
}

export function PetCanvas({ seed, rarity, interactive = false }: PetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PetCanvasEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    // Phaser is dynamically imported — excluded from initial JS bundle
    import('./PetCanvasEngine').then(({ PetCanvasEngine }) => {
      if (cancelled) return; // guard against unmount before import resolves
      engineRef.current = new PetCanvasEngine(containerRef.current!, {
        seed,
        rarity,
        interactive,
        spriteResolutionPx: 32, // (sprite_resolution_px = 32)
      });
    });
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [seed, rarity, interactive]);

  // Note: image-rendering: crisp-edges (Firefox fallback for pixelated) must be
  // declared in a CSS class (e.g. .pixel-canvas) — inline styles cannot stack the same property.
  return (
    <div
      ref={containerRef}
      aria-label="Pixel pet canvas"
      role="img"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
```

```typescript
// src/components/canvas/PetCanvasEngine.ts
// All Phaser imports live here — nowhere else
import Phaser from 'phaser';
import { buildAttributeVector } from '../../lib/petGeneration';

export class PetCanvasEngine {
  private game: Phaser.Game;

  constructor(container: HTMLElement, config: EngineConfig) {
    const { seed, rarity, spriteResolutionPx } = config;
    const attributes = buildAttributeVector(seed); // deterministic from seed

    this.game = new Phaser.Game({
      type: Phaser.AUTO,            // WebGL with Canvas 2D fallback
      parent: container,
      width: spriteResolutionPx * 2,   // 32 × 2 = 64 CSS px @1×; retina handled via image-rendering: pixelated
      height: spriteResolutionPx * 2,
      transparent: true,
      scene: [new PetIdleScene(seed, attributes, rarity)],
    });
  }

  destroy(): void {
    this.game.destroy(true);
  }
}
```

**Key isolation rules**:
- `PetCanvasEngine.ts` is the only file that imports `phaser`.
- Phaser is loaded via dynamic `import()` so it is excluded from the main bundle.
- `ArenaScene.tsx` for battle animations follows the same pattern — a separate Phaser scene dynamically loaded when the arena route is entered.

### 2.4 State Management

Four tiers of state, each with a distinct tool (EDD §8.2):

| Tier | Library | Scope | Examples |
|------|---------|-------|---------|
| Server state | TanStack Query v5 | Remote API data with cache | Pet stats, leaderboard entries, battle history |
| Client state | Zustand | Ephemeral UI — not persisted | Arena mode selection, claim flow step, toast queue |
| URL state | URLSearchParams / route params | Shareable, bookmarkable | Leaderboard rarity filter (`?rarity=EPIC`), page number |
| Form state | React Hook Form + Zod | Controlled inputs with validation | `ClaimEmailForm`, `ClaimCodeForm` |

**Zustand store slices** (`src/store/useAppStore.ts`):

```typescript
interface AppStore {
  // Arena slice
  selectedMode: 'RACE' | 'SUMO' | null;
  setSelectedMode: (mode: 'RACE' | 'SUMO' | null) => void;

  // Claim flow slice
  claimStep: 'email' | 'code' | 'reveal';
  claimId: string | null;
  setClaimStep: (step: 'email' | 'code' | 'reveal') => void;
  setClaimId: (id: string | null) => void;

  // Toast slice
  toasts: Toast[];
  pushToast: (toast: Toast) => void;
  dismissToast: (id: string) => void;
}
```

**TanStack Query cache rules**:
- Global `staleTime: 30_000` (30 seconds)
- `useLeaderboard` sets `refetchInterval: 30_000` (leaderboard_update_lag_max_seconds = 30 from constants.json)
- `usePet` is invalidated on successful `submitTraining` or `useFeed` mutation
- No cache is shared between the player app and the admin portal

### 2.5 Routing

React Router v6 with `createBrowserRouter`. All routes are lazy-loaded via React Router v6.4's built-in `lazy` route property (not `React.lazy()` + `<Suspense>` — these are distinct APIs; React Router's `lazy` handles the loading boundary internally).

```typescript
// src/App.tsx (router configuration)
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, lazy: () => import('./components/landing/LandingPage') },
      { path: 'claim', lazy: () => import('./components/claim/ClaimPage') },
      { path: 'pet/:petId', lazy: () => import('./components/pet/PetPage') },
      { path: 'pet/:petId/train', lazy: () => import('./components/training/TrainingPage') },
      { path: 'pet/:petId/records', lazy: () => import('./components/records/BattleRecordsPage') },
      { path: 'arena', lazy: () => import('./components/arena/ArenaPage') },
      { path: 'arena/result/:matchId', lazy: () => import('./components/arena/BattleResultPage') },
      { path: 'leaderboard', lazy: () => import('./components/leaderboard/LeaderboardPage') },
      // GDPR self-service: owner token required; accessible at /gdpr
      // Route-level guard: loader redirects to / when no pet_access_token present in localStorage
      {
        path: 'gdpr',
        lazy: () => import('./components/gdpr/GdprPage'),
        loader: () => {
          if (!localStorage.getItem('pet_access_token')) {
            throw redirect('/');
          }
          return null;
        },
      },
      // Marketplace: only rendered when FF_MARKETPLACE feature flag is active
      { path: 'marketplace', lazy: () => import('./components/marketplace/MarketplacePage') },
    ],
  },
]);
```

**URL state conventions**:
- `/leaderboard?rarity=EPIC&page=2` — rarity filter and pagination are URL state
- `/pet/:petId?token=<petToken>` — initial token hydration from deep link; token copied to `localStorage` on mount
- `/arena/result/:matchId` — shareable battle record URL

### 2.6 API Client Layer

```typescript
// src/lib/apiClient.ts
import axios from 'axios';
import { getPetToken } from './tokenStorage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Token attachment — reads pet_access_token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const token = getPetToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error normalization
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Translate API error envelope to a typed AppError
    const code = error.response?.data?.error?.code ?? 'UNKNOWN_ERROR';
    const message = error.response?.data?.error?.message ?? 'An unexpected error occurred.';
    return Promise.reject(new AppError(code, message, error.response?.status));
  }
);
```

```typescript
// src/lib/tokenStorage.ts
const TOKEN_KEY = 'pet_access_token';

export function getPetToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setPetToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearPetToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
```

**Token attachment rules**:
- Token is read from `localStorage` via `getPetToken()` on every outgoing request.
- On `/claim/verify` success response, `setPetToken(petToken)` persists the token.
- On URL deep-link with `?token=<value>`, the token is extracted and saved via `setPetToken` during route hydration in `PetPage`.
- HTTP 401 responses trigger `clearPetToken()` and redirect to `/`.

---

## 3. Admin Portal Architecture

### 3.1 Directory Structure

```
apps/admin/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.ts                     # Vue app entry
│   ├── App.vue                     # Root component + router-view
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.vue
│   │   │   ├── AdminSidebar.vue
│   │   │   └── AdminNavbar.vue
│   │   ├── dashboard/
│   │   │   └── DashboardPage.vue
│   │   ├── pets/
│   │   │   ├── PetListPage.vue
│   │   │   ├── PetSearchBar.vue
│   │   │   └── PetBanModal.vue
│   │   ├── leaderboard/
│   │   │   ├── AdminLeaderboardPage.vue
│   │   │   └── SuspiciousFlagBadge.vue
│   │   ├── battles/
│   │   │   ├── BattleListPage.vue
│   │   │   └── BattleFlagModal.vue
│   │   ├── suspicious/
│   │   │   └── SuspiciousActivityPage.vue
│   │   ├── gdpr/
│   │   │   ├── GdprQueuePage.vue
│   │   │   └── GdprRequestRow.vue
│   │   ├── config/
│   │   │   ├── RuntimeConfigPage.vue
│   │   │   ├── EconomyConfigPage.vue
│   │   │   └── FlagsConfigPage.vue
│   │   ├── email/
│   │   │   └── EmailMonitorPage.vue
│   │   ├── analytics/
│   │   │   ├── AnalyticsPage.vue
│   │   │   └── MetricChart.vue
│   │   ├── audit/
│   │   │   └── AuditLogPage.vue
│   │   ├── roles/
│   │   │   ├── RolesPage.vue
│   │   │   └── CreateAdminModal.vue
│   │   └── auth/
│   │       ├── LoginPage.vue
│   │       └── TotpSetupPage.vue
│   ├── stores/
│   │   ├── useAdminAuthStore.ts    # Pinia: session state, role
│   │   ├── usePetStore.ts          # Pinia: admin pet list cache
│   │   └── useConfigStore.ts       # Pinia: runtime + economy + feature flags config cache
│   ├── lib/
│   │   ├── adminApiClient.ts       # Axios with session cookie; CSRF handling
│   │   └── formatters.ts           # Date, number, rarity formatting
│   └── router/
│       └── index.ts                # Vue Router route definitions
```

### 3.2 Vue 3 Component Tree

```
App.vue
├── LoginPage.vue               /admin/login
│   └── TotpSetupPage.vue       /admin/totp-setup   (first-login flow)
└── AdminLayout.vue             /admin/**
    ├── AdminSidebar.vue
    ├── AdminNavbar.vue
    └── <router-view>
        ├── DashboardPage.vue       /admin/dashboard
        ├── PetListPage.vue         /admin/pets
        ├── AdminLeaderboardPage.vue /admin/leaderboard
        ├── BattleListPage.vue      /admin/battles
        ├── SuspiciousActivityPage.vue /admin/suspicious
        ├── GdprQueuePage.vue       /admin/gdpr
        ├── RuntimeConfigPage.vue   /admin/config/runtime
        ├── EconomyConfigPage.vue   /admin/config/economy
        ├── FlagsConfigPage.vue     /admin/config/flags
        ├── EmailMonitorPage.vue    /admin/email
        ├── AnalyticsPage.vue       /admin/analytics
        ├── AuditLogPage.vue        /admin/audit
        └── RolesPage.vue           /admin/roles
```

### 3.3 Element Plus Usage

Element Plus is registered globally in `main.ts`. Key components used per module:

| Module | Element Plus components |
|--------|------------------------|
| Pet Management | `ElTable`, `ElTableColumn`, `ElPagination`, `ElInput`, `ElSelect`, `ElButton`, `ElDialog` |
| Leaderboard | `ElTable`, `ElTag`, `ElBadge` — hard-capped list of up to `leaderboard_admin_view = 500` entries (no pagination; `SuspiciousFlagBadge` annotates high-activity pets) |
| Battle Records | `ElTable`, `ElDatePicker`, `ElSwitch` |
| GDPR Queue | `ElTable`, `ElSelect` (status filter), `ElForm`, `ElFormItem` |
| Config pages (runtime, economy) | `ElForm`, `ElFormItem`, `ElInputNumber`, `ElSlider`, `ElAlert` |
| Feature Flags | `ElTable`, `ElSwitch`, `ElTag` |
| Analytics | `ElDatePicker` (range), integrated with vue-echarts for `MetricChart` |
| Audit Log | `ElTable`, `ElDatePicker` (range), `ElPagination` |
| Login | `ElForm`, `ElInput` (password + TOTP), `ElButton` |

All tables use server-side pagination via the `ElPagination` component bound to Pinia store page state, except the admin leaderboard which is a hard-capped single-response list (`leaderboard_admin_view = 500`).

### 3.4 State Management (Pinia)

```typescript
// src/stores/useAdminAuthStore.ts
export const useAdminAuthStore = defineStore('adminAuth', () => {
  const role = ref<'super_admin' | 'moderator' | 'read_only' | null>(null);
  const username = ref<string | null>(null);
  const isAuthenticated = computed(() => role.value !== null);

  async function login(credentials: LoginPayload) { /* ... */ }
  async function logout() { /* ... */ }

  return { role, username, isAuthenticated, login, logout };
});
```

```typescript
// src/stores/useConfigStore.ts
export const useConfigStore = defineStore('config', () => {
  const runtimeConfig = ref<RuntimeConfig | null>(null);
  const economyConfig = ref<EconomyConfig | null>(null);
  const featureFlags = ref<FeatureFlag[] | null>(null);

  // config_cache_refresh_time_minutes = 5; local cache mirrors backend TTL
  async function fetchRuntimeConfig() { /* GET /admin/api/config/runtime */ }
  async function fetchEconomyConfig() { /* GET /admin/api/config/economy */ }
  async function fetchFeatureFlags() { /* GET /admin/api/config/flags */ }
  async function updateFeatureFlag(flag: string, enabled: boolean) { /* PUT /admin/api/config/flags/:flag */ }

  return { runtimeConfig, economyConfig, featureFlags, fetchRuntimeConfig, fetchEconomyConfig, fetchFeatureFlags, updateFeatureFlag };
});
```

### 3.5 Routing (Vue Router)

```typescript
// src/router/index.ts
const router = createRouter({
  history: createWebHistory('/admin'),
  routes: [
    { path: '/login', component: () => import('../components/auth/LoginPage.vue') },
    { path: '/totp-setup', component: () => import('../components/auth/TotpSetupPage.vue') },
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        { path: 'dashboard', component: () => import('../components/dashboard/DashboardPage.vue') },
        { path: 'pets', component: () => import('../components/pets/PetListPage.vue') },
        { path: 'leaderboard', component: () => import('../components/leaderboard/AdminLeaderboardPage.vue') },
        { path: 'battles', component: () => import('../components/battles/BattleListPage.vue') },
        { path: 'suspicious', component: () => import('../components/suspicious/SuspiciousActivityPage.vue') },
        { path: 'gdpr', component: () => import('../components/gdpr/GdprQueuePage.vue') },
        { path: 'config/runtime', component: () => import('../components/config/RuntimeConfigPage.vue') },
        { path: 'config/economy', component: () => import('../components/config/EconomyConfigPage.vue') },
        { path: 'config/flags', component: () => import('../components/config/FlagsConfigPage.vue') },
        { path: 'email', component: () => import('../components/email/EmailMonitorPage.vue') },
        { path: 'analytics', component: () => import('../components/analytics/AnalyticsPage.vue') },
        { path: 'audit', component: () => import('../components/audit/AuditLogPage.vue') },
        { path: 'roles', component: () => import('../components/roles/RolesPage.vue') },
      ],
    },
  ],
});

// Navigation guard: redirect unauthenticated users to /login
router.beforeEach((to) => {
  const auth = useAdminAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/login';
  }
});
```

### 3.6 API Client (Admin)

Admin requests use session cookies — no Authorization header. Axios is configured with `withCredentials: true` so the browser sends the httpOnly session cookie on every request.

```typescript
// src/lib/adminApiClient.ts
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const adminApiClient = axios.create({
  baseURL: `${BASE_URL}/admin/api`,
  withCredentials: true,           // send httpOnly session cookie
  headers: { 'Content-Type': 'application/json' },
});

// Session expiry handling
adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired or invalidated
      useAdminAuthStore().logout();
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

**CSRF handling**: The admin API is served under `/admin/api` with `SameSite=Strict` cookie policy. All state-mutating requests are POST/PUT/DELETE. Because the cookie is `SameSite=Strict`, cross-site form submissions cannot forge admin actions. No additional CSRF token is required given this configuration; if the deployment adds cross-origin scenarios, an `X-CSRF-Token` header must be implemented.

---

## 4. Pixel Art Rendering

### 4.1 Phaser.js Sprite Loading

Sprite sheets are loaded in the Phaser scene's `preload()` method. Frame size is governed by `sprite_resolution_px = 32` from `constants.json` — this value is passed as a typed constant and never hardcoded.

```typescript
// src/components/canvas/PetCanvasEngine.ts
import { SPRITE_RESOLUTION_PX } from '../../constants';
// SPRITE_RESOLUTION_PX = 32  (sprite_resolution_px from constants.json)

class PetIdleScene extends Phaser.Scene {
  private seed: bigint;
  private attributes: AttributeVector;
  private rarity: string;

  constructor(seed: bigint, attributes: AttributeVector, rarity: string) {
    super({ key: 'PetIdleScene' });
    this.seed = seed;
    this.attributes = attributes;
    this.rarity = rarity;
  }

  preload(): void {
    // Sprite sheet: frameWidth = frameHeight = SPRITE_RESOLUTION_PX
    this.load.spritesheet('pet', `/sprites/pet-${this.seed.toString()}-sheet.png`, {
      frameWidth: SPRITE_RESOLUTION_PX,   // 32
      frameHeight: SPRITE_RESOLUTION_PX,  // 32
    });
  }

  create(): void {
    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers('pet', { start: 0, end: 3 }),
      frameRate: 30,   // pet_animation_fps_min = 30 (constants.json slo section)
      repeat: -1,      // loop indefinitely
    });

    const sprite = this.add.sprite(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'pet'
    );
    sprite.setScale(2); // scale 32px frame to fill 64px canvas (sprite_resolution_px × 2)
    sprite.play('idle');
  }
}
```

### 4.2 Sprite Resolution

- **Frame size**: `sprite_resolution_px = 32` px per frame (from `constants.json` core section). All sprite sheets are authored at this resolution.
- **Display scaling**: Sprites are rendered at 2× scale in the hero canvas (64×64 CSS px visible at @1×; 128×128 px at @2× retina), using CSS `image-rendering: pixelated` and `image-rendering: crisp-edges` to preserve hard pixel boundaries at all zoom levels.
- **Sprite sizes by context** (from VDD §4.2):

| Context | Sprite size | Display size |
|---------|-------------|--------------|
| Hero canvas (Landing, My Pet, Battle Result) | 64×64 px @ 1× | 128×128 px @ 2× (retina) |
| Leaderboard thumbnail | 32×32 px | 32×32 px @ 1×, 64×64 px @ 2× |
| Trade card (Marketplace) | 48×48 px @ 1× | 96×96 px @ 2× |
| OG social share card | 128×128 px | 128×128 px rendered on 1200×630 card |

### 4.3 Animation

- **Minimum frame rate**: `pet_animation_fps_min = 30` FPS sustained (from `constants.json` slo section). This is the `frameRate` value passed to `this.anims.create()` inside a Phaser Scene.
- **Idle animation**: 4-frame minimum, 8-frame recommended loop.
- **Interaction response**: 2-frame "bounce" sequence — scale 1.15× frame 1, return to 1× frame 2; 200ms total (`pet_interaction_response_ms = 200` from constants.json).
- **Training animation**: 3-frame "effort" sequence, 400ms.
- **Neglected state**: CSS `filter: grayscale(60%) brightness(0.8)` applied when `training_neglect_threshold_days = 3` days without training.
- **Reduced motion**: `useReducedMotion()` hook detects `prefers-reduced-motion: reduce`. When true, Phaser's animation loop is paused and a static sprite frame is shown. No particle effects are created.

### 4.4 Sprite Generation from Seed

Pet appearance is deterministic from the integer seed stored in `pets.seed`. The generation algorithm maps seed → 6-dimension attribute vector:

```typescript
// src/lib/petGeneration.ts
// pet_generation_dimensions = 6
export interface AttributeVector {
  bodyType: number;       // dimension 1
  headType: number;       // dimension 2
  colorPalette: number;   // dimension 3
  accessory: number;      // dimension 4
  rarityTrait: number;    // dimension 5
  pattern: number;        // dimension 6
}

export function buildAttributeVector(seed: bigint): AttributeVector {
  // Deterministic decomposition of seed into 6 independent dimensions
  // Combination space >= pet_generation_combinations_min = 1,000,000,000
  return {
    bodyType:    Number(seed % 100n),
    headType:    Number((seed / 100n) % 100n),
    colorPalette: Number((seed / 10_000n) % 100n),
    accessory:   Number((seed / 1_000_000n) % 10n),
    rarityTrait: Number((seed / 10_000_000n) % 10n),
    pattern:     Number((seed / 100_000_000n) % 10n),
  };
}
```

The same seed always produces the same `AttributeVector` (`AC-002-2`). The attribute vector selects sprite sheet frames for each dimension layer, composited by Phaser.

### 4.5 Canvas vs DOM Rendering Decisions

| Element | Rendering | Rationale |
|---------|-----------|-----------|
| Pet sprite and idle animation | Phaser.js canvas (WebGL → Canvas 2D fallback) | Requires per-frame animation loop, sprite composition, interaction physics |
| Battle animation sequence | Phaser.js canvas (separate `ArenaScene`) | 8-frame run cycle, particle burst, positional animation |
| Stat bars, rarity badges, leaderboard | DOM + CSS | Data-driven, accessible, no animation requiring frame-by-frame control |
| Rarity shimmer / glow effects | CSS animations (`legendary-shimmer`, `epic-shimmer`) | Compositor-friendly; avoids canvas overhead for purely decorative effects |
| Training stat indicator (`+X Speed`) | DOM + CSS keyframes (`translateY` + `opacity`) | Compositor-friendly transform; no Phaser scene needed |

---

## 5. Key UI Flows

### 5.1 Pet Claim Flow (Email → OTP → Token Storage)

The claim flow is a 3-step compound component (`email_claim_flow_steps_max = 3`).

```
Guest on LandingPage
  ↓ clicks ClaimCTA
ClaimPage renders ClaimFlow
  │
  ├─ Step 1: ClaimEmailForm
  │    User enters email + checks COPPA age confirmation
  │    → POST /api/v1/claim  { email, petId, ageConfirmed: true }
  │    ← { claimId, expiresAt }
  │    Rate limit: auth_rate_limit_claim_attempts_per_hour = 5
  │
  ├─ Step 2: ClaimCodeForm
  │    User enters 6-digit OTP (claim_code_digits = 6)
  │    ExpiryWarning shown when ≤ a11y_claim_code_warning_before_expiry_minutes = 2 min remain
  │    → POST /api/v1/claim/verify  { claimId, code }
  │    ← { petToken, petId, petUrl }
  │    Code expires after claim_code_expiry_minutes = 15 min
  │    Rate limit: auth_rate_limit_code_entry_attempts_per_session = 10
  │
  └─ Step 3: URLReveal
       petToken → setPetToken(petToken)  [localStorage]
       petUrl displayed with copy button
       → navigate to /pet/:petId
```

**Error states handled in UI**:
- `ALREADY_CLAIMED` (HTTP 400): "This pet is already owned."
- `CODE_EXPIRED` (HTTP 400): "Claim code has expired. Please request a new one." + re-request button
- `INVALID_CODE` (HTTP 400): Red shake animation on digit boxes + error message
- `VALIDATION_ERROR` (HTTP 400): Inline field error shown (malformed email, invalid UUID for `petId`)
- `AGE_CONFIRMATION_REQUIRED` (HTTP 400): Checkbox re-highlighted with error message "Age confirmation required"
- `PET_NOT_FOUND` (HTTP 404): "Pet not found. Please reload and try again."
- `MAX_ATTEMPTS_REACHED` (HTTP 429): All inputs disabled after reaching the 10-attempt session limit (`auth_rate_limit_code_entry_attempts_per_session = 10`); `Retry-After` countdown shown
- `RATE_LIMIT_EXCEEDED` (HTTP 429): Email claim rate limit reached; `claim_email_retry_cooldown_seconds = 60` second cooldown countdown shown

### 5.2 Training Interaction

```
PetPage (owner authenticated via Bearer token)
  ↓ clicks TrainingEntry
TrainingPage /pet/:petId/train
  │
  ├─ TrainingActions shows 3 action cards (RUN / STRENGTH / STAMINA)
  │    Each card shows current stat value and trains-remaining count
  │    training_actions_per_day = 3 actions per UTC day
  │
  ├─ User clicks "Train" on a card
  │    → POST /api/v1/pets/:petId/train  { trainingType: 'RUN' | 'STRENGTH' | 'STAMINA' }
  │    ← { updatedStats, statDelta, actionsRemainingToday }
  │
  ├─ On success:
  │    StatChangeIndicator appears: "+X Speed" floats up, visible for
  │    training_stat_display_duration_seconds = 2 seconds
  │    Stat bars animate to new values
  │    usePet cache is invalidated → PetPage re-fetches
  │
  ├─ Error states:
  │    HTTP 400 VALIDATION_ERROR → toast: "Invalid training type. Please try again."
  │    HTTP 400 TRAINING_LIMIT_REACHED → all action cards disabled; DailyResetTimer shown
  │    HTTP 400 STAT_AT_MAXIMUM → toast: "Stat is already at maximum (pet_stat_max = 100)"; card remains
  │                                enabled for other stats not yet at max
  │    HTTP 401 → handled globally: clearPetToken() + redirect to /
  │    HTTP 403 NOT_OWNER → toast: "You do not own this pet." (should not occur in normal flow)
  │    HTTP 404 PET_NOT_FOUND → toast: "Pet not found. Please reload and try again." (should not occur in normal flow)
  │
  └─ Exhausted (actionsRemainingToday = 0):
       DailyResetTimer shows countdown to UTC 00:00 reset
       All action cards disabled

  Neglect check: if last_trained_at > training_neglect_threshold_days = 3 days ago
    → NeglectedState overlay renders on PetCanvas
```

### 5.3 Feed Interaction

```
PetPage (owner authenticated via Bearer token)
  ↓ selects FoodItem in FoodInventory
  │
  ├─ User taps/clicks food item in FoodInventory
  │    FoodItem shows stat targeted, magnitude, and buff duration
  │    → POST /api/v1/pets/:petId/feed
  │       { buffType, stat, magnitude, isPermanent }
  │    ← { updatedStats, buffApplied }
  │       updatedStats: { speed, strength, stamina }  (level excluded — level is training-derived)
  │       buffApplied: { stat, magnitude, isPermanent, expiresAt }
  │           expiresAt is null when isPermanent is true
  │
  ├─ On success:
  │    Stat bar for the targeted stat animates to new value
  │    If temporary buff: buff badge appears on stat bar with remaining duration
  │    usePet cache is invalidated → PetPage re-fetches
  │
  └─ Error states:
       HTTP 400 STAT_AT_MAXIMUM → toast: "Stat is already at maximum (pet_stat_max = 100)"
       HTTP 400 VALIDATION_ERROR → inline error (magnitude or buffType out of configured range)
       HTTP 401 → handled globally: clearPetToken() + redirect to /
       HTTP 403 NOT_OWNER → toast: "You do not own this pet." (should not occur in normal flow)
       HTTP 404 PET_NOT_FOUND → toast: "Pet not found. Please reload and try again." (should not occur in normal flow)
```

### 5.4 Arena Battle Flow

```
PetPage
  ↓ clicks ArenaEntry (battles remaining > 0)
ArenaPage /arena
  │
  ├─ A1: Rate limit check (client-side from Zustand store — state set on prior HTTP 429 response)
  │    If arena rate limit reached: RateLimitBanner shown; flow blocked
  │    arena_rate_limit_battles_per_hour_default = 10
  │
  ├─ A2: ModeSelector — user picks RACE or SUMO
  │
  ├─ A3: User clicks "Enter Arena"
  │    → POST /api/v1/arena/enter  { petId, mode, acceptAI?: boolean }
  │    Long-poll: server waits up to arena_matchmaking_timeout_seconds = 30s
  │    MatchmakingStatus shows "Finding opponent..." with animated dots
  │    HTTP 400 VALIDATION_ERROR → toast: "Invalid arena mode." (should not occur in normal flow)
  │    HTTP 401 → handled globally: clearPetToken() + redirect to /
  │    HTTP 403 NOT_OWNER → toast: "You do not own this pet." (should not occur in normal flow)
  │    HTTP 403 PET_BANNED → show ban notice; arena entry blocked
  │    HTTP 404 PET_NOT_FOUND → toast: "Pet not found. Please reload and try again." (should not occur in normal flow)
  │    HTTP 429 RATE_LIMIT_EXCEEDED → RateLimitBanner shown; Retry-After countdown displayed
  │
  ├─ A4a: Opponent found (< 30s)
  │    3-2-1 pixel countdown animation
  │    ArenaScene (Phaser.js) renders battle animation
  │    Duration: arena_match_duration_min_seconds = 5s to
  │              arena_match_duration_max_seconds = 15s
  │    ← { matchId, result, opponentPetId, isAiOpponent, statDelta, newLeaderboardScore }
  │
  ├─ A4b: No opponent (30s timeout), acceptAI omitted or false
  │    HTTP 408 MATCHMAKING_TIMEOUT
  │    Battle rate-limit counter NOT incremented on timeout
  │    "No opponent found" message with retry option
  │
  ├─ A4c: No opponent, user accepts AIOfferModal
  │    → POST /api/v1/arena/enter  { ..., acceptAI: true }
  │    ← AI opponent result
  │
  └─ A5: navigate to /arena/result/:matchId
       BattleResultPage shows WIN/LOSS card
       ShareBattleButton copies public URL
       Leaderboard score updated within leaderboard_update_lag_max_seconds = 30s

  Error states:
       HTTP 400 VALIDATION_ERROR → toast: "Invalid request. Please try again."
       HTTP 401 UNAUTHORIZED → clearPetToken() + redirect to /
       HTTP 403 NOT_OWNER → toast: "You do not own this pet."
       HTTP 429 RATE_LIMIT_EXCEEDED → show cooldown timer (arena_rate_limit_battles_per_hour_default = 10 battles/hour)
```

### 5.5 Marketplace Browse / List / Buy (FF_MARKETPLACE)

This flow is only active when the `FF_MARKETPLACE` feature flag is `true`.

```
MarketplacePage /marketplace
  │
  ├─ Browse: GET /api/v1/marketplace/listings?sortBy=price|rarity|level&order=asc|desc&page=1
  │    Public — no auth required
  │    ElTable (admin portal) / custom table (player app) with rarity filtering
  │
  ├─ List pet for sale (owner only):
  │    → POST /api/v1/marketplace/listings
  │       { petId, priceCredits }
  │    Min price enforced: (pet_level × 100) + (rarity_multiplier × 500)
  │       (trade_min_price_formula_level_coeff = 100; trade_min_price_formula_rarity_coeff = 500)
  │    Anti-flip: marketplace_trade_antiflip_protection_days = 7 days
  │       since last purchase before re-listing is allowed
  │    Platform fee: trade_transaction_fee_percent = 5%
  │
  ├─ Cancel listing (owner only):
  │    → DELETE /api/v1/marketplace/listings/:listingId
  │
  ├─ Buy:
  │    → POST /api/v1/marketplace/listings/:listingId/buy
  │    ← ownership transferred; buyer's token now controls the pet
  │    Trade history: GET /api/v1/marketplace/history/:petId (authenticated, private)
  │
  └─ Error states (all marketplace endpoints):
       HTTP 400 VALIDATION_ERROR → toast: "Invalid request. Please check your input."
       HTTP 401 UNAUTHORIZED → clearPetToken() + redirect to /
       HTTP 403 FEATURE_DISABLED → show "Marketplace is not yet available" banner
       HTTP 403 NOT_OWNER → toast: "You do not own this pet."
       HTTP 404 NOT_FOUND → toast: "Listing not found. It may have been removed."
```

### 5.6 Leaderboard View

```
LeaderboardPage /leaderboard
  │
  ├─ GET /api/v1/leaderboard?rarity=<filter>&page=1&limit=100
  │    Public — no auth required
  │    Top leaderboard_top_display = 100 pets shown publicly
  │    Lag ≤ leaderboard_update_lag_max_seconds = 30s (sourced from Redis sorted set)
  │    TanStack Query refetchInterval = 30,000ms mirrors this SLO
  │
  ├─ RarityFilter tabs (All / Common / Rare / Epic / Legendary)
  │    Filter state in URL: ?rarity=EPIC
  │
  ├─ OwnerRankBanner (if pet token in localStorage):
  │    GET /api/v1/leaderboard/rank/:petId
  │    Shows "Your pet [Name] is ranked #X"
  │
  └─ LeaderboardRow click → /pet/:petId/records
       BattleHistoryTable shows last arena_battle_records_display_count = 20 battles
```

### 5.7 GDPR Self-Service Flow (Player)

```
PetPage (owner authenticated via Bearer token)
  ↓ clicks "Data Rights" / GDPR link
GdprPage /gdpr
  │
  ├─ GdprRequestForm
  │    Type selector (radio / dropdown):
  │      erasure | data_access | restrict_processing | object_leaderboard | rectification
  │    → POST /api/v1/gdpr/request  { type: "erasure" | ... }   (auth: Bearer token)
  │    ← { jobId, message }  HTTP 202 Accepted
  │    jobId stored in component state; GdprStatusBanner activates
  │
  ├─ GdprStatusBanner (after submission)
  │    Polls GET /api/v1/gdpr/request/status?jobId=<jobId>  (auth: Bearer token)
  │    Displays current status: pending | processing | completed | failed
  │    SLA copy displayed per request type:
  │      erasure → "Processed within 7 days (gdpr_email_deletion_window_days = 7)"
  │      data_access / portability → "Processed within 30 days (gdpr_data_access_response_days = 30; gdpr_data_portability_response_days = 30)"
  │      restrict_processing → "Processed within 24 hours (gdpr_restrict_processing_response_hours = 24)"
  │      object_leaderboard → "Processed within 5 business days (gdpr_object_leaderboard_response_business_days = 5)"
  │      rectification → "Processed within 24 hours (gdpr_email_rectification_response_hours = 24)"
  │
  └─ Error states:
       HTTP 400 VALIDATION_ERROR → inline form error: "Please select a valid request type."
       HTTP 401 → redirect to / (token cleared)
       HTTP 403 FORBIDDEN → "Your account is not authorized to view this request."
       HTTP 404 NOT_FOUND → "Request not found."
```

### 5.8 Admin Login (TOTP)

```
AdminLoginPage /admin/login
  │
  ├─ Step 1: Credentials entry
  │    → POST /admin/api/auth/login  { username, password, totpCode? }
  │    IP rate limit: admin_login_ip_rate_limit_attempts = 10 per
  │                   admin_login_ip_rate_limit_window_seconds = 900s (15 min)
  │
  ├─ Path A: TOTP not yet enrolled (first login)
  │    ← HTTP 403  { error: { code: "TOTP_SETUP_REQUIRED", details: { setupToken } } }
  │    Redirect → /admin/totp-setup
  │    TotpSetupPage calls POST /admin/api/auth/totp/setup  { setupToken, password }
  │    ← { otpAuthUrl, backupCodes }
  │    Admin scans QR code in authenticator app
  │    → Return to /admin/login for standard login
  │
  ├─ Path B: Successful login with TOTP code
  │    ← HTTP 200; Set-Cookie: session=<id>; HttpOnly; SameSite=Strict; Secure; Path=/admin
  │    Session: inactivity admin_session_inactivity_expiry_hours = 4h
  │             absolute admin_session_absolute_expiry_hours = 8h
  │    → navigate to /admin/dashboard
  │
  ├─ Path C: Account locked
  │    After admin_login_lockout_threshold = 10 consecutive failures
  │    ← HTTP 403  { error: { code: "ACCOUNT_LOCKED", details: { unlockedAt } } }
  │    Lockout duration: admin_login_lockout_duration_minutes = 30 min
  │
  ├─ Error states:
  │    HTTP 400 VALIDATION_ERROR → inline form error: "Please enter a valid username and password."
  │    HTTP 401 UNAUTHORIZED → inline form error: "Invalid credentials."
  │    HTTP 429 RATE_LIMIT_EXCEEDED → show lockout message with (admin_login_lockout_duration_minutes = 30) minute countdown
  │
  └─ All auth events written to audit log (admin_audit_log_retention_years = 2 years)
```

---

## 6. Performance Budget

All targets derived from `constants.json` slo section.

### 6.1 Core Web Vitals Targets

| Metric | Target | Constant key |
|--------|--------|--------------|
| FCP | ≤ 1.5s | `fcp_seconds` |
| LCP | ≤ 2.5s | `lcp_seconds` |
| CLS | ≤ 0.1 | `cls_score` |
| INP | ≤ 200ms | `inp_ms` |

### 6.2 Rendering SLOs

| Metric | Target | Constant key |
|--------|--------|--------------|
| Pet canvas render on load | ≤ 2s | `pet_render_on_load_seconds` |
| Pet interaction response (click/tap) | ≤ 200ms | `pet_interaction_response_ms` |
| Pet animation frame rate | ≥ 30 FPS sustained | `pet_animation_fps_min` |
| Arena battle E2E | ≤ 2s | `arena_battle_e2e_seconds` |

### 6.3 Bundle Budgets

| Asset | Budget (gzipped) | Constant key |
|-------|-----------------|--------------|
| Total JS bundle | ≤ 300 KB | `total_js_bundle_gzipped_kb` |
| Total CSS bundle | ≤ 50 KB | `total_css_bundle_gzipped_kb` |

### 6.4 Code Splitting Strategy

Phaser.js is the dominant bundle contributor (~1 MB minified). It is excluded from the initial bundle by being loaded only inside `PetCanvasEngine.ts` via dynamic `import()`. The initial page load delivers only React + Router + TanStack Query + Zustand.

```
Initial bundle (eager):       React + Router + TanStack Query + Zustand + Zod
                               Target: < 150 KB gzipped

Phaser.js (lazy):             Loaded only when PetCanvas mounts
                               Served from CDN edge; cached after first load

Route chunks (lazy):          One chunk per route via React Router v6 lazy route property
                               LandingPage chunk downloads Phaser.js as a side-effect

Admin portal:                 Entirely separate Vite build; no shared bundle with player app
```

**Vite code splitting config** (`apps/player/vite.config.ts`):

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'form-vendor': ['react-hook-form', 'zod'],
          // Phaser is NOT listed here — it is excluded from all eager chunks
          // and loaded only via dynamic import() inside PetCanvasEngine.ts
        },
      },
    },
  },
});
```

### 6.5 Additional Performance Rules

- `font-display: swap` for both `Press Start 2P` and `Inter`
- Preload only `Press Start 2P` (above-fold critical); `Inter` loads asynchronously
- All images have explicit `width` and `height` attributes to prevent CLS
- Hero sprite: `loading="eager"` + `fetchpriority="high"`; all other sprites: `loading="lazy"`
- `image-rendering: pixelated` prevents browser smoothing that would increase LCP cost of canvas
- TanStack Query `staleTime: 30_000` avoids refetch-on-mount CLS from stale → fresh state transitions
- Admin portal page load SLO: ≤ 3s with up to 1 million pet records (`admin_page_load_time_seconds = 3` from constants.json thresholds section)

---

## 7. Accessibility

### 7.1 Standard

**WCAG 2.1 AA** compliance is required across all player app screens (PRD §7.7 NFR-A11Y-01).

### 7.2 Contrast Ratios

| Context | Minimum ratio | Constant key |
|---------|--------------|--------------|
| Normal body text (< 18pt or non-bold < 14pt) | 4.5:1 | `a11y_text_contrast_normal` |
| Large text (≥ 18pt or bold ≥ 14pt) | 3:1 | `a11y_text_contrast_large` |
| Focus indicator | 3:1 | `a11y_focus_contrast_ratio` |

Verified token values from VDD §3.1:
- `--color-neutral-50` (`#e8e8f0`) on `--color-surface-base` (`#1a1a2e`): 12.4:1 (AAA) — primary text
- `--color-focus` (`#ffd700`) on dark surfaces: 3.1:1 (AA non-text) — focus rings
- All rarity colors verified against dark base in VDD §3.3 (minimum 5.9:1 for Epic)

### 7.3 Claim Code Expiry Warning

The `ExpiryWarning` component activates when OTP time remaining ≤ `a11y_claim_code_warning_before_expiry_minutes = 2` minutes. It uses `role="alert"` and `aria-live="assertive"` to announce the countdown to screen readers. The warning must meet the 4.5:1 contrast ratio against its background.

```tsx
// src/components/claim/ExpiryWarning.tsx
export function ExpiryWarning({ minutesRemaining }: { minutesRemaining: number }) {
  const WARNING_THRESHOLD = 2; // a11y_claim_code_warning_before_expiry_minutes = 2

  if (minutesRemaining > WARNING_THRESHOLD) return null;

  return (
    <div role="alert" aria-live="assertive" className="expiry-warning">
      Your claim code expires in {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}.
      <button onClick={/* requestNewCode */}>Request a new code</button>
    </div>
  );
}
```

### 7.4 Keyboard Navigation

- All interactive elements are reachable via `Tab` and activatable via `Enter` or `Space`
- `AIOfferModal` implements a focus trap (focus cycles within the modal while open; `Escape` closes)
- `LeaderboardRow` entries are individually focusable; `Enter` navigates to battle records
- `RarityFilter` tabs support arrow-key navigation between tabs
- `TrainingActions` tab order: card 1 → Train button 1 → card 2 → Train button 2 → card 3 → Train button 3
- `StatBar` and `StatsPanel` values are readable by screen reader via `aria-label`

### 7.5 Motion and Reduced Motion

The `useReducedMotion()` hook wraps `window.matchMedia('(prefers-reduced-motion: reduce)')`:

```typescript
// src/hooks/useReducedMotion.ts
import { useState, useEffect } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
```

When `useReducedMotion()` returns `true`:
- `PetCanvasEngine` pauses the Phaser animation loop and renders a static sprite frame
- CSS rarity shimmer animations are suppressed (`animation: none` via `@media (prefers-reduced-motion: reduce)`)
- Particle burst effects are not created
- Stat change indicator uses `opacity` only (no `translateY` motion)

### 7.6 Semantic HTML

- `<header>` wraps `NavBar`
- `<main>` wraps all page content
- `<nav aria-label="Main navigation">` in `NavBar`
- `<section aria-labelledby="...">` for each major page section
- `<h1>` present on every route
- `<table>` with `<th scope="col">` for `LeaderboardTable`, `BattleHistoryTable`, `StatComparison`
- `<button>` for all interactive actions (not `<div onClick>`)
- Minimum touch target: 44×44px on all interactive elements (WCAG 2.5.5 AAA; also meets Apple HIG and Material Design recommendations)

### 7.7 ARIA Roles in Dynamic Regions

| Component | ARIA usage |
|-----------|-----------|
| `ExpiryWarning` | `role="alert"`, `aria-live="assertive"` |
| `OwnerRankBanner` | `role="status"` |
| `MatchmakingStatus` | `aria-live="polite"`, `aria-busy="true"` during queue wait |
| `DailyResetTimer` | `aria-live="polite"` with throttled announcements (every 60 seconds and at ≤ 5 minutes remaining); the visible counter may update every second but the live-region text is only changed at those thresholds to avoid flooding screen readers |
| `RateLimitBanner` | `role="alert"`, `aria-live="assertive"` |
| `AIOfferModal` | `role="dialog"`, `aria-modal="true"`, focus trap |
| `PetCanvas` | `role="img"`, `aria-label="Pixel pet canvas"` |

---

## 8. Security

### 8.1 Token Storage

The `pet_access_token` is stored in `localStorage` under the key `pet_access_token`.

**Trade-offs considered**:

| Storage | XSS risk | CSRF risk | Persistence across tabs | Decision |
|---------|----------|-----------|------------------------|---------|
| `localStorage` | Yes — accessible via JavaScript (`window.localStorage`) | None — not sent automatically | Yes | **Selected** |
| `sessionStorage` | Yes | None | No (tab-scoped) | Rejected: breaks multi-device / multi-tab use case |
| httpOnly cookie | None | Yes (mitigated by `SameSite`) | Yes | Rejected for player token: requires server-side session, contradicts token URL model |

`localStorage` is chosen for the player token because the product's identity model requires the token to be embeddable in a URL and transferable between devices by bookmarking the URL. The XSS risk is mitigated by the CSP policy (see §8.3) which blocks inline scripts and untrusted origins.

**Admin sessions** use httpOnly cookies exclusively — no JS access to session identifiers.

### 8.2 Admin Session Security

- Session cookie properties: `HttpOnly; SameSite=Strict; Secure; Path=/admin`
- Session is stored server-side in Redis — the cookie contains only a session ID
- Inactivity timeout: `admin_session_inactivity_expiry_hours = 4` hours
- Absolute timeout: `admin_session_absolute_expiry_hours = 8` hours (regardless of activity)
- No JWT tokens used for admin auth — server-side sessions reduce token exposure risk
- Axios `withCredentials: true` in `adminApiClient.ts` ensures the cookie is sent on every request

### 8.3 Content Security Policy

**Phase 1/2 CSP** (current): The following CSP is applied as a response header on all player app and admin portal responses. Adjust trusted origins before production deployment. A nonce-based `script-src` policy (replacing the CDN allowlist) is scheduled as a Phase 3 security hardening item per EDD §13.3.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.pixel-pet-arena.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
```

Key constraints:
- `script-src` excludes `'unsafe-inline'` — all scripts must be from `'self'` or trusted CDN
- `frame-src 'none'` prevents clickjacking
- `object-src 'none'` blocks Flash/plugin vectors
- `connect-src` restricts XHR/fetch to the API origin only

### 8.4 XSS Prevention

- All user-supplied data is displayed via React's default JSX escaping (no `dangerouslySetInnerHTML`)
- Pet names (`pets.pet_name`) are rendered as text nodes, never injected as HTML
- Error messages from the API are rendered as text content only
- `adminApiClient.ts` serializes request bodies via `JSON.stringify`; no string concatenation in query parameters

### 8.5 Token Validation

The `pet_access_token` read from `localStorage` is sent in the `Authorization: Bearer` header. The API server hashes the received token (SHA-256) and compares it to `pets.owner_token_hash`. The raw token is never stored server-side.

**Token revocation handling**:
- HTTP 401 from any authenticated endpoint clears `localStorage` token and redirects to `/`
- Replaced tokens (via recovery flow) are added to a Redis blacklist with TTL `claim_token_cleanup_ttl_hours = 72` hours
- Admin-revoked tokens (owner_token_hash set to NULL) immediately return 401

### 8.6 Admin-Specific Security (Frontend)

- No admin API calls are made from the player app — the two apps use entirely separate API client instances
- The admin portal is served from a separate subdomain or route prefix (`admin.pixel-pet-arena.com`) and is not part of the player app bundle
- TOTP code (`totpCode`) is submitted as a string in the JSON body and cleared from Vue component state immediately after submission
- Backup codes are displayed once after TOTP setup and are never stored in frontend state

---

## 9. Testing

### 9.1 Player App

**Framework**: Vitest (unit/integration), Playwright (E2E)

| Test type | Location | Scope |
|-----------|----------|-------|
| Unit | `apps/player/src/**/__tests__/*.test.ts` | Hooks, utilities, Zod schemas, `petGeneration.ts`, `tokenStorage.ts` |
| Component | `apps/player/src/**/__tests__/*.test.tsx` | Form components (`ClaimEmailForm`, `ClaimCodeForm`), `ExpiryWarning`, `StatBar`, `DailyResetTimer` |
| E2E | `apps/player/e2e/*.spec.ts` | Claim flow, training flow, arena entry, leaderboard navigation, GDPR submission |

**Minimum coverage target**: 80% (`unit_test_coverage_min_percent = 80` from `constants.json` slo section), enforced by Vitest `coverage.thresholds`.

**Key E2E scenarios** (Playwright):

```ts
// apps/player/e2e/claim.spec.ts
test('claim flow completes and token is stored', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  // ...step through email, OTP, reveal
});
```

- Screenshot breakpoints: 320, 768, 1024, 1440 (both dark mode — primary — and light mode)
- Verify `useReducedMotion` path: Phaser animation paused, shimmer CSS suppressed
- Verify `HTTP 429` → `RateLimitBanner` renders and inputs are disabled
- Verify `HTTP 401` → token cleared, redirect to `/`

### 9.2 Admin Portal

**Framework**: Vitest (unit), Playwright (E2E)

| Test type | Location | Scope |
|-----------|----------|-------|
| Unit | `apps/admin/src/**/__tests__/*.test.ts` | Pinia store actions (`useAdminAuthStore`, `useConfigStore`), `formatters.ts` |
| E2E | `apps/admin/e2e/*.spec.ts` | Login with TOTP, pet ban/unban, GDPR queue, runtime config update |

**Key E2E scenarios**:
- Login → TOTP enrollment path → standard login with `totpCode`
- `moderator` role cannot access `/admin/config/runtime` (403 → visible error)
- `read_only` role cannot perform mutations (ban, flag)
- Session expiry → redirect to `/admin/login`

### 9.3 Visual Regression

Playwright screenshots are taken at 320, 768, 1024, and 1440px breakpoints for:
- `LandingPage` (with and without pet token in localStorage)
- `PetPage` (Common, Rare, Epic, Legendary rarity)
- `BattleResultPage` (WIN and LOSS variants)
- `LeaderboardPage` (with `OwnerRankBanner` visible)
- `ArenaPage` (matchmaking state, rate-limited state)
- `GdprPage` (form and status banner states)

---

STEP_COMPLETE: FRONTEND
