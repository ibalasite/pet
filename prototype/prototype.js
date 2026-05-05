/* =========================================================
   PIXEL PET ARENA — Prototype JavaScript
   ========================================================= */
(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────── */
  function $ (sel) { return document.querySelector(sel); }
  function $$ (sel) { return Array.from(document.querySelectorAll(sel)); }

  /** Escape a string for safe insertion into HTML markup. */
  function esc (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Create an element. inner is treated as trusted HTML only when content
   * originates from MOCK_DATA constants or static string literals — never
   * from user-supplied input. User-facing dynamic text is always set via
   * textContent, not innerHTML.
   */
  function el (tag, cls, inner) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (inner !== undefined) e.innerHTML = inner;
    return e;
  }

  /** Create an element whose text content is set safely (no HTML injection). */
  function el_text (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function fmt_date (iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmt_time_ago (iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var hours = Math.floor(diff / 36e5);
    if (hours < 1) return 'Just now';
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  }
  function rarity_class (r) {
    return 'rarity-' + (r || 'common').toLowerCase();
  }
  function rarity_badge_html (rarity) {
    var symbols = { COMMON: '◆', RARE: '◈', EPIC: '◉', LEGENDARY: '★' };
    return '<span class="rarity-badge ' + rarity_class(rarity) + '">' +
           (symbols[rarity] || '◆') + ' ' + rarity + '</span>';
  }
  function pet_by_id (id) {
    return window.MOCK_DATA.pets.find(function (p) { return p.id === id; }) || window.MOCK_DATA.pets[0];
  }
  function current_pet () {
    return pet_by_id(window.MOCK_DATA.currentPetId);
  }

  /* ── Audio Simulation ────────────────────────────────── */
  var audioEnabled = true;
  function play_sfx (id, label) {
    if (!audioEnabled) return;
    console.log('[AUDIO] SFX %s: %s', id, label);
    var ind = $('#audio-indicator');
    if (ind) {
      ind.textContent = '♪ ' + label;
      ind.classList.add('visible');
      clearTimeout(ind._t);
      ind._t = setTimeout(function () { ind.classList.remove('visible'); }, 1800);
    }
  }
  function play_bgm (id, label) {
    console.log('[AUDIO] BGM %s: %s  ▶ playing', id, label);
  }

  /* ── Email validation ────────────────────────────────── */
  /** Basic structural email check — not a user-input sanitizer, just UX guard. */
  function is_valid_email (val) {
    return typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
  }

  /* ── Toast ───────────────────────────────────────────── */
  function toast (msg, type) {
    type = type || 'info';
    var container = $('#toast-container');
    if (!container) return;
    // Use textContent — msg must never be rendered as HTML to avoid XSS.
    var t = el_text('div', 'toast ' + type, msg);
    container.appendChild(t);
    setTimeout(function () {
      t.classList.add('exit');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 250);
    }, 3000);
  }

  /* ── Particle Burst ──────────────────────────────────── */
  function particle_burst (x, y) {
    var canvas = $('#fx-canvas');
    if (!canvas) return;
    var colors = ['#fdcb6e', '#ffd700', '#fff', '#ffec8b', '#ffa500'];
    var angles = [];
    for (var i = 0; i < 24; i++) { angles.push(i * (360 / 24)); }
    angles.forEach(function (deg, i) {
      var p = el('div', 'particle');
      var dist = 60 + Math.random() * 60;
      var rad = deg * (Math.PI / 180);
      var tx = Math.cos(rad) * dist + 'px';
      var ty = Math.sin(rad) * dist + 'px';
      p.style.cssText = [
        'left:' + (x - 4) + 'px',
        'top:' + (y - 4) + 'px',
        'background:' + colors[i % colors.length],
        '--tx:' + tx,
        '--ty:' + ty,
        'animation-delay:' + (i * 15) + 'ms',
        'animation-duration:' + (700 + Math.random() * 300) + 'ms',
      ].join(';');
      canvas.appendChild(p);
      setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 1200);
    });
  }

  /* ── Stat Float-Up ───────────────────────────────────── */
  function stat_float (text, x, y) {
    var f = el('div', 'stat-float', text);
    f.style.left = x + 'px';
    f.style.top  = y + 'px';
    document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1300);
  }

  /* ── Pet Pixel Sprite (CSS art) ──────────────────────── */
  function build_pet_sprite (pet) {
    var colors = {
      COMMON:    { body: '#8a9bb0', eye: '#4a5568', glow: '#b2bec3' },
      RARE:      { body: '#1eb8b4', eye: '#006b68', glow: '#4ecdc4' },
      EPIC:      { body: '#7c6fe0', eye: '#3d2fa0', glow: '#a29bfe' },
      LEGENDARY: { body: '#e8a520', eye: '#8b5e00', glow: '#fdcb6e' },
    };
    var c = colors[pet.rarity] || colors.COMMON;
    // Build a pixel-art-style SVG sprite
    return '<svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">' +
      // Body
      '<rect x="4" y="5" width="8" height="7" fill="' + c.body + '"/>' +
      // Ears
      '<rect x="3" y="3" width="2" height="3" fill="' + c.body + '"/>' +
      '<rect x="11" y="3" width="2" height="3" fill="' + c.body + '"/>' +
      // Head
      '<rect x="3" y="4" width="10" height="5" fill="' + c.body + '"/>' +
      // Eyes
      '<rect x="5" y="5" width="2" height="2" fill="' + c.eye + '"/>' +
      '<rect x="9" y="5" width="2" height="2" fill="' + c.eye + '"/>' +
      // Eye shine
      '<rect x="6" y="5" width="1" height="1" fill="#fff"/>' +
      '<rect x="10" y="5" width="1" height="1" fill="#fff"/>' +
      // Nose
      '<rect x="7" y="7" width="2" height="1" fill="' + c.eye + '"/>' +
      // Legs
      '<rect x="5" y="12" width="2" height="2" fill="' + c.body + '"/>' +
      '<rect x="9" y="12" width="2" height="2" fill="' + c.body + '"/>' +
      // Tail
      '<rect x="12" y="9" width="2" height="1" fill="' + c.body + '"/>' +
      '<rect x="13" y="8" width="1" height="1" fill="' + c.body + '"/>' +
      // Glow outline (legendary / epic)
      ((pet.rarity === 'LEGENDARY' || pet.rarity === 'EPIC') ?
        '<rect x="3" y="4" width="10" height="5" fill="none" stroke="' + c.glow + '" stroke-width="0.5" opacity="0.5"/>' : '') +
    '</svg>';
  }

  function build_pet_canvas_html (pet, size) {
    size = size || 200;
    var small = size < 100;
    var sprite = build_pet_sprite(pet);
    if (small) {
      return '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">' + sprite + '</div>';
    }
    return '<div class="pet-sprite"><div class="pet-body">' + sprite + '</div></div>' +
           '<div class="pet-shadow"></div>' +
           '<div class="pet-grid-overlay"></div>' +
           '<div class="pet-tap-hint">TAP PET</div>';
  }

  /* ── Router ──────────────────────────────────────────── */
  var Router = (function () {
    var current = null;
    var history_stack = [];
    var SCREEN_META = {
      'screen-landing':       { label: 'LANDING',        desc: 'Entry — Claim a pet or view leaderboard' },
      'screen-claim':         { label: 'CLAIM PET',      desc: '3-step wizard: Email → OTP → URL reveal' },
      'screen-pet':           { label: 'MY PET',         desc: 'Pet status, stats, food, actions' },
      'screen-training':      { label: 'TRAINING',       desc: 'Sprint / Lift / Endurance daily training' },
      'screen-arena':         { label: 'ARENA LOBBY',    desc: 'RACE or SUMO matchmaking' },
      'screen-arena-result':  { label: 'BATTLE RESULT',  desc: 'Win/Loss result + stats comparison' },
      'screen-leaderboard':   { label: 'LEADERBOARD',    desc: 'Top 100 pets by arena score' },
      'screen-battle-records':{ label: 'BATTLE RECORDS', desc: 'Your pet\'s battle history' },
      'screen-marketplace':   { label: 'MARKETPLACE',    desc: 'Feature-gated pet trading (DAU > 1000)' },
      'screen-gdpr':          { label: 'GDPR',           desc: 'Data rights self-service form' },
    };

    function go (id, opts) {
      opts = opts || {};
      if (current && current !== id) { history_stack.push(current); }
      current = id;

      // Hide all screens
      $$('.screen').forEach(function (s) { s.classList.remove('active'); });

      // Render
      var renderer = RENDERERS[id];
      if (renderer) { renderer(opts); }

      // Activate
      var scr = $('#' + id);
      if (scr) { scr.classList.add('active'); scr.scrollTop = 0; }

      // Breadcrumb
      var bc = $('#breadcrumb');
      if (bc && SCREEN_META[id]) { bc.textContent = SCREEN_META[id].label; }

      // BGM
      if (id === 'screen-pet')   { play_bgm('BGM-002', 'pet-theme'); }
      if (id === 'screen-arena') { play_bgm('BGM-001', 'arena-battle'); }
    }

    function back () {
      if (history_stack.length) { go(history_stack.pop()); }
      else { go('screen-landing'); }
    }

    function get_meta () { return SCREEN_META; }
    function get_current () { return current; }

    return { go: go, back: back, get_meta: get_meta, get_current: get_current };
  })();

  /* ── Screen Renderers ────────────────────────────────── */
  var RENDERERS = {};

  /* ── screen-landing ─────────────────────────────────── */
  RENDERERS['screen-landing'] = function () {
    var c = $('#screen-landing');
    if (!c) return;
    var pet = window.MOCK_DATA.pets[Math.floor(Math.random() * 3)]; // vary the demo pet
    c.innerHTML =
      '<div class="game-navbar">' +
        '<span class="logo">PIXEL PET<br>ARENA</span>' +
        '<div class="nav-links">' +
          '<span class="nav-link" data-nav="screen-leaderboard">LEADERBOARD</span>' +
          '<span class="nav-link" data-nav="screen-gdpr">GDPR</span>' +
        '</div>' +
      '</div>' +
      '<div class="screen-content">' +
        '<h1 class="hero-title">PIXEL<br>PET<br>ARENA</h1>' +
        '<p class="hero-subtitle">Claim. Train. Battle.<br>Only one can be champion.</p>' +

        '<div style="display:flex;justify-content:center;margin-bottom:24px;">' +
          '<div class="pet-canvas-mock" id="landing-pet-canvas" style="cursor:pointer;" tabindex="0" aria-label="Demo pet — click to tap">' +
            build_pet_canvas_html(pet) +
          '</div>' +
        '</div>' +

        '<div class="rarity-hint-row">' +
          '<span class="rarity-hint-item rarity-common">◆ COMMON</span>' +
          '<span class="rarity-hint-item rarity-rare">◈ RARE</span>' +
          '<span class="rarity-hint-item rarity-epic">◉ EPIC</span>' +
          '<span class="rarity-hint-item rarity-legendary">★ LEGENDARY</span>' +
        '</div>' +

        '<div class="stats-counter">' +
          '<div class="counter-item"><span class="counter-value">847</span><span class="counter-label">PETS CLAIMED</span></div>' +
          '<div class="counter-item"><span class="counter-value">2,341</span><span class="counter-label">BATTLES FOUGHT</span></div>' +
          '<div class="counter-item"><span class="counter-value">12</span><span class="counter-label">LEGENDARY</span></div>' +
        '</div>' +

        '<button class="btn btn-primary btn-full btn-lg mb-2" data-nav="screen-claim">CLAIM YOUR PET</button>' +
        '<button class="btn btn-ghost btn-full" data-nav="screen-leaderboard">VIEW LEADERBOARD</button>' +

        '<p class="muted text-center mt-2" style="font-size:11px;">Already claimed? <span class="nav-link" style="color:var(--color-primary);cursor:pointer;" data-nav="screen-pet">Go to my pet →</span></p>' +
      '</div>';

    var canvas = c.querySelector('#landing-pet-canvas');
    if (canvas) {
      canvas.addEventListener('click', function () {
        play_sfx('SFX-001', 'pet-tap-pop');
        canvas.style.transform = 'scale(0.95)';
        setTimeout(function () { canvas.style.transform = ''; }, 120);
      });
    }
    wire_nav(c);
  };

  /* ── screen-claim ────────────────────────────────────── */
  RENDERERS['screen-claim'] = function () {
    var c = $('#screen-claim');
    if (!c) return;
    var step = 1;

    function render_claim () {
      c.innerHTML =
        '<div class="game-navbar">' +
          '<span class="logo">PIXEL PET<br>ARENA</span>' +
        '</div>' +
        '<div class="screen-content">' +
          '<div class="claim-header">' +
            '<p class="claim-title">CLAIM YOUR PET</p>' +
            '<p class="claim-subtitle">One email = one permanent pet. Choose wisely.</p>' +
          '</div>' +
          '<div class="step-dots">' +
            '<div class="step-dot ' + (step >= 1 ? 'active' : '') + (step > 1 ? ' done' : '') + '" title="Step 1: Email"></div>' +
            '<div class="step-dot ' + (step >= 2 ? 'active' : '') + (step > 2 ? ' done' : '') + '" title="Step 2: Verify"></div>' +
            '<div class="step-dot ' + (step >= 3 ? 'active' : '') + '" title="Step 3: Reveal"></div>' +
          '</div>' +

          // Step 1
          '<div class="step-panel ' + (step === 1 ? 'active' : '') + '" id="claim-step-1">' +
            '<div class="card">' +
              '<div class="card-header">STEP 1 — YOUR EMAIL</div>' +
              '<div class="form-group">' +
                '<label class="form-label" for="claim-email">EMAIL ADDRESS</label>' +
                '<input class="form-input" id="claim-email" type="email" placeholder="you@example.com" />' +
              '</div>' +
              '<button class="btn btn-primary btn-full" id="claim-email-btn">SEND MAGIC LINK</button>' +
            '</div>' +
          '</div>' +

          // Step 2
          '<div class="step-panel ' + (step === 2 ? 'active' : '') + '" id="claim-step-2">' +
            '<div class="card">' +
              '<div class="card-header">STEP 2 — VERIFY OTP</div>' +
              '<p class="muted mb-2" style="font-size:12px;">Enter the 6-digit code sent to your email.</p>' +
              '<div class="otp-inputs mb-2">' +
                [1,2,3,4,5,6].map(function(i){ return '<input class="otp-digit" maxlength="1" type="text" id="otp-' + i + '" inputmode="numeric" />'; }).join('') +
              '</div>' +
              '<button class="btn btn-primary btn-full" id="claim-otp-btn">VERIFY CODE</button>' +
            '</div>' +
          '</div>' +

          // Step 3
          '<div class="step-panel ' + (step === 3 ? 'active' : '') + '" id="claim-step-3">' +
            '<div class="card">' +
              '<div class="card-header">STEP 3 — YOUR PET IS READY!</div>' +
              '<div class="rarity-reveal mb-2 text-center">' +
                rarity_badge_html('RARE') +
              '</div>' +
              '<div style="display:flex;justify-content:center;margin-bottom:16px;">' +
                '<div class="pet-canvas-mock" style="width:140px;height:140px;">' +
                  build_pet_canvas_html(window.MOCK_DATA.pets[0], 140) +
                '</div>' +
              '</div>' +
              '<p class="sub-title text-center">Your permanent pet URL:</p>' +
              '<div class="url-reveal-box mb-2" id="pet-url-box">https://pixelpetarena.io/pet/pet-001-teal-spark-8472938471</div>' +
              '<div style="display:flex;gap:8px;">' +
                '<button class="btn btn-secondary" id="copy-url-btn" style="flex:1">COPY LINK</button>' +
                '<button class="btn btn-primary" data-nav="screen-pet" style="flex:1">GO TO MY PET →</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="mt-2 text-center">' +
            '<button class="btn btn-ghost btn-sm" data-nav="screen-landing">← BACK TO HOME</button>' +
          '</div>' +
        '</div>';

      // Step 1 handler
      var emailBtn = c.querySelector('#claim-email-btn');
      if (emailBtn) {
        emailBtn.addEventListener('click', function () {
          var email = c.querySelector('#claim-email');
          if (!email || !is_valid_email(email.value)) { toast('Enter a valid email address', 'error'); return; }
          play_sfx('SFX-008', 'claim-success');
          toast('Magic link sent! Check your inbox ✓', 'success');
          step = 2;
          render_claim();
        });
      }

      // OTP auto-advance
      var otpDigits = c.querySelectorAll('.otp-digit');
      otpDigits.forEach(function (digit, idx) {
        digit.addEventListener('input', function () {
          if (digit.value.length === 1 && idx < otpDigits.length - 1) {
            otpDigits[idx + 1].focus();
          }
        });
      });

      // Step 2 handler
      var otpBtn = c.querySelector('#claim-otp-btn');
      if (otpBtn) {
        otpBtn.addEventListener('click', function () {
          step = 3;
          play_sfx('SFX-008', 'claim-success');
          render_claim();
        });
      }

      // Copy URL
      var copyBtn = c.querySelector('#copy-url-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var urlBox = c.querySelector('#pet-url-box');
          if (urlBox && navigator.clipboard) {
            navigator.clipboard.writeText(urlBox.textContent);
            toast('Pet URL copied!', 'success');
          }
        });
      }

      wire_nav(c);
    }

    render_claim();
  };

  /* ── screen-pet ──────────────────────────────────────── */
  RENDERERS['screen-pet'] = function () {
    var c = $('#screen-pet');
    if (!c) return;
    var pet = current_pet();

    c.innerHTML =
      '<div class="game-navbar">' +
        '<span class="logo">PIXEL PET<br>ARENA</span>' +
        '<div class="nav-links">' +
          '<span class="nav-link active" data-nav="screen-pet">PET</span>' +
          '<span class="nav-link" data-nav="screen-arena">ARENA</span>' +
          '<span class="nav-link" data-nav="screen-leaderboard">SCORES</span>' +
        '</div>' +
      '</div>' +
      '<div class="screen-content">' +

        '<div class="pet-page-top">' +
          '<div class="pet-canvas-mock" id="pet-canvas-main" tabindex="0" aria-label="Your pet — click to interact">' +
            build_pet_canvas_html(pet) +
          '</div>' +
          '<div class="pet-page-info">' +
            '<div class="pet-name-display">' + pet.pet_name + '</div>' +
            '<div class="pet-level">LVL ' + pet.level + '</div>' +
            rarity_badge_html(pet.rarity) +
            '<div class="mt-1 muted" style="font-size:11px;">Last trained: ' + fmt_time_ago(pet.last_trained_at) + '</div>' +
            '<div class="mt-1" style="font-family:var(--font-pixel);font-size:7px;color:var(--color-accent);">SCORE: ' + pet.arena_score + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card mb-2">' +
          '<div class="card-header">STATS</div>' +
          '<div class="stats-panel">' +
            stat_bar_html('SPEED',    'speed',    pet.stat_speed) +
            stat_bar_html('STRENGTH', 'strength', pet.stat_strength) +
            stat_bar_html('STAMINA',  'stamina',  pet.stat_stamina) +
          '</div>' +
        '</div>' +

        '<div class="card mb-2">' +
          '<div class="card-header">FOOD INVENTORY</div>' +
          '<div class="food-grid">' +
            window.MOCK_DATA.food.slice(0, 3).map(food_item_html).join('') +
          '</div>' +
        '</div>' +

        '<div class="pet-action-grid">' +
          '<button class="btn btn-primary" data-nav="screen-training">⚡ TRAIN</button>' +
          '<button class="btn btn-accent" data-nav="screen-arena">⚔ BATTLE</button>' +
          '<button class="btn btn-ghost btn-sm" data-nav="screen-battle-records">RECORDS</button>' +
          '<button class="btn btn-ghost btn-sm" data-nav="screen-marketplace">MARKET</button>' +
        '</div>' +

      '</div>';

    var petCanvas = c.querySelector('#pet-canvas-main');
    if (petCanvas) {
      petCanvas.addEventListener('click', function (e) {
        play_sfx('SFX-001', 'pet-tap-pop');
        particle_burst(e.clientX, e.clientY);
        petCanvas.style.borderColor = 'var(--color-accent)';
        setTimeout(function () { petCanvas.style.borderColor = ''; }, 400);
      });
    }
    wire_nav(c);
  };

  /* ── screen-training ─────────────────────────────────── */
  RENDERERS['screen-training'] = function () {
    var c = $('#screen-training');
    if (!c) return;
    var pet = current_pet();
    var trained = { speed: false, strength: false, stamina: false };

    function render_training () {
      c.innerHTML =
        '<div class="game-navbar">' +
          '<span class="logo">PIXEL PET<br>ARENA</span>' +
        '</div>' +
        '<div class="screen-content">' +
          '<h2 class="section-title">TRAINING</h2>' +

          '<div class="daily-timer">' +
            '<div class="timer-label">DAILY RESET IN</div>' +
            '<div class="timer-value" id="train-timer">14:32:08</div>' +
          '</div>' +

          '<p class="muted mb-2" style="font-size:12px;">Each exercise may be used once per day. Stats accumulate over time.</p>' +

          '<div class="training-cards">' +
            training_card_html('sprint',    '🏃', 'SPRINT',    'A quick burst of speed training.',   'Speed', 3,    trained.speed,    pet.stat_speed) +
            training_card_html('lift',      '🏋', 'LIFT',      'Heavy resistance builds power.',      'Strength', 4, trained.strength, pet.stat_strength) +
            training_card_html('endurance', '🫁', 'ENDURANCE', 'Long-distance endurance run.',        'Stamina', 5,  trained.stamina,  pet.stat_stamina) +
          '</div>' +

          '<div class="mt-3">' +
            '<button class="btn btn-ghost btn-full" data-nav="screen-pet">← BACK TO PET</button>' +
          '</div>' +
        '</div>';

      // Wire training cards
      c.querySelectorAll('.training-card').forEach(function (card) {
        card.addEventListener('click', function (e) {
          var stat = card.dataset.stat;
          var bonus = parseInt(card.dataset.bonus, 10);
          var name = card.dataset.name;
          if (trained[stat]) return;
          trained[stat] = true;
          card.classList.add('used');

          // Float-up indicator
          var rect = card.getBoundingClientRect();
          stat_float('+' + bonus + ' ' + name.toUpperCase(), rect.left + rect.width / 2 - 30, rect.top - 8);

          toast(name.toUpperCase() + ' TRAINING COMPLETE! +' + bonus + ' ' + name, 'success');
          play_sfx('SFX-001', 'training-done');
        });
      });

      // Countdown timer — both the interval ID and remaining seconds are stored
      // on the stable container `c` so re-renders (which replace innerHTML and
      // orphan the old timerEl node) preserve state and never leak intervals.
      if (c._timerInterval) {
        clearInterval(c._timerInterval);
        c._timerInterval = null;
      }
      // Initialise secs only on the very first render; subsequent renders
      // (e.g. after a training card is clicked) resume from the saved value.
      if (c._timerSecs === undefined) {
        c._timerSecs = 14 * 3600 + 32 * 60 + 8;
      }
      var timerEl = c.querySelector('#train-timer');
      if (timerEl) {
        // Paint current value immediately so the display is never stale.
        var _h0 = Math.floor(c._timerSecs / 3600);
        var _m0 = Math.floor((c._timerSecs % 3600) / 60);
        var _s0 = c._timerSecs % 60;
        timerEl.textContent = pad2(_h0) + ':' + pad2(_m0) + ':' + pad2(_s0);

        if (c._timerSecs > 0) {
          c._timerInterval = setInterval(function () {
            var liveEl = c.querySelector('#train-timer');
            if (!liveEl) { clearInterval(c._timerInterval); c._timerInterval = null; return; }
            c._timerSecs = Math.max(0, c._timerSecs - 1);
            var h = Math.floor(c._timerSecs / 3600);
            var m = Math.floor((c._timerSecs % 3600) / 60);
            var s = c._timerSecs % 60;
            liveEl.textContent = pad2(h) + ':' + pad2(m) + ':' + pad2(s);
            if (c._timerSecs === 0) { clearInterval(c._timerInterval); c._timerInterval = null; }
          }, 1000);
        }
      }

      wire_nav(c);
    }
    render_training();
  };

  /* ── screen-arena ────────────────────────────────────── */
  RENDERERS['screen-arena'] = function () {
    var c = $('#screen-arena');
    if (!c) return;
    var pet = current_pet();
    var activeTab = 'RACE';
    var matchmaking = false;

    function render_arena () {
      c.innerHTML =
        '<div class="game-navbar">' +
          '<span class="logo">PIXEL PET<br>ARENA</span>' +
          '<div class="nav-links">' +
            '<span class="nav-link" data-nav="screen-pet">PET</span>' +
            '<span class="nav-link active">ARENA</span>' +
          '</div>' +
        '</div>' +
        '<div class="screen-content">' +
          '<h2 class="section-title">ARENA LOBBY</h2>' +

          '<div class="tab-bar">' +
            '<button class="tab-btn ' + (activeTab === 'RACE' ? 'active' : '') + '" data-tab="RACE">⚡ RACE</button>' +
            '<button class="tab-btn ' + (activeTab === 'SUMO' ? 'active' : '') + '" data-tab="SUMO">🏆 SUMO</button>' +
          '</div>' +

          (activeTab === 'SUMO' ?
            '<div class="coming-soon-overlay">' +
              '<div class="cs-title">COMING SOON</div>' +
              '<p class="muted">Sumo mode launches when<br>arena score exceeds 5,000.</p>' +
            '</div>' :
            '<div class="pre-battle-panel">' +
              '<div class="my-pet-preview">' +
                '<div class="preview-pet-box">' + build_pet_sprite(pet) + '</div>' +
                '<div class="preview-pet-info">' +
                  '<div class="preview-pet-name">' + pet.pet_name + '</div>' +
                  '<div class="preview-stats">' +
                    'SPD ' + pet.stat_speed + '  STR ' + pet.stat_strength + '  STA ' + pet.stat_stamina +
                  '</div>' +
                  rarity_badge_html(pet.rarity) +
                '</div>' +
              '</div>' +

              (matchmaking ?
                '<div class="matchmaking-status">' +
                  '<div class="matchmaking-spinner"></div>' +
                  '<div class="matchmaking-label">FINDING OPPONENT...</div>' +
                '</div>' :
                '<button class="btn btn-accent btn-full btn-lg" id="find-match-btn">⚔ FIND MATCH</button>') +
            '</div>'
          ) +

          '<div class="mt-3">' +
            '<button class="btn btn-ghost btn-full btn-sm" data-nav="screen-pet">← BACK TO PET</button>' +
          '</div>' +
        '</div>';

      // Tab switching
      c.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activeTab = btn.dataset.tab;
          render_arena();
        });
      });

      // Matchmaking
      var findBtn = c.querySelector('#find-match-btn');
      if (findBtn) {
        findBtn.addEventListener('click', function () {
          play_sfx('SFX-005', 'arena-start');
          matchmaking = true;
          render_arena();
          setTimeout(function () {
            toast('Opponent found: Crimson Fang (EPIC)', 'success');
            Router.go('screen-arena-result', { outcome: 'WIN' });
          }, 2000);
        });
      }

      wire_nav(c);
    }
    render_arena();
  };

  /* ── screen-arena-result ─────────────────────────────── */
  RENDERERS['screen-arena-result'] = function (opts) {
    var c = $('#screen-arena-result');
    if (!c) return;
    var outcome = (opts && opts.outcome) || 'WIN';
    var pet = current_pet();
    var opponent = window.MOCK_DATA.pets[4]; // Void Stalker

    c.innerHTML =
      '<div class="game-navbar">' +
        '<span class="logo">PIXEL PET<br>ARENA</span>' +
      '</div>' +
      '<div class="screen-content">' +
        '<div class="battle-result-card ' + outcome.toLowerCase() + '">' +
          '<div class="result-title ' + outcome.toLowerCase() + '">' + (outcome === 'WIN' ? 'VICTORY!' : 'DEFEAT') + '</div>' +
          '<div class="muted mb-2" style="font-size:12px;">' + (outcome === 'WIN' ? 'Earned +5 arena points' : 'Better luck next time') + '</div>' +

          '<div class="stat-comparison">' +
            '<div>' +
              '<div class="stat-comp-label">YOUR PET</div>' +
              '<div style="display:flex;justify-content:center;margin:8px 0;">' + build_pet_sprite(pet) + '</div>' +
              '<div style="font-family:var(--font-pixel);font-size:6px;color:var(--color-secondary);text-align:center;">' + pet.pet_name + '</div>' +
            '</div>' +
            '<div class="stat-comp-label" style="font-size:16px;">VS</div>' +
            '<div>' +
              '<div class="stat-comp-label">OPPONENT</div>' +
              '<div style="display:flex;justify-content:center;margin:8px 0;">' + build_pet_sprite(opponent) + '</div>' +
              '<div style="font-family:var(--font-pixel);font-size:6px;color:var(--color-error);text-align:center;">' + opponent.pet_name + '</div>' +
            '</div>' +
          '</div>' +

          '<div class="card mb-2" style="background:#0d0d1a;">' +
            '<div class="card-header">STAT BREAKDOWN</div>' +
            '<div class="stat-comp-values">' +
              stat_comparison_row('SPEED',    pet.stat_speed,    opponent.stat_speed) +
              stat_comparison_row('STRENGTH', pet.stat_strength, opponent.stat_strength) +
              stat_comparison_row('STAMINA',  pet.stat_stamina,  opponent.stat_stamina) +
            '</div>' +
          '</div>' +

          (outcome === 'WIN' ? '<div style="font-family:var(--font-pixel);font-size:8px;color:var(--color-accent);text-align:center;margin-bottom:12px;">+5 ARENA SCORE</div>' : '') +
          '<button class="btn btn-ghost btn-sm btn-full" id="share-battle-btn">📤 SHARE RESULT</button>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;">' +
          '<button class="btn btn-primary" data-nav="screen-arena">PLAY AGAIN</button>' +
          '<button class="btn btn-ghost" data-nav="screen-leaderboard">LEADERBOARD</button>' +
        '</div>' +
        '<div class="mt-1">' +
          '<button class="btn btn-ghost btn-full btn-sm" data-nav="screen-pet">← BACK TO PET</button>' +
        '</div>' +
      '</div>';

    // Trigger particles on WIN
    if (outcome === 'WIN') {
      play_sfx('SFX-006', 'arena-victory');
      setTimeout(function () {
        var card = c.querySelector('.battle-result-card');
        if (card) {
          var rect = card.getBoundingClientRect();
          var cx = rect.left + rect.width / 2;
          var cy = rect.top + rect.height / 3;
          particle_burst(cx, cy);
          setTimeout(function () { particle_burst(cx - 40, cy + 20); }, 200);
          setTimeout(function () { particle_burst(cx + 40, cy + 20); }, 350);
        }
      }, 200);
    }

    var shareBtn = c.querySelector('#share-battle-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        toast('Battle result copied to clipboard!', 'success');
      });
    }

    wire_nav(c);
  };

  /* ── screen-leaderboard ──────────────────────────────── */
  RENDERERS['screen-leaderboard'] = function () {
    var c = $('#screen-leaderboard');
    if (!c) return;
    var activeFilter = 'ALL';
    var lb = window.MOCK_DATA.leaderboard;

    function render_lb () {
      var filtered = activeFilter === 'ALL' ? lb : lb.filter(function (r) { return r.rarity === activeFilter; });

      c.innerHTML =
        '<div class="game-navbar">' +
          '<span class="logo">PIXEL PET<br>ARENA</span>' +
          '<div class="nav-links">' +
            '<span class="nav-link" data-nav="screen-pet">MY PET</span>' +
          '</div>' +
        '</div>' +
        '<div class="screen-content">' +
          '<h2 class="section-title">LEADERBOARD</h2>' +

          '<div class="filter-bar">' +
            ['ALL','COMMON','RARE','EPIC','LEGENDARY'].map(function (f) {
              return '<button class="filter-btn ' + (activeFilter === f ? 'active' : '') + '" data-filter="' + f + '">' + f + '</button>';
            }).join('') +
          '</div>' +

          '<div class="card" style="padding:0;overflow:hidden;">' +
            '<table class="lb-table">' +
              '<thead><tr>' +
                '<th>#</th><th>PET</th><th>LVL</th><th>SCORE</th><th>WIN%</th>' +
              '</tr></thead>' +
              '<tbody>' +
                (filtered.length ?
                  filtered.map(lb_row_html).join('') :
                  '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--color-text-secondary);font-family:var(--font-pixel);font-size:7px;">NO PETS FOR THIS RARITY</td></tr>'
                ) +
              '</tbody>' +
            '</table>' +
          '</div>' +

          '<div class="mt-2">' +
            '<button class="btn btn-ghost btn-full btn-sm" data-nav="screen-battle-records">VIEW BATTLE RECORDS</button>' +
          '</div>' +
        '</div>';

      c.querySelectorAll('.filter-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activeFilter = btn.dataset.filter;
          render_lb();
        });
      });

      wire_nav(c);
    }
    render_lb();
  };

  /* ── screen-battle-records ───────────────────────────── */
  RENDERERS['screen-battle-records'] = function () {
    var c = $('#screen-battle-records');
    if (!c) return;
    var pet = current_pet();
    var records = window.MOCK_DATA.battleRecords;

    c.innerHTML =
      '<div class="game-navbar">' +
        '<span class="logo">PIXEL PET<br>ARENA</span>' +
      '</div>' +
      '<div class="screen-content">' +
        '<h2 class="section-title">BATTLE RECORDS</h2>' +

        '<div class="pet-summary-card">' +
          '<div class="pet-summary-avatar">' + pet.emoji + '</div>' +
          '<div class="pet-summary-details">' +
            '<div class="pet-summary-name">' + pet.pet_name + '</div>' +
            rarity_badge_html(pet.rarity) +
            '<div class="pet-summary-stats mt-1">' +
              'LVL ' + pet.level + '  •  SCORE ' + pet.arena_score + '<br>' +
              'WIN RATE: ' + Math.round(pet.win_rate * 100) + '%' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card" style="padding:0;overflow:hidden;">' +
          '<table class="battle-table">' +
            '<thead><tr>' +
              '<th>DATE</th><th>MODE</th><th>OPPONENT</th><th>RESULT</th><th>ΔPTS</th>' +
            '</tr></thead>' +
            '<tbody>' +
              records.map(battle_record_row_html).join('') +
            '</tbody>' +
          '</table>' +
        '</div>' +

        '<div style="display:flex;gap:8px;margin-top:16px;">' +
          '<button class="btn btn-ghost btn-sm" id="share-records-btn" style="flex:1">📤 SHARE</button>' +
          '<button class="btn btn-ghost btn-sm" data-nav="screen-leaderboard" style="flex:1">LEADERBOARD →</button>' +
        '</div>' +
      '</div>';

    var shareBtn = c.querySelector('#share-records-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        toast('Battle record URL copied!', 'success');
      });
    }

    wire_nav(c);
  };

  /* ── screen-marketplace ──────────────────────────────── */
  RENDERERS['screen-marketplace'] = function () {
    var c = $('#screen-marketplace');
    if (!c) return;

    c.innerHTML =
      '<div class="game-navbar">' +
        '<span class="logo">PIXEL PET<br>ARENA</span>' +
      '</div>' +
      '<div class="screen-content">' +
        '<h2 class="section-title">MARKETPLACE</h2>' +

        '<div class="feature-gate-banner">' +
          '<span class="gate-icon">🏗️</span>' +
          '<div class="gate-title">UNDER CONSTRUCTION</div>' +
          '<p class="gate-desc">The Pixel Pet Marketplace is a feature-gated module.<br>Trading unlocks when the arena community reaches 1,000 daily active pets.</p>' +

          '<div class="gate-progress">' +
            '<div class="gate-progress-label">DAILY ACTIVE PETS</div>' +
            '<div class="gate-bar"><div class="gate-bar-fill"></div></div>' +
            '<div class="gate-count">847 / 1,000</div>' +
          '</div>' +

          '<div class="card mt-2" style="text-align:left;">' +
            '<div class="card-header">FEATURE FLAG STATUS</div>' +
            flag_row_html('marketplace_enabled',  false) +
            flag_row_html('listing_create',       false) +
            flag_row_html('listing_browse',       false) +
            flag_row_html('dao_enabled',          false) +
          '</div>' +
        '</div>' +

        '<button class="btn btn-ghost btn-full" data-nav="screen-pet">← BACK TO MY PET</button>' +
      '</div>';

    wire_nav(c);
  };

  /* ── screen-gdpr ─────────────────────────────────────── */
  RENDERERS['screen-gdpr'] = function () {
    var c = $('#screen-gdpr');
    if (!c) return;

    c.innerHTML =
      '<div class="game-navbar">' +
        '<span class="logo">PIXEL PET<br>ARENA</span>' +
      '</div>' +
      '<div class="screen-content">' +
        '<h2 class="section-title">DATA & PRIVACY</h2>' +

        '<div class="gdpr-notice">' +
          'Under GDPR / CCPA you have rights over your personal data. Use this form to submit a request. We process requests within 30 days.' +
        '</div>' +

        '<div class="card" id="gdpr-form-card">' +
          '<div class="card-header">SUBMIT REQUEST</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="gdpr-type">REQUEST TYPE</label>' +
            '<select class="form-select" id="gdpr-type">' +
              '<option value="">— Select —</option>' +
              '<option value="erasure">Right to Erasure (Delete my data)</option>' +
              '<option value="data_access">Data Access / Export</option>' +
              '<option value="restrict_processing">Restrict Processing</option>' +
              '<option value="object_leaderboard">Object to Leaderboard Listing</option>' +
              '<option value="rectification">Rectification (Correct my data)</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="gdpr-email">ACCOUNT EMAIL</label>' +
            '<input class="form-input" id="gdpr-email" type="email" placeholder="you@example.com" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="gdpr-notes">ADDITIONAL NOTES (optional)</label>' +
            '<textarea class="form-input" id="gdpr-notes" rows="3" placeholder="Provide any relevant details…" style="resize:vertical;min-height:72px;"></textarea>' +
          '</div>' +
          '<button class="btn btn-primary btn-full" id="gdpr-submit-btn">SUBMIT REQUEST</button>' +
        '</div>' +

        '<div class="gdpr-form-submitted" id="gdpr-success">' +
          '<span class="check">✓</span>' +
          '<div class="msg">REQUEST SUBMITTED<br><br>Reference ID: GDPR-2026-00847<br><br>We\'ll respond within 30 days.</div>' +
          '<button class="btn btn-ghost btn-sm mt-2" data-nav="screen-pet">← BACK TO MY PET</button>' +
        '</div>' +

        '<div class="mt-2">' +
          '<button class="btn btn-ghost btn-full btn-sm" data-nav="screen-pet">← BACK TO MY PET</button>' +
        '</div>' +
      '</div>';

    var submitBtn = c.querySelector('#gdpr-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        var type  = c.querySelector('#gdpr-type');
        var email = c.querySelector('#gdpr-email');
        if (!type || !type.value) { toast('Please select a request type', 'error'); return; }
        if (!email || !is_valid_email(email.value)) { toast('Enter a valid email address', 'error'); return; }
        c.querySelector('#gdpr-form-card').style.display = 'none';
        c.querySelector('#gdpr-success').style.display   = 'block';
        toast('GDPR request submitted!', 'success');
      });
    }

    wire_nav(c);
  };

  /* ── Component Helpers ───────────────────────────────── */
  function stat_bar_html (label, cls, value) {
    return '<div class="stat-row">' +
      '<span class="stat-label">' + label + '</span>' +
      '<div class="stat-bar"><div class="stat-bar-fill ' + cls + '" style="width:' + value + '%"></div></div>' +
      '<span class="stat-value">' + value + '</span>' +
    '</div>';
  }

  function food_item_html (food) {
    var name = food.food_type.replace(/_/g, ' ').toUpperCase();
    return '<div class="food-item">' +
      '<span class="food-icon">' + food.emoji + '</span>' +
      '<span class="food-name">' + name + '</span>' +
      '<span class="food-buff">+' + food.magnitude + ' ' + food.buff_stat.toUpperCase() + (food.is_permanent ? ' ∞' : '') + '</span>' +
    '</div>';
  }

  function training_card_html (id, icon, name, desc, statName, bonus, used, currentVal) {
    return '<div class="training-card ' + (used ? 'used' : '') + '" data-stat="' + id + '" data-bonus="' + bonus + '" data-name="' + statName + '">' +
      '<div class="training-icon">' + icon + '</div>' +
      '<div class="training-info">' +
        '<div class="training-name">' + name + '</div>' +
        '<div class="training-desc">' + desc + '</div>' +
        '<div class="training-bonus">+' + bonus + ' ' + statName.toUpperCase() + (used ? ' ✓ DONE' : '') + '</div>' +
      '</div>' +
      '<div style="font-family:var(--font-pixel);font-size:9px;color:var(--color-text-secondary);flex-shrink:0;">' + currentVal + '</div>' +
    '</div>';
  }

  function lb_row_html (row) {
    var rankCls = row.rank === 1 ? 'top1' : (row.rank === 2 ? 'top2' : (row.rank === 3 ? 'top3' : ''));
    return '<tr>' +
      '<td><span class="lb-rank ' + rankCls + '">' + (row.rank === 1 ? '★' : row.rank) + '</span></td>' +
      '<td>' +
        '<span class="lb-pet-name">' + row.pet_name + '</span><br>' +
        rarity_badge_html(row.rarity) +
      '</td>' +
      '<td style="font-family:var(--font-pixel);font-size:7px;">' + row.level + '</td>' +
      '<td><span class="lb-score">' + row.arena_score + '</span></td>' +
      '<td><span class="lb-winrate">' + Math.round(row.win_rate * 100) + '%</span></td>' +
    '</tr>';
  }

  function battle_record_row_html (rec) {
    var win = rec.outcome === 'WIN';
    return '<tr>' +
      '<td style="font-size:11px;white-space:nowrap;">' + fmt_date(rec.date) + '</td>' +
      '<td style="font-family:var(--font-pixel);font-size:6px;color:var(--color-text-secondary);">' + rec.mode + '</td>' +
      '<td>' +
        '<span style="font-size:12px;font-weight:600;">' + rec.opponent_name + '</span><br>' +
        rarity_badge_html(rec.opponent_rarity) +
      '</td>' +
      '<td><span class="outcome-badge outcome-' + rec.outcome.toLowerCase() + '">' + rec.outcome + '</span></td>' +
      '<td>' +
        (win ?
          '<span class="stat-delta-pos">+' + rec.stat_delta + '</span>' :
          '<span class="stat-delta-neg">—</span>') +
      '</td>' +
    '</tr>';
  }

  function stat_comparison_row (label, mine, theirs) {
    var winner = mine >= theirs ? 'mine' : 'theirs';
    return '<div class="stat-comp-row">' +
      '<span class="mine' + (winner === 'mine' ? '" style="color:var(--color-accent)' : '') + '">' + mine + '</span>' +
      '<span class="vs-mid" style="color:var(--color-text-secondary);font-size:10px;">' + label + '</span>' +
      '<span class="theirs' + (winner === 'theirs' ? '" style="color:var(--color-warning)' : '') + '">' + theirs + '</span>' +
    '</div>';
  }

  function flag_row_html (name, enabled) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--color-surface-overlay);">' +
      '<span style="font-size:12px;font-family:var(--font-ui);color:var(--color-text-secondary);">' + name + '</span>' +
      '<span style="font-family:var(--font-pixel);font-size:6px;padding:3px 6px;border:1px solid currentColor;color:' + (enabled ? 'var(--color-success)' : 'var(--color-error)') + ';">' +
        (enabled ? 'ON' : 'OFF') +
      '</span>' +
    '</div>';
  }

  /* ── Flow Map Modal ──────────────────────────────────── */
  function build_flow_map () {
    var meta  = Router.get_meta();
    var modal = $('#flow-modal');
    if (!modal) return;
    var grid  = modal.querySelector('.flow-screen-grid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(meta).forEach(function (id) {
      var m = meta[id];
      var card = el('div', 'flow-screen-card');
      card.innerHTML =
        (id === 'screen-landing' ? '<span class="flow-entry-badge">ENTRY</span><br>' : '') +
        '<div class="flow-card-id">' + id + '</div>' +
        '<div class="flow-card-name">' + m.label + '</div>' +
        '<div class="flow-card-desc">' + m.desc + '</div>';
      card.addEventListener('click', function () {
        close_flow_modal();
        Router.go(id);
      });
      grid.appendChild(card);
    });
  }

  function open_flow_modal () {
    build_flow_map();
    var modal = $('#flow-modal');
    if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
  }
  function close_flow_modal () {
    var modal = $('#flow-modal');
    if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
  }

  /* ── Wire nav links ──────────────────────────────────── */
  function wire_nav (root) {
    root.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function () {
        Router.go(el.dataset.nav);
      });
    });
  }

  /* ── Utility ─────────────────────────────────────────── */
  function pad2 (n) { return n < 10 ? '0' + n : '' + n; }

  /* ── Init ────────────────────────────────────────────── */
  function init () {
    // Proto nav back button
    var backBtn = $('#proto-back-btn');
    if (backBtn) { backBtn.addEventListener('click', function () { Router.back(); }); }

    // Flow map button
    var flowBtn = $('#flow-map-btn');
    if (flowBtn) { flowBtn.addEventListener('click', open_flow_modal); }

    // Flow map close
    var flowClose = $('#flow-modal-close');
    if (flowClose) { flowClose.addEventListener('click', close_flow_modal); }

    // Audio toggle
    var audioBtn = $('#audio-toggle-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', function () {
        audioEnabled = !audioEnabled;
        audioBtn.textContent = audioEnabled ? '🔊' : '🔇';
        toast(audioEnabled ? 'Audio ON' : 'Audio OFF', 'info');
      });
    }

    // Audio banner dismiss
    var audioBanner = $('#audio-banner');
    var audioBannerBtn = $('#audio-banner-btn');
    if (audioBannerBtn && audioBanner) {
      audioBannerBtn.addEventListener('click', function () {
        audioBanner.style.display = 'none';
        audioEnabled = true;
        toast('Audio unlocked!', 'success');
      });
    }

    // Dismiss audio banner on desktop
    var isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (!isMobile && audioBanner) { audioBanner.style.display = 'none'; }

    // Route to landing
    Router.go('screen-landing');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose router for debugging
  window.PixelPetRouter = Router;
})();
