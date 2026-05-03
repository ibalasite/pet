---
doc-type: RESOURCE
output-path: docs/RESOURCE.md
upstream-docs:
  - docs/VDD.md    # Visual design: characters, UI color system, icon style, sprite specs, backgrounds
  - docs/EDD.md    # Tech stack: Web / Phaser.js / React, asset pipeline
  - docs/FRONTEND.md  # Asset usage, loading strategy, directory structure
  - docs/CLIENT_IMPL.md  # Asset budgets, naming conventions, loading constraints
version: "1.0.0"
last-updated: "2026-05-03"
---

# pixel-pet-arena — AI Asset Production Order (RESOURCE)

> **Purpose**: This document is the structured AI asset production inventory listing all visual assets required for pixel-pet-arena. Each row represents an independent production task including generation prompts, performance budgets, and delivery paths. Designers can submit prompts directly to AI generation tools once confirmed.
>
> **Upstream sources**: Derived from `docs/VDD.md`, `docs/EDD.md`, `docs/FRONTEND.md`, and `docs/CLIENT_IMPL.md`. To modify design specifications, update the relevant design documents first, then regenerate this document.
>
> **Platform**: Web (HTML5 SPA — Vercel CDN). Target engine: Phaser.js 3 + React 18. Sprite resolution: 32×32 px base frame (SPRITE_RESOLUTION_PX = 32 from CONSTANTS).
>
> **No ANIM.md**: Skeletal animation section (§2) covers Phaser.js sprite sheet animations only — no ANIM.md exists for this project.
> **No AUDIO.md**: Audio is deferred to Phase 2 — §3 notes this explicitly.

---

## Change Log

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-03 | Gen Agent | Initial generation — AI asset production order for pixel-pet-arena |

---

## Field Reference

| Field | Description |
|-------|-------------|
| `ID` | Unique asset identifier (RES-IMG-001, RES-ANIM-001, etc.) |
| `filename` | Final deliverable filename (with extension) |
| `type` | `image` / `animation` / `particle` / `font` |
| `source_tool` | Generation tool (Stable Diffusion XL / Midjourney v6 / DALL-E 3 / hand-crafted pixel art tool / Aseprite) |
| `prompt` | Ready-to-use generation prompt (English). For pixel art sprites, describes the pixel grid style, color constraints, and frame layout. |
| `dimensions` | Image: W×H px; animation: frames × fps |
| `file_size_budget` | Performance budget ceiling |
| `status` | `needed` / `prompt_ready` / `generating` / `generated` / `approved` / `rejected` |
| `output_path` | Final delivery path in repo |
| `description` | Usage notes and design considerations |

---

## §1 VDD Visual Asset Inventory (Images / Icons / Illustrations)

> **Upstream**: `docs/VDD.md §4 Character & World Design` + `docs/VDD.md §5 UI Visual System` + `docs/VDD.md §7 Asset Pipeline` + `docs/VDD.md §8 Screen Visual Specs`
>
> Platform detection: **Web / Phaser.js** → recommended source_tool: Stable Diffusion XL (pixel art) or Aseprite (hand-crafted pixel art). For UI/background assets: Midjourney v6 / DALL-E 3.

### §1.1 Pet Sprites (VDD §4.2 — Procedurally Generated)

> Pet sprites are deterministic from seed (same seed → same appearance). The assets below are **template/reference sprites** representing each rarity tier, used to establish visual language and serve as fallbacks. Runtime sprites are generated server-side from seeds. Max 16 colors per sprite (VDD §4.2 pixel art constraint).

| ID | filename | type | source_tool | prompt | dimensions | file_size_budget | status | output_path | description |
|----|----------|------|-------------|--------|-----------|-----------------|--------|-------------|-------------|
| RES-IMG-001 | pet-common-reference-64.png | image | Stable Diffusion XL | small cute creature pixel art sprite, common grey tier, flat grey palette `#b2bec3` border, 64x64px pixel grid, max 16 colors, hard pixel edges no antialiasing, transparent background, retro 8-bit RPG monster style, front-facing idle pose, `image-rendering: pixelated` | 64×64px | ≤ 20 KB | needed | public/assets/sprites/reference/pet-common-reference-64.png | Common rarity reference sprite — flat grey border `#b2bec3`, matte finish, no glow. Used as visual language baseline and fallback. |
| RES-IMG-002 | pet-common-reference-32.png | image | Stable Diffusion XL | small cute creature pixel art sprite thumbnail, common grey tier, flat grey `#b2bec3` border, 32x32px pixel grid, max 16 colors, hard pixel edges, transparent background, retro 8-bit style, front-facing idle pose | 32×32px | ≤ 8 KB | needed | public/assets/sprites/reference/pet-common-reference-32.png | Common rarity thumbnail (leaderboard, trade cards) — 32×32px @1x per VDD §4.2 |
| RES-IMG-003 | pet-rare-reference-64.png | image | Stable Diffusion XL | small cute creature pixel art sprite, rare teal tier, teal `#4ecdc4` border accent, slight teal glow effect, 64x64px pixel grid, max 16 colors, hard pixel edges no antialiasing, transparent background, retro 8-bit RPG style, front-facing idle pose | 64×64px | ≤ 20 KB | needed | public/assets/sprites/reference/pet-rare-reference-64.png | Rare rarity reference sprite — teal border `#4ecdc4`, faint teal outer glow `rgba(78,205,196,0.3)`. |
| RES-IMG-004 | pet-epic-reference-64.png | image | Stable Diffusion XL | small cute creature pixel art sprite, epic purple tier, purple `#a29bfe` border, 64x64px pixel grid, max 16 colors, hard pixel edges, transparent background, retro 8-bit RPG monster style, front-facing idle pose, more elaborate design than common | 64×64px | ≤ 20 KB | needed | public/assets/sprites/reference/pet-epic-reference-64.png | Epic rarity reference sprite — purple border `#a29bfe`, animated shimmer border in CSS. More detailed design than common/rare. |
| RES-IMG-005 | pet-legendary-reference-64.png | image | Stable Diffusion XL | small cute creature pixel art sprite, legendary gold tier, gold `#fdcb6e` border glow, 64x64px pixel grid, max 16 colors, hard pixel edges, transparent background, retro 8-bit RPG style, front-facing idle pose, most elaborate and distinct design, glowing aura feel | 64×64px | ≤ 20 KB | needed | public/assets/sprites/reference/pet-legendary-reference-64.png | Legendary rarity reference sprite — gold border `#fdcb6e`, CRT glow effect via CSS `box-shadow`, animated shimmer. Highest visual tier. |
| RES-IMG-006 | pet-neglected-overlay-64.png | image | Stable Diffusion XL | pixel art wilted overlay for pet sprite, drooping accessories wilted state, 64x64px, transparent except overlay elements, muted desaturated grey tones, hard pixel edges, 8-bit style | 64×64px | ≤ 10 KB | needed | public/assets/sprites/reference/pet-neglected-overlay-64.png | Neglected state wilted accessory frame overlay (VDD §4.2). Applied on top of base sprite after TRAINING_NEGLECT_THRESHOLD_DAYS = 3 days. Combined with CSS `filter: grayscale(60%) brightness(0.8)`. |
| RES-IMG-007 | pet-sheet-template-512x64.png | image | Aseprite | pixel art sprite sheet template, 8 animation frames in a single horizontal row, 64x64px per frame, total 512x64px, idle animation cycle 4-8 frames at 30fps, creature placeholder silhouette, transparent background, 8-bit retro game style, hard pixel edges | 512×64px | ≤ 50 KB | needed | public/assets/sprites/reference/pet-sheet-template-512x64.png | Reference sprite sheet atlas format (VDD §7.1): 8 frames × 64px = 512×64px single row. Phaser.js `atlasJSON` format. Used to validate atlas layout before generating seed-specific sheets. |
| RES-IMG-008 | pet-run-sheet-template-256x64.png | image | Aseprite | pixel art run cycle sprite sheet template, 4 animation frames horizontal row, 64x64px per frame, total 256x64px, running motion 4-frame loop, creature placeholder, transparent background, 8-bit retro game, hard pixel edges | 256×64px | ≤ 25 KB | needed | public/assets/sprites/reference/pet-run-sheet-template-256x64.png | Arena race run cycle sprite sheet (VDD §7.1): 4 run frames × 64px = 256×64px. Used in ArenaBattleScene ANIM-08 battle race cycle. |

