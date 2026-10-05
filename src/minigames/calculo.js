/**
 * Cálculo → "Ensamblá la ecuación": arrastrar fichas numéricas a los huecos.
 * Fácil: 1 ecuación de 1 hueco, 3 intentos. Extremo: 3 ecuaciones (algunas de
 * 2 huecos, con división), 2 intentos, reloj global. Verificación procedural:
 * cada ecuación guarda su propio `verify(valores)`.
 */
import { makeDraggable, flash, roundBar } from './_harness.js';

/** (exportada para tests: verificabilidad de las ecuaciones generadas) */
export function genEquation(rng, hard) {
  const mk = (v) => ({ v });
  const twoSlots = hard && rng.chance(0.45);

  if (twoSlots) {
    // a × _ + d = c  (los dos huecos interactúan: hay que pensar)
    const a = rng.int(2, 7), b = rng.int(2, 8), d = rng.int(1, 9);
    const c = a * b + d;
    return {
      tokens: [mk(a), mk('×'), mk('_'), mk('+'), mk(d), mk('='), mk(c)],
      nSlots: 2,
      verify: ([x, y]) => a * x + d === c && y === b
    };
  }
  const ops = hard ? ['+', '-', '×', '÷'] : ['+', '-', '×'];
  const op = rng.pick(ops);

  if (op === '÷') {
    const b = rng.int(2, 9), q = rng.int(2, 9);
    return {
      tokens: [mk(b * q), mk('÷'), mk('_'), mk('='), mk(q)],
      nSlots: 1,
      verify: ([x]) => x !== 0 && (b * q) / x === q
    };
  }
  const a = rng.int(op === '×' ? 2 : 4, op === '×' ? 9 : 15);
  const b = rng.int(2, op === '×' ? 9 : 12);
  const c = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const flip = rng.chance(0.5); // "a op _ = c" o "_ op b = c"
  if (op === '-' && !flip) {
    // a − _ = c con a<b queda negativo; mejor planteo espejo
    return { tokens: [mk(c), mk('+'), mk('_'), mk('='), mk(a)], nSlots: 1, verify: ([x]) => c + x === a };
  }
  return flip
    ? { tokens: [mk('_'), mk(op), mk(b), mk('='), mk(c)], nSlots: 1, verify: ([x]) => (op === '+' ? x + b : op === '-' ? x - b : x * b) === c }
    : { tokens: [mk(a), mk(op), mk('_'), mk('='), mk(c)], nSlots: 1, verify: ([x]) => (op === '+' ? a + x : op === '-' ? a - x : a * x) === c };
}

function distractors(rng, answers, n) {
  const out = new Set();
  let guard = 0;
  while (out.size < n && guard++ < 60) {
    const v = rng.pick(answers) + rng.pick([-3, -2, -1, 1, 2, 3, 4, 6]);
    if (v > 0 && !answers.includes(v)) out.add(v);
  }
  return [...out];
}

