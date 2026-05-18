/* ============================================================
   FXEngine — Canvas particle bursts + element tween helpers
   ============================================================ */

class FXEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.running = false;
  }

  init() {
    this.canvas = document.getElementById('fx-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.running = true;
    this.loop();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  loop() {
    if (!this.ctx || !this.running) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.25;
      p.life -= p.decay;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    });
    this.ctx.globalAlpha = 1;
    requestAnimationFrame(() => this.loop());
  }

  burst(x, y, count, colors) {
    const defaults = ['#fdcb6e', '#6c5ce7', '#00b894', '#ff7675', '#74b9ff'];
    const palette  = colors || defaults;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed - 3,
        size:  4 + Math.random() * 6,
        color: palette[Math.floor(Math.random() * palette.length)],
        life:  1,
        decay: 0.015 + Math.random() * 0.02
      });
    }
  }

  victoryBurst(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    this.burst(cx, cy, 32, ['#fdcb6e', '#ffeaa7', '#e17055', '#fff', '#fdcb6e', '#a29bfe']);
  }

  petTapBurst(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    this.burst(cx, cy, 8, ['#fdcb6e', '#6c5ce7', '#00b894', '#74b9ff']);
  }

  animateScreenEnter(el, type) {
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.style.opacity   = '0';
    el.style.transform = type === 'slide' ? 'translateY(16px)' : 'scale(0.97)';
    el.style.transition = 'opacity 300ms ease, transform 300ms cubic-bezier(0.16,1,0.3,1)';
    requestAnimationFrame(() => {
      el.style.opacity   = '1';
      el.style.transform = 'none';
    });
  }

  floatText(anchor, text, color) {
    if (!anchor) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = [
      'position:fixed',
      "font-family:'Press Start 2P',monospace",
      'font-size:14px',
      `color:${color || '#fdcb6e'}`,
      'pointer-events:none',
      'z-index:9999',
      'font-weight:700',
      'text-shadow:1px 1px 0 #0d0d1a'
    ].join(';');
    const rect = anchor.getBoundingClientRect();
    el.style.left = (rect.left + rect.width / 2 - 20) + 'px';
    el.style.top  = (rect.top - 10) + 'px';
    document.body.appendChild(el);
    let y = parseFloat(el.style.top);
    let opacity = 1;
    const dur   = 2600;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      if (elapsed < 400) y -= 0.5;
      if (elapsed > dur - 200) opacity = Math.max(0, 1 - (elapsed - (dur - 200)) / 200);
      el.style.top     = y + 'px';
      el.style.opacity = opacity;
      if (elapsed < dur) requestAnimationFrame(animate);
      else el.remove();
    };
    requestAnimationFrame(animate);
  }

  shakeElement(el) {
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake 0.5s ease';
    setTimeout(() => { el.style.animation = ''; }, 600);
  }
}

const fxEngine = new FXEngine();
