/**
 * Percepción visual → "Encontrá el bicho raro": grilla de bichos dibujados en
 * canvas; uno tiene UN atributo alterado (color, rotación, tamaño o antena).
 * Fácil: 4x4 con diferencias evidentes. Extremo: 8x6, diferencia sutil, 3
 * rondas y penalidad de tiempo al fallar.
 */
import { roundBar } from './_harness.js';

const COLS = { facil: 4, extremo: 8 };
const ROWS = { facil: 4, extremo: 6 };

/** Dibuja un bicho determinista. `mods` altera el elegido. */
function drawBug(c, x, y, size, seed, mods) {
  const rng = mulberryLite(seed);
  const hue = mods.hue !== undefined ? (mods.hue + 360) % 360 : Math.floor(rng() * 360);
  const rot = (rng() * Math.PI * 2) + (mods.rot || 0);
  const sc = size * (mods.scale || 1);
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  // cuerpo: polígono irregular
  c.beginPath();
  const pts = 6;
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const r = sc * 0.34 * (0.78 + 0.42 * Math.abs(Math.sin(a * 2 + seed % 7)) % 1);
    c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  c.fillStyle = `hsl(${hue}, 62%, 52%)`;
  c.fill();
  c.lineWidth = size * 0.045;
  c.strokeStyle = `hsl(${hue}, 62%, 28%)`;
  c.stroke();
  // antenas (la "raro" puede tener una de más)
  const nAnt = 2 + (mods.antenna ? 1 : 0);
  c.beginPath();
  for (let i = 0; i < nAnt; i++) {
    const a = -Math.PI / 2 + (i - (nAnt - 1) / 2) * 0.55;
    c.moveTo(0, -sc * 0.25);
    c.lineTo(Math.cos(a) * sc * 0.45, -sc * 0.25 + Math.sin(a) * sc * 0.45);
  }
  c.stroke();
  // ojos
  c.fillStyle = '#0d0d0d';
  const nEyes = 2 + (mods.eye || 0);
  for (let i = 0; i < nEyes; i++) {
    c.beginPath();
    c.arc((i - (nEyes - 1) / 2) * sc * 0.13, -sc * 0.05, sc * 0.05, 0, 7);
    c.fill();
  }
  c.restore();
}

function mulberryLite(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default {
  id: 'percepcion',
  name: 'Encontrá el bicho raro',
  hint: 'Un bicho NO sigue el patrón del enjambre. Tocá al intruso antes que se acabe el tiempo.',
  timeLimit: { facil: 60, extremo: 55 },

  start(ctx) {
    const { root, hard, rng, finish } = ctx;
    const rounds = hard ? 3 : 1;
    const cols = COLS[hard ? 'extremo' : 'facil'], rows = ROWS[hard ? 'extremo' : 'facil'];
    let round = 0, solved = 0, wrongs = 0;

    const bar = roundBar(root);
    const cv = document.createElement('canvas');
    cv.className = 'mg-canvas wide';
    const CELL = 84;
    cv.width = cols * CELL; cv.height = rows * CELL;
    root.appendChild(cv);
    const c = cv.getContext('2d');

    const modKinds = hard
      ? [{ key: 'hue', amt: 8 }, { key: 'rot', amt: 0.12 }, { key: 'scale', amt: 0.86 }, { key: 'antenna', amt: 1 }]
      : [{ key: 'hue', amt: 55 }, { key: 'rot', amt: 0.9 }, { key: 'scale', amt: 0.62 }, { key: 'eye', amt: 1 }];

    let target = -1, baseHue = 0, seed = 0, modKind = null;

    /** atributos del bicho de la celda i (base) y del intruso (alterados) */
    const modsFor = (i) => {
      const m = {};
      if (i !== target) return m;
      if (modKind.key === 'hue') m.hue = baseHue + modKind.amt;
      if (modKind.key === 'rot') m.rot = modKind.amt;
      if (modKind.key === 'scale') m.scale = 1 + modKind.amt;
      if (modKind.key === 'antenna') m.antenna = 1;
      if (modKind.key === 'eye') m.eye = 1;
      return m;
    };

    const render = () => {
      bar.set(`Ronda <b>${Math.min(round + 1, rounds)}</b> · intrusos hallados: <b>${solved}</b>${hard ? ` · fallos: <b>${wrongs}</b>` : ''}`);
      seed = rng.int(1, 1e9);
      baseHue = Math.floor(rng.next() * 360);
      modKind = modKinds[rng.int(0, modKinds.length - 1)];
      target = rng.int(0, cols * rows - 1);
      c.fillStyle = '#0d1018';
      c.fillRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < cols * rows; i++) {
        const x = (i % cols) * CELL + CELL / 2 + Math.sin(i * 7.3) * 3; // "desorden" natural
        const y = Math.floor(i / cols) * CELL + CELL / 2 + Math.cos(i * 3.7) * 3;
        const mods = modsFor(i);
        if (mods.hue === undefined) mods.hue = baseHue; // todos parten del mismo enjambre
        drawBug(c, x, y, CELL - 6, seed, mods); // misma seed => misma forma base
      }
    };

    const click = (ev) => {
      const r = cv.getBoundingClientRect();
      const x = (ev.clientX - r.left) * (cv.width / r.width);
      const y = (ev.clientY - r.top) * (cv.height / r.height);
      const i = Math.floor(y / CELL) * cols + Math.floor(x / CELL);
      if (i === target) {
        solved++;
        ctx.audio.sfx('win');
        round++;
        if (round >= rounds) finish({ success: true, performance: 1, summary: 'ojo clínico de veterinario de garage' });
        else ctx.after(240, render);
      } else {
        wrongs++;
        ctx.audio.sfx('error');
        cv.classList.add('shake');
        ctx.after(320, () => cv.classList.remove('shake'));
        if (wrongs >= 3) finish({ success: false, performance: solved / rounds, summary: 'el enjambre te ganó 3-0' });
      }
    };
    ctx.listen(cv, 'pointerdown', click);

    render();
  }
};
