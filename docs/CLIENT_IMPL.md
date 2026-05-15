# CLIENT_IMPL — Client Implementation Specification
<!-- SDLC Layer 4: Implementation Engineering -->
<!-- Upstream: EDD.md (tech stack, architecture) + FRONTEND.md (design) + VDD.md (visual) + ARCH.md (system) -->
<!-- Scope: Player App (React 18 + Phaser 3). Admin Portal (Vue 3 + Element Plus) is excluded — see ADMIN_IMPL.md if generated. -->

---

## Document Control

| Field | Content |
|-------|---------|
| **DOC-ID** | CLIENT_IMPL-PIXEL-PET-ARENA-20260503 |
| **Project Name** | pixel-pet-arena |
| **Client Engine / Framework** | React 18 + Phaser 3 (Player App) |
| **Engine Version** | React 18.x · Phaser 3.x · TypeScript 5.x · Vite 5.x |
| **Target Platform** | Web (HTML5 SPA — Vercel CDN) |
| **Document Version** | v1.0 |
| **Status** | DRAFT |
| **Author** | AI Generated (gendoc CLIENT_IMPL) |
| **Date** | 2026-05-03 |
| **Upstream EDD** | [EDD.md](EDD.md) |
| **Upstream VDD** | [VDD.md](VDD.md) |
| **Upstream ARCH** | [ARCH.md](ARCH.md) |
| **Upstream FRONTEND** | [FRONTEND.md](FRONTEND.md) |

---

## Change Log

| Version | Date | Author | Change Summary |
|---------|------|--------|----------------|
| v1.0 | 2026-05-03 | AI Generated (gendoc CLIENT_IMPL) | Initial draft |

---

## §1 Client Overview

### §1.1 Engine / Framework Summary

| Item | Spec |
|------|------|
| **Engine / Framework** | React 18 + Phaser.js 3 |
| **Version** | React 18.x, Phaser 3.x |
| **Language** | TypeScript 5.x |
| **Build Tool** | Vite 5.x |
| **Target Platform** | Web (HTML5, browser SPA — no SSR) |
| **Minimum Browser Support** | Chrome 100+, Firefox 100+, Safari 15+; WebGL with Canvas 2D fallback |
| **Package Manager** | pnpm (workspace-aware monorepo) |

### §1.2 Selection Rationale

React 18 handles all UI chrome — accessible forms (claim, GDPR), stat tables, navigation, leaderboard, and route-level code splitting. Phaser.js 3 handles the HTML5 Canvas game surface — per-frame sprite animation, WebGL rendering, interaction physics, and the arena battle animation. Dynamic `import()` of Phaser ensures it never enters the initial JS bundle, keeping FCP inside the ≤ 1.5 s target (`FCP_SECONDS = 1.5`) even though Phaser itself is ~1 MB minified.

The pixel-art design system (dark navy, rarity color tiers, `Press Start 2P` font, 8px grid) is implemented entirely in CSS custom properties (`tokens.css`). All rarity shimmers and glow effects run as CSS animations on paint-only properties (`box-shadow`, `border-color`) and compositor properties (`opacity`) — no layout reflow and no Phaser involvement for purely decorative effects.

The admin portal (Vue 3 + Element Plus) is a completely separate Vite application. No code from the player app leaks into the admin portal build. Both apps are served from Vercel CDN as independent SPA deployments.

### §1.3 Backend Integration

| Integration Point | Method |
|-------------------|--------|
| API calls | REST over HTTPS — `axios` with request/response interceptors in `src/lib/apiClient.ts` |
| Player auth | `Authorization: Bearer <pet_access_token>` — token stored in `localStorage`, read per-request |
| Admin auth | httpOnly session cookie (`SameSite=Strict`) — not applicable to player app |
| Leaderboard polling | TanStack Query `refetchInterval: 30_000` ms mirrors `LEADERBOARD_UPDATE_LAG_MAX_SECONDS = 30` |
| Arena matchmaking | HTTP long-poll on `POST /api/v1/arena/enter` — server holds connection ≤ 30 s |
| Feature flags | Build-time environment variables (`import.meta.env.VITE_FF_*`) — no runtime API fetch in Phase 1; `config:runtime` Redis key (TTL 300 s) is a server-side cache used only by the API server |

---

## §2 Project Structure

### §2.1 Directory Structure

```
pixel-pet-arena/                         ← monorepo root
├── package.json                         ← pnpm workspace root
├── pnpm-workspace.yaml
├── packages/
│   └── shared/                          ← Zod schemas, domain types, constants bridge
│       ├── src/
│       │   ├── schemas/                 ← Shared Zod schemas (Pet, ArenaMatch, etc.)
│       │   ├── types/                   ← Shared TypeScript interfaces
│       │   └── constants.ts             ← Re-exported typed constants from constants.json
│       └── package.json
└── apps/
    ├── api/                             ← Node.js / Fastify game + admin API
    ├── admin/                           ← Vue 3 + Element Plus (separate build — not in scope here)
    └── player/                          ← React 18 + Phaser.js player application
        ├── index.html
        ├── vite.config.ts
        ├── tsconfig.json
        ├── vitest.config.ts
        ├── playwright.config.ts
        └── src/
            ├── main.tsx                 ← React root; QueryClient + router providers
            ├── App.tsx                  ← createBrowserRouter + Layout wrapper
            ├── constants.ts             ← Re-exports from packages/shared/constants.ts
            ├── components/
            │   ├── layout/
            │   │   ├── Layout.tsx       ← Header + Outlet wrapper
            │   │   └── NavBar.tsx       ← Visibility driven by hasPetToken prop
            │   ├── landing/
            │   │   ├── LandingPage.tsx
            │   │   ├── ClaimCTA.tsx
            │   │   ├── RarityHint.tsx
            │   │   └── SocialProofCounter.tsx
            │   ├── claim/
            │   │   ├── ClaimPage.tsx
            │   │   ├── ClaimFlow.tsx    ← Compound, max 3 steps (EMAIL_CLAIM_FLOW_STEPS_MAX = 3)
            │   │   ├── ClaimEmailForm.tsx
            │   │   ├── ClaimCodeForm.tsx
            │   │   ├── ExpiryWarning.tsx
            │   │   └── URLReveal.tsx
            │   ├── pet/
            │   │   ├── PetPage.tsx
            │   │   ├── RarityBadge.tsx
            │   │   ├── StatsPanel.tsx
            │   │   ├── StatBar.tsx
            │   │   ├── TrainingEntry.tsx
            │   │   ├── FoodInventory.tsx
            │   │   ├── FoodItem.tsx
            │   │   ├── ArenaEntry.tsx
            │   │   └── NeglectedState.tsx
            │   ├── training/
            │   │   ├── TrainingPage.tsx
            │   │   ├── TrainingActions.tsx
            │   │   ├── TrainingActionCard.tsx
            │   │   ├── StatChangeIndicator.tsx
            │   │   ├── DailyResetTimer.tsx
            │   │   └── TrainingStreak.tsx
            │   ├── arena/
            │   │   ├── ArenaPage.tsx
            │   │   ├── ArenaScene.tsx   ← React host for Phaser arena scene
            │   │   ├── ModeSelector.tsx
            │   │   ├── PreBattlePanel.tsx
            │   │   ├── MatchmakingStatus.tsx
            │   │   ├── AIOfferModal.tsx
            │   │   ├── RateLimitBanner.tsx
            │   │   ├── BattleResultPage.tsx
            │   │   ├── BattleResultCard.tsx
            │   │   ├── StatComparison.tsx
            │   │   └── ShareBattleButton.tsx
            │   ├── leaderboard/
            │   │   ├── LeaderboardPage.tsx
            │   │   ├── LeaderboardTable.tsx
            │   │   ├── LeaderboardRow.tsx
            │   │   ├── RarityFilter.tsx
            │   │   └── OwnerRankBanner.tsx
            │   ├── records/
            │   │   ├── BattleRecordsPage.tsx
            │   │   ├── PetSummaryCard.tsx
            │   │   └── BattleHistoryTable.tsx
            │   ├── gdpr/
            │   │   ├── GdprPage.tsx
            │   │   ├── GdprRequestForm.tsx
            │   │   └── GdprStatusBanner.tsx
            │   ├── marketplace/         ← FF_MARKETPLACE only
            │   │   └── MarketplacePage.tsx
            │   └── canvas/
            │       ├── PetCanvas.tsx    ← React host div; manages Phaser lifecycle
            │       └── PetCanvasEngine.ts  ← SOLE Phaser import boundary
            ├── hooks/
            │   ├── usePet.ts            ← TanStack Query: GET /api/v1/pets/:petId
            │   ├── useLeaderboard.ts    ← TanStack Query + refetchInterval: 30_000
            │   ├── useArenaHistory.ts
            │   ├── useTraining.ts       ← Mutation: POST /api/v1/pets/:petId/train
            │   ├── useFeed.ts           ← Mutation: POST /api/v1/pets/:petId/feed
            │   ├── useClaim.ts          ← Mutations: POST /api/v1/claim + /verify
            │   ├── useReducedMotion.ts  ← window.matchMedia prefers-reduced-motion
            │   └── usePetToken.ts       ← localStorage read/write helpers
            ├── store/
            │   └── useAppStore.ts       ← Zustand: arena slice, claim slice, toast slice
            ├── lib/
            │   ├── apiClient.ts         ← Axios instance; Bearer token interceptor
            │   ├── tokenStorage.ts      ← getPetToken / setPetToken / clearPetToken
            │   ├── petGeneration.ts     ← seed → AttributeVector (deterministic, 6 dims)
            │   └── spriteLoader.ts      ← Phaser preload helper utilities
            ├── schemas/
            │   ├── pet.ts               ← Zod schema: PetResponse
            │   ├── claim.ts             ← Zod schema: ClaimResponse, VerifyResponse
            │   ├── arena.ts             ← Zod schema: ArenaEnterResponse
            │   └── leaderboard.ts       ← Zod schema: LeaderboardResponse
            ├── styles/
            │   ├── tokens.css           ← CSS custom properties (design tokens from VDD §6)
            │   ├── typography.css       ← Press Start 2P + Inter font declarations
            │   ├── rarity.css           ← Rarity tier animations (legendary-shimmer, epic-shimmer)
            │   └── global.css           ← Reset + base element styles
            └── types/
                └── index.ts             ← Shared TypeScript types for player app
```

