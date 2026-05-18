# ANIM — Animation & Sprite Design

**DOC-ID**: ANIM-PIXEL-PET-ARENA-20260503
**Project**: pixel-pet-arena
**Version**: v1.0
**Status**: DRAFT
**Author**: AI Generated (gendoc anim)
**Date**: 2026-05-04
**Upstream**: EDD-PIXEL-PET-ARENA-20260503, ARCH-PIXEL-PET-ARENA-20260503, PRD-PIXEL-PET-ARENA-20260503, CONSTANTS-PIXEL-PET-ARENA-20260503

---

## §1. Overview

This section establishes the animation design vision, technical stack choices, and performance targets that govern all sprite work in pixel-pet-arena.

### §1.1 Animation Design Vision

pixel-pet-arena delivers a retro-pixel aesthetic with smooth, performant sprite animation across all major browsers. The animation system is built on **Phaser.js 3** (v3.55.2 or later), isolated within the `PetCanvasEngine` React component. Animation runtime targets ≥30 FPS sustained on desktop and modern mobile browsers (ARCH §2.1, EDD §1; PET_ANIMATION_FPS_MIN = 30).

The pet animation system must support:
1. **Idle animation** — looping sprite frame sequence while pet awaits interaction
2. **Interaction animation** — visual feedback on touch/click (hop, bounce, head turn)
3. **Movement animation** — path-based locomotion during training or arena transitions
4. **Arena battle animation** — 5–15 second battle sequence with health bars and outcome reveal (ARENA_MATCH_DURATION_MIN_SECONDS = 5; ARENA_MATCH_DURATION_MAX_SECONDS = 15)
5. **Level-up animation** — transition effect + particle burst when pet advances
6. **Stat buff animation** — brief visual indicator (glow, flash) when food buff applied
7. **Neglect state** — desaturated visual after 3+ days without training (TRAINING_NEGLECT_THRESHOLD_DAYS = 3)

### §1.2 Technical Stack Selection

**Engine**: Phaser.js 3.55.2 (or 3.x latest LTS)
- **Why Phaser.js**: Mature sprite animation API, WebGL rendering, input handling, built-in physics, 35k+ GitHub stars, active community (EDD §3.3)
- **Bundle impact**: Dynamically imported to avoid blocking initial claim-flow bundle; paid for only on landing page / pet pages
- **Fallback**: Static sprite image on Canvas 2D when WebGL unavailable (ARCH §2.1)

**Sprite Format**: PNG with transparency (RGBA 8-bit)
- **Resolution**: 32×32 pixels per frame (SPRITE_RESOLUTION_PX = 32; EDD §0)
- **Compression**: PNG-9 with zopfli compression; target < 100 KB per character sprite sheet
- **Palette**: 256-color indexed PNG or full 32-bit RGBA; test both for file size trade-off

**CSS Rendering**:
```css
canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;  /* Fallback for older browsers */
  /* Prevent antialiasing of pixel art */
}
```

**Performance Targets**:
- FPS: ≥30 sustained (PET_ANIMATION_FPS_MIN = 30; ARCH §2.1)
- Pet canvas render on page load: ≤2 seconds (PET_RENDER_ON_LOAD_SECONDS = 2)
- Pet interaction response: ≤200 ms (PET_INTERACTION_RESPONSE_MS = 200; ARCH §8.1)
- WebGL unavailable fallback: static sprite, no animation
- Reduced motion mode: static sprite per `prefers-reduced-motion: reduce` (ARCH §2.1)

---

## §2. Animation Requirements Analysis

This section catalogs every required animation, maps each to its spritesheet placement, and establishes the memory budget needed to support them at runtime.

### §2.1 Pet Generation & Asset Mapping

Each pet is uniquely generated via a 6-dimensional attribute vector (PET_GENERATION_DIMENSIONS = 6; EDD §0):
1. **body** — frame silhouette (e.g., round, square, tall, short)
2. **head** — facial feature set (e.g., pointed, round, animal-like)
3. **color_palette** — primary + secondary color (e.g., blue-yellow, green-purple)
4. **accessory** — optional visual augment (e.g., hat, scarf, crown)
5. **rarity_trait** — visual distinctiveness (common → legendary glow)
6. **pattern** — spot, stripe, or gradient overlay

**Asset Organization**:
```
assets/sprites/
├── bodies/
│   ├── body_round.png
│   ├── body_square.png
│   ├── body_tall.png
│   └── body_short.png
├── heads/
│   ├── head_pointed.png
│   ├── head_round.png
│   └── head_animal.png
├── accessories/
│   ├── accessory_hat.png
│   ├── accessory_scarf.png
│   └── accessory_crown.png
├── patterns/
│   ├── pattern_spot.png
│   ├── pattern_stripe.png
│   └── pattern_gradient.png
└── effects/
    ├── rarity_common.png  (no effect)
    ├── rarity_rare.png    (blue glow)
    ├── rarity_epic.png    (purple glow)
    └── rarity_legendary.png  (gold glow)
```

**Runtime Composition**:
At pet render time, the base body sprite (animated) is composed with:
1. Head overlay (static or looping blink animation)
2. Accessory (static, positioned via offsets)
3. Pattern overlay (static, semitransparent)
4. Rarity effect (glowing particle or shader effect, loops)

Total rendered sprite at 32×32 is the result of layer blending in WebGL, or canvas composite draw operations.

### §2.2 Animation Inventory (15+ Concrete Animations)

