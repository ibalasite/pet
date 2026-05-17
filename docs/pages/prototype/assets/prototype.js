/* ============================================================
   Pixel Pet Arena — Prototype Router + 13 screen renders
   Screens: 01 Landing, 02 Email, 03 OTP, 04 URL Reveal,
            05 My Pet, 06 Training, 07 Arena Lobby,
            08 Leaderboard, 09 Battle Records, 10 Battle Result,
            11 Marketplace (FF_MARKETPLACE gate),
            12 Token Recovery, 13 GDPR
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
  } catch (e) { return iso; }
};

const daysAgo = (iso) => {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
};

/* Safe ID for inline JS contexts */
function safeJSId(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

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
  }, 3200);
}
window.toast = toast;

/* ----- Rarity badge ----- */
function rarityBadgeHTML(rarity) {
  const r = String(rarity || 'COMMON').toUpperCase();
  return `<span class="rarity-badge rarity-badge--${r.toLowerCase()}">${r}</span>`;
}

/* ----- Pet canvas placeholder ----- */
const SAFE_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const SAFE_RARITY = new Set(['COMMON', 'RARE', 'EPIC', 'LEGENDARY']);

function petCanvasHTML(pet, opts = {}) {
  if (!pet) return '<div class="pet-canvas"></div>';
  const size = opts.size || 'normal';
  const sizeCls = size === 'large' ? 'pet-canvas--large' :
                  size === 'small' ? 'pet-canvas--small' :
                  size === 'thumb' ? 'pet-canvas--thumb' : '';
  const rarity = String(pet.rarity || '').toUpperCase();
  const rarityCls = SAFE_RARITY.has(rarity) ? `pet-canvas--${rarity.toLowerCase()}` : '';
  const neglectCls = opts.neglect ? 'pet-canvas--neglect' : '';
  const animCls = (opts.animClass && SAFE_ID_RE.test(opts.animClass)) ? opts.animClass : '';
  const action = (opts.onClick && SAFE_ID_RE.test(opts.onClick.replace(/\(.*\)$/, '')))
    ? `data-action="${escapeHTML(opts.onClick)}"`
    : '';
  const idAttr = (opts.id && SAFE_ID_RE.test(opts.id)) ? `id="${opts.id}"` : '';
  const sprite = escapeHTML(pet.sprite || '🐾');
  return `
    <div class="pet-canvas ${sizeCls} ${rarityCls} ${neglectCls}" ${idAttr} ${action} role="img" aria-label="${escapeHTML(pet.pet_name)}">
      <div class="pet-bg-grid"></div>
      <div class="pet-shadow"></div>
      <div class="pet-sprite ${animCls}">${sprite}</div>
    </div>
  `;
}