### §2.3 Pixel Art Rendering Rules

> Ref: ARCH §2.1 — pixel-art canvas requirements.

The Phaser `<canvas>` element rendered by `PetCanvas.tsx` must preserve hard pixel boundaries. Apply the following CSS directly to the `<canvas>` element via the `PetCanvas.tsx` component class or inline style:

```css
canvas.pet-canvas {
  image-rendering: pixelated;       /* Chrome, Edge, Opera */
  image-rendering: crisp-edges;     /* Firefox, Safari */
}
```

`PetCanvas.tsx` adds `className="pet-canvas"` to the host `<div>` and the rule cascades to the `<canvas>` child generated by Phaser.

#### WebGL Unavailable — Canvas 2D Fallback

When WebGL is not available in the browser (e.g., software rendering, hardware acceleration disabled), Phaser falls back to Canvas 2D renderer automatically via `renderer: Phaser.AUTO`. In this fallback mode:

- The sprite animation loop is **not started** (`sprite.anims.stop()` called after `create()`).
- The **static first frame** of the sprite sheet is displayed instead.
- No particle systems or tweens are activated.
- The `image-rendering` CSS rules above remain in effect so the static frame stays crisp.

This ensures a functional, non-broken display on Canvas 2D without requiring a full animation loop. Detect renderer mode via `this.sys.game.renderer.type === Phaser.CANVAS` inside scene `create()`.

---

### §2.2 Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Pages / Components** | `PascalCase.tsx` | `PetPage.tsx`, `TrainingActionCard.tsx` |
| **Hooks** | `useCamelCase.ts` | `usePet.ts`, `useReducedMotion.ts` |
| **Zustand Store** | `useCamelCaseStore.ts` | `useAppStore.ts` |
| **API Service / Lib** | `camelCase.ts` | `apiClient.ts`, `tokenStorage.ts` |
| **Zod Schema files** | `camelCase.ts` in `schemas/` | `pet.ts`, `arena.ts` |
| **CSS Modules** | `ComponentName.module.css` | `PetPage.module.css` |
| **Phaser Scene classes** | `PascalCaseScene` inside `PetCanvasEngine.ts` | `PetIdleScene`, `ArenaBattleScene` |
| **Sprite sheets** | `pet-{seed}-sheet.png` | `pet-1234567890-sheet.png` |
| **CSS tokens** | `--color-*`, `--text-*`, `--space-*` | `--color-brand-primary`, `--text-h1` |
| **Constants (TS)** | `UPPER_SNAKE_CASE` | `SPRITE_RESOLUTION_PX`, `TRAINING_ACTIONS_PER_DAY` |

---

## §3 Page / View Structure

### §3.1 Page List

| ID | Route | Component | Description | Auth Required |
|----|-------|-----------|-------------|--------------|
| P-01 | `/` | `LandingPage` | Guest entry; animated pet canvas, rarity hint, claim CTA | None |
| P-02 | `/claim` | `ClaimPage` → `ClaimFlow` | 3-step compound: email → OTP → URL reveal | None |
| P-03 | `/pet/:petId` | `PetPage` | Pet stats, training entry, food, arena entry | Optional (Bearer token for owner features) |
| P-04 | `/pet/:petId/train` | `TrainingPage` | 3 training actions/day; stat change indicator | Required (owner) |
| P-05 | `/pet/:petId/records` | `BattleRecordsPage` | Last 20 battle history | None (public) |
| P-06 | `/arena` | `ArenaPage` | Mode select, matchmaking, arena animation | Required (owner) |
| P-07 | `/arena/result/:matchId` | `BattleResultPage` | WIN/LOSS card, stat comparison, share | None (public) |
| P-08 | `/leaderboard` | `LeaderboardPage` | Top 100 pets, rarity filter, owner rank banner | None (public) |
| P-09 | `/gdpr` | `GdprPage` | GDPR self-service request form + status | Required (owner); route loader guard |
| P-10 | `/marketplace` | `MarketplacePage` | Browse/list/buy — `FF_MARKETPLACE` only | Optional |

### §3.2 Component Tree Structure

