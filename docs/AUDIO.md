# AUDIO — Audio Design and Implementation Guide

**DOC-ID**: AUDIO-PIXEL-PET-ARENA-20260503
**Project**: pixel-pet-arena
**Version**: v1.0
**Status**: DRAFT
**Author**: AI Generated (gendoc audio)
**Date**: 2026-05-03
**Upstream**: EDD-PIXEL-PET-ARENA-20260503, ARCH-PIXEL-PET-ARENA-20260503, PRD-PIXEL-PET-ARENA-20260503, CONSTANTS-PIXEL-PET-ARENA-20260503

---

## §1. Overview

### §1.1 Audio Design Goals and Strategy

The pixel-pet-arena audio system is designed to enhance player engagement through contextual sound effects and optional BGM, supporting a casual browser-based gaming experience. The audio strategy prioritizes:

1. **Minimal cognitive load**: Short, recognizable sound effects (≤500ms duration) that provide feedback without interrupting gameplay
2. **Accessibility-first**: All sound effects have equivalent visual/haptic feedback; audio is entirely optional
3. **Performance within budget**: Total audio assets ≤ 2 MB (uncompressed reference; delivered as MP3 at 128 kbps ≈ 400 KB total)
4. **Web Audio API integration**: Browser-native playback with Phaser.js 3 audio system as the rendering engine
5. **Cross-browser compatibility**: Graceful fallback for audio-unavailable browsers (muted experience remains fully playable)

### §1.2 Audio Engine Selection

**Primary Engine**: Web Audio API via Phaser.js 3 Audio System

Rationale:
- Phaser.js 3 (selected in ARCH §3.3, EDD §4 technology stack) provides battle-tested audio playback, mixing, and spatial audio capabilities (35k+ GitHub stars, extensive community support)
- Web Audio API is natively supported in all modern browsers (Chrome 14+, Firefox 25+, Safari 6+, Edge 79+) with fallback to HTML5 Audio for older browsers
- Phaser handles audio pooling, preventing memory leaks from repeated audio instantiation
- Audio loading occurs asynchronously during the Phaser scene initialization to prevent blocking the main thread
- No external audio library (Tone.js, Howler.js) required; Phaser's built-in system satisfies MVP requirements

**Fallback Path**: If Web Audio API is unavailable, Phaser degrades to HTML5 Audio element playback (browser default <audio> tag). If audio permission is revoked or unavailable, the game continues without sound; the UI remains fully playable.

---

## §2. Audio Requirements Analysis

### §2.1 Core Game Audio Needs

The following game events require audio feedback per PRD §5 US-PET-001 and related acceptance criteria:

| Event | Purpose | Example Behavior | Duration | Priority |
|-------|---------|------------------|----------|----------|
| **Pet Interaction** (tap/click) | Player confirms pet received input | "Bleep" or "pop" tone when pet animates (AC-001-2: wiggle/bounce/sound within 200ms) | 100–200 ms | P0 (required) |
| **Training Complete** | Confirms stat increase processed | Ascending musical note or success chime | 150–300 ms | P1 (required) |
| **Stat Increase Display** | Reinforces "+X Speed" visual feedback | Subtle "ding" or sparkle sound | 100–200 ms | P1 (required) |
| **Arena Match Start** | Signals battle entry | Drum hit or fanfare sting | 200–400 ms | P1 (required) |
| **Arena Match Victory** | Confirms player win | Triumphant musical phrase | 400–800 ms | P1 (required) |
| **Arena Match Defeat** | Confirms player loss | Descending musical phrase or sad trombone variant | 300–600 ms | P1 (required) |
| **Leaderboard Rank Up** | Celebrates improved standing | Ascending melody with harmony (400–600 ms) | 400–600 ms | P2 (enhancement) |
| **Claim Code Sent** | Confirms email delivery | Success tone (similar to training complete) | 150–300 ms | P1 (required) |
| **Rate Limit Breach** | Alerts player to cooldown | Warning buzz or beep (fail tone) | 200–300 ms | P2 (accessibility) |
| **Food Buff Applied** | Confirms temporary boost active | Shimmering or magical tone | 150–250 ms | P2 (enhancement) |
| **Background Loop** (optional) | Ambient/gameplay music | Looping 30–60 second instrumental | 30–60 sec loop | P3 (polish) |

**Total Audio Seconds (P0 + P1)**: ~5 seconds of unique sound effects. With looping battle theme (P3), additional 30–60 seconds of music optional.

### §2.2 Audio Classification by Context

