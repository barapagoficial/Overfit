/**
 * Lógica → "¿Qué sigue?": secuencias procedurales (aritméticas, geométricas,
 * Fibonacci, cuadrados, alternadas y de formas geométricas rotando).
 * Fácil: 4 rondas sin prisa. Extremo: 6 rondas, patrones retorcidos, 12s/ronda.
 */
import { flash, roundTimer, roundBar } from './_harness.js';

/** SVG de polígono regular (para las secuencias visuales). */
function poly(n, rot, size = 46) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2 + rot;
    pts.push(`${(size + Math.cos(a) * size * 0.85).toFixed(1)},${(size + Math.sin(a) * size * 0.85).toFixed(1)}`);
  }
  return `<svg viewBox="0 0 ${size * 2} ${size * 2}" class="poly"><polygon points="${pts.join(' ')}"/></svg>`;
}

function genSequence(rng, hard) {
  const kinds = hard
    ? ['arit', 'geom', 'fib', 'sq', 'alt', 'shape', 'dbl']
    : ['arit', 'geom', 'sq', 'shape', 'dbl'];
  const kind = rng.pick(kinds);

  if (kind === 'arit') {
    const s = rng.int(1, 9), d = rng.int(2, hard ? 17 : 7) * (rng.chance(0.3) ? -1 : 1);
    return { visual: 'num', seq: [s, s + d, s + 2 * d, s + 3 * d], ans: s + 4 * d, near: [d, -d] };
  }
  if (kind === 'geom') {
    const s = rng.int(1, 3), r = rng.int(2, 3);
    return { visual: 'num', seq: [s, s * r, s * r * r, s * r ** 3], ans: s * r ** 4, opts: null };
  }
  if (kind === 'fib') {
    const a = rng.int(1, 4), b = rng.int(a + 1, 6);
    const seq = [a, b];
    for (let i = 0; i < 4; i++) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
    return { visual: 'num', seq: seq.slice(0, 5), ans: seq[5], opts: null };
  }
  if (kind === 'sq') {
    const start = rng.int(1, 3);
    const seq = [start, start + 1, start + 2, start + 3].map((n) => n * n);
    return { visual: 'num', seq, ans: (start + 4) ** 2, opts: null };
  }
  if (kind === 'dbl') {
    const s = rng.int(1, 4), k = rng.int(1, 3);
    const seq = [s];
    for (let i = 0; i < 4; i++) seq.push(seq[i] * 2 + k);
    return { visual: 'num', seq: seq.slice(0, 4), ans: seq[4], opts: null };
  }
  if (kind === 'alt') {
    // dos progresiones intercaladas: la "malvada" de los tests de admisión
    const a = rng.int(1, 5), da = rng.int(2, 6), b = rng.int(8, 20), db = rng.int(2, 5);
    const seq = [a, b, a + da, b - db, a + 2 * da, b - 2 * db];
    return { visual: 'num', seq, ans: a + 3 * da, near: [b - 3 * db, da] };
  }
  // shapes: el polígono va sumando lados y rotando
  const start = rng.int(3, 5);
  const rotStep = rng.pick([Math.PI / 6, Math.PI / 4, Math.PI / 3]);
  const rot0 = rng.range(0, Math.PI);
  const sides = [start, start + 1, start + 2, start + 3];
  const anSides = start + 4, anRot = rot0 + 4 * rotStep;
  const decoys = [
    [anSides + 1, rot0 + 3 * rotStep],
    [anSides - 1, anRot],
    [anSides, rot0 + 5 * rotStep]
  ];
  return {
    visual: 'shape',
    seq: sides.map((n, i) => poly(n, rot0 + i * rotStep)),
    ans: poly(anSides, anRot),
    decoyShapes: decoys.map(([n, r]) => poly(n, r))
  };
}

function buildOptions(rng, def) {
  if (def.visual === 'shape') return rng.shuffle([def.ans, ...def.decoyShapes]);
  // distractores numéricos: "casi correctos" (confundibles a propósito)
  const wrong = new Set();
  let guard = 0;
  while (wrong.size < 3 && guard++ < 80) {
    const delta = rng.pick((def.near || []).concat([-2, -1, 1, 2, 3]).filter((x) => Number.isFinite(x)));
    const v = def.ans + delta;
    if (v !== def.ans) wrong.add(v);
  }
  return rng.shuffle([def.ans, ...[...wrong]].map(String));
}

export default {
  id: 'logica',
  name: '¿Qué sigue en la secuencia?',
  hint: 'Detectá el patrón y tocá el valor (o la forma) que continúa la serie.',
  timeLimit: { facil: 0, extremo: 0 }, // el reloj vive por ronda

  start(ctx) {
    const { root, rng, hard, finish } = ctx;
    const total = hard ? 6 : 4;
    let round = 0, solved = 0;

    const bar = roundBar(root);
    const seqWrap = document.createElement('div');
    seqWrap.className = 'seq';
    root.appendChild(seqWrap);
    const optsWrap = document.createElement('div');
    optsWrap.className = 'seq-opts';
    root.appendChild(optsWrap);
    let stopTimer = null;

    const render = () => {
      bar.set(`Ronda <b>${round + 1}/${total}</b> · acertadas <b>${solved}</b>${hard ? ' · 🕐 12s' : ''}`);
      const def = genSequence(rng, hard);
      seqWrap.innerHTML = '';
      const q = document.createElement('div');
      q.className = def.visual === 'shape' ? 'seq-item q shape' : 'seq-item q';
      q.innerHTML = def.visual === 'shape' ? '?' : '?';
      for (const v of def.seq) {
        const it = document.createElement('div');
        it.className = def.visual === 'shape' ? 'seq-item shape' : 'seq-item';
        it.innerHTML = v;
        seqWrap.appendChild(it);
        const arrow = document.createElement('span');
        arrow.className = 'seq-arrow';
        arrow.textContent = '→';
        seqWrap.appendChild(arrow);
      }
      seqWrap.appendChild(q);

      const options = buildOptions(rng, def);
      optsWrap.innerHTML = '';
      for (const o of options) {
        const b = document.createElement('button');
        b.className = 'tile big' + (def.visual === 'shape' ? ' shape' : '');
        b.innerHTML = o;
        b.onclick = () => {
          const ok = String(o) === String(def.ans);
          flash(b, ok);
          if (ok) solved++;
          stopTimer && stopTimer();
          round++;
          ctx.after(340, () => (round >= total ? done() : render()));
        };
        optsWrap.appendChild(b);
      }
      stopTimer = roundTimer(seqWrap, hard ? 12 : 25, () => {
        ctx.audio.sfx('error');
        round++;
        stopTimer = null;
        ctx.after(300, () => (round >= total ? done() : render()));
      });
    };

    const done = () => {
      const need = hard ? total : Math.ceil(total * 0.5);
      finish({
        success: solved >= need,
        performance: solved / total,
        summary: `patrones vistos: ${solved}/${total}`
      });
    };

    render();
  }
};