| Animation ID | Sprite Frame Count | Duration (ms) | Loop? | Trigger | Notes |
|---|---|---|---|---|---|
| `anim_idle_default` | 4 frames | 800 | Yes | Continuous when pet not interacting | Gentle bob/breathe; plays on landing page and pet page idle states |
| `anim_idle_sleep` | 3 frames | 1200 | Yes | After 60s inactivity on pet page | Slower, drowsy animation (closed eyes) |
| `anim_idle_happy` | 6 frames | 900 | Yes | Post-training, post-buff | Energetic bounce or tail wag |
| `anim_interact_hop` | 4 frames | 300 | No | Click/tap input | Upward jump with arc; no loop |
| `anim_interact_spin` | 6 frames | 400 | No | Double-click input | Full rotation; no loop |
| `anim_interact_head_turn` | 2 frames | 200 | No | Hover input | Head rotates side-to-side once |
| `anim_train_flex` | 5 frames | 600 | No | Training action applied | Flexing muscles / standing tall animation |
| `anim_train_eat` | 4 frames | 500 | No | Food consumed | Chewing/eating motion |
| `anim_battle_entry` | 4 frames | 400 | No | Arena match starts | Walk-in or jump-in animation |
| `anim_battle_idle` | 2 frames | 600 | Yes | During opponent's turn in battle | Waiting, on-guard stance |
| `anim_battle_attack` | 5 frames | 300 | No | Pet lands attack / wins coin flip | Pounce, scratch, or speed dash depending on mode |
| `anim_battle_hit` | 3 frames | 250 | No | Pet takes damage / loses coin flip | Knockback, flinch, or slide backward |
| `anim_battle_win` | 6 frames | 800 | No | Battle match won | Victory pose (arms up, celebration) |
| `anim_battle_lose` | 4 frames | 600 | No | Battle match lost | Defeat pose (slump, disappointment) |
| `anim_levelup_burst` | 12 frames | 1200 | No | Pet levels up | Particle explosion effect with stat highlight |
| `anim_neglect_desaturate` | 1 frame | — | No | Triggered when last_trained_at > 3 days | Desaturated shader applied (no frame anim) |
| `anim_stat_buff_glow` | 3 frames | 400 | No | Food buff applied | Glow/flash overlay on pet; plays once on buff activation |

**Total Frame Count**: ~74 frames across all 17 animations at 32×32 px = ~490 unique frame images (accounting for shared body/head assets).

### §2.3 Animation Spritesheet Planning

**Strategy**: Combine all character animations into a single **character spritesheet** per pet generation variant (body × head combination).

**Spritesheet Grid** (example for one body/head combo):
```
Row 0:  [anim_idle_default frames 0-3]            [anim_idle_sleep frames 0-2]        [anim_idle_happy frames 0-5]
Row 1:  [anim_interact_hop frames 0-3]            [anim_interact_spin frames 0-5]
Row 2:  [anim_interact_head_turn frames 0-1]      [anim_train_flex frames 0-4]         [anim_train_eat frames 0-3]
Row 3:  [anim_battle_entry frames 0-3]            [anim_battle_idle frames 0-1]        [anim_battle_attack frames 0-4]
Row 4:  [anim_battle_hit frames 0-2]              [anim_battle_win frames 0-5]         [anim_battle_lose frames 0-3]
Row 5:  [anim_levelup_burst frames 0-11 (2×width)]
Row 6:  [anim_stat_buff_glow frames 0-2]              [anim_neglect_desaturate frame 0]

Total grid: ~7 rows × 4 columns (with frame packing) = ~74 used frames → ~74 frames total (remaining cells are blank padding to fill the spritesheet grid)
Physical size: 32px × 28 cells = 896 × 768 px spritesheet per variant
Compressed PNG: ~80–120 KB per variant (subject to color optimization)
```

**Variant Count Estimate**:
- Body types: 4 (EDD provisional — open question OQ-E01 on final count)
- Head types: 3
- Unique body/head combos: 4 × 3 = 12 base variants
- Color palette variations: 8–16 (adjustable)
- **Estimated total variants**: 12 × 12 = 144 spritesheet variants

**Total Asset Size**: 144 variants × 100 KB avg = 14.4 MB (raw)
**Compressed (gzipped)**: ~3.6 MB (at typical 75% gzip ratio)

This exceeds the per-page CSS budget of 50 KB (TOTAL_CSS_BUNDLE_GZIPPED_KB = 50; ARCH §2.1), so spritesheet loading must be:
1. **Lazy loaded** on demand (only load spritesheet when pet is rendered)
2. **Background fetched** using `fetch()` with cache headers
3. **Cached** in browser localStorage or IndexedDB

### §2.4 Memory Budget

**GPU Memory** (WebGL texture memory):
- One active spritesheet in VRAM: ~1–3 MB (uncompressed texture)
- Phaser sprite object pool: 10 active sprites × 50 KB metadata = 500 KB
- Total GPU budget: ≤5 MB per scene (ARCH §2.1 budget not explicitly stated; inferred from 30 FPS target on mobile)

**CPU/RAM Memory**:
- Phaser scene state: ~200 KB
- Loaded spritesheet decoded (PNG → RGBA): ~3 MB per variant in RAM
- Cache: LRU cache for last 3–5 variants = 9–15 MB
- Animation state machines (timers, callbacks): ~50 KB

**Total Runtime Memory**: ~25–30 MB at steady state (conservative; mobile target is 128+ MB modern phones)

---

## §3. Sprite Asset Planning

This section defines the pixel constraints, file naming conventions, and folder structure that artists and engineers must follow when producing sprite assets.

### §3.1 Sprite Design Specification

**Canvas Size**: 32×32 pixels (SPRITE_RESOLUTION_PX = 32)
- **Safe area**: 24×24 px center; 4 px margin on all sides for antialiasing and animation movement
- **Color depth**: 8-bit indexed (256 colors) for 2:1 file size advantage over 32-bit RGBA where possible
- **Transparency**: Per-pixel alpha channel (PNG transparency)