### §1.2 Food Item Sprites (VDD §4 / EDD §0 — Food Buffs)

> Food items grant stat buffs (VDD §8.9 / EDD FOOD_BUFF constants). Each food type is a distinct 32×32px pixel art item icon.

| ID | filename | type | source_tool | prompt | dimensions | file_size_budget | status | output_path | description |
|----|----------|------|-------------|--------|-----------|-----------------|--------|-------------|-------------|
| RES-IMG-009 | food-speed-buff-32.png | image | Stable Diffusion XL | pixel art food item icon, lightning bolt energy drink or feather, speed buff theme, 32x32px, bright yellow-gold `#fdcb6e` accent color, transparent background, hard pixel edges, 8-bit retro game item style, max 8 colors, bold clear silhouette | 32×32px | ≤ 8 KB | needed | public/assets/sprites/food/food-speed-buff-32.png | Speed stat buff food item. Displayed in FoodInventory component on PetPage. |
| RES-IMG-010 | food-strength-buff-32.png | image | Stable Diffusion XL | pixel art food item icon, dumbbell or meat protein food, strength buff theme, 32x32px, deep purple `#a29bfe` accent color, transparent background, hard pixel edges, 8-bit retro game item style, max 8 colors, bold clear silhouette | 32×32px | ≤ 8 KB | needed | public/assets/sprites/food/food-strength-buff-32.png | Strength stat buff food item. Displayed in FoodInventory component on PetPage. |
| RES-IMG-011 | food-stamina-buff-32.png | image | Stable Diffusion XL | pixel art food item icon, green herb or shield potion, stamina/defense buff theme, 32x32px, teal `#4ecdc4` accent color, transparent background, hard pixel edges, 8-bit retro game item style, max 8 colors, bold clear silhouette | 32×32px | ≤ 8 KB | needed | public/assets/sprites/food/food-stamina-buff-32.png | Stamina stat buff food item. Displayed in FoodInventory component on PetPage. |
| RES-IMG-012 | food-all-buff-32.png | image | Stable Diffusion XL | pixel art food item icon, golden star or rainbow candy, all-stats buff theme, 32x32px, gold `#fdcb6e` with rainbow shimmer hint, transparent background, hard pixel edges, 8-bit retro game item style, max 8 colors, premium look | 32×32px | ≤ 8 KB | needed | public/assets/sprites/food/food-all-buff-32.png | All-stats buff food item (premium food type). Displayed in FoodInventory component on PetPage. |

### §1.3 Arena & Scene Backgrounds (VDD §4.3 / §7.5)