**Effect Sounds (SFX)**:
- **Interaction feedback** (pet tap, button click): 8–12 effects (e.g., pop, bleep, click variants)
- **Game state transitions** (arena start, match result): 4–6 effects (fanfare, victory, defeat, neutral)
- **Stat feedback** (training, training complete): 4–6 effects (ascending notes, success tones, ding variants)
- **System feedback** (rate limit, claim email): 2–4 effects (warning, alert, confirmation)

**Ambiance / Background**:
- **Arena battle theme** (looping): 1 × 30–60 second instrumental (optional, P3)
- **Trainer mode background** (optional, P3): Lighter, calming loop for non-battle context

**Accessibility Alternatives**:
- All sound effects accompanied by visual feedback (animation, toast notification, badge)
- No critical game state information conveyed *only* via audio
- UI includes audio toggle and volume controls (§5.5)

### §2.3 Platform Considerations

**Web / Desktop Browsers**:
- Web Audio API fully supported; modern browser audio processing near real-time
- Speakers/headphones expected; spatial audio (panning, reverb) available but not required for MVP
- CPU impact: <5% CPU per concurrent audio playback under Phaser 3 pooling (EDD testing constraint)

**Mobile Devices** (iOS/Android via Mobile Safari, Chrome):
- **iOS (Safari)**: Web Audio API supported; audio playback requires user gesture (tap/click to unmute per Apple policy). Phaser handles gesture-based audio initialization automatically.
- **Android (Chrome, Firefox)**: Full Web Audio API support; no gesture requirement
- **Audio Permission**: Both iOS and Android require the microphone permission prompt only if using microphone input; output-only (speaker) audio does not require explicit permission
- **Device Audio State**: If device is in silent/mute mode:
  - iOS: Respects silent switch; output audio muted unless app is configured as AVAudioSessionCategoryPlayback (Phaser does not override)
  - Android: App can play audio regardless of system mute setting (app-level mute available in OS settings)
- **CPU / Battery Impact**: Small, short-duration sounds (≤300ms) have negligible battery drain on modern mobile
- **Network**: Audio assets loaded over HTTPS; no streaming required for MVP (all effects preloaded in scene initialization)

**Reduced Motion** (OS-level accessibility setting):
- Per ARCH §2.1 accessibility (PRD §18 A11y-05), `prefers-reduced-motion: reduce` suppresses animations
- When reduced motion is enabled, **audio effects continue to play** (audio does not carry motion semantics and is not suppressed)
- Alternative: Provide a separate "disable all audio" toggle in settings (§5.5)

---

## §3. Audio Resources Planning

### §3.1 Sound Effects Inventory

**Table: Planned SFX by Game Event**

| Event | File Name | Format | Duration (ms) | Sample Rate | Bit Depth | File Size (MP3 128kbps) | Notes |
|-------|-----------|--------|---------------|-------------|-----------|------------------------|-------|
| **Interaction 1** | pet-tap-pop.mp3 | MP3 | 120 | 44.1 kHz | 16-bit | 18 KB | Bright pop/beep for pet click feedback |
| **Interaction 2** | pet-tap-click.mp3 | MP3 | 100 | 44.1 kHz | 16-bit | 16 KB | Subtler click for UI interactions |
| **Training Start** | training-start.mp3 | MP3 | 150 | 44.1 kHz | 16-bit | 24 KB | Brief ascending tone indicating action begin |
| **Training Complete** | training-success.mp3 | MP3 | 200 | 44.1 kHz | 16-bit | 32 KB | Triumphant chime confirming stat increase |
| **Stat Increase** | stat-ding.mp3 | MP3 | 100 | 44.1 kHz | 16-bit | 16 KB | Short "ding" for "+X Speed" display |
| **Arena Start** | arena-start.mp3 | MP3 | 300 | 44.1 kHz | 16-bit | 48 KB | Drum hit / fanfare sting |
| **Arena Victory** | arena-victory.mp3 | MP3 | 600 | 44.1 kHz | 16-bit | 96 KB | Ascending triumphant phrase (800ms max per ARENA_MATCH_DURATION_MAX_SECONDS = 15s buffer) |
| **Arena Defeat** | arena-defeat.mp3 | MP3 | 400 | 44.1 kHz | 16-bit | 64 KB | Descending minor phrase / sad trombone variant |
| **Claim Email Sent** | claim-success.mp3 | MP3 | 180 | 44.1 kHz | 16-bit | 28 KB | Reassuring success tone |
| **Rate Limit Alert** | rate-limit-warning.mp3 | MP3 | 250 | 44.1 kHz | 16-bit | 40 KB | Warning buzz indicating cooldown active |
| **Leaderboard Rank Up** | leaderboard-rankup.mp3 | MP3 | 500 | 44.1 kHz | 16-bit | 80 KB | Ascending melody celebrating rank improvement (P2 feature) |
| **Food Buff Applied** | food-buff.mp3 | MP3 | 200 | 44.1 kHz | 16-bit | 32 KB | Shimmering magical tone |