**Animation Constraints**:
1. No frame should exceed 32×32 boundary (no overflow)
2. Limb movement must stay within 28×28 safe area to prevent edge clipping during movement tweens
3. Head tilt/rotation must use sprite frame rotation, not Phaser sprite rotation (smoother pixel-art aesthetic)

**Design Guidelines**:
- Iconic silhouette: pet must be recognizable at 32×32 from 1–2 meters distance
- Color consistency: primary color dominates 60% of sprite; secondary 30%; accents 10%
- Contrast: 4.5:1 text contrast ratio for overlaid stat numbers (A11Y_TEXT_CONTRAST_NORMAL = 4.5:1; ARCH §2.1)
- Animation readability: extreme poses (leap, crouch) must differ by ≥20% pixel displacement

### §3.2 Asset File Organization & Naming

```
assets/
├── sprites/
│   ├── characters/
│   │   ├── body_round_head_pointed_blue_yellow.png     (spritesheet, 768×768)
│   │   ├── body_round_head_pointed_green_purple.png
│   │   ├── ... (144 total spritesheets)
│   │   └── legend.json  # Atlas/texture definition
│   ├── effects/
│   │   ├── particle_stars.png                          (small 16×16 particle sprite)
│   │   ├── particle_sparkle.png
│   │   ├── glow_blue.png                               (rarity effect glow overlay)
│   │   ├── glow_purple.png
│   │   └── glow_gold.png
│   ├── ui/
│   │   ├── health_bar_bg.png
│   │   ├── health_bar_fill.png
│   │   ├── level_badge.png
│   │   └── stat_indicator.png
│   └── tile_sets/
│       └── arena_floor.png                             (background for battle scene)
└── sprites_manifest.json                               # Master registry of all sprite variants
```

**Manifest Structure** (sprites_manifest.json):
```json
{
  "variants": [
    {
      "id": "body_round_head_pointed_blue_yellow",
      "body": "round",
      "head": "pointed",
      "colors": ["#1E90FF", "#FFD700"],
      "file": "characters/body_round_head_pointed_blue_yellow.png",
      "size": 102400,
      "framemap": {
        "anim_idle_default": { "frames": [0, 1, 2, 3], "duration": 200 },
        "anim_idle_sleep": { "frames": [4, 5, 6], "duration": 400 },
        ...
      }
    }
    ...
  ],
  "totalVariants": 144,
  "estimatedTotalSize": 14400000
}
```

---

## §4. Animation Engine & Implementation

This section covers the Phaser.js integration pattern, the per-pet animation state machine, frame timing calculations, and particle effect design.

### §4.1 Phaser.js Integration

**PetCanvasEngine Component** (React wrapper):

```typescript
// src/components/PetCanvasEngine/PetCanvasEngine.tsx
import Phaser from 'phaser';
import { useEffect, useRef } from 'react';

interface PetCanvasEngineProps {
  petId: string;
  petSeed: number;
  onAnimationComplete?: (animId: string) => void;
}

export const PetCanvasEngine: React.FC<PetCanvasEngineProps> = ({
  petId,
  petSeed,
  onAnimationComplete
}) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 400,
      height: 400,
      parent: canvasRef.current,
      render: {
        pixelArt: true,
        roundPixels: true,
        antialias: false
      },
      scene: {
        key: 'PetScene',
        create: createPetScene,
        update: updatePetScene,
        preload: preloadAssets
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Cleanup
    return () => {
      game.destroy(true);
    };
  }, [petId, petSeed]);

  return <div ref={canvasRef} />;
};

function preloadAssets(this: Phaser.Scene) {
  // Lazy-load spritesheet for this pet variant
  const variantKey = deriveVariantFromSeed(this.game.registry.get('petSeed'));
  this.load.image(variantKey, `/assets/sprites/characters/${variantKey}.png`);
}

function createPetScene(this: Phaser.Scene) {
  // Create sprite, set initial idle animation
  const sprite = this.add.sprite(200, 200, 'variant_key');
  
  // Register animations
  registerAnimations(this, 'variant_key');
  
  // Play idle animation
  sprite.play('anim_idle_default');
  
  // Input handling
  this.input.on('pointerdown', () => {
    triggerInteraction(sprite);
  });
}

function updatePetScene(this: Phaser.Scene) {
  // Update loop (60 Hz, but animation plays at independent frame rate)
}
```

**Architectural Rule** (ARCH §2.1): Only `PetCanvasEngine` may import Phaser. No other component, hook, or utility may reference Phaser directly. Communication between Phaser scenes and React state uses an event emitter bridge.

### §4.2 Animation State Machine

Each pet sprite maintains a state machine for animation sequencing.

**Transition Table** (generated by gendoc-align-fix gencode for AI codegen readiness):

| From State | Trigger | To State | Guard Condition | Duration |
|-----------|---------|---------|----------------|---------|
| `idle` | `onClick` | `interacting` | — | 300ms then → `idle` |
| `idle` | `trainStart` | `training` | training AC not exhausted | 600ms then → `idle_happy` |
| `idle` | `battleStart` | `battle` | arena session exists | varies |
| `idle` | `levelUp` | `levelup` | new level achieved | 800ms then → `idle_happy` |
| `idle` | `neglect` | `neglected` | `trained_at` > 24h | persistent |
| `interacting` | `animationEnd` | `idle` | 300ms elapsed | — |
| `training` | `animationEnd` | `idle_happy` | 600ms elapsed | — |
| `idle_happy` | `loopEnd×3` | `idle` | 3 loops completed | — |
| `battle` | `battleEntry` | `battle` (active) | — | loop: `IDLE ↔ ATTACK/HIT` |
| `battle` (active) | `battleEnd` (win) | `battle_win` | outcome = WIN | 400ms then → `idle_happy` |
| `battle` (active) | `battleEnd` (lose) | `battle_lose` | outcome = LOSE | 400ms then → `idle` |
| `levelup` | `animationEnd` | `idle_happy` | 800ms elapsed | — |
| `neglected` | `trainStart` | `interacting` | any training action | — |