```
<App>  (App.tsx — createBrowserRouter, React Router v6)
└── <Layout>  (Layout.tsx)
    ├── <header>
    │   └── <NavBar hasPetToken={boolean}>
    │         ├── Logo (Press Start 2P wordmark)
    │         ├── <nav aria-label="Main navigation">
    │         │   ├── Link: Leaderboard
    │         │   ├── Link: Arena (hasPetToken only)
    │         │   └── Link: My Pet (hasPetToken only)
    │         └── ClaimCTA (no token) | PetAvatarLink (has token)
    └── <main>
        └── <Outlet />  ← React Router renders page chunk here
            │
            ├── <LandingPage>  [/]
            │   ├── <PetCanvas seed rarity interactive />   ← Phaser instance via PetCanvasEngine
            │   ├── <RarityHint />
            │   ├── <ClaimCTA />
            │   └── <SocialProofCounter />
            │
            ├── <ClaimPage>  [/claim]
            │   └── <ClaimFlow>  (3 steps — EMAIL_CLAIM_FLOW_STEPS_MAX = 3)
            │       ├── step="email"  → <ClaimEmailForm />  + <ExpiryWarning />
            │       ├── step="code"   → <ClaimCodeForm />   + <ExpiryWarning minutesRemaining />
            │       └── step="reveal" → <URLReveal petUrl petToken />
            │
            ├── <PetPage>  [/pet/:petId]
            │   ├── <PetCanvas seed rarity />
            │   ├── <RarityBadge rarity />
            │   ├── <StatsPanel>
            │   │   ├── <StatBar stat="speed" value max />
            │   │   ├── <StatBar stat="strength" value max />
            │   │   └── <StatBar stat="stamina" value max />
            │   ├── <TrainingEntry />       (owner only — links to /pet/:petId/train)
            │   ├── <FoodInventory>
            │   │   └── <FoodItem /> × N
            │   ├── <ArenaEntry battlesRemaining />
            │   └── <NeglectedState />      (conditional: last_trained_at > TRAINING_NEGLECT_THRESHOLD_DAYS = 3 days)
            │
            ├── <TrainingPage>  [/pet/:petId/train]
            │   ├── <TrainingActions>
            │   │   └── <TrainingActionCard type stat value remaining /> × 3
            │   ├── <StatChangeIndicator delta stat />   (visible 2 s — TRAINING_STAT_DISPLAY_DURATION_SECONDS = 2)
            │   ├── <DailyResetTimer />    (aria-live="polite", throttled announcements)
            │   └── <TrainingStreak />
            │
            ├── <BattleRecordsPage>  [/pet/:petId/records]
            │   ├── <PetSummaryCard />
            │   └── <BattleHistoryTable battles={last20} />   (ARENA_BATTLE_RECORDS_DISPLAY_COUNT = 20)
            │
            ├── <ArenaPage>  [/arena]
            │   ├── <RateLimitBanner />    (role="alert" — shown on 429)
            │   ├── <ModeSelector mode onChange />   (RACE | SUMO)
            │   ├── <PreBattlePanel />
            │   ├── <MatchmakingStatus />  (aria-live="polite" aria-busy="true")
            │   ├── <AIOfferModal />       (role="dialog" aria-modal focus trap — after 30 s timeout)
            │   └── <ArenaScene />         ← Phaser battle animation scene (dynamically loaded)
            │
            ├── <BattleResultPage>  [/arena/result/:matchId]
            │   ├── <BattleResultCard result="WIN"|"LOSS" />
            │   ├── <StatComparison />
            │   ├── <ShareBattleButton />
            │   └── ActionButtons (Play Again / View Leaderboard)
            │
            ├── <LeaderboardPage>  [/leaderboard]
            │   ├── <RarityFilter />       (URL state: ?rarity=EPIC)
            │   ├── <LeaderboardTable>
            │   │   └── <LeaderboardRow /> × 100   (LEADERBOARD_TOP_DISPLAY = 100)
            │   └── <OwnerRankBanner />    (role="status" — if pet token present)
            │
            ├── <GdprPage>  [/gdpr]   (route loader: redirects to / if no token)
            │   ├── <GdprRequestForm types=[erasure|data_access|...] />
            │   └── <GdprStatusBanner jobId status />   (polls GET /api/v1/gdpr/request/status)
            │
            └── <MarketplacePage>  [/marketplace]   (FF_MARKETPLACE only)
```

### §3.3 Page Transition Logic

| From | To | Trigger | Transition |
|------|----|---------|-----------|
| LandingPage | ClaimPage | `ClaimCTA` click | React Router `navigate('/claim')` |
| ClaimFlow step=email | ClaimFlow step=code | `POST /api/v1/claim` success | Zustand `setClaimStep('code')` |
| ClaimFlow step=code | ClaimFlow step=reveal | `POST /api/v1/claim/verify` success | `setClaimStep('reveal')` + `setPetToken(token)` |
| ClaimFlow step=reveal | PetPage | Auto-navigate after token stored | `navigate('/pet/:petId')` |
| PetPage | TrainingPage | `TrainingEntry` click | `navigate('/pet/:petId/train')` |
| PetPage | ArenaPage | `ArenaEntry` click | `navigate('/arena')` |
| ArenaPage | BattleResultPage | Arena match complete | `navigate('/arena/result/:matchId')` |
| Any authenticated page | LandingPage (`/`) | HTTP 401 from API | `clearPetToken()` + `navigate('/')` |
| GdprPage (no token) | LandingPage | Route loader guard | `throw redirect('/')` |

---

## §4 Asset Pipeline

### §4.1 Asset Directory Structure

```
apps/player/src/
└── assets/
    ├── images/
    │   ├── ui/                      ← Non-sprite UI images (logos, icons)
    │   │   └── logo.png
    │   └── backgrounds/
    │       ├── bg_arena_race.png    ← 16×8px tile, repeating pattern
    │       └── bg_arena_sumo.png
    ├── fonts/                       ← Local font fallbacks (optional; primary from Google Fonts)
    └── sprites/                     ← Served from /public/sprites/ for Phaser dynamic load
        └── pet-{seed}-sheet.png     ← Generated sprite sheets; 32×32 px per frame
```

Sprite sheets are served from Vercel's CDN `/public/sprites/` directory and are loaded dynamically by Phaser's `this.load.spritesheet()` call — they are never bundled into the Vite output.

### §4.2 Asset Naming Conventions

| Asset Type | Prefix / Rule | Example |
|-----------|--------------|---------|
| UI image | `ui_{name}` | `ui_logo.png` |
| Background | `bg_{context}_{layer}` | `bg_arena_race.png` |
| Pet sprite sheet | `pet-{seed}-sheet.png` | `pet-1234567890123456789-sheet.png` |
| CSS token file | `{category}.css` | `tokens.css`, `rarity.css` |
| Font (local) | `{family}-{weight}.woff2` | `press-start-2p-regular.woff2` |

### §4.3 Asset Loading Strategy

| Asset Type | Load Method | Timing | Notes |
|-----------|-------------|--------|-------|
| CSS tokens / global styles | Imported in `main.tsx` | Eager (entry bundle) | Zero runtime cost; critical path |
| `Press Start 2P` font | `<link rel="preload">` + Google Fonts | Above-fold preload | `font-display: swap`; fallback stack prevents CLS |
| `Inter` 400 + 600 | `<link rel="preload">` + Google Fonts async | Async load | Two weights only; `font-display: swap` |
| Page components | React Router v6 `lazy()` | Route activation | One chunk per route; loading boundary internal to Router |
| `PetCanvasEngine` (Phaser) | Dynamic `import('./PetCanvasEngine')` inside `useEffect` | On `PetCanvas` mount | Phaser is excluded from all eager chunks |
| Pet sprite sheet | `this.load.spritesheet()` inside Phaser `preload()` | Phaser preload phase | Fetched from CDN; cached by browser |
| Arena Phaser scene | Dynamic import inside `ArenaScene.tsx` `useEffect` | On arena route entry | Same isolation pattern as PetCanvasEngine |
| Lazy route chunks | Vite code splitting (manualChunks) | On navigation | `react-vendor`, `query-vendor`, `form-vendor` chunks |

### §4.4 Asset Budget

| Type | Limit | Notes |
|------|-------|-------|
| Single sprite sheet | ≤ 1920 px wide (WebP/PNG) | 32 px frame grid; ≤ 16 colors per sprite (pixel art constraint — VDD §4.2) |
| Audio SFX (single file) | ≤ 200 KB | OGG format preferred (engine default) |
| Background music | ≤ 5 MB per track | Streamed; not used in Phase 1 |
| Entry bundle (eager JS, gzipped) | ≤ 150 KB | React + Router + TanStack Query + Zustand + Zod |
| Total JS bundle (gzipped) | ≤ 300 KB | `TOTAL_JS_BUNDLE_GZIPPED_KB = 300` from CONSTANTS |
| Total CSS bundle (gzipped) | ≤ 50 KB | `TOTAL_CSS_BUNDLE_GZIPPED_KB = 50` from CONSTANTS |

---

## §5 Animation Integration

### §5.0 Phaser Game Configuration

Each Phaser-hosted React component (`PetCanvas.tsx`, `ArenaScene.tsx`) creates its own `Phaser.Game` instance via `PetCanvasEngine.ts`. The configuration object must follow the shape below:

