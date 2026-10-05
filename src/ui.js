/**
 * UI completa del juego en DOM (encima del canvas 3D):
 * - HUD persistente: AI Points (con counter animado), niveles/barras de las
 *   8 áreas, chip de la GPU actual, nivel de IA y FPS.
 * - Menú principal, pausa, opciones (volumen + extras), panel de entrenamiento,
 *   selector de dificultad, modal de resultados, toasts y flecha indicadora.
 * Estilo deliberadamente kitsch: es parte de la experiencia (ver styles.css).
 */
import { GAME, SKILLS, SKILLS_BY_ID, BALANCE, FLAVOR } from './config.js';
import { state, applyGain, computeGain, areaBasePreview, skillProgress, aiLevel, hardware, saveNow, resetGame, markDirty, onGameEvent } from './state.js';
import { el, fmtAP, tween, makeRng, clear } from './utils.js';
import { openExercise } from './runner.js';
import { audio } from './audio.js';

const rng = makeRng(0xD3AD); // solo para chistes aleatorios

export class UI {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('ui');
    this.toasts = document.getElementById('toasts');
    this.screen = 'menu'; // 'menu' | 'room' | 'intro'
    this.panelOpen = false;
    this.mgHandle = null;
    this._ptsShown = 0;
    this._banners = [];
    this._buildHud();
    this._buildMenu();
    this._buildPanel();
    onGameEvent((type, p) => {
      if (type === 'points') this._animatePoints();
      if (type === 'levelup') p.levelUps.forEach((lu) => this._banner(lu));
    });
    this.refreshHud();
  }

  // ================= HUD =================
  _buildHud() {
    const h = el('div', 'hud', '', this.root);
    this.hud = h;
    // AI Points (izquierda arriba)
    const pts = el('div', 'hud-pts', '', h);
    this.ptsLabel = el('div', 'hud-pts-num', '0.00', pts);
    el('div', 'hud-pts-cap', 'AI POINTS (inteligencia acumulada)', pts);
    this.ptsPop = 0;
    // chips derecha arriba
    const chips = el('div', 'hud-chips', '', h);
    this.chipGpu = el('div', 'hud-chip gpu', '', chips);
    this.chipAi = el('div', 'hud-chip', '', chips);
    this.chipFps = el('div', 'hud-chip fps', '', chips);
    // barras de áreas (abajo izquierda)
    const bars = el('div', 'hud-skills', '', h);
    this.barRefs = {};
    for (const s of SKILLS) {
      const row = el('div', `hud-skill c-${s.id}`, bars);
      row.style.setProperty('--c', s.color);
      el('span', 'hs-ic', s.icon, row);
      el('span', 'hs-name', s.name, row);
      const lvl = el('span', 'hs-lvl', 'L1', row);
      const track = el('div', 'hs-track', '', row);
      const fill = el('i', '', '', track);
      this.barRefs[s.id] = { lvl, fill, row };
    }
    // hint inferior
    this.hint = el('div', 'hud-hint', 'Hacé clic en la PC para abrir el panel de entrenamiento · [ESC] pausa', h);
    // flecha indicadora hacia la torre
    this.arrow = el('div', 'hud-arrow', '▼', h);
  }

  refreshHud() {
    const hw = hardware();
    this.chipGpu.innerHTML = `🎛️ <b>${hw.short}</b> ×${hw.mult.toFixed(2)} <small>${hw.note}</small>`;
    this.chipAi.innerHTML = `🤖 IA <b>Nv.${aiLevel() - 7}</b> <small>(niveles totales ${aiLevel()})</small>`;
    for (const s of SKILLS) {
      const r = this.barRefs[s.id];
      const p = skillProgress(s.id);
      r.lvl.textContent = `L${p.level}`;
      r.fill.style.width = `${Math.round(p.pct * 100)}%`;
      r.row.title = `${s.name}: nivel ${p.level} · ${fmtAP(p.xp)}/${fmtAP(p.need)} XP`;
    }
    this.hint.style.opacity = state.flags.firstTraining ? 0.35 : 1;
    if (this.panelOpen) this._renderPanelBody();
  }

  _animatePoints() {
    const from = this._ptsShown, to = state.aiPoints;
    const gain = to - from;
    this.ptsLabel.parentElement.classList.remove('bump');
    void this.ptsLabel.parentElement.offsetWidth;
    this.ptsLabel.parentElement.classList.add('bump');
    tween(480, (t) => {
      this._ptsShown = from + (to - from) * t;
      this.ptsLabel.textContent = fmtAP(this._ptsShown);
    });
    // flotante "+0.23"
    const r = this.ptsLabel.getBoundingClientRect();
    const f = el('div', 'float-ap', `+${gain.toFixed(gain < 1 ? 3 : 2)} AP`, this.root);
    f.style.left = r.right - 20 + 'px';
    f.style.top = r.top + 'px';
    setTimeout(() => f.remove(), 950);
    audio.sfx('coin');
    if (this.panelOpen) this._renderPanelBody();
  }

  setFps(n) { this.chipFps.textContent = `⚙️ ${n} FPS`; }

  // ================= menús =================
  _buildMenu() {
    const m = el('div', 'screen menu', '', this.root);
    this.menu = m;
    const logo = el('h1', 'logo', '', m);
    logo.innerHTML = `O<span>V</span>ER<span>F</span>IT`;
    el('div', 'logo-sticker', 'v' + GAME.version + ' — demo', m);
    el('p', 'tag', `${GAME.tagline}<br><small>Un idle de entrenamiento de IA con honor, paciencia y una GTX 1050.</small>`, m);
    const btns = el('div', 'menu-btns', '', m);
    this.btnPlay = el('button', 'btn big', '▶ Jugar', btns);
    el('button', 'btn', '📼 Ver la intro', btns).onclick = () => { audio.sfx('click'); this.app.playIntro(true); };
    el('button', 'btn', '🔊 Opciones', btns).onclick = () => { audio.sfx('click'); this.openOptions(); };
    const btnQuit = el('button', 'btn ghost', 'Salir', btns);
    btnQuit.onclick = () => this.app.quit();
    this.menuStats = el('p', 'menu-stats', '', m);
    this.btnPlay.onclick = () => { audio.sfx('open'); this.app.startGame(); };
  }

  _updateMenu() {
    if (state.stats.runs > 0) {
      this.menuStats.innerHTML = `— tu IA hasta ahora: <b>${fmtAP(state.aiPoints)}</b> AI Points · Nv.${aiLevel() - 7} · ${state.stats.wins} éxitos, ${state.stats.fails} fracasos instructivos · racha máx: ${state.stats.bestStreak}`;
      this.btnPlay.textContent = '▶ Continuar el sufrimiento';
    } else {
      this.menuStats.textContent = '';
      this.btnPlay.textContent = state.flags.introSeen ? '▶ Jugar' : '▶ Empezar (hay intro)';
    }
  }

  _buildPause() {
    if (this.pauseEl) return;
    const p = el('div', 'screen pause', '', this.root);
    this.pauseEl = p;
    el('div', 'pause-title', '⏸ PAUSA', p);
    el('div', 'pause-sub', 'El ventilador aprovecha para respirar.', p);
    const btns = el('div', 'menu-btns', '', p);
    el('button', 'btn big', '▶ Reanudar', btns).onclick = () => this.app.setPaused(false);
    el('button', 'btn', '🔊 Opciones', btns).onclick = () => { audio.sfx('click'); this.openOptions(); };
    el('button', 'btn', '💾 Guardar ahora', btns).onclick = async () => { await saveNow(); audio.sfx('coin'); this.toast('Guardado en la carpeta de datos, mijo.'); };
    el('button', 'btn', '🏠 Volver al menú', btns).onclick = () => { this.app.setPaused(false); this.app.goMenu(); };
    el('button', 'btn ghost', '🚪 Salir del juego', btns).onclick = () => this.app.quit();
  }

  setPaused(on) {
    this.paused = on;
    this._buildPause();
    this.pauseEl.classList.toggle('show', on);
    if (on) this.refreshPause();
  }

  /** Cierra la capa superior activa (Orden: ejercicio → modal → opciones → pausa → panel). */
  closeTop() {
    if (this.mgHandle) { this.mgHandle.close(); return true; }
    if (this.diffEl) { this.diffEl.remove(); this.diffEl = null; return true; }
    if (this.resEl) {
      this.resEl.remove(); this.resEl = null;
      if (this._pendingPanel) this.togglePanel(true); else this.refreshHud();
      return true;
    }
    if (this.optEl && this.optEl.classList.contains('show')) { this.optEl.classList.remove('show'); return true; }
    if (this.paused) { this.app.setPaused(false); return true; }
    if (this.panelOpen) { this.togglePanel(false); return true; }
    return false;
  }
  refreshPause() {
    this.pauseEl.querySelector('.pause-sub').innerHTML =
      `AI Points: <b>${fmtAP(state.aiPoints)}</b> · rendimiento actual de la 1050: un 14% (estimación falsa, no busques en el código).`;
  }

  // ================= Opciones =================
  openOptions() {
    if (this.optEl) { this.optEl.classList.add('show'); this._fillOptions(); return; }
    const wrap = el('div', 'screen options', '', this.root);
    this.optEl = wrap;
    const card = el('div', 'modal', '', wrap);
    el('div', 'modal-title', '🔊 Opciones', card);
    this.optBody = el('div', 'opt-body', '', card);
    el('div', 'modal-note', 'Todo se guarda automáticamente (JSON en la carpeta de datos de usuario).', card);
    const btns = el('div', 'modal-btns', '', card);
    el('button', 'btn big', 'Cerrar', btns).onclick = () => { audio.sfx('close'); wrap.classList.remove('show'); };
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.classList.remove('show'); });
    this._fillOptions();
  }

  _fillOptions() {
    const b = this.optBody;
    clear(b);
    const mkSlider = (label, key, onChange) => {
      const row = el('div', 'opt-row', '', b);
      el('label', '', label, row);
      const inp = el('input', '', '', row);
      inp.type = 'range'; inp.min = 0; inp.max = 100; inp.value = Math.round(state.settings[key] * 100);
      const val = el('span', 'opt-val', inp.value + '%', row);
      inp.oninput = () => {
        state.settings[key] = inp.value / 100;
        val.textContent = inp.value + '%';
        onChange && onChange(state.settings[key]);
        markDirty(); // el volumen también se autoguarda
      };
    };
    mkSlider('🎵 Música', 'musicVol', (v) => { audio.setVolumes(v, state.settings.sfxVol); if (v > 0) audio.startMusic(); else audio.stopMusic(); });
    mkSlider('🔔 Efectos', 'sfxVol', (v) => audio.setVolumes(state.settings.musicVol, v));
    const mkToggle = (label, key, onChange) => {
      const row = el('label', 'opt-row toggle', '', b);
      const inp = el('input', '', '', row);
      inp.type = 'checkbox'; inp.checked = !!state.settings[key];
      el('span', '', label, row);
      inp.onchange = () => { state.settings[key] = inp.checked; onChange && onChange(inp.checked); saveNow(); audio.sfx('click'); };
    };
    mkToggle('🖱️ Parallax de cámara con el mouse', 'parallax', (v) => this.app.setParallax(v));
    mkToggle('💡 Luces parpadeantes (ambientación barata)', 'flicker', (v) => (this.app.room.flicker = v));
    const danger = el('div', 'opt-row danger', '', b);
    el('div', '', '⚠️ Zona tío: no tocar si te gusta tu progreso.', danger);
    const bDel = el('button', 'btn ghost tiny', 'Borrar partida guardada', danger);
    bDel.onclick = async () => {
      if (!confirm('¿Seguro? La IA se olvidará de TODO. Hasta de tu nombre.')) return;
      await resetGame();
      this._ptsShown = 0;
      this.ptsLabel.textContent = '0.00';
      this.refreshHud();
      this._updateMenu();
      this.toast('Partida borrada. Como si el tío nunca hubiera pasado.');
      audio.sfx('error');
    };
    const bIntro = el('button', 'btn ghost tiny', 'Ver intro de nuevo', danger);
    bIntro.onclick = () => { this.optEl.classList.remove('show'); this.app.playIntro(true); };
  }

  // ================= Panel de entrenamiento =================
  _buildPanel() {
    const p = el('div', 'screen panel', '', this.root);
    this.panel = p;
    const card = el('div', 'panel-card', '', p);
    const head = el('div', 'panel-head', '', card);
    el('div', 'panel-title', '🖥️ PANEL DE ENTRENAMIENTO <small>overfit.exe — no cerrar, se pone bruto</small>', head);
    this.panelPts = el('div', 'panel-pts', '0.00 AP', head);
    el('button', 'btn ghost', '✕', head).onclick = () => this.togglePanel(false);
    this.panelBody = el('div', 'panel-grid', '', card);
    el('div', 'panel-foot', 'Sin tienda. Sin microtransacciones. Solo vos, tu tío y el silicio.', card);
    p.addEventListener('click', (e) => { if (e.target === p) this.togglePanel(false); });
  }

  togglePanel(on = !this.panelOpen) {
    this.panelOpen = on;
    this.panel.classList.toggle('show', on);
    this.app.room.enabled = !on && this.screen === 'room';
    audio.sfx(on ? 'open' : 'close');
    if (on) this._renderPanelBody();
  }

  _renderPanelBody() {
    this.panelPts.textContent = `${fmtAP(state.aiPoints)} AP`;
    const g = this.panelBody;
    clear(g);

    // tarjeta GENERAL
    const genGain = computeGain('general', 'facil', 1);
    const gen = el('div', 'pcard general', '', g);
    gen.innerHTML = `<div class="pc-icon">⚡</div><div class="pc-mid">
      <b>ENTRENAMIENTO GENERAL</b>
      <small>Ejercicio al azar de cualquier área. Ganancia baja... pero sube <i>las 8</i> un poquito.</small>
      <div class="pc-gain">≈ +${fmtAP(genGain)} AP · sube todo ${(BALANCE.generalXpShare * 100) | 0}%</div></div>`;
    gen.onclick = () => this._pickDifficulty('general');

    for (const s of SKILLS) {
      const p = skillProgress(s.id);
      const prev = areaBasePreview(s.id);
      const c = el('div', 'pcard', '', g);
      c.style.setProperty('--c', s.color);
      c.innerHTML = `
        <div class="pc-icon">${s.icon}</div>
        <div class="pc-mid">
          <b>${s.name}</b>
          <small>${s.tag}</small>
          <div class="pc-bar"><i style="width:${Math.round(p.pct * 100)}%"></i></div>
        </div>
        <div class="pc-meta">
          <div class="pc-lvl">Nivel <b>${p.level}</b></div>
          <div class="pc-xp">${fmtAP(p.xp)} / ${fmtAP(p.need)} XP</div>
          <div class="pc-gain">fácil ≈ +${fmtAP(prev.easy)} · extremo ≈ +${fmtAP(prev.hard)}</div>
        </div>`;
      c.onclick = () => this._pickDifficulty(s.id);
    }
  }

  // ================= elección de dificultad =================
  _pickDifficulty(skillId) {
    if (this.diffEl) this.diffEl.remove();
    const wrap = el('div', 'screen diff show', '', this.root);
    this.diffEl = wrap;
    const card = el('div', 'modal diff-modal', '', wrap);
    const name = skillId === 'general' ? '⚡ Entrenamiento general' : `${SKILLS_BY_ID[skillId].icon} ${SKILLS_BY_ID[skillId].name}`;
    el('div', 'modal-title', `Elegí el ejercicio — ${name}`, card);
    const row = el('div', 'diff-row', '', card);
    for (const d of ['facil', 'extremo']) {
      const conf = BALANCE.difficulty[d];
      const g1 = computeGain(skillId, d, 1);
      const g0 = computeGain(skillId, d, BALANCE.failPerformance);
      const b = el('button', `diff-btn ${d}`, '', row);
      b.innerHTML = `
        <div class="diff-tag">${d === 'extremo' ? '☠ EXTREMADAMENTE DIFÍCIL' : '🙂 FÁCIL'}</div>
        <div class="diff-mult">×${conf.mult}</div>
        <div class="diff-blurb">${conf.blurb}</div>
        <div class="diff-nums">éxito ≈ <b>+${fmtAP(g1)} AP</b><br>fallo ≈ <b>+${fmtAP(g0)} AP</b></div>`;
      b.onclick = () => { audio.sfx('open'); wrap.remove(); this.diffEl = null; this._startExercise(skillId, d); };
    }
    el('div', 'modal-note', 'En ambos casos: si fallás, la ganancia es mínima. Es la gracia.', card);
    const btns = el('div', 'modal-btns', '', card);
    el('button', 'btn ghost', 'Volver', btns).onclick = () => { audio.sfx('close'); wrap.remove(); this.diffEl = null; };
    wrap.addEventListener('click', (e) => { if (e.target === wrap) { wrap.remove(); this.diffEl = null; } });
  }

  _startExercise(skillId, difficulty) {
    const wasPanel = this.panelOpen;
    this.togglePanel(false);
    this._pendingPanel = wasPanel;
    this.mgHandle = openExercise({
      skillId,
      difficulty,
      onDone: (payload) => {
        this.mgHandle = null;
        if (!payload) {
          if (this._pendingPanel) this.togglePanel(true);
          return; // abandonado: ni premio ni castigo
        }
        this._finishExercise(skillId, payload);
      }
    });
    if (this.mgHandle) audio.sfx('open');
  }

  // ================= resultado =================
  _finishExercise(skillId, { result, def, difficulty }) {
    const before = {};
    for (const s of SKILLS) before[s.id] = skillProgress(s.id);
    const out = applyGain(skillId, difficulty, result);

    if (this.resEl) this.resEl.remove();
    const wrap = el('div', 'screen result show', '', this.root);
    this.resEl = wrap;
    const card = el('div', 'modal result-card', '', wrap);
    const ok = result.success;
    el('div', `res-head ${ok ? 'win' : 'fail'}`, ok ? '✔ ¡ÉXITO!' : '✘ FALLIDO', card);
    const areaName = skillId === 'general' ? '⚡ Entrenamiento general' : `${SKILLS_BY_ID[skillId].icon} ${SKILLS_BY_ID[skillId].name}`;
    el('div', 'res-sub', `${areaName} · dificultad ${BALANCE.difficulty[difficulty].label} · ${def.name}`, card);
    const pts = el('div', 'res-pts', '+0.00 <small>AI POINTS</small>', card);
    el('div', 'res-perf', `Rendimiento del ejercicio: <b>${Math.round(out.performance * 100)}%</b> ${result.summary ? '· ' + result.summary : ''}`, card);

    // XP por área con barra animada
    const xpBox = el('div', 'res-xp', '', card);
    for (const s of SKILLS) {
      const ch = out.xpBySkill[s.id];
      if (!ch) continue;
      const row = el('div', 'res-xp-row', xpBox);
      row.style.setProperty('--c', s.color);
      const beforeP = before[s.id], afterP = skillProgress(s.id);
      row.innerHTML = `<span>${s.icon} ${s.name}</span>
        <div class="res-xp-bar"><i style="width:${Math.round(beforeP.pct * 100)}%"></i></div>
        <b>L${afterP.level}${ch.levels.length ? ' ⬆' : ''}</b>`;
      const fill = row.querySelector('i');
      requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = `${Math.round(afterP.pct * 100)}%`)));
    }

    const flavor = ok ? rng.pick(FLAVOR.win) : rng.pick(FLAVOR.loss);
    el('div', 'res-flavor', `“${flavor}”`, card);

    const btns = el('div', 'modal-btns', '', card);
    el('button', 'btn big', '🔁 Entrenar de nuevo', btns).onclick = () => {
      wrap.remove(); this.resEl = null; this._startExercise(skillId, difficulty);
    };
    el('button', 'btn', 'Volver a la PC', btns).onclick = () => {
      wrap.remove(); this.resEl = null;
      if (this._pendingPanel) this.togglePanel(true); else this.refreshHud();
    };

    // counter animado de la ganancia (los level-ups ya suenan desde el banner)
    tween(650, (t) => {
      const v = out.gain * t;
      pts.innerHTML = `+${fmtAP(v)} <small>AI POINTS</small>`;
    }, () => audio.sfx('pop'));
    audio.sfx(ok ? 'win' : 'fail');
    this.refreshHud();
  }

  // ================= utilidades =================
  _banner({ id, level }) {
    const s = SKILLS_BY_ID[id];
    const b = el('div', 'banner', `⬆ <b>${s ? s.name : id}</b> llegó a NIVEL ${level} — la 1050 tose de orgullo`, this.root);
    setTimeout(() => b.classList.add('out'), 2300);
    setTimeout(() => b.remove(), 2900);
    audio.sfx('levelup');
  }

  toast(text, ms = 3200) {
    const t = el('div', 'toast', text, this.toasts);
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 400);
  }

  tooltip(x, y, text) {
    if (!this.tip) this.tip = el('div', 'tooltip', '', this.root);
    this.tip.textContent = text;
    this.tip.classList.add('show');
    this.tip.style.left = x + 14 + 'px';
    this.tip.style.top = y + 16 + 'px';
  }
  hideTooltip() { this.tip && this.tip.classList.remove('show'); }

  showArrow(pos) {
    if (!pos) { this.arrow.classList.remove('show'); return; }
    this.arrow.classList.add('show');
    this.arrow.style.left = pos.x + 'px';
    this.arrow.style.top = pos.y + 'px';
  }

  setScreen(name) {
    this.screen = name;
    this.root.dataset.screen = name;
    this.menu.classList.toggle('show', name === 'menu');
    if (name === 'menu') this._updateMenu();
    this.hud.classList.toggle('show', name === 'room');
    if (name !== 'room') this.showArrow(null);
  }

  anyModalOpen() {
    return !!(this.diffEl || this.resEl || (this.optEl && this.optEl.classList.contains('show')) || this.mgHandle || this.paused);
  }
}