**Total P0+P1 SFX**: 12 × ~30 KB average ≈ **360 KB** (MP3 @ 128 kbps)

### §3.2 BGM (Background Music) (Optional P3)

| Track | Type | Duration | BPM | Sample Rate | Format | File Size (MP3 128kbps) | Notes |
|-------|------|----------|-----|-------------|--------|------------------------|-------|
| **Arena Battle Loop** | BGM (looping) | 45 sec | 130 BPM | 44.1 kHz | MP3 | 90 KB | Instrumental, no vocals; loopable at 45s with seamless cut points |
| **Trainer Mode Ambient** | BGM (looping) | 60 sec | 80 BPM | 44.1 kHz | MP3 | 120 KB | Calming loop for training/pet management (P3 polish) |

**Total Music**: 2 × ~100 KB ≈ **210 KB**

### §3.3 Total Audio Resource Budget

| Category | Count | Total Size (MP3) |
|----------|-------|------------------|
| SFX (P0+P1) | 12 effects | 360 KB |
| Music (P3 optional) | 2 tracks | 210 KB |
| **Total Planned** | 14 assets | **570 KB** |
| **Total Budget Allocated** | — | **2 MB** |
| **Headroom** | — | 1.43 MB (71.5% unused) |

**Rationale for 2 MB budget**:
- Phaser.js dynamically imports audio system on demand (no blocking the claim flow bundle)
- Audio assets loaded asynchronously in background; no impact on FCP / LCP targets (ARCH §2.1 FCP < 1.5s, LCP < 2.5s)
- Total app JS bundle ≤ 300 KB (TOTAL_JS_BUNDLE_GZIPPED_KB); audio assets separate from code bundle
- Headroom allows for future sound variants, voiceover additions (P4+), or higher-fidelity music

---

## §4. Engine and Implementation

### §4.1 Web Audio API Architecture

**Phaser.js 3 Audio System Integration**:

Phaser.js 3 abstracts Web Audio API complexity and provides:
- **Audio pooling**: Reuses audio instances to avoid memory leaks
- **Volume and pan control**: Per-sound and global mixer
- **Playback state management**: Play, pause, stop, loop
- **Event emitters**: Sound complete, sound loop, volume change events
- **Fallback handling**: Automatic downgrade to HTML5 Audio if Web Audio unavailable

**Code Architecture (TypeScript pseudocode)**:

```typescript
// In PetCanvasEngine (Phaser.js scene)
class PetCanvasEngine extends Phaser.Scene {
  preload() {
    // Load audio assets asynchronously
    this.load.audio('pet-tap-pop', 'assets/audio/pet-tap-pop.mp3');
    this.load.audio('training-success', 'assets/audio/training-success.mp3');
    this.load.audio('arena-victory', 'assets/audio/arena-victory.mp3');
    // ... load remaining SFX
  }

  create() {
    // Initialize audio system after preload
    this.sound.unlock(); // Handle iOS gesture-based audio unlock
    this.createAudioPool();
  }

  playSound(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    // Volume defaults to global mixer setting
    // Phaser pools identical sounds to prevent concurrent playback overlap
    this.sound.play(key, { volume: this.audioVolume * 0.8 });
  }
}

// React bridge layer (PetCanvasEngine React component)
export function usePetAudioEvent(eventType: string): void {
  const phaserScene = usePhaserScene(); // From context
  
  useEffect(() => {
    const handler = () => {
      phaserScene.playSound(getAudioKeyForEvent(eventType));
    };
    
    eventEmitter.on(eventType, handler);
    return () => eventEmitter.off(eventType, handler);
  }, [eventType, phaserScene]);
}
```

**Event Bridge Pattern**:
- React components emit events (e.g., `training:complete`) via an event emitter
- `PetCanvasEngine` listens and triggers corresponding audio via Phaser's sound manager
- Keeps Phaser isolated from React state management (per ARCH §3.3 isolation rule)

### §4.2 Cross-Browser Compatibility

**Browser Audio Support Matrix**:

| Browser | Web Audio API | HTML5 Audio | Fallback Strategy | Minimum Version |
|---------|---------------|-------------|-------------------|-----------------|
| Chrome | ✅ Full | ✅ Full | Web Audio primary | 14+ (2012) |
| Firefox | ✅ Full | ✅ Full | Web Audio primary | 25+ (2013) |
| Safari (macOS) | ✅ Full | ✅ Full | Web Audio primary | 6+ (2012) |
| Safari (iOS) | ✅ Full* | ✅ Full | Web Audio (requires gesture) | 6+ (2012) |
| Edge | ✅ Full | ✅ Full | Web Audio primary | 79+ (Chromium) |
| Chrome Mobile | ✅ Full | ✅ Full | Web Audio primary | 18+ |
| Firefox Mobile | ✅ Full | ✅ Full | Web Audio primary | 25+ |

*iOS Safari: Requires user gesture (tap/click) to unlock audio context per Apple policy. Phaser.js automatically detects and calls `audioContext.resume()` on first user interaction.

**Audio Format Support**:

| Format | MIME Type | Support | Recommendation |
|--------|-----------|---------|-----------------|
| MP3 | audio/mpeg | ✅ Universal | Primary format (128 kbps sufficient for SFX) |
| OGG | audio/ogg | ✅ Chrome, Firefox, Edge | Secondary fallback for older Firefox |
| WebM | audio/webm | ✅ Chrome, Edge | Alternative for size optimization (future) |
| WAV | audio/wav | ✅ All | Uncompressed; too large for MVP |
| FLAC | audio/flac | ❌ Safari | Not supported; skip |

**Phaser Load Strategy**:
```typescript
// Phaser multi-format fallback
this.load.audio('pet-tap-pop', [
  'assets/audio/pet-tap-pop.mp3',  // Primary
  'assets/audio/pet-tap-pop.ogg'   // Fallback (if MP3 not supported)
]);
```

### §4.3 Performance and CPU Budget

**Audio Processing Budget** (from EDD §10.2 infrastructure constraints):

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Per-sound CPU impact** | < 0.5% | At 100 RPS game load; minimal decode overhead |
| **Concurrent audio instances** | ≤ 4 simultaneous | Phaser pooling limits per-scene active sounds |
| **Audio load time** | ≤ 100 ms | Async preload during scene initialization |
| **Audio memory per effect** | ≤ 500 KB (decoded) | Phaser uses internal buffer pooling |
| **Total audio system RAM** | ≤ 10 MB | Includes preloaded sounds + Web Audio context buffers |

**Phaser Audio Pooling** (automatic optimization):

```typescript
// Phaser automatically reuses sound instances
// Example: pet-tap-pop plays 6× per second max (mobile tap rate)
// Phaser maintains 1 pooled instance + optional 2-3 additional instances
// No new object allocations per playback
```

**Memory-Efficient Design**:
- Audio decoded on load (not on-demand); stored in Web Audio internal buffers
- Phaser reuses buffers across multiple sound triggers
- No memory leaks from event listeners (using `removeListener` or weak references)

---

## §5. Implementation Strategy

### §5.1 Audio Loading and Initialization Flow

**Phase 1: Player App Root Load** (no audio yet)

```
App.tsx
  └── Layout
        └── Router
              └── LandingPage (displays guest pet via PetCanvasEngine)
                    └── PetCanvasEngine (Phaser scene)
                          │
                          ├── preload() — async load all SFX (MP3)
                          │     ├── pet-tap-pop.mp3
                          │     ├── training-success.mp3
                          │     └── ... (all P0+P1 effects)
                          │
                          ├── create() — initialize Web Audio context
                          │     ├── this.sound.unlock() (iOS gesture handling)
                          │     └── setupAudioMixer()
                          │
                          └── ready — emit 'audio:loaded' event
```

**Timing**:
- Preload occurs **after** scene initialization but **before** create() (Phaser lifecycle)
- Assets load asynchronously; doesn't block FCP / LCP (ARCH §2.1 performance targets)
- If audio assets fail to load (network error): Phaser emits error event; game continues without audio (degraded, not broken)

### §5.2 Real-Time Sound Playback Control

**Game Event → Audio Trigger Pipeline**:

```
User Action (click pet, complete training, win arena battle)
  │
  └─→ React Component (e.g., TrainingEntry)
        │
        └─→ Emit event: eventEmitter.emit('training:complete', { statType: 'speed', amount: +2 })
              │
              └─→ useAudioEvent hook (in PetCanvasEngine subscription)
                    │
                    └─→ this.sound.play('training-success', { volume: 0.7 })
                          │
                          └─→ Web Audio API decodes and plays MP3 buffer
                                │
                                └─→ 200 ms audio + visual feedback visible simultaneously
```