```typescript
// src/canvas/PetCanvasEngine.ts
import Phaser from 'phaser';
import { PetIdleScene } from './scenes/PetIdleScene';

export function createPetGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,           // WebGL with automatic Canvas 2D fallback
    pixelArt: true,              // Disables texture smoothing; preserves hard pixel edges
    backgroundColor: '#0d0d1a', // --color-bg-primary token (VDD §6)
    parent,                     // Mount into the host <div> ref from PetCanvas.tsx
    width: 128,                  // SPRITE_CANVAS_WIDTH_PX (multiples of 32 px grid)
    height: 128,                 // SPRITE_CANVAS_HEIGHT_PX
    scene: [PetIdleScene],       // PetCanvas uses idle scene only
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
  return new Phaser.Game(config);
}

// src/arena/ArenaScene.tsx — separate game instance for battle canvas
import { ArenaBattleScene } from './scenes/ArenaBattleScene';

export function createArenaGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    pixelArt: true,
    backgroundColor: '#0d0d1a',
    parent,
    width: 480,
    height: 160,
    scene: [ArenaBattleScene],   // Arena uses battle scene only
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
  return new Phaser.Game(config);
}
```

Key constraints:
- `type: Phaser.AUTO` — enables WebGL with automatic Canvas 2D fallback (see §2.3).
- `pixelArt: true` — sets `roundPixels: true` and disables texture smoothing on WebGL and Canvas 2D contexts.
- `parent` is passed the `ref.current` `HTMLElement` from the React host component; Phaser mounts the `<canvas>` as a child of that element.
- `backgroundColor` must match `--color-bg-primary` (`#0d0d1a`) from `tokens.css` to prevent flash-of-white on scene load.
- Scene arrays are **single-scene** per game instance. `PetIdleScene` is never loaded into an arena game and vice versa.
- Both game instances are destroyed in the React `useEffect` cleanup: `game.destroy(true)` (removes canvas DOM node).

---

### §5.1 Animation List

| Anim ID | Name | Target | Duration | Loop | Trigger |
|---------|------|--------|----------|------|---------|
| ANIM-01 | Pet Idle | `PetIdleScene` sprite | Continuous (≥ 4 frames at 30 FPS) | Yes | `PetCanvas` mount |
| ANIM-02 | Pet Bounce (Interaction) | `PetIdleScene` sprite | 200 ms (2-frame: scale 1.15× → 1×) | No | Click / tap on canvas |
| ANIM-03 | Pet Training Effort | `PetIdleScene` sprite | 400 ms (3-frame) | No | Successful training action |
| ANIM-04 | Neglected State | PetCanvas container CSS | Persistent while neglected | Yes (`filter` held) | `isNeglected = true` (> `TRAINING_NEGLECT_THRESHOLD_DAYS = 3` days without training) |
| ANIM-05 | Legendary Shimmer | RarityBadge / PetCanvas border | 2 s ease-in-out infinite | Yes | LEGENDARY rarity pet displayed |
| ANIM-06 | Epic Shimmer | RarityBadge / PetCanvas border | 3 s linear infinite | Yes | EPIC rarity pet displayed |
| ANIM-07 | Stat Change Indicator | `StatChangeIndicator` DOM | 2 s (`translateY` + `opacity` fade out) | No | Training action success (`TRAINING_STAT_DISPLAY_DURATION_SECONDS = 2`) |
| ANIM-08 | Battle Race Cycle | `ArenaBattleScene` sprites | 5–15 s window (8-frame run loop) | Until result | Arena match active (`ARENA_MATCH_DURATION_MIN/MAX_SECONDS = 5–15 s`) |
| ANIM-09 | Battle Victory Burst | `ArenaBattleScene` particles | ~1 s (24-particle gold burst, 2×2 px) | No | Winner determined |
| ANIM-10 | Pre-Battle Countdown | `ArenaPage` CSS / DOM | 3 s (3-2-1 pixel font countdown) | No | Opponent found, before match starts |
| ANIM-11 | Matchmaking Dots | `MatchmakingStatus` CSS | Loop during queue wait | Yes | Arena long-poll in flight |
| ANIM-12 | Daily Reset Timer Countdown | `DailyResetTimer` DOM | Live seconds countdown | Yes (every 1 s) | Training actions exhausted (`actionsRemainingToday = 0`) |

### §5.2 Animation Trigger Map

| Game / UI Event | Animation Triggered | Implementation |
|-----------------|--------------------|-----------------------|
| `PetCanvas` mounts | ANIM-01 Pet Idle | `PetCanvasEngine.create()` calls `sprite.play('idle')` |
| Click / tap on `PetCanvas` | ANIM-02 Pet Bounce | Phaser `this.input.on('pointerdown')` → tween scale 1.15× then 1× over 200 ms |
| `submitTraining` mutation succeeds | ANIM-03 Training Effort + ANIM-07 Stat Indicator | Phaser event emitter → idle scene plays effort; React: `setShowIndicator(true)` — hides after `TRAINING_STAT_DISPLAY_DURATION_SECONDS = 2 s` |
| `isNeglected = true` | ANIM-04 Neglected | CSS class `.pet-canvas--neglected` applies `filter: grayscale(60%) brightness(0.8)` |
| LEGENDARY pet loaded | ANIM-05 Legendary Shimmer | CSS class `rarity-legendary` — `legendary-shimmer 2s ease-in-out infinite` from `rarity.css` |
| EPIC pet loaded | ANIM-06 Epic Shimmer | CSS class `rarity-epic` — `epic-shimmer 3s linear infinite` from `rarity.css` |
| Arena match active | ANIM-08 Battle Race Cycle | `ArenaBattleScene.create()` starts 8-frame run cycle anims on both sprites |
| Winner determined | ANIM-09 Victory Burst | `ArenaBattleScene` emits 24 gold 2×2 particles from winner sprite via `Phaser.GameObjects.Particles` |
| Opponent found | ANIM-10 Countdown | React state drives DOM countdown: "3" → "2" → "1" with CSS `transform: scale` pulse |
| Long-poll in flight | ANIM-11 Matchmaking Dots | CSS `@keyframes dots` on `MatchmakingStatus` text |

### §5.3 Animation State Machine

```
PetIdleScene Phaser animation states:

  IDLE ──────────────────────► IDLE
  (looping, 4–8 frames, 30 FPS)

  IDLE ─── pointerdown ───────► BOUNCE ─── 200 ms ──► IDLE
  (scale 1.15× frame 1, return to 1× frame 2)

  IDLE ─── train success ─────► EFFORT ─── 400 ms ──► IDLE
  (3-frame effort sequence)

  IDLE ─── isNeglected=true ──► NEGLECTED
  (CSS filter overlay — Phaser animation continues paused on static frame if reducedMotion=true)

  ANY ──── useReducedMotion() ─► STATIC
  (Phaser animation loop paused; static first frame rendered; no particles)

ArenaBattleScene states:

  WAIT ──── match start ──────► RUNNING (both pets: 8-frame run cycle loop)
  RUNNING ─ result received ──► VICTORY (winner: 4-frame victory; loser: exit left/right)
  VICTORY ─ 1 s elapsed ──────► DONE (scene destroyed; React navigates to /arena/result/:matchId)
```

### §5.4 Animation Performance Rules

| Rule | Limit | Notes |
|------|-------|-------|
| Simultaneous Phaser animations on screen | ≤ 20 (React / web target) | Typically 1–2 sprites active; arena scene adds 2 |
| Simultaneous CSS animations | ≤ 20 | Rarity shimmers animate paint-only properties (`box-shadow`, `border-color`); no layout reflow |
| Particle count per burst | ≤ 200 | Victory burst is 24 particles — well within budget (Phaser `GameObjects.Particles` built-in system; no tsparticles dependency) |
| Animation clip max duration | 15 s | Arena match max is `ARENA_MATCH_DURATION_MAX_SECONDS = 15 s` |
| `prefers-reduced-motion: reduce` | Pause all Phaser loops; suppress CSS shimmers | `useReducedMotion()` hook; `@media (prefers-reduced-motion: reduce) { .rarity-legendary, .rarity-epic { animation: none; } }` |

