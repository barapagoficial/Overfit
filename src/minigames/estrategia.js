/**
 * Estrategia → "Duelo de cartones contra la tía": fila de números; en tu turno
 * tomás el cartón del extremo izquierdo o derecho. La tía es codiciosa (toma
 * el mayor extremo — patrón predecible = beatable pensando 2 jugadas ahead).
 * Fácil: 4 cartones sin reloj. Extremo: 8 cartones + 7s por turno.
 */
import { roundBar, roundTimer } from './_harness.js';

const STICK = (n, mine) => `<div class="carton${mine ? ' mine' : ''}"><b>${n}</b></div>`;

export default {
  id: 'estrategia',
  name: 'Duelo de cartones',
  hint: 'Tomá un cartón de un EXTREMO. Sumá más que la tía para ganar. Ella siempre estira la mano al mayor.',
  timeLimit: { facil: 0, extremo: 75 },

  start(ctx) {
    const { root, hard, rng, finish } = ctx;
    const n = hard ? 8 : 4;
    // generar fila con valores variados (pares para que el juego cierre parejo)
    let cards;
    do {
      const half = Array.from({ length: n / 2 }, () => rng.int(1, 9));
      const rest = half.map((v, i) => Math.max(1, v + rng.pick([-2, -1, 0, 1, 2])));
      cards = rng.shuffle([...half, ...rest]);
    } while (new Set(cards).size < 3);

    let turn = 0, mine = 0, hers = 0, over = false;
    let timerOff = null;

    const bar = roundBar(root);
    const board = document.createElement('div');
    board.className = 'carton-row';
    root.appendChild(board);
    const score = document.createElement('div');
    score.className = 'carton-score';
    root.appendChild(score);

    const draw = (lock = true) => {
      bar.set(`Tu turno: tocá un <b>extremo</b> · cartones: ${cards.length}`);
      score.innerHTML = `${STICK(mine, true)}<span>vos 🧑‍💻 &nbsp;vs&nbsp; 👵 tía</span>${STICK(hers, false)}`;
      board.innerHTML = '';
      cards.forEach((v, i) => {
        const isEnd = i === 0 || i === cards.length - 1;
        const b = document.createElement('button');
        b.className = 'carton' + (isEnd && !lock ? ' pickable' : '');
        b.innerHTML = `<b>${v}</b>`;
        if (isEnd && !lock && !over) b.onclick = () => playerTake(i);
        b.disabled = !isEnd || lock || over;
        board.appendChild(b);
      });
    };

    const playerTake = (i) => {
      if (over) return;
      timerOff && timerOff();
      const v = cards.splice(i, 1)[0];
      mine += v;
      ctx.audio.sfx('snap');
      if (!cards.length) return judge();
      turn = 1;
      draw(true);
      ctx.after(650, tiaMove);
    };

    const tiaMove = () => {
      if (over || !cards.length) return judge();
      const L = cards[0], R = cards[cards.length - 1];
      let idx;
      if (L > R) idx = 0;
      else if (R > L) idx = cards.length - 1;
      else idx = rng.chance(0.5) ? 0 : cards.length - 1;
      const v = cards.splice(idx, 1)[0];
      hers += v;
      ctx.audio.sfx('pop');
      if (!cards.length) return judge();
      turn = 0;
      draw(false);
      if (hard) {
        const panic = () => playerTake(cards[0] >= cards[cards.length - 1] ? 0 : cards.length - 1);
        timerOff = roundTimer(bar.el, 7, panic); // pánico: si no elegís, la tía te hace elegir
      } else timerOff = null;
    };

    const judge = () => {
      over = true;
      timerOff && timerOff();
      const win = mine > hers;
      const sum = Math.max(1, mine + hers);
      const perf = Math.max(0.15, Math.min(1, 0.5 + (mine - hers) / (2 * sum)));
      ctx.audio.sfx(win ? 'win' : 'fail');
      finish({
        success: win,
        performance: win ? Math.max(perf, 0.6) : perf,
        summary: win ? `le ganaste a la tía ${mine}–${hers}` : `la tía te pasó ${hers}–${mine}. Mirá cómo come cartón.`
      });
    };

    draw(false);
    if (hard) timerOff = roundTimer(bar.el, 7, () => playerTake(cards[0] >= cards[cards.length - 1] ? 0 : cards.length - 1));
  }
};
