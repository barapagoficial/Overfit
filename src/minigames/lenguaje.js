/**
 * Lenguaje → "Letras al desorden": anagramas procedurales de palabras reales.
 * Fácil: 3 palabras cortas, 40s c/u. Extremo: 3 palabras largas, 25s c/u y
 * sin pista de categoría. Tocar letras para armar la palabra; tocar la fila
 * de abajo para devolverlas.
 */
import { flash, roundTimer, roundBar } from './_harness.js';

const CORTAS = [
  ['GAMUZA', 'animal raro'], ['CONTROL', 'periférico'], ['TECLADO', 'periférico'],
  ['MEME', 'idioma de internet'], ['NUBE', 'dónde vive tu save'], ['SOFT', 'contrario de hardware'],
  ['PIXEL', 'cuadrito'], ['MODEM', 'artefacto ruidoso'], ['BUG', 'enemigo público 1'],
  ['RAM', 'la que no tenés'], ['CACHE', 'el cajón desordenado'], ['DRIVER', 'controla tu GPU'],
  ['FLOPI', 'disco ancestral'], ['SERVIDOR', 'un PC con títulos'], ['WIFI', 'se corta igual']
];
const LARGAS = [
  ['COMPILADOR', null], ['DISIPADOR', null], ['OVERCLOCK', null], ['ARTIFICIAL', null],
  ['INTELIGENCIA', null], ['ENTRENAMIENTO', null], ['SOBRECARGA', null],
  ['PROCESADOR', null], ['RENDERIZADO', null], ['ALGORITMO', null],
  ['PANTALLAZO', null], ['DESCONECTADO', null], ['CLICKEAR', null]
];

export default {
  id: 'lenguaje',
  name: 'Letras al desorden',
  hint: 'Armá la palabra tocando las letras en orden. Tocar una letra puesta la devuelve.',
  timeLimit: { facil: 0, extremo: 0 }, // reloj por palabra

  start(ctx) {
    const { root, hard, rng, finish } = ctx;
    const pool = hard ? LARGAS : CORTAS;
    const total = 3;
    const chosen = rng.shuffle(pool).slice(0, total);
    let round = 0, solved = 0;

    const bar = roundBar(root);
    const hintRow = document.createElement('div');
    hintRow.className = 'word-hint';
    root.appendChild(hintRow);
    const built = document.createElement('div');
    built.className = 'word-built';
    root.appendChild(built);
    const tray = document.createElement('div');
    tray.className = 'word-tray';
    root.appendChild(tray);
    let stop = null;

    const render = () => {
      const [word, cat] = chosen[round];
      // barajar hasta que sea distinto del original
      let sc = word;
      while (sc === word) sc = rng.shuffle(word.split('')).join('');
      bar.set(`Palabra <b>${round + 1}/${total}</b> · armadas <b>${solved}</b>`);
      hintRow.textContent = cat ? `Pista: ${cat}` : (hard ? 'Sin pista. Sufrí.' : 'Pista: adivinala');
      built.innerHTML = '';
      tray.innerHTML = '';
      const slots = word.split('').map(() => {
        const s = document.createElement('button');
        s.className = 'word-slot';
        s.disabled = true;
        built.appendChild(s);
        return s;
      });
      const letters = [];
      sc.split('').forEach((ch, i) => {
        const b = document.createElement('button');
        b.className = 'tile letter';
        b.textContent = ch;
        b.dataset.i = i;
        b.dataset.ch = ch;
        tray.appendChild(b);
        letters.push(b);
        b.onclick = () => {
          if (b.classList.contains('used')) return;
          const free = slots.findIndex((s) => s.disabled);
          if (free < 0) return;
          slots[free].textContent = ch;
          slots[free].disabled = false; // habilita el clic para devolver la letra
          slots[free].dataset.from = i;
          b.classList.add('used');
          ctx.audio.sfx('snap');
          check();
        };
      });
      slots.forEach((s, i) => {
        s.onclick = () => {
          if (s.disabled) return;
          const src = letters[+s.dataset.from];
          s.textContent = '';
          s.disabled = true;
          src && src.classList.remove('used');
          ctx.audio.sfx('click');
        };
      });
      stop && stop();
      stop = roundTimer(bar.el, hard ? 25 : 40, () => {
        ctx.audio.sfx('error');
        flash(built, false);
        next(false);
      });
    };

    const check = () => {
      if (slotsFull()) {
        const word = chosen[round][0];
        const got = [...built.children].map((s) => s.textContent).join('');
        if (got === word) {
          stop && stop();
          solved++;
          flash(built, true);
          next(true);
        }
      }
    };
    const slotsFull = () => [...built.children].every((s) => !s.disabled);

    const next = () => {
      round++;
      if (round >= total) {
        stop && stop();
        finish({
          success: hard ? solved === total : solved >= 2,
          performance: solved / total,
          summary: `palabras rescatadas: ${solved}/${total}`
        });
      } else ctx.after(420, render);
    };

    render();
  }
};