### §5.5 Phaser–React Event Bridge

> Ref: ARCH ADR-003 — communication between Phaser scenes and React must use a typed event emitter bridge, not direct prop mutation or Zustand calls from within Phaser scene code.

#### Bridge File

**`src/lib/phaserBridge.ts`** — singleton `EventEmitter` instance shared between Phaser scenes and React components.

```typescript
// src/lib/phaserBridge.ts
import mitt from 'mitt';

// ── Event payload types ──────────────────────────────────────────────────────

export type TrainingSuccessPayload = {
  petId: string;
  expGained: number;
  newLevel?: number;     // present only when a level-up occurred
};

export type BattleResultPayload = {
  matchId: string;
  outcome: 'WIN' | 'LOSS';
  opponentPetId: string;
};

export type PetLevelUpPayload = {
  petId: string;
  oldLevel: number;
  newLevel: number;
};

// ── Event map ────────────────────────────────────────────────────────────────

export type BridgeEvents = {
  'training:success': TrainingSuccessPayload;
  'battle:result':    BattleResultPayload;
  'pet:levelup':      PetLevelUpPayload;
};

// ── Singleton emitter ────────────────────────────────────────────────────────

export const phaserBridge = mitt<BridgeEvents>();
```

#### Usage — Phaser Scene (emit)

```typescript
// Inside PetIdleScene.ts — after training animation completes
import { phaserBridge } from '../../lib/phaserBridge';

// Emitted when the Phaser scene receives a training-success signal from the API layer
phaserBridge.emit('training:success', {
  petId: this.petId,
  expGained: delta.exp,
  newLevel: delta.newLevel ?? undefined,
});
```

#### Usage — React Component (subscribe)

```typescript
// Inside TrainingPage.tsx or a custom hook
import { useEffect } from 'react';
import { phaserBridge, TrainingSuccessPayload } from '../../lib/phaserBridge';

useEffect(() => {
  const handler = (payload: TrainingSuccessPayload) => {
    // Trigger React state update — e.g. show StatChangeIndicator or invalidate query
    setShowIndicator(true);
    queryClient.invalidateQueries({ queryKey: ['pet', payload.petId] });
  };

  phaserBridge.on('training:success', handler);

  // Cleanup on unmount — prevents memory leaks and stale listeners
  return () => {
    phaserBridge.off('training:success', handler);
  };
}, [queryClient]);
```

#### Cleanup on Scene Destroy

Every Phaser scene that emits bridge events must remove its listeners in the scene's `destroy` (or `shutdown`) lifecycle method to prevent memory leaks:

```typescript
// PetIdleScene.ts
shutdown(): void {
  // Remove all handlers this scene registered — use named references not anonymous functions
  phaserBridge.off('training:success');
  // If scene subscribed to bridge events (less common), remove those too
}
```

#### Event Enum Reference

| Event key | Direction | Payload type | Trigger |
|-----------|-----------|--------------|---------|
| `training:success` | Phaser → React | `TrainingSuccessPayload` | Training effort animation complete; API success already confirmed |
| `battle:result` | Phaser → React | `BattleResultPayload` | `ArenaBattleScene` receives match result from server; victory animation ends |
| `pet:levelup` | Phaser → React | `PetLevelUpPayload` | Level-up threshold crossed (derived from `expGained` in `training:success`) |

---

## §6 Audio Integration

Audio is not part of Phase 1 scope. No background music or SFX library is included in the player app build. The audio sections below document the planned Phase 2 integration approach for reference.

### §6.1 Audio List (Phase 2 — Planned)

| Audio ID | Name | Type | File | Trigger | Volume | Loop |
|----------|------|------|------|---------|--------|------|
| SFX-01 | UI Click | SFX | `sfx_ui_click.ogg` | Button / CTA click | 0.5 | No |
| SFX-02 | Claim Success | SFX | `sfx_claim_success.ogg` | `URLReveal` mount | 0.8 | No |
| SFX-03 | Training Complete | SFX | `sfx_training_done.ogg` | Training mutation success | 0.7 | No |
| SFX-04 | Battle Victory | SFX | `sfx_battle_win.ogg` | WIN result received | 0.9 | No |
| SFX-05 | Battle Defeat | SFX | `sfx_battle_loss.ogg` | LOSS result received | 0.6 | No |
| BGM-01 | Arena BGM | BGM | `bgm_arena.ogg` | Arena route enter | 0.4 | Yes |

### §6.2 Audio Trigger Map (Phase 2 — Planned)

| Game / UI Event | Play Audio | Stop Audio | Implementation |
|-----------------|-----------|-----------|----------------|
| Button / CTA click | SFX-01 | — | `useAudio().play('sfx_ui_click')` |
| Claim step=reveal mounts | SFX-02 | — | `useEffect` in `URLReveal` |
| Training mutation success | SFX-03 | — | `useMutation onSuccess` callback |
| Battle WIN result | SFX-04 | BGM-01 | `BattleResultCard` WIN variant `useEffect` |
| Battle LOSS result | SFX-05 | BGM-01 | `BattleResultCard` LOSS variant `useEffect` |
| Arena route enter | BGM-01 | — | `ArenaPage` `useEffect` on mount |
| Arena route leave | — | BGM-01 | `ArenaPage` `useEffect` cleanup |

### §6.3 Audio Manager Architecture (Phase 2 — Planned)

```typescript
// src/hooks/useAudio.ts — Howler.js-based hook
// const { play, stop, setVolume } = useAudio()
// Howl instances cached in Map<string, Howl>:
//   BGM: { loop: true, html5: true }   ← streaming, not decoded into memory
//   SFX: { preload: true }             ← decoded AudioBuffer in memory
//
// Only initialized AFTER first user gesture (Web Audio API autoplay policy)
// useReducedMotion() = true → setVolume(0) on all channels (silent mode)
```

### §6.4 Audio Performance Rules (Phase 2 — Planned)

| Rule | Limit |
|------|-------|
| Simultaneous SFX | ≤ 16 concurrent Howl instances |
| Howl instance cache | ≤ 50 cached instances |

---

## §7 Visual Effects Integration

### §7.1 VFX List

| VFX ID | Name | Type | Timing | Trigger | Lifecycle |
|--------|------|------|--------|---------|-----------|
| VFX-01 | Legendary CRT Glow | CSS box-shadow pulse | Continuous while Legendary pet visible | `rarity === 'LEGENDARY'` | Tied to component mount/unmount |
| VFX-02 | Epic Border Shimmer | CSS border-color sweep | Continuous while Epic pet visible | `rarity === 'EPIC'` | Tied to component mount/unmount |
| VFX-03 | Rare Teal Glow | CSS static box-shadow | Always on while Rare pet visible | `rarity === 'RARE'` | Static — no animation; just a shadow value |
| VFX-04 | Victory Particle Burst | Phaser GameObjects.Particles | On arena win | Winner determined | 24 gold 2×2px squares, ~1 s duration, then destroyed |
| VFX-05 | Stat Change Float | CSS `translateY` + `opacity` fade | 2 s, single play | Training action success | Component hidden after `TRAINING_STAT_DISPLAY_DURATION_SECONDS = 2 s` |
| VFX-06 | Neglect Desaturation | CSS `filter` | Persistent | `isNeglected = true` | Removed when pet trains (`usePet` cache invalidated) |
| VFX-07 | Hard-offset pixel shadow | CSS `box-shadow: 4px 4px 0px #0d0d1a` | Static | All raised card / panel elements | VDD §2.5 elevation model — never animated |

### §7.2 VFX Trigger Map

