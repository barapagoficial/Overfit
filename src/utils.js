/** Utilidades compartidas: DOM ligero, RNG con semilla, formato y easing. */

/** clamp con nombre explícito. */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * mini helper de DOM: el( div', 'cls', 'html', padre )
 * Devuelve el elemento creado (o directamente el texto si solo pasas un string).
 */
export function el(tag, cls = '', html = '', parent = null) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html) n.innerHTML = html;
  if (parent) parent.appendChild(n);
  return n;
}

/** Vacia un nodo (más rápido y simple que innerHTML en hot paths de UI). */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * RNG determinista (mulberry32) con helpers. Cada ejercicio crea el suyo con
 * semilla aleatoria => generacion procedural, sin repetir el mismo puzzle dos veces.
 */
export function makeRng(seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed,
    next,
    /** entero inclusivo en [min, max] */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** float en [min, max) */
    range: (min, max) => min + next() * (max - min),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  };
}

/** Formato de AI Points: siempre con decimales (el dolor es parte del arte). */
export function fmtAP(n) {
  if (!isFinite(n)) return '∞';
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n < 100) return sign + n.toFixed(2);
  if (n < 10000) return sign + n.toFixed(1);
  return sign + Math.round(n).toLocaleString('es');
}

/** Animación genérica por rAF con easing out-cubic. step(t), done(). */
export function tween(durMs, step, done) {
  const t0 = performance.now();
  let raf = 0;
  const frame = (now) => {
    const t = clamp((now - t0) / durMs, 0, 1);
    step(1 - Math.pow(1 - t, 3));
    if (t < 1) raf = requestAnimationFrame(frame);
    else done && done();
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

/** Texto con efecto máquina de escribir. Devuelve {skip()} para terminar ya. */
export function typewriter(node, text, speedMs, onChar) {
  let i = 0, timer = 0, aborted = false;
  const step = () => {
    if (aborted) return;
    node.textContent = text.slice(0, ++i);
    onChar && onChar(text[i - 1]);
    if (i < text.length) timer = setTimeout(step, speedMs);
    else onDone();
  };
  const onDone = () => { node.dataset.done = '1'; };
  step();
  return {
    skip() {
      clearTimeout(timer);
      if (!aborted) { node.textContent = text; node.dataset.done = '1'; }
    }
  };
}
