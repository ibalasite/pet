# Pet Display Prototype Specification

## Overview

The Pet Display page is the primary screen players see after login. It centers the player's active pixel-art pet, exposes live stat bars, and offers the three core actions: Train, Challenge, and View Records. The page is built in React 18 and embeds a Phaser 3 canvas for animated sprite rendering. It communicates with the Fastify 4 API on port 3000 and is served from the player-app on port 5173.

---

## Screen Layout

```
┌──────────────────────────────────────────────┐
│  pixel-pet-arena          [Player: dragonfly] │
├──────────────────────────────────────────────┤
│                                              │
│           ┌──────────────────┐               │
│           │                  │               │
│           │  Phaser 3 Canvas │               │
│           │   (pet sprite)   │               │
│           │   160 × 160 px   │               │
│           └──────────────────┘               │
│             Pet Name: Blazekin               │
│             Level 12  ·  Type: Fire          │
│                                              │
│  HP   [████████████░░░░░░]  84 / 100         │
│  ATK  [█████████░░░░░░░░░]  62 / 100         │
│  DEF  [██████░░░░░░░░░░░░]  41 / 100         │
│  SPD  [███████████░░░░░░░]  74 / 100         │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  Train   │ │Challenge │ │ View Records│  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│                                              │
│  Last fed: 2 hours ago                       │
└──────────────────────────────────────────────┘
```

The layout uses a single-column flex container on mobile (< 768 px) and centers within a max-width 480 px card on wider viewports. The Phaser canvas maintains a fixed 160 × 160 pixel intrinsic size but is scaled via CSS `transform: scale()` at larger breakpoints to preserve crisp pixel art rendering without browser interpolation artifacts.

---

## Component Tree

```
PetDisplay                         # page-level container, owns all state
├── PetSprite                      # wraps the Phaser 3 Game instance
│   └── <canvas id="pet-canvas">  # injected by Phaser on mount
├── StatPanel                      # renders HP/ATK/DEF/SPD progress bars
│   ├── StatBar (HP)
│   ├── StatBar (ATK)
│   ├── StatBar (DEF)
│   └── StatBar (SPD)
└── ActionButtons                  # Train / Challenge / View Records row
    ├── TrainButton
    ├── ChallengeButton
    └── RecordsButton
```

**PetDisplay** is the sole owner of shared state. It passes immutable prop slices down to each child. `PetSprite` receives a `spritesheet` URL and an `animationKey` string; it boots a Phaser 3 scene on mount and destroys it on unmount to avoid memory leaks. `StatPanel` receives a `stats` object (`{ hp, atk, def, spd, maxHp, maxAtk, maxDef, maxSpd }`). `ActionButtons` receives callback props (`onTrain`, `onChallenge`, `onViewRecords`) and a `disabled` boolean that is `true` while any API call is in-flight.

---

## Key State

| Field | Type | Description |
|---|---|---|
| `currentPet` | `Pet \| null` | Full pet entity fetched from `GET /api/v1/pet`. Null during initial load. |
| `isLoading` | `boolean` | `true` while either API call is pending. Drives skeleton loader visibility. |
| `lastFedTimestamp` | `string \| null` | ISO-8601 datetime from `pet.status.lastFedAt`. Displayed as relative time ("2 hours ago"). |
| `statusError` | `string \| null` | Human-readable error string shown in an inline alert if either fetch fails. |
| `animationKey` | `string` | Phaser animation key currently playing on the sprite, e.g. `"idle"`, `"celebrate"`. Set to `"celebrate"` briefly after a successful training session. |

State is held with `useState` / `useReducer` inside `PetDisplay`. No global store is needed for this screen because the data is local to the page session. The bearer token is read once from `localStorage` at mount time via a `useAuth` hook and attached to every request header.

---

## API Calls

### GET /api/v1/pet

Fetches the player's active pet entity including sprite metadata, level, type, and base stats. Called once on component mount. On success the response is stored in `currentPet`. On 401 the player is redirected to the login screen. On any other error `statusError` is set.

```
Authorization: Bearer <token>

Response 200:
{
  "id": "pet_abc123",
  "name": "Blazekin",
  "level": 12,
  "type": "Fire",
  "spritesheet": "/assets/sprites/fire-12.png",
  "stats": { "hp": 84, "maxHp": 100, "atk": 62, "maxAtk": 100,
             "def": 41, "maxDef": 100, "spd": 74, "maxSpd": 100 }
}
```

### GET /api/v1/pet/status

Fetches live status fields: `lastFedAt`, `energyLevel`, and `hungerLevel`. Called after the main pet fetch resolves (sequential, not parallel, because `lastFedTimestamp` is secondary information). Polled every 60 seconds while the tab is visible using `document.visibilityState` gating to avoid unnecessary requests in background tabs.

```
Response 200:
{
  "lastFedAt": "2026-05-04T08:12:00Z",
  "energyLevel": 73,
  "hungerLevel": 42
}
```

---

## Interaction Flows

### Train Button

1. User clicks **Train**. `ActionButtons` calls `onTrain`.
2. `PetDisplay` sets `isLoading: true` and disables all three buttons.
3. `POST /api/v1/pet/train` is dispatched with the bearer token.
4. On success: stats are updated in `currentPet`, `animationKey` is set to `"celebrate"` for 2 seconds, then reverts to `"idle"`.
5. On failure: `statusError` is populated; buttons re-enable after a 500 ms debounce to prevent rage-clicks.

### Challenge Button

1. User clicks **Challenge**. React Router navigates to `/arena` (the Arena Battle screen).
2. The current `currentPet.id` is passed as route state so the arena screen does not need to re-fetch the pet.

### View Records Button

1. Navigates to `/records/:petId` using React Router, passing the pet id as a URL segment.
2. PetDisplay does not unmount immediately; the route transition is animated with a slide-left CSS transition.

---

## Responsive Behavior

- **320 – 767 px (mobile):** Single-column layout. Canvas is scaled to 120 × 120 px. Action buttons stack vertically with full width.
- **768 – 1023 px (tablet):** Card is centered at 400 px. Canvas renders at 160 × 160 px. Buttons arrange in a single row.
- **1024 px and above (desktop):** Card max-width 480 px with generous vertical whitespace. No layout changes from tablet beyond increased padding.

CSS `image-rendering: pixelated` is applied to the canvas element at all breakpoints to keep pixel art crisp regardless of scaling ratio.

---

## Phaser 3 Integration Point

`PetSprite` mounts a minimal Phaser 3 `Game` config targeting the `<canvas id="pet-canvas">` element:

```ts
new Phaser.Game({
  type: Phaser.CANVAS,
  canvas: document.getElementById('pet-canvas') as HTMLCanvasElement,
  width: 160,
  height: 160,
  backgroundColor: 'transparent',
  scene: PetSpriteScene,
  transparent: true,
});
```

`PetSpriteScene` loads the spritesheet URL received from props, defines `idle` and `celebrate` animation keys using the frame data embedded in the sprite filename convention (`fire-12.png` → 8-frame sheet, 4 frames per row). The scene listens for a custom Phaser event `'setAnimation'` dispatched by `PetSprite` whenever the `animationKey` prop changes. The React `useEffect` cleanup calls `game.destroy(true)` to release the WebGL/Canvas context and remove the DOM canvas element.
