/**
 * Runner de ejercicios: monta el overlay del minijuego, corrige el reloj
 * global (solo en EXTREMO suele haber límite), y entrega el resultado al UI
 * para que compute AI Points. No conoce el estado del juego: separación limpia.
 */
import { MINIGAMES, randomMinigame } from './minigames/index.js';
import { makeCtx } from './minigames/_harness.js';
import { BALANCE, SKILLS_BY_ID } from './config.js';
import { makeRng, el, clamp } from './utils.js';
import { audio } from './audio.js';

/**
 * @param skillId id de área o 'general'
 * @param difficulty 'facil' | 'extremo'
 * @param onDone cb({ result, def, chosenSkillId, difficulty }) | cb(null) si se abandona
 * @returns {{close: Function}} handle para forzar cierre (tecla Esc)
 */
export function openExercise({ skillId, difficulty, onDone }) {
  const rng = makeRng();
  const isGeneral = skillId === 'general';
  const def = isGeneral ? randomMinigame(rng) : MINIGAMES[skillId];
  const chosenSkillId = isGeneral ? def.id : skillId; // display nada: la recompensa "general" la resuelve el UI

  const overlay = el('div', 'mg-overlay');
  const head = el('div', 'mg-head', '', overlay);
  el('div', 'mg-title', `${def.name} <small>${SKILLS_BY_ID[chosenSkillId]?.icon ?? '⚡'} ${SKILLS_BY_ID[chosenSkillId]?.name ?? 'general'}</small>`, head);
  const chip = el('div', 'mg-diff ' + (difficulty === 'extremo' ? 'ext' : ''), difficulty === 'extremo' ? `EXTREMO ×${BALANCE.difficulty.extremo.mult} ☠` : `FÁCIL ×${BALANCE.difficulty.facil.mult}`, head);
  const quitBtn = el('button', 'btn ghost mg-quit', '✕ Salir', head);
  const globalBar = el('div', 'mg-clock', '', head);
  const fill = el('i', '', '', globalBar);
  const body = el('div', 'mg-body', '', overlay);
  el('div', 'mg-hint', def.hint, overlay);
  document.body.appendChild(overlay);
  document.body.classList.add('in-overlay');

  const limit = (def.timeLimit && def.timeLimit[difficulty]) || 0;
  let closed = false;
  let raf = 0;

  const close = () => {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(raf);
    ctx._cleanup();
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 140);
    document.body.classList.remove('in-overlay');
  };

  const ctx = makeCtx({ root: body, difficulty, rng });
  ctx._onFinish = (result) => {
    result.performance = clamp(result.performance ?? 0, 0, 1);
    close();
    onDone && onDone({ result, def, chosenSkillId, difficulty });
  };

  quitBtn.onclick = (e) => {
    e.stopPropagation();
    audio.sfx('close');
    close();
    onDone && onDone(null);
  };

  // Reloj global: si se agota, fallo con rendimiento mínimo (aplicable a cualquier juego)
  if (limit > 0) {
    const t0 = performance.now();
    globalBar.classList.add('on');
    const loop = () => {
      if (closed) return;
      const left = limit - (performance.now() - t0) / 1000;
      fill.style.width = clamp((left / limit) * 100, 0, 100) + '%';
      globalBar.classList.toggle('panic', left < 10);
      if (left <= 0) {
        audio.sfx('fail');
        ctx._onFinish({ success: false, performance: BALANCE.failPerformance, summary: 'se acabó el tiempo. la 1050 ni se inmutó.' });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  } else {
    globalBar.remove();
  }

  // lanzar el juego; sus propios timers de ronda viven adentro del módulo
  try {
    def.start(ctx);
  } catch (err) {
    console.error('[minigame crash]', err);
    audio.sfx('error');
    close();
    onDone && onDone(null);
  }

  return { close: () => { close(); onDone && onDone(null); } };
}
