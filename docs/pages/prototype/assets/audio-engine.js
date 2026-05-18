/* ============================================================
   AudioEngine — Web Audio API synth (no external mp3 files)
   All SFX are oscillator + ADSR envelopes
   iOS unlock: must call unlock() inside a user gesture
   ============================================================ */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.bgmSource = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.unlocked = false;
    this.currentBgm = null;
  }

  async unlock() {
    if (this.unlocked) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.4;
      this.sfxGain.gain.value = 0.8;
      this.bgmGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.unlocked = true;
      const btn = document.getElementById('audio-unlock-btn');
      if (btn) btn.style.display = 'none';
      console.log('[Audio] Context unlocked');
    } catch (e) {
      console.warn('[Audio] Unlock failed:', e);
    }
  }

  createTone(frequency, duration, type = 'sine', gainVal = 0.3) {
    if (!this.unlocked || !this.ctx) return;
    try {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playSFX(id) {
    if (!this.unlocked) return;
    const sfxMap = {
      'pet-tap':       () => { this.createTone(880, 0.12, 'square', 0.2); setTimeout(() => this.createTone(1100, 0.08, 'sine', 0.15), 60); },
      'btn-click':     () => this.createTone(660, 0.1, 'square', 0.15),
      'training-start':   () => { this.createTone(440, 0.1); setTimeout(() => this.createTone(554, 0.1), 100); },
      'training-success': () => { [523, 659, 784].forEach((f, i) => setTimeout(() => this.createTone(f, 0.15), i * 80)); },
      'stat-ding':     () => this.createTone(1047, 0.1, 'sine', 0.25),
      'arena-start':   () => { [220, 330, 440].forEach((f, i) => setTimeout(() => this.createTone(f, 0.2, 'square', 0.2), i * 100)); },
      'arena-victory': () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.createTone(f, 0.2, 'sine', 0.3), i * 120)); },
      'arena-defeat':  () => { [330, 220, 165].forEach((f, i) => setTimeout(() => this.createTone(f, 0.25, 'square', 0.2), i * 150)); },
      'claim-success': () => { [440, 554, 659].forEach((f, i) => setTimeout(() => this.createTone(f, 0.15), i * 90)); },
      'copy-success':  () => this.createTone(1200, 0.08, 'sine', 0.2),
      'rate-limit':    () => { this.createTone(220, 0.3, 'sawtooth', 0.15); setTimeout(() => this.createTone(165, 0.3, 'sawtooth', 0.1), 200); },
      'food-buff':     () => { [659, 784, 880, 1047].forEach((f, i) => setTimeout(() => this.createTone(f, 0.1, 'sine', 0.2), i * 60)); },
      'nav-click':     () => this.createTone(528, 0.08, 'sine', 0.12),
      'tab-switch':    () => this.createTone(700, 0.06, 'triangle', 0.1)
    };
    const fn = sfxMap[id];
    if (fn) fn();
  }

  playBGM(id) {
    if (!this.unlocked || this.currentBgm === id) return;
    this.stopBGM();
    this.currentBgm = id;
    // BGM is purely procedural oscillator-based; placeholder
    console.log('[Audio] BGM:', id);
  }

  stopBGM() {
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch (e) {}
      this.bgmSource = null;
    }
    this.currentBgm = null;
  }

  bindScreen(screenId) {
    const bgmMap = { 'screen-13': 'arena-battle', 'screen-07': 'pet-theme', 'screen-01': 'menu-ambient' };
    const bgm = bgmMap[screenId];
    if (bgm) this.playBGM(bgm);
    else this.stopBGM();
  }
}

const audioEngine = new AudioEngine();

document.addEventListener('click', function unlockOnce() {
  audioEngine.unlock();
  document.removeEventListener('click', unlockOnce);
}, { once: true });