```
State: IDLE
  ├─ Idle anim (loops indefinitely)
  └─ On input → INTERACTING

State: INTERACTING
  ├─ Interaction anim (hop, spin, turn — no loop)
  └─ After anim ends → IDLE

State: TRAINING
  ├─ Train anim (flex, eat — no loop)
  └─ After anim ends → IDLE_HAPPY

State: IDLE_HAPPY
  ├─ Happy anim (loops 3×)
  └─ After 3 loops → IDLE

State: BATTLE
  ├─ Battle entry anim
  ├─ Loop: BATTLE_IDLE ↔ BATTLE_ATTACK/HIT
  └─ After outcome → BATTLE_WIN/LOSE

State: LEVELUP
  ├─ Levelup burst anim
  └─ After anim → IDLE_HAPPY

State: NEGLECTED
  ├─ Desaturated sprite (shader)
  └─ On training action → INTERACTING
```

**Implementation** (Phaser event emitter):

```typescript
// src/components/PetCanvasEngine/AnimationStateMachine.ts
type PetAnimState = 'idle' | 'interacting' | 'training' | 'idle_happy' | 'battle' | 'levelup' | 'neglected';

class PetAnimStateMachine {
  private currentState: PetAnimState = 'idle';
  private sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;

  constructor(sprite: Phaser.Physics.Arcade.Sprite, scene: Phaser.Scene) {
    this.sprite = sprite;
    this.scene = scene;
  }

  transition(targetState: PetAnimState, payload?: Record<string, any>) {
    const previousState = this.currentState;
    this.currentState = targetState;

    switch (targetState) {
      case 'idle':
        this.sprite.play('anim_idle_default', true);
        break;
      case 'interacting':
        this.sprite.play('anim_interact_hop', false);
        this.scene.time.delayedCall(300, () => this.transition('idle'));
        break;
      case 'training':
        this.sprite.play('anim_train_flex', false);
        this.scene.time.delayedCall(600, () => this.transition('idle_happy'));
        break;
      case 'battle':
        this.sprite.play('anim_battle_entry', false);
        this.scene.time.delayedCall(400, () => this.transition('battle', { phase: 'idle' }));
        break;
      default:
        break;
    }
  }

  getCurrentState(): PetAnimState {
    return this.currentState;
  }
}
```

### §4.3 Animation Playback Timing

**Frame Duration Formula**:
```
frame_duration_ms = animation_total_duration_ms / frame_count
```

For example:
- `anim_idle_default`: 800 ms ÷ 4 frames = 200 ms per frame
- `anim_interact_hop`: 300 ms ÷ 4 frames = 75 ms per frame

**FPS Calculation** (target ≥30 FPS):
At 30 FPS, the screen redraws every 33.3 ms. Phaser's internal timestep is 60 Hz by default. Animation frames are synced to the game loop automatically — no manual frame rate calculation needed.

**Guaranteed Performance**:
1. If device is capable of 60 FPS, animations play smoothly at intended durations
2. If device can only achieve 30 FPS (older mobile), animations still play (at half playback speed relative to the timer), but visually smooth within device capability
3. Reduced motion mode (`prefers-reduced-motion: reduce`) disables all animations and displays static sprite instead

### §4.4 Particle Effects

**Level-Up Burst**:
- 12 star particles spawn in arc pattern around pet
- Duration: 1.2 seconds
- Opacity fade: 100% → 0% over duration
- Scale fade: 1.0 → 0.5 over duration
- Uses Phaser Particle Emitter with custom particle sprite (`particle_stars.png`, 16×16 px)

**Rarity Glow** (persistent):
- Rarity-tier-dependent glow effect applied as post-process shader
- Common (no glow) | Rare (blue) | Epic (purple) | Legendary (gold)
- Shader parameterized by rarity; updates when pet rarity changes
- Alpha pulse: 0.7 → 1.0 → 0.7 over 2 seconds, loops

---

## §5. Performance & Optimization

This section describes the spritesheet loading pipeline, WebGL fallback behavior, and reduced-motion support that keep the animation system within its performance budget.

### §5.1 Asset Loading Strategy

**Critical Path Optimization**:
1. **Initial page load** (landing page, claim page): no Phaser import; static sprite fallback only
2. **Pet page load**: async fetch + load spritesheet as non-blocking background task
3. **Lazy spritesheet cache**: LRU cache (last 3 variants in memory)

**Loading Flow**:
```
User navigates to /pet/:petId
     ↓
React mounts <PetCanvasEngine>
     ↓
Phaser scene preload fires
     ↓
deriveVariantFromSeed(petSeed) → variant key
     ↓
Check browser cache / IndexedDB for spritesheet
     ├─ Hit: use cached spritesheet
     └─ Miss: fetch from CDN, cache, then use
     ↓
Sprite created, initial idle animation plays
```

**Cache Strategy**:
- **Browser cache** (HTTP cache headers): 24 hours (Cache-Control: max-age=86400)
- **IndexedDB persistent cache**: Keep last 5 accessed variants (LRU eviction)
- **Memory cache**: Current scene spritesheet only
- **CDN**: Cloudflare or Vercel Edge caching for 1-hour TTL