/* ----- Stat bar ----- */
function statBarHTML(key, label, value) {
  return `
    <div class="stat-bar">
      <div class="stat-bar__label stat-bar__label--${key}">
        <strong>${escapeHTML(label)}</strong>
        <span class="stat-bar__value" data-stat="${key}">${value}</span>
      </div>
      <div class="stat-bar__track">
        <div class="stat-bar__fill stat-bar__fill--${key}" style="width: ${Math.min(100, value)}%;"></div>
      </div>
    </div>
  `;
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
    if (!this.screens[id]) { console.warn('Unknown screen', id); return; }
    this._clearTimers();
    if (this.current && this.current !== id) {
      this.history.push({ id: this.current, ctx: this.context });
    }
    this.current = id;
    this.context = ctx;
    const def = this.screens[id];
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    const root = $('#proto-content');
    root.innerHTML = def.render(ctx);
    const bc = $('#breadcrumb');
    if (bc) bc.textContent = def.title || id;
    if (def.onMount) def.onMount(ctx);
    if (window.audioEngine && window.audioEngine.unlocked) {
      window.audioEngine.playSFX('SFX-002-pet-tap-click');
    }
    const ub = document.getElementById('audio-unlock-btn');
    if (ub && window.audioEngine && window.audioEngine.unlocked) ub.style.display = 'none';
    this._updateBGM(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  back() {
    if (this.history.length === 0) { this.navigate('screen-01'); return; }
    const prev = this.history.pop();
    if (!prev || prev.id === this.current) return;
    this._clearTimers();
    this.current = prev.id;
    this.context = prev.ctx || {};
    const def = this.screens[prev.id];
    if (!def) { this.navigate('screen-01'); return; }
    $('#proto-content').innerHTML = def.render(this.context);
    const bc = $('#breadcrumb');
    if (bc) bc.textContent = def.title || prev.id;
    if (def.onMount) def.onMount(this.context);
    this._updateBGM(prev.id);
    history.replaceState(null, '', '#' + prev.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  registerTimer(id) { this._timers.push(id); }
  _clearTimers() {
    this._timers.forEach((t) => {
      try { clearTimeout(t); } catch (e) { /* ignore */ }
      try { clearInterval(t); } catch (e) { /* ignore */ }
    });
    this._timers = [];
  }

  _updateBGM(id) {
    if (!window.audioEngine || !window.audioEngine.unlocked) return;
    if (['screen-07', 'screen-10'].includes(id)) {
      window.audioEngine.startBGM('BGM-001');
    } else if (['screen-05', 'screen-06'].includes(id)) {
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
  grid.innerHTML = Object.keys(router.screens).map((id) => {
    const s = router.screens[id];
    const safe = safeJSId(id);
    return `<div class="screen-tile" tabindex="0" role="button"
      onclick="router.navigate('${safe}'); hideFlowMap();"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();router.navigate('${safe}');hideFlowMap();}">
      <div class="tile-id">${escapeHTML(safe)}</div>
      <div class="tile-name">${escapeHTML(s.title || '')}</div>
    </div>`;
  }).join('');
  $('#flow-map-modal').hidden = false;
}
function hideFlowMap() { $('#flow-map-modal').hidden = true; }
window.showFlowMap = showFlowMap;
window.hideFlowMap = hideFlowMap;

/* ============================================================
   Screen 01 — Landing Page
   ============================================================ */
function renderScreen01() {
  const M = window.MOCK;
  const pet = M.currentPet;
  return `
    <section class="screen">
      <div class="hero">
        ${petCanvasHTML(pet, { size: 'large', id: 'landing-pet' })}
        <h1 style="color:var(--accent);text-shadow:4px 4px 0 var(--shadow);">Pixel Pet Arena</h1>
        <p class="tagline">Your unique pixel companion awaits. Train, battle, become legend.</p>
        <div class="social-proof">
          <span class="pulse-dot"></span>
          <span>${M.metrics.claimed_today.toLocaleString()} pets claimed today · ${M.metrics.total_pets.toLocaleString()} total</span>
        </div>
        <div style="margin-top:16px;">
          ${rarityBadgeHTML(pet.rarity)}
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-ghost" onclick="router.navigate('screen-08')">🏆 Leaderboard</button>
          <button class="btn btn-ghost" onclick="router.navigate('screen-12')">🔑 Recover Pet</button>
        </div>
        <p class="card-meta" style="opacity:0.5;font-size:0.7rem;margin-top:12px;">Demo: CTA 顯示在 3 秒後（實際規格為 30 秒）</p>
      </div>
      <div id="claim-cta-slot"></div>
    </section>
  `;
}

function onMountScreen01() {
  const petEl = $('#landing-pet');
  if (petEl) {
    petEl.style.cursor = 'pointer';
    petEl.addEventListener('click', () => {
      const sprite = petEl.querySelector('.pet-sprite');
      if (!sprite) return;
      sprite.classList.remove('pet-anim-hop');
      void sprite.offsetWidth;
      sprite.classList.add('pet-anim-hop');
      if (window.audioEngine) window.audioEngine.playSFX('SFX-001-pet-tap-pop');
      if (window.fxEngine) window.fxEngine.emitBurstAt(petEl, { count: 5, size: 3, colors: ['#fdcb6e','#a29bfe','#00b894'] });
    });
  }
  // anim-06 + anim-07: claim CTA pulse + slide-in
  const t = setTimeout(() => {
    const slot = $('#claim-cta-slot');
    if (!slot) return;
    slot.innerHTML = `
      <div class="claim-cta-floating" style="animation:slideUp 300ms cubic-bezier(0.16,1,0.3,1) both;">
        <button class="btn btn-large" style="animation:pulse 1.25s ease-in-out infinite;" onclick="router.navigate('screen-02')">
          ✨ Claim This Pet →
        </button>
      </div>
    `;
  }, 3000);
  router.registerTimer(t);
}

/* ============================================================
   Screen 02 — Claim Step 1: Email Form
   ============================================================ */
const ClaimState = { email: '', code: '' };

function renderScreen02() {
  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Claim Your Pet</h1>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-01')">← Back</button>
      </div>
      <div class="card" style="max-width:520px;margin:0 auto;">
        <div class="wizard-steps">
          <div class="wizard-step wizard-step--active">1</div>
          <div class="wizard-line"></div>
          <div class="wizard-step">2</div>
          <div class="wizard-line"></div>
          <div class="wizard-step">3</div>
        </div>
        <h3 class="card-title">Step 1 · Enter Email</h3>
        <p class="text-secondary">We'll send a one-time 6-digit code. No password required.</p>
        <div class="form-field" style="margin-top:20px;">
          <label for="claim-email">Email address</label>
          <input id="claim-email" type="email" class="form-input" placeholder="you@example.com" value="${escapeHTML(ClaimState.email)}">
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:20px;">
          <input type="checkbox" id="age-check" style="margin-top:3px;width:18px;height:18px;accent-color:var(--primary);cursor:pointer;" required>
          <label for="age-check" style="font-size:13px;color:var(--text-secondary);cursor:pointer;line-height:1.5;">
            I confirm I am 13 years of age or older, and I agree to the
            <a href="#" onclick="return false;" style="color:var(--info);">Terms of Service</a> and
            <a href="#" onclick="return false;" style="color:var(--info);">Privacy Policy</a>.
          </label>
        </div>
        <button class="btn w-full" onclick="claimSendCode()">📧 Send Verification Code</button>
        <p class="card-meta" style="margin-top:12px;">Demo: any valid email format accepted. Code shown on next step.</p>
      </div>
    </section>
  `;
}

function claimSendCode() {
  const emailEl = $('#claim-email');
  const ageEl = $('#age-check');
  const email = (emailEl ? emailEl.value : '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast('Please enter a valid email address.', 'error');
    if (window.audioEngine) window.audioEngine.playSFX('SFX-invalid');
    if (emailEl && window.fxEngine) window.fxEngine.shakeElement(emailEl);
    return;
  }
  if (ageEl && !ageEl.checked) {
    toast('Please confirm you are 13+ years old.', 'error');
    if (window.audioEngine) window.audioEngine.playSFX('SFX-invalid');
    return;
  }
  ClaimState.email = email;
  if (window.audioEngine) window.audioEngine.playSFX('SFX-009-claim-success');
  toast('Code sent! Check your inbox.');
  router.navigate('screen-03');
}
window.claimSendCode = claimSendCode;

/* ============================================================
   Screen 03 — Claim Step 2: OTP Verification
   ============================================================ */
let otpInterval = null;

function renderScreen03() {
  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Verify Email</h1>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-02')">← Back</button>
      </div>
      <div class="card" style="max-width:520px;margin:0 auto;">
        <div class="wizard-steps">
          <div class="wizard-step wizard-step--done">✓</div>
          <div class="wizard-line"></div>
          <div class="wizard-step wizard-step--active">2</div>
          <div class="wizard-line"></div>
          <div class="wizard-step">3</div>
        </div>
        <h3 class="card-title">Step 2 · Enter Code</h3>
        <p class="text-secondary">6-digit code sent to <strong class="text-accent">${escapeHTML(ClaimState.email || 'your email')}</strong></p>
        <div class="banner banner--warning" style="margin:16px 0;">
          <span>⏱</span>
          <span>Expires in <span id="otp-timer">5:00</span> · <span id="otp-attempts">3 attempts remaining</span></span>
        </div>
        <div id="code-digits" class="code-digits">
          ${[0,1,2,3,4,5].map(i => `<input class="code-digit" maxlength="1" inputmode="numeric" data-idx="${i}" autocomplete="one-time-code">`).join('')}
        </div>
        <p class="card-meta text-center">Demo code: <strong class="text-accent">${escapeHTML(window.MOCK ? window.MOCK.otp_code : '847291')}</strong></p>
        <div class="modal-actions" style="margin-top:20px;">
          <button class="btn btn-ghost" onclick="resendOtp()">Resend Code</button>
          <button class="btn" onclick="verifyOtp()">Verify →</button>
        </div>
      </div>
    </section>
  `;
}

function onMountScreen03() {
  startOtpTimer();
  bindOtpDigits();
}

let _otpAttempts = 3;
function startOtpTimer() {
  if (otpInterval) clearInterval(otpInterval);
  let secs = 5 * 60;
  const tick = () => {
    const el = $('#otp-timer');
    if (!el) { clearInterval(otpInterval); return; }
    const m = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
    if (secs <= 30) el.style.color = 'var(--error)';
    if (secs <= 0) {
      clearInterval(otpInterval);
      el.textContent = 'Expired';
      toast('Code expired. Please request a new one.', 'error');
    }
    secs--;
  };
  tick();
  otpInterval = setInterval(tick, 1000);
  router.registerTimer(otpInterval);
}

function bindOtpDigits() {
  const inputs = $$('.code-digit');
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', (ev) => {
      const v = ev.target.value.replace(/\D/g, '').slice(0, 1);
      ev.target.value = v;
      ClaimState.code = inputs.map(x => x.value).join('');
      if (v && i < inputs.length - 1) inputs[i + 1].focus();
      // Auto-verify when all 6 filled
      if (ClaimState.code.length === 6) verifyOtp();
    });
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Backspace' && !ev.target.value && i > 0) inputs[i - 1].focus();
    });
    inp.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const text = (ev.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      text.split('').forEach((ch, j) => { if (inputs[j]) inputs[j].value = ch; });
      ClaimState.code = inputs.map(x => x.value).join('');
      if (inputs[Math.min(text.length, 5)]) inputs[Math.min(text.length, 5)].focus();
    });
  });
  if (inputs[0]) inputs[0].focus();
}

function verifyOtp() {
  const code = ClaimState.code.replace(/\s/g, '');
  const M = window.MOCK;
  if (code !== M.otp_code) {
    _otpAttempts = Math.max(0, _otpAttempts - 1);
    const attEl = $('#otp-attempts');
    if (attEl) attEl.textContent = `${_otpAttempts} attempt${_otpAttempts !== 1 ? 's' : ''} remaining`;
    const wrap = $('#code-digits');
    if (wrap) {
      wrap.classList.add('is-invalid');
      if (window.fxEngine) window.fxEngine.shakeElement(wrap);
      setTimeout(() => { wrap.classList.remove('is-invalid'); }, 600);
    }
    if (window.audioEngine) window.audioEngine.playSFX('SFX-invalid');
    toast(`Invalid code. Try: ${M.otp_code}`, 'error');
    if (_otpAttempts <= 0) {
      setTimeout(() => { toast('Too many attempts. Please restart.', 'error'); router.navigate('screen-02'); }, 1200);
    }
    return;
  }
  if (otpInterval) clearInterval(otpInterval);
  if (window.audioEngine) window.audioEngine.playSFX('SFX-009-claim-success');
  toast('Email verified! ✓');
  router.navigate('screen-04');
}

function resendOtp() {
  _otpAttempts = 3;
  ClaimState.code = '';
  $$('.code-digit').forEach(el => { el.value = ''; });
  startOtpTimer();
  if (window.audioEngine) window.audioEngine.playSFX('SFX-002-pet-tap-click');
  toast('Code resent. Check your inbox.');
}
window.verifyOtp = verifyOtp;
window.resendOtp = resendOtp;

/* ============================================================
   Screen 04 — Claim Step 3: URL Reveal
   ============================================================ */