**Key Events Mapped to Audio**:

| React Event | Audio Trigger | SFX File | Delay | Duration |
|-------------|---------------|----------|-------|----------|
| `pet:tap` | Pet interaction feedback | pet-tap-pop.mp3 | 0 ms (immediate) | 120 ms |
| `ui:button-click` | UI button click feedback | pet-tap-click.mp3 | 0 ms (immediate) | 100 ms |
| `training:start` | Action button clicked | training-start.mp3 | 0 ms | 150 ms |
| `training:complete` | Stat increase confirmed | training-success.mp3 | 0 ms | 200 ms |
| `stat:display` | "+X Speed" toast appears | stat-ding.mp3 | 100 ms (with animation) | 100 ms |
| `arena:start` | Match animation begins | arena-start.mp3 | 0 ms (battle intro) | 300 ms |
| `arena:victory` | Victory result displayed | arena-victory.mp3 | 400 ms (after animation) | 600 ms |
| `arena:defeat` | Defeat result displayed | arena-defeat.mp3 | 400 ms (after animation) | 400 ms |
| `leaderboard:rankup` | Rank position improved | leaderboard-rankup.mp3 | 200 ms (celebration) | 500 ms |
| `claim:email-sent` | OTP email confirmed sent | claim-success.mp3 | 0 ms | 180 ms |
| `rate-limit:breach` | Rate limit message shown | rate-limit-warning.mp3 | 0 ms (alert) | 250 ms |
| `food-buff:applied` | Buff active badge shown | food-buff.mp3 | 0 ms | 200 ms |

**Concurrency Rules**:
- **Training complete + stat ding**: Both play (200 ms + 100 ms sequentially, not overlapping)
- **Arena victory + leaderboard rankup**: Victory plays first (600 ms), then rankup plays at +400 ms offset (P2 feature, can overlap slightly)
- **Rate limit alert + other SFX**: Alert tone takes priority; other sounds suppress via volume ducking (80% volume when alert active)

### §5.3 Audio Mixing and Volume Management

**Global Volume Control**:

```typescript
// In PetCanvasEngine
export class AudioMixer {
  private masterVolume: number = 0.7; // Default 70%
  private sfxVolume: number = 0.8; // SFX 80% of master
  private musicVolume: number = 0.5; // Music 50% of master

  setMasterVolume(level: 0–1): void {
    this.masterVolume = Math.max(0, Math.min(1, level));
    this.sound.volume = this.masterVolume;
  }

  playSFX(key: string): void {
    this.sound.play(key, { volume: this.masterVolume * this.sfxVolume });
  }

  playMusic(key: string): void {
    this.sound.play(key, { 
      volume: this.masterVolume * this.musicVolume,
      loop: true
    });
  }
}
```

**Volume Ducking** (dynamic mixing):
- When alert sound (rate-limit-warning.mp3) plays: reduce background music volume to 30% temporarily
- Resume normal music volume 250 ms after alert ends
- Prevents competing audio from drowning out critical feedback

**Device Volume Behavior**:
- Web Audio API respects system volume on desktop (no app-level override)
- Mobile: App-level volume slider in UI overrides system mute setting (optional implementation; MVP can default to respecting system mute)

### §5.4 Accessibility and Inclusion Considerations

**Visual Equivalents** (all SFX have visual counterparts):

| Audio Cue | Visual Equivalent | Method |
|-----------|-------------------|--------|
| pet-tap-pop | Pet animation (wiggle/bounce) + particle effect | Phaser sprite animation |
| training-success | "+X Speed" toast + badge highlight | React Toast component |
| stat-ding | Floating number animation | Phaser tween |
| arena-victory | Victory card (gold border, confetti) | CSS animation + Phaser particles |
| arena-defeat | Defeat card (gray border) | CSS animation |
| rate-limit-warning | Error toast + orange border highlight | React Toast + CSS |
| leaderboard-rankup | Rank position badge update + color pulse | React state + CSS animation |

**User Controls** (§5.5):
- **Audio toggle**: On/off switch in Settings modal
- **Volume slider**: 0–100% control for master volume
- **Individual channel control**: Optional (SFX vs. Music sliders)
- **Mute when minimized**: Optional (pause audio when tab loses focus via Page Visibility API)