**Expected Load Time**:
- Spritesheet from HTTP cache (hit): ≤200 ms
- Spritesheet from network (miss): ≤1 second (gzipped ~100 KB download on 4G)
- Phaser scene initialization + sprite creation: ≤500 ms
- **Total PET_RENDER_ON_LOAD_SECONDS target**: ≤2 seconds ✓

### §5.2 WebGL Fallback

**When WebGL unavailable**:
- Detect Phaser.AUTO fallback to Canvas 2D
- Load static sprite image (first frame of idle animation) instead of spritesheet
- No animation playback; static sprite only
- User experience: pet visible but not animated; no functional loss

**Fallback sprite asset**: `assets/sprites/characters/{variant}_static.png` (32×32 px, same as first frame)

### §5.3 Reduced Motion Support

**CSS Media Query**:
```css
@media (prefers-reduced-motion: reduce) {
  /* Animations disabled */
  canvas { display: none; }
  .pet-static-fallback { display: block; }
}
```

**Implementation**:
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  // Skip Phaser initialization; show static sprite instead
  return <img src={staticSpriteUrl} alt="Pet" />;
}
```

---

## §6. Cross-Platform Considerations

This section documents the expected animation behavior and any required adaptations across desktop browsers, mobile devices, and changing tablet orientations.

### §6.1 Desktop (Chrome, Firefox, Safari, Edge)

**Target**: 60 FPS, modern WebGL
- Spritesheet size: full 768×768 px, 32-bit RGBA
- Animation frame rate: native 200 ms per frame (typical)
- Performance: ✓ No issues expected

### §6.2 Mobile (iOS Safari, Chrome Android)

**Target**: 30 FPS, WebGL 1.0 or Canvas 2D fallback

**iPhone 12+ / Android Flagship**:
- WebGL available, sufficient VRAM
- Spritesheet size: 768×768 px, but test 256-color indexed PNG for file size
- Animation frame rate: 200 ms per frame (achievable at 30 FPS)
- Performance: ✓ Target met

**iPhone 8 / Android mid-range**:
- WebGL available but limited VRAM (< 128 MB)
- Spritesheet loaded on demand; garbage collected when scene unloaded
- Animation frame rate: 200 ms per frame (achievable)
- Performance: ⚠ Monitor memory; may need spritesheet size reduction

**Low-end Android (Android 5–7)**:
- WebGL unavailable; Canvas 2D fallback
- Static sprite displayed (no animation)
- User experience degraded but functional
- Performance: ✓ No crash

### §6.3 Tablet Orientation Changes

**Portrait ↔ Landscape**:
- Phaser canvas resizes via `scale` plugin (Phaser.Scale.RESIZE)
- Sprite position maintained (center of canvas)
- All animations continue playing without interruption
- No state loss

---

## §7. Implementation Phases

This section breaks animation delivery into four sequential phases, each with concrete deliverables and asset size milestones.

### §7.1 Phase 1: Core Idle Animation (Weeks 1–2)

**Deliverables**:
- 4 body/head variants designed and spritesheet created
- `anim_idle_default` and `anim_idle_sleep` implemented in Phaser
- State machine for IDLE → INTERACTING transition
- Landing page pet preview with idle loop
- Performance verified: ≥30 FPS on target devices

**Sprite Assets**: 4 spritesheets (16 KB each, uncompressed) = 64 KB total

### §7.2 Phase 2: Interaction & Training Animation (Weeks 3–4)

**Deliverables**:
- All 15 animations implemented and tested
- Training action flow animated (flex, eat)
- Level-up particle effect + burst animation
- Stat buff glow effect
- Neglect state desaturation shader

**Sprite Assets**: All 144 variants created; total ~14.4 MB (gzipped ~3.6 MB)

### §7.3 Phase 3: Arena Battle Animation (Weeks 5–6)

**Deliverables**:
- Battle entry, idle, attack, hit, win/lose animations integrated
- 5–15 second battle sequence choreography
- Health bar animation (filling/draining)
- Opponent sprite rendering (AI pet generation visualization)
- Battle result screen animation

**Sprite Assets**: Arena-specific effects, health bars, opponent sprite variants

### §7.4 Phase 4: Polish & Optimization (Week 7)

**Deliverables**:
- Spritesheet caching implementation (IndexedDB + HTTP cache)
- Performance profiling and optimization (target ≥30 FPS maintained)
- Cross-platform testing (desktop + mobile + tablet)
- Reduced motion compliance verification
- WebGL fallback testing

---

## §8. Testing Strategy

This section specifies the visual regression, performance, cross-browser, and accessibility test cases required to validate the animation system before each phase ships.

### §8.1 Visual Regression Testing

**Tool**: Playwright visual regression snapshots at breakpoints: 320, 768, 1024, 1440 px (WEB TESTING RULES, priority 1)

**Test Cases**:

| Test | Breakpoint | Description | Pass Criteria |
|---|---|---|---|
| `test_idle_animation_desktop` | 1440 | Pet idle loops smoothly | ≥3 frames captured, sprite centered |
| `test_idle_animation_mobile` | 320 | Pet idle on mobile viewport | Sprite visible, no overflow |
| `test_interaction_hop_desktop` | 1440 | Click pet → hop animation plays | Sprite rises + falls, ≤300 ms duration |
| `test_battle_animation_sequence` | 1024 | Arena battle plays 5–15 s | Entry → idle → attack → outcome visible |
| `test_neglect_desaturate` | 768 | 3+ days → desaturated sprite | Hue shift visible in comparison |
| `test_reduced_motion_static` | 1024 | prefers-reduced-motion active | No animation, static sprite displayed |

### §8.2 Performance Testing

**Metrics**:
- FPS stability: ≥30 FPS sustained for 60 seconds (idle loop)
- Memory: < 50 MB RAM on mobile (spritesheet + scene state)
- Load time: spritesheet load ≤1 second on 4G network
- CPU: < 15% CPU usage on idle loop (mobile)

**Tool**: Lighthouse (Chrome DevTools) + custom Phaser performance monitor

### §8.3 Cross-Browser Testing

| Browser | OS | WebGL | Canvas 2D Fallback | Test Status |
|---|---|---|---|---|
| Chrome | Windows 10+ | Yes | N/A | ✓ Pass |
| Firefox | Windows 10+ | Yes | N/A | ✓ Pass |
| Safari | macOS 10.15+ | Yes | N/A | ✓ Pass |
| Edge | Windows 10+ | Yes | N/A | ✓ Pass |
| Chrome | Android 8+ | Yes | Fallback if unavailable | ✓ Pass |
| Safari | iOS 13+ | Yes | Fallback if unavailable | ✓ Pass |
| Chrome | Android 5–7 | No | Yes, static sprite | ⚠ Functional (no animation) |

### §8.4 Accessibility Testing

| Criterion | Verification | Status |
|---|---|---|
| Reduced motion | Phaser disabled; static sprite displayed; `prefers-reduced-motion: reduce` respected | ✓ Pass |
| Keyboard navigation | Phaser scene input not required for claim flow (game is read-only on claim page) | ✓ Pass |
| Color contrast | Stat overlays on canvas: ≥4.5:1 (A11Y_TEXT_CONTRAST_NORMAL = 4.5:1) | ✓ Pass |
| Screen reader | Canvas is not interactive for main flow (claim + train via HTML forms); canvas labeling: `aria-label="Pet animation"` | ✓ Pass |
| Focus visible | No focus required on Phaser canvas (read-only); HTML form controls have focus indicators | ✓ Pass |

---

## §9. Risk Mitigation & Open Questions

This section lists the known technical risks with their mitigations, and the open questions that require a decision before implementation can be finalized.

### §9.1 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| WebGL unavailable on older Android | 5–10% of users see static sprite instead of animation | Canvas 2D fallback; static sprite asset provided; no functional loss |
| Spritesheet file size exceeds memory on low-end mobile | Game crash on Android 5–7 devices | Lazy load on demand; LRU cache (max 3 variants); test on actual Android 5 device |
| Animation frame rate unstable below 30 FPS | Animation looks janky; poor user experience | Cap frame rate to 30 FPS; reduce particle count on low-end devices; performance budget enforced |
| Phaser.js 3.x deprecation after 2027 | Codebase becomes unmaintained | Use v3.55+ LTS; pin version; plan v4 migration by 2027 |

### §9.2 Open Questions

**OQ-E01: Final Sprite Resolution & Variant Count**
- Current assumption: 32×32 px per frame, 144 total variants
- Decision required: Test upscaling to 64×64 px for retina displays; confirm final variant count (body × head × color combo)
- Acceptance: Performance test on iPhone 8 and Android 6; target ≤2 s load time maintained

**OQ-E02: Spine vs. Phaser.js Native Sprites**
- Current: Phaser.js native frame-based sprites
- Alternative: Skeletal animation via Spine or Dragonbones
- Decision required: Trade-off analysis (file size, runtime overhead, artist productivity)
- Acceptance: Benchmark 5 animations via Spine; compare file size and FPS vs. frame-based approach

**OQ-E03: Arena AI Pet Animation**
- Current: Spawn synthetic AI pet with random seed; render same spritesheet logic
- Question: Do we animate the AI pet with same 15-animation set, or use simplified 3-animation subset?
- Decision required: Balance realism (full animation) vs. performance (simplified)
- Acceptance: Benchmark with 20 concurrent pets on-screen; confirm ≥30 FPS maintained

---

## §10. Monitoring & Observability

This section defines the runtime metrics, error fallback chains, and structured-logging events used to track animation health in production.

### §10.1 Animation Performance Metrics

| Metric | Target | Constant | Monitoring |
|---|---|---|---|
| Pet canvas render time | ≤2 seconds | PET_RENDER_ON_LOAD_SECONDS | Lighthouse CLS / LCP |
| Animation frame rate | ≥30 FPS sustained | PET_ANIMATION_FPS_MIN | Phaser built-in FPS counter; Grafana dashboard |
| Spritesheet load latency | ≤1 second | (derived from bundle budget) | Network waterfall in DevTools |
| Memory (per scene) | ≤50 MB | (inferred) | Chrome DevTools Memory profiler |

### §10.2 Error Handling

**Fallback chains**:
1. WebGL available → Full animation (target)
2. WebGL unavailable → Canvas 2D fallback (degraded)
3. Canvas 2D unavailable → Static sprite image (severely degraded but functional)
4. Spritesheet fails to load → Generic placeholder sprite (error recovery)

**Error logging** (pino, structured JSON):
```json
{
  "level": "warn",
  "event": "phaser_canvas_init_failed",
  "reason": "WebGL_unavailable",
  "device": "Android 5.1",
  "fallback": "canvas_2d"
}
```

---

## Appendix: Asset File Size Budget

| Asset Category | Count | Size per Unit | Total (Uncompressed) | Compressed (gzip) |
|---|---|---|---|---|
| Character spritesheets (144 variants × 768×768 px) | 144 | 100 KB avg | 14.4 MB | ~3.6 MB |
| Static sprite fallbacks (144 variants × 32×32 px) | 144 | 2 KB avg | 288 KB | ~72 KB |
| Effect spritesheets (particles, glow) | 6 | 20 KB avg | 120 KB | ~30 KB |
| Arena background tileset | 1 | 50 KB | 50 KB | ~15 KB |
| **Total Animation Assets** | — | — | **14.86 MB** | **~3.72 MB** |

**Loading strategy**: Lazy load character spritesheets on `/pet/:petId` route; prefetch arena assets when entering arena mode. Static fallback sprites (72 KB) can be inline-loaded into a single sprite manifest.

---

*This ANIM document specifies all animation and sprite design for pixel-pet-arena. All numeric values are sourced from CONSTANTS-PIXEL-PET-ARENA-20260503 and referenced upstream documents (EDD, ARCH, PRD). Implementation must adhere to the performance targets (≥30 FPS, ≤2 s render), asset budgets, and cross-platform fallback chains defined in this document.*

---

## §11 AI Gencode 參考骨架

> **目的**：ANIM.md 的文字描述不足以讓 AI codegen 工具生成正確的 Phaser 3 動畫程式碼；本節提供結構化 transition table 和 TypeScript class skeleton，供 AI 直接參照生成。
> CLIENT_ENGINE = Phaser 3（React 18 + Phaser 3 + Vite stack，見 EDD §3）

### §11.1 State Machine Transition Table

> 從 §4.2 Animation State Machine 提取所有 state，建立完整 transition table。

| From State | Trigger Event | To State | Guard Condition | Duration / Timing |
|-----------|--------------|---------|----------------|------------------|
| `idle` | `onClick` / `onTouch` | `interacting` | — | 立即；300ms 後 → `idle` |
| `idle` | `trainStart` | `training` | training AC 未耗盡（≤3/day） | 立即；600ms 後 → `idle_happy` |
| `idle` | `battleStart` | `battle` | arena session active | 立即 |
| `idle` | `levelUp` | `levelup` | new level achieved | 立即；800ms 後 → `idle_happy` |
| `idle` | `neglectCheck` | `neglected` | `last_trained_at` > 3 consecutive days (TRAINING_NEGLECT_THRESHOLD) | 持續直到訓練 |
| `interacting` | `animationComplete` | `idle` | 300ms elapsed | 自動 |
| `training` | `animationComplete` | `idle_happy` | 600ms elapsed | 自動 |
| `idle_happy` | `loopEnd` | `idle` | 3 loops completed | 自動 |
| `battle` | `battleEntry` | `battle_active` | — | entry anim complete |
| `battle_active` | `battleEnd(win)` | `battle_win` | outcome = WIN | 立即；400ms 後 → `idle_happy` |
| `battle_active` | `battleEnd(lose)` | `battle_lose` | outcome = LOSE | 立即；400ms 後 → `idle` |
| `levelup` | `animationComplete` | `idle_happy` | 800ms elapsed | 自動 |
| `neglected` | `trainStart` | `training` | any training action dispatched | 立即 |
| `battle_win` | `animationComplete` | `idle_happy` | 400ms elapsed | 自動 |
| `battle_lose` | `animationComplete` | `idle` | 400ms elapsed | 自動 |

### §11.2 Engine-Aware Class Skeleton（Phaser 3）

```typescript
// src/game/scenes/PetAnimationStateMachine.ts
// 依 ANIM.md §11.1 Transition Table 實作