| ID | filename | type | source_tool | prompt | dimensions | file_size_budget | status | output_path | description |
|----|----------|------|-------------|--------|-----------|-----------------|--------|-------------|-------------|
| RES-IMG-013 | bg-arena-track-tile-32x8.png | image | Aseprite | pixel art repeating track tile pattern, dark pixel grid 32x8px, dark charcoal `#2d2d5a` base with subtle lane markings, hard pixel edges, game arena floor tile for CSS background-repeat | 32×8px | ≤ 2 KB | needed | public/assets/backgrounds/bg-arena-track-tile-32x8.png | Arena race track tile (VDD §4.3 + §7.5). Dark track tile pattern — repeating 16×8px conceptually, but delivered as 32×8 for pixel doubling. CSS: `background-repeat: repeat-x` on `--color-surface-overlay`. |
| RES-IMG-014 | bg-arena-race.webp | image | Midjourney v6 | pixel art arena racing background, dark navy `#1a1a2e` base, retro game race track scene, checkered finish line alternating 4x4px squares, lane dividers 2px dashed, side audience stands pixel art style, atmospheric dark with minimal color, 8-bit retro game art style, wide cinematic view, no antialiasing | 1920×400px | ≤ 200 KB | needed | public/assets/backgrounds/bg-arena-race.webp | Full arena race backdrop (VDD §4.3 + §7.5). Primary AVIF target ≤ 150 KB; WebP fallback ≤ 200 KB. Used in ArenaScene Phaser background. |
| RES-IMG-015 | bg-arena-race.avif | image | Midjourney v6 | pixel art arena racing background, dark navy `#1a1a2e` base, retro game race track scene, checkered finish line alternating 4x4px squares, lane dividers 2px dashed, side audience stands pixel art style, atmospheric dark with minimal color, 8-bit retro game art style, wide cinematic view, no antialiasing | 1920×400px | ≤ 150 KB | needed | public/assets/backgrounds/bg-arena-race.avif | Full arena race backdrop AVIF primary format (VDD §7.5). Served preferentially over WebP for supported browsers. |
| RES-IMG-016 | bg-arena-sumo.webp | image | Midjourney v6 | pixel art sumo arena background, dark navy `#1a1a2e` base, circular pixel ring with gold `#fdcb6e` border 4px wide, sumo ring interior `#242444` raised surface, darker push-out zone at ring edge, retro 8-bit game art, top-down slightly isometric view, atmospheric dark scene | 1920×400px | ≤ 200 KB | needed | public/assets/backgrounds/bg-arena-sumo.webp | Sumo arena backdrop (VDD §4.3 Phase 1 — behind FF_ARENA_SUMO feature flag). WebP format. |
| RES-IMG-017 | bg-page-pattern.svg | image | Aseprite / hand-crafted | subtle pixel art dot grid tileable pattern, 16x16px tile, dark navy on deep navy `#1a1a2e`, very low opacity dots, retro CRT scanline texture feel, pure SVG geometric, no raster content | 16×16px tile (SVG, tileable) | ≤ 10 KB | needed | public/assets/backgrounds/bg-page-pattern.svg | Subtle page background texture (VDD §7.5). Applied as optional texture on base surfaces. SVG primary; PNG fallback ≤ 20 KB. |
| RES-IMG-018 | bg-page-pattern-fallback.png | image | Aseprite | subtle pixel art dot grid tileable pattern, 16x16px tile, dark navy on deep navy `#1a1a2e`, very low opacity, retro CRT feel, rasterized fallback | 16×16px tile (PNG tileable) | ≤ 20 KB | needed | public/assets/backgrounds/bg-page-pattern-fallback.png | PNG fallback for bg-page-pattern.svg (VDD §7.5). For browsers where SVG tiling causes rendering issues. |

### §1.4 UI Icons (VDD §7.2)

> Game UI icons: 24×24px custom pixel-art. SVG primary with `viewBox="0 0 24 24"`. Colors via `currentColor`. PNG fallback at 24×24px. 8 core icons required for game interactions. Non-game navigation icons use Phosphor Icons v2.1 (Bold) — not listed here as they are an npm dependency, not a production asset.