| Game / UI Event | Effect Applied | Implementation |
|-----------------|---------------|----------------|
| LEGENDARY pet rendered | VFX-01 CRT Glow | CSS class `rarity-legendary` on PetCanvas wrapper; `box-shadow: 0 0 12px rgba(253,203,110,0.4), 0 0 24px rgba(253,203,110,0.2)` pulsing via `legendary-shimmer` keyframe |
| EPIC pet rendered | VFX-02 Epic Shimmer | CSS class `rarity-epic`; `border-color` sweeps hue 280 → 290 → 270 via `epic-shimmer` keyframe |
| RARE pet rendered | VFX-03 Teal Glow | CSS class `rarity-rare`; static `box-shadow: 0 0 8px rgba(78,205,196,0.4)` |
| Arena win determined | VFX-04 Particle Burst | `ArenaBattleScene.onResult('WIN')` → `this.add.particles(x, y, 'gold-2x2', { ... })` with `lifespan: 1000` |
| Training stat delta | VFX-05 Stat Float | React: `StatChangeIndicator` CSS `@keyframes stat-float` — `translateY(-32px)` + `opacity 0 → 1 → 0` |
| `isNeglected = true` | VFX-06 Desaturation | CSS class `.pet-canvas--neglected` applies `filter: grayscale(60%) brightness(0.8)` |

### §7.3 VFX Performance Rules

| Rule | Limit | Notes |
|------|-------|-------|
| Simultaneous CSS / Canvas effects | ≤ 10 on screen | Rarity effects are one per visible pet |
| Particle count per burst | ≤ 200 | Victory burst = 24 particles (well below limit) |
| CSS animation properties | `box-shadow`, `border-color`, `opacity`, `transform` only | No layout-affecting properties — VDD §1.2 Principle 4 |

---

## §8 UI Flow State Machine

### §8.1 UI State List

| State ID | Name | Description | Visible UI |
|----------|------|-------------|------------|
| UI-01 | GuestLanding | No pet token; guest browsing | LandingPage, PetCanvas (random pet), ClaimCTA |
| UI-02 | ClaimEmail | Claim step 1 | ClaimEmailForm, ExpiryWarning (if ≤ 2 min remain) |
| UI-03 | ClaimCode | Claim step 2 — OTP entry | ClaimCodeForm, ExpiryWarning |
| UI-04 | ClaimReveal | Claim step 3 — URL reveal | URLReveal with copy button |
| UI-05 | PetOwner | Has pet token; viewing own pet | PetPage with all owner-only sections (TrainingEntry, FoodInventory, ArenaEntry) |
| UI-06 | Training | Training session active | TrainingPage, TrainingActionCard ×3, DailyResetTimer |
| UI-07 | TrainingExhausted | All 3 daily actions used | TrainingPage with cards disabled, DailyResetTimer |
| UI-08 | ArenaMatchmaking | Waiting for opponent | ArenaPage: MatchmakingStatus, animated dots; long-poll in flight |
| UI-09 | ArenaBattle | Battle animation playing | ArenaScene (Phaser), countdown → battle sequence |
| UI-10 | ArenaResult | Battle concluded | BattleResultPage: WIN/LOSS card, StatComparison, ShareButton |
| UI-11 | ArenaRateLimited | 429 from arena endpoint | RateLimitBanner, Retry-After countdown; arena entry blocked |
| UI-12 | LeaderboardView | Public leaderboard | LeaderboardTable, RarityFilter, optional OwnerRankBanner |
| UI-13 | GdprForm | GDPR request form | GdprPage, GdprRequestForm |
| UI-14 | GdprStatus | GDPR request submitted | GdprStatusBanner polling |
| UI-15 | Loading | Route chunk or API loading | Suspense fallback / loading skeleton |
| UI-16 | Error | API failure or unhandled error | Toast notification or inline error message |
| UI-17 | NetworkLost | Browser offline | Offline banner (`navigator.onLine = false`); all API calls suspended |

### §8.2 State Transition Rules

| Current State | Event | Next State | Side Effects |
|---------------|-------|------------|-------------|
| UI-01 | Click ClaimCTA | UI-02 | `navigate('/claim')`; `setClaimStep('email')` |
| UI-02 | POST /claim success | UI-03 | `setClaimId(claimId)`; `setClaimStep('code')` |
| UI-03 | POST /claim/verify success | UI-04 | `setPetToken(petToken)`; `setClaimStep('reveal')` |
| UI-04 | Navigate after reveal | UI-05 | `navigate('/pet/:petId')` |
| UI-05 | Click TrainingEntry | UI-06 | `navigate('/pet/:petId/train')` |
| UI-06 | All actions exhausted | UI-07 | Action cards disabled; `DailyResetTimer` activates |
| UI-07 | UTC 00:00 reset | UI-06 | `usePet` cache invalidated; `actionsRemainingToday = TRAINING_ACTIONS_PER_DAY = 3` |
| UI-05 | Click ArenaEntry | UI-08 | `navigate('/arena')`; POST /api/v1/arena/enter begins |
| UI-08 | Opponent found | UI-09 | 3-2-1 countdown → `ArenaScene` mounts |
| UI-08 | 30 s timeout, no AI | UI-08 | `AIOfferModal` shown; `ARENA_MATCHMAKING_TIMEOUT_SECONDS = 30` elapsed |
| UI-08 | Accept AI | UI-09 | Re-POST with `acceptAI: true` |
| UI-08 | 429 response | UI-11 | `RateLimitBanner` shown; `Retry-After` countdown |
| UI-09 | Battle result received | UI-10 | `navigate('/arena/result/:matchId')` |
| UI-11 | Retry-After elapsed | UI-08 | Banner dismissed; arena entry re-enabled |
| Any | HTTP 401 | UI-01 | `clearPetToken()`; `navigate('/')` |
| Any | Network lost | UI-17 | Offline banner; retry on reconnect |

### §8.3 Loading / Error / Network State Handling

| State | Display Method | Timeout Handling | Retry Strategy |
|-------|---------------|-----------------|----------------|
| Loading | React Router v6 internal loading state → skeleton shimmer or spinner in Suspense boundary | Route lazy load: 10 s browser timeout | Hard refresh suggested |
| API Error | Toast notification via Zustand `pushToast` — typed `AppError` message from `apiClient.ts` interceptor | — | User-initiated retry (explicit button) |
| 429 Rate Limit | `RateLimitBanner` with `Retry-After` countdown | Countdown to `retryAt`; auto-dismiss | Automatic re-enable after cooldown |
| Network Lost | Top-bar offline banner (`navigator.onLine` + `window.addEventListener('offline')`) | Indefinite until reconnect | Auto-retry on `online` event for in-flight TanStack Query |

---

## §9 API Integration

### §9.1 API Call List

| API | Trigger | Request | Response Handling | Error Handling |
|-----|---------|---------|------------------|----------------|
| `POST /api/v1/claim` | `ClaimEmailForm` submit | `{ email, petId, ageConfirmed }` | `setClaimId(claimId)`; advance to OTP step | `ALREADY_CLAIMED` → inline message; `429` → cooldown banner |
| `POST /api/v1/claim/verify` | `ClaimCodeForm` submit | `{ claimId, code }` | `setPetToken(petToken)`; advance to reveal | `INVALID_CODE` → shake anim; `CODE_EXPIRED` → re-request flow; `429` → disable inputs + countdown |
| `GET /api/v1/pets/random` | LandingPage mount | — | Seed + rarity → `PetCanvas` props | Show placeholder sprite on error |
| `GET /api/v1/pets/:petId` | `usePet` hook (TanStack Query) | Bearer token (if owner) | Pet stats, `isOwner`, `isNeglected` → render page | 404 → "Pet not found" toast; 401 → `clearPetToken` + redirect |
| `POST /api/v1/pets/:petId/train` | `TrainingActionCard` Train button | `{ trainingType }` | `StatChangeIndicator`; invalidate `usePet` cache | `TRAINING_LIMIT_REACHED` → disable cards + timer; `STAT_AT_MAXIMUM` → toast |
| `POST /api/v1/pets/:petId/feed` | `FoodItem` click | `{ buffType, stat, magnitude, isPermanent }` | Animate stat bar; invalidate `usePet` cache | `STAT_AT_MAXIMUM` → toast; 401 → global handler |
| `POST /api/v1/arena/enter` | `PreBattlePanel` confirm | `{ petId, mode, acceptAI? }` | Navigate to result on success; timeout → `AIOfferModal` | `PET_BANNED` → ban notice; `429` → `RateLimitBanner` |
| `GET /api/v1/arena/match/:matchId` | `BattleResultPage` mount | — | Render WIN/LOSS card + stats | 404 → "Match not found" inline |
| `GET /api/v1/arena/history/:petId` | `BattleRecordsPage` mount | — | Render `BattleHistoryTable` | Empty state if no battles |
| `GET /api/v1/leaderboard` | `useLeaderboard` hook (refetchInterval: 30 s) | `?rarity=&page=&limit=100` | Render `LeaderboardTable` | Stale data shown; error toast |
| `GET /api/v1/leaderboard/rank/:petId` | `OwnerRankBanner` (if token present) | — | Render rank badge | Null rank → hide banner |
| `POST /api/v1/gdpr/request` | `GdprRequestForm` submit | `{ type }` | `jobId` stored; `GdprStatusBanner` activates | 400 → inline form error; 401 → redirect |
| `GET /api/v1/gdpr/request/status` | `GdprStatusBanner` polling | `?jobId=` | Render status (`pending/processing/completed/failed`) | 404 → "Request not found" |

