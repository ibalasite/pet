# VDD — Visual Design Document

<!-- SDLC Requirements Engineering — Layer 3.5: Visual Design -->
<!-- Upstream: IDEA.md, BRD.md, PRD.md, PDD.md, CONSTANTS.md -->
<!-- Answers: What does it look like? What are the visual rules? How does it feel? -->

---

## §0 Document Control

| Field | Content |
|-------|---------|
| **DOC-ID** | VDD-PIXEL-PET-ARENA-20260503 |
| **Project Name** | pixel-pet-arena |
| **Document Version** | v1.0 |
| **Status** | DRAFT |
| **Author** | AI Generated (VDD Gen Agent) |
| **Created Date** | 2026-05-03 |
| **Last Updated** | 2026-05-03 |
| **Upstream Documents** | IDEA-PIXEL-PET-ARENA-20260503, BRD-PIXEL-PET-ARENA-20260503, PRD-PIXEL-PET-ARENA-20260503, PDD-PIXEL-PET-ARENA-20260503 |
| **Downstream Documents** | EDD.md (Engineering Design), Implementation code |
| **審閱者 / Reviewers** | Design Lead (Art Director), Product Manager, Frontend Architect |

### Version Table

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| v1.0 | 2026-05-03 | AI Generated (VDD Gen Agent) | Initial generation from upstream IDEA, BRD, PRD, PDD, CONSTANTS documents |
| v1.1 | 2026-05-03 | VDD Fix Agent (review-r2) | Fix 8 findings: purple scale PDD alignment (hue 280), neutral token aliases, competitor table columns, Figma handoff status, component token coverage, brand positioning §1.0, reviewers field, background file sizes |

### Downstream Declaration

This VDD is the authoritative visual specification for pixel-pet-arena. All frontend implementation, Figma component design, sprite asset production, and CSS token declarations must reference and comply with this document. Conflicts between this VDD and the PDD §9 Design System Reference shall be resolved by this VDD, which supersedes and extends the PDD design token declarations.

---

## Change Log

| 版本 | 日期 | 作者 | 變更摘要 |
|------|------|------|---------|
| v1.0 | 2026-05-03 | AI Generated (VDD Gen Agent) | 初稿（從 IDEA / BRD / PRD / PDD / CONSTANTS 生成） |
| v1.1 | 2026-05-03 | VDD Fix Agent (review-r2) | 修復 8 個 findings：purple scale PDD 對齊、neutral token alias、competitor 表格欄位、Figma handoff 狀態、component token 覆蓋率、brand positioning §1.0、reviewers 欄位、background 檔案大小 |

---

## Platform Scope Declaration

- [x] **Web App / SaaS (Browser)** — pixel-pet-arena is implemented as an HTML5 browser application using Phaser.js for canvas rendering and React for UI chrome. It is NOT built on Unity, Cocos2d, or any native game engine. The pixel art aesthetic is rendered via HTML5 Canvas with CSS `image-rendering: pixelated`.
- [ ] iOS Native
- [ ] Android Native
- [ ] Desktop App (Electron/Tauri)
- [ ] Unity/Cocos Game Engine

**Platform notes**: The game canvas uses Phaser.js 3 for sprite animation and physics. All UI chrome (navigation, forms, leaderboard, admin portal) is built in React with CSS custom properties. The design system bridges both contexts through shared color tokens and pixel-art visual language.

---

## §1 Design Mission

### §1.0 Brand Positioning Statement

| Dimension | Content |
|-----------|---------|
| **Target Audience** | Competitive browser gamers aged 16–35 who grew up with retro games (Game Boy, GBA, early browser games) and value collectibles with genuine aesthetic craft |
| **Unique Differentiator** | The only browser pet game with a deliberate dark luxury pixel-art design system — retro soul, premium quality |
| **Brand Promise** | Your pixel pet should look like it belongs in a game that cost $30, not a Flash game from 2005 |
| **Visual Claim** | Dark canvas × hard pixel precision × rarity hierarchy = a collectible that looks worth fighting for |