| ID | filename | type | source_tool | prompt | dimensions | file_size_budget | status | output_path | description |
|----|----------|------|-------------|--------|-----------|-----------------|--------|-------------|-------------|
| RES-IMG-019 | icon-arena-race-24.svg | image | Aseprite / hand-crafted SVG | pixel art icon of running figure or race flag, 24x24px viewBox, grid-snapped paths no rounded corners, monochrome using currentColor, bold silhouette readable at small sizes | 24×24px (SVG) | ≤ 2 KB | needed | public/assets/icons/icon-arena-race-24.svg | Race arena mode icon — used in ModeSelector and arena navigation. `aria-hidden="true"` decorative; parent button has `aria-label`. |
| RES-IMG-020 | icon-arena-sumo-24.svg | image | Aseprite / hand-crafted SVG | pixel art icon of two figures pushing or sumo ring circle, 24x24px viewBox, grid-snapped paths, monochrome currentColor, bold readable silhouette | 24×24px (SVG) | ≤ 2 KB | needed | public/assets/icons/icon-arena-sumo-24.svg | Sumo arena mode icon — used in ModeSelector. Behind FF_ARENA_SUMO feature flag. |
| RES-IMG-021 | icon-rarity-common-16.svg | image | Aseprite / hand-crafted SVG | pixel art diamond or star icon, common grey tier, 16x16px viewBox, grid-snapped paths, monochrome currentColor, minimalist pixel badge shape | 16×16px (SVG) | ≤ 1 KB | needed | public/assets/icons/icon-rarity-common-16.svg | Common rarity badge icon — used in RarityBadge component and LeaderboardRow. Colored via CSS `--color-rarity-common` (#b2bec3). |
| RES-IMG-022 | icon-rarity-rare-16.svg | image | Aseprite / hand-crafted SVG | pixel art diamond or star icon, rare teal tier, 16x16px viewBox, grid-snapped paths, monochrome currentColor, slightly more elaborate than common | 16×16px (SVG) | ≤ 1 KB | needed | public/assets/icons/icon-rarity-rare-16.svg | Rare rarity badge icon. Colored via CSS `--color-rarity-rare` (#4ecdc4). |
| RES-IMG-023 | icon-rarity-epic-16.svg | image | Aseprite / hand-crafted SVG | pixel art diamond or star icon, epic purple tier, 16x16px viewBox, grid-snapped paths, monochrome currentColor, more facets than rare | 16×16px (SVG) | ≤ 1 KB | needed | public/assets/icons/icon-rarity-epic-16.svg | Epic rarity badge icon. Colored via CSS `--color-rarity-epic` (#a29bfe). |
| RES-IMG-024 | icon-rarity-legendary-16.svg | image | Aseprite / hand-crafted SVG | pixel art crown or star burst icon, legendary gold tier, 16x16px viewBox, grid-snapped paths, monochrome currentColor, crown shape signaling highest tier | 16×16px (SVG) | ≤ 1 KB | needed | public/assets/icons/icon-rarity-legendary-16.svg | Legendary rarity badge icon. Colored via CSS `--color-rarity-legendary` (#fdcb6e). Most elaborate of the 4 rarity icons. |
| RES-IMG-025 | icon-training-run-24.svg | image | Aseprite / hand-crafted SVG | pixel art running shoe or lightning bolt icon, speed training action, 24x24px viewBox, grid-snapped paths, monochrome currentColor, bold clear silhouette | 24×24px (SVG) | ≤ 2 KB | needed | public/assets/icons/icon-training-run-24.svg | Run/Speed training action icon — used in TrainingActionCard. |
| RES-IMG-026 | icon-training-strength-24.svg | image | Aseprite / hand-crafted SVG | pixel art dumbbell or fist icon, strength training action, 24x24px viewBox, grid-snapped paths, monochrome currentColor, bold readable at 24px | 24×24px (SVG) | ≤ 2 KB | needed | public/assets/icons/icon-training-strength-24.svg | Strength training action icon — used in TrainingActionCard. |
| RES-IMG-027 | icon-training-stamina-24.svg | image | Aseprite / hand-crafted SVG | pixel art shield or heart icon, stamina training action, 24x24px viewBox, grid-snapped paths, monochrome currentColor, bold clear shape | 24×24px (SVG) | ≤ 2 KB | needed | public/assets/icons/icon-training-stamina-24.svg | Stamina training action icon — used in TrainingActionCard. |
| RES-IMG-028 | icon-food-24.svg | image | Aseprite / hand-crafted SVG | pixel art food bowl or apple icon, food inventory action, 24x24px viewBox, grid-snapped paths, monochrome currentColor, clear readable silhouette | 24×24px (SVG) | ≤ 2 KB | needed | public/assets/icons/icon-food-24.svg | Food inventory icon — used in FoodInventory component header and NavBar. |
| RES-IMG-029 | icon-share-24.svg | image | Aseprite / hand-crafted SVG | pixel art share or link arrow icon, social share action, 24x24px viewBox, grid-snapped paths, monochrome currentColor, bold pixel art style share symbol | 24×24px (SVG) | ≤ 2 KB | needed | public/assets/icons/icon-share-24.svg | Share battle / pet page icon — used in ShareBattleButton and BattleRecordsPage. |
| RES-IMG-030 | icon-copy-24.svg | image | Aseprite / hand-crafted SVG | pixel art clipboard copy icon, 24x24px viewBox, grid-snapped paths, monochrome currentColor, two overlapping rectangles pixel style | 24×24px (SVG) | ≤ 2 KB | needed | public/assets/icons/icon-copy-24.svg | Copy to clipboard icon — used in URLReveal (claim pet URL copy button). |

### §1.5 Logo & Brand Assets (VDD §3.4 / §7.4)

| ID | filename | type | source_tool | prompt | dimensions | file_size_budget | status | output_path | description |
|----|----------|------|-------------|--------|-----------|-----------------|--------|-------------|-------------|
| RES-IMG-031 | logo-primary-dark.svg | image | Aseprite / hand-crafted SVG | pixel art wordmark "pixel-pet-arena" in Press Start 2P font style, dark background variant, near-white `#e8e8f0` color, 160x32px, hard pixel edges, grid-aligned letterforms, pure SVG vector | 160×32px (SVG) | ≤ 8 KB | needed | public/assets/brand/logo-primary-dark.svg | Primary logo — dark surfaces. Nav bar logo (160×32px). VDD §3.4 + §7.4. SVG primary; SVGO optimized. |
| RES-IMG-032 | logo-primary-dark.png | image | Aseprite / hand-crafted PNG export | pixel art wordmark "pixel-pet-arena", Press Start 2P style, near-white `#e8e8f0`, dark background, 320x64px @2x, hard pixel edges, PNG-24 with alpha | 320×64px @2x | ≤ 50 KB | needed | public/assets/brand/logo-primary-dark.png | PNG @2x export of primary logo (VDD §7.4). Used where SVG rendering is unreliable. |
| RES-IMG-033 | logo-inverted.svg | image | Aseprite / hand-crafted SVG | pixel art wordmark "pixel-pet-arena" in Press Start 2P font style, light background variant, dark navy `#1a1a2e` color, 160x32px, hard pixel edges, grid-aligned letterforms | 160×32px (SVG) | ≤ 8 KB | needed | public/assets/brand/logo-inverted.svg | Inverted logo — light background contexts (VDD §7.4). Admin portal and print-adjacent uses. |
| RES-IMG-034 | logo-inverted.png | image | Aseprite / hand-crafted PNG export | pixel art wordmark, light background, dark navy `#1a1a2e`, 320x64px @2x, hard pixel edges | 320×64px @2x | ≤ 50 KB | needed | public/assets/brand/logo-inverted.png | PNG @2x export of inverted logo (VDD §7.4). |
| RES-IMG-035 | mark-32.png | image | Aseprite | pixel art pet icon mark, standalone pixel creature silhouette without wordmark, 32x32px monochrome mark, hard pixel edges, works at favicon size, pure black foreground on transparent | 32×32px | ≤ 8 KB | needed | public/assets/brand/mark-32.png | Standalone pixel pet mark (VDD §7.4). Used for favicon (32×32px), browser tab, PWA icon base. |
| RES-IMG-036 | mark-64.png | image | Aseprite | pixel art pet icon mark, standalone pixel creature silhouette, 64x64px, hard pixel edges, dark navy background `#1a1a2e`, gold `#fdcb6e` accent, social avatar scale | 64×64px | ≤ 15 KB | needed | public/assets/brand/mark-64.png | 64×64 standalone mark (VDD §7.4). Social avatar, app icon contexts. |
| RES-IMG-037 | mark-128.png | image | Aseprite | pixel art pet icon mark, standalone pixel creature, 128x128px, dark navy background `#1a1a2e`, gold `#fdcb6e` accent, app icon quality, hard pixel edges, detailed at 128px | 128×128px | ≤ 30 KB | needed | public/assets/brand/mark-128.png | 128×128 standalone mark (VDD §7.4). PWA icon, higher-resolution app icon. |
| RES-IMG-038 | favicon-32.ico | image | Aseprite | pixel art pet icon 32x32px, ICO format, multi-size (16x16, 32x32), dark background, recognizable at 16px tab size, hard pixel edges | 32×32px (ICO with 16×16 embedded) | ≤ 5 KB | needed | public/favicon.ico | Favicon ICO file. Includes 16×16 and 32×32 sizes. Served from `/public/favicon.ico`. |
| RES-IMG-039 | favicon-192.png | image | Aseprite | pixel art pet icon 192x192px PNG, dark navy background `#1a1a2e`, gold `#fdcb6e` pet mark, PWA icon, hard pixel edges, `image-rendering: pixelated` intended | 192×192px | ≤ 30 KB | needed | public/favicon-192.png | PWA icon 192×192px for `manifest.json`. |
| RES-IMG-040 | favicon-512.png | image | Aseprite | pixel art pet icon 512x512px PNG, dark navy background `#1a1a2e`, gold `#fdcb6e` pet mark, PWA splash icon, hard pixel edges | 512×512px | ≤ 80 KB | needed | public/favicon-512.png | PWA icon 512×512px for `manifest.json` and splash screen. |

### §1.6 OG / Social Card Assets (VDD §8.8 / §7.5)

| ID | filename | type | source_tool | prompt | dimensions | file_size_budget | status | output_path | description |
|----|----------|------|-------------|--------|-----------|-----------------|--------|-------------|-------------|
| RES-IMG-041 | og-default-1200x630.avif | image | Midjourney v6 | dark luxury pixel art game card, 1200x630px, deep navy `#1a1a2e` background, "pixel-pet-arena" wordmark in Press Start 2P font upper left, abstract pixel creature silhouette center, rarity color accents gold `#fdcb6e`, purple `#a29bfe`, teal `#4ecdc4`, retro game aesthetic, premium collectible game social share card, hard pixel art style | 1200×630px | ≤ 150 KB | needed | public/assets/og/og-default-1200x630.avif | Default OG card (no specific pet). Used for landing page, leaderboard, and generic social shares. AVIF primary (≤150 KB), WebP fallback ≤200 KB. |
| RES-IMG-042 | og-default-1200x630.webp | image | Midjourney v6 | dark luxury pixel art game card, 1200x630px, deep navy `#1a1a2e` background, "pixel-pet-arena" wordmark in Press Start 2P font upper left, abstract pixel creature silhouette center, rarity color accents gold `#fdcb6e`, purple `#a29bfe`, teal `#4ecdc4`, retro game aesthetic, premium collectible game social share card, hard pixel art style | 1200×630px | ≤ 200 KB | needed | public/assets/og/og-default-1200x630.webp | Default OG card WebP fallback (VDD §7.5). |
| RES-IMG-043 | og-battle-result-template-1200x630.avif | image | Midjourney v6 | dark luxury pixel art battle result card template, 1200x630px, deep navy `#1a1a2e` background, two pixel creature placeholder silhouettes side by side, gold `#fdcb6e` "WIN" pixel text left, space for pet sprite (128x128px) left zone + name + rarity badge center + W/L record right, retro game social card, hard pixel art style | 1200×630px | ≤ 150 KB | needed | public/assets/og/og-battle-result-template-1200x630.avif | Battle result OG card template (VDD §8.8). Pre-rendered per-pet at runtime by server using this as base layout. AVIF primary format. |

### §1.7 UI Scene Backgrounds / Page-Level Visuals (VDD §8)

| ID | filename | type | source_tool | prompt | dimensions | file_size_budget | status | output_path | description |
|----|----------|------|-------------|--------|-----------|-----------------|--------|-------------|-------------|
| RES-IMG-044 | bg-landing-hero.webp | image | Midjourney v6 | dark luxury pixel art landing page hero background, 1920x1080px, deep navy `#1a1a2e` to dark charcoal `#242444` gradient, subtle pixel grid texture, retro CRT glow atmospheric effect, no specific characters, abstract depth and atmosphere, premium dark game aesthetic --ar 16:9 --v 6 | 1920×1080px | ≤ 200 KB | needed | public/assets/backgrounds/bg-landing-hero.webp | Landing page hero background (VDD §8.1). Serves as atmosphere behind PetCanvas. Lazy-loaded below the canvas. |
| RES-IMG-045 | bg-leaderboard.webp | image | Midjourney v6 | dark luxury pixel art leaderboard page background, 1920x1080px, deep navy `#1a1a2e` base, subtle pixel trophy or podium motif, editorial hierarchy feel, retro game scoreboard aesthetic, muted to not compete with table content --ar 16:9 --v 6 | 1920×1080px | ≤ 200 KB | needed | public/assets/backgrounds/bg-leaderboard.webp | Leaderboard page background (VDD §8.7). Subtle, does not compete with table F-pattern scan. Lazy-loaded. |

---

## §2 Animation Asset Inventory (Phaser.js Sprite Sheets)

> **Note**: `docs/ANIM.md` does not exist for this project. This section covers Phaser.js sprite sheet animations defined in `docs/CLIENT_IMPL.md §5.1 Animation List` and `docs/VDD.md §4.2`. No skeletal (Spine/.skel) animations are used — this is a Web/Phaser.js project.
>
> All Phaser sprite sheet animations use PNG sprite atlases loaded via `this.load.spritesheet()`. The 6 animation states defined in CLIENT_IMPL.md §5.3 (idle, bounce, training-effort, neglected, battle-run, battle-victory) each require a dedicated sprite sheet reference.

| ID | filename | type | source_tool | prompt | dimensions | file_size_budget | status | output_path | description |
|----|----------|------|-------------|--------|-----------|-----------------|--------|-------------|-------------|
| RES-ANIM-001 | pet-idle-sheet-ref-512x64.png | animation | Aseprite | pixel art pet idle animation sprite sheet, 8 frames horizontal single row, 64x64px per frame = 512x64px total, gentle bobbing or breathing idle motion, 30fps loop, max 16 colors, transparent background, hard pixel edges, retro 8-bit game character | 8f × 30fps (512×64px) | ≤ 50 KB | needed | public/assets/sprites/anim-ref/pet-idle-sheet-ref-512x64.png | Idle animation reference sheet (CLIENT_IMPL ANIM-01). 4–8 frames, 30 FPS continuous loop. Phaser key: `idle`. Used in PetIdleScene. Actual per-seed sheets generated server-side from seed. |
| RES-ANIM-002 | pet-bounce-sheet-ref-128x64.png | animation | Aseprite | pixel art pet bounce interaction sprite sheet, 2 frames horizontal, 64x64px per frame = 128x64px, frame 1 scale 1.15x squished, frame 2 return to normal, click/tap response animation, transparent background, hard pixel edges | 2f × 30fps (128×64px) | ≤ 15 KB | needed | public/assets/sprites/anim-ref/pet-bounce-sheet-ref-128x64.png | Bounce/interaction animation reference (CLIENT_IMPL ANIM-02). 2-frame sequence, 200ms total. Triggered on canvas click/tap via Phaser `pointerdown`. |
| RES-ANIM-003 | pet-effort-sheet-ref-192x64.png | animation | Aseprite | pixel art pet training effort animation sprite sheet, 3 frames horizontal, 64x64px per frame = 192x64px, exertion/workout motion frames, sweat particles or effort pose, 400ms duration, transparent background, hard pixel edges | 3f × 30fps (192×64px) | ≤ 20 KB | needed | public/assets/sprites/anim-ref/pet-effort-sheet-ref-192x64.png | Training effort animation reference (CLIENT_IMPL ANIM-03). 3-frame sequence, 400ms. Triggered on successful training action mutation. |
| RES-ANIM-004 | pet-run-sheet-ref-256x64.png | animation | Aseprite | pixel art pet run cycle sprite sheet, 4 frames horizontal single row, 64x64px per frame = 256x64px, 8-frame run cycle loop, forward running motion, transparent background, hard pixel edges, arena battle race animation | 8f × 30fps (256×64px) | ≤ 25 KB | needed | public/assets/sprites/anim-ref/pet-run-sheet-ref-256x64.png | Arena battle race run cycle reference (CLIENT_IMPL ANIM-08). 8-frame run loop, 5–15s arena match duration. Used in ArenaBattleScene. Delivered as 4-frame sheet (256×64) per VDD §7.1 spec — duplicated frames for loop. |
| RES-ANIM-005 | pet-victory-sheet-ref-256x64.png | animation | Aseprite | pixel art pet victory celebration sprite sheet, 4 frames horizontal, 64x64px per frame = 256x64px, winner celebration jump or raise arms pose, joyful pixel animation, transparent background, hard pixel edges | 4f × 30fps (256×64px) | ≤ 25 KB | needed | public/assets/sprites/anim-ref/pet-victory-sheet-ref-256x64.png | Battle victory animation reference (CLIENT_IMPL ANIM-08 victory). 4-frame victory sequence played when winner is determined in ArenaBattleScene. Followed by gold particle burst ANIM-09. |
| RES-ANIM-006 | vfx-victory-particles-sheet-256x256.png | particle | Aseprite | pixel art particle sprite sheet for victory burst, 8x8 frames grid = 256x256px total, 64 frames of 32x32px particle frames, 2x2px gold square particles `#fdcb6e`, various scatter trajectories, transparent background, hard pixel edges, 8-bit style sparkle | 256×256px (8×8 frames, 32×32 each) | ≤ 50 KB | needed | public/assets/sprites/vfx/vfx-victory-particles-sheet-256x256.png | Victory particle burst texture (CLIENT_IMPL ANIM-09). 24 gold 2×2px square particles, burst from winner sprite in ArenaBattleScene. `Phaser.GameObjects.Particles` system. Particle source color: Legendary gold `#fdcb6e`. |

---

## §3 Audio Asset Inventory (BGM / SFX)

> **No AUDIO.md exists for this project**. Per `docs/CLIENT_IMPL.md §6` and `docs/EDD.md §1`, audio is **explicitly deferred to Phase 2**. The player app Phase 1 build includes zero audio assets.
>
> This section documents the Phase 2 planned audio assets for reference. All items below have `status: needed` and are not blocking Phase 1 delivery.

> Phase 2 audio plan — not blocking Phase 1. Defined in CLIENT_IMPL.md §6.1 Audio List (Phase 2 — Planned).

| ID | filename | type | source_tool | prompt | dimensions | file_size_budget | status | output_path | description |
|----|----------|------|-------------|--------|-----------|-----------------|--------|-------------|-------------|
| RES-SFX-001 | sfx-ui-click.ogg | sfx | ElevenLabs SFX | short crisp pixel-art UI click sound, retro 8-bit button press, slight satisfying click, 0.2 seconds, game UI interaction sound | 0.2s | ≤ 50 KB | needed | public/assets/audio/sfx/sfx-ui-click.ogg | UI button click SFX (CLIENT_IMPL SFX-01). Triggered on all button/CTA clicks. Phase 2 only. |
| RES-SFX-002 | sfx-claim-success.ogg | sfx | ElevenLabs SFX | pixel-art victory jingle short, retro 8-bit success fanfare, celebratory 3-note ascending melody, 1.5 seconds, coin collect style | 1.5s | ≤ 200 KB | needed | public/assets/audio/sfx/sfx-claim-success.ogg | Claim success SFX (CLIENT_IMPL SFX-02). Triggered on URLReveal mount after successful pet claim. Phase 2 only. |
| RES-SFX-003 | sfx-training-done.ogg | sfx | ElevenLabs SFX | short pixel-art training complete chime, retro 8-bit positive sound, level-up style brief sound, 0.8 seconds, satisfying achievement sound | 0.8s | ≤ 100 KB | needed | public/assets/audio/sfx/sfx-training-done.ogg | Training complete SFX (CLIENT_IMPL SFX-03). Triggered on training mutation success. Phase 2 only. |
| RES-SFX-004 | sfx-battle-win.ogg | sfx | ElevenLabs SFX | pixel-art victory fanfare, retro 8-bit win music short loop, heroic ascending melody, triumphant celebration sound, 2 seconds | 2.0s | ≤ 300 KB | needed | public/assets/audio/sfx/sfx-battle-win.ogg | Battle WIN SFX (CLIENT_IMPL SFX-04). Triggered on WIN result received. Phase 2 only. |
| RES-SFX-005 | sfx-battle-loss.ogg | sfx | ElevenLabs SFX | pixel-art defeat sound effect, retro 8-bit descending tone, sad wah-wah game over sound, not too harsh, 1.5 seconds | 1.5s | ≤ 200 KB | needed | public/assets/audio/sfx/sfx-battle-loss.ogg | Battle LOSS SFX (CLIENT_IMPL SFX-05). Triggered on LOSS result received. Phase 2 only. |
| RES-BGM-001 | bgm-arena.ogg | bgm | Suno v3 | retro 8-bit chiptune arena battle music, fast-paced competitive energy, NES/SNES game style, loopable, 90bpm, 2 minutes, high tension pixel game soundtrack, loop-friendly start and end points | 120s | ≤ 5 MB | needed | public/assets/audio/bgm/bgm-arena.ogg | Arena BGM (CLIENT_IMPL BGM-01). Plays on arena route enter, stops on route leave. Howler.js streaming (`html5: true`). Phase 2 only. |

---

## §4 Review Checklist

- [x] §1 VDD Visual Assets: VDD.md §4 all pet rarity tiers (Common, Rare, Epic, Legendary) have corresponding RES-IMG rows (RES-IMG-001 to RES-IMG-008)
- [x] §1 VDD Visual Assets: VDD.md §4 neglected state sprite overlay covered (RES-IMG-006)
- [x] §1 VDD Visual Assets: VDD.md §5 UI icon set covered (RES-IMG-019 to RES-IMG-030) — 12 custom pixel-art icons, 24×24px SVG
- [x] §1 VDD Visual Assets: VDD.md §7.4 logo/brand assets covered (RES-IMG-031 to RES-IMG-040) — logo primary/inverted, favicon, PWA icons
- [x] §1 VDD Visual Assets: VDD.md §8.1 landing page hero background covered (RES-IMG-044)
- [x] §1 VDD Visual Assets: VDD.md §8.7 leaderboard background covered (RES-IMG-045)
- [x] §1 VDD Visual Assets: VDD.md §4.3 arena backgrounds (race + sumo tiles + full backdrop) covered (RES-IMG-013 to RES-IMG-016)
- [x] §1 VDD Visual Assets: VDD.md §7.5 page background pattern covered (RES-IMG-017, RES-IMG-018)
- [x] §1 VDD Visual Assets: VDD.md §8.8 OG social card template covered (RES-IMG-041 to RES-IMG-043)
- [x] §2 ANIM sprite animations: All 6 CLIENT_IMPL.md §5 Phaser.js animation states covered (idle, bounce, effort, run, victory, particles) (RES-ANIM-001 to RES-ANIM-006)
- [x] §2 ANIM sprite animations: ANIM.md does not exist — §2 covers Phaser.js sprite sheet animations only (N/A — ANIM.md does not exist)
- [x] §3 AUDIO assets: AUDIO.md does not exist — §3 documents Phase 2 planned audio only (N/A — AUDIO.md does not exist; audio is Phase 2)
- [x] All `file_size_budget` fields have concrete values, compliant with Web platform limits: critical-path images ≤ 200 KB, lazy-loaded ≤ 1 MB, sprites ≤ 50 KB, SFX ≤ 500 KB, BGM ≤ 5 MB
- [x] All `prompt` fields are filled with ready-to-use English prompts
- [x] All `output_path` values are consistent with CLIENT_IMPL.md §4.1 directory structure (`public/assets/`, `apps/player/src/assets/` conventions)
- [x] No bare `{{...}}` placeholders remaining (excluding template example rows)
- [x] No duplicate IDs within same prefix (RES-IMG-001 through RES-IMG-045, RES-ANIM-001 through RES-ANIM-006, RES-SFX-001 through RES-SFX-005, RES-BGM-001)
- [x] §5 License Management: all §1/§2/§3 asset IDs have corresponding license records

---

## §5 License & Source Tracking

> **Purpose**: Records license type and source reference for each asset, for legal review and compliance.
> All AI-generated assets use the respective tool's terms of service as the license reference.

| ID | filename | license_type | license_ref | Notes |
|----|----------|-------------|------------|-------|
| RES-IMG-001 | pet-common-reference-64.png | AI-generated | https://stability.ai/terms-of-service | §1.1 Common pet reference sprite — Stable Diffusion XL |
| RES-IMG-002 | pet-common-reference-32.png | AI-generated | https://stability.ai/terms-of-service | §1.1 Common pet thumbnail — Stable Diffusion XL |
| RES-IMG-003 | pet-rare-reference-64.png | AI-generated | https://stability.ai/terms-of-service | §1.1 Rare pet reference sprite — Stable Diffusion XL |
| RES-IMG-004 | pet-epic-reference-64.png | AI-generated | https://stability.ai/terms-of-service | §1.1 Epic pet reference sprite — Stable Diffusion XL |
| RES-IMG-005 | pet-legendary-reference-64.png | AI-generated | https://stability.ai/terms-of-service | §1.1 Legendary pet reference sprite — Stable Diffusion XL |
| RES-IMG-006 | pet-neglected-overlay-64.png | AI-generated | https://stability.ai/terms-of-service | §1.1 Neglected state overlay — Stable Diffusion XL |
| RES-IMG-007 | pet-sheet-template-512x64.png | internal | N/A | §1.1 Sprite sheet template — hand-crafted in Aseprite |
| RES-IMG-008 | pet-run-sheet-template-256x64.png | internal | N/A | §1.1 Run cycle sheet template — hand-crafted in Aseprite |
| RES-IMG-009 | food-speed-buff-32.png | AI-generated | https://stability.ai/terms-of-service | §1.2 Speed buff food icon — Stable Diffusion XL |
| RES-IMG-010 | food-strength-buff-32.png | AI-generated | https://stability.ai/terms-of-service | §1.2 Strength buff food icon — Stable Diffusion XL |
| RES-IMG-011 | food-stamina-buff-32.png | AI-generated | https://stability.ai/terms-of-service | §1.2 Stamina buff food icon — Stable Diffusion XL |
| RES-IMG-012 | food-all-buff-32.png | AI-generated | https://stability.ai/terms-of-service | §1.2 All-stats buff food icon — Stable Diffusion XL |
| RES-IMG-013 | bg-arena-track-tile-32x8.png | internal | N/A | §1.3 Arena track tile — hand-crafted in Aseprite |
| RES-IMG-014 | bg-arena-race.webp | AI-generated | https://docs.midjourney.com/docs/terms-of-service | §1.3 Arena race background — Midjourney v6 |
| RES-IMG-015 | bg-arena-race.avif | AI-generated | https://docs.midjourney.com/docs/terms-of-service | §1.3 Arena race background AVIF — Midjourney v6 (same source as RES-IMG-014, re-exported) |
| RES-IMG-016 | bg-arena-sumo.webp | AI-generated | https://docs.midjourney.com/docs/terms-of-service | §1.3 Arena sumo background — Midjourney v6 |
| RES-IMG-017 | bg-page-pattern.svg | internal | N/A | §1.3 Page background texture — hand-crafted SVG |
| RES-IMG-018 | bg-page-pattern-fallback.png | internal | N/A | §1.3 Page background texture PNG fallback — hand-crafted in Aseprite |
| RES-IMG-019 | icon-arena-race-24.svg | internal | N/A | §1.4 Race icon — hand-crafted pixel-art SVG |
| RES-IMG-020 | icon-arena-sumo-24.svg | internal | N/A | §1.4 Sumo icon — hand-crafted pixel-art SVG |
| RES-IMG-021 | icon-rarity-common-16.svg | internal | N/A | §1.4 Common rarity icon — hand-crafted pixel-art SVG |
| RES-IMG-022 | icon-rarity-rare-16.svg | internal | N/A | §1.4 Rare rarity icon — hand-crafted pixel-art SVG |
| RES-IMG-023 | icon-rarity-epic-16.svg | internal | N/A | §1.4 Epic rarity icon — hand-crafted pixel-art SVG |
| RES-IMG-024 | icon-rarity-legendary-16.svg | internal | N/A | §1.4 Legendary rarity icon — hand-crafted pixel-art SVG |
| RES-IMG-025 | icon-training-run-24.svg | internal | N/A | §1.4 Run training icon — hand-crafted pixel-art SVG |
| RES-IMG-026 | icon-training-strength-24.svg | internal | N/A | §1.4 Strength training icon — hand-crafted pixel-art SVG |
| RES-IMG-027 | icon-training-stamina-24.svg | internal | N/A | §1.4 Stamina training icon — hand-crafted pixel-art SVG |
| RES-IMG-028 | icon-food-24.svg | internal | N/A | §1.4 Food icon — hand-crafted pixel-art SVG |
| RES-IMG-029 | icon-share-24.svg | internal | N/A | §1.4 Share icon — hand-crafted pixel-art SVG |
| RES-IMG-030 | icon-copy-24.svg | internal | N/A | §1.4 Copy icon — hand-crafted pixel-art SVG |
| RES-IMG-031 | logo-primary-dark.svg | internal | N/A | §1.5 Primary logo SVG — hand-crafted wordmark |
| RES-IMG-032 | logo-primary-dark.png | internal | N/A | §1.5 Primary logo PNG @2x — exported from logo SVG |
| RES-IMG-033 | logo-inverted.svg | internal | N/A | §1.5 Inverted logo SVG — hand-crafted wordmark |
| RES-IMG-034 | logo-inverted.png | internal | N/A | §1.5 Inverted logo PNG @2x — exported from logo SVG |
| RES-IMG-035 | mark-32.png | internal | N/A | §1.5 Pixel pet standalone mark 32px |
| RES-IMG-036 | mark-64.png | internal | N/A | §1.5 Pixel pet standalone mark 64px |
| RES-IMG-037 | mark-128.png | internal | N/A | §1.5 Pixel pet standalone mark 128px |
| RES-IMG-038 | favicon-32.ico | internal | N/A | §1.5 Favicon ICO — generated from mark-32.png |
| RES-IMG-039 | favicon-192.png | internal | N/A | §1.5 PWA icon 192px |
| RES-IMG-040 | favicon-512.png | internal | N/A | §1.5 PWA icon 512px |
| RES-IMG-041 | og-default-1200x630.avif | AI-generated | https://docs.midjourney.com/docs/terms-of-service | §1.6 Default OG card AVIF — Midjourney v6 |
| RES-IMG-042 | og-default-1200x630.webp | AI-generated | https://docs.midjourney.com/docs/terms-of-service | §1.6 Default OG card WebP — Midjourney v6 |
| RES-IMG-043 | og-battle-result-template-1200x630.avif | AI-generated | https://docs.midjourney.com/docs/terms-of-service | §1.6 Battle result OG card template — Midjourney v6 |
| RES-IMG-044 | bg-landing-hero.webp | AI-generated | https://docs.midjourney.com/docs/terms-of-service | §1.7 Landing hero background — Midjourney v6 |
| RES-IMG-045 | bg-leaderboard.webp | AI-generated | https://docs.midjourney.com/docs/terms-of-service | §1.7 Leaderboard background — Midjourney v6 |
| RES-ANIM-001 | pet-idle-sheet-ref-512x64.png | internal | N/A | §2 Idle animation reference sheet — hand-crafted in Aseprite |
| RES-ANIM-002 | pet-bounce-sheet-ref-128x64.png | internal | N/A | §2 Bounce animation reference sheet — hand-crafted in Aseprite |
| RES-ANIM-003 | pet-effort-sheet-ref-192x64.png | internal | N/A | §2 Training effort animation reference sheet — hand-crafted in Aseprite |
| RES-ANIM-004 | pet-run-sheet-ref-256x64.png | internal | N/A | §2 Arena run cycle reference sheet — hand-crafted in Aseprite |
| RES-ANIM-005 | pet-victory-sheet-ref-256x64.png | internal | N/A | §2 Victory animation reference sheet — hand-crafted in Aseprite |
| RES-ANIM-006 | vfx-victory-particles-sheet-256x256.png | internal | N/A | §2 Victory particle burst texture — hand-crafted in Aseprite |
| RES-SFX-001 | sfx-ui-click.ogg | AI-generated | https://elevenlabs.io/terms | §3 UI click SFX — ElevenLabs SFX. Phase 2 only. |
| RES-SFX-002 | sfx-claim-success.ogg | AI-generated | https://elevenlabs.io/terms | §3 Claim success SFX — ElevenLabs SFX. Phase 2 only. |
| RES-SFX-003 | sfx-training-done.ogg | AI-generated | https://elevenlabs.io/terms | §3 Training complete SFX — ElevenLabs SFX. Phase 2 only. |
| RES-SFX-004 | sfx-battle-win.ogg | AI-generated | https://elevenlabs.io/terms | §3 Battle win SFX — ElevenLabs SFX. Phase 2 only. |
| RES-SFX-005 | sfx-battle-loss.ogg | AI-generated | https://elevenlabs.io/terms | §3 Battle loss SFX — ElevenLabs SFX. Phase 2 only. |
| RES-BGM-001 | bgm-arena.ogg | AI-generated | https://suno.com/terms | §3 Arena BGM — Suno v3. Phase 2 only. |
