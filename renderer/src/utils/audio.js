// Sistema de audio procedural (WebAudio API) - sin assets externos.
// Genera beeps y sonidos chiptune simples para feedback.

let audioCtx = null;
let masterVolume = 0.7;
let sfxVolume = 0.8;

function ensureCtx() {
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) audioCtx = new Ctor();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function setMasterVolume(v) { masterVolume = Math.max(0, Math.min(1, v)); }
export function setSfxVolume(v) { sfxVolume = Math.max(0, Math.min(1, v)); }
export function getMasterVolume() { return masterVolume; }
export function getSfxVolume() { return sfxVolume; }

function beep(freq, duration = 0.1, type = 'square', gain = 0.15, slide = 0) {
  const ctx = ensureCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide !== 0) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + duration);
  }
  const vol = gain * masterVolume * sfxVolume;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export const sfx = {
  click: () => beep(600, 0.05, 'square', 0.08),
  hover: () => beep(800, 0.03, 'sine', 0.04),
  success: () => {
    beep(523, 0.1, 'square', 0.15);
    setTimeout(() => beep(659, 0.1, 'square', 0.15), 80);
    setTimeout(() => beep(784, 0.2, 'square', 0.15), 160);
  },
  fail: () => {
    beep(300, 0.15, 'sawtooth', 0.15, -100);
    setTimeout(() => beep(200, 0.3, 'sawtooth', 0.15, -100), 150);
  },
  point: () => beep(1200, 0.08, 'sine', 0.1, 400),
  tick: () => beep(1000, 0.03, 'triangle', 0.05),
  select: () => beep(700, 0.08, 'square', 0.1, 200),
  wrong: () => beep(200, 0.15, 'sawtooth', 0.12, -50),
  count: () => beep(440, 0.1, 'square', 0.12),
  go: () => { beep(880, 0.2, 'square', 0.18); },
  levelup: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.12, 'square', 0.15), i * 80));
  },
  interact: () => beep(500, 0.08, 'triangle', 0.1, 300),
};
