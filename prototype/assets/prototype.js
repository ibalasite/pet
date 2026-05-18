/* ============================================================
   Pixel Pet Arena — Prototype Router + 14 player-facing screens
   screen-01 Landing, screen-02 Claim Email, screen-03 OTP,
   screen-04 URL Reveal, screen-05 Token Recovery, screen-06 GDPR,
   screen-07 My Pet, screen-08 Training, screen-09 Leaderboard,
   screen-10 Battle Result, screen-11 Records, screen-12 Arena Lobby,
   screen-13 Arena Battle, screen-14 Marketplace
   ============================================================ */

/* ---- Screen name map ---- */
const SCREEN_NAMES = {
  'screen-01': 'Landing',
  'screen-02': 'Claim — Email',
  'screen-03': 'Claim — OTP',
  'screen-04': 'Claim — URL Reveal',
  'screen-05': 'Token Recovery',
  'screen-06': 'GDPR Request',
  'screen-07': 'My Pet',
  'screen-08': 'Training',
  'screen-09': 'Leaderboard',
  'screen-10': 'Battle Result',
  'screen-11': 'Records',
  'screen-12': 'Arena Lobby',
  'screen-13': 'Arena Battle',
  'screen-14': 'Marketplace'
};

/* ---- Prototype State ---- */
const protoState = {
  selectedMode: 'RACE',
  trainingActionsLeft: 4,
  battleResult: null,
  claimEmail: '',
  otpTimerInterval: null,
  arenaTimerInterval: null,
  battleTimerInterval: null,
  currentLbFilter: 'ALL'
};

/* ---- Pet Sprite Renderer (CSS pixel-art via canvas) ---- */
function drawPetSprite(canvasEl, seed, rarity, size) {
  if (!canvasEl) return;
  const sz = size || 96;
  canvasEl.width  = sz;
  canvasEl.height = sz;
  const ctx = canvasEl.getContext('2d');

  // Deterministic RNG from seed
  let s = Math.abs(seed % 2147483647) || 12345;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };

  const rarityColors = {
    COMMON:    ['#b2bec3', '#636e72', '#dfe6e9'],
    RARE:      ['#4ecdc4', '#1b9e95', '#a8f2ef'],
    EPIC:      ['#a29bfe', '#6c5ce7', '#d6d0ff'],
    LEGENDARY: ['#fdcb6e', '#e17055', '#fff0c4']
  };
  const palette = rarityColors[rarity] || rarityColors.COMMON;

  const cellSz = Math.floor(sz / 8);

  // Generate 8x8 mirrored pixel pattern
  const grid = [];
  for (let y = 0; y < 8; y++) {
    const row = [];
    for (let x = 0; x < 4; x++) {
      row.push(rand() > 0.35 ? Math.floor(rand() * 3) : -1);
    }
    for (let x = 3; x >= 0; x--) row.push(row[x]);
    grid.push(row);
  }

  // Draw background
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, sz, sz);

  // Draw pixels
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const c = grid[y][x];
      if (c < 0) continue;
      ctx.fillStyle = palette[c];
      ctx.fillRect(x * cellSz, y * cellSz, cellSz, cellSz);
    }
  }

  // Draw eyes
  const eyeColor = '#ffffff';
  const eyeY = Math.floor(sz * 0.3);
  const eyeL = Math.floor(sz * 0.25);
  const eyeR = Math.floor(sz * 0.6);
  const eyeSz = Math.max(2, cellSz);
  ctx.fillStyle = eyeColor;
  ctx.fillRect(eyeL, eyeY, eyeSz, eyeSz);
  ctx.fillRect(eyeR, eyeY, eyeSz, eyeSz);
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(eyeL + 1, eyeY + 1, Math.max(1, eyeSz - 2), Math.max(1, eyeSz - 2));
  ctx.fillRect(eyeR + 1, eyeY + 1, Math.max(1, eyeSz - 2), Math.max(1, eyeSz - 2));

  // Draw mouth (tiny smile)
  const mouthY = Math.floor(sz * 0.55);
  const mouthX = Math.floor(sz * 0.35);
  ctx.fillStyle = palette[0];
  ctx.fillRect(mouthX, mouthY, cellSz * 2, Math.max(1, cellSz / 2));

  // Rarity glow border
  const glowColors = { LEGENDARY: '#fdcb6e', EPIC: '#a29bfe', RARE: '#4ecdc4', COMMON: '#b2bec3' };
  ctx.strokeStyle = glowColors[rarity] || '#b2bec3';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, sz - 2, sz - 2);
}

/* ---- Rarity Badge HTML ---- */
function rarityBadge(rarity) {
  const cls = rarity.toLowerCase();
  return `<span class="rarity-badge rarity-${cls}">${rarity}</span>`;
}

/* ---- Stat Bar HTML ---- */
function statBar(label, val, cls) {
  return `
    <div class="stat-label">
      <span class="stat-name">${label}</span>
      <span class="stat-value">${val}<span class="text-muted" style="font-size:7px">/100</span></span>
    </div>
    <div class="stat-bar-track">
      <div class="stat-bar-fill ${cls}" style="width:0%" data-target="${val}%"></div>
    </div>`;
}

/* ---- Animate stat bars after render ---- */
function animateStatBars() {
  requestAnimationFrame(() => {
    document.querySelectorAll('.stat-bar-fill[data-target]').forEach(el => {
      requestAnimationFrame(() => { el.style.width = el.dataset.target; });
    });
  });
}

/* ---- Format date ---- */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ---- Format time ago ---- */
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ============================================================
   PrototypeRouter
   ============================================================ */
class PrototypeRouter {
  constructor() {
    this.routes  = {};
    this.history = [];
    this.current = null;
  }

  register(id, renderFn) {
    this.routes[id] = renderFn;
  }

  navigate(id, opts = {}) {
    const content = document.getElementById('proto-content');
    if (!content) return;
    const renderFn = this.routes[id];
    if (!renderFn) { console.warn('[Router] Unknown screen:', id); return; }
    if (!opts.replace && this.current) this.history.push(this.current);
    this.current = id;
    content.innerHTML = renderFn();
    window.location.hash = id;
    const breadcrumb = document.getElementById('proto-breadcrumb');
    if (breadcrumb) breadcrumb.textContent = SCREEN_NAMES[id] || id;
    fxEngine.animateScreenEnter(content, 'fade');
    audioEngine.bindScreen(id);
    bindCurrentScreenEvents();
    animateStatBars();
  }

  back() {
    const prev = this.history.pop();
    if (prev) this.navigate(prev, { replace: true });
    else this.navigate('screen-01', { replace: true });
  }

  init() {
    const hash = window.location.hash.replace('#', '');
    const start = (hash && this.routes[hash]) ? hash : 'screen-01';
    this.navigate(start, { replace: true });
  }
}

const router = new PrototypeRouter();

/* ============================================================
   Screen 01 — Landing
   ============================================================ */