**Testing for Accessibility**:
1. Disable audio in browser settings; verify game is fully playable
2. Test with screen reader (NVDA, JAWS); verify all UI interactions have keyboard equivalents
3. Test `prefers-reduced-motion` OS setting; verify animations reduce but audio continues (or user can disable via toggle)

### §5.5 Audio Settings UI

**Settings Panel** (new section in SettingsModal component):

```tsx
// SettingsModal.tsx — Audio Settings section
<div className="settings-audio">
  <h3>Audio Settings</h3>
  
  <div className="audio-toggle">
    <label>
      <input 
        type="checkbox" 
        checked={audioEnabled} 
        onChange={(e) => setAudioEnabled(e.target.checked)} 
      />
      <span>Enable Audio</span>
    </label>
  </div>

  <div className="audio-volume">
    <label htmlFor="master-volume">Master Volume</label>
    <input 
      id="master-volume"
      type="range" 
      min="0" 
      max="100" 
      value={masterVolume} 
      onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
      aria-label="Master volume slider"
    />
    <span>{masterVolume}%</span>
  </div>

  <details>
    <summary>Advanced Audio Settings</summary>
    <div className="audio-advanced">
      <label htmlFor="sfx-volume">Sound Effects Volume</label>
      <input 
        id="sfx-volume"
        type="range" 
        min="0" 
        max="100" 
        value={sfxVolume * 100} 
        onChange={(e) => setSFXVolume(Number(e.target.value) / 100)}
      />
      
      <label htmlFor="music-volume">BGM Volume</label>
      <input 
        id="music-volume"
        type="range" 
        min="0" 
        max="100" 
        value={musicVolume * 100} 
        onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
      />
    </div>
  </details>
</div>
```

**Persistence**: Audio settings stored in Zustand client state (ARCH §2.1 state management); survives page refresh via browser localStorage integration.

---

## §6. Operational and Quality Standards

### §6.1 Audio File Naming and Organization

**Directory Structure**:

```
packages/player-app/
├── public/
│   └── assets/
│       └── audio/
│           ├── sfx/
│           │   ├── pet-tap-pop.mp3
│           │   ├── pet-tap-click.mp3
│           │   ├── training-success.mp3
│           │   ├── arena-victory.mp3
│           │   ├── arena-defeat.mp3
│           │   ├── claim-success.mp3
│           │   ├── rate-limit-warning.mp3
│           │   ├── stat-ding.mp3
│           │   ├── food-buff.mp3
│           │   ├── leaderboard-rankup.mp3
│           │   ├── arena-start.mp3
│           │   ├── training-start.mp3
│           │   └── README.md (attribution, licensing)
│           └── music/
│               ├── arena-battle-loop.mp3
│               └── trainer-ambient-loop.mp3
```

**Naming Convention**: `{event-category}-{specific-event}-{variant}.{ext}`
- Example: `pet-tap-pop.mp3` (category: pet, event: tap, variant: pop effect)
- All lowercase, hyphen-separated, no spaces

**File Metadata** (MP3 tags):
- Title: "pixel-pet-arena: {event name}"
- Artist: "Audio Design Team"
- Album: "pixel-pet-arena SFX"
- Comment: "{PRD requirement reference, e.g., AC-001-2}"

### §6.2 Audio Quality Standards

**Production Specifications**:

| Parameter | Specification | Rationale |
|-----------|---------------|-----------|
| **Codec** | MP3 (MPEG-1 Layer III) | Universal browser support; 128 kbps sufficient for SFX |
| **Bit Rate** | 128 kbps (SFX), 192 kbps (music) | Transparent quality for SFX; music at 192 kbps maintains fidelity |
| **Sample Rate** | 44.1 kHz (standard) | Industry standard for web audio; no benefit to 48 kHz for SFX |
| **Bit Depth** | 16-bit (master) | CD-quality source; no ultra-HD audio needed for SFX |
| **Mono vs. Stereo** | Mono for SFX, Stereo for music | SFX mono = smaller files; music stereo = richer background loops |
| **Loudness** | –14 LUFS (SFX), –18 LUFS (music) | Consistent perceived volume across all effects; prevents surprise loud sounds |
| **Peak Levels** | –6 dB FS (headroom) | Prevents distortion in Web Audio API mixing |
| **Duration** | ≤600 ms (SFX), ≤60 sec (music) | Shorter = faster loading, lower memory footprint |