export default {
  id: 'calculo',
  name: 'Ensamblá la ecuación',
  hint: 'Arrastrá o tocá una ficha numérica y soltala en el hueco. Completá la igualdad.',
  timeLimit: { facil: 0, extremo: 55 },

  start(ctx) {
    const { root, rng, hard, finish } = ctx;
    const rounds = hard ? 3 : 1;
    let round = 0, solved = 0, attempts = hard ? 2 : 3;

    const bar = roundBar(root);
    const eq = document.createElement('div');
    eq.className = 'eq';
    root.appendChild(eq);
    const tray = document.createElement('div');
    tray.className = 'eq-tray';
    root.appendChild(tray);
    const foot = document.createElement('div');
    foot.className = 'eq-foot';
    root.appendChild(foot);

    let eqState = null, placed = [], picked = null;

    const render = () => {
      eqState = genEquation(rng, hard);
      // bruto-fuerza la respuesta válida del 1er hueco (y para 2 huecos el par (v,v))
      const answers = [];
      for (let v = 1; v <= 30; v++) if (eqState.verify([v, v])) answers.push(v);
      bar.set(`Ecuación <b>${Math.min(round + 1, rounds)}/${rounds}</b> · intentos: <b>${'🔥'.repeat(Math.max(0, attempts))}</b>`);
      eq.innerHTML = '';
      tray.innerHTML = '';
      placed = [];
      picked = null;
      let slotIdx = 0;
      for (const t of eqState.tokens) {
        if (t.v === '_') {
          const slot = document.createElement('div');
          slot.className = 'slot';
          slot.dataset.slot = slotIdx++;
          eq.appendChild(slot);
          placed.push({ slot, tile: null });
        } else {
          const tk = document.createElement('span');
          tk.className = 'eq-tok' + (/[+×÷=−-]/.test(String(t.v)) ? ' op' : '');
          tk.textContent = t.v;
          eq.appendChild(tk);
        }
      }
      // una ficha por hueco con el valor correcto (si nSlots=2, dos fichas iguales)
      const sol = answers.length ? answers[0] : 4;
      const tiles = rng.shuffle(
        Array.from({ length: eqState.nSlots }, () => sol).concat(distractors(rng, [sol], hard ? 6 : 4))
      );
      for (const v of tiles) {
        const tile = document.createElement('button');
        tile.className = 'tile num';
        tile.textContent = v;
        tile.dataset.v = v;
        tray.appendChild(tile);
        makeDraggable(tile, {
          onPick: (t) => selectTile(t),
          onDrop: (t, slotEl) => place(t, Number(slotEl.dataset.slot))
        });
      }
      foot.innerHTML = '';
      const checkBtn = document.createElement('button');
      checkBtn.className = 'btn check';
      checkBtn.textContent = 'Comprobar ✔';
      checkBtn.onclick = () => check();
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn ghost';
      clearBtn.textContent = 'Limpiar';
      clearBtn.onclick = () => {
        placed.forEach((p) => {
          p.slot.innerHTML = '';
          p.slot.classList.remove('filled');
          p.tile && p.tile.classList.remove('used');
          p.tile = null;
        });
        ctx.audio.sfx('click');
      };
      foot.append(checkBtn, clearBtn);
    };

    const selectTile = (tile) => {
      ctx.audio.sfx('hover');
      tray.querySelectorAll('.picked').forEach((t) => t.classList.remove('picked'));
      picked = picked === tile ? null : tile;
      if (picked) {
        picked.classList.add('picked');
        const free = placed.findIndex((p) => !p.tile);
        if (free >= 0) { place(picked, free); picked.classList.remove('picked'); picked = null; }
      }
    };

    const place = (tile, idx) => {
      const p = placed[idx];
      if (!p || tile.classList.contains('used')) return;
      if (p.tile) p.tile.classList.remove('used');
      p.tile = tile;
      tile.classList.add('used');
      tile.classList.remove('picked');
      p.slot.innerHTML = `<span>${tile.dataset.v}</span>`;
      p.slot.classList.add('filled');
      ctx.audio.sfx('snap');
    };

    const check = () => {
      if (placed.some((p) => !p.tile)) { ctx.audio.sfx('error'); flash(eq, false); return; }
      const ok = eqState.verify(placed.map((p) => Number(p.tile.dataset.v)));
      flash(eq, ok);
      if (ok) {
        solved++;
        round++;
        if (round >= rounds) finish({ success: true, performance: 1, summary: `${rounds}/${rounds} ecuaciones sin errores` });
        else { attempts = hard ? 2 : 3; ctx.after(360, render); }
      } else {
        attempts--;
        if (attempts <= 0) finish({ success: false, performance: solved / rounds, summary: `${solved}/${rounds} ecuaciones — "perdí contra una calculadora"` });
      }
    };

    render();
  }
};
