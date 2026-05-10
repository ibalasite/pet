/* ============================================================
   FXEngine — Canvas particle bursts + element tween helpers
   ============================================================ */
(function () {
  class FXEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.running = false;
      this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    }

    init() {
      this.canvas = document.getElementById('fx-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this._resize();
      window.addEventListener('resize', () => this._resize());
      this.running = true;
      requestAnimationFrame((t) => this._loop(t));
    }

    _resize() {
      if (!this.canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.canvas.width = w * this.dpr;
      this.canvas.height = h * this.dpr;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      if (this.ctx) this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    /**
     * Burst particles at a screen point.
     * opts: { count, colors, speed, life, gravity, char }
     */
    emitBurst(x, y, opts = {}) {
      const count   = opts.count   ?? 14;
      const colors  = opts.colors  ?? ['#fdcb6e', '#a29bfe', '#7cb4e8', '#00b894'];
      const speed   = opts.speed   ?? 4.5;
      const life    = opts.life    ?? 1100;
      const gravity = opts.gravity ?? 0.06;
      const char    = opts.char    ?? null;
      const size    = opts.size    ?? 4;

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const v = speed * (0.7 + Math.random() * 0.6);
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v - 1.5,
          life,
          ageMs: 0,
          color: colors[Math.floor(Math.random() * colors.length)],
          gravity,
          char,
          size,
        });
      }
    }

    /** Burst at the center of an element. */
    emitBurstAt(el, opts = {}) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      this.emitBurst(r.left + r.width / 2, r.top + r.height / 2, opts);
    }

    /** Shake an element via CSS animation. */
    shakeElement(el, intensity = 'normal', duration = 300) {
      if (!el) return;
      el.style.animation = 'none';
      // force reflow
      void el.offsetWidth;
      el.style.animation = `shakeEl ${duration}ms ease-out`;
      setTimeout(() => { el.style.animation = ''; }, duration + 20);
    }

    /** Float an element upward (e.g. stat +1 indicator). */
    floatUp(el, distance = 80) {
      if (!el) return;
      el.style.animation = `floatUp 1600ms cubic-bezier(0.16, 1, 0.3, 1) forwards`;
      setTimeout(() => { try { el.remove(); } catch (e) { /* ignore */ } }, 1700);
    }

    /** Highlight a leaderboard row (rank changed). */
    rankHighlight(el) {
      if (!el) return;
      const orig = el.style.background;
      el.style.transition = 'background 240ms ease-out';
      el.style.background = 'rgba(253,203,110,0.35)';
      setTimeout(() => { el.style.background = orig; }, 1800);
    }

    /** Inline floater — places a stat-change-indicator at a parent element. */
    spawnFloater(parent, text, color = '#00b894') {
      if (!parent) return;
      const f = document.createElement('div');
      f.className = 'stat-floater';
      f.textContent = text;
      f.style.color = color;
      f.style.left = '50%';
      f.style.top = '40%';
      f.style.transform = 'translateX(-50%)';
      parent.appendChild(f);
      setTimeout(() => { try { f.remove(); } catch (e) { /* ignore */ } }, 1700);
    }

    _loop(now) {
      if (!this.running || !this.ctx) return;
      const ctx = this.ctx;
      const w = this.canvas.width / this.dpr;
      const h = this.canvas.height / this.dpr;
      ctx.clearRect(0, 0, w, h);
      const dt = 16; // approx ms per frame

      const remaining = [];
      for (const p of this.particles) {
        p.ageMs += dt;
        if (p.ageMs >= p.life) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        const t = p.ageMs / p.life;
        const alpha = 1 - t;

        ctx.globalAlpha = Math.max(0, alpha);
        if (p.char) {
          ctx.fillStyle = p.color;
          ctx.font = `${p.size * 4}px 'Press Start 2P', monospace`;
          ctx.fillText(p.char, p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        remaining.push(p);
      }
      ctx.globalAlpha = 1;
      this.particles = remaining;

      requestAnimationFrame((t) => this._loop(t));
    }
  }

  window.fxEngine = new FXEngine();
})();
