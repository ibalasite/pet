/* ============================================================
   AudioEngine — Web Audio API synth (no external mp3 files)
   - All SFX are oscillator + ADSR envelope
   - BGM is a layered ambient/bass synth loop
   - iOS unlock: must call unlock() inside a user gesture
   ============================================================ */
(function () {
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.unlocked = false;
      this.masterGain = null;
      this.bgmGain = null;
      this.sfxGain = null;
      this.currentBGM = null;
      this.bgmStopFn = null;
      this.muted = false;
    }

    async unlock() {
      if (this.unlocked) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) {
          console.warn('Web Audio API not supported');
          return;
        }
        this.ctx = new Ctx();
        if (this.ctx.state === 'suspended') {
          await this.ctx.resume();
        }
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.7;
        this.sfxGain.connect(this.masterGain);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0;
        this.bgmGain.connect(this.masterGain);

        // Silent ping to fully unlock on iOS
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(this.ctx.destination);
        src.start(0);

        this.unlocked = true;
        // Fanfare on unlock
        this._playTone({ freq: 660, freq2: 990, type: 'sine', duration: 180, gain: 0.4 });
      } catch (err) {
        console.warn('Audio unlock failed', err);
      }
    }

    setMuted(m) {
      this.muted = !!m;
      if (this.masterGain) {
        this.masterGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime + 0.1);
      }
    }

    _playTone({ freq, freq2, type = 'square', duration = 200, gain = 0.3, attack = 0.01, release = 0.05 }) {
      if (!this.unlocked || !this.ctx) return;
      const t0 = this.ctx.currentTime;
      const dur = duration / 1000;
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freq2) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(freq2, 20), t0 + dur);
      }
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + attack);
      g.gain.setValueAtTime(gain, t0 + dur - release);
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    _playArpeggio(notes, { type = 'square', step = 80, gain = 0.3 } = {}) {
      if (!this.unlocked || !this.ctx) return;
      const t0 = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const start = t0 + (i * step) / 1000;
        const dur = step / 1000 * 0.95;
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(gain, start + 0.005);
        g.gain.linearRampToValueAtTime(0, start + dur);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(start);
        osc.stop(start + dur + 0.02);
      });
    }

    _playNoise({ duration = 200, gain = 0.2, lowpass = 800 }) {
      if (!this.unlocked || !this.ctx) return;
      const t0 = this.ctx.currentTime;
      const dur = duration / 1000;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, t0);
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    }

    /* ----- SFX dispatcher ----- */
    playSFX(id) {
      if (!this.unlocked || this.muted) return;
      switch (id) {
        case 'SFX-001-pet-tap-pop':
          this._playTone({ freq: 880, freq2: 1320, type: 'triangle', duration: 120, gain: 0.35 });
          break;
        case 'SFX-002-pet-tap-click':
          this._playTone({ freq: 540, freq2: 720, type: 'square', duration: 60, gain: 0.18 });
          break;
        case 'SFX-003-training-start':
          this._playTone({ freq: 440, freq2: 660, type: 'square', duration: 150, gain: 0.3 });
          break;
        case 'SFX-004-training-success':
          this._playArpeggio([660, 880, 1100], { type: 'square', step: 70, gain: 0.32 });
          break;
        case 'SFX-005-stat-ding':
          this._playTone({ freq: 1320, freq2: 1760, type: 'sine', duration: 100, gain: 0.4 });
          break;
        case 'SFX-006-arena-start':
          this._playArpeggio([523, 659, 784], { type: 'square', step: 100, gain: 0.35 });
          break;
        case 'SFX-007-arena-victory':
          this._playArpeggio([523, 659, 784, 1047], { type: 'square', step: 130, gain: 0.4 });
          setTimeout(() => this._playArpeggio([1047, 1319], { type: 'sine', step: 110, gain: 0.35 }), 540);
          break;
        case 'SFX-008-arena-defeat':
          this._playArpeggio([392, 329, 262], { type: 'sine', step: 130, gain: 0.32 });
          break;
        case 'SFX-009-claim-success':
          this._playTone({ freq: 660, freq2: 988, type: 'sine', duration: 180, gain: 0.4 });
          setTimeout(() => this._playTone({ freq: 1320, freq2: 1760, type: 'sine', duration: 120, gain: 0.32 }), 120);
          break;
        case 'SFX-010-rate-limit-warning':
          this._playTone({ freq: 220, type: 'square', duration: 250, gain: 0.3 });
          break;
        case 'SFX-011-leaderboard-rankup':
          this._playArpeggio([784, 988, 1175, 1568], { type: 'sine', step: 120, gain: 0.32 });
          break;
        case 'SFX-012-food-buff':
          this._playTone({ freq: 740, freq2: 1100, type: 'sine', duration: 200, gain: 0.34 });
          break;
        case 'SFX-invalid':
          this._playTone({ freq: 180, freq2: 110, type: 'sawtooth', duration: 220, gain: 0.32 });
          break;
        default:
          // unknown sfx — silent
          break;
      }
    }

    /* ----- BGM ----- */
    startBGM(id) {
      if (!this.unlocked || this.currentBGM === id || this.muted) return;
      this.stopBGM();
      this.currentBGM = id;
      const t0 = this.ctx.currentTime;

      // Bass loop pattern based on id
      const PATTERNS = {
        'BGM-001': { notes: [98, 110, 130, 110, 98, 87, 98, 110], step: 0.32, lp: 600,  type: 'sawtooth', gain: 0.18 }, // arena
        'BGM-002': { notes: [196, 220, 247, 220, 196, 175, 165, 175], step: 0.45, lp: 900, type: 'sine',     gain: 0.14 }, // trainer ambient
      };
      const p = PATTERNS[id] || PATTERNS['BGM-002'];

      const masterBgm = this.bgmGain;
      masterBgm.gain.cancelScheduledValues(t0);
      masterBgm.gain.setValueAtTime(0, t0);
      masterBgm.gain.linearRampToValueAtTime(0.3, t0 + 0.5);

      // Lowpass-filtered noise pad
      const padBufferSize = Math.floor(this.ctx.sampleRate * 4);
      const padBuf = this.ctx.createBuffer(1, padBufferSize, this.ctx.sampleRate);
      const padData = padBuf.getChannelData(0);
      for (let i = 0; i < padBufferSize; i++) padData[i] = (Math.random() * 2 - 1) * 0.08;
      const padSrc = this.ctx.createBufferSource();
      padSrc.buffer = padBuf;
      padSrc.loop = true;
      const padFilter = this.ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = p.lp;
      const padGain = this.ctx.createGain();
      padGain.gain.value = 0.6;
      padSrc.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(masterBgm);
      padSrc.start(t0);

      // Bass step sequencer
      let stopFlag = false;
      const playStep = (i) => {
        if (stopFlag || this.currentBGM !== id) return;
        const note = p.notes[i % p.notes.length];
        const tNow = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = p.type;
        osc.frequency.value = note;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, tNow);
        g.gain.linearRampToValueAtTime(p.gain, tNow + 0.02);
        g.gain.linearRampToValueAtTime(0, tNow + p.step * 0.95);
        osc.connect(g);
        g.connect(masterBgm);
        osc.start(tNow);
        osc.stop(tNow + p.step);
        setTimeout(() => playStep(i + 1), p.step * 1000);
      };
      playStep(0);

      this.bgmStopFn = () => {
        stopFlag = true;
        try { padSrc.stop(); } catch (e) { /* ignore */ }
      };
    }

    stopBGM() {
      if (!this.ctx || !this.bgmGain) return;
      const t0 = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(t0);
      this.bgmGain.gain.linearRampToValueAtTime(0, t0 + 0.5);
      if (this.bgmStopFn) {
        setTimeout(this.bgmStopFn, 600);
        this.bgmStopFn = null;
      }
      this.currentBGM = null;
    }
  }

  window.audioEngine = new AudioEngine();
})();