function renderScreen04() {
  const M = window.MOCK;
  const pet = M.currentPet;
  const petUrl = `${location.origin}${location.pathname.replace(/\/prototype.*/, '')}/pet/${pet.id}`;
  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Your Pet is Ready!</h1>
      </div>
      <div class="card" style="max-width:560px;margin:0 auto;text-align:center;">
        <div class="wizard-steps" style="justify-content:center;">
          <div class="wizard-step wizard-step--done">✓</div>
          <div class="wizard-line"></div>
          <div class="wizard-step wizard-step--done">✓</div>
          <div class="wizard-line"></div>
          <div class="wizard-step wizard-step--active">3</div>
        </div>
        <div style="margin:24px 0;" id="reveal-pet-wrap">
          ${petCanvasHTML(pet, { size: 'normal', id: 'claim-pet-reveal' })}
        </div>
        <h2 class="text-accent" style="margin-bottom:8px;">${escapeHTML(pet.pet_name)}</h2>
        <div id="reveal-rarity-badge" style="margin-bottom:20px;">${rarityBadgeHTML(pet.rarity)}</div>
        <p class="text-secondary" style="margin-bottom:16px;">This is your pet's permanent home URL. Save it — it's the only way to access your pet.</p>
        <div class="url-copy-box" id="url-copy-box">
          <code>${escapeHTML(petUrl)}</code>
          <button class="btn btn-sm" id="copy-url-btn" onclick="copyPetUrl('${escapeHTML(petUrl)}')">
            <span class="copy-icon-check" id="copy-icon">📋</span> Copy
          </button>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-large" onclick="router.navigate('screen-05')">🐾 Visit My Pet →</button>
          <button class="btn btn-ghost" onclick="router.navigate('screen-01')">← Home</button>
        </div>
      </div>
    </section>
  `;
}

function onMountScreen04() {
  // anim-05: rarity badge entrance spring
  requestAnimationFrame(() => {
    const badge = $('#reveal-rarity-badge .rarity-badge');
    if (badge) {
      badge.classList.remove('rarity-badge--reveal');
      void badge.offsetWidth;
      badge.classList.add('rarity-badge--reveal');
    }
    // anim-09 / star burst on reveal
    const petEl = $('#claim-pet-reveal');
    if (petEl && window.fxEngine) {
      setTimeout(() => {
        window.fxEngine.emitBurstAt(petEl, {
          count: 24, char: '★',
          colors: ['#fdcb6e', '#a29bfe', '#00b894', '#7cb4e8'],
          speed: 6, life: 1500
        });
      }, 150);
    }
    if (window.audioEngine) window.audioEngine.playSFX('SFX-009-claim-success');
  });
}

function copyPetUrl(url) {
  const btn = $('#copy-url-btn');
  const icon = $('#copy-icon');
  const copyFn = () => {
    if (icon) {
      icon.textContent = '✅';
      // anim-13: checkmark swap
      icon.style.animation = 'none';
      void icon.offsetWidth;
      icon.style.animation = 'scalePop 150ms cubic-bezier(0.16,1,0.3,1)';
      // anim-14: copy checkmark scale-pop — must run BEFORE btn.textContent
      // overwrites the DOM, so keep icon in place and only update the text node
      playAnim14(icon);
    }
    if (btn) {
      // Keep icon element in DOM; only replace the trailing text node so
      // the anim-14 animation remains visible on the existing icon span.
      const textNode = btn.childNodes[btn.childNodes.length - 1];
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = ' Copied!';
      } else {
        btn.appendChild(document.createTextNode(' Copied!'));
      }
    }
    toast('Pet URL copied to clipboard! ✅', 'success');
    if (window.audioEngine) window.audioEngine.playSFX('SFX-005-stat-ding');
    setTimeout(() => {
      if (btn) btn.innerHTML = '<span id="copy-icon">📋</span> Copy';
    }, 2500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(copyFn).catch(copyFn);
  } else {
    copyFn();
  }
}
window.copyPetUrl = copyPetUrl;

/* ============================================================
   anim-14 — Copy checkmark / neglect desaturate
   Plays a scale-pop + fade-out checkmark on a success element,
   or applies a grayscale desaturate transition on a neglected
   pet card when triggered.
   ============================================================ */
function playAnim14(element) {
  if (!element) return;
  // Checkmark pop: scale up then fade back, reusing scalePop keyframe
  element.style.animation = 'none';
  void element.offsetWidth; // reflow to restart animation
  element.style.animation = 'scalePop 200ms cubic-bezier(0.16,1,0.3,1) forwards';
  // Neglect desaturate: if element carries pet-canvas--neglect, animate grayscale in
  if (element.classList.contains('pet-canvas') || element.classList.contains('pet-canvas--neglect')) {
    element.style.transition = 'filter 600ms ease-out';
    element.style.filter = 'grayscale(1) brightness(0.7)';
    setTimeout(function() {
      element.style.filter = '';
      element.style.transition = '';
    }, 1800);
  }
}
window.playAnim14 = playAnim14;

// Wire anim-14 to copy actions — called after a successful copy to flash the icon
function _triggerCopyAnim14(iconEl) {
  if (iconEl) playAnim14(iconEl);
}

/* ============================================================
   Screen 05 — My Pet Page
   ============================================================ */
function renderScreen05() {
  const M = window.MOCK;
  const pet = M.currentPet;
  const neglected = daysAgo(pet.last_trained_at) > 3;
  return `
    <section class="screen">
      <div class="screen-title">
        <div>
          <h1>${escapeHTML(pet.pet_name)}</h1>
          <p class="card-meta">Owner: ${escapeHTML(pet.masked_email)} · Seed: ${pet.seed}</p>
        </div>
        <div class="flex gap-3" style="flex-wrap:wrap;">
          ${rarityBadgeHTML(pet.rarity)}
          <span class="streak-badge">🔥 Day ${M.metrics.training_streak} streak</span>
        </div>
      </div>

      ${neglected ? `
        <div class="banner banner--warning" id="neglect-banner">
          <span>😴</span>
          <span>Your pet looks neglected! Last trained ${Math.floor(daysAgo(pet.last_trained_at))} days ago.
          <a href="#screen-06" onclick="router.navigate('screen-06');return false;" style="color:var(--accent);">Train now →</a></span>
        </div>
      ` : ''}

      <div class="grid-pet-layout">
        <!-- Pet portrait -->
        <div class="card pet-info">
          ${petCanvasHTML(pet, { size: 'normal', id: 'mypet-canvas', onClick: 'onMyPetClick()' })}
          <div class="pet-name">${escapeHTML(pet.pet_name)}</div>
          <div class="pet-level">Lv.${pet.level} · ${pet.total_training_actions} training actions</div>
          <div class="card-meta" style="margin-top:6px;">Claimed: ${escapeHTML(pet.claimed_at)}</div>
          <div class="card-meta">Last trained: ${formatDate(pet.last_trained_at)}</div>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
            <span style="font-family:var(--font-display);font-size:9px;color:var(--success);">
              ${pet.wins}W · ${pet.losses}L
            </span>
            <span style="font-family:var(--font-display);font-size:9px;color:var(--text-secondary);">
              Score: <strong class="text-accent">${pet.arena_score}</strong>
            </span>
          </div>
        </div>

        <!-- Stats + Actions -->
        <div class="card">
          <h3 class="card-title">Stats</h3>
          ${statBarHTML('speed', 'Speed', pet.stat_speed)}
          ${statBarHTML('strength', 'Strength', pet.stat_strength)}
          ${statBarHTML('stamina', 'Stamina', pet.stat_stamina)}

          <div style="margin-top:24px;">
            <h3 class="card-title">Quick Actions</h3>
            <div class="flex gap-3" style="flex-wrap:wrap;">
              <button class="btn" onclick="router.navigate('screen-06')">🏋️ Train</button>
              <button class="btn btn-success" onclick="router.navigate('screen-07')">⚔️ Arena</button>
              <button class="btn btn-secondary" onclick="router.navigate('screen-09',{petId:'${safeJSId(pet.id)}'})">📜 Records</button>
              <button class="btn btn-ghost" onclick="router.navigate('screen-08')">🏆 Leaderboard</button>
            </div>
          </div>

          <div style="margin-top:20px;">
            <h3 class="card-title">Pet URL</h3>
            <div class="url-copy-box">
              <code style="font-size:8px;">pixel-pet-arena.com/pet/${escapeHTML(pet.id)}</code>
              <button class="btn btn-sm" onclick="toast('URL copied!','success');if(window.audioEngine)window.audioEngine.playSFX('SFX-005-stat-ding');">📋 Copy</button>
            </div>
          </div>
        </div>

        <!-- Food Inventory -->
        <div class="card">
          <h3 class="card-title">Food Inventory</h3>
          <div class="food-list">
            ${M.food.map(f => `
              <div class="food-item" id="food-${safeJSId(f.id)}">
                <span class="food-icon">${escapeHTML(f.icon)}</span>
                <div class="food-item__info">
                  <div class="food-item__name">${escapeHTML(f.label || f.name)}</div>
                  <div class="food-item__buff">+${f.magnitude} ${f.buff_stat}${f.duration_hours ? ' · ' + f.duration_hours + 'h' : ' · permanent'} · x${f.owned || f.quantity}</div>
                </div>
                <button class="btn btn-sm" ${(f.owned || f.quantity) <= 0 ? 'disabled' : ''} onclick="useFoodItem('${safeJSId(f.id)}')">Use</button>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:16px;">
            <button class="btn btn-ghost btn-sm w-full" onclick="router.navigate('screen-11')">🛒 Marketplace</button>
          </div>
        </div>
      </div>

      <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-12')">🔑 Token Recovery</button>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-13')">🛡️ GDPR</button>
      </div>
    </section>
  `;
}

function onMyPetClick() {
  const canvas = $('#mypet-canvas');
  if (!canvas) return;
  const sprite = canvas.querySelector('.pet-sprite');
  if (!sprite) return;
  // anim-02: spring scale + particles
  sprite.classList.remove('pet-anim-hop');
  void sprite.offsetWidth;
  sprite.classList.add('pet-anim-hop');
  if (window.audioEngine) window.audioEngine.playSFX('SFX-001-pet-tap-pop');
  if (window.fxEngine) window.fxEngine.emitBurstAt(canvas, { count: 5, size: 3, colors: ['#fdcb6e','#a29bfe','#00b894'] });
}
window.onMyPetClick = onMyPetClick;

function useFoodItem(foodId) {
  const M = window.MOCK;
  const f = M.food.find(x => x.id === foodId);
  if (!f || (f.owned || f.quantity) <= 0) return;
  if (f.owned !== undefined) f.owned -= 1;
  else f.quantity -= 1;
  const pet = M.currentPet;
  if (f.buff_stat === 'all') {
    pet.stat_speed = Math.min(99, pet.stat_speed + f.magnitude);
    pet.stat_strength = Math.min(99, pet.stat_strength + f.magnitude);
    pet.stat_stamina = Math.min(99, pet.stat_stamina + f.magnitude);
  } else {
    const k = 'stat_' + f.buff_stat;
    pet[k] = Math.min(99, (pet[k] || 0) + f.magnitude);
  }
  // anim-12: food use glow + stat bar animate
  const foodEl = $(`#food-${foodId}`);
  if (foodEl) foodEl.querySelector('.food-icon').classList.add('food-glow');
  if (window.audioEngine) window.audioEngine.playSFX('SFX-012-food-buff');
  const sprite = $('#mypet-canvas .pet-sprite');
  if (sprite) {
    sprite.classList.remove('pet-anim-eat');
    void sprite.offsetWidth;
    sprite.classList.add('pet-anim-eat');
  }
  toast(`+${f.magnitude} ${f.buff_stat} buff applied! 🍎`);
  setTimeout(() => router.navigate('screen-05'), 700);
}
window.useFoodItem = useFoodItem;

/* ============================================================
   Screen 06 — Training Page
   ============================================================ */
function renderScreen06() {
  const M = window.MOCK;
  const pet = M.currentPet;
  return `
    <section class="screen">
      <div class="screen-title">
        <div>
          <h1>Training</h1>
          <p class="card-meta">Daily limit: 3 actions · Reset in <span id="train-reset">--:--:--</span></p>
        </div>
        <div class="flex gap-3">
          <span class="streak-badge">🔥 Day ${M.metrics.training_streak} streak</span>
          <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-05')">← Back</button>
        </div>
      </div>

      <div class="grid-pet-layout">
        <div class="card pet-info">
          ${petCanvasHTML(pet, { size: 'normal', id: 'training-pet' })}
          <div class="pet-name">${escapeHTML(pet.pet_name)}</div>
          <div class="pet-level">Lv.${pet.level}</div>
          <div style="margin-top:12px;">
            ${statBarHTML('speed', 'Speed', pet.stat_speed)}
            ${statBarHTML('strength', 'Strength', pet.stat_strength)}
            ${statBarHTML('stamina', 'Stamina', pet.stat_stamina)}
          </div>
        </div>

        <div class="card" style="grid-column:span 2;">
          <h3 class="card-title">Daily Actions <span id="train-uses" style="color:var(--text-secondary);font-size:9px;">(0 / 3 used today)</span></h3>
          <div class="training-grid">
            ${trainingCardHTML('run',  '🏃', 'Sprint', 'speed',    'Boosts Speed stat by 1 point permanently.')}
            ${trainingCardHTML('lift', '💪', 'Strength Training', 'strength', 'Boosts Strength stat by 1 point permanently.')}
            ${trainingCardHTML('rest', '🧘', 'Endurance', 'stamina', 'Boosts Stamina stat by 1 point permanently.')}
          </div>
          <p class="card-meta" style="margin-top:12px;">Each action applies +1 to its stat. Max 3 actions per 24h UTC reset.</p>
        </div>
      </div>
    </section>
  `;
}

function trainingCardHTML(id, icon, label, stat, desc) {
  return `
    <div class="training-card" tabindex="0" role="button"
      onclick="doTrain('${safeJSId(id)}','${safeJSId(stat)}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();doTrain('${safeJSId(id)}','${safeJSId(stat)}');}">
      <div class="training-icon">${escapeHTML(icon)}</div>
      <h3>${escapeHTML(label)}</h3>
      <div class="training-stat-target">+1 ${escapeHTML(stat.toUpperCase())}</div>
      <div class="training-cooldown" id="cool-${safeJSId(id)}">${escapeHTML(desc)}</div>
    </div>
  `;
}

function onMountScreen06() {
  startTrainResetTimer();
}

let trainResetInterval = null;
function startTrainResetTimer() {
  if (trainResetInterval) clearInterval(trainResetInterval);
  const tick = () => {
    const el = $('#train-reset');
    if (!el) { clearInterval(trainResetInterval); return; }
    const now = new Date();
    const next = new Date(now); next.setUTCHours(24, 0, 0, 0);
    const ms = next - now;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  tick();
  trainResetInterval = setInterval(tick, 1000);
  router.registerTimer(trainResetInterval);
}

let _trainUsesToday = 0;
function doTrain(actionId, stat) {
  if (_trainUsesToday >= 3) {
    toast('Daily training limit reached (3/3). Reset at midnight UTC.', 'error');
    if (window.audioEngine) window.audioEngine.playSFX('SFX-010-rate-limit-warning');
    return;
  }
  const M = window.MOCK;
  const pet = M.currentPet;
  if (window.audioEngine) window.audioEngine.playSFX('SFX-003-training-start');

  // anim-04: training button press scale
  const card = document.querySelector(`.training-card[onclick*="'${actionId}'"]`);
  if (card) {
    card.style.transform = 'scale(0.96)';
    setTimeout(() => { card.style.transform = 'scale(1.03)'; }, 80);
    setTimeout(() => { card.style.transform = 'scale(1)'; }, 200);
  }

  setTimeout(() => {
    pet['stat_' + stat] = Math.min(99, pet['stat_' + stat] + 1);
    pet.total_training_actions += 1;
    pet.last_trained_at = new Date().toISOString();
    _trainUsesToday += 1;

    const oldLevel = pet.level;
    const newLevel = Math.floor(pet.total_training_actions / 10) + 1;
    if (newLevel > oldLevel) pet.level = newLevel;

    if (window.audioEngine) {
      window.audioEngine.playSFX('SFX-004-training-success');
      setTimeout(() => window.audioEngine.playSFX('SFX-005-stat-ding'), 120);
    }

    // Update stat bar in DOM
    const valEl = document.querySelector(`[data-stat="${stat}"]`);
    if (valEl) valEl.textContent = pet['stat_' + stat];
    const fillEl = document.querySelector(`.stat-bar__fill--${stat}`);
    if (fillEl) { fillEl.style.transition = 'width 600ms cubic-bezier(0.16,1,0.3,1)'; fillEl.style.width = Math.min(100, pet['stat_' + stat]) + '%'; }

    // Update training uses counter
    const usesEl = $('#train-uses');
    if (usesEl) usesEl.textContent = `(${_trainUsesToday} / 3 used today)`;

    // Pet flex animation
    const sprite = $('#training-pet .pet-sprite');
    if (sprite) {
      sprite.classList.remove('pet-anim-flex');
      void sprite.offsetWidth;
      sprite.classList.add('pet-anim-flex');
    }

    // anim-03: "+X Stat" float-up
    if (window.fxEngine) {
      window.fxEngine.spawnFloater($('#training-pet'), `+1 ${stat.toUpperCase()}`);
      window.fxEngine.emitBurstAt($('#training-pet'), { count: 8, char: '+', size: 3, colors: ['#00b894','#fdcb6e'] });
    }

    toast(`+1 ${stat.toUpperCase()} applied! 💪`);

    if (newLevel > oldLevel) {
      if (window.fxEngine) {
        const tp = $('#training-pet');
        if (tp) {
          const r = tp.getBoundingClientRect();
          window.fxEngine.emitBurst(r.left + r.width/2, r.top + r.height/2, {
            count: 32, char: '✨',
            colors: ['#fdcb6e','#a29bfe','#00b894'],
            speed: 7, life: 1600
          });
        }
      }
      if (window.audioEngine) window.audioEngine.playSFX('SFX-007-arena-victory');
      toast(`🎉 Level ${pet.level}!`, 'success');
    }
  }, 220);
}
window.doTrain = doTrain;

/* ============================================================
   Screen 07 — Arena Lobby
   ============================================================ */
const ArenaState = { mode: 'RACE', matching: false };

function renderScreen07() {
  const M = window.MOCK;
  const pet = M.currentPet;
  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Arena Lobby</h1>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-05')">← Back</button>
      </div>

      <div id="rate-limit-slot"></div>

      <div class="card" style="margin-bottom:16px;">
        <h3 class="card-title">Choose Battle Mode</h3>
        <div class="mode-grid">
          <div class="mode-card ${ArenaState.mode === 'RACE' ? 'is-selected' : ''}" id="mode-race"
            tabindex="0" role="button"
            onclick="selectArenaMode('RACE')"
            onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectArenaMode('RACE');}">
            <div class="mode-icon">🏃</div>
            <h2>RACE</h2>
            <p class="text-secondary">Speed × Stamina</p>
          </div>
          <div class="mode-card ${ArenaState.mode === 'SUMO' ? 'is-selected' : ''}" id="mode-sumo"
            tabindex="0" role="button"
            onclick="selectArenaMode('SUMO')"
            onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectArenaMode('SUMO');}">
            <div class="mode-icon">🤼</div>
            <h2>SUMO</h2>
            <p class="text-secondary">Strength × Stamina</p>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 class="card-title">Your Fighter</h3>
          <div class="text-center">
            ${petCanvasHTML(pet, { size: 'normal' })}
            <div class="pet-name">${escapeHTML(pet.pet_name)}</div>
            <div class="card-meta">Lv.${pet.level} · ${rarityBadgeHTML(pet.rarity)}</div>
          </div>
          <div style="margin-top:16px;">
            ${statBarHTML('speed', 'Speed', pet.stat_speed)}
            ${statBarHTML('strength', 'Strength', pet.stat_strength)}
            ${statBarHTML('stamina', 'Stamina', pet.stat_stamina)}
          </div>
        </div>
        <div class="card">
          <h3 class="card-title">Matchmaking</h3>
          <p class="text-secondary">Matching against players near arena score <strong class="text-accent">${pet.arena_score}</strong>.</p>
          <div style="margin-top:20px;text-align:center;">
            <button id="find-match-btn" class="btn btn-large btn-success" onclick="startMatchmaking()">⚡ Find Match</button>
          </div>
          <div id="matching-status" style="margin-top:16px;"></div>
        </div>
      </div>

      <div id="ai-offer-modal" class="modal-overlay" hidden>
        <div class="modal-card">
          <h2>No human opponent yet</h2>
          <p class="text-secondary">Would you like to battle an AI opponent instead?</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" onclick="dismissAI()">Keep waiting</button>
            <button class="btn" onclick="acceptAI()">Match AI →</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function selectArenaMode(mode) {
  ArenaState.mode = mode;
  const race = $('#mode-race'), sumo = $('#mode-sumo');
  if (race) race.classList.toggle('is-selected', mode === 'RACE');
  if (sumo) sumo.classList.toggle('is-selected', mode === 'SUMO');
  if (window.audioEngine) window.audioEngine.playSFX('SFX-002-pet-tap-click');
}
window.selectArenaMode = selectArenaMode;

let aiTimer = null;
function startMatchmaking() {
  if (ArenaState.matching) return;
  ArenaState.matching = true;
  if (window.audioEngine) window.audioEngine.playSFX('SFX-006-arena-start');
  const btn = $('#find-match-btn');
  if (btn) btn.disabled = true;
  const status = $('#matching-status');
  if (status) status.innerHTML = `<div class="banner banner--info"><span>🔍</span><span>Searching for opponent in ${ArenaState.mode} mode...</span></div>`;

  aiTimer = setTimeout(() => {
    const modal = $('#ai-offer-modal');
    if (modal) modal.hidden = false;
  }, 3000);
  router.registerTimer(aiTimer);
}
window.startMatchmaking = startMatchmaking;

function dismissAI() {
  const modal = $('#ai-offer-modal');
  if (modal) modal.hidden = true;
  const status = $('#matching-status');
  if (status) status.innerHTML = `<div class="banner banner--warning"><span>⏳</span><span>Still searching... or accept AI match.</span></div>`;
  ArenaState.matching = false;
  const btn = $('#find-match-btn');
  if (btn) btn.disabled = false;
}

function acceptAI() {
  const modal = $('#ai-offer-modal');
  if (modal) modal.hidden = true;
  const status = $('#matching-status');
  if (status) status.innerHTML = `<div class="banner banner--success"><span>✅</span><span>AI matched! Battle starting...</span></div>`;
  // anim-08: 3-2-1 countdown
  arenaCountdown(() => {
    router.navigate('screen-10', { battleId: 'm003', isWin: true });
  });
}
window.dismissAI = dismissAI;
window.acceptAI = acceptAI;

function arenaCountdown(done) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.background = 'rgba(0,0,0,0.85)';
  overlay.innerHTML = `<div style="text-align:center;"><span id="arena-digit" style="font-family:var(--font-display);font-size:80px;color:var(--accent);display:block;">3</span></div>`;
  document.body.appendChild(overlay);
  let n = 3;
  if (window.audioEngine) window.audioEngine.playSFX('SFX-006-arena-start');
  const tick = () => {
    n--;
    if (n <= 0) { try { overlay.remove(); } catch (e) { /* ignore */ } done(); return; }
    const el = overlay.querySelector('#arena-digit');
    if (el) {
      el.textContent = n;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = 'scalePop 800ms cubic-bezier(0.16,1,0.3,1)';
    }
    setTimeout(tick, 850);
  };
  setTimeout(tick, 850);
}

/* ============================================================
   Screen 08 — Leaderboard
   ============================================================ */
const LBState = { filter: 'ALL' };

function renderScreen08() {
  const M = window.MOCK;
  const rows = LBState.filter === 'ALL'
    ? M.leaderboard
    : M.leaderboard.filter(p => p.rarity === LBState.filter);
  const me = M.leaderboard.find(p => p.id === M.currentPet.id);

  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Leaderboard</h1>
        <div class="flex gap-3">
          <button class="btn btn-sm" onclick="sharePage()">🔗 Share</button>
          <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-05')">← Back</button>
        </div>
      </div>

      ${me ? `
        <div class="banner banner--success" style="margin-bottom:16px;">
          <span>👑</span>
          <span>Your pet <strong>${escapeHTML(me.pet_name)}</strong> is ranked <strong class="text-accent">#${me.rank}</strong> of ${M.leaderboard.length}</span>
        </div>
      ` : ''}

      <div class="chips">
        ${['ALL','COMMON','RARE','EPIC','LEGENDARY'].map(r => `
          <span class="chip chip--${r.toLowerCase()} ${LBState.filter === r ? 'is-active' : ''}"
            tabindex="0" role="button"
            onclick="filterLB('${r}')"
            onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();filterLB('${r}');}">
            ${escapeHTML(r)}
          </span>
        `).join('')}
      </div>

      <table class="proto-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Pet</th>
            <th>Name</th>
            <th>Rarity</th>
            <th>Lv</th>
            <th>Score</th>
            <th>W / L</th>
            <th>Win%</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(p => `
            <tr class="${p.id === M.currentPet.id ? 'is-owner' : ''}" id="lb-row-${safeJSId(p.id)}"
              onclick="router.navigate('screen-09',{petId:'${safeJSId(p.id)}'})">
              <td class="rank-cell">${p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : '#'+p.rank}</td>
              <td>${petCanvasHTML(p, { size: 'thumb' })}</td>
              <td><strong>${escapeHTML(p.pet_name)}</strong><div class="card-meta">${escapeHTML(p.accessory || '')}</div></td>
              <td>${rarityBadgeHTML(p.rarity)}</td>
              <td>${p.level}</td>
              <td><strong class="text-accent">${p.arena_score.toLocaleString()}</strong></td>
              <td>${p.wins} / ${p.losses}</td>
              <td>${p.win_rate}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `;
}

function filterLB(r) {
  LBState.filter = r;
  if (window.audioEngine) window.audioEngine.playSFX('SFX-002-pet-tap-click');
  // anim-11: highlight rows on filter change
  $('#proto-content').innerHTML = renderScreen08();
  requestAnimationFrame(() => {
    $$('.proto-table tbody tr').forEach((row, i) => {
      row.style.animationDelay = `${i * 30}ms`;
      row.classList.add('row-highlight');
    });
  });
}
window.filterLB = filterLB;

function sharePage() {
  const url = location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => toast('Page URL copied!'));
  } else { toast('URL: ' + url); }
  if (window.fxEngine) window.fxEngine.emitBurst(window.innerWidth/2, 80, { count: 10, char: '🔗' });
}
window.sharePage = sharePage;