### §9.2 State Synchronisation Strategy

| Data Type | Sync Method | Frequency / Event | Conflict Handling |
|-----------|-------------|-------------------|------------------|
| Pet stats | TanStack Query `staleTime: 30_000` | On mount + `invalidateQueries` on train/feed mutations | Server wins; optimistic update not used (stat deltas are server-computed) |
| Leaderboard | TanStack Query `refetchInterval: 30_000` | Every 30 s + on mount | Latest response replaces cache; no merge |
| Arena rate-limit state | Zustand `arena` slice | Set on 429 response; cleared on timer expiry | Client-side countdown; server is authoritative on next request |
| Claim flow step | Zustand `claimStep` | Mutation success callbacks | No conflict — linear state machine |
| Token | `localStorage` via `tokenStorage.ts` | Written on verify success; cleared on 401 | No conflict — single token per browser |
| Feature flags | Environment variable at build time (`import.meta.env.VITE_FF_*`) | Build-time; no runtime hot-swap in Phase 1 | N/A — static per build |

### §9.3 Offline / Weak Network Handling

| Scenario | Client Behaviour | Retry Strategy | User Notification |
|----------|-----------------|----------------|-------------------|
| **Request timeout** (10 s default Axios timeout) | `apiClient` rejects with `AppError(NETWORK_TIMEOUT)`; TanStack Query marks query as `error` state | Exponential backoff: 1 s → 2 s → 4 s; max 3 retry attempts (`retry: 3` in QueryClient config) | Toast: "Request timed out. Retrying…"; after 3 failures: "Could not reach server. Please check your connection." |
| **Fully offline** (`navigator.onLine = false`) | All outgoing Axios requests are blocked immediately; TanStack Query `paused` (no new fetches) | No active retries while offline; TanStack Query resumes automatically on `window.addEventListener('online')` | Persistent top-bar banner: "You are offline. Changes will sync when reconnected." Banner dismissed automatically on reconnect |
| **Weak network / high latency** | Axios timeout: 10 s; arena long-poll timeout: 35 s (5 s margin over `ARENA_MATCHMAKING_TIMEOUT_SECONDS = 30`) | TanStack Query `retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30_000)` | `MatchmakingStatus` shows "Slow connection detected. Waiting…" after 20 s in queue; no retry for arena (user must re-enter) |

---

## §10 Performance Budget

### §10.1 Rendering Performance

| Metric | Target | Minimum Acceptable | Constant Key |
|--------|--------|--------------------|----|
| FCP (First Contentful Paint) | ≤ 1.5 s | ≤ 2.0 s | `FCP_SECONDS = 1.5` |
| LCP (Largest Contentful Paint) | ≤ 2.5 s | ≤ 3.0 s | `LCP_SECONDS = 2.5` |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.15 | `CLS_SCORE = 0.1` |
| INP (Interaction to Next Paint) | ≤ 200 ms | ≤ 300 ms | `INP_MS = 200` |
| Pet canvas render on load | ≤ 2 s | ≤ 3 s | `PET_RENDER_ON_LOAD_SECONDS = 2` |
| Pet interaction response (click/tap) | ≤ 200 ms | ≤ 300 ms | `PET_INTERACTION_RESPONSE_MS = 200` |
| Pet animation frame rate | ≥ 30 FPS sustained | ≥ 24 FPS | `PET_ANIMATION_FPS_MIN = 30` |
| Arena battle E2E render | ≤ 2 s | — | `ARENA_BATTLE_E2E_SECONDS = 2` |
| Scene / route transition | ≤ 300 ms | — | — |

### §10.2 Memory Budget

| Type | Limit |
|------|-------|
| Total JS heap (player app, typical session) | < 150 MB |
| Phaser game instance texture memory | < 50 MB (1–2 sprite sheets loaded) |
| Audio buffer cache (Phase 2) | < 20 MB |

### §10.3 Bundle Budget

| Bundle | Size Limit (gzipped) | Notes |
|--------|---------------------|-------|
| Entry / eager bundle | ≤ 150 KB | React + Router + TanStack Query + Zustand + Zod only |
| Total JS (all chunks combined) | ≤ 300 KB | `TOTAL_JS_BUNDLE_GZIPPED_KB = 300` — Phaser excluded |
| Total CSS | ≤ 50 KB | `TOTAL_CSS_BUNDLE_GZIPPED_KB = 50` |
| Phaser.js (lazy, separate chunk) | ~400 KB gzipped | Served from CDN; cached after first load; not counted in total JS budget |

### §10.4 Code Splitting Configuration

```typescript
// apps/player/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'query-vendor':  ['@tanstack/react-query'],
          'form-vendor':   ['react-hook-form', 'zod'],
          // Phaser is NOT listed here — dynamically imported only inside PetCanvasEngine.ts
        },
      },
    },
  },
});
```

All page components use React Router v6 `lazy()` — one chunk per route, handled by the Router loading boundary.

---

## §11 Test Specification

### §11.1 Unit Test Scope

| Module | Test Focus | Coverage Target |
|--------|-----------|----------------|
| `petGeneration.ts` | `buildAttributeVector(seed)` determinism; all 6 dimensions; boundary seeds (0n, BigInt max) | 100% |
| `tokenStorage.ts` | `getPetToken`, `setPetToken`, `clearPetToken`; `localStorage` mock | 100% |
| `apiClient.ts` | Token attachment interceptor; error normalization (`AppError`); 401 → token clear | 90% |
| `useAppStore.ts` (Zustand) | All slice actions: `setSelectedMode`, `setClaimStep`, `setClaimId`, `pushToast`, `dismissToast` | 90% |
| Zod schemas (`schemas/*.ts`) | Valid / invalid API response shapes; parse error messages | 90% |
| `useReducedMotion.ts` | `matchMedia` mock: `true` / `false` / change event | 100% |
| `ClaimEmailForm.tsx` | Email validation, age confirmation required; form submission with mock mutation | 85% |
| `ClaimCodeForm.tsx` | 6-digit input constraint (`CLAIM_CODE_DIGITS = 6`); shake on `INVALID_CODE` | 85% |
| `ExpiryWarning.tsx` | Renders when `minutesRemaining ≤ 2`; `role="alert"` present | 100% |
| `StatBar.tsx` | Correct width percentage; `aria-label` values | 90% |
| `DailyResetTimer.tsx` | Countdown to UTC 00:00; `aria-live="polite"` throttled at 60 s and ≤ 5 min | 85% |

Minimum coverage target: **80%** (`UNIT_TEST_COVERAGE_MIN_PERCENT = 80`) enforced by Vitest `coverage.thresholds`.

### §11.2 Integration Test Scenarios

