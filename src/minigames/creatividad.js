/**
 * Creatividad → "Ideas descabelladas": para cada objeto hay 4 usos posibles con
 * un "nivel de descaro" secreto (0 = lo obvio … 3 = poema rarísimo). Elegí el
 * más creativo. Fácil: 2 objetos sin reloj. Extremo: 3 objetos, 18s c/u.
 * El rendimiento sale del "tier" promedio elegido (nada de juicio subjetivo).
 */
import { roundTimer, roundBar } from './_harness.js';

/** Datos: objeto + 4 usos con tier (0 cliché, 1 medio, 2 bueno, 3 delirante). */
const DATA = [
  { icon: '🐔', obj: 'una GALLINA', uses: [
    { t: 'poner huevos', tier: 0 }, { t: 'mascota low-cost', tier: 1 },
    { t: 'limpiadora orgánica de migas', tier: 2 }, { t: 'alarma biológica que no se puede posponer', tier: 3 } ] },
  { icon: '🧦', obj: 'un CALCETÍN suelto', uses: [
    { t: 'tirarlo', tier: 0 }, { t: 'dedal gigante', tier: 1 },
    { t: 'funda para la GPU cuando la mudás', tier: 2 }, { t: 'marioneta que te psicologiza a las 3am', tier: 3 } ] },
  { icon: '🍜', obj: 'un TENEDOR chueco', uses: [
    { t: 'comer igual (gym de muñeca)', tier: 1 }, { t: 'antena de radio artesanal', tier: 2 },
    { t: 'peine para tu PC (no lo hagas)', tier: 3 }, { t: 'usar cuchara normal', tier: 0 } ] },
  { icon: '📦', obj: 'una CAJA de cartón', uses: [
    { t: 'reciclarla', tier: 0 }, { t: 'escritorio de gato', tier: 1 },
    { t: 'carcasa de PC edición "bodega"', tier: 2 }, { t: 'máquina del tiempo decorativa (igual funciona en tu cabeza)', tier: 3 } ] },
  { icon: '🧲', obj: 'un IMÁN de heladería', uses: [
    { t: 'pegar la foto vieja a la heladera', tier: 0 }, { t: 'detector de tuercas en el piso', tier: 1 },
    { t: 'entrenador de brújulas rebeldes', tier: 3 }, { t: 'sostener el post-it', tier: 1 } ] },
  { icon: '🥤', obj: 'un CAPILLITO', uses: [
    { t: 'tomar con él', tier: 0 }, { t: 'pajita para el mate (pecado)', tier: 1 },
    { t: 'resetear la BIOS (como hacen los abuelos)', tier: 3 }, { t: 'varita de mago de kiosco', tier: 2 } ] },
  { icon: '🍕', obj: 'una CAJA de PIZZA fría', uses: [
    { t: 'tírala', tier: 0 }, { t: 'monopatín de principiante', tier: 1 },
    { t: 'disipador pasivo para el celu', tier: 2 }, { t: 'escudo táctico contra la culpa', tier: 3 } ] },
  { icon: '🔌', obj: 'un ALARGUE pelado', uses: [
    { t: 'cambiarlo (lo sensato)', tier: 0 }, { t: 'cinta y rezar', tier: 1 },
    { t: 'antena TV 4K de 1998', tier: 2 }, { t: 'prueba social: ¿quién visita?', tier: 3 } ] },
  { icon: '🪥', obj: 'un CEPILLO de dientes', uses: [
    { t: 'lavarse los dientes', tier: 0 }, { t: 'limpiar el teclado', tier: 2 },
    { t: 'cepillar al hámster (preguntá primero)', tier: 3 }, { t: 'pintar paredes chiquito', tier: 1 } ] },
  { icon: '👕', obj: 'una REMERA mancha', uses: [
    { t: 'tirarla', tier: 0 }, { t: 'piyama', tier: 1 },
    { t: 'trapeador de emergencia', tier: 2 }, { t: 'bandera de tu club de e-gaming... de mesa', tier: 3 } ] },
  { icon: '🥚', obj: 'un HUEVO tibio', uses: [
    { t: 'fritarlo', tier: 0 }, { t: 'jugar a la búsqueda de pascua con los vecinos', tier: 1 },
    { t: 'experimento de vinagre (huevo ninja)', tier: 2 }, { t: 'batería del futuro (10% voltaje, 100% fe)', tier: 3 } ] },
  { icon: '📱', obj: 'un CELU viejo', uses: [
    { t: 'cajón', tier: 0 }, { t: 'reloj de mesa', tier: 1 },
    { t: 'segunda pantalla para Discord', tier: 2 }, { t: 'ladrillo artesanal para tu primer paredón', tier: 3 } ] }
];

const STAR = (t) => '✨'.repeat(t + 1);

export default {
  id: 'creatividad',
  name: 'Ideas descabelladas',
  hint: 'Elegí el uso MÁS creativo (el jurado mide "descaro", no sentimientos).',
  timeLimit: { facil: 0, extremo: 0 },

  start(ctx) {
    const { root, hard, rng, finish } = ctx;
    const total = hard ? 3 : 2;
    const objs = rng.shuffle(DATA).slice(0, total);
    let round = 0, acc = 0;

    const bar = roundBar(root);
    const card = document.createElement('div');
    card.className = 'idea-card';
    root.appendChild(card);
    let stop = null;

    const render = () => {
      const d = objs[round];
      const uses = rng.shuffle(d.uses);
      bar.set(`Idea <b>${round + 1}/${total}</b> · descaro acumulado <b>${acc}</b>`);
      card.innerHTML = `<div class="idea-obj">${d.icon}</div><div class="idea-q">¿Para qué sirve ${d.obj} <i>de verdad</i>?</div>`;
      const opts = document.createElement('div');
      opts.className = 'idea-opts';
      card.appendChild(opts);
      for (const u of uses) {
        const b = document.createElement('button');
        b.className = 'idea-opt';
        b.innerHTML = `<span>${u.t}</span><small>${'❔'.repeat(3)}</small>`;
        b.onclick = () => {
          stop && stop();
          acc += u.tier;
          opts.querySelectorAll('button').forEach((x) => (x.disabled = true));
          b.classList.add(u.tier >= 2 ? 'good' : u.tier === 1 ? 'mid' : 'bad');
          b.querySelector('small').textContent = STAR(u.tier);
          // revelar: educación creativa gratis
          uses.forEach((uu, i) => {
            const elx = opts.children[i];
            elx.querySelector('small').textContent = STAR(uu.tier);
            elx.classList.toggle('reveal', elx !== b);
          });
          ctx.audio.sfx(u.tier >= 2 ? 'coin' : 'error');
          next(u.tier >= 2);
        };
        opts.appendChild(b);
      }
      stop = roundTimer(bar.el, hard ? 18 : 0, () => { ctx.audio.sfx('error'); next(false); });
    };

    const next = () => {
      round++;
      if (round >= total) {
        stop && stop();
        const avg = acc / (total * 3); // 0..1 (tier máximo 3 por objeto)
        const need = hard ? 0.85 : 0.55;
        finish({
          success: avg >= need,
          performance: avg,
          summary: `descaro promedio: ${Math.round(avg * 100)}% — ${avg >= need ? 'jurado llorando de orgullo' : 'demasiado convencional para la 1050'}`
        });
      } else ctx.after(760, render);
    };

    render();
  }
};
