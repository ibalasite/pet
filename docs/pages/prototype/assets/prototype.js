/* ============================================================
   Pixel Pet Arena — Prototype Router + 10 screen renders
   ============================================================ */

/* ----- DOM helpers ----- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
  } catch (e) {
    return iso;
  }
};

const daysAgo = (iso) => {
  if (!iso) return Infinity;
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (1000 * 60 * 60 * 24);
};

/* ----- Toast ----- */
function toast(msg, type = 'success') {
  const c = $('#toast-container');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'fadeIn 200ms reverse';
    setTimeout(() => { try { el.remove(); } catch (e) { /* ignore */ } }, 220);
  }, 3000);
}

/* ----- ID sanitizer for inline JS contexts -----
   All MOCK ids are UUIDs or short slugs; whitelist alphanumeric+dash to prevent
   any chance of breaking out of a single-quoted JS string in onclick. */
function safeJSId(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

/* ----- Pet sprite HTML helper -----
   Note: defensive escaping. Although all callers are internal, we whitelist
   ids/classes to a safe charset to prevent any chance of HTML injection if
   pet data is ever loaded from an external source in the future. */
const SAFE_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const SAFE_RARITY = new Set(['COMMON', 'RARE', 'EPIC', 'LEGENDARY']);

function petCanvasHTML(pet, opts = {}) {
  if (!pet) return '<div class="pet-canvas"></div>';
  const size = opts.size || 'normal';
  const sizeCls =
    size === 'large' ? 'pet-canvas--large' :
    size === 'small' ? 'pet-canvas--small' :
    size === 'thumb' ? 'pet-canvas--thumb' : '';
  const rarity = String(pet.rarity || '').toUpperCase();
  const rarityCls = SAFE_RARITY.has(rarity) ? `pet-canvas--${rarity.toLowerCase()}` : '';
  const neglectCls = opts.neglect ? 'pet-canvas--neglect' : '';
  const animCls = (opts.animClass && SAFE_ID_RE.test(opts.animClass)) ? opts.animClass : '';
  // Use data-action instead of inline onclick. The mount step wires the listener.
  const action = (opts.onClick && SAFE_ID_RE.test(opts.onClick.replace(/\(.*\)$/, '')))
    ? `data-action="${escapeHTML(opts.onClick)}"`
    : '';
  const idAttr = (opts.id && SAFE_ID_RE.test(opts.id)) ? `id="${opts.id}"` : '';
  // pet.sprite is an emoji from a controlled SPRITE_BY_NAME map; escape defensively.
  const sprite = escapeHTML(pet.sprite || '🐾');
  return `
    <div class="pet-canvas ${sizeCls} ${rarityCls} ${neglectCls}" ${idAttr} ${action} role="img" aria-label="${escapeHTML(pet.pet_name)}">
      <div class="pet-bg-grid"></div>
      <div class="pet-shadow"></div>
      <div class="pet-sprite ${animCls}">${sprite}</div>
    </div>
  `;
}

/* ----- Rarity badge ----- */
function rarityBadgeHTML(rarity) {
  const r = String(rarity).toUpperCase();
  return `<span class="rarity-badge rarity-badge--${r.toLowerCase()}">${r}</span>`;
}

/* ============================================================
   Router
   ============================================================ */
class PrototypeRouter {
  constructor() {
    this.screens = {};
    this.current = null;
    this.history = [];
    this.context = {};
    this._timers = [];
  }

  register(id, renderFn, opts = {}) {
    this.screens[id] = { id, render: renderFn, ...opts };
  }

  navigate(id, ctx = {}) {
    if (!this.screens[id]) {
      console.warn('Unknown screen', id);
      return;
    }
    if (this.current === id) return;
    this._clearTimers();
    // Push {id, ctx} pairs so back() can restore the exact context the previous screen was rendered with.
    if (this.current) this.history.push({ id: this.current, ctx: this.context });
    this.current = id;
    this.context = ctx;

    const def = this.screens[id];
    if (location.hash !== '#' + id) {
      history.replaceState(null, '', '#' + id);
    }

    const root = $('#proto-content');
    root.innerHTML = def.render(ctx);
    $('#breadcrumb').textContent = def.title || id;

    if (def.onMount) def.onMount(ctx);
    if (window.audioEngine && window.audioEngine.unlocked) {
      window.audioEngine.playSFX('SFX-002-pet-tap-click');
    }
    // PF-012: hide audio-unlock chip once audio context is unlocked
    const ub = document.getElementById('audio-unlock-btn');
    if (ub && window.audioEngine && window.audioEngine.unlocked) {
      ub.style.display = 'none';
    }
    this.updateBGMForScreen(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  back() {
    if (this.history.length === 0) {
      this.navigate('screen-01');
      return;
    }
    const prev = this.history.pop();
    if (!prev || prev.id === this.current) return;
    this._clearTimers();
    const { id: prevId, ctx: prevCtx } = prev;
    this.current = prevId;
    this.context = prevCtx || {};
    const def = this.screens[prevId];
    if (!def) { this.navigate('screen-01'); return; }
    const root = $('#proto-content');
    root.innerHTML = def.render(this.context);
    $('#breadcrumb').textContent = def.title || prevId;
    if (def.onMount) def.onMount(this.context);
    this.updateBGMForScreen(prevId);
    history.replaceState(null, '', '#' + prevId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  registerTimer(id) { this._timers.push(id); }
  _clearTimers() {
    // Both clearTimeout and clearInterval accept the same numeric ID type;
    // run both unconditionally so it handles either kind without short-circuit logic bugs.
    this._timers.forEach((t) => {
      try { clearTimeout(t); } catch (e) { /* ignore */ }
      try { clearInterval(t); } catch (e) { /* ignore */ }
    });
    this._timers = [];
  }

  updateBGMForScreen(id) {
    if (!window.audioEngine || !window.audioEngine.unlocked) return;
    const ARENA = ['screen-05', 'screen-06'];
    const TRAINER = ['screen-03', 'screen-04'];
    if (ARENA.includes(id)) {
      window.audioEngine.startBGM('BGM-001');
    } else if (TRAINER.includes(id)) {
      window.audioEngine.startBGM('BGM-002');
    } else {
      window.audioEngine.stopBGM();
    }
  }

  init() {
    const initial = (location.hash || '').slice(1) || 'screen-01';
    this.navigate(initial);
  }
}
const router = new PrototypeRouter();
window.router = router;

/* ============================================================
   Flow map
   ============================================================ */
function showFlowMap() {
  const grid = $('#screen-grid');
  if (!grid) return;
  const tiles = Object.keys(router.screens).map((id) => {
    const s = router.screens[id];
    const safeId = safeJSId(id);
    return `<div class="screen-tile" tabindex="0" role="button" onclick="router.navigate('${safeId}'); hideFlowMap();" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();router.navigate('${safeId}');hideFlowMap();}">
      <div class="tile-id">${escapeHTML(safeId)}</div>
      <div class="tile-name">${escapeHTML(s.title || '')}</div>
    </div>`;
  }).join('');
  grid.innerHTML = tiles;
  $('#flow-map-modal').hidden = false;
}
function hideFlowMap() {
  $('#flow-map-modal').hidden = true;
}
window.showFlowMap = showFlowMap;
window.hideFlowMap = hideFlowMap;

/* ============================================================
   Screen 01 — Landing Page
   ============================================================ */
function renderScreen01() {
  const M = window.MOCK;
  const pet = M.currentPet;
  return `
    <section class="screen" id="landing">
      <div class="hero">
        ${petCanvasHTML(pet, { size: 'large', id: 'landing-pet' })}
        <h1>Pixel Pet Arena</h1>
        <p class="tagline">It only takes a second to fall in love with this pet.</p>
        <div class="social-proof">
          <span class="pulse-dot"></span>
          <span>${M.metrics.claimed_today.toLocaleString()} pets claimed today</span>
        </div>
        <div class="mt-4">
          ${rarityBadgeHTML(pet.rarity)}
        </div>
        <div class="mt-6">
          <button class="btn btn-ghost" onclick="router.navigate('screen-07')">🏆 View Leaderboard</button>
        </div>
        <p class="card-meta" style="opacity:0.6; font-size:0.75rem; margin-top:8px;">Demo: ClaimCTA 在 3 秒內顯現（規格為 30 秒）</p>
      </div>
      <div id="claim-cta-slot"></div>
    </section>
  `;
}

function onMountScreen01() {
  // Click pet for hop
  const pet = $('#landing-pet');
  if (pet) {
    pet.addEventListener('click', () => {
      const sprite = pet.querySelector('.pet-sprite');
      sprite.classList.remove('pet-anim-hop');
      void sprite.offsetWidth;
      sprite.classList.add('pet-anim-hop');
      window.audioEngine.playSFX('SFX-001-pet-tap-pop');
    });
  }
  // Reveal Claim CTA after 3s (spec is 30s, condensed for prototype)
  const t = setTimeout(() => {
    const slot = $('#claim-cta-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div class="claim-cta-floating">
        <button class="btn btn-large" onclick="router.navigate('screen-02')">
          ✨ Claim This Pet →
        </button>
      </div>
    `;
  }, 3000);
  router.registerTimer(t);
}

/* ============================================================
   Screen 02 — Claim Pet (3-step wizard)
   ============================================================ */
const ClaimState = { step: 1, email: '', code: '' };
function renderScreen02() {
  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Claim Your Pet</h1>
      </div>
      <div class="card" style="max-width: 560px; margin: 0 auto;">
        <div class="wizard-steps">
          <div class="wizard-step ${ClaimState.step >= 1 ? (ClaimState.step > 1 ? 'wizard-step--done' : 'wizard-step--active') : ''}">1</div>
          <div class="wizard-line"></div>
          <div class="wizard-step ${ClaimState.step >= 2 ? (ClaimState.step > 2 ? 'wizard-step--done' : 'wizard-step--active') : ''}">2</div>
          <div class="wizard-line"></div>
          <div class="wizard-step ${ClaimState.step >= 3 ? 'wizard-step--active' : ''}">3</div>
        </div>
        <div id="claim-step-body">${renderClaimStep()}</div>
      </div>
    </section>
  `;
}

function renderClaimStep() {
  if (ClaimState.step === 1) {
    return `
      <h3 class="card-title">Step 1 · Email</h3>
      <p class="text-secondary">We'll send a 6-digit code to your email. No password required.</p>
      <div class="form-field">
        <label for="claim-email">Email address</label>
        <input id="claim-email" type="email" class="form-input" placeholder="you@example.com" value="${escapeHTML(ClaimState.email)}">
      </div>
      <button class="btn w-full" onclick="claimSendCode()">📧 Send code</button>
      <p class="card-meta mt-3">Demo: any valid email works. The code is shown on the next step.</p>
    `;
  }
  if (ClaimState.step === 2) {
    const codeStr = ClaimState.code.padEnd(6, ' ');
    return `
      <h3 class="card-title">Step 2 · Enter the 6-digit code</h3>
      <p class="text-secondary">Code sent to <strong class="text-accent">${escapeHTML(ClaimState.email || 'you@example.com')}</strong></p>
      <div class="banner banner--warning"><span>⏱</span><span>Code expires in <span id="otp-countdown">5:00</span></span></div>
      <div id="code-digits" class="code-digits">
        ${[0,1,2,3,4,5].map(i => `
          <input class="code-digit" maxlength="1" inputmode="numeric" data-idx="${i}" value="${escapeHTML(codeStr[i] === ' ' ? '' : codeStr[i])}">
        `).join('')}
      </div>
      <p class="card-meta text-center">Demo code: <strong class="text-accent">123456</strong></p>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="ClaimState.step=1; refreshClaimStep();">← Back</button>
        <button class="btn" onclick="claimVerifyCode()">Verify</button>
      </div>
    `;
  }
  // Step 3
  const pet = window.MOCK.currentPet;
  return `
    <h3 class="card-title">Step 3 · Welcome!</h3>
    <div class="text-center" style="padding: var(--space-4) 0;">
      ${petCanvasHTML(pet, { size: 'normal', id: 'claim-pet-reveal' })}
      <h2 class="mt-4 text-accent">${escapeHTML(pet.pet_name)}</h2>
      <div class="mt-2">${rarityBadgeHTML(pet.rarity)}</div>
    </div>
    <div class="banner banner--success">
      <span>🏠</span>
      <span>Your pet's home is at <code class="text-accent">/pet/${pet.id.slice(0,8)}</code></span>
    </div>
    <button class="btn w-full" onclick="router.navigate('screen-03')">Visit Now →</button>
  `;
}

function refreshClaimStep() {
  const root = $('#claim-step-body');
  if (!root) return;
  // Re-render the wizard steps dots:
  const stepDots = $$('#proto-content .wizard-step');
  if (stepDots.length) {
    stepDots.forEach((el, idx) => {
      const stepNum = idx + 1;
      el.classList.remove('wizard-step--active', 'wizard-step--done');
      if (stepNum < ClaimState.step) el.classList.add('wizard-step--done');
      else if (stepNum === ClaimState.step) el.classList.add('wizard-step--active');
    });
  }
  root.innerHTML = renderClaimStep();
  if (ClaimState.step === 2) bindCodeDigits();
}

function claimSendCode() {
  const email = ($('#claim-email').value || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast('Please enter a valid email', 'error');
    window.audioEngine.playSFX('SFX-invalid');
    return;
  }
  ClaimState.email = email;
  ClaimState.step = 2;
  refreshClaimStep();
  startOtpCountdown();
  window.audioEngine.playSFX('SFX-009-claim-success');
  toast('Code sent. Check your email.');
}

let otpInterval = null;
function startOtpCountdown() {
  if (otpInterval) clearInterval(otpInterval);
  let s = 5 * 60;
  const tick = () => {
    const el = $('#otp-countdown');
    if (!el) { clearInterval(otpInterval); return; }
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    el.textContent = `${m}:${ss}`;
    if (s <= 0) { clearInterval(otpInterval); el.textContent = 'expired'; }
    s--;
  };
  tick();
  otpInterval = setInterval(tick, 1000);
}

function bindCodeDigits() {
  const inputs = $$('.code-digit');
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', (ev) => {
      const v = ev.target.value.replace(/\D/g, '').slice(0, 1);
      ev.target.value = v;
      ClaimState.code = inputs.map(x => x.value).join('');
      if (v && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Backspace' && !ev.target.value && i > 0) inputs[i - 1].focus();
    });
  });
  if (inputs[0]) inputs[0].focus();
}

function claimVerifyCode() {
  const code = ClaimState.code;
  if (code !== window.MOCK.otp_code) {
    const wrap = $('#code-digits');
    if (wrap) {
      wrap.classList.add('is-invalid');
      window.fxEngine.shakeElement(wrap, 'normal', 300);
      setTimeout(() => wrap.classList.remove('is-invalid'), 600);
    }
    window.audioEngine.playSFX('SFX-invalid');
    toast('Invalid code. Try ' + window.MOCK.otp_code, 'error');
    return;
  }
  ClaimState.step = 3;
  refreshClaimStep();
  window.audioEngine.playSFX('SFX-009-claim-success');
  setTimeout(() => {
    window.fxEngine.emitBurstAt($('#claim-pet-reveal'), { count: 18, char: '★' });
  }, 80);
  // anim-20-rarity-reveal: spring-scale on the RarityBadge inside the success step
  requestAnimationFrame(() => {
    const badge = document.querySelector('#claim-step-body .rarity-badge');
    if (badge) {
      badge.classList.remove('rarity-badge--reveal');
      void badge.offsetWidth; // force reflow so animation restarts
      badge.classList.add('rarity-badge--reveal');
    }
  });
}
window.claimSendCode = claimSendCode;
window.claimVerifyCode = claimVerifyCode;

/* ============================================================
   Screen 03 — My Pet
   ============================================================ */
function renderScreen03() {
  const M = window.MOCK;
  const pet = M.currentPet;
  const neglected = daysAgo(pet.last_trained_at) > 3;
  return `
    <section class="screen">
      <div class="screen-title">
        <div>
          <h1>${escapeHTML(pet.pet_name)}</h1>
          <p class="card-meta">Owner ${escapeHTML(pet.masked_email)} · Seed ${pet.seed}</p>
        </div>
        <div class="flex gap-3">
          ${rarityBadgeHTML(pet.rarity)}
          <span class="streak-badge">🔥 Day ${M.metrics.training_streak} streak</span>
        </div>
      </div>

      ${neglected ? `<div class="banner banner--warning"><span>😴</span><span>Your pet looks neglected. Last trained ${Math.floor(daysAgo(pet.last_trained_at))} days ago.</span></div>` : ''}

      <div class="grid-pet-layout">
        <div class="card pet-info">
          ${petCanvasHTML(pet, { size: 'normal', id: 'mypet-canvas', onClick: 'onPetCanvasClick()' })}
          <div class="pet-name">${escapeHTML(pet.pet_name)}</div>
          <div class="pet-level">Lv.${pet.level} · ${pet.total_training_actions} training actions</div>
          <div class="card-meta">Last trained: ${formatDate(pet.last_trained_at)}</div>
        </div>

        <div class="card">
          <h3 class="card-title">Stats</h3>
          ${statBarHTML('speed', 'Speed', pet.stat_speed)}
          ${statBarHTML('strength', 'Strength', pet.stat_strength)}
          ${statBarHTML('stamina', 'Stamina', pet.stat_stamina)}
          <div class="mt-6">
            <h3 class="card-title">Quick actions</h3>
            <div class="flex gap-3" style="flex-wrap:wrap;">
              <button class="btn" onclick="router.navigate('screen-04')">🏋️ Train</button>
              <button class="btn btn-success" onclick="router.navigate('screen-05')">⚔️ Enter Arena</button>
              <button class="btn btn-secondary" onclick="router.navigate('screen-08', { petId: '${safeJSId(pet.id)}' })">📜 Battle Records</button>
              <button class="btn btn-secondary" onclick="router.navigate('screen-09')">🛒 Marketplace</button>
              <button class="btn btn-ghost" onclick="router.navigate('screen-10')">🛡️ GDPR</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">Food Inventory</h3>
          <div class="food-list">
            ${M.food.map(f => `
              <div class="food-item">
                <span class="food-icon">${f.icon}</span>
                <div class="food-item__info">
                  <div class="food-item__name">${escapeHTML(f.name)}</div>
                  <div class="food-item__buff">+${f.magnitude} ${f.buff_stat} · ${f.duration_hours}h · x${f.owned}</div>
                </div>
                <button class="btn btn-sm" ${f.owned <= 0 ? 'disabled' : ''} onclick="useFood('${safeJSId(f.id)}')">Use</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

function statBarHTML(key, label, value) {
  return `
    <div class="stat-bar">
      <div class="stat-bar__label stat-bar__label--${key}">
        <strong>${label}</strong>
        <span class="stat-bar__value" data-stat="${key}">${value}</span>
      </div>
      <div class="stat-bar__track">
        <div class="stat-bar__fill stat-bar__fill--${key}" style="width: ${Math.min(100, value)}%;"></div>
      </div>
    </div>
  `;
}

function onPetCanvasClick() {
  const canvas = $('#mypet-canvas');
  if (!canvas) return;
  const sprite = canvas.querySelector('.pet-sprite');
  sprite.classList.remove('pet-anim-hop');
  void sprite.offsetWidth;
  sprite.classList.add('pet-anim-hop');
  window.audioEngine.playSFX('SFX-001-pet-tap-pop');
}
window.onPetCanvasClick = onPetCanvasClick;

function useFood(foodId) {
  const M = window.MOCK;
  const f = M.food.find(x => x.id === foodId);
  if (!f || f.owned <= 0) return;
  f.owned -= 1;
  // Apply buff to current pet
  const pet = M.currentPet;
  if (f.buff_stat === 'all') {
    pet.stat_speed = Math.min(99, pet.stat_speed + f.magnitude);
    pet.stat_strength = Math.min(99, pet.stat_strength + f.magnitude);
    pet.stat_stamina = Math.min(99, pet.stat_stamina + f.magnitude);
  } else {
    const k = 'stat_' + f.buff_stat;
    pet[k] = Math.min(99, (pet[k] || 0) + f.magnitude);
  }
  window.audioEngine.playSFX('SFX-012-food-buff');
  // Pet eat animation
  const sprite = $('#mypet-canvas .pet-sprite');
  if (sprite) {
    sprite.classList.remove('pet-anim-eat');
    void sprite.offsetWidth;
    sprite.classList.add('pet-anim-eat');
  }
  toast(`+${f.magnitude} ${f.buff_stat} buff applied!`);
  // Re-render screen after a moment
  setTimeout(() => router.navigate('screen-03'), 600);
}
window.useFood = useFood;

/* ============================================================
   Screen 04 — Training
   ============================================================ */
function renderScreen04() {
  const M = window.MOCK;
  const pet = M.currentPet;
  return `
    <section class="screen">
      <div class="screen-title">
        <div>
          <h1>Training</h1>
          <p class="card-meta">Pick an action. Each gives +1 stat. Daily reset in <span id="train-reset-countdown">--:--:--</span></p>
        </div>
        <div class="flex gap-3">
          <span class="streak-badge">🔥 Day ${M.metrics.training_streak} streak</span>
          <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-03')">← Back to My Pet</button>
        </div>
      </div>

      <div class="grid-pet-layout">
        <div class="card pet-info">
          ${petCanvasHTML(pet, { size: 'normal', id: 'training-pet-canvas' })}
          <div class="pet-name">${escapeHTML(pet.pet_name)}</div>
          <div class="pet-level">Lv.${pet.level}</div>
          <div class="mt-3">
            ${statBarHTML('speed', 'Speed', pet.stat_speed)}
            ${statBarHTML('strength', 'Strength', pet.stat_strength)}
            ${statBarHTML('stamina', 'Stamina', pet.stat_stamina)}
          </div>
        </div>

        <div class="card" style="grid-column: span 2;">
          <h3 class="card-title">Daily Actions</h3>
          <div class="training-grid">
            ${trainingCardHTML('run', '🏃', 'Run', 'speed')}
            ${trainingCardHTML('lift', '💪', 'Lift', 'strength')}
            ${trainingCardHTML('rest', '🧘', 'Endure', 'stamina')}
          </div>
          <p class="card-meta mt-4">Each action grants +1 to its corresponding stat. Resets every 24 hours.</p>
        </div>
      </div>
    </section>
  `;
}

function trainingCardHTML(id, icon, label, stat) {
  return `
    <div class="training-card" tabindex="0" role="button" onclick="doTrain('${safeJSId(id)}', '${safeJSId(stat)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();doTrain('${safeJSId(id)}', '${safeJSId(stat)}');}">
      <div class="training-icon">${escapeHTML(icon)}</div>
      <h3>${escapeHTML(label)}</h3>
      <div class="training-stat-target">+1 ${escapeHTML(stat.toUpperCase())}</div>
      <div class="training-cooldown" id="cool-${safeJSId(id)}">Ready</div>
    </div>
  `;
}

function onMountScreen04() {
  // Daily reset countdown to next midnight
  startResetCountdown();
}

let resetInterval = null;
function startResetCountdown() {
  if (resetInterval) clearInterval(resetInterval);
  const tick = () => {
    const el = $('#train-reset-countdown');
    if (!el) { clearInterval(resetInterval); return; }
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const ms = next - now;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  tick();
  resetInterval = setInterval(tick, 1000);
}

function doTrain(actionId, stat) {
  const M = window.MOCK;
  const pet = M.currentPet;
  window.audioEngine.playSFX('SFX-003-training-start');

  setTimeout(() => {
    pet['stat_' + stat] = Math.min(99, pet['stat_' + stat] + 1);
    pet.total_training_actions += 1;
    pet.last_trained_at = new Date().toISOString();

    // Level-up calculation: 1 level per 10 training actions
    const oldLevel = pet.level;
    const newLevel = Math.floor(pet.total_training_actions / 10) + 1;
    const leveledUp = newLevel > oldLevel;
    if (leveledUp) pet.level = newLevel;

    window.audioEngine.playSFX('SFX-004-training-success');
    setTimeout(() => window.audioEngine.playSFX('SFX-005-stat-ding'), 120);

    // Update stat bar
    const valEl = document.querySelector(`[data-stat="${stat}"]`);
    if (valEl) valEl.textContent = pet['stat_' + stat];
    const fillEl = document.querySelector(`.stat-bar__fill--${stat}`);
    if (fillEl) fillEl.style.width = Math.min(100, pet['stat_' + stat]) + '%';

    // Pet flex animation
    const sprite = $('#training-pet-canvas .pet-sprite');
    if (sprite) {
      sprite.classList.remove('pet-anim-flex');
      void sprite.offsetWidth;
      sprite.classList.add('pet-anim-flex');
    }

    // +1 floater on pet canvas
    window.fxEngine.spawnFloater($('#training-pet-canvas'), `+1 ${stat.toUpperCase()}`);
    // Confetti burst
    window.fxEngine.emitBurstAt($('#training-pet-canvas'), { count: 10, char: '+', size: 4 });

    toast(`+1 ${stat} training applied!`);

    // anim-15-levelup-burst: triggered when level threshold crossed
    if (leveledUp) {
      const canvas = document.querySelector('#training-pet-canvas');
      if (canvas && window.fxEngine) {
        const r = canvas.getBoundingClientRect();
        window.fxEngine.emitBurst(r.left + r.width / 2, r.top + r.height / 2, {
          count: 32, char: '✨',
          colors: ['#fdcb6e', '#a29bfe', '#7cb4e8', '#00b894'],
          speed: 6, life: 1500
        });
      }
      if (window.audioEngine) window.audioEngine.playSFX('SFX-007-arena-victory');
      // Re-render any pet-level labels currently on screen
      document.querySelectorAll('.pet-level').forEach((el) => {
        if (el.textContent && el.textContent.includes('Lv.')) {
          el.textContent = el.textContent.replace(/Lv\.\d+/, 'Lv.' + pet.level);
        }
      });
      toast(`🎉 Level ${pet.level} reached!`, 'success');
    }
  }, 220);
}
window.doTrain = doTrain;

/* ============================================================
   Screen 05 — Arena Lobby
   ============================================================ */
const ArenaState = { mode: 'RACE', matching: false };
function renderScreen05() {
  const M = window.MOCK;
  const pet = M.currentPet;
  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Arena</h1>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-03')">← Back</button>
      </div>

      <div id="rate-limit-slot"></div>

      <div class="card mb-4">
        <h3 class="card-title">Choose Battle Mode</h3>
        <div class="mode-grid">
          <div class="mode-card ${ArenaState.mode === 'RACE' ? 'is-selected' : ''}" id="mode-race" tabindex="0" role="button" onclick="selectMode('RACE')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectMode('RACE');}">
            <div class="mode-icon">🏃</div>
            <h2>RACE</h2>
            <p class="text-secondary">Speed × Stamina</p>
          </div>
          <div class="mode-card ${ArenaState.mode === 'SUMO' ? 'is-selected' : ''}" id="mode-sumo" tabindex="0" role="button" onclick="selectMode('SUMO')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectMode('SUMO');}">
            <div class="mode-icon">🤼</div>
            <h2>SUMO</h2>
            <p class="text-secondary">Strength × Stamina</p>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 class="card-title">Pre-Battle</h3>
          <div class="text-center">
            ${petCanvasHTML(pet, { size: 'normal' })}
            <div class="pet-name">${escapeHTML(pet.pet_name)}</div>
            <div class="card-meta">Lv.${pet.level} · ${rarityBadgeHTML(pet.rarity)}</div>
          </div>
          <div class="mt-4">
            ${statBarHTML('speed', 'Speed', pet.stat_speed)}
            ${statBarHTML('strength', 'Strength', pet.stat_strength)}
            ${statBarHTML('stamina', 'Stamina', pet.stat_stamina)}
          </div>
          <div class="mt-3">
            <h3 class="card-title">Active Buffs</h3>
            <div class="card-meta">No active buffs · use food in <a href="#screen-03" onclick="router.navigate('screen-03'); return false;">My Pet</a></div>
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">Matchmaking</h3>
          <p class="text-secondary">We'll match you with another player around your arena score (${pet.arena_score}).</p>
          <div class="mt-4 text-center">
            <button id="find-match-btn" class="btn btn-large btn-success" onclick="findMatch()">⚡ Find Match</button>
          </div>
          <div id="matching-status" class="mt-4 text-center"></div>
        </div>
      </div>

      <div id="ai-offer-modal" class="modal-overlay" hidden>
        <div class="modal-card">
          <h2>No human opponent yet</h2>
          <p>Would you like to match with an AI opponent for a quick battle?</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" onclick="dismissAIOffer()">Keep waiting</button>
            <button class="btn" onclick="acceptAIOffer()">Match an AI →</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function selectMode(mode) {
  ArenaState.mode = mode;
  $('#mode-race').classList.toggle('is-selected', mode === 'RACE');
  $('#mode-sumo').classList.toggle('is-selected', mode === 'SUMO');
  window.audioEngine.playSFX('SFX-002-pet-tap-click');
}
window.selectMode = selectMode;

let aiOfferTimer = null;
function findMatch() {
  if (ArenaState.matching) return;
  ArenaState.matching = true;
  window.audioEngine.playSFX('SFX-006-arena-start');
  $('#find-match-btn').disabled = true;
  $('#matching-status').innerHTML = `
    <div class="banner banner--info"><span>🔍</span><span>Searching for opponent...</span></div>
  `;
  // After 3s show AI offer modal — register with router so navigating away clears it.
  // Null-guard inside callback handles late-firing case if clear happens between fire and callback.
  aiOfferTimer = setTimeout(() => {
    const m = $('#ai-offer-modal');
    if (m) m.hidden = false;
  }, 3000);
  router.registerTimer(aiOfferTimer);
}
window.findMatch = findMatch;

function dismissAIOffer() {
  $('#ai-offer-modal').hidden = true;
  $('#matching-status').innerHTML = `<div class="banner banner--warning"><span>⏳</span><span>Still searching... try again or accept AI match.</span></div>`;
  ArenaState.matching = false;
  $('#find-match-btn').disabled = false;
  if (aiOfferTimer) clearTimeout(aiOfferTimer);
}
function acceptAIOffer() {
  $('#ai-offer-modal').hidden = true;
  $('#matching-status').innerHTML = `<div class="banner banner--success"><span>✅</span><span>Matched! Battle starting...</span></div>`;
  // Countdown 3-2-1 then go to result
  showCountdown(() => {
    router.navigate('screen-06', { battleId: 'b1111111-1111-4111-8111-111111111111' });
  });
}
window.dismissAIOffer = dismissAIOffer;
window.acceptAIOffer = acceptAIOffer;

function showCountdown(done) {
  const root = $('#proto-content');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-card text-center"><h1 id="countdown-num" style="font-size:5rem;color:var(--accent);margin:0;">3</h1></div>`;
  document.body.appendChild(overlay);
  let n = 3;
  const tick = () => {
    n--;
    if (n <= 0) {
      try { overlay.remove(); } catch (e) { /* ignore */ }
      done();
      return;
    }
    const el = overlay.querySelector('#countdown-num');
    if (el) {
      el.textContent = n;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = 'scalePop 600ms cubic-bezier(0.16, 1, 0.3, 1)';
    }
    setTimeout(tick, 800);
  };
  setTimeout(tick, 800);
}

/* ============================================================
   Screen 06 — Battle Result
   ============================================================ */
function renderScreen06(ctx) {
  const M = window.MOCK;
  const battleId = ctx.battleId || 'b1111111-1111-4111-8111-111111111111';
  const battle = M.battles.find(b => b.id === battleId) || M.battles[0];
  const myPet = M.pets.find(p => p.pet_name === (battle.winner === M.currentPet.pet_name ? battle.winner : (battle.pet_a === M.currentPet.pet_name ? battle.pet_a : battle.pet_b))) || M.currentPet;
  const oppName = battle.pet_a === myPet.pet_name ? battle.pet_b : battle.pet_a;
  const opponent = M.pets.find(p => p.pet_name === oppName) || { pet_name: oppName, sprite: '🤖', rarity: 'COMMON', stat_speed: 60, stat_strength: 55, stat_stamina: 58, level: 8 };
  const isWin = battle.winner === myPet.pet_name;

  return `
    <section class="screen">
      <div class="battle-result-banner ${isWin ? '' : 'is-loss'}" id="battle-banner">
        <h1>${isWin ? '🏆 VICTORY!' : '💀 DEFEAT'}</h1>
        <p class="text-secondary mt-3">${escapeHTML(battle.mode)} · ${battle.duration_seconds}s · ${formatDate(battle.completed_at)}</p>
      </div>

      <div class="card mb-4">
        <h3 class="card-title">Stat Comparison</h3>
        <div class="stat-comparison">
          <div class="combatant-card card ${isWin ? 'is-winner' : 'is-loser'}">
            ${petCanvasHTML(myPet, { size: 'small' })}
            <div class="pet-name mt-3">${escapeHTML(myPet.pet_name)}</div>
            <div>${rarityBadgeHTML(myPet.rarity)}</div>
            <div class="mt-3">
              <div>SPD ${myPet.stat_speed}</div>
              <div>STR ${myPet.stat_strength}</div>
              <div>STA ${myPet.stat_stamina}</div>
              ${battle.stat_delta_a > 0 ? `<div class="text-success mt-2">+${battle.stat_delta_a} score</div>` : ''}
            </div>
          </div>
          <div class="vs">VS</div>
          <div class="combatant-card card ${!isWin ? 'is-winner' : 'is-loser'}">
            ${petCanvasHTML(opponent, { size: 'small' })}
            <div class="pet-name mt-3">${escapeHTML(opponent.pet_name)}</div>
            <div>${rarityBadgeHTML(opponent.rarity)}</div>
            <div class="mt-3">
              <div>SPD ${opponent.stat_speed}</div>
              <div>STR ${opponent.stat_strength}</div>
              <div>STA ${opponent.stat_stamina}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3" style="flex-wrap:wrap;justify-content:center;">
        <button class="btn" id="share-battle-btn" onclick="shareBattle('${safeJSId(battle.id)}')">🔗 Share Battle</button>
        <button class="btn btn-success" onclick="router.navigate('screen-05')">⚔️ Battle Again</button>
        <button class="btn btn-secondary" onclick="router.navigate('screen-07')">🏆 Leaderboard</button>
        <button class="btn btn-ghost" onclick="router.navigate('screen-03')">← Back to Pet</button>
      </div>
    </section>
  `;
}

function onMountScreen06(ctx) {
  const M = window.MOCK;
  const battleId = ctx.battleId || 'b1111111-1111-4111-8111-111111111111';
  const battle = M.battles.find(b => b.id === battleId) || M.battles[0];
  const isWin = battle.winner === M.currentPet.pet_name;
  setTimeout(() => {
    if (isWin) {
      window.audioEngine.playSFX('SFX-007-arena-victory');
      window.fxEngine.emitBurstAt($('#battle-banner'), { count: 28, char: '★', colors: ['#fdcb6e', '#a29bfe', '#00b894', '#7cb4e8'], speed: 6, life: 1500 });
    } else {
      window.audioEngine.playSFX('SFX-008-arena-defeat');
    }
  }, 200);
}

function shareBattle(battleId) {
  const url = `${location.origin}${location.pathname}#screen-06?battle=${battleId}`;
  window.fxEngine.emitBurstAt($('#share-battle-btn'), { count: 8, char: '✦' });
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => toast('Battle URL copied to clipboard!'));
  } else {
    toast('Share URL: ' + url);
  }
}
window.shareBattle = shareBattle;

/* ============================================================
   Screen 07 — Leaderboard
   ============================================================ */
const LeaderboardState = { filter: 'ALL' };
function renderScreen07() {
  const M = window.MOCK;
  const filter = LeaderboardState.filter;
  const rows = filter === 'ALL'
    ? M.leaderboard
    : M.leaderboard.filter(p => p.rarity === filter);

  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Leaderboard</h1>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-03')">← Back</button>
      </div>

      <div class="chips">
        ${['ALL','COMMON','RARE','EPIC','LEGENDARY'].map(r => `
          <span class="chip chip--${safeJSId(r.toLowerCase())} ${filter === r ? 'is-active' : ''}" tabindex="0" role="button" onclick="filterLeaderboard('${safeJSId(r)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();filterLeaderboard('${safeJSId(r)}');}">${escapeHTML(r)}</span>
        `).join('')}
      </div>

      ${(() => {
        const me = M.leaderboard.find(p => p.id === M.currentPet.id);
        return me ? `
          <div class="banner banner--success">
            <span>👑</span>
            <span>Your pet <strong>${escapeHTML(me.pet_name)}</strong> is ranked <strong class="text-accent">#${me.rank}</strong> out of ${M.leaderboard.length}.</span>
          </div>
        ` : '';
      })()}

      <table class="proto-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Pet</th>
            <th>Name</th>
            <th>Rarity</th>
            <th>Score</th>
            <th>W / L</th>
            <th>Win %</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(p => `
            <tr class="${p.id === M.currentPet.id ? 'is-owner' : ''}" onclick="router.navigate('screen-08', { petId: '${safeJSId(p.id)}' })">
              <td class="rank-cell">#${p.rank}</td>
              <td>${petCanvasHTML(p, { size: 'thumb' })}</td>
              <td><strong>${escapeHTML(p.pet_name)}</strong><div class="card-meta">Lv.${p.level}</div></td>
              <td>${rarityBadgeHTML(p.rarity)}</td>
              <td><strong class="text-accent">${p.arena_score}</strong></td>
              <td>${p.wins} / ${p.losses}</td>
              <td>${p.win_rate}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `;
}

function filterLeaderboard(r) {
  if (window.audioEngine) window.audioEngine.playSFX('SFX-002-pet-tap-click');
  LeaderboardState.filter = r;
  // Re-render the leaderboard directly (router.navigate would no-op since
  // current === target screen, so we update DOM manually).
  $('#proto-content').innerHTML = renderScreen07();
}
window.filterLeaderboard = filterLeaderboard;

/* ============================================================
   Screen 08 — Battle Records
   ============================================================ */
function renderScreen08(ctx) {
  const M = window.MOCK;
  const petId = ctx.petId || M.currentPet.id;
  const pet = M.pets.find(p => p.id === petId) || M.currentPet;
  const myBattles = M.battles.filter(b => b.pet_a === pet.pet_name || b.pet_b === pet.pet_name);

  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Battle Records</h1>
        <div class="flex gap-3">
          <button class="btn btn-sm" onclick="sharePage()">🔗 Share Page</button>
          <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-03')">← Back</button>
        </div>
      </div>

      <div class="card mb-4">
        <div class="grid-2">
          <div class="text-center">
            ${petCanvasHTML(pet, { size: 'normal' })}
          </div>
          <div>
            <h2>${escapeHTML(pet.pet_name)}</h2>
            <div>${rarityBadgeHTML(pet.rarity)} · Lv.${pet.level}</div>
            <div class="mt-3">
              <div>Owner: ${escapeHTML(pet.masked_email || '—')}</div>
              <div>Arena score: <strong class="text-accent">${pet.arena_score}</strong></div>
              <div>Record: ${pet.wins}W · ${pet.losses}L</div>
              <div>Last trained: ${formatDate(pet.last_trained_at)}</div>
            </div>
          </div>
        </div>
      </div>

      <table class="proto-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Mode</th>
            <th>Opponent</th>
            <th>Result</th>
            <th>Duration</th>
            <th>Score Δ</th>
          </tr>
        </thead>
        <tbody>
          ${myBattles.length === 0 ? `<tr><td colspan="6" class="text-center text-secondary" style="padding: var(--space-12);">No battles yet. <a href="#screen-05" onclick="router.navigate('screen-05'); return false;">Enter the arena →</a></td></tr>` : myBattles.map(b => {
            const isWin = b.winner === pet.pet_name;
            const opp = b.pet_a === pet.pet_name ? b.pet_b : b.pet_a;
            return `
              <tr>
                <td>${formatDate(b.completed_at)}</td>
                <td><strong>${escapeHTML(b.mode)}</strong></td>
                <td>${escapeHTML(opp)} ${b.is_ai_opponent ? '<span class="card-meta">(AI)</span>' : ''}</td>
                <td>${isWin ? '<span class="text-success"><strong>WIN</strong></span>' : '<span class="text-error"><strong>LOSS</strong></span>'}</td>
                <td>${b.duration_seconds}s</td>
                <td>${isWin ? `<span class="text-accent">+${b.stat_delta_a}</span>` : '0'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </section>
  `;
}

function sharePage() {
  const url = location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => toast('Page URL copied!'));
  } else {
    toast('Share URL: ' + url);
  }
}
window.sharePage = sharePage;

/* ============================================================
   Screen 09 — Marketplace
   ============================================================ */
function renderScreen09() {
  const M = window.MOCK;
  const unlocked = M.metrics.dau >= M.metrics.marketplace_unlock_dau;
  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Marketplace</h1>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-03')">← Back</button>
      </div>

      ${!unlocked ? `
        <div class="banner banner--warning">
          <span>🔒</span>
          <span>Marketplace unlocks when DAU > ${M.metrics.marketplace_unlock_dau.toLocaleString()} (currently ${M.metrics.dau.toLocaleString()}). Preview only — trades disabled.</span>
        </div>
      ` : ''}

      <div class="card mb-4">
        <h3 class="card-title">Featured Listings</h3>
        <div class="marketplace-grid">
          ${M.marketplace_listings.map(l => `
            <div class="listing-card">
              ${petCanvasHTML({ pet_name: l.pet_name, rarity: l.rarity, sprite: l.sprite }, { size: 'small' })}
              <div class="pet-name mt-3">${escapeHTML(l.pet_name)}</div>
              <div>${rarityBadgeHTML(l.rarity)}</div>
              <div class="listing-price">${l.price_credits.toLocaleString()} 💎</div>
              <div class="listing-meta">${l.looking_for ? 'Wants: ' + escapeHTML(l.looking_for) : 'Open offer'}</div>
              <button class="btn ${unlocked ? '' : 'btn-ghost'} mt-3" ${unlocked ? '' : 'disabled'} onclick="openTradeModal('${safeJSId(l.id)}')">${unlocked ? 'Trade' : 'Locked'}</button>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Anti-flip Rules</h3>
        <ul style="line-height:1.8;">
          <li>5% trade fee (paid to platform)</li>
          <li>7-day cooldown before listed pet can be traded again</li>
          <li>Atomic ownership transfer (escrow)</li>
        </ul>
      </div>

      <div id="trade-modal" class="modal-overlay" hidden>
        <div class="modal-card">
          <h2>Confirm Trade</h2>
          <div id="trade-modal-body"></div>
        </div>
      </div>
    </section>
  `;
}

function openTradeModal(listingId) {
  const M = window.MOCK;
  const l = M.marketplace_listings.find(x => x.id === listingId);
  if (!l) return;
  const fee = Math.round(l.price_credits * 0.05);
  $('#trade-modal-body').innerHTML = `
    <p>Trade for <strong>${escapeHTML(l.pet_name)}</strong> (${l.rarity})?</p>
    <div class="banner banner--warning"><span>💰</span><span>Price: ${l.price_credits.toLocaleString()} · Fee (5%): ${fee.toLocaleString()}</span></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="$('#trade-modal').hidden = true;">Cancel</button>
      <button class="btn btn-success" onclick="confirmTrade('${safeJSId(listingId)}')">Confirm Trade</button>
    </div>
  `;
  $('#trade-modal').hidden = false;
}
function confirmTrade(listingId) {
  $('#trade-modal').hidden = true;
  toast('Trade submitted (demo only).');
  window.audioEngine.playSFX('SFX-009-claim-success');
}
window.openTradeModal = openTradeModal;
window.confirmTrade = confirmTrade;

/* ============================================================
   Screen 10 — GDPR Self-Service
   ============================================================ */
function renderScreen10() {
  const M = window.MOCK;
  return `
    <section class="screen">
      <div class="screen-title">
        <h1>GDPR Self-Service</h1>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-03')">← Back</button>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 class="card-title">Submit a Request</h3>
          <div class="form-field">
            <label for="gdpr-type">Request type</label>
            <select id="gdpr-type" class="form-select">
              <option value="ERASURE">ERASURE — Delete my data (Right to be forgotten)</option>
              <option value="ACCESS">ACCESS — Export my data</option>
              <option value="RESTRICT">RESTRICT — Restrict processing</option>
              <option value="OBJECT">OBJECT — Remove from leaderboard</option>
              <option value="RECTIFY">RECTIFY — Correct my data</option>
            </select>
          </div>
          <div class="form-field">
            <label for="gdpr-email">Verified email</label>
            <input id="gdpr-email" type="email" class="form-input" value="${escapeHTML(M.currentPet.masked_email)}" disabled>
          </div>
          <div class="form-field">
            <label for="gdpr-reason">Reason (optional)</label>
            <textarea id="gdpr-reason" class="form-textarea" placeholder="Briefly describe your request..."></textarea>
          </div>
          <button class="btn btn-success w-full" onclick="submitGdpr()">Submit Request</button>
          <p class="card-meta mt-3">SLA: 7 days. You'll receive an email confirmation.</p>
        </div>

        <div class="card">
          <h3 class="card-title">Existing Requests</h3>
          <table class="proto-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>SLA Deadline</th>
              </tr>
            </thead>
            <tbody>
              ${M.gdpr_requests.map(r => `
                <tr>
                  <td><code>${escapeHTML(r.id)}</code></td>
                  <td><strong>${escapeHTML(r.request_type)}</strong></td>
                  <td>${formatDate(r.submitted_at)}</td>
                  <td><span class="status-pill status-pill--${r.status.toLowerCase()}">${escapeHTML(r.status)}</span></td>
                  <td>${formatDate(r.sla_deadline)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function submitGdpr() {
  const type = $('#gdpr-type').value;
  const M = window.MOCK;
  const newReq = {
    id: 'gdpr-' + String(M.gdpr_requests.length + 1).padStart(3, '0'),
    request_type: type,
    status: 'PENDING',
    sla_deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    submitted_at: new Date().toISOString(),
  };
  M.gdpr_requests.unshift(newReq);
  toast('✅ Request submitted. SLA: 7 days');
  window.audioEngine.playSFX('SFX-009-claim-success');
  setTimeout(() => router.navigate('screen-10'), 400);
}
window.submitGdpr = submitGdpr;

/* ============================================================
   Register all screens
   ============================================================ */
router.register('screen-01', renderScreen01, { title: '01 · Landing', onMount: onMountScreen01 });
router.register('screen-02', renderScreen02, { title: '02 · Claim Pet' });
router.register('screen-03', renderScreen03, { title: '03 · My Pet' });
router.register('screen-04', renderScreen04, { title: '04 · Training', onMount: onMountScreen04 });
router.register('screen-05', renderScreen05, { title: '05 · Arena' });
router.register('screen-06', renderScreen06, { title: '06 · Battle Result', onMount: onMountScreen06 });
router.register('screen-07', renderScreen07, { title: '07 · Leaderboard' });
router.register('screen-08', renderScreen08, { title: '08 · Battle Records' });
router.register('screen-09', renderScreen09, { title: '09 · Marketplace' });
router.register('screen-10', renderScreen10, { title: '10 · GDPR' });

/* ============================================================
   Boot
   ============================================================ */
// Whitelist of click-action handler names that data-action can dispatch to.
// Anything outside this list is ignored — prevents arbitrary fn lookup via DOM.
const SAFE_ACTIONS = {
  onPetCanvasClick: () => onPetCanvasClick(),
};

document.addEventListener('DOMContentLoaded', () => {
  window.fxEngine.init();
  router.init();
  // Hash change support
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id && id !== router.current && router.screens[id]) {
      router.navigate(id);
    }
  });
  // Delegated click for elements with data-action (replaces inline onclick).
  document.addEventListener('click', (ev) => {
    const target = ev.target.closest('[data-action]');
    if (!target) return;
    const raw = target.getAttribute('data-action') || '';
    // Strip any (args) suffix; we only support zero-arg whitelisted handlers here.
    const fnName = raw.replace(/\(.*\)$/, '').trim();
    const fn = SAFE_ACTIONS[fnName];
    if (typeof fn === 'function') fn();
  });
});