/* ============================================================
   Screen 09 — Battle Records
   ============================================================ */
function renderScreen09(ctx) {
  const M = window.MOCK;
  const petId = (ctx && ctx.petId) || M.currentPet.id;
  const pet = M.pets.find(p => p.id === petId) || M.currentPet;
  const myBattles = M.battles.filter(b => b.pet_a === pet.pet_name || b.pet_b === pet.pet_name);

  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Battle Records</h1>
        <div class="flex gap-3">
          <button class="btn btn-sm" onclick="sharePage()">🔗 Share</button>
          <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-05')">← Back</button>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div class="grid-2">
          <div class="text-center">
            ${petCanvasHTML(pet, { size: 'normal' })}
          </div>
          <div>
            <h2 class="text-accent">${escapeHTML(pet.pet_name)}</h2>
            <div style="margin-bottom:8px;">${rarityBadgeHTML(pet.rarity)} Lv.${pet.level}</div>
            <div class="card-meta">Owner: ${escapeHTML(pet.masked_email || '—')}</div>
            <div style="margin-top:12px;">
              <div>Arena Score: <strong class="text-accent">${pet.arena_score.toLocaleString()}</strong></div>
              <div>Record: <span style="color:var(--success);">${pet.wins}W</span> · <span style="color:var(--error);">${pet.losses}L</span></div>
              <div>Win Rate: ${((pet.wins / (pet.wins + pet.losses || 1)) * 100).toFixed(1)}%</div>
              <div>Last trained: ${formatDate(pet.last_trained_at)}</div>
            </div>
          </div>
        </div>
      </div>

      <table class="proto-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Mode</th>
            <th>Opponent</th>
            <th>Result</th>
            <th>Duration</th>
            <th>Score Δ</th>
          </tr>
        </thead>
        <tbody>
          ${myBattles.length === 0
            ? `<tr><td colspan="6" class="text-center text-secondary" style="padding:48px;">No battles yet. <a href="#" onclick="router.navigate('screen-07');return false;" style="color:var(--accent);">Enter the arena →</a></td></tr>`
            : myBattles.map(b => {
                const isWin = b.winner === pet.pet_name;
                const opp = b.pet_a === pet.pet_name ? b.pet_b : b.pet_a;
                return `
                  <tr onclick="router.navigate('screen-10',{battleId:'${safeJSId(b.id)}'})">
                    <td>${escapeHTML(b.date || formatDate(b.completed_at))}</td>
                    <td><strong>${escapeHTML(b.mode)}</strong></td>
                    <td>${escapeHTML(opp)} ${b.is_ai_opponent ? '<span class="card-meta">(AI)</span>' : ''}</td>
                    <td>${isWin ? '<strong class="text-success">WIN</strong>' : '<strong class="text-error">LOSS</strong>'}</td>
                    <td>${b.duration_seconds}s</td>
                    <td>${isWin ? `<span class="text-accent">+${b.stat_delta_a}</span>` : '<span class="text-error">—</span>'}</td>
                  </tr>
                `;
              }).join('')
          }
        </tbody>
      </table>
    </section>
  `;
}

/* ============================================================
   Screen 10 — Battle Result
   ============================================================ */
function renderScreen10(ctx) {
  const M = window.MOCK;
  const battleId = (ctx && ctx.battleId) || 'm001';
  const battle = M.battles.find(b => b.id === battleId) || M.battles[0];
  const isWin = ctx && ctx.isWin !== undefined ? ctx.isWin : (battle.winner === M.currentPet.pet_name);
  const myPet = M.currentPet;
  const oppName = battle.pet_a === myPet.pet_name ? battle.pet_b : battle.pet_a;
  const opponent = M.pets.find(p => p.pet_name === oppName) || {
    pet_name: oppName, sprite: '🤖', rarity: 'COMMON',
    stat_speed: 55, stat_strength: 55, stat_stamina: 55, level: 8
  };

  return `
    <section class="screen">
      <div class="battle-result-banner ${isWin ? '' : 'is-loss'}" id="battle-banner">
        <h1 id="result-title">${isWin ? '🏆 VICTORY!' : '💀 DEFEAT'}</h1>
        <p class="text-secondary" style="margin-top:12px;">${escapeHTML(battle.mode)} · ${battle.duration_seconds}s · ${formatDate(battle.completed_at)}</p>
      </div>

      <div class="card" style="margin:16px 0;">
        <h3 class="card-title">Stat Comparison</h3>
        <div class="stat-comparison">
          <div class="combatant-card card ${isWin ? 'is-winner' : 'is-loser'}" id="my-combatant">
            ${petCanvasHTML(myPet, { size: 'small' })}
            <div class="pet-name" style="margin-top:12px;">${escapeHTML(myPet.pet_name)}</div>
            <div>${rarityBadgeHTML(myPet.rarity)}</div>
            <div style="margin-top:8px;font-size:12px;">
              <div>SPD ${myPet.stat_speed}</div>
              <div>STR ${myPet.stat_strength}</div>
              <div>STA ${myPet.stat_stamina}</div>
              ${isWin && battle.stat_delta_a > 0 ? `<div style="color:var(--success);margin-top:6px;font-family:var(--font-display);font-size:9px;">+${battle.stat_delta_a} score</div>` : ''}
            </div>
          </div>
          <div class="vs">VS</div>
          <div class="combatant-card card ${!isWin ? 'is-winner' : 'is-loser'}">
            ${petCanvasHTML(opponent, { size: 'small' })}
            <div class="pet-name" style="margin-top:12px;">${escapeHTML(opponent.pet_name)}</div>
            <div>${rarityBadgeHTML(opponent.rarity)}</div>
            <div style="margin-top:8px;font-size:12px;">
              <div>SPD ${opponent.stat_speed}</div>
              <div>STR ${opponent.stat_strength}</div>
              <div>STA ${opponent.stat_stamina}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn" id="share-battle-btn" onclick="shareBattle('${safeJSId(battle.id)}')">🔗 Share Battle</button>
        <button class="btn btn-success" onclick="router.navigate('screen-07')">⚔️ Battle Again</button>
        <button class="btn btn-secondary" onclick="router.navigate('screen-08')">🏆 Leaderboard</button>
        <button class="btn btn-ghost" onclick="router.navigate('screen-05')">← My Pet</button>
      </div>
    </section>
  `;
}

function onMountScreen10(ctx) {
  const M = window.MOCK;
  const battleId = (ctx && ctx.battleId) || 'm001';
  const battle = M.battles.find(b => b.id === battleId) || M.battles[0];
  const isWin = ctx && ctx.isWin !== undefined ? ctx.isWin : (battle.winner === M.currentPet.pet_name);
  setTimeout(() => {
    if (isWin) {
      if (window.audioEngine) window.audioEngine.playSFX('SFX-007-arena-victory');
      // anim-09: WIN particle explosion — 24 gold 2×2px squares
      const banner = $('#battle-banner');
      if (banner && window.fxEngine) {
        window.fxEngine.emitBurstAt(banner, {
          count: 24, size: 4,
          colors: ['#fdcb6e','#fdcb6e','#a29bfe','#00b894'],
          speed: 7, life: 1600
        });
      }
      const title = $('#result-title');
      if (title) { title.style.animation = 'none'; void title.offsetWidth; title.style.animation = 'scalePop 600ms cubic-bezier(0.16,1,0.3,1)'; }
    } else {
      if (window.audioEngine) window.audioEngine.playSFX('SFX-008-arena-defeat');
      // anim-10: LOSS darkening
      const banner = $('#battle-banner');
      if (banner) { banner.style.animation = 'none'; void banner.offsetWidth; banner.style.animation = 'fadeIn 800ms ease-out'; }
    }
  }, 200);
}

function shareBattle(battleId) {
  const url = `${location.origin}${location.pathname}#screen-10`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => toast('Battle URL copied!'));
  } else { toast('URL: ' + url); }
  if (window.fxEngine) window.fxEngine.emitBurstAt($('#share-battle-btn'), { count: 8, char: '✦', colors: ['#fdcb6e'] });
}
window.shareBattle = shareBattle;