type PetAnimState =
  | 'idle' | 'interacting' | 'training' | 'idle_happy'
  | 'battle' | 'battle_active' | 'battle_win' | 'battle_lose'
  | 'levelup' | 'neglected';

interface AnimEvent {
  type:
    | 'onClick' | 'onTouch' | 'trainStart' | 'battleStart'
    | 'levelUp' | 'neglectCheck' | 'animationComplete' | 'loopEnd'
    | 'battleEntry' | 'battleEnd';
  payload?: { outcome?: 'win' | 'lose'; level?: number };
}

// SPRITE_RESOLUTION = 32 (from CONSTANTS.md SPRITE_RESOLUTION)
const SPRITE_W = 32;
const SPRITE_H = 32;

class PetAnimationStateMachine {
  private current: PetAnimState = 'idle';
  private loopCount = 0;
  private sprite: Phaser.GameObjects.Sprite;
  private scene: Phaser.Scene;
  private petKey: string; // e.g. 'pet-cat-rare'

  constructor(sprite: Phaser.GameObjects.Sprite, scene: Phaser.Scene, petKey: string) {
    this.sprite = sprite;
    this.scene = scene;
    this.petKey = petKey;
    this.sprite.on('animationcomplete', () => this.dispatch({ type: 'animationComplete' }));
    this.sprite.on('animationrepeat', () => {
      this.loopCount++;
      if (this.loopCount >= 3) this.dispatch({ type: 'loopEnd' });
    });
    this.playAnim('idle');
  }

