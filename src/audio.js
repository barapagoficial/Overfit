/**
 * Audio 100% procedural (WebAudio): sin archivos de sonido, todo sintetizado.
 * - SFX cortos (clic, éxito, fallo, nivel, moneda, blips del typewriter).
 * - Música: loop generativo lo-fi "de GPU vieja" (pad + arpegio), scheduled
 *   con lookahead. Volumen controlado desde Opciones (persistido).
 */

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicVol = 0.55;
    this.sfxVol = 0.8;
    this.musicOn = false;
    this._timer = 0;
    this._step = 0;
    this._nextT = 0;
    // progresión amable y un poco triste: Am - F - C - G (grados MIDI)
    this._chords = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]];
  }

  /** Debe llamarse tras un gesto del usuario (política de autoplay). */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.setVolumes(this.musicVol, this.sfxVol);
  }

  setVolumes(music, sfx) {
    this.musicVol = Math.max(0, Math.min(1, music));
    this.sfxVol = Math.max(0, Math.min(1, sfx));
    if (this.ctx) {
      this.musicGain.gain.value = this.musicVol * 0.22;
      this.sfxGain.gain.value = this.sfxVol * 0.5;
    }
  }

  startMusic() {
    if (!this.ctx || this.musicOn || this.musicVol <= 0) return;
    this.musicOn = true;
    this._nextT = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._schedule(), 120); // lookahead simple
  }

  stopMusic() {
    this.musicOn = false;
    clearInterval(this._timer);
  }

  /** Scheduler: mete 2 corcheas por tick si tocan (un compás de 8 pasos por acorde). */
  _schedule() {
    const spb = 0.32; // ~187 BPM de pads tranqui
    while (this._nextT < this.ctx.currentTime + 0.4) {
      const chord = this._chords[Math.floor(this._step / 8) % this._chords.length];
      const s = this._step % 8;
      if (s === 0) this._pad(chord.map(NOTE), this._nextT, spb * 8);
      const arp = chord[(s * 2 + Math.floor(this._step / 8)) % chord.length] + (s % 4 === 3 ? 12 : 0);
      if (s % 2 === 1 || s === 3) this._pluck(NOTE(arp), this._nextT);
      this._nextT += spb;
      this._step++;
    }
  }

  _pad(freqs, t, dur) {
    for (const f of freqs) {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f / 2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.musicGain);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }

  _pluck(f, t) {
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    o.connect(lp).connect(g).connect(this.musicGain);
    o.start(t); o.stop(t + 0.2);
  }

  /** Un beep/blast con forma configurable. */
  _tone({ f = 440, f2 = null, type = 'sine', dur = 0.1, vol = 0.4, t0 = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + t0;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur = 0.15, vol = 0.25, t0 = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + t0;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    src.connect(bp).connect(g).connect(this.sfxGain);
    src.start(t);
  }

  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'click':   this._tone({ f: 660, type: 'square', dur: 0.05, vol: 0.22 }); break;
      case 'hover':   this._tone({ f: 320, type: 'sine', dur: 0.04, vol: 0.1 }); break;
      case 'open':    this._tone({ f: 220, f2: 520, type: 'triangle', dur: 0.16, vol: 0.3 }); break;
      case 'close':   this._tone({ f: 520, f2: 200, type: 'triangle', dur: 0.14, vol: 0.25 }); break;
      case 'snap':    this._tone({ f: 900, type: 'square', dur: 0.04, vol: 0.2 }); break;
      case 'error':   this._tone({ f: 160, f2: 90, type: 'sawtooth', dur: 0.25, vol: 0.3 }); break;
      case 'pop':     this._tone({ f: 880, type: 'sine', dur: 0.06, vol: 0.2 }); this._tone({ f: 1320, type: 'sine', dur: 0.05, vol: 0.12, t0: 0.05 }); break;
      case 'neuron':  this._tone({ f: 520, type: 'sine', dur: 0.16, vol: 0.3 }); break;
      case 'coin':    this._tone({ f: 1046, type: 'square', dur: 0.06, vol: 0.22 }); this._tone({ f: 1568, type: 'square', dur: 0.12, vol: 0.22, t0: 0.07 }); break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => this._tone({ f, type: 'triangle', dur: 0.18, vol: 0.3, t0: i * 0.09 }));
        break;
      case 'fail':
        this._tone({ f: 300, f2: 120, type: 'sawtooth', dur: 0.4, vol: 0.28 });
        this._noise(0.25, 0.12, 0.05);
        break;
      case 'levelup':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this._tone({ f, type: 'square', dur: 0.14, vol: 0.24, t0: i * 0.08 }));
        break;
      case 'tick':    this._tone({ f: 1600, type: 'square', dur: 0.02, vol: 0.08 }); break;
      case 'type':    this._tone({ f: 1100 + Math.random() * 300, type: 'square', dur: 0.015, vol: 0.05 }); break;
      default: break;
    }
  }
}

export const audio = new AudioEngine();