**Frequency Content**:
- **SFX**: High-pass filter at 100 Hz (removes inaudible rumble); keep presence peaks 2–8 kHz
- **Music**: Full-range 20 Hz – 20 kHz (background ambiance)
- **Avoid**: Harsh digital artifacts, metallic ringing (associated with Web Audio clipping)

### §6.3 Testing and Validation

**Audio Playback Test Cases**:

| Test Case | Scenario | Expected Result | Test Type |
|-----------|----------|-----------------|-----------|
| **T-AUDIO-001** | Play pet-tap-pop effect 10× in rapid succession | All 10 sounds play; no overlap/cutoff; no memory leak | Unit |
| **T-AUDIO-002** | Play training-success while stat-ding plays | Both audible; no distortion from mixing | Integration |
| **T-AUDIO-003** | Disable Web Audio API (dev tools); attempt play | Fallback to HTML5 Audio; game continues | Cross-browser |
| **T-AUDIO-004** | Audio toggle off in settings; trigger events | No sounds play; visual feedback still shows | Unit |
| **T-AUDIO-005** | Master volume at 0%; play all SFX | Sounds play but inaudible (silent); no errors | Unit |
| **T-AUDIO-006** | iOS Safari; load page; tap pet immediately | Audio plays within 200 ms (requires gesture unlock) | Mobile |
| **T-AUDIO-007** | Android Chrome; mute system volume; play SFX | SFX volume controlled by app slider (not system mute) | Mobile |
| **T-AUDIO-008** | Arena battle plays 5 victory SFX sequentially | All 5 play without overlap; duration ≤ 3 seconds total | Integration |
| **T-AUDIO-009** | Load player app on low-bandwidth (500 kbps) | Audio assets preload in background; don't block interaction | Performance |
| **T-AUDIO-010** | Memory profiler: play arena-victory 20× rapidly | Heap size increase < 2 MB (pooled instances, no GC churn) | Performance |

**Automation**:
- Audio file validation script (CI): Check MP3 format, bit rate, duration, loudness (per CONSTANTS)
- Phaser audio mock test: Verify sound.play() calls route through Phaser mixer

### §6.4 Browser Compatibility Verification

**Cross-Browser Manual Testing** (before GA):

| Browser | Version | Platform | Test: Play SFX | Test: Music Loop | Test: Fallback | Status |
|---------|---------|----------|--------|---------|--------|--------|
| Chrome | Latest | Desktop | ✅ Expected | ✅ Expected | N/A | REQUIRED |
| Firefox | Latest | Desktop | ✅ Expected | ✅ Expected | ✅ OGG fallback | REQUIRED |
| Safari | Latest | macOS | ✅ Expected | ✅ Expected | N/A | REQUIRED |
| Safari | Latest | iOS | ✅ (gesture) | ✅ (gesture) | N/A | REQUIRED |
| Edge | Latest | Desktop | ✅ Expected | ✅ Expected | N/A | REQUIRED |
| Chrome | Latest | Android | ✅ Expected | ✅ Expected | N/A | REQUIRED |

---

## §7. Risk Mitigation and Fallback Strategies

### §7.1 Audio System Failure Modes

| Failure Scenario | Impact | Mitigation |
|------------------|--------|-----------|
| **Web Audio API unavailable** | Browser lacks support (old IE, legacy Safari) | Fallback to HTML5 <audio> element; Phaser handles automatically |
| **Audio asset 404** | Network fetch fails | Error event logged; game continues silently; visual feedback shown |
| **iOS audio gesture lock** | User hasn't tapped screen yet; audio context locked | Phaser auto-unlock on first user gesture (tap/click); UI explains audio is muted until interaction |
| **System audio muted** | Device is on silent (iOS) or app volume muted | iOS respects system mute; Android respects app-level mute only; UI toggle overrides app setting |
| **Memory exhaustion** | Audio buffer too large for device | Phaser pooling prevents allocation; max 10 MB audio RAM allocated |
| **Audio glitch/pop** | Web Audio mixing artifact or browser bug | Increase headroom (–6 dB peak level); test across browsers |
| **Rate limit during audio load** | Network bandwidth exceeded | Audio loads asynchronously; doesn't block gameplay; graceful degradation |

### §7.2 Graceful Degradation

**Fallback Chain**:

1. **Tier 1**: Web Audio API + Phaser.js audio system
2. **Tier 2**: HTML5 <audio> element (fallback if Web Audio unavailable)
3. **Tier 3**: Silent mode (no audio; visual/haptic feedback only)

**Implementation**:

```typescript
export function getAudioEngine(): 'web-audio' | 'html5' | 'silent' {
  const audioContext = window.AudioContext || (window as any).webkitAudioContext;
  
  if (audioContext && Phaser.Sound.WebAudioSoundManager.isSupported) {
    return 'web-audio';
  } else if (HTMLAudioElement.prototype.play) {
    return 'html5';
  } else {
    return 'silent'; // No audio support; game continues
  }
}
```

---

## §8. Timeline and Phased Rollout

### §8.1 MVP (Phase 1-2) Audio Scope

**In Scope** (required for launch):
- 12 × SFX (P0+P1 effects): pet-tap-pop, pet-tap-click, training-success, arena-victory, arena-defeat, claim-success, rate-limit-warning, stat-ding, food-buff, leaderboard-rankup, arena-start, training-start
- Audio toggle + master volume slider
- Cross-browser testing (Chrome, Firefox, Safari, iOS Safari, Android Chrome)

**Out of Scope** (P3 enhancement, post-GA):
- Background music loops (optional polish)
- Per-channel volume control (SFX vs. music sliders)
- Spatial audio (panning, reverb)
- Voiceover narration

### §8.2 Production Deliverables

| Deliverable | Owner | Due Date | Format |
|-------------|-------|----------|--------|
| 12 × SFX audio files | Audio Designer / Editor | Phase 2 | MP3, 128 kbps |
| Audio assets README | Audio Designer | Phase 2 | Markdown (attribution, licensing) |
| Phaser audio integration code | Frontend Engineer | Phase 2 | TypeScript |
| Audio settings UI | Frontend Engineer | Phase 2 | React + CSS |
| Cross-browser test report | QA | Phase 2 | HTML / Confluence |
| Audio performance regression test | Frontend Engineer | Phase 2 | Vitest + Playwright |

---

## §9. Licensing and Attribution

All audio assets must include proper attribution. Template for `/public/assets/audio/README.md`:

```markdown
# Audio Assets — pixel-pet-arena

## Sound Effects

- **pet-tap-pop.mp3** — PENDING — TBD at asset acquisition
- **training-success.mp3** — PENDING — TBD at asset acquisition
- **arena-victory.mp3** — PENDING — TBD at asset acquisition
- ... (all SFX)

## Music

- **arena-battle-loop.mp3** — PENDING — TBD at asset acquisition (P3 optional)
- **trainer-ambient-loop.mp3** — PENDING — TBD at asset acquisition (P3 optional)

## Licensing Notes

All audio is licensed under PENDING — TBD before Phase 2 delivery.
Attribution: See individual file tags.
Restrictions: PENDING — TBD before Phase 2 delivery.

For license questions, contact: team alias TBD
```

---

## Appendix A. Audio Event Reference

**Complete mapping of game events to audio cues**:

```typescript
// Event → SFX mapping (TypeScript reference)
const AUDIO_EVENTS = {
  'pet:tap': 'pet-tap-pop',
  'ui:button-click': 'pet-tap-click',
  'training:start': 'training-start',
  'training:complete': 'training-success',
  'stat:display': 'stat-ding',
  'arena:start': 'arena-start',
  'arena:victory': 'arena-victory',
  'arena:defeat': 'arena-defeat',
  'leaderboard:rankup': 'leaderboard-rankup',
  'claim:email-sent': 'claim-success',
  'rate-limit:breach': 'rate-limit-warning',
  'food-buff:applied': 'food-buff',
  'music:arena-loop': 'arena-battle-loop', // P3
  'music:trainer-loop': 'trainer-ambient-loop', // P3
} as const;
```

---

## Appendix B. Web Audio API Concepts for Implementers

**Essential Web Audio Concepts** (for engineers unfamiliar with audio):

1. **AudioContext**: The global context for all audio processing. Created once per page, reused for all sound effects.
2. **AudioBuffer**: Decoded audio stored in memory. Phaser creates one per loaded audio file.
3. **BufferSource**: A playable instance of an AudioBuffer. Created on-demand; can be pooled.
4. **GainNode**: A mixer/volume control. Phaser uses for master and per-sound volume.
5. **Destination**: The speaker output. All audio routes here.

**Phaser Handles All of This**: Developers use high-level Phaser API (`this.sound.play()`) and never need to touch Web Audio internals directly.

---

*This AUDIO document specifies the audio design and implementation strategy for pixel-pet-arena. All audio assets, code, and settings must comply with the specifications in this document. Conflicts with upstream ARCH/EDD/PRD documents shall be escalated as Engineering Change Requests (ECRs).*