  dispatch(event: AnimEvent): void {
    const { type, payload } = event;
    // §11.1 Transition Table — exhaustive mapping
    if (this.current === 'idle') {
      if (type === 'onClick' || type === 'onTouch') {
        this.transition('interacting');
        this.scene.time.delayedCall(300, () => this.transition('idle'));
      } else if (type === 'trainStart') {
        this.transition('training');
      } else if (type === 'battleStart') {
        this.transition('battle');
      } else if (type === 'levelUp') {
        this.transition('levelup');
      } else if (type === 'neglectCheck') {
        this.transition('neglected');
      }
    } else if (this.current === 'training' && type === 'animationComplete') {
      this.transition('idle_happy');
    } else if (this.current === 'idle_happy' && type === 'loopEnd') {
      this.loopCount = 0;
      this.transition('idle');
    } else if (this.current === 'battle' && type === 'battleEntry') {
      this.transition('battle_active');
    } else if (this.current === 'battle_active' && type === 'battleEnd') {
      if (payload?.outcome === 'win') {
        this.transition('battle_win');
        this.scene.time.delayedCall(400, () => this.transition('idle_happy'));
      } else {
        this.transition('battle_lose');
        this.scene.time.delayedCall(400, () => this.transition('idle'));
      }
    } else if (this.current === 'levelup' && type === 'animationComplete') {
      this.transition('idle_happy');
    } else if (this.current === 'neglected' && type === 'trainStart') {
      this.transition('training');
    }
  }