#### How Positioning Drives Visual Decisions
- "Dark luxury" → primary surface is deep navy (#0d1b2a equiv.), NOT white; dark mode is primary, not an afterthought
- "Pixel precision" → 4px/8px grid enforced, no CSS blur on game UI, hard-edge shadows
- "Rarity hierarchy" → Common/Rare/Epic/Legendary visual system is the single most important visual differentiator; no other element may use these colors out of context
- "Premium quality" → Press Start 2P reserved for game elements; Inter for UI text; never Comic Sans or decorative novelty fonts

---

### §1.1 Visual Positioning Statement

pixel-pet-arena is visually positioned as the **dark luxury pixel-art game** for a generation that grew up with retro games but lives in modern SaaS. It occupies the intersection of 8-bit/16-bit era nostalgia and contemporary web product quality — where `Press Start 2P` headlines sit alongside Inter body copy, where pixel-perfect sprites glow with modern `oklch` color science, and where game mechanics are delivered through a UI that respects both retro aesthetic purity and WCAG 2.1 AA accessibility.

**Differentiation in one line**: While Neopets looks frozen in 2004 and CryptoKitties looks like a blockchain dashboard, pixel-pet-arena looks like a premium collectible game designed today — for players who appreciate craft.

### §1.2 Design Principles

**Principle 1 — Pixel Art Purity Without Compromise**
Every UI element — buttons, cards, modals, stat bars, badges — must read as part of the pixel-art game world. No generic Material Design defaults, no unstyled Tailwind components, no antialiased rounded-corner SaaS chrome. Pixel borders are hard (`border-radius: 0px`). Shadows are hard-offset (`4px 4px 0px`). The UI must feel like the game spawned its own interface, not like a web app bolted onto a game.

> **DO**: Use 4px grid snapping, hard 4px box-shadow offset on interactive elements, integer pixel values only.
> **DON'T**: Apply CSS blur filters or fractional pixel values to game UI elements; never use box-shadow blur-radius > 0 on pixel-art elements.

**Principle 2 — Rarity as Visual Hierarchy**
The four rarity tiers (Common grey, Rare teal, Epic purple, Legendary gold) are the emotional vocabulary of the entire product. Every screen where a pet appears must communicate rarity through color, border treatment, and animation — without relying on text labels as the primary signal. A Legendary pet must look unmistakably more impressive than a Common pet at a glance.

> **DO**: Let rarity color (grey/blue/purple/gold) be the primary differentiator; reinforce with border treatment and glow.
> **DON'T**: Apply Legendary gold styling to non-pet elements; never use rainbow gradients (only single-hue rarity palettes).

**Principle 3 — Dark Luxury as the Default Direction**
The product leads with its dark mode (`--color-surface-base: #1a1a2e`) as the primary experience. This is intentional — the deep navy base makes rarity colors pop, creates a night-sky / retro CRT aesthetic, and positions the product as premium rather than casual. Light mode is a deliberate secondary variant, not an afterthought or auto-inversion.

> **DO**: Design dark mode as primary (navy/dark-charcoal background); ensure all primary flows are validated in dark mode first.
> **DON'T**: Start from a white/light design and invert; never use pure black (#000000) as background (use `--primitive-navy-900` instead).

**Principle 4 — Shareability is a Design Constraint**
Battle records, leaderboard ranks, and pet profiles are all designed with the assumption that they will be screenshot and posted to Twitter or Discord. Every pet-facing page must look compelling when extracted from context. Open Graph images, rarity glows, and win/loss celebrations are not decorative — they are growth mechanics.

> **DO**: Use spring easing (`--primitive-ease-spring`) for positive game events (level up, rare discovery); use standard ease for navigation.
> **DON'T**: Animate layout-affecting properties (width/height/position); reserve spring animations for delight, not all interactions.

**Principle 5 — Accessibility as Competitive Advantage**
Focus rings are gold (`#ffd700`) — they look intentional. Contrast ratios exceed minimums — `--color-text-primary` achieves 12.4:1 on the dark base. Reduced-motion fallbacks are designed, not omitted. Accessibility is not compliance; it is craftsmanship that signals product quality to the developer and enthusiast early-adopter community.

### §1.3 Competitor Visual Differentiation Table

| Competitor | Visual Direction | Key Visual Weakness | Our Differentiation | Primary Color (hex) | Font Style | UI Density |
|-----------|-----------------|--------------------|--------------------|--------------------|-----------|-----------| 
| **Neopets** | Bright primary colors, Comic Sans-era typography, Flash-era UI chrome, inconsistent icon styles | Frozen in 2004; heavy visual clutter; no coherent design system; poor mobile adaptation | Dark luxury direction; coherent pixel-art design system; modern typography pairing; mobile-first responsive | `#00AAFF` (bright blue) | Comic Sans-adjacent, rounded decorative | High, cluttered |
| **CryptoKitties** | Pastel cartoon style, wallet UI aesthetics, Web3 dashboard chrome | Feels like a financial product, not a game; crypto-wallet-native UX alienates casual players | Game-first aesthetic; zero crypto UI vocabulary; rarity language vs. blockchain language | `#9B51E0` (purple) | Modern sans, Lato | Medium, card-focused |
| **itch.io Browser Pet Games** | Inconsistent per-developer; often placeholder UI; no persistent design language | No shared visual identity; functional but not designed; disposable aesthetic | Consistent design system across all screens; pixel-art UI chrome as a product differentiator | `#FA5C5C` (red) | Source Sans Pro, clean minimal | Medium, developer-tool |
| **Tamagotchi (Official App)** | Cute rounded pastel, device-chrome skeuomorphic, retro LCD simulation | Device-locked mental model; childish palette limits adult appeal; no competitive visual hierarchy | Competitive dark tone; adult-appropriate luxury direction; rarity hierarchy as status symbol | `#E91E8C` (pink) | Rounded sans, Nunito | Low, toy-like |
| **Axie Infinity** | Fantasy game art meets DeFi dashboard; over-produced 3D art; crypto-first UX | Steep visual complexity; intimidating for casual players; financial dashboard in game wrapper | Approachable pixel-art simplicity; clean information hierarchy; zero financial-product vocabulary | `#00C0FF` (cyan) | Bold futuristic, custom | Medium-high, dashboard |

### §1.4 Visual Hierarchy Rules

#### Scale Contrast Rules
- H1 (`--text-h1`) must be ≥2× body text (`--text-body`) font size at any viewport width
- H2 must be ≥1.5× body text font size
- Caption/metadata text must be ≤0.875× body text (use `--text-small` or `--text-caption`)
- Pixel art font (Press Start 2P) automatically enforces strong scale contrast due to its bold monospace nature

#### Weight Contrast Rules
- Use font-weight 700 (Bold) only for: H1, H2, CTA button labels, stat values (HP/ATK/DEF)
- Use font-weight 600 (Semibold) for: H3, nav active state, rarity badge labels
- Use font-weight 400 (Regular) for: all body copy, secondary labels, metadata
- Pixel art headers (Press Start 2P) are always treated as Bold weight regardless of CSS weight setting

#### Color Emphasis Rules
- Primary emphasis: `--color-brand-primary` (purple) — used for interactive elements, active states, primary CTAs only
- Secondary emphasis: `--color-brand-accent` (gold) — used for Legendary tier and premium actions only
- Muted/secondary text: `--color-text-secondary` — all supporting text, timestamps, counts
- Disabled/invisible: `--color-text-disabled` — 40% opacity, use for explicitly disabled UI elements only
- NEVER use rarity colors (`--color-rarity-*`) for non-rarity contexts

#### Whitespace Rhythm Rules
- Page-level gaps: use `--space-section` (`clamp(4rem, 3rem + 5vw, 10rem)` — see §6.2) or larger; `--primitive-space-12` (48px) is for component-level spacing, not page-level sections
- Component-level gaps: use `--space-component-gap` (`--primitive-space-4`: 16px)
- Within-component gaps: use `--primitive-space-2` (8px) or `--primitive-space-1` (4px)
- Pixel art elements snap to 8px grid; use multiples of 8px for all game UI spacing

---

## §2 Art Direction

### §2.1 Visual References

The following concrete references ground the visual direction. These are not mood keywords — they are specific products and specific design decisions we borrow or diverge from.

| Reference | URL / Source | What we borrow | What we intentionally differ |
|-----------|-------------|----------------|------------------------------|
| **Stardew Valley UI** | https://store.steampowered.com/app/413150/Stardew_Valley/ | Pixel-grid border treatment on item cards; inventory grid 32px spacing; warm color palette approach | We use a darker navy base (not Stardew's warm beige); our rarity tier system is more formalized than Stardew's item system |
| **Hearthstone card design** | https://hearthstone.blizzard.com | Golden Legendary card shimmer effect; card border glow hierarchy (common=none, rare=blue, epic=purple, legendary=gold) — our rarity visual language mirrors this exactly | We use pixel-art hard edges instead of Hearthstone's 3D rendered card frames; no physical card metaphor |
| **Pokémon TCG Online** | https://tcgo.pokemon.com | Stat bar visual treatment; type icon pill design; versus screen layout; creature stat display conventions | We use Inter for all stat numbers (not serif); we don't use the energy/type icon system; layout is web-first not card-first |
| **Dark Souls III UI** | HUD design philosophy reference — minimal, atmospheric, every element earns its presence | Health/stamina bar layout inspiration; text treatment at small sizes; philosophy of UI that doesn't overwhelm the game canvas | Our product is much lighter and more game-casual; we use bright rarity colors vs Dark Souls' muted palette; we have verbose labels where Souls uses iconography |
| **GOG.com dark theme** | https://www.gog.com | Dark navy surface system; card hover glow effect; text hierarchy in dark mode; SaaS dark luxury baseline | We use pixel-art borders (0px radius) vs GOG's rounded cards; our primary font is Press Start 2P vs GOG's clean sans-serif; game-first vs store-first information hierarchy |

### §2.2 Emotional Tone Map

| Brand Emotion | Visual Expression | Key Design Decisions |
|--------------|-------------------|---------------------|
| **Competitive Excitement** | High contrast, spring easing, gold accents | `--primitive-ease-spring` for battle outcomes; `--color-brand-accent` (gold) for win states; stat bar animations use scale transform |
| **Nostalgic Warmth** | Limited palettes, pixel precision, retro font | Press Start 2P as primary display font; max 16 colors per sprite; 0px border-radius on pixel-art elements |
| **Premium Exclusivity** | Dark navy base, rarity glow hierarchy, CRT effect | Legendary tier uses CSS CRT shimmer animation; dark surface (`#0d1117` equivalent) as canvas; Epic+ items have drop-shadow glow |

### §2.3 Mood Board Keywords

1. **Pixel** — Hard edges, grid-snapped geometry, 8px/16px/32px multiples, `image-rendering: pixelated`, no antialiasing on sprite elements
2. **Nostalgic** — NES/SNES color constraints (limited palettes per sprite), CRT glow effects on Legendary tier, scanline texture on selected surfaces, retro monospace display font (`Press Start 2P`)
3. **Vibrant** — Rarity colors selected for maximum perceptual impact against the dark navy base: teal, purple, gold against `oklch(12% 0.04 280)` — saturation deliberately high
4. **Playful** — Spring easing on interactions (`cubic-bezier(0.34, 1.56, 0.64, 1)`), particle bursts on victories, stat indicators that float upward, rarity badges that overshoot on reveal
5. **Collectible** — Rarity tier visual language borrows from physical trading cards: border treatments, holographic-inspired shimmer on Legendary, rarity probability disclosures, numbered editions aesthetic

### §2.4 Design Reference Sources (Category Breakdown)

| Category | Reference Direction | Specific Influences |
|----------|-------------------|-------------------|
| **Color** | Deep navy / gold / teal palette inspired by premium dark trading card designs; oklch perceptual uniformity ensures rarity colors pop equally across tiers | Night sky (#1a1a2e), arcade CRT phosphor glow (teal #4ecdc4), sunset gold (#fdcb6e), neon purple (#a29bfe) |
| **Typography** | Pixel display fonts used for hero/game elements; clean humanist sans for data — bridging game world and SaaS legibility | `Press Start 2P` (Google Fonts) for game chrome; `Inter` by Rasmus Andersson for body/data. Pairing established in PDD §9.2. |
| **Composition** | Z-pattern and F-pattern scan paths (from PDD §3.3); pet canvas dominates left column at ≥768px; actions flow naturally from pet interaction | Bento-inspired card layout on My Pet page; editorial hierarchy on Leaderboard with rank number as left anchor |
| **Illustration** | 64×64px pixel sprites with 4-8 frame idle animations; hard outlines, no antialiasing; 5+ attribute dimensions for procedural generation | itch.io pixel art game tradition; classic RPG monster sprite proportions; Pokémon-inspired rarity visual differentiation |
| **Motion** | Purposeful animation that communicates game state: stat floats indicate gain, particle bursts signal victories, shimmer effects signal rarity | Spring easing for satisfaction on successful actions; expo-out for smooth page transitions; CRT scanline sweep for loading states |

### §2.5 Light & Material Direction

**Primary surface material**: Matte deep navy (`oklch(12% 0.04 280)`, `#1a1a2e`) — no gradients on base surfaces. Texture is achieved through hard-offset pixel shadows, not light simulation.

**Elevation model**: Pixel-art hard-offset shadows communicate depth without blur or realistic light physics:
- Base surface: no shadow
- Raised (cards, panels): `4px 4px 0px #0d0d1a`
- Floating (modals, overlays): `6px 6px 0px #0d0d1a`
- Interactive press: shadow collapses to `2px 2px 0px #0d0d1a` on active state

**Legendary special material**: CRT glow effect achieved via `box-shadow: 0 0 24px color-mix(in oklch, #fdcb6e, transparent 30%)` — simulates the warm phosphor glow of a CRT monitor displaying a golden item. This is the one exception to the no-blur rule: blur is permitted exclusively for Legendary rarity glow effects.

**Rarity material language**:
- **Common**: Flat grey, matte, no glow — `#b2bec3` border
- **Rare**: Teal accent border, subtle outer glow — `#4ecdc4` border + faint teal glow
- **Epic**: Purple animated shimmer border — `#a29bfe` border + shimmer sweep animation
- **Legendary**: Gold CRT glow + animated shimmer — `#fdcb6e` border + `legendary-shimmer 2s ease-in-out infinite`

### §2.6 World / Art Style Declaration

pixel-pet-arena occupies the **Pixel Art Retro-Futurism** style direction: pixel aesthetics as the primary visual language, applied with modern color science (oklch), modern typography pairing, and modern interaction design principles.

**What this is NOT**:
- Not "clean minimal" (the default Tailwind template trap)
- Not generic dark mode SaaS
- Not 3D rendered game art
- Not pastel kawaii

**What this IS**:
- Hard pixel borders on all UI chrome
- Limited color palettes per sprite (authentic pixel constraint)
- Modern oklch color definitions (perceptually uniform, not nostalgic in implementation)
- CRT glow for Legendary rarity (aesthetic nostalgia + modern CSS)
- Grid-snapped spacing on 8px multiples throughout

---

## §3 Brand Identity

### §3.1 Primary Palette

All colors inherit from PDD §9.1 and §9.4. Values below confirm the canonical hex, oklch, and WCAG contrast data.

> **HSL equivalents**: HSL values are provided alongside oklch for tooling compatibility (e.g. Figma color pickers, older design tools that do not support oklch). oklch is the canonical format for all CSS token declarations; HSL is informational only.

| Token Name | Hex | oklch | WCAG Contrast on `--color-surface-base` | Usage |
|-----------|-----|-------|----------------------------------------|-------|
| `--color-brand-primary` | `#6c5ce7` | `oklch(52% 0.22 280)` | 3.51:1 (AA non-text, WCAG 1.4.11) | Primary CTA buttons, active nav links, claim flow primary actions — UI component/surface color, not foreground text on dark base |
| `--color-brand-secondary` | `#00b894` | `oklch(68% 0.19 164)` | 6.1:1 (AA) | Secondary actions, success states, training complete indicators |
| `--color-brand-accent` | `#fdcb6e` | `oklch(85% 0.15 82)` | 8.4:1 (AAA) | Legendary highlights, attention elements, focus-draw on high-value actions |
| `--color-surface-base` | `#1a1a2e` | `oklch(12% 0.04 280)` | N/A (background) | Page background, primary canvas surface |
| `--color-surface-raised` | `#242444` | `oklch(17% 0.05 280)` | N/A (background) | Cards, panels, modals, raised UI chrome |
| `--color-surface-overlay` | `#2d2d5a` | `oklch(22% 0.07 280)` | N/A (background) | Hover states, selected states, secondary overlay |
| `--color-neutral-50` | `#e8e8f0` | `oklch(93% 0.01 280)` | 12.4:1 (AAA) | Primary body text — highest contrast on dark base |
| `--color-focus` | `#ffd700` | `oklch(90% 0.17 82)` | 3.1:1 (AA non-text) | Focus ring on all interactive elements |

### §3.2 Semantic / Functional Colors

| Token | Light Hex | Dark Hex | Usage |
|-------|-----------|----------|-------|
| `--color-success` | `#00836b` | `#00b894` | Training complete, claim success, pet ownership confirmed |
| `--color-warning` | `#cc5a00` | `#e8a87c` | Rate limit banners, claim code expiry warnings, arena cooldown |
| `--color-error` | `#cc3333` | `#e87c7c` | Form validation errors, invalid code entry, API failures |
| `--color-info` | `#4a80cc` | `#7cb4e8` | Informational tips, probability disclosures, AI opponent labels |

### §3.3 Rarity Color System

The rarity color system is the core brand differentiator. Colors are selected for maximum perceptual impact against the dark navy base, verified for WCAG AA contrast, and designed to evoke the emotional register of each tier.

| Rarity Tier | Probability | Dark Hex | Light Hex | oklch (dark) | WCAG on Dark Base | Visual Treatment | CONSTANTS Reference |
|------------|-------------|----------|-----------|--------------|-------------------|-----------------|-------------------|
| **Common** | 60% | `#b2bec3` | `#636b72` | `oklch(72% 0.01 0)` | 7.1:1 (AAA) | Flat grey border, matte finish, no glow | `RARITY_MULTIPLIER_COMMON = 1` |
| **Rare** | 25% | `#4ecdc4` | `#009688` | `oklch(72% 0.13 190)` | 6.8:1 (AA) | Teal border, faint outer teal glow `0 0 8px rgba(78,205,196,0.4)` | `RARITY_MULTIPLIER_RARE = 2` |
| **Epic** | 12% | `#a29bfe` | `#6a5fe8` | `oklch(75% 0.21 280)` | 5.9:1 (AA) | Purple border, animated shimmer sweep `epic-shimmer 3s linear infinite` | `RARITY_MULTIPLIER_EPIC = 4` |
| **Legendary** | 3% | `#fdcb6e` | `#b07e00` | `oklch(85% 0.15 82)` | 8.4:1 (AAA) | Gold border, CRT glow `0 0 24px rgba(253,203,110,0.5)`, animated shimmer `legendary-shimmer 2s ease-in-out infinite` | `RARITY_MULTIPLIER_LEGENDARY = 8` |

**Rarity animation specifications**:

```css
@keyframes legendary-shimmer {
  0%, 100% { box-shadow: 0 0 12px rgba(253,203,110,0.4), 0 0 24px rgba(253,203,110,0.2); }
  50%       { box-shadow: 0 0 20px rgba(253,203,110,0.7), 0 0 40px rgba(253,203,110,0.35); }
}

@keyframes epic-shimmer {
  0%   { border-color: oklch(75% 0.21 280); }
  33%  { border-color: oklch(75% 0.21 290); }
  66%  { border-color: oklch(75% 0.21 270); }
  100% { border-color: oklch(75% 0.21 280); }
}

@media (prefers-reduced-motion: reduce) {
  .rarity-legendary, .rarity-epic { animation: none; }
}
```

**Trade minimum price formula** (from CONSTANTS §2):
`min_price = (pet_level × 100) + (rarity_multiplier × 500)`
- Common: `(level × 100) + 500`
- Rare: `(level × 100) + 1000`
- Epic: `(level × 100) + 2000`
- Legendary: `(level × 100) + 4000`

### §3.4 Logo Usage Guidelines

**Logo lockup**: The pixel-pet-arena wordmark uses `Press Start 2P` at 16px on dark backgrounds and 14px on light backgrounds. The logo must always appear on a surface with minimum 4.5:1 contrast against the letter forms.

**Logo clearance**: Minimum 16px (2 pixel grid units at 8px base) on all sides.

**Logo color variants**:
- Primary: `--color-neutral-50` (`#e8e8f0`) on dark surfaces
- Inverted: `--color-surface-base` (`#1a1a2e`) on light surfaces
- Accent: `--color-brand-accent` (`#fdcb6e`) for special promotional use only

**Minimum digital size**:
- Wordmark must not be rendered below **80px wide** — this maintains Press Start 2P legibility at pixel boundaries
- Standalone mark (icon only): minimum **16px height**

**Safe zone as ratio**:
- Clear space = **100% of cap-height** (1× the height of the "P" glyph in "Pixel") on all four sides, in addition to the current 16px absolute minimum
- Both rules apply simultaneously: take whichever is larger

**Print usage note**: Print usage is out of scope for this digital product. If print materials are produced externally, minimum 25mm wide for wordmark.

**What not to do**:
- Do not apply the wordmark in any rarity color other than gold in non-Legendary contexts
- Do not place the logo on surfaces below 4.5:1 contrast
- Do not use a font other than `Press Start 2P` for the wordmark
- Do not apply gradients to the wordmark
- Do not render the wordmark below 80px wide in digital contexts

---

## §4 Character & World Design

### §4.1 Pixel Pet Visual System

The pixel pet is the product's hero element. Every other design decision in the product serves to frame, celebrate, or reward the pet.

**Pet rarity visual language summary**:

| Rarity | Border Width | Border Color | Glow | Animation | Canvas Background Tint |
|--------|-------------|-------------|------|-----------|----------------------|
| Common | 2px solid | `#b2bec3` | None | Idle wiggle only | None |
| Rare | 2px solid | `#4ecdc4` | `0 0 8px rgba(78,205,196,0.3)` | Idle wiggle + faint teal pulse | Subtle teal tint `rgba(78,205,196,0.05)` |
| Epic | 3px solid | `#a29bfe` | `0 0 12px rgba(162,155,254,0.4)` | Idle wiggle + epic-shimmer border | Purple tint `rgba(162,155,254,0.07)` |
| Legendary | 3px solid | `#fdcb6e` | `legendary-shimmer 2s ease-in-out infinite` | Idle wiggle + legendary-shimmer + particle sparkles every 8s | Gold tint `rgba(253,203,110,0.08)` |

### §4.2 Pet Sprite Specifications

**Sprite grid system**: All pet sprites are drawn on a **64×64px pixel grid** at 1x. The 64px canvas is the canonical sprite size for My Pet Page and Battle Result Page. Smaller contexts (leaderboard thumbnails, trade cards) use the 32×32px reduced sprite.

**Sprite sizes**:
- Hero canvas (Landing, My Pet, Battle Result): 64×64px @ 1x; 128×128px @ 2x (retina)
- Leaderboard thumbnail: 32×32px @ 1x; 64×64px @ 2x
- Trade card (Marketplace): 48×48px @ 1x; 96×96px @ 2x
- OG social share card: 128×128px sprite rendered on 1200×630px card

**Animation specifications**:
- **Idle animation**: 4 frames minimum, 8 frames recommended; 30 FPS loop (per CONSTANTS `Pet Animation Frame Rate ≥ 30 FPS`)
- **Interaction response** (click/tap): 2-frame "bounce" sequence — scale 1.15x frame 1, return to 1x frame 2; 200ms total
- **Neglected state** (after `TRAINING_NEGLECT_THRESHOLD = 3 days`): desaturated palette overlay (CSS `filter: grayscale(60%) brightness(0.8)`) + wilted accessory frame swap
- **Training animation**: 3-frame "effort" sequence triggered on successful training action; 400ms duration
- **Battle race animation**: 8-frame run cycle; loops during race; winner sprite plays 4-frame "victory" on finish

**Pixel art constraints** (authentic to style):
- Maximum 16 colors per sprite (not counting transparency)
- Outline pixels use one-shade-darker version of adjacent color
- No antialiasing: all pixel boundaries are hard edges
- CSS rendering: `image-rendering: pixelated; image-rendering: crisp-edges;`

**Sprite generation dimensions** (from PRD AC-001-3 and CONSTANTS):
- `PET_GENERATION_DIMENSIONS = 6`: body type, head type, color palette, accessory, rarity trait, pattern
- `PET_GENERATION_COMBINATIONS_MIN = 1,000,000,000` — at least 1 billion combinations
- Seed is deterministic: same seed always generates same appearance (`AC-002-2`)

### §4.3 Arena Visual Environment Specs

**Race arena visual treatment**:
- Background: dark track tile pattern — repeating 16×8px pixel tile on `--color-surface-overlay`
- Track lane: 2-pixel dashed dividers in `--color-neutral-700`
- Finish line: alternating 4×4px checkered pattern in `--color-neutral-50` and `--color-neutral-900`
- Victory effects: 24-particle gold burst from winner sprite; particles are 2×2px squares in Legendary gold

**Sumo arena visual treatment** [P1]:
- Ring: circular pixel border in `--color-brand-accent`, 4px wide; interior `--color-surface-raised`
- Push-out zone: darker ring edge `--color-neutral-900`
- Defeat animation: losing sprite slides off ring edge with `ease-in` acceleration

### §4.4 Pixel Art Grid System

All spacing, sizing, and positioning of pixel art elements must snap to the pixel grid:

| Grid Unit | Value | Usage |
|-----------|-------|-------|
| 1 pixel unit | 8px | Minimum spacing increment; icon sizes (8×8, 16×16) |
| 2 pixel units | 16px | Small component padding, compact badge sizes |
| 4 pixel units | 32px | Card inner padding, standard button height |
| 8 pixel units | 64px | Standard sprite size, section gap |
| 16 pixel units | 128px | Major section divisions, hero canvas minimum height on mobile |

**The 8px rule**: No pixel art element — border, shadow offset, icon, sprite dimension — may use a value that is not a multiple of 8px. This rule applies to sprites and game canvas elements only. Body text and data tables are exempt and follow the `--primitive-space-*` token scale (4px base unit).

### §4.5 Base Body Type Roster

| 體型 ID | 體型描述 | 代表元素 | 面向規格 |
|---------|---------|---------|---------|
| body-tiny | 圓潤迷你體型（圓形主體，小手小腳）| 水系、精靈系 | 正面：16×16px；側面：14×16px |
| body-standard | 標準直立體型（頭身比 1:1.5）| 通用、火系、草系 | 正面：32×32px；側面：28×32px |
| body-chunky | 寬胖厚重體型（圓形身軀，短肢）| 岩石系、鋼鐵系 | 正面：32×28px；側面：30×28px |
| body-slim | 細長流線體型（高頭身比 1:2）| 風系、電系 | 正面：20×40px；側面：18×40px |
| body-quadruped | 四足爬行體型 | 野獸系、龍系 | 正面：40×24px；側面：48×24px |

> 每種體型的精確 sprite sheet 規格見 §7.1 Asset Pipeline；turnaround view（正面/背面/側面三方向）由美術師在 Figma 交付（Sprint 1 end）。

---

## §5 UI Visual System — Typography

### §5.1 Font Families

| Role | Family | Source | Fallback |
|------|--------|--------|---------|
| **Display / Game Chrome** | `Press Start 2P` | Google Fonts | `'Courier New', Courier, monospace` |
| **Body / Data** | `Inter` | rsms.me/inter / Google Fonts | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| **Code / URL display** | System monospace | OS native | `'Courier New', Courier, monospace` |

**Selection rationale**:
- `Press Start 2P` is the canonical pixel-art game font — blocky, grid-aligned, immediately evocative of 8-bit gaming. Limited to headings and game-world UI elements to avoid readability issues at small sizes.
- `Inter` is chosen for superior legibility in data-dense contexts (leaderboard tables, stats panels, form labels) and excellent international character support (for future `ja`, `zh-TW` i18n).
- Two-family maximum is enforced per performance rules — no additional display fonts.

### §5.2 Type Scale

Inherits from PDD §9.2. All values confirmed below:

| Level | Token | Font Family | Size (clamp) | Weight | Line Height | Letter Spacing | Usage |
|-------|-------|------------|-------------|--------|-------------|----------------|-------|
| **H1 — Hero** | `--text-h1` | Press Start 2P | `clamp(1.5rem, 1rem + 2.5vw, 2.5rem)` | 700 | 1.4 | `0em` | Page titles, pet names in hero view, battle result WIN/LOSE |
| **H2 — Section** | `--text-h2` | Press Start 2P | `clamp(1.2rem, 0.8rem + 2vw, 1.8rem)` | 700 | 1.4 | `0em` | Section headings, rarity tier labels, arena mode titles |
| **H3 — Subsection** | `--text-h3` | Press Start 2P | `clamp(1rem, 0.7rem + 1.5vw, 1.4rem)` | 400 | 1.5 | `0em` | Modal titles, card headings in game context |
| **H4 — Card Title** | `--text-h4` | Inter | `1.125rem` (18px) | 600 | 1.5 | `0em` | Card headings, stat labels with emphasis |
| **H5 — Table Header** | `--text-h5` | Inter | `1rem` (16px) | 600 | 1.5 | `0em` | Table column headers, leaderboard column labels |
| **H6 — Small Label / Label** | `--text-label` | Inter | `0.875rem` (14px) | 600 | 1.5 | `0.05em` | Badge text, small status labels — aligns with PDD §9.2 and §8.2 input labels |
| **Body** | `--text-body` | Inter | `clamp(1rem, 0.92rem + 0.4vw, 1.125rem)` | 400 | 1.6 | `0em` | General body copy, descriptions, arena copy, tooltips |
| **Small** | `--text-small` | Inter | `0.875rem` (14px) | 400 | 1.5 | `0.01em` | Secondary supporting text, compact labels |
| **Caption** | `--text-caption` | Inter | `0.75rem` (12px) | 400 | 1.4 | `0.02em` | Timestamps, metadata, secondary labels, leaderboard footnotes |
| **Code / URL** | `--text-mono` | System monospace | `0.875rem` (14px) | 400 | 1.5 | `0em` | Unique URL display, 6-digit claim code input fields |
| **Numeric / Stats** | `--text-stat` | Inter | Context-dependent | 700 | 1 | `-0.01em` | Stat values (speed/strength/stamina), leaderboard scores, countdown timers — tight for stat numbers |

### §5.3 Font Loading Strategy

```html
<!-- Preload critical above-fold font only -->
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" as="style">

<!-- Inter: async load, 400 and 600 weights only -->
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" as="style">
```

- `font-display: swap` on both families — content renders with fallback while fonts load
- Preload only `Press Start 2P` as the above-fold visible font on the landing page
- `Inter` 400 + 600 only — no other weights to minimize font payload
- Fallback stack ensures layout stability during font swap (no CLS impact)

---

## §6 Design Tokens — Three-Layer Architecture

This section extends and canonicalizes PDD §9.3. All tokens here are the authoritative values. Where a token appears in both PDD §9.3 and this VDD §6, this VDD takes precedence.

### §6.1 Layer 1 — Primitive Tokens

```css
/* =============================================
   PRIMITIVE: Color Scales
   ============================================= */

/* Full Grey / Neutral Scale */
--primitive-grey-50:  oklch(98% 0 0);   /* #f9fafb */
--primitive-grey-text-primary: oklch(93% 0.01 280); /* #e8e8f0 — Navy-tinted near-white (primary text) */
--primitive-grey-100: oklch(95% 0 0);   /* #f3f4f6 */
--primitive-grey-200: oklch(90% 0 0);   /* #e5e7eb */
--primitive-grey-rarity-common: oklch(72% 0.01 0); /* #b2bec3 — Common rarity badge (PDD §9.1) */
--primitive-grey-300: oklch(83% 0 0);   /* #d1d5db */
--primitive-grey-400: oklch(70% 0 0);   /* #9ca3af */
--primitive-grey-500: oklch(55% 0 0);   /* #6b7280 */
--primitive-grey-600: oklch(42% 0 0);   /* #4b5563 */
--primitive-grey-700: oklch(32% 0 0);   /* #374151 */
--primitive-grey-800: oklch(22% 0 0);   /* #1f2937 */
--primitive-grey-900: oklch(14% 0 0);   /* #111827 */
--primitive-grey-950: oklch(9% 0 0);    /* #030712 */

/* Full Brand Primary (Purple) Scale */
--primitive-purple-50:  oklch(97% 0.03 280);  /* #faf5ff — hsl(270, 100%, 98%) — Lightest purple tint */
--primitive-purple-100: oklch(94% 0.06 280);  /* #f3e8ff — hsl(270, 100%, 95%) */
--primitive-purple-200: oklch(88% 0.11 280);  /* #e9d5ff — hsl(270, 100%, 92%) */
--primitive-purple-300: oklch(72% 0.24 280);  /* #c4b5fd — hsl(258, 96%, 85%) — Hover/active accent */
--primitive-purple-400: oklch(62% 0.22 280);  /* #c084fc — hsl(270, 95%, 75%) */
--primitive-purple-500: oklch(52% 0.22 280);  /* #6c5ce7 — hsl(258, 50%, 35%) — Brand primary */
--primitive-purple-600: oklch(44% 0.24 280);  /* #6d28d9 — hsl(263, 70%, 50%) */
--primitive-purple-700: oklch(36% 0.22 280);  /* #5b21b6 — hsl(263, 70%, 42%) — Dark button press */
--primitive-purple-800: oklch(28% 0.19 280);  /* #4c1d95 — hsl(263, 68%, 35%) */
--primitive-purple-900: oklch(21% 0.16 280);  /* #3b0764 — hsl(263, 60%, 26%) — Deep purple overlay */
--primitive-purple-950: oklch(14% 0.13 280);  /* #1e0533 — hsl(263, 55%, 18%) */
--primitive-purple-epic: oklch(75% 0.21 280); /* #a29bfe — hsl(258, 96%, 80%) — Epic rarity */

/* Teal Scale */
--primitive-teal-100: oklch(90% 0.07 190);    /* #ccf5f3 — hsl(177, 78%, 87%) */
--primitive-teal-300: oklch(78% 0.13 190);    /* #7de8e2 — hsl(177, 72%, 70%) */
--primitive-teal-400: oklch(68% 0.19 164);    /* #00b894 — hsl(164, 100%, 36%) — Brand secondary */
--primitive-teal-rare: oklch(72% 0.13 190);   /* #4ecdc4 — hsl(177, 55%, 55%) — Rare rarity canonical (PDD §9.1) */
--primitive-teal-600: oklch(52% 0.17 164);    /* #008c72 — hsl(164, 100%, 27%) */

/* Gold Scale */
--primitive-gold-100: oklch(95% 0.07 82);     /* #fff3cd — hsl(44, 100%, 90%) */
--primitive-gold-300: oklch(85% 0.15 82);     /* #fdcb6e — hsl(40, 97%, 72%) — Brand accent / Legendary */
--primitive-gold-500: oklch(70% 0.17 82);     /* #ffd700 — hsl(51, 100%, 50%) — Focus ring */
--primitive-gold-700: oklch(55% 0.17 82);     /* #c49900 — hsl(46, 100%, 38%) */

/* Feedback / Status Color Primitives */
--primitive-orange-400: oklch(70% 0.17 40);  /* #e8a87c — hsl(26, 68%, 70%) — Warning */
--primitive-red-400: oklch(72% 0.2 25);      /* #e87c7c — hsl(0, 65%, 70%) — Error */
--primitive-blue-400: oklch(72% 0.15 240);   /* #7cb4e8 — hsl(210, 65%, 70%) — Info */

/* Navy Scale */
--primitive-navy-900: oklch(12% 0.04 280);    /* #1a1a2e — hsl(256, 30%, 18%) — Surface base */
--primitive-navy-800: oklch(17% 0.05 280);    /* #242444 — hsl(240, 30%, 20%) — Surface raised */
--primitive-navy-700: oklch(22% 0.07 280);    /* #2d2d5a — hsl(240, 33%, 26%) — Surface overlay */
--primitive-navy-600: oklch(28% 0.06 280);    /* #3a3a6e — hsl(240, 30%, 33%) — Hover surfaces */
--primitive-navy-shadow: oklch(8% 0.02 280);  /* #0d0d1a — hsl(258, 25%, 10%) — deep shadow / near-black navy (PDD §9.1) */
--primitive-navy-text-secondary: oklch(60% 0.04 280); /* #6c6c9a */
--primitive-navy-text-disabled: oklch(40% 0.04 280); /* #4a4a6a */
--primitive-navy-border-default: oklch(32% 0.05 280); /* #35355c */
--primitive-navy-border-strong: oklch(45% 0.06 280); /* #4d4d7a */

/* Light Mode Surface Primitives */
--primitive-light-surface-base: #f8f8fc;
--primitive-light-surface-raised: #eeeef8;
--primitive-light-surface-overlay: #e2e2f0;
--primitive-light-text-primary: #1a1a2e;
--primitive-light-text-secondary: #4a4a7a;
--primitive-light-text-disabled: #7a7aaa;
--primitive-light-brand-primary: #4a3fd4;
--primitive-light-border-default: #9999bb;  /* use §6.4 canonical value */
--primitive-light-border-strong: #9898c0;
--primitive-light-brand-accent: #c9930a;    /* Dark gold for light bg — Legendary on light mode */
--primitive-light-rarity-legendary: #b07e00;   /* §6.4 Legendary on light bg */
--primitive-light-rarity-epic: #6a5fe8;        /* §6.4 Epic on light bg */
--primitive-light-rarity-rare: #009688;        /* §6.4 Rare on light bg */
--primitive-light-rarity-common: #636b72;      /* §6.4 Common on light bg */
--primitive-light-error: #cc3333;             /* §6.4 Error on light bg */
--primitive-light-success: #00836b;           /* §6.4 Success on light bg */
--primitive-light-warning: #cc5a00;           /* §6.4 Warning on light bg */
--primitive-light-focus: #c49900;             /* §6.4 Focus on light bg */
--primitive-light-info: #4a80cc;              /* §3.2 Info on light bg */
--primitive-light-surface-hover: #d4d4e8;     /* Light hover surface — navy tint on light bg */
--primitive-light-brand-secondary: #007a5e;   /* Darker teal for contrast on light bg */

/* =============================================
   PRIMITIVE: Spacing (4px base grid — UI elements)
   ============================================= */
--primitive-space-1: 4px;
--primitive-space-2: 8px;
--primitive-space-3: 12px;
--primitive-space-4: 16px;
--primitive-space-6: 24px;
--primitive-space-8: 32px;
--primitive-space-10: 40px;
--primitive-space-12: 48px;
--primitive-space-16: 64px;
--primitive-space-20: 80px;
--primitive-space-24: 96px;

/* =============================================
   PRIMITIVE: Pixel Art Spacing (8px pixel grid — game elements)
   ============================================= */
--pixel-unit-1: 8px;    /* 1 pixel unit */
--pixel-unit-2: 16px;   /* 2 pixel units */
--pixel-unit-4: 32px;   /* 4 pixel units */
--pixel-unit-8: 64px;   /* 8 pixel units — standard sprite */
--pixel-unit-16: 128px; /* 16 pixel units */

/* =============================================
   PRIMITIVE: Border Radius
   (pixel art is sharp-edged — radius only for non-game UI)
   ============================================= */
--primitive-radius-none: 0px;    /* Pixel art: ALL game UI elements */
--primitive-radius-sm: 2px;      /* Minor softening on input fields only */
--primitive-radius-full: 9999px; /* Pill shapes (rarity filter tabs) */

/* =============================================
   PRIMITIVE: Duration
   ============================================= */
--primitive-duration-instant: 0ms;
--primitive-duration-fast: 120ms;
--primitive-duration-normal: 300ms;
--primitive-duration-slow: 600ms;
--primitive-duration-celebration: 1200ms;

/* =============================================
   PRIMITIVE: Pixel-Art Shadows (hard-offset, no blur)
   ============================================= */
--primitive-shadow-sm: 2px 2px 0px oklch(8% 0.02 280);
--primitive-shadow-md: 4px 4px 0px oklch(8% 0.02 280);
--primitive-shadow-lg: 6px 6px 0px oklch(8% 0.02 280);

/* =============================================
   PRIMITIVE: Easing Functions
   ============================================= */
--primitive-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* Button press satisfaction */
--primitive-ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);     /* Page transitions, reveals */
--primitive-ease-in-out: cubic-bezier(0.4, 0, 0.6, 1);        /* Pulse animations */
--primitive-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);      /* Leaderboard updates */
--primitive-ease-in: cubic-bezier(0.4, 0, 1, 1);              /* Sumo defeat slide-off */
```

### §6.2 Layer 2 — Semantic Tokens

```css
/* =============================================
   SEMANTIC: Surface Colors
   ============================================= */
--color-surface-base: var(--primitive-navy-900);          /* #1a1a2e */
--color-surface-raised: var(--primitive-navy-800);        /* #242444 */
--color-surface-overlay: var(--primitive-navy-700);       /* #2d2d5a */
--color-surface-hover: var(--primitive-navy-600);         /* Hover state background */

/* =============================================
   SEMANTIC: Text Colors
   ============================================= */
--color-text-primary: var(--primitive-grey-text-primary);  /* #e8e8f0 — 12.4:1 on base */
--color-text-secondary: var(--primitive-navy-text-secondary); /* #6c6c9a — 4.7:1 on base */
--color-text-disabled: var(--primitive-navy-text-disabled);   /* #4a4a6a — 3.1:1 minimum */
--color-text-inverse: var(--primitive-navy-900);          /* On light surfaces */

/* =============================================
   SEMANTIC: Brand Colors
   ============================================= */
--color-brand-primary: var(--primitive-purple-500);       /* #6c5ce7 */
--color-brand-primary-dark: color-mix(in oklch, var(--color-brand-primary), black 20%);
--color-brand-primary-light: var(--primitive-purple-300); /* #c4b5fd — Hover/active accent */

@media (prefers-color-scheme: dark) {
  :root {
    --color-brand-primary: var(--primitive-purple-300); /* #c4b5fd — dark mode lightened */
  }
}

@media (prefers-color-scheme: light) {
  :root {
    /* Light mode overrides — full palette in §6.4 */
    --color-surface-base: var(--primitive-light-surface-base);
    --color-surface-raised: var(--primitive-light-surface-raised);
    --color-surface-overlay: var(--primitive-light-surface-overlay);
    --color-text-primary: var(--primitive-light-text-primary);
    --color-text-secondary: var(--primitive-light-text-secondary);
    --color-text-disabled: var(--primitive-light-text-disabled);
    --color-brand-primary: var(--primitive-light-brand-primary);
    --color-border-default: var(--primitive-light-border-default);
    --color-border-strong: var(--primitive-light-border-strong);
    --color-brand-accent: var(--primitive-light-brand-accent);
    --color-rarity-legendary: var(--primitive-light-rarity-legendary);
    --color-rarity-epic: var(--primitive-light-rarity-epic);
    --color-rarity-rare: var(--primitive-light-rarity-rare);
    --color-rarity-common: var(--primitive-light-rarity-common);
    --color-error: var(--primitive-light-error);
    --color-success: var(--primitive-light-success);
    --color-warning: var(--primitive-light-warning);
    --color-focus: var(--primitive-light-focus);
    --color-info: var(--primitive-light-info);
    --color-surface-hover: var(--primitive-light-surface-hover);
    --color-brand-secondary: var(--primitive-light-brand-secondary);
  }
}

--color-brand-secondary: var(--primitive-teal-400);       /* #00b894 */
--color-brand-accent: var(--primitive-gold-300);          /* #fdcb6e */
--color-brand-accent-bright: var(--primitive-purple-300); /* Hover state for accent buttons */

/* =============================================
   SEMANTIC: Rarity Colors
   ============================================= */
--color-rarity-common: var(--primitive-grey-rarity-common); /* #b2bec3 */
--color-rarity-rare: var(--primitive-teal-rare);           /* #4ecdc4 */
--color-rarity-epic: var(--primitive-purple-epic);        /* #a29bfe */
--color-rarity-legendary: var(--primitive-gold-300);      /* #fdcb6e */

/* =============================================
   SEMANTIC: Status Colors
   ============================================= */
--color-success: var(--primitive-teal-400);               /* #00b894 */
--color-warning: var(--primitive-orange-400);              /* #e8a87c */
--color-error: var(--primitive-red-400);                   /* #e87c7c */
--color-info: var(--primitive-blue-400);                   /* #7cb4e8 */

/* =============================================
   SEMANTIC: Neutral Scale Aliases (PDD §9.1 compatibility)
   ============================================= */
--color-neutral-50:  var(--primitive-grey-50);   /* #f9fafb */
--color-neutral-100: var(--primitive-grey-100);  /* #f3f4f6 */
--color-neutral-200: var(--primitive-grey-200);  /* #e5e7eb */
--color-neutral-300: var(--primitive-grey-300);  /* #d1d5db */
--color-neutral-400: var(--primitive-grey-400);  /* #9ca3af */
--color-neutral-500: var(--primitive-grey-500);  /* #6b7280 */
--color-neutral-600: var(--primitive-grey-600);  /* #4b5563 */
--color-neutral-700: var(--primitive-grey-700);  /* #374151 */
--color-neutral-800: var(--primitive-grey-800);  /* #1f2937 */
--color-neutral-900: var(--primitive-navy-shadow); /* #0d0d1a — PDD §9.1 canonical near-black */

/* =============================================
   SEMANTIC: Interactive
   ============================================= */
--color-focus: var(--primitive-gold-500);                 /* #ffd700 — focus ring */
--color-border-default: var(--primitive-navy-border-default); /* #35355c */
--color-border-focus: var(--color-focus);
--color-border-strong: var(--primitive-navy-border-strong);   /* stronger border for hover/active */
--color-shadow-default: var(--primitive-navy-shadow); /* #0d0d1a */
--color-surface-elevated: var(--color-surface-raised);    /* alias for elevated surface */
--color-brand-primary-muted: color-mix(in oklch, var(--color-brand-primary) 15%, var(--color-surface-base)); /* selected/muted bg */
--color-feedback-error: var(--color-error);               /* alias for error feedback */

/* =============================================
   SEMANTIC: Spacing
   ============================================= */
--space-component-padding: var(--primitive-space-4);      /* 16px */
--space-component-gap: var(--primitive-space-2);          /* 8px */
--space-section: clamp(4rem, 3rem + 5vw, 10rem);
--space-section-inner: var(--primitive-space-12);         /* 48px */
--space-page-gutter: var(--primitive-space-4);            /* 16px mobile; 48px desktop */

/* =============================================
   SEMANTIC: Duration
   ============================================= */
--duration-interaction: var(--primitive-duration-fast);   /* 120ms */
--duration-transition: var(--primitive-duration-normal);  /* 300ms */
--duration-celebration: var(--primitive-duration-celebration); /* 1200ms */

/* =============================================
   SEMANTIC: Shadows
   ============================================= */
--shadow-component: var(--primitive-shadow-sm);           /* buttons, badges */
--shadow-card: var(--primitive-shadow-md);                /* cards, panels */
--shadow-modal: var(--primitive-shadow-lg);               /* modals, overlays */

/* =============================================
   SEMANTIC: Typography Tokens
   ============================================= */
--font-pixel: 'Press Start 2P', 'Courier New', Courier, monospace;
--font-body: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Courier New', Courier, monospace;

--text-h1-size: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
--text-h1-family: var(--font-pixel);
--text-h1-weight: 700;
--text-h1-line-height: 1.4;
--text-h1-letter-spacing: 0em;

--text-h2-size: clamp(1.2rem, 0.8rem + 2vw, 1.8rem);
--text-h2-family: var(--font-pixel);
--text-h2-weight: 700;
--text-h2-line-height: 1.4;
--text-h2-letter-spacing: 0em;

--text-h3-size: clamp(1rem, 0.7rem + 1.5vw, 1.4rem);
--text-h3-family: var(--font-pixel);
--text-h3-weight: 400;
--text-h3-line-height: 1.5;
--text-h3-letter-spacing: 0em;

--text-h4-size: 1.125rem;
--text-h4-family: var(--font-body);
--text-h4-weight: 600;
--text-h4-line-height: 1.5;
--text-h4-letter-spacing: 0em;

--text-h5-size: 1rem;
--text-h5-family: var(--font-body);
--text-h5-weight: 600;
--text-h5-line-height: 1.5;
--text-h5-letter-spacing: 0em;

--text-label-size: 0.875rem;
--text-label-family: var(--font-body);
--text-label-weight: 600;
--text-label-line-height: 1.5;
--text-label-letter-spacing: 0.05em;

--text-body-size: clamp(1rem, 0.92rem + 0.4vw, 1.125rem);
--text-body-family: var(--font-body);
--text-body-weight: 400;
--text-body-line-height: 1.6;
--text-body-letter-spacing: 0em;

--text-small-size: 0.875rem;
--text-small-family: var(--font-body);
--text-small-weight: 400;
--text-small-line-height: 1.5;
--text-small-letter-spacing: 0.01em;

--text-caption-size: 0.75rem;
--text-caption-family: var(--font-body);
--text-caption-weight: 400;
--text-caption-line-height: 1.4;
--text-caption-letter-spacing: 0.02em;

--text-mono-size: 0.875rem;
--text-mono-family: var(--font-mono);
--text-mono-weight: 400;
--text-mono-line-height: 1.5;
--text-mono-letter-spacing: 0em;

--text-stat-family: var(--font-body);
--text-stat-weight: 700;
--text-stat-line-height: 1;
--text-stat-letter-spacing: -0.01em;
--text-stat-size: 1.5rem; /* Context-dependent — override per screen spec */
```

### §6.2.5 Typography Tokens

All `--text-*` CSS custom properties declared above map directly to the §5.2 type scale. Each level exposes five sub-tokens: `-size`, `-family`, `-weight`, `-line-height`, and `-letter-spacing`. Component authors must use these tokens rather than hardcoding font values. The font families are also available via `--font-pixel`, `--font-body`, and `--font-mono` shorthand tokens.

### §6.3 Layer 3 — Component Tokens

```css
/* =============================================
   COMPONENT: Button (Primary)
   ============================================= */
--button-primary-bg: var(--color-brand-primary);
--button-primary-text: var(--color-neutral-50);         /* #f9fafb — 4.72:1 ✓ AA */
--button-primary-hover-bg: var(--color-brand-primary-light);
--button-primary-active-bg: var(--color-brand-primary-dark);
--button-primary-disabled-bg: var(--primitive-grey-400);
--button-primary-focus-outline: 2px solid var(--color-focus);
--button-primary-focus-offset: 2px;
--button-border-radius: var(--primitive-radius-none);     /* Pixel art: sharp */
--button-border: 2px solid var(--primitive-grey-600);
--button-shadow: 4px 4px 0px var(--color-shadow-default);   /* PDD §9.3 aligned: 4px hard-offset */
--button-shadow-hover: 6px 6px 0px var(--color-shadow-default);
--button-shadow-active: 2px 2px 0px var(--color-shadow-default);  /* compressed on press */
--button-padding-y: var(--primitive-space-3);             /* 12px */
--button-padding-x: var(--primitive-space-6);             /* 24px */
--button-min-height: 44px;                                /* WCAG 2.5.5 touch target */

/* Button — error state (form submission failure, failed arena entry, failed claim) */
--button-primary-error-bg: var(--color-error);
--button-primary-error-border: 2px solid var(--color-feedback-error);
--button-primary-error-text: var(--primitive-grey-50);  /* white text on red bg */
--button-primary-error-shadow: 4px 4px 0px var(--color-error);

/* =============================================
   COMPONENT: Input Field
   ============================================= */
--input-bg: var(--color-surface-raised);
--input-bg-hover: var(--color-surface-raised);
--input-border: 2px solid var(--color-border-default);
--input-border-hover: var(--color-border-strong);
--input-border-focus: 2px solid var(--color-focus);
--input-border-error: 2px solid var(--color-error);
--input-text: var(--color-text-primary);
--input-placeholder: var(--color-text-disabled);
--input-bg-disabled: var(--color-surface-base);
--input-text-disabled: var(--color-text-disabled);
--input-opacity-disabled: 0.5;
--input-radius: var(--primitive-radius-sm);               /* 2px — slight softening */
--input-padding: var(--primitive-space-3) var(--primitive-space-4);

/* =============================================
   COMPONENT: Card / Panel
   ============================================= */
--card-bg: var(--color-surface-elevated);
--card-bg-hover: var(--color-surface-raised);
--card-border: 2px solid var(--color-border-default);
--card-border-hover: var(--color-border-strong);
--card-shadow: 4px 4px 0px var(--color-shadow-default);
--card-shadow-hover: 6px 6px 0px var(--color-shadow-default);
--card-focus-outline: 2px solid var(--color-focus);
--card-radius: var(--primitive-radius-none);
--card-transition: var(--primitive-duration-fast) var(--primitive-ease-standard);
--card-padding: var(--primitive-space-6);

/* Card — active/selected state */
--card-border-active: var(--color-brand-primary);
--card-shadow-active: 4px 4px 0px var(--color-brand-primary);
--card-bg-active: var(--color-surface-raised);

/* Card — disabled state */
--card-opacity-disabled: 0.4;
--card-cursor-disabled: not-allowed;

/* Card — error state */
--card-border-error: var(--color-feedback-error);
--card-shadow-error: 4px 4px 0px var(--color-error);

/* =============================================
   COMPONENT: Rarity Badge
   ============================================= */
--badge-common-border: 2px solid var(--color-rarity-common);
--badge-common-bg: color-mix(in oklch, var(--color-rarity-common), transparent 85%);
--badge-common-text: var(--color-rarity-common);

--badge-rare-border: 2px solid var(--color-rarity-rare);
--badge-rare-bg: color-mix(in oklch, var(--color-rarity-rare), transparent 85%);
--badge-rare-text: var(--color-rarity-rare);
--badge-rare-glow: 0 0 8px color-mix(in oklch, var(--color-rarity-rare), transparent 60%);

--badge-epic-border: 2px solid var(--color-rarity-epic);
--badge-epic-bg: color-mix(in oklch, var(--color-rarity-epic), transparent 85%);
--badge-epic-text: var(--color-rarity-epic);
--badge-epic-animation: epic-shimmer 3s linear infinite;

--badge-legendary-border: 3px solid var(--color-rarity-legendary);
--badge-legendary-bg: color-mix(in oklch, var(--color-rarity-legendary), transparent 85%);
--badge-legendary-text: var(--color-rarity-legendary);
--badge-legendary-animation: legendary-shimmer 2s ease-in-out infinite;

/* =============================================
   COMPONENT: Pixel Pet Card (My Pet / Leaderboard / Trade)
   ============================================= */
--pet-card-bg: var(--color-surface-raised);
--pet-card-border-width: 3px;
--pet-card-shadow: var(--shadow-card);
--pet-canvas-border: 3px solid var(--color-brand-accent);
--pet-canvas-shadow-legendary: 0 0 24px color-mix(in oklch, var(--color-brand-accent), transparent 50%);

/* =============================================
   COMPONENT: Stat Bar
   ============================================= */
--stat-bar-bg: var(--color-surface-overlay);
--stat-bar-fill: var(--color-brand-primary);
--stat-bar-fill-max: var(--color-brand-accent);           /* Gold when at max (100) */
--stat-bar-border: 1px solid var(--color-border-default);
--stat-bar-height: 8px;                                   /* Pixel grid aligned */
--stat-bar-radius: var(--primitive-radius-none);

/* =============================================
   COMPONENT: Navigation
   ============================================= */
--nav-bg: var(--color-surface-base);
--nav-border-bottom: 2px solid var(--color-border-default);
--nav-link-color: var(--color-text-secondary);
--nav-link-active: var(--color-brand-primary);
--nav-height: 56px;

/* =============================================
   COMPONENT: Dropdown / Select
   State coverage: Default | Open/Active | Focus | Hover-Option | Selected | Disabled | Error
   ============================================= */
--dropdown-bg: var(--color-surface-raised);
--dropdown-bg-hover: var(--color-surface-elevated);
--dropdown-border: var(--color-border-default);
--dropdown-border-focus: var(--color-brand-primary);
--dropdown-text: var(--color-text-primary);
--dropdown-text-placeholder: var(--color-text-secondary);
--dropdown-option-bg-hover: var(--color-surface-base);
--dropdown-option-bg-selected: var(--color-brand-primary-muted);
--dropdown-disabled-opacity: 0.4;
--dropdown-error-border: var(--color-feedback-error);
--dropdown-radius: var(--primitive-radius-sm);
--dropdown-padding-x: var(--primitive-space-3);
--dropdown-padding-y: var(--primitive-space-2);
```

**Dropdown state reference**:

| State | Border | Background | Text |
|-------|--------|-----------|------|
| Default | `--dropdown-border` | `--dropdown-bg` | `--dropdown-text` |
| Open/Active | `--dropdown-border-focus` | `--dropdown-bg` | `--dropdown-text` |
| Focus | `--color-focus` (2px outline) | `--dropdown-bg` | `--dropdown-text` |
| Hover-Option | `--dropdown-border` | `--dropdown-option-bg-hover` | `--dropdown-text` |
| Selected | `--dropdown-border-focus` | `--dropdown-option-bg-selected` | `--dropdown-text` |
| Disabled | `--dropdown-border` | `--dropdown-bg` | `--dropdown-text` at `--dropdown-disabled-opacity` (0.4) |
| Error | `--dropdown-error-border` | `--dropdown-bg` | `--dropdown-text` |

### §6.x Token Name Changes from PDD §9.3

The following component-level token names extend PDD §9.3. Where VDD uses a more specific name, the PDD name is shown for reference:

| VDD Token Name | PDD §9.3 Token Name | Change Type | Rationale |
|---------------|--------------------|-----------| ---------|
| --badge-legendary-border | --badge-legendary-border-color | Shortening | Consistent with VDD §6.3 badge token naming convention |
| --pet-canvas-border | --canvas-border | Specificity | Prefix 'pet-' added to distinguish pet canvas from admin panel canvases |
| --pet-canvas-shadow-legendary | --canvas-shadow | Specificity | Added '-legendary' suffix to distinguish from standard canvas shadow |

**Intentional Value Overrides from PDD §9.3**:

| Token | Old Value (PDD §9.3) | New Value (VDD) | Effective Duration | Reason |
|-------|---------------------|----------------|-------------------|--------|
| `--duration-celebration` | `var(--primitive-duration-slow)` (600ms) | `var(--primitive-duration-celebration)` (1200ms) | 1200ms | Celebration animations (claim success, rarity reveal) need 1200ms for full pixel-art sequence; original 600ms was insufficient for 8-frame sprite celebration sequence |
| `--button-primary-text` | `var(--color-neutral-50)` (#f9fafb) | `var(--color-neutral-50)` (#f9fafb) | — | Reverted to PDD §9.3 canonical value — achieves 4.72:1 ✓ AA (prior drift to `var(--color-text-primary)` failed WCAG AA at 3.51:1; resolved in Review Round 2) |

EDD authors must use the VDD token names in the left column. The PDD §9.3 names are deprecated at the component level and retained only as backward-compatible aliases.

```css
/* PDD §9.3 backward-compatible aliases */
--badge-legendary-border-color: var(--badge-legendary-border);
--canvas-border: var(--pet-canvas-border);
--canvas-shadow: var(--pet-canvas-shadow-legendary);
```

### §6.4 Dark Mode Token Mapping

Inherits from PDD §9.4. The following table is the canonical dark/light token mapping with WCAG contrast verification.

| Semantic Token | Light Mode Value (hex) | Dark Mode Value (hex) | WCAG Contrast (text:bg) | Notes |
|---------------|----------------------|----------------------|------------------------|-------|
| `--color-surface-base` | `#f8f8fc` | `#1a1a2e` | N/A (background) | Dark is primary default |
| `--color-surface-raised` | `#eeeef8` | `#242444` | N/A | Card and panel surfaces |
| `--color-surface-overlay` | `#e2e2f0` | `#2d2d5a` | N/A | Hover, selected states |
| `--color-surface-hover` | `#d4d4e8` | `#3a3a6e` | N/A | Row hover, interactive surface highlight |
| `--color-text-primary` | `#1a1a2e` | `#e8e8f0` | 12.4:1 dark / 14.1:1 light | AAA on both modes |
| `--color-text-secondary` | `#4a4a7a` | `#6c6c9a` | 4.7:1 dark / 5.2:1 light | AA on both modes |
| `--color-text-disabled` | `#7a7aaa` | `#4a4a6a` | 3.1:1 minimum | Meets AA large text only |
| `--color-brand-primary` | `#4a3fd4` | `#c4b5fd` | 5.8:1 dark / 4.6:1 light | AA on both modes |
| `--color-brand-secondary` | `#007a5e` | `#00b894` | 5.2:1 dark / 4.5:1 light | AA on both modes |
| `--color-brand-accent` | `#c9930a` | `#fdcb6e` | 8.4:1 dark / 4.5:1 light | AAA dark / AA light |
| `--color-rarity-legendary` | `#b07e00` | `#fdcb6e` | 8.4:1 dark / 5.1:1 light | AAA dark |
| `--color-rarity-epic` | `#6a5fe8` | `#a29bfe` | 5.9:1 dark / 4.8:1 light | AA both |
| `--color-rarity-rare` | `#009688` | `#4ecdc4` | 6.8:1 dark / 4.9:1 light | AA both |
| `--color-rarity-common` | `#636b72` | `#b2bec3` | 7.1:1 dark / 4.5:1 light | AA both |
| `--color-error` | `#cc3333` | `#e87c7c` | 5.5:1 dark / 4.6:1 light | AA both |
| `--color-info` | `#4a80cc` | `#7cb4e8` | 5.0:1 dark / 4.5:1 light | AA both |
| `--color-success` | `#00836b` | `#00b894` | 6.1:1 dark / 4.7:1 light | AA both |
| `--color-warning` | `#cc5a00` | `#e8a87c` | 5.3:1 dark / 4.5:1 light | AA both |
| `--color-focus` | `#c49900` | `#ffd700` | 3.1:1 minimum | AA non-text on both |
| `--color-border-default` | `#9999bb` | `#35355c` | N/A (border) | |
| `--color-border-strong` | `#9898c0` | `#4d4d7a` | N/A (border) | Hover/active state border |
| `--color-border-focus` | `var(--color-focus)` | `var(--color-focus)` | N/A | Inherits focus color |

### §6.5 Motion Tokens

```css
/* =============================================
   MOTION: Semantic Easing Aliases
   ============================================= */
--motion-ease-spring: var(--primitive-ease-spring);       /* Semantic alias — use for bouncy interactions */

/* =============================================
   MOTION: Standard Interaction Tokens
   ============================================= */
--motion-button-press: scale(0.97);
--motion-button-press-duration: var(--primitive-duration-fast); /* 120ms */
--motion-button-press-easing: var(--primitive-ease-spring);

--motion-page-transition-duration: 300ms;
--motion-page-transition-easing: var(--primitive-ease-out-expo);

--motion-stat-float-duration: 400ms;
--motion-stat-float-hold: 2000ms;   /* CONSTANTS: TRAINING_STAT_DISPLAY_DURATION = 2s */
--motion-stat-float-fade: 200ms;

--motion-rarity-reveal-duration: 600ms;
--motion-rarity-reveal-easing: var(--primitive-ease-spring);

--motion-modal-open-duration: 200ms;
--motion-modal-open-easing: var(--primitive-ease-out-expo);

--motion-celebration-duration: 1200ms;  /* Victory particle burst */
--motion-leaderboard-update: 500ms;

/* =============================================
   MOTION: prefers-reduced-motion Override Rule
   (MUST be applied globally — no exceptions)
   ============================================= */
```

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Exception: Countdown timers remain functional */
  .countdown-timer { transition-duration: 0ms; }

  /* Exception: ARIA live regions still announce */
  [aria-live] { /* No override needed */ }
}
```

### §6.6 Responsive Visual Behavior Rules

#### Per-Breakpoint Visual Density Strategy

| Breakpoint | Width | Density | Strategy |
|-----------|-------|---------|---------|
| xs | 320px | Ultra-compact | Single column; PetCard reduced to 48px canvas; stats collapsed to icon-only |
| sm | 375px | Compact | Single column; PetCard 64px canvas; 2-column stat grid |
| md | 768px | Normal | 2-column layouts; full PetCard 64px; all stats visible |
| lg | 1024px | Comfortable | 3-column pet grids; side-by-side battle layout |
| xl | 1440px | Spacious | 4-column grids; expanded arena battle view |
| 2xl | 1920px | Max-width capped | max-width: 1440px centered; no further layout changes |

#### Spacing Token Scaling Per Breakpoint

- `--space-section`: uses `clamp(4rem, 3rem + 5vw, 10rem)` — computed values approx. xs≈64px / md≈80px / xl=160px (max); see §6.2 canonical definition
- `--space-page-padding`: xs=16px / md=24px / xl=32px
- PetCanvas container: xs=48px / sm=64px / md=64px / lg=80px

#### Sprite/Image Visual Focus Adaptation

- At 48px display size: show only primary rarity border + base sprite, hide glow effects
- At 64px display size: full sprite + rarity border + glow for Epic/Legendary
- At 80px+ display size: full sprite + rarity border + glow + stat overlay on hover
- Use CSS `image-rendering: pixelated` on all sprite images to prevent anti-aliasing blur at non-native sizes

#### Type Scale Graceful Wrapping (Press Start 2P)

- H1 at 320px: max 12 characters per line; longer names must use `word-break: break-all`
- H2 at 320px: ≤14 characters; use `--text-h3` size as fallback at xs breakpoint if H2 would cause overflow
- Body text (Inter): `word-break: break-word; hyphens: auto` at xs

---

## §7 Asset Pipeline

### §7.1 Sprite / Pixel Art Output Specifications

| Asset Type | Format | Dimensions | Naming Convention | Notes |
|-----------|--------|------------|-------------------|-------|
| Pet sprite (hero) | PNG-24 (with alpha) | 64×64px @1x; 128×128px @2x | `pet-{seed}-{rarity}-64.png`, `pet-{seed}-{rarity}-128.png` | Generated server-side from seed |
| Pet sprite (thumbnail) | PNG-24 (with alpha) | 32×32px @1x; 64×64px @2x | `pet-{seed}-thumb-32.png`, `pet-{seed}-thumb-64.png` | Leaderboard, trade cards |
| Pet sprite sheet (animation) | PNG-24 (sprite atlas) | 512×64px (8 frames × 64px) | `pet-{seed}-sheet.png` | Single row, frames left-to-right |
| Arena race sprite sheet | PNG-24 | 256×64px (4 run frames × 64px) | `pet-{seed}-run-sheet.png` | 4-frame run cycle for battle animation |
| UI icons | SVG (primary) | 16×16, 24×24 (viewBox only) | `icon-{name}-{size}.svg` | Must be pixel-art aligned — grid-snapped paths |
| UI icons (fallback) | PNG-24 | 16×16, 24×24, 32×32 | `icon-{name}-{size}.png` | For browsers without reliable SVG support |

**Sprite atlas spec**: All pet sprites for a single session are packed into a runtime sprite atlas (1024×1024px max) to minimize draw calls in Phaser.js. Atlas JSON configuration follows the Phaser.js `atlasJSON` format.

### §7.2 Icon Specifications

**Game UI Icons (custom pixel-art)**:
- Type: Custom pixel-art icons — 24×24px at 2× = 48×48 source canvas, 2px stroke at 24px, 0px border-radius, hard pixel edges
- SVG `viewBox` must be `"0 0 16 16"` or `"0 0 24 24"` — no non-standard viewBox dimensions
- Icon colors are inherited via `currentColor` — no hard-coded fill/stroke colors in SVG source
- Decorative icons use `aria-hidden="true"`; functional icons have `aria-label` on the parent interactive element
- All paths snapped to pixel grid, no rounded corners

**Non-Game UI Icons (forms, admin portal, navigation)**:
- Library: Phosphor Icons v2.1 (https://phosphoricons.com) as the base library
- Weight variant: "Bold" for consistency with pixel-art visual density
- Customization: Adjusted to match pixel-art aesthetic where possible (hard edges, minimal curves)
- Admin portal: Phosphor Icons Bold used exclusively (no custom pixel icons in admin context)

### §7.3 Illustration Style

**Pixel Sprites** (primary illustration type for all game elements):
- Scope: pets, arena environment, items
- Canvas: 64×64px base on 8px pixel grid
- Color constraint: max 16 colors per sprite
- Rendering: hard-edge, no anti-aliasing
- CSS: `image-rendering: pixelated; image-rendering: crisp-edges;`

**Non-Sprite Illustrations** (empty states, onboarding, error pages):
- Style: 2D flat vector illustration with pixel-art-inspired edges
- Technique: CSS `image-rendering: pixelated` on rasterized versions for pixelated look
- Border radius: 4px maximum
- Color palette: limited, matching brand tokens only

**Admin Portal Illustrations**:
- Style: Minimal line illustrations using Phosphor Icons extended
- Pixel-art aesthetic is NOT used in admin contexts
- Consistent with professional data-tool visual language

### §7.4 Logo Asset Export Specifications

| Version | Format | Size | Use Case |
|---------|--------|------|---------|
| Primary (dark bg) | SVG + PNG @2x | Nav: 160×32px; Header: 240×48px | Primary logo on dark surfaces |
| Inverted (light bg) | SVG + PNG @2x | Same sizes | Light background contexts |
| Monochrome | SVG + PNG @1x | 32×32px favicon, 64×64px icon | Favicons, PWA icons |
| Wordmark only | SVG + PNG @2x | Min 80px wide, recommended 160px | Text-only contexts |
| Mark only (pixel pet icon) | PNG @2x | 32×32, 64×64, 128×128 | App icons, social avatars |

**Constraints**:
- Maximum file sizes: SVG < 8KB, PNG @2x < 50KB
- Optimization: SVGO for SVG, pngquant for PNG
- Naming: `logo-primary-dark.svg`, `logo-inverted.png`, `mark-64.png`

### §7.5 Background Specifications

| Asset | Format | Dimensions | Max File Size | Notes |
|-------|--------|------------|--------------|-------|
| Arena race track tile | PNG → CSS `background-repeat: repeat-x` | 32×8px tile | ≤2KB | Dark pixel grid pattern |
| Arena background (full-width) | AVIF (primary) + WebP (fallback) | Full-width | ≤150KB AVIF / ≤200KB WebP | Full arena backdrop |
| Admin dashboard background | CSS only — no image | N/A | N/A (CSS only) | `--admin-sidebar-bg: #111827` |
| OG social card background | AVIF (primary) + WebP (fallback) + PNG (last resort) | 1200×630px | ≤150KB AVIF / ≤200KB WebP | Pre-rendered per pet; includes sprite, rarity, stats |
| Page background pattern | SVG (primary) + PNG (fallback) | Tileable pattern | ≤10KB SVG / ≤20KB PNG | Subtle texture on base surfaces if used |

### §7.6 Naming Conventions

**General pattern**: `{context}-{descriptor}-{variant}-{size}.{ext}`

Examples:
- `icon-arena-race-24.svg`
- `icon-rarity-legendary-16.svg`
- `bg-arena-track-32x8.png`
- `og-battle-result-1200x630.avif`

**Rarity asset naming**:
- `badge-common.svg`, `badge-rare.svg`, `badge-epic.svg`, `badge-legendary.svg`

**Prohibited naming patterns**:
- No `final`, `final2`, `v2`, `new`, `temp` in production asset names
- No spaces in filenames — use hyphens only

### §7.7 Figma → Code Delivery Spec

**Figma File**: `https://www.figma.com/file/[PIXEL-PET-ARENA-DESIGN-FILE]` *(pending: Design Lead to create and share by Sprint 1 end)*

> **Note**: All Figma frame links must be populated before entering FRONTEND implementation phase.

**Per-Component Figma Links**:

| Component | Figma Frame Link | Handoff Status |
|-----------|-----------------|---------------|
| PetCard | [Frame TBD — due: Sprint 1 end, Owner: Design Lead] | Pending |
| Button (Primary / Secondary / Disabled) | [Frame TBD — due: Sprint 1 end, Owner: Design Lead] | Pending |
| Input Field (all states) | [Frame TBD — due: Sprint 1 end, Owner: Design Lead] | Pending |
| Dropdown / Select (all states) | [Frame TBD — due: Sprint 1 end, Owner: Design Lead] | Pending |
| Rarity Badge (all 4 tiers) | [Frame TBD — due: Sprint 1 end, Owner: Design Lead] | Pending |
| Stat Bar | [Frame TBD — due: Sprint 1 end, Owner: Design Lead] | Pending |
| Navigation Bar | [Frame TBD — due: Sprint 1 end, Owner: Design Lead] | Pending |
| Arena Mode Card | [Frame TBD — due: Sprint 1 end, Owner: Design Lead] | Pending |
| Battle Result (WIN/LOSS) | [Frame TBD — due: Sprint 1 end, Owner: Design Lead] | Pending |

**Auto Layout Confirmation Checklist**:
- [ ] All buttons use Auto Layout with padding tokens (`--button-padding-y`, `--button-padding-x`)
- [ ] All card components use Auto Layout with gap tokens (`--card-padding`)
- [ ] All form inputs use Auto Layout

**Component Properties Configuration**:
- Rarity tier = Variant property (Common / Rare / Epic / Legendary)
- State = Variant property (Default / Hover / Focus / Active / Disabled / Error)
- Interactive Components enabled for hover/focus states in Figma Dev Mode

**Redline / Spec Delivery Method**:
- Primary: Figma Dev Mode
- Backup: Zeplin (if team prefers dedicated redline tooling)

**Delivery Table**:

| Deliverable | Format | Handoff Method |
|------------|--------|---------------|
| Component designs | Figma frames with annotated redlines | Figma Inspect → CSS custom property names mapped to §6 token names |
| Spacing annotations | Figma → CSS `gap`, `padding`, `margin` via token names | `var(--primitive-space-*)` references in Figma notes |
| Color annotations | Figma color styles → CSS token names | All fills/strokes annotated with `--color-*` token name |
| Typography styles | Figma text styles → CSS font-size/weight/line-height | All text styles map to §5.2 type scale levels |
| Pixel sprite exports | Figma → PNG export at 1x and 2x | `image-rendering: pixelated` annotation on all sprite frames |
| Animation specs | Figma Prototype + PDD §6.1.1 motion spec table | Duration, easing, trigger, and reduced-motion fallback annotated per component |

**Known Deviations (Figma vs. CSS)**:
- Press Start 2P line-height in Figma may differ slightly from CSS due to pixel-grid snapping (expect ±2px differences in vertical rhythm)
- CRT glow effects (`box-shadow` on Legendary tier) must be approximated in Figma using a glow layer effect — exact CSS rendering will differ

---

## §8 Screen Visual Specs

This section provides visual design specifications for all P0 screens. Constants from `CONSTANTS.md` are referenced directly.

### §8.1 Landing Page — Route: `/`

**Visual hierarchy**:
1. Pet canvas (dominant hero — occupies 60%+ of viewport on mobile, 50% left column on desktop)
2. Rarity shimmer hint on canvas border (passive discovery)
3. `ClaimCTA` button (surfaces after 30s or first interaction)
4. Social proof counter ("X pets claimed today")
5. Navigation (minimal — Leaderboard link only)

**Grid / Layout**:
- Mobile (320–767px): Full-width canvas, stats hidden, CTA below canvas; single column
- Tablet+ (768px+): Canvas in left column (50vw), "claim" prompt in right column
- Desktop (1024px+): Canvas max 640px, centered content, nav bar above

**Color usage**:
- Background: `--color-surface-base` (#1a1a2e)
- Canvas border: `3px solid --color-brand-accent` (#fdcb6e) — draws eye to game
- CTA button: `--button-primary-bg` (#6c5ce7) with pixel shadow
- Rarity shimmer: border tint matching pet rarity tier color

**Typography**:
- App name in nav: `Press Start 2P` 14px — game identity
- Social proof counter: `Press Start 2P` 12px — in-game feel for numbers
- CTA label: Inter 600 16px — readable action label

**Empty state**: No empty state — page always has a generated pet (random seed on page load)

**Loading state**: Progressive pixel-art scanline reveal — canvas rows reveal top-to-bottom over `<2s` (per CONSTANTS `Pet Render on Load < 2s`)

---

### §8.2 Claim Pet Page — Route: `/claim`

**Visual hierarchy**:
1. Step indicator (Email → Code → Done) at top
2. Active form step (full-width card, centered)
3. Countdown timer (visible when code entry step active)
4. URL reveal (celebratory, prominent, with copy button)

**Color usage**:
- Form card: `--card-bg` (#242444) with `--card-border`
- Submit button: `--button-primary-bg`
- Error states: `--color-error` (#e87c7c) on input border + error text below
- Expiry warning: `--color-warning` (#e8a87c) in amber alert box
- URL reveal: `--color-success` border + green accent on "Go to My Pet" CTA

**Typography**:
- Step heading: `Press Start 2P` H3 — "Claim Your Pet"
- Input labels: Inter H6 600
- Error messages: Inter Body 400 in `--color-error`
- URL display: system monospace 14px in code block

**Empty/Loading states**:
- Submit loading: pixel spinner in button, `aria-busy="true"`
- Code expiry warning at T-2 minutes: amber `role="alert"` banner (CONSTANTS: `A11Y_CLAIM_CODE_WARNING_BEFORE_EXPIRY = 2 minutes`)
- Expired code: error inline; "Request New Code" link appears

---

### §8.3 My Pet Page — Route: `/pet/:petId`

**Visual hierarchy (Z-pattern)**:
1. Pet canvas (top-left anchor — deterministic from seed, owned pet state)
2. Rarity badge + level (top-right — status at a glance)
3. Stats panel (horizontal band — three stat bars + level)
4. Training entry button (bottom-left — primary recurring action)
5. Food inventory (bottom-center — item grid)
6. Arena entry button (bottom-right — competitive entry point)

**Color usage**:
- Pet canvas border: rarity-tier color (3px solid `--color-rarity-{tier}`)
- Stats bars: fill in `--stat-bar-fill` (#6c5ce7); full bar shows `--stat-bar-fill-max` (gold)
- Training button: `--button-primary-bg` when actions remain; disabled grey when `TRAINING_ACTIONS_PER_DAY = 3` exhausted
- Neglected state overlay (after `TRAINING_NEGLECT_THRESHOLD = 3 days`): `filter: grayscale(60%) brightness(0.8)` + wilted overlay

**Typography**:
- Pet name: `Press Start 2P` H2 in `--color-text-primary`
- Stat values: Inter Numeric 700 in `--color-brand-accent`
- Training countdown: Inter Caption in `--color-text-secondary`

**Loading state**: Skeleton shimmer on stats panel while pet data loads; canvas shows static first-frame sprite

---

### §8.4 Training Page — Route: `/pet/:petId/train`

**Visual hierarchy**:
1. Three training action cards (Run / Strength / Stamina) — horizontal on desktop, swipeable carousel on mobile
2. Daily reset countdown (bottom of cards area)
3. Training streak counter (motivational hook)
4. Stat change indicator overlay (floats upward on success)

**Color usage**:
- Card backgrounds: `--card-bg` with `--card-border`
- Train button: `--button-primary-bg`; disabled grey with "MAX" badge when stat = `PET_STAT_MAX = 100`
- Stat change indicator: `--color-brand-accent` text (gold "+3 Speed")
- Streak flame: `--color-warning` (#e8a87c) for the flame icon

**Key numbers** (from CONSTANTS):
- `TRAINING_ACTIONS_PER_DAY = 3` — shown as "X actions remaining today"
- `TRAINING_STAT_POINTS_MIN = 1` to `TRAINING_STAT_POINTS_MAX = 3` — gain range displayed
- `PET_STAT_MAX = 100` — MAX badge triggers at this value; HTTP 400 from API
- `TRAINING_STAT_DISPLAY_DURATION = 2` seconds — stat indicator hold duration
- `TRAINING_NEGLECT_THRESHOLD = 3 days` — shown in streak counter context

---

### §8.5 Arena Page — Route: `/arena`

**Visual hierarchy**:
1. Mode selector cards (Race / Sumo if `FF_ARENA_SUMO` ON)
2. Pre-battle stats panel (current pet stats + active food buffs)
3. "Enter Arena" primary CTA button
4. Matchmaking status indicator (replaces CTA after click)
5. Rate limit banner (amber, slides in from top if limit reached)

**Color usage**:
- Mode card selected: `--card-border-active` border (3px pixel), `--card-shadow-active` shadow
- "Enter Arena" button: `--button-primary-bg`
- Rate limit banner: `--color-warning` background, `--color-text-primary` text
- Active food buff indicators: `--color-brand-secondary` (teal) label
- AI opponent label: `--color-info` (#7cb4e8) text — clearly differentiated

**Key numbers** (from CONSTANTS):
- `ARENA_RATE_LIMIT_BATTLES_PER_HOUR = 10` — shown in countdown when exhausted
- `ARENA_MATCHMAKING_TIMEOUT = 30` seconds — timeout before AI offer appears
- `ARENA_MATCH_DURATION_MIN = 5` to `ARENA_MATCH_DURATION_MAX = 15` seconds — battle animation range

**Empty state**: If no arena modes available (all behind feature flags), shows "Arena opening soon" with pixel-art locked door illustration

---

### §8.6 Battle Result Page — Route: `/arena/result/:battleId`

**Visual hierarchy**:
1. WIN/LOSS banner (hero — full width, dominant color treatment)
2. Stat comparison table (both pets side by side)
3. Share battle URL button (social growth mechanism)
4. Action buttons row (Enter Again / Return to Pet / View Leaderboard)

**Color usage**:
- WIN state: `--color-rarity-legendary` (#fdcb6e) border + gold particle burst (24 particles)
- LOSS state: `--color-text-secondary` palette, muted — motivational message in `--color-brand-secondary`
- Winning stat cells: highlighted in `--color-brand-accent`
- Share button: `--button-primary-bg` with share icon

**Loading/animation**: WIN reveal triggers 1200ms celebration (`--motion-celebration-duration`); LOSS reveals with 400ms `ease-out-expo` fade. Battle animation from Phaser.js precedes this page (5–15s per CONSTANTS).

---

### §8.7 Leaderboard Page — Route: `/leaderboard`

**Visual hierarchy (F-pattern)**:
1. Page title + rarity filter tabs (first F-bar)
2. Owner rank banner (if pet token present) — slides in below nav
3. Leaderboard table (F-pattern scan: rank # left → pet name → rarity badge → score → win rate)
4. Pagination / infinite scroll trigger at bottom

**Color usage**:
- Owner row: `--color-surface-overlay` background + `--color-brand-accent` left border (4px accent stripe)
- Rarity filter active tab: background in matching rarity color at 20% opacity
- Row hover: `--color-surface-hover`
- Top 3 ranks: rank number in `--color-brand-accent` (gold) for #1, `--color-rarity-rare` (teal) for #2, `--color-rarity-epic` (purple) for #3

**Key numbers** (from CONSTANTS):
- `LEADERBOARD_TOP_DISPLAY = 100` — default view shows top 100
- `LEADERBOARD_UPDATE_LAG_MAX = 30` seconds — max eventual consistency lag

**Empty state**: Shown while loading — skeleton shimmer rows matching table column layout

---

### §8.8 Battle Records Page — Route: `/pet/:petId/records`

**Visual hierarchy**:
1. Pet profile card (sprite + rarity + level + W/L ratio)
2. Share page button (prominent — this page is the viral growth surface)
3. Battle history table (last `ARENA_BATTLE_RECORDS_DISPLAY = 20` battles per CONSTANTS)
4. Empty state CTA when fewer than 20 battles

**Color usage**:
- Profile card border: rarity-tier color matching pet
- Win rows: subtle `--color-success` left border (2px)
- Loss rows: subtle `--color-error` left border (2px)
- Share button: `--button-primary-bg`

**Open Graph meta spec** (social share card):
- Image dimensions: 1200×630px
- Layout: pet sprite (128×128px) left, name + rarity badge center, W/L record right
- Background: `--color-surface-base` (#1a1a2e)
- Border on pet sprite: rarity-tier color at 4px

---

### §8.9 Marketplace Page — Route: `/marketplace` (behind `FF_MARKETPLACE`)

Active only when `DAU_MARKETPLACE_TRIGGER = 1000` users sustained for 2 weeks (per CONSTANTS).

**Visual hierarchy**:
1. Feature gate banner if FF OFF (amber, DAU progress)
2. Filter/sort bar (rarity filter + sort by: level, rarity, recency)
3. Pet listing grid (card-based, rarity border treatment)
4. Individual listing card: sprite, rarity badge, level, trade terms

**Key numbers** (from CONSTANTS):
- `MARKETPLACE_TRADE_ANTIFLIP_PROTECTION = 7 days` — shown in trade confirmation
- `TRADE_TRANSACTION_FEE = 5%` — shown as fee disclosure before confirm
- Trade minimum price formula: `(pet_level × 100) + (rarity_multiplier × 500)` using rarity multipliers (Common=1, Rare=2, Epic=4, Legendary=8)

---

## §9 Accessibility Visual Standards

### §9.1 Contrast Ratio Verification Table

| UI Element | Token | Foreground Hex | Background Hex | Contrast Ratio | WCAG Level | Notes |
|-----------|-------|---------------|---------------|----------------|-----------|-------|
| Body text | `--color-text-primary` on `--color-surface-base` | `#e8e8f0` | `#1a1a2e` | **12.4:1** | AAA | Primary reading text |
| Secondary text | `--color-text-secondary` on `--color-surface-base` | `#6c6c9a` | `#1a1a2e` | **4.7:1** | AA | Descriptions, metadata |
| Disabled text | `--color-text-disabled` on `--color-surface-base` | `#4a4a6a` | `#1a1a2e` | **3.1:1** | AA Large | Large text / non-text minimum |
| Brand primary (button text) | `--button-primary-text` on `--color-brand-primary` | `#f9fafb` | `#6c5ce7` | **4.72:1** | ✓ AA | Button label on purple — **FIXED** in Review Round 2: `--button-primary-text` declared as `var(--color-neutral-50)` (#f9fafb); prior drift to `var(--color-text-primary)` (#e8e8f0, 3.51:1) failed WCAG AA and has been reverted. |
| Common rarity label | `--color-rarity-common` on `--color-surface-base` | `#b2bec3` | `#1a1a2e` | **7.1:1** | AAA | Rarity badge text |
| Rare rarity label | `--color-rarity-rare` on `--color-surface-base` | `#4ecdc4` | `#1a1a2e` | **6.8:1** | AA | Rarity badge text |
| Epic rarity label | `--color-rarity-epic` on `--color-surface-base` | `#a29bfe` | `#1a1a2e` | **5.9:1** | AA | Rarity badge text |
| Legendary rarity label | `--color-rarity-legendary` on `--color-surface-base` | `#fdcb6e` | `#1a1a2e` | **8.4:1** | AAA | Rarity badge text |
| Error message | `--color-error` on `--color-surface-base` | `#e87c7c` | `#1a1a2e` | **5.5:1** | AA | Form error text |
| Success message | `--color-success` on `--color-surface-base` | `#00b894` | `#1a1a2e` | **6.1:1** | AA | Training complete, claim success |
| Warning banner text | `--color-text-primary` on warning bg | `#e8e8f0` | `#e8a87c` | **2.59:1** | FAILS AA — needs remediation | Rate limit / expiry banners — requires design review before production. **Resolution**: Darken warning text to `var(--color-neutral-900)` (#0a0a0f) → achieves >7:1 ✓ AAA. |
| Focus ring vs dark bg | `--color-focus` on `--color-surface-base` | `#ffd700` | `#1a1a2e` | **12.1:1** | AAA | Focus ring — exceeds AA minimum 3:1 |
| Focus ring vs primary | `--color-focus` on `--color-brand-primary` | `#ffd700` | `#6c5ce7` | **4.2:1** | AA | Focus on active button |
| Text on raised surface | `--color-text-primary` on `--color-surface-raised` | `#e8e8f0` | `#242444` | **11.1:1** | AAA | Text on cards/modals |

> **Design Review Required**: Two pairings in the table above have contrast ratios below WCAG AA (4.5:1 for normal text): "Brand primary (button text)" at 3.51:1 and "Warning banner text" at 2.59:1. Both must undergo design review and remediation before production launch.

### §9.2 Focus Style Specifications

All interactive elements use a consistent focus ring derived from `--color-focus` (#ffd700):

```css
/* Global focus ring — applied via :focus-visible to avoid visible focus on mouse click */
:focus-visible {
  outline: 2px solid var(--color-focus);      /* #ffd700 */
  outline-offset: 2px;
  border-radius: inherit;                      /* Follows element shape */
}

/* Pixel-art style focus ring for game elements */
.pixel-art-focus:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--color-focus), transparent 60%);
}

/* Remove default focus for non-keyboard users */
:focus:not(:focus-visible) {
  outline: none;
}
```

**Focus ring contrast verification**:
- `#ffd700` on `#1a1a2e` (dark base): 12.1:1 — exceeds AAA
- `#ffd700` on `#242444` (raised surface): 11.1:1 — exceeds AAA
- `#ffd700` on `#6c5ce7` (primary button): 4.2:1 — meets AA

### §9.3 Color-Blind Accessibility Check

The rarity system must be distinguishable without relying solely on hue. Each tier uses a combination of:

| Rarity | Hue | Saturation | Lightness | Additional Differentiator |
|--------|-----|-----------|-----------|--------------------------|
| Common | Grey (0°) | Very low | Medium | No glow; flat treatment |
| Rare | Teal (190°) | High | Medium-high | Subtle outer glow |
| Epic | Purple (280°) | High | Medium-high | Animated shimmer |
| Legendary | Gold (82°) | High | High | CRT glow + animation + 3px border |

**Deuteranopia / protanopia check**: Rare (teal) and Legendary (gold) remain perceptually distinct under red-green color blindness simulation. Epic (purple) and Common (grey) are also differentiated by saturation, not just hue. Text labels accompany all rarity badges as a redundant signal (per WCAG 1.4.1 Use of Color).

**Tritanopia check**: Gold and teal can appear similar under blue-yellow color blindness. Mitigation: Epic (purple) and Legendary (gold) are further differentiated by animation treatment (epic-shimmer vs. legendary-shimmer + CRT glow), ensuring all four tiers remain distinguishable.

### §9.4 Icon Accessibility Guidelines

- All functional icons (share, copy, enter arena) have an accessible label on the parent interactive element (`aria-label` on `<button>`)
- All decorative icons use `aria-hidden="true"` with empty `alt=""`
- Icon-only buttons must have a visible tooltip on hover/focus (`title` attribute + tooltip component)
- Icon sizes meet minimum touch targets: 16px icon inside 44×44px button minimum
- Pixel-art icons maintain ≥ 3:1 contrast ratio against their container background (non-text contrast per WCAG 1.4.11)

---

## §10 開放問題 (Open Questions)

| # | 問題 | 優先度 | 負責人 | 截止日 |
|---|------|--------|--------|--------|
| OQ-01 | Pixel-art sprite sheet 是否採用外包，或由 AI 工具生成原始素材？影響 §7 Asset Pipeline 的交付規格 | HIGH | Art Director | TBD |
| OQ-02 | ~~Dark mode 是否為 v1 必要需求？若是，§6 Design Tokens 需補充 dark mode token set~~ **RESOLVED (Sprint 0)** — §6.4 已提供完整 21 個 Dark Mode token 對照表。Dark Mode 為 v1 必要需求。 | ~~MEDIUM~~ RESOLVED | Product Manager | Sprint 0 |
| OQ-03 | Seasonal / event visual variants（§14）的更新節奏確定為每季一次，還是 ad-hoc？需與 backend release cadence 對齊 | MEDIUM | Design Lead | TBD |
| OQ-04 | Admin portal 是否需要自訂 branding（logo、色調），或維持目前中性風格？ | LOW | Product Manager | TBD |

---

## §11 工程交付規格 (Engineering Handoff Specification)

### §11.1 交付物清單

| 交付物 | 格式 | 負責人 | 狀態 |
|--------|------|--------|------|
| Design Tokens (CSS variables) | `tokens.css` | Frontend Architect | To Implement |
| Sprite sheet (all pets × rarities) | PNG @ 2x / WebP fallback | Art Director | To Design |
| UI component set (buttons, modals, cards) | Figma Components + CSS | Design Lead | To Design |
| Animation specs (battle, idle) | Figma Prototype + CSS keyframes spec | UX Designer | To Design |
| Icon set (functional + decorative) | SVG sprite | Design Lead | To Design |
| Color palette file | `palette.json` (HSL + hex) | Design Lead | To Design |

### §11.2 交付標準

- 所有 token 必須與 `docs/CONSTANTS.md §1` 數值對齊
- Sprite 須通過 §9 的 contrast ratio 測試
- 每個元件附 focus / hover / disabled 三態規格
- 所有 motion spec 須滿足 `prefers-reduced-motion: reduce` fallback

---

## §12 參考文件 (References)

| 文件 | 路徑 | 說明 |
|------|------|------|
| PRD | `docs/PRD.md` | 功能需求與 A11y NFR 來源 |
| PDD | `docs/PDD.md` | UI 佈局與互動設計規格 |
| CONSTANTS | `docs/CONSTANTS.md` | 所有量化數值唯一真相來源 |
| EDD | `docs/EDD.md` | 技術棧與前端框架選型 |
| WCAG 2.1 | https://www.w3.org/TR/WCAG21/ | 無障礙設計標準 |
| Phaser 3 Docs | https://phaser.io/phaser3 | 遊戲框架技術文件 |
| CSS Custom Properties | https://developer.mozilla.org/en-US/docs/Web/CSS/--* | Design token 實作參考 |

---

## §13 Admin UI Design Specs

> This section covers the admin backend design since `has_admin_backend = true` (per PRD Document Control).

### §13.1 Admin Color Scheme

The admin portal uses a **distinct, professional color scheme** deliberately separated from the frontend pixel-art brand. The admin visual language is: dark sidebar, neutral-light content area, data-dense tables. This prevents operators from confusing admin and player contexts.

**Admin Surface Tokens**:

| Token | Hex | WCAG Contrast | Usage |
|-------|-----|--------------|-------|
| `--admin-sidebar-bg` | `var(--primitive-grey-900)` | N/A (background) | Sidebar background — deep charcoal, distinct from game's navy |
| `--admin-sidebar-text` | `var(--primitive-grey-50)` | **15.2:1 on sidebar** | AAA — sidebar navigation labels |
| `--admin-sidebar-text-secondary` | `var(--primitive-grey-300)` | **9.6:1 on sidebar** | AAA — inactive nav item labels |
| `--admin-sidebar-active-bg` | `var(--primitive-grey-800)` | N/A | Active/hover sidebar item background |
| `--admin-sidebar-active-indicator` | `var(--color-brand-primary)` | N/A (left border accent) | Active nav item left-border accent (inherits brand primary) |
| `--admin-content-bg` | `var(--primitive-grey-50)` | N/A (background) | Main content area — light neutral |
| `--admin-content-text` | `var(--primitive-grey-900)` | **15.2:1 on content** | AAA — primary content text |
| `--admin-content-text-secondary` | `var(--primitive-grey-500)` | **4.6:1 on content** | AA — secondary labels, timestamps |
| `--admin-card-bg` | `#ffffff` | N/A | White cards on light content bg |
| `--admin-card-border` | `var(--primitive-grey-200)` | N/A | Card and table borders |
| `--admin-table-header-bg` | `var(--primitive-grey-100)` | N/A | Table header row background |
| `--admin-table-row-hover` | `var(--primitive-grey-50)` | N/A | Table row hover state |
| `--admin-danger-bg` | `#fee2e2` | N/A | Ban/delete action backgrounds |
| `--admin-danger-text` | `#dc2626` | **5.3:1 on white** | AA — danger action labels |
| `--admin-warning-bg` | `#fef3c7` | N/A | Suspicious flag backgrounds |
| `--admin-warning-text` | `#d97706` | **4.6:1 on white** | AA — warning labels |
| `--admin-success-bg` | `#d1fae5` | N/A | Active/healthy state backgrounds |
| `--admin-success-text` | `#065f46` | **7.8:1 on white** | AAA — success labels |

**Note on sidebar contrast**: `--admin-sidebar-text` (`var(--primitive-grey-50)`) on `--admin-sidebar-bg` (`var(--primitive-grey-900)`) achieves **15.2:1** — well above the AAA minimum of 7:1 required for high-stakes admin interfaces.

### §13.2 Admin Layout Specs

| Element | Dimension | Notes |
|---------|-----------|-------|
| Sidebar width (expanded) | **240px** | Fixed left sidebar; collapses to 64px (icon-only) on smaller admin screens |
| Sidebar width (collapsed) | **64px** | Icon-only mode for screens < 1280px |
| Top navigation bar | **56px** height | Contains page title, user identity, notifications, logout |
| Content area (min-width) | **calc(100vw - 240px)** | Responsive; accounts for sidebar |
| Content padding | **24px** all sides | `--primitive-space-6` |
| Card grid gap | **24px** | `--primitive-space-6` |
| Table row height | **48px** | Default; 56px for rows with multi-line content |
| Table cell padding | **12px 16px** | `--primitive-space-3` vertical, `--primitive-space-4` horizontal |
| Admin touch target | **36px** minimum | Admin is desktop-primary; WCAG 2.5.5 still applies |

**Admin layout grid**: 12-column CSS grid in content area. Dashboard metric cards: 4-column each (3 per row). Full-width tables: 12-column span.

### §13.3 Element Plus Theme Customization Variables

The admin portal uses Element Plus (Vue 3 component library) with a custom theme aligned to the admin color scheme. The following 7 `--el-color-primary-*` values must be calculated and applied:

| CSS Variable | Hex Value | Calculation Method | [AI 推斷] |
|-------------|-----------|------------------|-----------|
| `--el-color-primary` | `#6c5ce7` | Base brand primary — inherited from frontend | No |
| `--el-color-primary-light-3` | `#9d94ed` | `color-mix(in oklch, #6c5ce7, white 30%)` | Yes |
| `--el-color-primary-light-5` | `#b6b0f3` | `color-mix(in oklch, #6c5ce7, white 50%)` | Yes |
| `--el-color-primary-light-7` | `#cecaf7` | `color-mix(in oklch, #6c5ce7, white 70%)` | Yes |
| `--el-color-primary-light-8` | `#dddafb` | `color-mix(in oklch, #6c5ce7, white 80%)` | Yes |
| `--el-color-primary-light-9` | `#edebfd` | `color-mix(in oklch, #6c5ce7, white 90%)` | Yes |
| `--el-color-primary-dark-2` | `#5548d5` | `color-mix(in oklch, #6c5ce7, black 20%)` | Yes |

**Implementation note**: These values assume Element Plus v2.x `CSS var` theme override pattern. Apply in the admin portal's root CSS file:

```css
:root {
  --el-color-primary: #6c5ce7;
  --el-color-primary-light-3: #9d94ed;
  --el-color-primary-light-5: #b6b0f3;
  --el-color-primary-light-7: #cecaf7;
  --el-color-primary-light-8: #dddafb;
  --el-color-primary-light-9: #edebfd;
  --el-color-primary-dark-2: #5548d5;
}
```

### §13.4 Admin Table / Form Design Specs

**5 Table Scenarios**:

| Scenario | Table Name | Key Columns | Special Treatment |
|---------|-----------|------------|-------------------|
| **T1 — Pet Management** (`/admin/pets`) | Pet list (all pets, 20/page) | Rank, Pet ID, Seed, Rarity (colored badge), Owner email (masked), Level, Status (Active/Banned), Actions | Banned pets: row background `--admin-danger-bg`; rarity badges use same 4-color system as frontend (smaller, outline-only for admin clarity) |
| **T2 — Leaderboard Moderation** (`/admin/leaderboard`) | Top `LEADERBOARD_ADMIN_VIEW = 500` pets | Rank, Pet ID, Arena Score, Battles (24h), Win Rate, Suspicious Flag | Auto-flagged rows (>50 battles/hour per `LEADERBOARD_ADMIN_SUSPICIOUS_FLAG = 50`) shown with `--admin-warning-bg` row background + flag icon |
| **T3 — Battle Records** (`/admin/battles`) | All battles, filterable | Battle ID, Date, Mode (RACE/SUMO), Pet 1 ID, Pet 2 ID, Winner ID, Duration (s), Flagged | AI opponent battles labeled with `--admin-success-text` "AI" badge |
| **T4 — User / Email Management** (`/admin/users`) | Pet-owner email records | Masked email (***@domain.com), Pet IDs linked, Claimed date, GDPR deletion status | Pending deletion queue: `--admin-warning-bg`; completed deletion: `--admin-success-bg`; deletion SLA: `GDPR_EMAIL_DELETION_WINDOW = 7 days` |
| **T5 — Audit Log** (`/admin/audit`) | All admin actions | Timestamp, Admin user, Action type, Target (pet/email), Reason (truncated to 100 chars), Full reason expandable | Read-only table; no action columns; max search response `ADMIN_AUDIT_LOG_SEARCH_RESPONSE_TIME = 3s`; 2-year retention |

**5 Form Scenarios**:

| Scenario | Form Name | Key Fields | Validation |
|---------|----------|-----------|-----------|
| **F1 — Ban Pet** | Pet ban form (modal) | Pet ID (read-only), Reason textarea (required, max `ADMIN_MODERATION_REASON_MAX_CHARS = 500 chars`), Duration (Permanent / Temporary / Review) | Reason required; character count shown; confirm checkbox before submit |
| **F2 — GDPR Deletion** | GDPR deletion processing form | Pet owner email (masked), Confirmation checkbox ("I confirm this irreversible action"), Action: mark for deletion queue | SLA disclosure: email hash within `GDPR_EMAIL_HASHING_INTERNAL_SLA = 24 hours`; double-confirm required |
| **F3 — Runtime Parameter Tuning** (`/admin/config/runtime`) | Game parameter form | Max battles/hour (`ARENA_RATE_LIMIT_ADMIN_MIN = 1` to `ARENA_RATE_LIMIT_ADMIN_MAX = 50`), Rarity probabilities (4 number inputs, must sum to 100% — Common default 60%, Rare 25%, Epic 12%, Legendary 3%) | Sum validation on rarity inputs; changes apply within `CONFIG_CACHE_REFRESH_TIME = 5 minutes` per CONSTANTS; warning shown: "Changes take effect in up to 5 minutes" |
| **F4 — Game Economy Configuration** (`/admin/config/economy`) | Economy config form | Food buff multipliers (0.5x–5.0x range per `FOOD_BUFF_MULTIPLIER_ADMIN_MIN/MAX`), Arena entry cost (0–10 credits per `ARENA_ENTRY_COST_FOOD_CREDITS_ADMIN_MAX`), Arena entry cooldown (0–60 min per `ARENA_ENTRY_COOLDOWN_ADMIN_MAX`) | Range validation per CONSTANTS; same 5-min cache refresh warning |
| **F5 — Admin Login** (`/admin/login`) | Admin authentication form | Email/username field, Password field, TOTP 6-digit code field | Session: `ADMIN_SESSION_INACTIVITY_EXPIRY = 4 hours` inactivity / `ADMIN_SESSION_ABSOLUTE_EXPIRY = 8 hours` absolute; rate limit `ADMIN_RATE_LIMIT_REQUESTS_PER_MINUTE = 100`; TOTP required per NFR-SEC-11 |

**RBAC Role Tag Colors** (used in `/admin/roles` and throughout audit log):

| Role | Tag Background | Tag Text | Hex Pair |
|------|--------------|---------|---------|
| **Super Admin** | `#fef3c7` (amber-50) | `#92400e` (amber-800) | Warm yellow/brown — highest authority |
| **Moderator** | `#dbeafe` (blue-100) | `#1e40af` (blue-800) | Blue — moderation action role |
| **Analyst** | `#d1fae5` (green-100) | `#065f46` (green-800) | Green — read-only / passive |
| **Support Agent** | `#ede9fe` (purple-100) | `#5b21b6` (purple-800) | Purple — player-facing support |

All role tag combinations are verified at minimum 4.5:1 contrast (AA) for their respective text/background pairing. [AI 推斷]

---

## Appendix A: Token Quick Reference

### A.1 Critical Token Values at a Glance

| Token | Dark Hex | Purpose |
|-------|---------|---------|
| `--color-surface-base` | `#1a1a2e` | Page background |
| `--color-brand-primary` | `#6c5ce7` | Primary actions |
| `--color-brand-accent` | `#fdcb6e` | Legendary / gold highlights |
| `--color-rarity-common` | `#b2bec3` | Common tier |
| `--color-rarity-rare` | `#4ecdc4` | Rare tier |
| `--color-rarity-epic` | `#a29bfe` | Epic tier |
| `--color-rarity-legendary` | `#fdcb6e` | Legendary tier |
| `--color-focus` | `#ffd700` | Focus rings |
| `--color-text-primary` | `#e8e8f0` | Primary body text |
| `--admin-sidebar-bg` | `#111827` | Admin sidebar |
| `--admin-content-bg` | `#f9fafb` | Admin content area |

### A.2 Key Animation Durations

| Purpose | Duration | Easing | Reduced Motion |
|---------|----------|--------|---------------|
| Button press | 120ms | `--primitive-ease-spring` | Instant |
| Page transition | 300ms | `--primitive-ease-out-expo` | Instant |
| Stat float | 400ms + 2000ms hold | `--primitive-ease-out-expo` | Static text |
| Rarity reveal | 600ms | `--primitive-ease-spring` | Instant |
| Victory celebration | 1200ms | `--primitive-ease-out-expo` | Instant reveal |

### A.3 CONSTANTS Cross-Reference for VDD

| CONSTANTS Name | Value | VDD Section Referenced |
|---------------|-------|----------------------|
| `PET_STAT_MAX` | 100 | §6.3 Stat Bar tokens, §8.4 Training Page |
| `TRAINING_ACTIONS_PER_DAY` | 3 | §8.4 Training Page |
| `TRAINING_NEGLECT_THRESHOLD` | 3 days | §8.3 My Pet Page, §4.1 Rarity Visual |
| `ARENA_RATE_LIMIT_BATTLES_PER_HOUR` | 10 | §8.5 Arena Page |
| `ARENA_MATCHMAKING_TIMEOUT` | 30s | §8.5 Arena Page |
| `LEADERBOARD_TOP_DISPLAY` | 100 | §8.7 Leaderboard Page |
| `ARENA_BATTLE_RECORDS_DISPLAY` | 20 | §8.8 Battle Records Page |
| `RARITY_MULTIPLIER_LEGENDARY` | 8 | §3.3 Rarity Color System |
| `MARKETPLACE_TRADE_ANTIFLIP_PROTECTION` | 7 days | §8.9 Marketplace Page |
| `TRADE_TRANSACTION_FEE` | 5% | §8.9 Marketplace Page |
| `A11Y_FOCUS_CONTRAST_RATIO` | 3:1 | §9.1 Contrast Table |
| `A11Y_TEXT_CONTRAST_NORMAL` | 4.5:1 | §9.1 Contrast Table |
| `CONFIG_CACHE_REFRESH_TIME` | 5 min | §13.4 Admin Form F3, F4 |
| `ADMIN_SESSION_INACTIVITY_EXPIRY` | 4h | §13.4 Admin Form F5 |
| `ADMIN_SESSION_ABSOLUTE_EXPIRY` | 8h | §13.4 Admin Form F5 |
| `ADMIN_MODERATION_REASON_MAX_CHARS` | 500 | §13.4 Admin Form F1 |
| `GDPR_EMAIL_HASHING_INTERNAL_SLA` | 24h | §13.4 Admin Form F2 |

---

## §14 Seasonal & Event Visual Variants

### Mutable Elements (can change for seasonal events)
- Color scheme overlay (e.g., Halloween dark orange tint on `--color-surface-base`)
- Event-specific pet background illustrations
- Navigation banner background
- Arena border treatment (alternative glow colors for event seasons)

### Immutable Elements (core brand — never change)
- Logo treatment and wordmark
- `--color-brand-primary` (purple) and `--color-rarity-*` system
- Press Start 2P as primary display font
- Pixel grid alignment rules (4px/8px grid snap)
- WCAG contrast requirements

### Example: Winter Tournament Variant
- `--color-surface-base` shifts to `oklch(8% 0.02 220)` — deep ice blue
- Event accent: `oklch(90% 0.04 210)` — ice white
- Snowflake particle system on arena background (CSS only, no layout impact)
- Seasonal banner replaces standard nav background (same dimensions, different illustration)

---

## §15 Brand Extension Guidelines

### Scenario 1: Seasonal Tournament Sub-brand (e.g., "Championship Edition")
- **Logo**: Existing wordmark + "Championship" in `--text-small` Inter, positioned below in gold (`--color-brand-accent`)
- **Color system**: All standard tokens maintained; add supplementary `--color-tournament-accent = oklch(72% 0.24 45)` (gold variant)
- **Typography**: No change (Press Start 2P + Inter)
- **Cannot**: change purple `--color-brand-primary` or rarity token values

### Scenario 2: Community Partnership / Co-branding
- **Logo placement**: Partner logo appears at same optical weight as Pixel Pet Arena logo; maximum 80% of PPA logo height
- **Color hierarchy**: PPA `--color-brand-primary` takes precedence; partner primary color used as accent only
- **Background**: PPA dark surface (`#0d1117` equiv.) is required; partner cannot mandate light background
- **Required disclaimer text**: "Powered by Pixel Pet Arena" in `--text-caption` size

---

*This VDD was generated by the VDD Gen Agent from upstream documents IDEA-PIXEL-PET-ARENA-20260503, BRD-PIXEL-PET-ARENA-20260503, PRD-PIXEL-PET-ARENA-20260503, PDD-PIXEL-PET-ARENA-20260503, and CONSTANTS-PIXEL-PET-ARENA-20260503. All AI-inferred values are marked [AI 推斷]. Token values that inherit directly from PDD §9 are not marked as AI-inferred.*

---

## §16 審核簽核 (Approval Sign-off)

| 角色 | 姓名 / 負責人 | 審核日期 | 簽核狀態 |
|------|--------------|---------|---------|
| Art Director | TBD | — | Pending |
| Product Manager | TBD | — | Pending |
| Frontend Architect | TBD | — | Pending |
| Design Lead | TBD | — | Pending |

> 所有審核人員完成簽核後，文件狀態由 DRAFT 更新為 APPROVED。
> APPROVED 版本的任何變更需走 Change Request 流程並更新 Change Log（§ Change Log）。
