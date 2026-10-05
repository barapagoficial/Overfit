/**
 * Arnés compartido de minijuegos: contrato del ctx + helpers de UI usados
 * por los 8 juegos (fichas, revelado, rondas). Cada juego exporta:
 *   { id, name, hint, timeLimit: {facil, extremo}, start(ctx) }
 * y el juego NUNCA toca el estado global: solo llama ctx.finish(resultado).
 */
import { audio } from '../audio.js';

export function makeCtx({ root, difficulty, rng }) {
  const timers = new Set();
  const listeners = new Set();
  let aborted = false;
  let finished = false;
  const abortFns = [];

  const ctx = {
    root,
    difficulty,
    hard: difficulty === 'extremo',
    rng,
    audio,
    /** registrar escucha con limpieza automática */
    listen(target, type, fn, opts) {
      const wrap = (e) => { if (!aborted) fn(e); };
      target.addEventListener(type, wrap, opts);
      listeners.add(() => target.removeEventListener(type, wrap, opts));
    },
    every(ms, fn) { const id = setInterval(() => !aborted && fn(), ms); timers.add(() => clearInterval(id)); return id; },
    after(ms, fn) { const id = setTimeout(() => !aborted && fn(), ms); timers.add(() => clearTimeout(id)); return id; },
    onAbort(fn) { abortFns.push(fn); },
    setHint(text) { const h = root.parentElement?.querySelector('.mg-hint'); if (h) h.textContent = text; },
    /** El juego terminó (éxito o no). `summary` se muestra en el resultado. */
    finish(result) {
      if (finished || aborted) return;
      finished = true;
      cleanup();
      ctx._onFinish && ctx._onFinish(result);
    }
  };

  const cleanup = () => {
    aborted = true;
    listeners.forEach((fn) => fn());
    timers.forEach((fn) => fn());
    abortFns.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  };
  ctx._cleanup = cleanup;
  return ctx;
}

/** Header de ronda/estado reutilizable. */
export function roundBar(root) {
  const bar = document.createElement('div');
  bar.className = 'mg-roundbar';
  root.appendChild(bar);
  return {
    el: bar,
    set(html) { bar.innerHTML = html; }
  };
}

/** Ficha click-to-select + drag & drop (pointer events, sin librerías). */
export function makeDraggable(tile, { onPick, onDrop }) {
  let dragging = false, ghost = null, startX = 0, startY = 0, moved = false;
  tile.addEventListener('pointerdown', (e) => {
    if (tile.classList.contains('used')) return;
    e.preventDefault();
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    tile.setPointerCapture?.(e.pointerId);
    const move = (ev) => {
      if (!dragging) return;
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 6) {
        moved = true;
        ghost = tile.cloneNode(true);
        ghost.classList.add('ghost');
        ghost.style.width = tile.offsetWidth + 'px';
        document.body.appendChild(ghost);
        tile.classList.add('dragging-src');
      }
      if (ghost) {
        ghost.style.left = ev.clientX + 'px';
        ghost.style.top = ev.clientY + 'px';
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const slot = under?.closest('[data-slot]');
        document.querySelectorAll('.slot.over').forEach((s) => s.classList.remove('over'));
        slot && slot.classList.add('over');
      }
    };
    const up = (ev) => {
      dragging = false;
      document.querySelectorAll('.slot.over').forEach((s) => s.classList.remove('over'));
      tile.classList.remove('dragging-src');
      if (ghost) { ghost.remove(); ghost = null; }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved) {
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const slot = under?.closest('[data-slot]');
        if (slot) { onDrop && onDrop(tile, slot); return; }
      }
      onPick && onPick(tile); // click simple
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

/** Marcar ficha como usada (visual). */
export const markUsed = (t, v = true) => t && t.classList.toggle('used', v);

/** Flash de acierto/error en un nodo. */
export function flash(node, ok) {
  node.classList.add(ok ? 'flash-ok' : 'flash-bad');
  audio.sfx(ok ? 'snap' : 'error');
  setTimeout(() => node.classList.remove('flash-ok', 'flash-bad'), 320);
}

/** Contador regresivo por ronda, con pánico visual en los últimos segundos. */
export function roundTimer(mount, seconds, onExpire, after) {
  const wrap = document.createElement('div');
  wrap.className = 'mg-roundtimer';
  const bar = document.createElement('i');
  wrap.appendChild(bar);
  mount.appendChild(wrap);
  const t0 = performance.now();
  let raf = 0, lastSec = -1;
  const loop = () => {
    const left = Math.max(0, seconds - (performance.now() - t0) / 1000);
    bar.style.width = (left / seconds) * 100 + '%';
    wrap.classList.toggle('panic', left < Math.min(5, seconds * 0.35));
    const sec = Math.ceil(left);
    if (sec !== lastSec && sec <= 5 && sec > 0) { lastSec = sec; audio.sfx('tick'); }
    if (left <= 0) { onExpire(); return; }
    raf = requestAnimationFrame(loop);
  };
  if (seconds > 0) raf = requestAnimationFrame(loop);
  else wrap.remove();
  return () => { cancelAnimationFrame(raf); wrap.remove(); };
}