| Scenario | Precondition | Expected Result |
|----------|-------------|-----------------|
| Claim flow: happy path | Guest on landing page; mocked `POST /api/v1/claim` and `POST /api/v1/claim/verify` succeed | Token written to `localStorage`; user on `/pet/:petId` |
| Claim flow: invalid OTP | `POST /api/v1/claim/verify` returns `INVALID_CODE` | Shake animation on digit boxes; error message visible; inputs remain enabled |
| Claim flow: 429 on code entry | 10th attempt returns 429 | All inputs disabled; Retry-After countdown rendered; `aria-live="assertive"` announcement |
| Training: action exhausted | `POST /api/v1/pets/:petId/train` returns `TRAINING_LIMIT_REACHED` | All action cards disabled; `DailyResetTimer` visible |
| Training: stat at max | `POST /api/v1/pets/:petId/train` returns `STAT_AT_MAXIMUM` | Toast: "Stat is already at maximum"; card for exhausted stat disabled; others remain enabled |
| Arena: matchmaking timeout, AI accepted | `POST /api/v1/arena/enter` returns 408; user clicks Accept in `AIOfferModal` | Re-POST with `acceptAI: true`; proceed to battle |
| Arena: 429 rate limit | Arena endpoint returns 429 | `RateLimitBanner` renders; Retry-After timer displayed |
| Global 401 | Any authenticated endpoint returns 401 | `localStorage` token cleared; redirect to `/` |
| GDPR request submission | `POST /api/v1/gdpr/request` returns `{ jobId }` | `GdprStatusBanner` activates; polls `/api/v1/gdpr/request/status?jobId=` |
| Reduced motion | `prefers-reduced-motion: reduce` media query active | Phaser animation paused; rarity CSS shimmers suppressed; `StatChangeIndicator` uses opacity-only |

### §11.3 E2E Test Scenarios (Playwright)

| Test File | Scenario | Breakpoints |
|-----------|----------|------------|
| `e2e/claim.spec.ts` | Full claim flow (email → OTP → token stored → PetPage renders) | 375, 768, 1440 |
| `e2e/training.spec.ts` | Training action → `StatChangeIndicator` appears → counter decrements | 375, 1440 |
| `e2e/arena.spec.ts` | Arena entry → matchmaking wait → AI accept → battle → result page | 768, 1440 |
| `e2e/leaderboard.spec.ts` | Leaderboard loads; rarity filter updates URL; `OwnerRankBanner` visible with token | 375, 768, 1440 |
| `e2e/gdpr.spec.ts` | GDPR form submit → `GdprStatusBanner` polls correctly | 768, 1440 |
| `e2e/visual.spec.ts` | Screenshot tests for LandingPage, PetPage ×4 rarities, BattleResultPage WIN+LOSS | 320, 768, 1024, 1440 |
| `e2e/auth.spec.ts` | HTTP 401 → token cleared + redirect to `/`; HTTP 429 → banner renders | 375, 1440 |

### §11.4 Performance Test Conditions

| Test Item | Tool | Pass Condition |
|-----------|------|----------------|
| Core Web Vitals — Landing page | Playwright Lighthouse plugin | FCP ≤ 1.5 s; LCP ≤ 2.5 s; CLS ≤ 0.1; INP ≤ 200 ms |
| Bundle size check | Vite `build --reporter` + custom CI step | Entry bundle ≤ 150 KB gzipped; total JS ≤ 300 KB gzipped |
| Pet canvas render time | Playwright `page.evaluate` performance API | Canvas ready ≤ 2 s after navigation |
| Memory leak (Phaser destroy) | Playwright + Chrome DevTools protocol heap snapshot | No retained `Phaser.Game` instances after component unmount |
| Phaser animation FPS | `game.loop.actualFps` assertion in integration test (instance property — not `Phaser.Game.loop.actualFps`) | ≥ 30 FPS over 10-frame window |

---

## §12 Local Development Workflow

### §12.1 Prerequisites

- Node.js 20 LTS
- pnpm 8+ (`npm install -g pnpm`)
- Access to `.env.local` with `VITE_API_BASE_URL` set (or local Fastify running on port 3000)

### §12.2 Setup

```bash
# Clone monorepo and install all workspace dependencies
git clone https://github.com/pixel-pet-arena/pixel-pet-arena.git
cd pixel-pet-arena
pnpm install

# Copy environment template
cp apps/player/.env.example apps/player/.env.local
# Set VITE_API_BASE_URL=http://localhost:3000
```

### §12.3 Development Server

```bash
# Start player app dev server (HMR on http://localhost:5173)
pnpm --filter player-app dev

# Start API server (separate terminal — needed for API calls)
pnpm --filter api dev

# Start both concurrently from monorepo root
pnpm dev
```

Vite HMR provides instant TypeScript feedback. Phaser.js is loaded via dynamic import — the first load of any page with `PetCanvas` will fetch Phaser from the CDN (or `node_modules` in dev mode).

### §12.4 Unit Tests

```bash
# Run Vitest unit tests in watch mode
pnpm --filter player-app test

# Run with coverage report
pnpm --filter player-app test:coverage
# Coverage output: apps/player/coverage/index.html
# Threshold: 80% (UNIT_TEST_COVERAGE_MIN_PERCENT = 80)
```

### §12.5 E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
pnpm --filter player-app exec playwright install

# Run all E2E tests headless
pnpm --filter player-app e2e

# Run with UI mode (interactive)
pnpm --filter player-app e2e:ui

# Run visual regression tests only
pnpm --filter player-app e2e --grep visual
```

Playwright screenshots are saved to `apps/player/e2e/screenshots/` and compared against baselines stored in `apps/player/e2e/snapshots/`. Update baselines with `--update-snapshots` flag when intentional visual changes are made.

### §12.6 Build

```bash
# Production build for player app
pnpm --filter player-app build
# Output: apps/player/dist/

# Preview production build locally
pnpm --filter player-app preview
```

### §12.7 Type Checking

```bash
# Type-check player app (no emit)
pnpm --filter player-app typecheck

# Type-check all workspace packages
pnpm typecheck
```

---

## §13 Known Limitations and Technical Debt

| Item | Description | Impact | Target Version |
|------|-------------|--------|----------------|
| LIM-01 | Phaser.js version lock | Phaser 3.x does not support React 18 Concurrent Mode features natively; `PetCanvasEngine` must never use `React.startTransition` to defer its mount | Medium — Phaser lifecycle must be carefully tested on React 18 concurrent renders | Phase 2 review |
| LIM-02 | `localStorage` token storage XSS exposure | `pet_access_token` in `localStorage` is accessible by any JS on the same origin; mitigated by CSP (`script-src 'self' https://cdn.jsdelivr.net`) but not eliminated | Low-Medium — CSP blocks inline scripts; risk accepted per FRONTEND.md §8.1 design decision | Phase 3 security hardening |
| LIM-03 | Sprite sheets generated server-side | Phase 1 uses placeholder sprite sheets; procedural generation from `AttributeVector` is a Phase 2 asset pipeline task | High visual fidelity gap in Phase 1 — pets appear as placeholder pixels | Phase 2 |
| LIM-04 | Feature flags are build-time env vars | `FF_MARKETPLACE`, `FF_ARENA_SUMO` etc. require a new Vite build to change; no runtime hot-swap | Medium — requires redeployment for flag changes; LaunchDarkly integration deferred to Phase 3 (OQ-E07) | Phase 3 |
| LIM-05 | No audio in Phase 1 | Audio integration (Howler.js, SFX, BGM) is planned for Phase 2 | Low — game is playable without audio; competitive experience diminished | Phase 2 |
| LIM-06 | Open Graph card generation method TBD | `BattleResultPage` shareable OG card strategy is unresolved (OQ-E05 in ARCH.md) | Medium — social shareability is a growth mechanic; placeholder `og:image` used | Phase 2 |
| LIM-07 | `PetCanvas` SSR incompatible | `PetCanvasEngine` imports browser APIs (`window`, `document`) — renders only client-side; Vercel SPA deployment has no SSR so this is not currently an issue | Low — would block any future SSR migration | Phase 3 (if SSR adopted) |

---

STEP_COMPLETE: CLIENT_IMPL