function renderScreen01() {
  return `
  <div class="screen screen-narrow" style="max-width:600px">
    <div class="landing-hero stagger">
      <div class="landing-logo">
        PIXEL<br><span>PET</span><br>ARENA
      </div>
      <p class="landing-subtitle">
        Claim your unique pixel companion. Train it. Battle others.
        Climb the leaderboard. Every pet is one-of-a-kind — owned only by you.
      </p>

      <div class="pixel-canvas-wrapper animate-scale-pop" style="margin:var(--space-lg) auto;display:block;width:128px;height:128px;">
        <canvas id="landing-pet-canvas" style="cursor:pointer;display:block;animation:pet-idle 2.4s ease-in-out infinite;image-rendering:pixelated"></canvas>
      </div>

      <div class="social-proof mt-md">
        <span>${MOCK_DATA.socialProof.claimedToday}</span> pets claimed today &nbsp;·&nbsp;
        <span>${MOCK_DATA.socialProof.totalPets.toLocaleString()}</span> total companions
      </div>

      <div class="mt-xl" id="claim-cta-area">
        <div class="progress-ring" id="landing-loading" style="font-size:8px;padding:var(--space-md)">
          ▓▓▓░░░ GENERATING YOUR PET...
        </div>
        <div id="claim-cta-btn" style="display:none">
          <button class="btn btn-accent btn-lg btn-block" onclick="router.navigate('screen-02');audioEngine.playSFX('btn-click')">
            ✦ CLAIM YOUR PET
          </button>
          <p class="text-sm mt-sm text-center" style="color:var(--color-text-secondary)">Free · No wallet required · Instant</p>
        </div>
      </div>

      <div class="mt-xl flex gap-md justify-center flex-wrap">
        <div class="card card-sm text-center" style="flex:1;min-width:130px">
          <div style="font-size:24px;margin-bottom:6px">⚔️</div>
          <div class="font-display" style="font-size:8px;color:var(--color-text-primary)">ARENA BATTLES</div>
          <p class="text-sm mt-xs">RACE &amp; SUMO modes. Prove your pet's worth.</p>
        </div>
        <div class="card card-sm text-center" style="flex:1;min-width:130px">
          <div style="font-size:24px;margin-bottom:6px">📈</div>
          <div class="font-display" style="font-size:8px;color:var(--color-text-primary)">TRAIN &amp; GROW</div>
          <p class="text-sm mt-xs">4 training actions daily. Permanent stat boosts.</p>
        </div>
        <div class="card card-sm text-center" style="flex:1;min-width:130px">
          <div style="font-size:24px;margin-bottom:6px">🏆</div>
          <div class="font-display" style="font-size:8px;color:var(--color-text-primary)">LEADERBOARD</div>
          <p class="text-sm mt-xs">Top pets earn legendary status and glory.</p>
        </div>
      </div>

      <div class="mt-xl divider"></div>
      <div class="flex gap-md justify-center flex-wrap" style="margin-top:var(--space-md)">
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-09');audioEngine.playSFX('nav-click')">🏆 Leaderboard</button>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-14');audioEngine.playSFX('nav-click')">🏪 Marketplace</button>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-07');audioEngine.playSFX('nav-click')">🐉 My Pet (Demo)</button>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-05');audioEngine.playSFX('nav-click')">🔑 Recover Token</button>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Screen 02 — Claim Email
   ============================================================ */
function renderScreen02() {
  return `
  <div class="screen screen-narrow">
    <div class="screen-header">
      <button class="btn btn-ghost btn-sm" onclick="router.back()">← Back</button>
      <h1 class="screen-title">Claim Your Pet</h1>
    </div>
    <div class="card stagger">
      <div class="text-center mb-lg">
        <div style="font-size:48px;margin-bottom:var(--space-sm)">📬</div>
        <h2>Enter Your Email</h2>
        <p>We'll send a one-time link. No password, no wallet — just your email.</p>
      </div>
      <div class="form-group">
        <label for="claim-email">Email Address</label>
        <input type="email" id="claim-email" placeholder="you@example.com" value="${protoState.claimEmail}" />
      </div>
      <div class="form-group">
        <div class="checkbox-group">
          <input type="checkbox" id="age-confirm" />
          <label for="age-confirm">I confirm I am 13 years of age or older and agree to the Terms of Service and Privacy Policy.</label>
        </div>
      </div>
      <div class="alert alert-info">
        ℹ️ Your unique pet will be generated from your email address. Each email gets exactly one pet.
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="claim-submit-btn" onclick="handleClaimSubmit()">
        SEND VERIFICATION CODE →
      </button>
      <div class="mt-md text-center">
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-05');audioEngine.playSFX('nav-click')">
          Already have a pet? Recover your link →
        </button>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Screen 03 — Claim OTP
   ============================================================ */
function renderScreen03() {
  let seconds = 900; // 15 min
  return `
  <div class="screen screen-narrow">
    <div class="screen-header">
      <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-02',{replace:true})">← Back</button>
      <h1 class="screen-title">Enter Code</h1>
    </div>
    <div class="card stagger">
      <div class="text-center mb-lg">
        <div style="font-size:48px;margin-bottom:var(--space-sm)">🔐</div>
        <h2>Check Your Email</h2>
        <p>We sent a 6-digit code to <strong style="color:var(--color-accent)">${protoState.claimEmail || 'your@email.com'}</strong>.</p>
        <p class="text-sm">Code expires in: <span class="countdown" id="otp-timer">15:00</span></p>
      </div>
      <div class="otp-group mb-lg" id="otp-group">
        <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="one-time-code" />
        <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" />
        <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" />
        <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" />
        <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" />
        <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" />
      </div>
      <button class="btn btn-primary btn-block btn-lg" onclick="handleOTPVerify()">
        VERIFY CODE →
      </button>
      <div class="mt-md text-center flex gap-md justify-center flex-wrap">
        <button class="btn btn-ghost btn-sm" onclick="handleResendOTP()">Resend Code</button>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-02',{replace:true})">Change Email</button>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Screen 04 — Claim URL Reveal
   ============================================================ */
function renderScreen04() {
  const pet = MOCK_DATA.myPet;
  const claimUrl = `https://pixelpetarena.com/pet/${pet.id}?token=ppa_demo_t0k3n_8472`;
  return `
  <div class="screen screen-narrow">
    <div class="screen-header">
      <h1 class="screen-title animate-scale-pop" style="color:var(--color-accent)">🎉 Pet Claimed!</h1>
    </div>
    <div class="card stagger">
      <div class="text-center mb-lg">
        <div class="pixel-canvas-wrapper animate-scale-pop" style="margin:0 auto var(--space-md);display:block;width:128px;height:128px">
          <canvas id="reveal-pet-canvas" style="display:block;image-rendering:pixelated"></canvas>
        </div>
        ${rarityBadge(pet.rarity)}
        <h2 class="mt-sm">${pet.petName}</h2>
        <p class="mt-xs">Level ${pet.level} · Seed #${pet.seed.toString().slice(0,8)}...</p>
      </div>

      <div class="alert alert-warning mb-lg">
        ⚠️ SAVE THIS URL — it is your only access key. We cannot recover it if lost.
      </div>

      <label>Your Unique Pet URL</label>
      <div class="url-display mb-md">
        <span class="url-text" id="pet-url-text">${claimUrl}</span>
        <button class="btn btn-ghost btn-sm" id="copy-url-btn" onclick="handleCopyURL('${claimUrl}')">COPY</button>
      </div>

      <div class="grid-2 mt-md">
        ${statBar('SPEED',    pet.statSpeed,    'speed')}
        ${statBar('STRENGTH', pet.statStrength, 'strength')}
        ${statBar('STAMINA',  pet.statStamina,  'stamina')}
      </div>

      <div class="mt-xl flex gap-md justify-center flex-wrap">
        <button class="btn btn-primary btn-lg" onclick="router.navigate('screen-07');audioEngine.playSFX('claim-success');fxEngine.victoryBurst(this)">
          GO TO MY PET →
        </button>
        <button class="btn btn-ghost btn-sm" onclick="handleCopyURL('${claimUrl}')">📋 Copy URL Again</button>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Screen 05 — Token Recovery
   ============================================================ */
function renderScreen05() {
  return `
  <div class="screen screen-narrow">
    <div class="screen-header">
      <button class="btn btn-ghost btn-sm" onclick="router.back()">← Back</button>
      <h1 class="screen-title">Recover Pet Link</h1>
    </div>
    <div class="card stagger">
      <div class="text-center mb-lg">
        <div style="font-size:48px;margin-bottom:var(--space-sm)">🔑</div>
        <h2>Lost Your Link?</h2>
        <p>Enter the email you used to claim your pet. We'll re-send your unique access URL.</p>
      </div>
      <div class="form-group">
        <label for="recovery-email">Email Address</label>
        <input type="email" id="recovery-email" placeholder="you@example.com" />
      </div>
      <div class="alert alert-info">
        ℹ️ You can request a recovery link once every 24 hours. Check your spam folder too.
      </div>
      <button class="btn btn-primary btn-block btn-lg" onclick="handleRecoverySubmit()">
        SEND RECOVERY EMAIL →
      </button>
      <div class="mt-md text-center">
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-02')">
          Claim a new pet instead →
        </button>
      </div>
    </div>
    <div id="recovery-success" style="display:none" class="mt-md">
      <div class="alert alert-success">
        ✅ Recovery email sent! Check your inbox within 5 minutes.
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Screen 06 — GDPR
   ============================================================ */
function renderScreen06() {
  return `
  <div class="screen screen-narrow">
    <div class="screen-header">
      <button class="btn btn-ghost btn-sm" onclick="router.back()">← Back</button>
      <h1 class="screen-title">Privacy Request</h1>
    </div>
    <div class="card stagger">
      <div class="text-center mb-lg">
        <div style="font-size:40px;margin-bottom:var(--space-sm)">🔒</div>
        <h2>Data &amp; Privacy</h2>
        <p>Submit a request under GDPR, CCPA, or applicable privacy laws. We process requests within 30 days.</p>
      </div>
      <div class="form-group">
        <label for="gdpr-email">Email Address (Associated with your pet)</label>
        <input type="email" id="gdpr-email" placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label for="gdpr-type">Request Type</label>
        <select id="gdpr-type">
          <option value="">— Select Request Type —</option>
          <option value="ACCESS">Data Access Request (Article 15 GDPR)</option>
          <option value="ERASURE">Data Erasure / Right to be Forgotten (Article 17)</option>
          <option value="PORTABILITY">Data Portability (Article 20)</option>
          <option value="RECTIFICATION">Data Rectification (Article 16)</option>
          <option value="RESTRICTION">Restrict Processing (Article 18)</option>
          <option value="OBJECTION">Object to Processing (Article 21)</option>
          <option value="CCPA_OPTOUT">CCPA — Do Not Sell My Data</option>
        </select>
      </div>
      <div class="form-group">
        <label for="gdpr-details">Additional Details (Optional)</label>
        <textarea id="gdpr-details" rows="4" placeholder="Describe your request in more detail..."></textarea>
      </div>
      <div class="alert alert-warning">
        ⚠️ Erasure requests will permanently delete your pet. This action cannot be undone.
      </div>
      <button class="btn btn-primary btn-block" onclick="handleGDPRSubmit()">
        SUBMIT REQUEST
      </button>
    </div>
    <div id="gdpr-success" style="display:none" class="mt-md">
      <div class="alert alert-success">
        ✅ Request submitted (Ref: GDPR-2026-0519-7842). We'll respond within 30 days to your email.
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Screen 07 — My Pet
   ============================================================ */
function renderScreen07() {
  const pet = MOCK_DATA.myPet;
  const rarityLower = pet.rarity.toLowerCase();
  return `
  <div class="screen">
    <div class="screen-header">
      <h1 class="screen-title">${pet.petName}</h1>
      ${rarityBadge(pet.rarity)}
      <span class="level-badge">LV.${pet.level}</span>
      <div style="margin-left:auto;display:flex;gap:var(--space-sm)">
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-11');audioEngine.playSFX('nav-click')">📋 Records</button>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-09');audioEngine.playSFX('nav-click')">🏆 Leaderboard</button>
      </div>
    </div>

    <div class="grid-2 gap-md">
      <!-- Pet portrait -->
      <div>
        <div class="pixel-canvas-wrapper rarity-border-${rarityLower} animate-scale-pop" style="width:192px;height:192px;margin:0 auto;display:block;">
          <canvas id="mypet-canvas" style="display:block;cursor:pointer;animation:pet-idle 2.4s ease-in-out infinite;image-rendering:pixelated"></canvas>
        </div>
        <div class="text-center mt-sm">
          <p class="text-sm text-muted">Tap pet for interaction</p>
          <p class="text-xs text-muted mt-xs">Claimed ${fmtDate(pet.claimedAt)}</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="card">
        <h3 style="font-family:var(--font-display);font-size:9px;margin-bottom:var(--space-md);color:var(--color-text-primary)">BASE STATS</h3>
        ${statBar('SPEED',    pet.statSpeed,    'speed')}
        <div style="height:var(--space-sm)"></div>
        ${statBar('STRENGTH', pet.statStrength, 'strength')}
        <div style="height:var(--space-sm)"></div>
        ${statBar('STAMINA',  pet.statStamina,  'stamina')}
        <hr class="divider">
        <div class="flex justify-between mt-sm">
          <span class="text-muted text-sm">Total Trainings</span>
          <span class="font-display text-xs text-accent">${pet.totalTrainingActions}</span>
        </div>
        <div class="flex justify-between mt-xs">
          <span class="text-muted text-sm">Last Trained</span>
          <span class="text-sm">${timeAgo(pet.lastTrainedAt)}</span>
        </div>
      </div>
    </div>

    <!-- Training section -->
    <div class="card mt-lg">
      <div class="flex justify-between items-center mb-md">
        <h2 style="margin:0">Daily Training</h2>
        <div>
          <span class="countdown">${pet.actionsRemaining} actions left</span>
          <span class="text-muted text-xs ml-sm" style="margin-left:8px">Resets in ${pet.nextResetIn}</span>
        </div>
      </div>
      <div class="grid-3 gap-md">
        <div class="training-card" onclick="handleTrainAction('speed',this);audioEngine.playSFX('training-start')">
          <div class="training-icon">🏃</div>
          <div class="training-title">SPEED DASH</div>
          <div class="training-desc">Boost speed stat. High speed wins RACE mode battles.</div>
        </div>
        <div class="training-card" onclick="handleTrainAction('strength',this);audioEngine.playSFX('training-start')">
          <div class="training-icon">💪</div>
          <div class="training-title">POWER LIFT</div>
          <div class="training-desc">Boost strength stat. High strength dominates SUMO mode.</div>
        </div>
        <div class="training-card" onclick="handleTrainAction('stamina',this);audioEngine.playSFX('training-start')">
          <div class="training-icon">❤️</div>
          <div class="training-title">ENDURANCE RUN</div>
          <div class="training-desc">Boost stamina stat. High stamina extends battle endurance.</div>
        </div>
      </div>
      <div class="alert alert-info mt-md" style="font-family:var(--font-body);font-size:12px">
        Each successful training permanently increases a stat by +1 (up to cap). Actions reset daily at midnight UTC.
      </div>
    </div>

    <!-- Food inventory -->
    <div class="card mt-lg">
      <div class="flex justify-between items-center mb-md">
        <h2 style="margin:0">Food Inventory</h2>
        <span class="badge">${MOCK_DATA.foodInventory.length}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--space-sm)">
        ${MOCK_DATA.foodInventory.map(f => {
          const icons = { SPEED_BERRY: '🫐', STRENGTH_CRYSTAL: '💎', STAMINA_MUSHROOM: '🍄' };
          const icon = icons[f.foodType] || '🍎';
          const durText = f.isPermanent ? 'PERMANENT' : '24h buff';
          return `
          <div class="food-item" onclick="handleFeedPet('${f.id}','${f.buffStat}',${f.magnitude});audioEngine.playSFX('food-buff')">
            <span class="food-icon">${icon}</span>
            <div class="flex-1">
              <div class="food-name">${f.foodType.replace(/_/g,' ')}</div>
              <div class="food-meta">+${f.magnitude} ${f.buffStat} · ${durText}</div>
            </div>
            <button class="btn btn-secondary btn-sm">FEED</button>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Arena entry -->
    <div class="card mt-lg" style="border-color:var(--color-primary);animation:glow-pulse 2s ease infinite">
      <div class="flex items-center justify-between flex-wrap gap-md">
        <div>
          <h2 style="color:var(--color-accent);margin:0">⚔️ Enter the Arena</h2>
          <p class="mt-xs text-sm">Challenge other pets or battle the AI. Win to earn arena score and stat bonuses.</p>
        </div>
        <button class="btn btn-accent btn-lg" onclick="router.navigate('screen-12');audioEngine.playSFX('arena-start')">
          BATTLE NOW →
        </button>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Screen 08 — Training (detail / action confirmation)
   ============================================================ */
function renderScreen08() {
  const pet = MOCK_DATA.myPet;
  const streak = 3;
  return `
  <div class="screen screen-narrow">
    <div class="screen-header">
      <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-07',{replace:true})">← Back</button>
      <h1 class="screen-title">Daily Training</h1>
    </div>

    <div class="card stagger">
      <div class="flex items-center gap-md mb-lg">
        <div class="pixel-canvas-wrapper" style="width:80px;height:80px;flex-shrink:0">
          <canvas id="train-pet-mini" style="display:block;image-rendering:pixelated"></canvas>
        </div>
        <div>
          <div class="font-display" style="font-size:10px;color:var(--color-accent)">${pet.petName}</div>
          ${rarityBadge(pet.rarity)}
          <div class="mt-xs flex gap-sm">
            <span class="countdown">${pet.actionsRemaining} actions left</span>
            <span class="level-badge">LV.${pet.level}</span>
          </div>
        </div>
      </div>

      <div class="alert alert-success mb-md">
        🔥 Training Streak: <strong>${streak} days in a row!</strong> Bonus XP active.
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--space-sm)" id="training-actions">
        ${[
          { key:'speed',    icon:'🏃', name:'SPEED DASH',    desc:'Sprint intervals. +1 SPD base stat.',   stat:'statSpeed',    val: pet.statSpeed    },
          { key:'strength', icon:'💪', name:'POWER LIFT',    desc:'Resistance training. +1 STR base stat.',stat:'statStrength', val: pet.statStrength  },
          { key:'stamina',  icon:'❤️', name:'ENDURANCE RUN', desc:'Long distance. +1 STA base stat.',     stat:'statStamina',  val: pet.statStamina   }
        ].map(a => `
        <div class="training-card" id="train-card-${a.key}" onclick="handleTrainAction('${a.key}',this,true);audioEngine.playSFX('training-start')">
          <div class="flex items-center gap-md">
            <div class="training-icon" style="margin:0;font-size:32px">${a.icon}</div>
            <div class="flex-1">
              <div class="training-title">${a.name}</div>
              <div class="training-desc">${a.desc}</div>
              <div class="mt-xs">
                <div class="stat-bar-track" style="width:100%;max-width:200px">
                  <div class="stat-bar-fill ${a.key}" style="width:${a.val}%" ></div>
                </div>
                <span class="stat-name" style="font-size:7px">${a.val}/100</span>
              </div>
            </div>
            <button class="btn btn-primary btn-sm">TRAIN</button>
          </div>
        </div>`).join('')}
      </div>

      <div class="mt-lg text-center">
        <p class="text-sm text-muted">Next daily reset: <span class="text-accent">${pet.nextResetIn}</span></p>
        <p class="text-xs text-muted mt-xs">Stats cap at 100. Permanent gains are yours forever.</p>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Screen 09 — Leaderboard
   ============================================================ */
function renderScreen09() {
  const filters = ['ALL', 'LEGENDARY', 'EPIC', 'RARE', 'COMMON'];
  const lbData  = MOCK_DATA.leaderboard;

  const renderTable = (filter) => {
    const rows = filter === 'ALL' ? lbData : lbData.filter(e => e.rarity === filter);
    return rows.map(e => {
      const isMyPet = e.petId === MOCK_DATA.myPet.id;
      const rarityLower = e.rarity.toLowerCase();
      const rankCls = e.rank <= 3 ? `rank-${e.rank}` : '';
      return `
      <tr style="${isMyPet ? 'background:rgba(108,92,231,0.12)' : ''}">
        <td><span class="rank-badge ${rankCls}">${e.rank}</span></td>
        <td>
          <div class="font-display" style="font-size:9px;color:var(--color-text-primary)">${e.petName}${isMyPet ? ' <span style="color:var(--color-accent);font-size:7px">(YOU)</span>' : ''}</div>
          <div class="mt-xs">${rarityBadge(e.rarity)}</div>
        </td>
        <td><span class="level-badge">LV.${e.level}</span></td>
        <td><span class="font-display" style="font-size:11px;color:var(--color-accent)">${e.arenaScore.toLocaleString()}</span></td>
        <td><span class="${e.winRate >= 0.7 ? 'text-success' : e.winRate >= 0.55 ? 'text-accent' : 'text-error'}">${Math.round(e.winRate*100)}%</span></td>
        <td class="text-muted text-sm">${e.battlesPlayed}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-11');audioEngine.playSFX('nav-click')">View</button>
        </td>
      </tr>`;
    }).join('');
  };

  return `
  <div class="screen screen-wide">
    <div class="screen-header">
      <h1 class="screen-title">🏆 Leaderboard</h1>
      <span class="text-muted text-sm">Top ${lbData.length} pets · Updated hourly</span>
      <div style="margin-left:auto">
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-07')">← My Pet</button>
      </div>
    </div>

    <div class="tabs" id="lb-tabs">
      ${filters.map(f => `
      <button class="tab-btn ${f === (protoState.currentLbFilter || 'ALL') ? 'active' : ''}"
              onclick="switchLbFilter('${f}')">${f === 'ALL' ? '⚡ ALL' : f}</button>
      `).join('')}
    </div>

    <!-- Top 3 podium -->
    <div class="flex gap-md justify-center mb-xl flex-wrap stagger">
      ${lbData.slice(0,3).map((e, i) => {
        const heights = ['180px','160px','140px'];
        const icons   = ['🥇','🥈','🥉'];
        const podiumOrder = [1, 0, 2]; // silver, gold, bronze positions
        const entry = lbData[podiumOrder[i]];
        return `
        <div class="card text-center animate-scale-pop" style="flex:1;min-width:150px;max-width:220px;padding-top:${heights[i]}">
          <div style="font-size:24px">${icons[podiumOrder[i]]}</div>
          <div class="font-display mt-sm" style="font-size:9px">${entry.petName}</div>
          ${rarityBadge(entry.rarity)}
          <div class="mt-sm font-display" style="font-size:11px;color:var(--color-accent)">${entry.arenaScore.toLocaleString()}</div>
          <div class="text-muted text-xs mt-xs">${Math.round(entry.winRate*100)}% WR</div>
        </div>`;
      }).join('')}
    </div>

    <div class="card" style="overflow-x:auto">
      <table class="lb-table" id="lb-table-body">
        <thead>
          <tr>
            <th>#</th>
            <th>Pet</th>
            <th>Level</th>
            <th>Score</th>
            <th>Win Rate</th>
            <th>Battles</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="lb-rows">
          ${renderTable(protoState.currentLbFilter || 'ALL')}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ============================================================
   Screen 10 — Battle Result
   ============================================================ */
function renderScreen10() {
  const battle  = MOCK_DATA.battleHistory[0];
  const myPet   = MOCK_DATA.myPet;
  const isWin   = battle.outcome === 'WIN';
  const oppName = battle.opponentName;
  const opponent = MOCK_DATA.pets.find(p => p.petName === oppName) || MOCK_DATA.pets[1];
  const deltas  = battle.statDelta || {};

  return `
  <div class="screen screen-narrow">
    <div class="screen-header">
      <button class="btn btn-ghost btn-sm" onclick="router.back()">← Back</button>
      <h1 class="screen-title">Battle Result</h1>
    </div>

    <div class="card stagger">
      <div class="result-banner">
        <div class="${isWin ? 'result-win' : 'result-loss'}" id="result-text">
          ${isWin ? '⚔️ VICTORY!' : '💀 DEFEAT'}
        </div>
        <div class="mt-md text-muted text-sm">${battle.mode} MODE · ${isWin ? 'You dominated!' : 'Better luck next time.'}</div>
      </div>

      <div class="battle-arena">
        <div class="combatant">
          <div class="pixel-canvas-wrapper rarity-border-${myPet.rarity.toLowerCase()}" style="width:96px;height:96px;margin:0 auto;display:block">
            <canvas id="result-my-canvas" style="display:block;image-rendering:pixelated"></canvas>
          </div>
          <div class="combatant-name">${myPet.petName}</div>
          ${rarityBadge(myPet.rarity)}
          <div class="mt-sm">
            <div class="hp-bar-outer"><div class="hp-bar-fill" style="width:${isWin?'85':'30'}%"></div></div>
          </div>
        </div>

        <div class="vs-divider">VS</div>

        <div class="combatant">
          <div class="pixel-canvas-wrapper" style="width:96px;height:96px;margin:0 auto;display:block">
            <canvas id="result-opp-canvas" style="display:block;image-rendering:pixelated"></canvas>
          </div>
          <div class="combatant-name">${oppName}</div>
          ${rarityBadge(opponent.rarity)}
          <div class="mt-sm">
            <div class="hp-bar-outer"><div class="hp-bar-fill enemy" style="width:${isWin?'15':'80'}%"></div></div>
          </div>
        </div>
      </div>

      ${Object.keys(deltas).length > 0 ? `
      <div class="alert alert-success mt-md">
        📈 Stat gains from victory:
        ${Object.entries(deltas).map(([k,v]) => `<strong>+${v} ${k.toUpperCase()}</strong>`).join(', ')}
      </div>` : `
      <div class="alert alert-warning mt-md">
        No stat gains this battle. Win more to level up faster!
      </div>`}

      <!-- Stat comparison -->
      <h3 class="mt-lg" style="font-family:var(--font-display);font-size:9px;margin-bottom:var(--space-md)">STAT COMPARISON</h3>
      ${[
        { label: 'SPEED',    mine: myPet.statSpeed,    theirs: opponent.statSpeed },
        { label: 'STRENGTH', mine: myPet.statStrength, theirs: opponent.statStrength },
        { label: 'STAMINA',  mine: myPet.statStamina,  theirs: opponent.statStamina }
      ].map(s => `
      <div class="mb-sm">
        <div class="flex justify-between mb-xs">
          <span class="stat-name">${s.label}</span>
          <span class="font-display text-xs">
            <span style="color:#74b9ff">${s.mine}</span>
            <span class="text-muted"> vs </span>
            <span style="color:#fd79a8">${s.theirs}</span>
          </span>
        </div>
      </div>`).join('')}

      <div class="flex gap-md mt-xl flex-wrap">
        <button class="btn btn-primary flex-1" onclick="router.navigate('screen-12');audioEngine.playSFX('arena-start')">⚔️ Battle Again</button>
        <button class="btn btn-ghost flex-1" onclick="router.navigate('screen-07')">← My Pet</button>
        <button class="btn btn-ghost btn-sm" onclick="handleShareResult()">📤 Share</button>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Screen 11 — Records
   ============================================================ */
function renderScreen11() {
  const pet     = MOCK_DATA.myPet;
  const history = MOCK_DATA.battleHistory;
  const wins    = history.filter(b => b.outcome === 'WIN').length;
  const losses  = history.length - wins;
  const winRate = Math.round((wins / history.length) * 100);
  const lbEntry = MOCK_DATA.leaderboard.find(e => e.petId === pet.id);
  const score   = lbEntry ? lbEntry.arenaScore : 4872;

  return `
  <div class="screen">
    <div class="screen-header">
      <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-07',{replace:true})">← Back</button>
      <h1 class="screen-title">Pet Records</h1>
    </div>

    <!-- Pet identity card -->
    <div class="card flex gap-lg items-start stagger" style="margin-bottom:var(--space-lg)">
      <div class="pixel-canvas-wrapper rarity-border-legendary" style="width:88px;height:88px;flex-shrink:0">
        <canvas id="records-pet-canvas" style="display:block;image-rendering:pixelated"></canvas>
      </div>
      <div class="flex-1">
        <div class="flex items-center gap-sm flex-wrap mb-xs">
          <span class="font-display" style="font-size:12px;color:var(--color-accent)">${pet.petName}</span>
          ${rarityBadge(pet.rarity)}
          <span class="level-badge">LV.${pet.level}</span>
        </div>
        <p class="text-sm mb-xs">Seed: <span class="font-display text-xs">#${pet.seed.toString().slice(0,12)}</span></p>
        <p class="text-sm mb-xs">Claimed: ${fmtDate(pet.claimedAt)}</p>
        <p class="text-sm">Arena Score: <span class="text-accent font-display" style="font-size:10px">${score.toLocaleString()}</span></p>
      </div>
    </div>

    <!-- Stats overview -->
    <div class="grid-3 mb-lg">
      ${[
        { label: 'WINS',    value: wins,    color: 'var(--color-success)' },
        { label: 'LOSSES',  value: losses,  color: 'var(--color-error)' },
        { label: 'WIN RATE',value: winRate+'%', color: 'var(--color-accent)' }
      ].map(s => `
      <div class="card card-sm text-center">
        <div class="font-display" style="font-size:20px;color:${s.color};margin-bottom:4px">${s.value}</div>
        <div class="stat-name">${s.label}</div>
      </div>`).join('')}
    </div>

    <!-- Battle history table -->
    <div class="card" style="overflow-x:auto">
      <h2 class="mb-md">Battle History</h2>
      <table class="lb-table">
        <thead>
          <tr>
            <th>Result</th>
            <th>Mode</th>
            <th>Opponent</th>
            <th>Stat Gains</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${history.map(b => {
            const isWin = b.outcome === 'WIN';
            const gains = Object.entries(b.statDelta || {}).map(([k,v]) => `+${v} ${k.toUpperCase()}`).join(', ') || '—';
            return `
            <tr>
              <td><span class="font-display" style="font-size:9px;color:${isWin ? 'var(--color-success)' : 'var(--color-error)'}">${b.outcome}</span></td>
              <td><span class="tag">${b.mode}</span></td>
              <td>
                <div class="font-display" style="font-size:8px">${b.opponentName}</div>
                ${b.isAiOpponent ? '<span class="tag" style="margin-top:2px">AI</span>' : ''}
              </td>
              <td><span class="stat-delta ${isWin ? 'positive' : ''}">${gains}</span></td>
              <td class="text-muted text-sm">${fmtDate(b.createdAt)}</td>
              <td><button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-10');audioEngine.playSFX('nav-click')">View</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ============================================================
   Screen 12 — Arena Lobby
   ============================================================ */
function renderScreen12() {
  const pet = MOCK_DATA.myPet;
  const opponents = MOCK_DATA.pets.filter(p => p.id !== pet.id);

  return `
  <div class="screen">
    <div class="screen-header">
      <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-07',{replace:true})">← Back</button>
      <h1 class="screen-title">⚔️ Arena Lobby</h1>
    </div>

    <!-- Mode selection -->
    <h2 class="mb-md">Choose Battle Mode</h2>
    <div class="grid-2 mb-xl" id="mode-cards">
      <div class="arena-mode-card ${protoState.selectedMode === 'RACE' ? 'selected' : ''}" onclick="selectMode('RACE',this)">
        <div class="arena-mode-icon">🏁</div>
        <div class="arena-mode-name">RACE</div>
        <div class="arena-mode-desc">Speed is king. Fastest pet wins the dash. Your SPEED stat determines success.</div>
        <div class="mt-md">
          <span class="tag">SPEED-based</span>
        </div>
      </div>
      <div class="arena-mode-card ${protoState.selectedMode === 'SUMO' ? 'selected' : ''}" onclick="selectMode('SUMO',this)">
        <div class="arena-mode-icon">🏋️</div>
        <div class="arena-mode-name">SUMO</div>
        <div class="arena-mode-desc">Push your opponent out of the ring. Your STRENGTH and STAMINA determine the outcome.</div>
        <div class="mt-md">
          <span class="tag">STRENGTH + STAMINA</span>
        </div>
      </div>
    </div>

    <!-- Matchmaking -->
    <h2 class="mb-md">Select Opponent</h2>
    <div class="tabs" id="opponent-tabs">
      <button class="tab-btn active" onclick="switchOpponentTab('player',this)">🧑 Real Players</button>
      <button class="tab-btn" onclick="switchOpponentTab('ai',this)">🤖 Battle AI</button>
    </div>

    <div id="opponent-list">
      <div class="stagger" style="display:flex;flex-direction:column;gap:var(--space-sm)">
        ${opponents.slice(0,4).map(opp => `
        <div class="card card-sm flex items-center gap-md" id="opp-${opp.id}"
             style="cursor:pointer;transition:border-color 0.15s"
             onclick="selectOpponent('${opp.id}','${opp.petName}','${opp.rarity}',this)">
          <div class="pixel-canvas-wrapper" style="width:56px;height:56px;flex-shrink:0">
            <canvas data-seed="${opp.seed}" data-rarity="${opp.rarity}" data-size="56"
                    class="opp-canvas" style="display:block;image-rendering:pixelated"></canvas>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-sm flex-wrap">
              <span class="font-display" style="font-size:9px">${opp.petName}</span>
              ${rarityBadge(opp.rarity)}
              <span class="level-badge">LV.${opp.level}</span>
            </div>
            <div class="flex gap-md mt-xs">
              <span class="stat-name">SPD: <span style="color:#74b9ff">${opp.statSpeed}</span></span>
              <span class="stat-name">STR: <span style="color:#fd79a8">${opp.statStrength}</span></span>
              <span class="stat-name">STA: <span style="color:var(--color-success)">${opp.statStamina}</span></span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();startBattle('${opp.id}','${opp.petName}','${opp.rarity}',false);audioEngine.playSFX('arena-start')">
            CHALLENGE
          </button>
        </div>`).join('')}
      </div>
    </div>

    <!-- Quick matchmake -->
    <div class="card mt-lg text-center" style="border-color:var(--color-accent)">
      <h2>Quick Match</h2>
      <p class="mt-xs">Let the arena find you the best opponent for your current stats and mode.</p>
      <button class="btn btn-accent btn-lg mt-md" onclick="startBattle(null,'Shadow Viper','EPIC',false);audioEngine.playSFX('arena-start')">
        ⚡ QUICK MATCH
      </button>
    </div>
  </div>`;
}

/* ============================================================
   Screen 13 — Arena Battle
   ============================================================ */
function renderScreen13() {
  const myPet   = MOCK_DATA.myPet;
  const opp     = MOCK_DATA.pets[1]; // Shadow Viper
  const mode    = protoState.selectedMode || 'RACE';

  return `
  <div class="screen">
    <div class="screen-header">
      <h1 class="screen-title">⚔️ ARENA BATTLE</h1>
      <span class="tag">${mode} MODE</span>
      <div style="margin-left:auto">
        <button class="btn btn-ghost btn-sm" onclick="skipBattle()">⏭ Skip</button>
      </div>
    </div>

    <!-- Battle field -->
    <div class="card mb-md" style="background:#0d0d1a;border-color:var(--color-primary);overflow:hidden;position:relative">
      <!-- Scanline effect -->
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:rgba(108,92,231,0.4);animation:scan-line 3s linear infinite;pointer-events:none"></div>

      <div class="battle-arena" id="battle-field" style="padding:var(--space-2xl) 0">
        <!-- My pet side -->
        <div class="combatant" id="my-combatant">
          <div class="pixel-canvas-wrapper rarity-border-legendary animate-scale-pop" style="width:128px;height:128px;margin:0 auto;display:block">
            <canvas id="battle-my-canvas" style="display:block;animation:pet-idle 2.4s ease-in-out infinite;image-rendering:pixelated"></canvas>
          </div>
          <div class="combatant-name mt-sm">${myPet.petName}</div>
          ${rarityBadge(myPet.rarity)}
          <div class="mt-sm">
            <div class="hp-bar-outer"><div class="hp-bar-fill" id="my-hp" style="width:100%"></div></div>
            <div class="flex justify-between mt-xs">
              <span class="stat-name">HP</span>
              <span class="font-display text-xs text-success" id="my-hp-text">100</span>
            </div>
          </div>
        </div>

        <div class="vs-divider" id="vs-center">VS</div>

        <!-- Opponent side -->
        <div class="combatant" id="opp-combatant">
          <div class="pixel-canvas-wrapper animate-scale-pop" style="width:128px;height:128px;margin:0 auto;display:block">
            <canvas id="battle-opp-canvas" style="display:block;animation:pet-idle 2.4s ease-in-out infinite 0.5s;image-rendering:pixelated"></canvas>
          </div>
          <div class="combatant-name mt-sm">${opp.petName}</div>
          ${rarityBadge(opp.rarity)}
          <div class="mt-sm">
            <div class="hp-bar-outer"><div class="hp-bar-fill enemy" id="opp-hp" style="width:100%"></div></div>
            <div class="flex justify-between mt-xs">
              <span class="stat-name">HP</span>
              <span class="font-display text-xs text-error" id="opp-hp-text">100</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Battle log -->
    <div class="card mb-md" id="battle-log" style="max-height:160px;overflow-y:auto;background:#0d0d1a">
      <div id="battle-log-entries" class="font-display" style="font-size:8px;line-height:2">
        <div style="color:var(--color-accent)">▶ Battle begins!</div>
        <div style="color:var(--color-text-secondary)">▶ Mode: ${mode} · Analyzing stats...</div>
      </div>
    </div>

    <!-- Mode stat highlight -->
    <div class="grid-2">
      <div class="card card-sm">
        <div class="font-display" style="font-size:8px;color:var(--color-text-secondary);margin-bottom:4px">YOUR STAT</div>
        <div class="flex items-center gap-sm">
          <span class="font-display" style="font-size:18px;color:var(--color-accent)">${mode === 'RACE' ? myPet.statSpeed : myPet.statStrength}</span>
          <span class="stat-name">${mode === 'RACE' ? 'SPEED' : 'STRENGTH'}</span>
        </div>
      </div>
      <div class="card card-sm">
        <div class="font-display" style="font-size:8px;color:var(--color-text-secondary);margin-bottom:4px">OPPONENT STAT</div>
        <div class="flex items-center gap-sm">
          <span class="font-display" style="font-size:18px;color:var(--color-error)">${mode === 'RACE' ? opp.statSpeed : opp.statStrength}</span>
          <span class="stat-name">${mode === 'RACE' ? 'SPEED' : 'STRENGTH'}</span>
        </div>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Screen 14 — Marketplace
   ============================================================ */
function renderScreen14() {
  const listings = MOCK_DATA.listings;

  return `
  <div class="screen screen-wide">
    <div class="screen-header">
      <h1 class="screen-title">🏪 Marketplace</h1>
      <span class="text-muted text-sm">Peer-to-peer pet trading</span>
      <div style="margin-left:auto;display:flex;gap:var(--space-sm)">
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-07')">← My Pet</button>
        <button class="btn btn-primary btn-sm" onclick="showListMyPetModal()">+ List My Pet</button>
      </div>
    </div>

    <div class="alert alert-info mb-lg">
      ℹ️ All trades are free — this marketplace is for community exchanges, not for sale. Pets are listed voluntarily by their owners.
    </div>

    <!-- Search / filter row -->
    <div class="flex gap-md mb-lg flex-wrap items-center">
      <input type="text" placeholder="Search pets..." style="max-width:280px" id="market-search" oninput="filterListings(this.value)" />
      <select style="max-width:160px" id="market-rarity-filter" onchange="filterListings()">
        <option value="">All Rarities</option>
        <option value="LEGENDARY">Legendary</option>
        <option value="EPIC">Epic</option>
        <option value="RARE">Rare</option>
        <option value="COMMON">Common</option>
      </select>
      <select style="max-width:160px" onchange="">
        <option>Newest First</option>
        <option>Oldest First</option>
        <option>Rarity: Rare+</option>
      </select>
      <span class="text-muted text-sm">${listings.length} listings</span>
    </div>

    <!-- Listing cards -->
    <div class="grid-auto" id="listing-grid">
      ${listings.map(l => {
        const rarityLower = l.rarity.toLowerCase();
        const demoOpp = MOCK_DATA.pets.find(p => p.petName === l.petName) || MOCK_DATA.pets[2];
        return `
        <div class="listing-card rarity-border-${rarityLower}" data-name="${l.petName.toLowerCase()}" data-rarity="${l.rarity}">
          <div class="listing-card-header">
            <div class="pixel-canvas-wrapper" style="width:56px;height:56px;flex-shrink:0">
              <canvas data-seed="${demoOpp.seed}" data-rarity="${l.rarity}" data-size="56"
                      class="listing-canvas" style="display:block;image-rendering:pixelated"></canvas>
            </div>
            <div class="flex-1">
              <div class="font-display" style="font-size:9px;margin-bottom:4px">${l.petName}</div>
              ${rarityBadge(l.rarity)}
            </div>
          </div>
          <div class="listing-card-body">
            <div class="flex gap-sm mb-sm flex-wrap">
              <span class="stat-name">LV.${demoOpp.level}</span>
              <span class="stat-name">SPD: ${demoOpp.statSpeed}</span>
              <span class="stat-name">STR: ${demoOpp.statStrength}</span>
              <span class="stat-name">STA: ${demoOpp.statStamina}</span>
            </div>
            <p class="text-sm" style="color:var(--color-text-secondary);font-style:italic">"${l.ownerDescription}"</p>
            <p class="text-xs text-muted mt-xs">Listed ${timeAgo(l.createdAt)}</p>
          </div>
          <div class="listing-card-footer">
            <span class="font-display text-xs text-accent">FREE TRADE</span>
            <div class="flex gap-sm">
              <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-11');audioEngine.playSFX('nav-click')">Details</button>
              <button class="btn btn-primary btn-sm" onclick="handleTradeRequest('${l.id}','${l.petName}');audioEngine.playSFX('btn-click')">TRADE</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Empty state placeholder for future listings -->
    <div class="card mt-lg text-center" style="border-style:dashed;border-color:var(--color-surface-2)">
      <div style="font-size:32px;margin-bottom:var(--space-sm)">🐾</div>
      <h3 style="font-family:var(--font-display);font-size:9px;color:var(--color-text-secondary)">WANT TO LIST YOUR PET?</h3>
      <p class="text-sm mt-xs">List it here so other players can discover and request a trade.</p>
      <button class="btn btn-ghost btn-sm mt-md" onclick="showListMyPetModal()">List My Pet →</button>
    </div>
  </div>`;
}

/* ============================================================
   Event Handlers & Interactions
   ============================================================ */

function handleClaimSubmit() {
  const emailEl = document.getElementById('claim-email');
  const ageEl   = document.getElementById('age-confirm');
  if (!emailEl || !emailEl.value.includes('@')) {
    if (emailEl) fxEngine.shakeElement(emailEl);
    return;
  }
  if (!ageEl || !ageEl.checked) {
    if (ageEl) fxEngine.shakeElement(ageEl.closest('.checkbox-group'));
    return;
  }
  protoState.claimEmail = emailEl.value;
  audioEngine.playSFX('btn-click');
  const btn = document.getElementById('claim-submit-btn');
  if (btn) { btn.textContent = 'SENDING...'; btn.disabled = true; }
  setTimeout(() => router.navigate('screen-03'), 900);
}

function handleOTPVerify() {
  const digits = document.querySelectorAll('.otp-digit');
  const code   = Array.from(digits).map(d => d.value).join('');
  if (code.length < 6) {
    digits.forEach(d => fxEngine.shakeElement(d));
    return;
  }
  audioEngine.playSFX('claim-success');
  fxEngine.victoryBurst(document.querySelector('.otp-group'));
  setTimeout(() => router.navigate('screen-04'), 600);
}

function handleResendOTP() {
  audioEngine.playSFX('btn-click');
  const timerEl = document.getElementById('otp-timer');
  if (timerEl) timerEl.textContent = '15:00';
  fxEngine.floatText(timerEl, '+15min', '#00b894');
}

function handleCopyURL(url) {
  navigator.clipboard.writeText(url).then(() => {
    audioEngine.playSFX('copy-success');
    const btn = document.getElementById('copy-url-btn');
    if (btn) { btn.textContent = 'COPIED!'; setTimeout(() => { btn.textContent = 'COPY'; }, 2000); }
    fxEngine.floatText(document.getElementById('pet-url-text'), '✓ Copied!', '#00b894');
  }).catch(() => {
    const btn = document.getElementById('copy-url-btn');
    if (btn) btn.textContent = 'COPIED!';
    setTimeout(() => { if (btn) btn.textContent = 'COPY'; }, 2000);
  });
}

function handleRecoverySubmit() {
  const emailEl = document.getElementById('recovery-email');
  if (!emailEl || !emailEl.value.includes('@')) {
    if (emailEl) fxEngine.shakeElement(emailEl);
    return;
  }
  audioEngine.playSFX('btn-click');
  const successEl = document.getElementById('recovery-success');
  if (successEl) successEl.style.display = 'block';
}

function handleGDPRSubmit() {
  const emailEl = document.getElementById('gdpr-email');
  const typeEl  = document.getElementById('gdpr-type');
  if (!emailEl || !emailEl.value.includes('@') || !typeEl || !typeEl.value) {
    if (emailEl) fxEngine.shakeElement(emailEl);
    return;
  }
  audioEngine.playSFX('btn-click');
  const successEl = document.getElementById('gdpr-success');
  if (successEl) successEl.style.display = 'block';
}

function handleTrainAction(stat, el, fromScreen08) {
  if (protoState.trainingActionsLeft <= 0) {
    audioEngine.playSFX('rate-limit');
    fxEngine.shakeElement(el);
    return;
  }
  protoState.trainingActionsLeft--;
  audioEngine.playSFX('training-success');
  el.style.borderColor = 'var(--color-success)';
  fxEngine.petTapBurst(el);
  fxEngine.floatText(el, `+1 ${stat.toUpperCase()}!`, 'var(--color-success)');
  setTimeout(() => { el.style.borderColor = ''; }, 1200);
  if (!fromScreen08) return;
  const bar = el.querySelector('.stat-bar-fill');
  if (bar) {
    const current = parseInt(bar.style.width) || 0;
    bar.style.width = Math.min(100, current + 1) + '%';
  }
}

function handleFeedPet(foodId, stat, magnitude) {
  audioEngine.playSFX('food-buff');
  fxEngine.floatText(document.querySelector('.food-item'), `+${magnitude} ${stat}!`, '#00b894');
}

function selectMode(mode, el) {
  protoState.selectedMode = mode;
  audioEngine.playSFX('tab-switch');
  document.querySelectorAll('.arena-mode-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function selectOpponent(id, name, rarity, el) {
  audioEngine.playSFX('btn-click');
  document.querySelectorAll('.card[id^="opp-"]').forEach(c => c.style.borderColor = '');
  if (el) el.style.borderColor = 'var(--color-accent)';
}

function startBattle(oppId, oppName, oppRarity, isAI) {
  protoState.battleOpponent = { id: oppId, name: oppName, rarity: oppRarity, isAI };
  router.navigate('screen-13');
  startBattleSimulation();
}

function skipBattle() {
  clearBattleTimers();
  const outcome = MOCK_DATA.battleHistory[0].outcome;
  if (outcome === 'WIN') {
    audioEngine.playSFX('arena-victory');
    fxEngine.victoryBurst(document.querySelector('.combatant'));
  } else {
    audioEngine.playSFX('arena-defeat');
  }
  setTimeout(() => router.navigate('screen-10'), 400);
}

function startBattleSimulation() {
  clearBattleTimers();
  const logEl = document.getElementById('battle-log-entries');
  const myHP  = document.getElementById('my-hp');
  const oppHP = document.getElementById('opp-hp');
  const myHPTxt  = document.getElementById('my-hp-text');
  const oppHPTxt = document.getElementById('opp-hp-text');
  let myHpVal  = 100;
  let oppHpVal = 100;
  let turn = 0;
  const myPet = MOCK_DATA.myPet;
  const opp   = MOCK_DATA.pets[1];
  const isRace = (protoState.selectedMode || 'RACE') === 'RACE';

  const myStrength  = isRace ? myPet.statSpeed    : myPet.statStrength;
  const oppStrength = isRace ? opp.statSpeed       : opp.statStrength;

  const logLines = [
    `▶ ${myPet.petName} vs ${opp.petName}`,
    `▶ ${isRace ? 'RACE' : 'SUMO'}: ${isRace ? 'Speed' : 'Strength'} determines the outcome`,
    `▶ Your ${isRace ? 'SPEED' : 'STRENGTH'}: ${myStrength} vs ${oppStrength}`,
    `▶ Round 1 — ${myPet.petName} charges forward!`,
    `▶ ${opp.petName} responds with a swift counter!`,
    `▶ Round 2 — Momentum builds!`,
    `▶ ${myStrength > oppStrength ? myPet.petName + ' pulls ahead!' : opp.petName + ' takes the lead!'}`,
    `▶ Round 3 — Final push!`,
    `▶ ${myStrength >= oppStrength ? '🎉 ' + myPet.petName + ' WINS the battle!' : '💀 ' + opp.petName + ' claims victory!'}`
  ];

  let lineIdx = 0;
  protoState.battleTimerInterval = setInterval(() => {
    if (!document.getElementById('battle-log-entries')) { clearBattleTimers(); return; }
    if (lineIdx < logLines.length) {
      const div = document.createElement('div');
      div.textContent = logLines[lineIdx];
      div.style.color = lineIdx === logLines.length - 1
        ? (myStrength >= oppStrength ? 'var(--color-success)' : 'var(--color-error)')
        : (lineIdx % 2 === 0 ? '#74b9ff' : '#fd79a8');
      if (logEl) { logEl.appendChild(div); logEl.scrollTop = logEl.scrollHeight; }
      lineIdx++;
      // animate HP bars
      if (lineIdx >= 4) {
        if (myStrength >= oppStrength) {
          oppHpVal = Math.max(0, oppHpVal - 25);
          myHpVal  = Math.max(60, myHpVal - 8);
        } else {
          myHpVal  = Math.max(0, myHpVal - 25);
          oppHpVal = Math.max(60, oppHpVal - 8);
        }
        if (myHP)    myHP.style.width    = myHpVal + '%';
        if (oppHP)   oppHP.style.width   = oppHpVal + '%';
        if (myHPTxt)  myHPTxt.textContent  = myHpVal;
        if (oppHPTxt) oppHPTxt.textContent = oppHpVal;
      }
      // animate combatants
      if (lineIdx === 4) {
        const myEl  = document.getElementById('my-combatant');
        const oppEl = document.getElementById('opp-combatant');
        if (myEl)  { myEl.style.animation  = 'battle-attack 0.4s ease'; setTimeout(() => { if (myEl)  myEl.style.animation  = ''; }, 500); }
        if (oppEl) { oppEl.style.animation = 'battle-hit 0.4s ease';    setTimeout(() => { if (oppEl) oppEl.style.animation = ''; }, 500); }
      }
    } else {
      clearBattleTimers();
      if (myStrength >= oppStrength) {
        audioEngine.playSFX('arena-victory');
        fxEngine.victoryBurst(document.getElementById('my-combatant'));
      } else {
        audioEngine.playSFX('arena-defeat');
      }
      setTimeout(() => router.navigate('screen-10'), 1500);
    }
  }, 800);
}

function clearBattleTimers() {
  if (protoState.battleTimerInterval) { clearInterval(protoState.battleTimerInterval); protoState.battleTimerInterval = null; }
  if (protoState.otpTimerInterval)    { clearInterval(protoState.otpTimerInterval);    protoState.otpTimerInterval    = null; }
}

function switchLbFilter(filter) {
  protoState.currentLbFilter = filter;
  audioEngine.playSFX('tab-switch');
  const lbData = MOCK_DATA.leaderboard;
  const rows = filter === 'ALL' ? lbData : lbData.filter(e => e.rarity === filter);
  const tbodyEl = document.getElementById('lb-rows');
  if (!tbodyEl) return;
  tbodyEl.innerHTML = rows.map(e => {
    const isMyPet = e.petId === MOCK_DATA.myPet.id;
    const rankCls = e.rank <= 3 ? `rank-${e.rank}` : '';
    return `
    <tr style="${isMyPet ? 'background:rgba(108,92,231,0.12)' : ''}">
      <td><span class="rank-badge ${rankCls}">${e.rank}</span></td>
      <td>
        <div class="font-display" style="font-size:9px;color:var(--color-text-primary)">${e.petName}${isMyPet ? ' <span style="color:var(--color-accent);font-size:7px">(YOU)</span>' : ''}</div>
        <div class="mt-xs">${rarityBadge(e.rarity)}</div>
      </td>
      <td><span class="level-badge">LV.${e.level}</span></td>
      <td><span class="font-display" style="font-size:11px;color:var(--color-accent)">${e.arenaScore.toLocaleString()}</span></td>
      <td><span class="${e.winRate >= 0.7 ? 'text-success' : e.winRate >= 0.55 ? 'text-accent' : 'text-error'}">${Math.round(e.winRate*100)}%</span></td>
      <td class="text-muted text-sm">${e.battlesPlayed}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-11');audioEngine.playSFX('nav-click')">View</button></td>
    </tr>`;
  }).join('');

  document.querySelectorAll('#lb-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().replace(/^⚡ /,'') === filter || (filter === 'ALL' && btn.textContent.includes('ALL')));
  });
}

function switchOpponentTab(type, btn) {
  audioEngine.playSFX('tab-switch');
  document.querySelectorAll('#opponent-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const listEl = document.getElementById('opponent-list');
  if (!listEl) return;
  if (type === 'ai') {
    listEl.innerHTML = `
    <div class="stagger" style="display:flex;flex-direction:column;gap:var(--space-sm)">
      ${['Rookie AI','Veteran AI','Champion AI'].map((name, i) => `
      <div class="card card-sm flex items-center gap-md">
        <div class="pixel-canvas-wrapper" style="width:56px;height:56px;flex-shrink:0;background:#0d0d1a">
          <canvas data-seed="${1000+i}" data-rarity="COMMON" data-size="56" class="opp-canvas" style="display:block;image-rendering:pixelated"></canvas>
        </div>
        <div class="flex-1">
          <div class="font-display" style="font-size:9px">🤖 ${name}</div>
          <div class="text-muted text-xs mt-xs">Difficulty: ${'★'.repeat(i+1)}${'☆'.repeat(2-i)}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="startBattle(null,'${name}','COMMON',true);audioEngine.playSFX('arena-start')">FIGHT AI</button>
      </div>`).join('')}
    </div>`;
    renderAllCanvases();
  } else {
    listEl.innerHTML = `<div class="stagger" style="display:flex;flex-direction:column;gap:var(--space-sm)">
      ${MOCK_DATA.pets.filter(p => p.id !== MOCK_DATA.myPet.id).slice(0,4).map(opp => `
      <div class="card card-sm flex items-center gap-md">
        <div class="pixel-canvas-wrapper" style="width:56px;height:56px;flex-shrink:0">
          <canvas data-seed="${opp.seed}" data-rarity="${opp.rarity}" data-size="56" class="opp-canvas" style="display:block;image-rendering:pixelated"></canvas>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-sm flex-wrap">
            <span class="font-display" style="font-size:9px">${opp.petName}</span>
            ${rarityBadge(opp.rarity)}
            <span class="level-badge">LV.${opp.level}</span>
          </div>
          <div class="flex gap-md mt-xs">
            <span class="stat-name">SPD: <span style="color:#74b9ff">${opp.statSpeed}</span></span>
            <span class="stat-name">STR: <span style="color:#fd79a8">${opp.statStrength}</span></span>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="startBattle('${opp.id}','${opp.petName}','${opp.rarity}',false);audioEngine.playSFX('arena-start')">CHALLENGE</button>
      </div>`).join('')}
    </div>`;
    renderAllCanvases();
  }
}

function filterListings(query) {
  const search  = (query || document.getElementById('market-search')?.value || '').toLowerCase();
  const rarity  = document.getElementById('market-rarity-filter')?.value || '';
  document.querySelectorAll('#listing-grid .listing-card').forEach(card => {
    const nameMatch   = !search || card.dataset.name.includes(search);
    const rarityMatch = !rarity || card.dataset.rarity === rarity;
    card.style.display = (nameMatch && rarityMatch) ? '' : 'none';
  });
}

function showListMyPetModal() {
  audioEngine.playSFX('btn-click');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
  <div class="modal-content">
    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
    <h2>List My Pet</h2>
    <p class="mt-xs">Listing your pet makes it visible to other players for trade requests. You retain full control until you confirm a trade.</p>
    <div class="form-group mt-md">
      <label>Your Pet</label>
      <div class="card card-sm flex items-center gap-md">
        <div>
          <div class="font-display" style="font-size:9px">${MOCK_DATA.myPet.petName}</div>
          ${rarityBadge(MOCK_DATA.myPet.rarity)}
        </div>
      </div>
    </div>
    <div class="form-group">
      <label>Description (shown to other players)</label>
      <textarea rows="3" placeholder="Tell potential traders about your pet..."></textarea>
    </div>
    <div class="alert alert-warning">⚠️ Listing does not transfer ownership. You must confirm any trade request separately.</div>
    <div class="flex gap-md mt-md">
      <button class="btn btn-primary flex-1" onclick="this.closest('.modal-overlay').remove();audioEngine.playSFX('btn-click')">LIST PET</button>
      <button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function handleTradeRequest(listingId, petName) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
  <div class="modal-content">
    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
    <h2>Trade Request</h2>
    <p class="mt-xs">Send a trade request for <strong style="color:var(--color-accent)">${petName}</strong>. The owner will receive your request and can accept or decline.</p>
    <div class="form-group mt-md">
      <label>Your Pet (Offered in Trade)</label>
      <div class="card card-sm">${MOCK_DATA.myPet.petName} · ${rarityBadge(MOCK_DATA.myPet.rarity)}</div>
    </div>
    <div class="form-group">
      <label>Message to Owner (Optional)</label>
      <textarea rows="2" placeholder="Hi! I'd love to trade for your pet..."></textarea>
    </div>
    <div class="alert alert-info">ℹ️ Trade requests expire after 48 hours. Both parties must confirm for a trade to complete.</div>
    <div class="flex gap-md mt-md">
      <button class="btn btn-primary flex-1" onclick="this.closest('.modal-overlay').remove();audioEngine.playSFX('claim-success')">SEND REQUEST</button>
      <button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function handleShareResult() {
  navigator.clipboard.writeText('I just battled in Pixel Pet Arena! Check out pixelpetarena.com').then(() => {
    audioEngine.playSFX('copy-success');
  }).catch(() => {});
}

/* ============================================================
   Canvas rendering helpers
   ============================================================ */
function renderAllCanvases() {
  requestAnimationFrame(() => {
    // Landing
    const landingCanvas = document.getElementById('landing-pet-canvas');
    if (landingCanvas) { landingCanvas.width = 128; landingCanvas.height = 128; drawPetSprite(landingCanvas, MOCK_DATA.myPet.seed, MOCK_DATA.myPet.rarity, 128); }

    // My Pet screen
    const myPetCanvas = document.getElementById('mypet-canvas');
    if (myPetCanvas) { myPetCanvas.width = 192; myPetCanvas.height = 192; drawPetSprite(myPetCanvas, MOCK_DATA.myPet.seed, MOCK_DATA.myPet.rarity, 192); }

    // Training mini
    const trainMini = document.getElementById('train-pet-mini');
    if (trainMini) { trainMini.width = 80; trainMini.height = 80; drawPetSprite(trainMini, MOCK_DATA.myPet.seed, MOCK_DATA.myPet.rarity, 80); }

    // Reveal canvas
    const revealCanvas = document.getElementById('reveal-pet-canvas');
    if (revealCanvas) { revealCanvas.width = 128; revealCanvas.height = 128; drawPetSprite(revealCanvas, MOCK_DATA.myPet.seed, MOCK_DATA.myPet.rarity, 128); }

    // Records canvas
    const recordsCanvas = document.getElementById('records-pet-canvas');
    if (recordsCanvas) { recordsCanvas.width = 88; recordsCanvas.height = 88; drawPetSprite(recordsCanvas, MOCK_DATA.myPet.seed, MOCK_DATA.myPet.rarity, 88); }

    // Battle canvases
    const battleMy  = document.getElementById('battle-my-canvas');
    const battleOpp = document.getElementById('battle-opp-canvas');
    if (battleMy)  { battleMy.width  = 128; battleMy.height  = 128; drawPetSprite(battleMy,  MOCK_DATA.myPet.seed, MOCK_DATA.myPet.rarity, 128); }
    if (battleOpp) { battleOpp.width = 128; battleOpp.height = 128; drawPetSprite(battleOpp, MOCK_DATA.pets[1].seed, MOCK_DATA.pets[1].rarity, 128); }

    // Result canvases
    const resultMy  = document.getElementById('result-my-canvas');
    const resultOpp = document.getElementById('result-opp-canvas');
    if (resultMy)  { resultMy.width  = 96; resultMy.height  = 96; drawPetSprite(resultMy,  MOCK_DATA.myPet.seed,     MOCK_DATA.myPet.rarity,     96); }
    if (resultOpp) { resultOpp.width = 96; resultOpp.height = 96; drawPetSprite(resultOpp, MOCK_DATA.pets[1].seed, MOCK_DATA.pets[1].rarity, 96); }

    // Opponent canvases (lobby)
    document.querySelectorAll('canvas.opp-canvas').forEach(c => {
      const seed   = parseInt(c.dataset.seed) || 12345;
      const rarity = c.dataset.rarity || 'COMMON';
      const size   = parseInt(c.dataset.size) || 56;
      c.width = size; c.height = size;
      drawPetSprite(c, seed, rarity, size);
    });

    // Listing canvases
    document.querySelectorAll('canvas.listing-canvas').forEach(c => {
      const seed   = parseInt(c.dataset.seed) || 12345;
      const rarity = c.dataset.rarity || 'COMMON';
      const size   = parseInt(c.dataset.size) || 56;
      c.width = size; c.height = size;
      drawPetSprite(c, seed, rarity, size);
    });
  });
}

/* ============================================================
   OTP Timer
   ============================================================ */
function startOTPTimer() {
  const timerEl = document.getElementById('otp-timer');
  if (!timerEl) return;
  let secs = 900;
  if (protoState.otpTimerInterval) clearInterval(protoState.otpTimerInterval);
  protoState.otpTimerInterval = setInterval(() => {
    if (!document.getElementById('otp-timer')) { clearInterval(protoState.otpTimerInterval); return; }
    secs = Math.max(0, secs - 1);
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    const el = document.getElementById('otp-timer');
    if (el) el.textContent = `${m}:${s}`;
    if (secs === 0) clearInterval(protoState.otpTimerInterval);
  }, 1000);
}

/* ============================================================
   OTP keyboard navigation
   ============================================================ */
function setupOTPInputs() {
  const digits = document.querySelectorAll('.otp-digit');
  if (!digits.length) return;
  digits[0].focus();
  digits.forEach((inp, idx) => {
    inp.addEventListener('input', e => {
      inp.value = inp.value.replace(/\D/g,'').slice(-1);
      if (inp.value && idx < digits.length - 1) digits[idx + 1].focus();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && idx > 0) { digits[idx - 1].focus(); digits[idx-1].value = ''; }
    });
    inp.addEventListener('paste', e => {
      e.preventDefault();
      const data = e.clipboardData.getData('text').replace(/\D/g,'');
      digits.forEach((d, i) => { d.value = data[i] || ''; });
      digits[Math.min(data.length, 5)].focus();
    });
  });
}

/* ============================================================
   Landing page reveal timer (30 seconds)
   ============================================================ */
function startLandingReveal() {
  const loadingEl = document.getElementById('landing-loading');
  const ctaEl     = document.getElementById('claim-cta-btn');
  if (!loadingEl || !ctaEl) return;
  const steps = ['▓▓▓░░░', '▓▓▓▓░░', '▓▓▓▓▓░', '▓▓▓▓▓▓'];
  let step = 0;
  const interval = setInterval(() => {
    if (!document.getElementById('landing-loading')) { clearInterval(interval); return; }
    step++;
    const el = document.getElementById('landing-loading');
    if (el) el.textContent = (steps[Math.min(step, steps.length-1)] || '▓▓▓▓▓▓') + ' GENERATING YOUR PET...';
    if (step >= steps.length - 1) {
      clearInterval(interval);
      const loading = document.getElementById('landing-loading');
      const cta     = document.getElementById('claim-cta-btn');
      if (loading) loading.style.display = 'none';
      if (cta)     cta.style.display = 'block';
      const canv = document.getElementById('landing-pet-canvas');
      if (canv) drawPetSprite(canv, MOCK_DATA.myPet.seed, MOCK_DATA.myPet.rarity, 128);
      audioEngine.playSFX('stat-ding');
    }
  }, 800);
}

/* ============================================================
   bindCurrentScreenEvents — called after each navigate
   ============================================================ */
function bindCurrentScreenEvents() {
  const id = router.current;

  // Always render canvases
  renderAllCanvases();

  switch (id) {
    case 'screen-01':
      startLandingReveal();
      const landingPet = document.getElementById('landing-pet-canvas');
      if (landingPet) {
        landingPet.addEventListener('click', () => {
          audioEngine.playSFX('pet-tap');
          fxEngine.petTapBurst(landingPet);
        });
      }
      break;

    case 'screen-03':
      setupOTPInputs();
      startOTPTimer();
      break;

    case 'screen-07':
      const mypetEl = document.getElementById('mypet-canvas');
      if (mypetEl) {
        mypetEl.addEventListener('click', () => {
          audioEngine.playSFX('pet-tap');
          fxEngine.petTapBurst(mypetEl);
        });
      }
      break;

    case 'screen-10':
      const resultText = document.getElementById('result-text');
      if (resultText && resultText.classList.contains('result-win')) {
        setTimeout(() => { audioEngine.playSFX('arena-victory'); fxEngine.victoryBurst(resultText); }, 300);
      } else if (resultText) {
        setTimeout(() => audioEngine.playSFX('arena-defeat'), 300);
      }
      break;

    case 'screen-13':
      setTimeout(() => startBattleSimulation(), 400);
      break;
  }
}

/* ============================================================
   Flow Map Modal
   ============================================================ */
function showFlowMap() {
  const existing = document.getElementById('flowmap-modal');
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'flowmap-modal';
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const screens = Object.entries(SCREEN_NAMES);
  overlay.innerHTML = `
  <div class="modal-content" style="max-width:760px">
    <button class="modal-close" onclick="document.getElementById('flowmap-modal').remove()">✕</button>
    <h2 class="mb-md">🗺️ Screen Flow Map</h2>
    <p class="mb-lg text-sm">All 14 player-facing screens. Click any to navigate directly.</p>
    <div class="flowmap-grid">
      ${screens.map(([id, name]) => `
      <div class="flowmap-item ${router.current === id ? 'current' : ''}"
           onclick="document.getElementById('flowmap-modal').remove();router.navigate('${id}');audioEngine.playSFX('nav-click')">
        <div class="flowmap-screen-id">${id}</div>
        <div class="flowmap-screen-name">${name}</div>
      </div>`).join('')}
    </div>
    <div class="mt-lg divider"></div>
    <div class="text-center mt-md">
      <span class="text-muted text-xs">Current screen: <strong style="color:var(--color-accent)">${SCREEN_NAMES[router.current] || router.current}</strong></span>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function hideFlowMap() {
  const el = document.getElementById('flowmap-modal');
  if (el) el.remove();
}

/* ============================================================
   Register all routes
   ============================================================ */
router.register('screen-01', renderScreen01);
router.register('screen-02', renderScreen02);
router.register('screen-03', renderScreen03);
router.register('screen-04', renderScreen04);
router.register('screen-05', renderScreen05);
router.register('screen-06', renderScreen06);
router.register('screen-07', renderScreen07);
router.register('screen-08', renderScreen08);
router.register('screen-09', renderScreen09);
router.register('screen-10', renderScreen10);
router.register('screen-11', renderScreen11);
router.register('screen-12', renderScreen12);
router.register('screen-13', renderScreen13);
router.register('screen-14', renderScreen14);