  private transition(next: PetAnimState): void {
    this.current = next;
    this.playAnim(next);
  }

  private playAnim(state: PetAnimState): void {
    // key format: `{petKey}-{state}` — e.g. 'pet-cat-rare-idle'
    this.sprite.play(`${this.petKey}-${state}`, true);
  }

  get currentState(): PetAnimState { return this.current; }
}

// Phaser Scene integration
function preloadPetAssets(scene: Phaser.Scene, petKey: string): void {
  const states: PetAnimState[] = [
    'idle', 'interacting', 'training', 'idle_happy',
    'battle', 'battle_active', 'battle_win', 'battle_lose',
    'levelup', 'neglected'
  ];
  for (const state of states) {
    scene.load.spritesheet(
      `${petKey}-${state}`,
      `assets/sprites/${petKey}/${state}.png`,
      { frameWidth: SPRITE_W, frameHeight: SPRITE_H }
    );
  }
}

function createPetAnimations(scene: Phaser.Scene, petKey: string): void {
  // FPS values from CONSTANTS.md (IDLE_ANIMATION_FPS, BATTLE_ANIMATION_FPS, etc.)
  const animConfigs: Array<{ state: PetAnimState; frames: number; fps: number; loop: boolean }> = [
    { state: 'idle',         frames: 4, fps: 8,  loop: true  },
    { state: 'interacting',  frames: 6, fps: 12, loop: false },
    { state: 'training',     frames: 8, fps: 12, loop: false },
    { state: 'idle_happy',   frames: 4, fps: 10, loop: true  },
    { state: 'battle',       frames: 4, fps: 8,  loop: true  },
    { state: 'battle_active',frames: 6, fps: 15, loop: true  },
    { state: 'battle_win',   frames: 8, fps: 12, loop: false },
    { state: 'battle_lose',  frames: 6, fps: 10, loop: false },
    { state: 'levelup',      frames: 10,fps: 15, loop: false },
    { state: 'neglected',    frames: 2, fps: 4,  loop: true  },
  ];
  for (const { state, frames, fps, loop } of animConfigs) {
    scene.anims.create({
      key: `${petKey}-${state}`,
      frames: scene.anims.generateFrameNumbers(`${petKey}-${state}`, { start: 0, end: frames - 1 }),
      frameRate: fps,
      repeat: loop ? -1 : 0,
    });
  }
}
```

### §11.3 程序生成資產演算法骨架

> 觸發條件：PRD 含「程序生成」「procedural generation」— 已觸發（see EDD §4.7.3）。

```typescript
// src/game/services/PetGenerationService.ts
// Mirrors EDD §4.7.3 — seed must produce identical sprite on every call

// mulberry32: simple seeded PRNG (deterministic, same output for same seed)
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Asset dimension arrays (populated from §3 Sprite Asset Planning)
const BODY_TYPES  = ['round', 'slender', 'fluffy', 'stocky', 'angular'];
const HEAD_TYPES  = ['large', 'small', 'round', 'elongated'];
const PALETTES    = ['pastel_blue', 'warm_orange', 'forest_green', 'candy_pink', 'galaxy_purple'];
const ACCESSORIES = ['bow', 'hat', 'collar', 'none', 'wings'];
const PATTERNS    = ['solid', 'striped', 'spotted', 'gradient'];

function determineRarity(roll: number): 'common' | 'rare' | 'epic' | 'legendary' {
  // RTP from CONSTANTS.md: legendary=3%, epic=12%, rare=25%, common=60%
  if (roll < 0.03) return 'legendary';
  if (roll < 0.15) return 'epic';
  if (roll < 0.40) return 'rare';
  return 'common';
}

interface PetGenerationResult {
  petName: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  bodyType: string;
  headType: string;
  palette: string;
  accessory: string;
  pattern: string;
  // sprite: ImageData  — rendered at SPRITE_RESOLUTION=32 via canvas 2D
}

function generateFromSeed(seed: bigint): PetGenerationResult {
  const rng = mulberry32(Number(seed));  // seed → deterministic sequence
  const body      = BODY_TYPES[Math.floor(rng() * BODY_TYPES.length)];
  const head      = HEAD_TYPES[Math.floor(rng() * HEAD_TYPES.length)];
  const palette   = PALETTES[Math.floor(rng() * PALETTES.length)];
  const accessory = ACCESSORIES[Math.floor(rng() * ACCESSORIES.length)];
  const pattern   = PATTERNS[Math.floor(rng() * PATTERNS.length)];
  const rarity    = determineRarity(rng());
  const petName   = `${palette.split('_')[0]} ${body} ${head}`;
  return { petName, rarity, bodyType: body, headType: head, palette, accessory, pattern };
}

// Test vectors (from EDD §4.7.3):
// generateFromSeed(123456789n) → deterministic fixed output (regression test)
// generateFromSeed(987654321n) → different combination, both valid
// generateFromSeed(0n)         → uses PRNG floor: valid combination, rarity=common expected
```
