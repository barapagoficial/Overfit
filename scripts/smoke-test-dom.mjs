/**
 * SMOKE TEST (herramienta de desarrollo): sin Electron ni navegador, levanta un
 * DOM simulado (jsdom), instancia la UI, abre el panel, lanza los 8
 * minijuegos en ambas dificultades y verifica el flujo completo de recompensa.
 * Uso: `npm run smoke:dom` (necesita `npm i --no-save jsdom`).
 * No forma parte del juego empaquetado.
 */
import { JSDOM } from 'jsdom';

// ---------- entorno DOM simulado ----------
const dom = new JSDOM(`<!doctype html><html><body>
  <canvas id="scene"></canvas><div id="ui"></div><div id="toasts"></div></body></html>`,
  { pretendToBeVisual: true });
const window = dom.window;
const document = window.document;
globalThis.window = window;
globalThis.document = document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (cb) => window.requestAnimationFrame(cb);
globalThis.cancelAnimationFrame = (id) => window.cancelAnimationFrame(id);

const grad = { addColorStop() {} };
const ctx2dStub = new Proxy({ canvas: document.createElement('canvas') }, {
  get(t, k) {
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => grad;
    if (k === 'measureText') return () => ({ width: 10 });
    if (!(k in t)) t[k] = () => {};
    return t[k];
  },
  set(t, k, v) { t[k] = v; return true; }
});
window.HTMLCanvasElement.prototype.getContext = function (kind) {
  return kind === '2d' ? ctx2dStub : null;
};
window.HTMLElement.prototype.setPointerCapture = function () {};
window.Element.prototype.getBoundingClientRect = function () {
  return { left: 0, top: 0, right: 120, bottom: 80, width: 120, height: 80, x: 0, y: 0 };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (cond, label) => { console.log((cond ? '  ✔ ' : '  ✘ ') + label); if (!cond) failures++; };

// ---------- modules del juego ----------
const { state } = await import('../src/state.js');
const { SKILLS } = await import('../src/config.js');
const { UI } = await import('../src/ui.js');
const { makeCtx } = await import('../src/minigames/_harness.js');
const { MINIGAMES } = await import('../src/minigames/index.js');
const { makeRng } = await import('../src/utils.js');

console.log('— Smoke test DOM: OVERFIT MVP —');

// 1) UI boot
const fakeApp = { room: { enabled: true, flicker: true }, quit() {}, startGame() {}, setPaused() {}, playIntro() {}, setParallax() {} };
const ui = new UI(fakeApp);
ok(document.querySelector('.hud') && ui.hud, 'HUD construido');
ok(document.querySelector('.menu'), 'menú construido');

// 2) panel de entrenamiento
ui.togglePanel(true);
ok(document.querySelectorAll('.pcard').length === 9, 'panel: 8 áreas + general');

// 3) selector de dificultad
ui._pickDifficulty('memoria');
ok(document.querySelectorAll('.diff-btn').length === 2, 'selector fácil/extremo');
document.querySelector('.diff-btn.facil').click();
await sleep(120);
ok(!!document.querySelector('.mg-overlay'), 'overlay del ejercicio montado (memoria/fácil)');
ui.mgHandle.close(); // cerrar el ejercicio antes de seguir (abandono = sin penalidad)
await sleep(30);

// 4) los 8 juegos arrancan sin excepción en ambas dificultades (5 seeds cada uno)
for (const id of Object.keys(MINIGAMES)) {
  for (const diff of ['facil', 'extremo']) {
    for (let seed = 1; seed <= 5; seed++) {
      const root = document.createElement('div');
      const ctx = makeCtx({ root, difficulty: diff, rng: makeRng(seed * 977 + id.length * 13) });
      let threw = null;
      try { MINIGAMES[id].start(ctx); } catch (e) { threw = e; }
      if (threw) { console.log(`    err ${id}/${diff}/seed${seed}:`, threw.message); }
      await sleep(10);
      ctx._cleanup();
      ok(!threw, `${id} · ${diff} · seed ${seed} arranca`);
      if (threw) process.exit(1);
    }
  }
}

// 5) flujo completo: resultado → AI Points → nivel
const before = state.aiPoints;
ui._finishExercise('calculo', { result: { success: true, performance: 1 }, def: { name: 'test' }, difficulty: 'extremo' });
ok(state.aiPoints > before, `applyGain suma AP (${before} → ${state.aiPoints.toFixed(4)})`);
ok(!!document.querySelector('.result-card'), 'modal de resultado mostrado');
const backBtn = [...document.querySelectorAll('.result-card .btn')].find((b) => b.textContent.includes('Volver'));
backBtn.click();
ok(!document.querySelector('.result-card'), 'modal de resultado se cierra');
ok(document.querySelectorAll('.pcard').length === 9, 'vuelve al panel (pendiente) con tarjetas actualizadas');

// 6) guardar snapshot de estado
ok(typeof state.skills === 'object' && SKILLS.every((s) => state.skills[s.id].level >= 1), 'todos los niveles >= 1');

// 7) escenas 3D reales: construcción + update (sin renderer GL: basta con el grafo)
const { RoomScene } = await import('../src/scene.js');
let roomErr = null;
try {
  const room = new RoomScene();
  for (let i = 0; i < 10; i++) room.update(0.05, i * 0.05);
  room.hover(0, 0); room.click(0, 0); room.towerScreenPos(1280, 720);
} catch (e) { roomErr = e; }
ok(!roomErr, 'RoomScene: build + update + interacción sin errores' + (roomErr ? ' → ' + roomErr.message : ''));
if (roomErr) { console.log(roomErr.stack); process.exit(1); }

const { IntroScene } = await import('../src/intro.js');
let introErr = null;
try {
  const intro = new IntroScene();
  for (let i = 0; i < 10; i++) intro.update(0.05, i * 0.05);
  intro.finish();
  intro.destroy();
} catch (e) { introErr = e; }
ok(!introErr, 'IntroScene: build + update + finish + destroy sin errores' + (introErr ? ' → ' + introErr.message : ''));
if (introErr) { console.log(introErr.stack); process.exit(1); }

console.log(failures ? `\nFALLOS: ${failures}` : '\nSMOKE OK — todo el flujo pasó sin errores');
process.exit(failures ? 1 : 0);