/* ============================================================
   Screen 11 — Marketplace (FF_MARKETPLACE feature gate)
   ============================================================ */
function renderScreen11() {
  const M = window.MOCK;
  const unlocked = M.metrics.dau >= M.metrics.marketplace_unlock_dau;

  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Marketplace</h1>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-05')">← Back</button>
      </div>

      <div class="banner banner--warning" style="margin-bottom:20px;">
        <span class="gate-icon">🔒</span>
        <div>
          <p style="margin:0;font-family:var(--font-display);font-size:9px;color:var(--warning);">FF_MARKETPLACE — Feature Gate Active</p>
          <p style="margin:4px 0 0;font-size:12px;color:var(--text-secondary);">
            Marketplace unlocks at <strong>${M.metrics.marketplace_unlock_dau.toLocaleString()} DAU</strong>.
            Currently: <strong class="text-accent">${M.metrics.dau.toLocaleString()} DAU</strong>.
            ${unlocked ? ' <strong style="color:var(--success);">UNLOCKED ✓</strong>' : 'Trades disabled until threshold is reached.'}
          </p>
        </div>
      </div>

      ${!unlocked ? `
        <div class="card text-center" style="padding:40px;">
          <div style="font-size:64px;margin-bottom:16px;">🏪</div>
          <h2 style="color:var(--text-secondary);">Coming Soon</h2>
          <p class="text-secondary" style="max-width:400px;margin:12px auto;">
            The marketplace lets you trade pets with other players once the platform reaches critical mass.
            Anti-flip rules ensure fair trading.
          </p>
          <div class="card" style="max-width:320px;margin:20px auto;background:var(--surface-overlay);">
            <p style="font-family:var(--font-display);font-size:9px;color:var(--text-secondary);margin:0 0 8px;">Progress to unlock</p>
            <div class="stat-bar__track">
              <div class="stat-bar__fill" style="width:${(M.metrics.dau/M.metrics.marketplace_unlock_dau*100).toFixed(1)}%;background:var(--warning);"></div>
            </div>
            <p style="font-family:var(--font-display);font-size:8px;color:var(--warning);margin:8px 0 0;">
              ${M.metrics.dau.toLocaleString()} / ${M.metrics.marketplace_unlock_dau.toLocaleString()} DAU
            </p>
          </div>
        </div>
      ` : `
        <div class="marketplace-grid">
          ${[
            { pet_name: 'StormFang', rarity: 'EPIC', price: 3500, sprite: '⚡', looking_for: 'EPIC+ pet with SPD ≥ 70' },
            { pet_name: 'EmberClaw', rarity: 'RARE', price: 1200, sprite: '🔴', looking_for: 'Common with high speed' },
            { pet_name: 'VoidSpinner', rarity: 'EPIC', price: 2800, sprite: '🕷️', looking_for: null },
          ].map(l => `
            <div class="listing-card">
              <div class="pet-canvas pet-canvas--small pet-canvas--${l.rarity.toLowerCase()}" style="margin:0 auto;">
                <div class="pet-bg-grid"></div>
                <div class="pet-sprite">${escapeHTML(l.sprite)}</div>
              </div>
              <div class="pet-name" style="margin-top:12px;">${escapeHTML(l.pet_name)}</div>
              <div>${rarityBadgeHTML(l.rarity)}</div>
              <div class="listing-price">${l.price.toLocaleString()} 💎</div>
              <div class="listing-meta">${l.looking_for ? 'Wants: ' + escapeHTML(l.looking_for) : 'Open offer'}</div>
              <button class="btn btn-sm" style="margin-top:12px;" onclick="toast('Trade submitted (demo).');">Trade</button>
            </div>
          `).join('')}
        </div>
        <div class="card" style="margin-top:16px;">
          <h3 class="card-title">Anti-Flip Rules</h3>
          <ul style="line-height:2;color:var(--text-secondary);">
            <li>5% trade fee paid to platform</li>
            <li>7-day re-list cooldown after trade</li>
            <li>Atomic ownership transfer via escrow</li>
            <li>No direct currency transfer — credit system only</li>
          </ul>
        </div>
      `}
    </section>
  `;
}

/* ============================================================
   Screen 12 — Token Recovery
   ============================================================ */
const RecoveryState = { step: 1, email: '' };

function renderScreen12() {
  return `
    <section class="screen">
      <div class="screen-title">
        <h1>Token Recovery</h1>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-01')">← Back</button>
      </div>
      <div class="card" style="max-width:520px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:48px;">🔑</div>
          <p class="text-secondary">Lost your pet's URL? Enter the email you used to claim it and we'll send a recovery link.</p>
        </div>

        <div id="recovery-step-body">${renderRecoveryStep()}</div>
      </div>
    </section>
  `;
}

function renderRecoveryStep() {
  if (RecoveryState.step === 1) {
    return `
      <div class="form-field">
        <label for="recovery-email">Email address used during claim</label>
        <input id="recovery-email" type="email" class="form-input" placeholder="you@example.com" value="${escapeHTML(RecoveryState.email)}">
      </div>
      <button class="btn w-full" onclick="recoverySendCode()">📧 Send Recovery Email</button>
      <p class="card-meta" style="margin-top:12px;">A 6-digit code will be sent. Links expire in 24 hours.</p>
    `;
  }
  return `
    <div class="banner banner--success" style="margin-bottom:16px;">
      <span>✉️</span>
      <span>Recovery code sent to <strong class="text-accent">${escapeHTML(RecoveryState.email)}</strong></span>
    </div>
    <h3 class="card-title">Enter Recovery Code</h3>
    <div id="recovery-digits" class="code-digits">
      ${[0,1,2,3,4,5].map(i => `<input class="code-digit" maxlength="1" inputmode="numeric" data-idx="${i}">`).join('')}
    </div>
    <p class="card-meta text-center">Demo code: <strong class="text-accent">${window.MOCK ? window.MOCK.otp_code : '847291'}</strong></p>
    <div class="modal-actions" style="margin-top:16px;">
      <button class="btn btn-ghost" onclick="RecoveryState.step=1;refreshRecovery();">← Re-enter email</button>
      <button class="btn" onclick="recoveryVerify()">Recover →</button>
    </div>
  `;
}

function refreshRecovery() {
  const body = $('#recovery-step-body');
  if (body) { body.innerHTML = renderRecoveryStep(); if (RecoveryState.step === 2) bindRecoveryDigits(); }
}

function recoverySendCode() {
  const emailEl = $('#recovery-email');
  const email = (emailEl ? emailEl.value : '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast('Please enter a valid email.', 'error');
    if (window.audioEngine) window.audioEngine.playSFX('SFX-invalid');
    if (emailEl && window.fxEngine) window.fxEngine.shakeElement(emailEl);
    return;
  }
  RecoveryState.email = email;
  RecoveryState.step = 2;
  if (window.audioEngine) window.audioEngine.playSFX('SFX-009-claim-success');
  toast('Recovery code sent!');
  refreshRecovery();
}

function bindRecoveryDigits() {
  const inputs = $$('#recovery-digits .code-digit');
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', (ev) => {
      const v = ev.target.value.replace(/\D/g, '').slice(0, 1);
      ev.target.value = v;
      if (v && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Backspace' && !ev.target.value && i > 0) inputs[i - 1].focus();
    });
  });
  if (inputs[0]) inputs[0].focus();
}

function recoveryVerify() {
  const M = window.MOCK;
  const code = $$('#recovery-digits .code-digit').map(x => x.value).join('');
  if (code !== M.otp_code) {
    const wrap = $('#recovery-digits');
    if (wrap) { wrap.classList.add('is-invalid'); if (window.fxEngine) window.fxEngine.shakeElement(wrap); setTimeout(() => wrap.classList.remove('is-invalid'), 600); }
    if (window.audioEngine) window.audioEngine.playSFX('SFX-invalid');
    toast(`Invalid code. Try: ${M.otp_code}`, 'error');
    return;
  }
  if (window.audioEngine) window.audioEngine.playSFX('SFX-009-claim-success');
  toast('✅ Recovery successful! Redirecting to your pet...');
  const pet = M.currentPet;
  const petUrl = `${location.origin}${location.pathname.replace(/\/prototype.*/, '')}/pet/${pet.id}`;
  const body = $('#recovery-step-body');
  if (body) {
    body.innerHTML = `
      <div class="banner banner--success" style="margin-bottom:16px;">
        <span>✅</span>
        <span>Pet URL recovered!</span>
      </div>
      <div class="url-copy-box">
        <code style="font-size:8px;">${escapeHTML(petUrl)}</code>
        <button class="btn btn-sm" onclick="copyPetUrl('${escapeHTML(petUrl)}')">📋 Copy</button>
      </div>
      <div style="margin-top:16px;">
        <button class="btn w-full" onclick="router.navigate('screen-05')">→ Go to My Pet</button>
      </div>
    `;
    if (window.fxEngine) window.fxEngine.emitBurst(window.innerWidth/2, window.innerHeight/2, { count: 16, char: '🔑', colors: ['#fdcb6e'], speed: 5 });
  }
  RecoveryState.step = 1;
  RecoveryState.email = '';
}

window.recoverySendCode = recoverySendCode;
window.recoveryVerify = recoveryVerify;
window.refreshRecovery = refreshRecovery;

/* ============================================================
   Screen 13 — GDPR Self-Service
   ============================================================ */
function renderScreen13() {
  const M = window.MOCK;
  return `
    <section class="screen">
      <div class="screen-title">
        <h1>GDPR Self-Service</h1>
        <button class="btn btn-ghost btn-sm" onclick="router.navigate('screen-05')">← Back</button>
      </div>

      <div class="card" style="margin-bottom:16px;background:rgba(253,203,110,0.06);border-color:var(--warning);">
        <p style="font-size:13px;color:var(--text-secondary);">
          Under GDPR / CCPA, you have the right to access, correct, or delete your data.
          All requests are processed within <strong class="text-accent">7 calendar days</strong>.
          Confirmation will be sent to your registered email.
        </p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3 class="card-title">Submit Request</h3>
          <div class="form-field">
            <label for="gdpr-type">Request type</label>
            <select id="gdpr-type" class="form-select">
              <option value="ERASURE">ERASURE — Delete all my data</option>
              <option value="ACCESS">ACCESS — Export my data</option>
              <option value="RESTRICT">RESTRICT — Restrict processing</option>
              <option value="OBJECT">OBJECT — Remove from leaderboard</option>
              <option value="RECTIFY">RECTIFY — Correct my data</option>
            </select>
          </div>
          <div class="form-field">
            <label for="gdpr-email">Verified email (read-only)</label>
            <input id="gdpr-email" type="email" class="form-input" value="${escapeHTML(M.currentPet.masked_email)}" disabled>
          </div>
          <div class="form-field">
            <label for="gdpr-reason">Reason / notes (optional)</label>
            <textarea id="gdpr-reason" class="form-textarea" placeholder="Describe your request..."></textarea>
          </div>
          <button class="btn w-full" onclick="submitGdprRequest()">Submit Request</button>
          <p class="card-meta" style="margin-top:12px;">SLA: 7 calendar days. An email confirmation will be sent within 24h.</p>
        </div>

        <div class="card">
          <h3 class="card-title">Request History</h3>
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
            <tbody id="gdpr-rows">
              ${M.gdpr_requests.map(r => renderGdprRow(r)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderGdprRow(r) {
  const statusClass = r.status === 'COMPLETED' ? 'completed' : r.status === 'PROCESSING' ? 'processing' : 'pending';
  return `
    <tr>
      <td><code style="font-size:10px;">${escapeHTML(r.id)}</code></td>
      <td><strong>${escapeHTML(r.request_type)}</strong></td>
      <td style="font-size:12px;">${formatDate(r.submitted_at)}</td>
      <td><span class="status-pill status-pill--${statusClass}">${escapeHTML(r.status)}</span></td>
      <td style="font-size:12px;">${formatDate(r.sla_deadline)}</td>
    </tr>
  `;
}

function submitGdprRequest() {
  const type = ($('#gdpr-type') || {}).value || 'ERASURE';
  const M = window.MOCK;
  const newReq = {
    id: 'gdpr-' + String(M.gdpr_requests.length + 1).padStart(3, '0'),
    request_type: type,
    status: 'PENDING',
    sla_deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    submitted_at: new Date().toISOString(),
  };
  M.gdpr_requests.unshift(newReq);
  if (window.audioEngine) window.audioEngine.playSFX('SFX-009-claim-success');
  toast('✅ Request submitted. You will receive confirmation within 24h.');
  // Update rows in-place
  const tbody = $('#gdpr-rows');
  if (tbody) tbody.innerHTML = M.gdpr_requests.map(r => renderGdprRow(r)).join('');
  const newRow = tbody ? tbody.querySelector('tr:first-child') : null;
  if (newRow && window.fxEngine) window.fxEngine.rankHighlight(newRow);
}
window.submitGdprRequest = submitGdprRequest;

/* ============================================================
   Register all 13 screens
   ============================================================ */
router.register('screen-01', renderScreen01, { title: '01 · Landing',         onMount: onMountScreen01 });
router.register('screen-02', renderScreen02, { title: '02 · Claim — Email' });
router.register('screen-03', renderScreen03, { title: '03 · Claim — OTP',     onMount: onMountScreen03 });
router.register('screen-04', renderScreen04, { title: '04 · Claim — URL',      onMount: onMountScreen04 });
router.register('screen-05', renderScreen05, { title: '05 · My Pet' });
router.register('screen-06', renderScreen06, { title: '06 · Training',         onMount: onMountScreen06 });
router.register('screen-07', renderScreen07, { title: '07 · Arena Lobby' });
router.register('screen-08', renderScreen08, { title: '08 · Leaderboard' });
router.register('screen-09', renderScreen09, { title: '09 · Battle Records' });
router.register('screen-10', renderScreen10, { title: '10 · Battle Result',    onMount: onMountScreen10 });
router.register('screen-11', renderScreen11, { title: '11 · Marketplace' });
router.register('screen-12', renderScreen12, { title: '12 · Token Recovery' });
router.register('screen-13', renderScreen13, { title: '13 · GDPR' });

/* ============================================================
   Boot
   ============================================================ */
// Whitelist of click-action handler names that data-action can dispatch.
// Prevents arbitrary function lookup from DOM attributes.
const SAFE_ACTIONS = {
  'onMyPetClick()': () => onMyPetClick(),
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.fxEngine) window.fxEngine.init();

  router.init();

  window.addEventListener('hashchange', () => {
    const id = (location.hash || '').slice(1).split('?')[0];
    if (id && id !== router.current && router.screens[id]) {
      router.navigate(id);
    }
  });

  // Delegated click for data-action elements
  document.addEventListener('click', (ev) => {
    const target = ev.target.closest('[data-action]');
    if (!target) return;
    const raw = (target.getAttribute('data-action') || '').trim();
    const fn = SAFE_ACTIONS[raw];
    if (typeof fn === 'function') fn();
  });
});
