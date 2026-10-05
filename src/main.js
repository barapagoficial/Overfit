/**
 * bootstrap del juego: renderer compartido, máquina de pantallas
 * (intro → menú → cuarto), input 3D, pausa y guardado automático.
 */
import * as THREE from 'three';
import { FLAVOR } from './config.js';
import { state, loadGame, saveNow } from './state.js';
import { UI } from './ui.js';
import { RoomScene } from './scene.js';
import { IntroScene } from './intro.js';
import { audio } from './audio.js';
import { makeRng } from './utils.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('scene');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // PC modesto agradece

    this.room = new RoomScene();
    this.active = this.room; // escena 3D visible
    this.intro = null;
    this.paused = false;
    this.t = 0;
    this.idle = 0;
    this._rng = makeRng(0xB0BA);
    this._frames = 0;
    this._fpsT = 0;

    this.ui = new UI(this);

    this._bind();
    this.resize();
    requestAnimationFrame((t) => this._loop(t));
  }

  // ---------------- pantallas ----------------
  async boot() {
    await loadGame();
    audio.setVolumes(state.settings.musicVol, state.settings.sfxVol);
    this.ui.refreshHud();
    if (state.flags.introSeen) this.goMenu();
    else this._enterIntro('menu'); // intro primero, obvio
  }

  goMenu() {
    this._disposeIntro();
    this.ui.setScreen('menu');
    this.room.enabled = false;
    this.active = this.room; // fondo 3D vivo detrás del menú
    this.ui.togglePanel(false);
    audio.startMusic();
  }

  startGame() {
    if (!state.flags.introSeen) { this._enterIntro('room'); return; }
    this._enterRoom();
  }

  _enterRoom() {
    this._disposeIntro();
    state.flags.introSeen = true;
    saveNow();
    this.active = this.room;
    this.ui.setScreen('room');
    this.room.enabled = true;
    audio.startMusic();
    this.ui.refreshHud();
  }

  playIntro(fromMenu = true) { this._enterIntro(fromMenu ? 'menu' : 'room'); }

  _enterIntro(after) {
    this._disposeIntro();
    this.ui.setScreen('intro');
    this.intro = new IntroScene();
    this.intro.onFinish = () => {
      state.flags.introSeen = true;
      saveNow();
      this._disposeIntro();
      if (after === 'room') this._enterRoom();
      else this.goMenu();
    };
    this.active = this.intro;
  }

  _disposeIntro() {
    if (this.intro) { this.intro.destroy(); this.intro = null; }
    this.active = this.room;
  }

  setPaused(on) {
    if (this.ui.mgHandle) return; // no pausar dentro de un ejercicio
    this.paused = on;
    this.ui.setPaused(on);
  }

  quit() {
    audio.sfx('close');
    saveNow();
    if (window.overfit) window.overfit.quit();
    else this.ui.toast('Estás en navegador: cerrá la pestaña, crack.');
  }

  // ---------------- input ----------------
  _bind() {
    const ndc = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)];
    };
    const unlocked = { v: false };
    const unlock = () => {
      if (unlocked.v) return;
      unlocked.v = true;
      audio.unlock();
      audio.setVolumes(state.settings.musicVol, state.settings.sfxVol);
      audio.startMusic();
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock);

    window.addEventListener('pointermove', (e) => {
      this.idle = 0;
      if (this.ui.screen !== 'room' || this.ui.panelOpen || this.paused || document.body.classList.contains('in-overlay')) return;
      const [nx, ny] = ndc(e);
      if (state.settings.parallax !== false) this.room.setParallax(nx * 0.5, ny * 0.5);
      const h = this.room.hover(nx, ny);
      if (h) this.ui.tooltip(e.clientX, e.clientY, h.userData.label);
      else this.ui.hideTooltip();
    }, { passive: true });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.ui.screen !== 'room' || this.ui.panelOpen || this.paused) return;
      const [nx, ny] = ndc(e);
      const hit = this.room.click(nx, ny);
      if (!hit) return;
      if (hit.hs === 'pc') this.ui.togglePanel(true);
      else { this.ui.toast(hit.label); audio.sfx('pop'); }
    });

    window.addEventListener('keydown', (e) => {
      this.idle = 0;
      if (e.key === 'Escape') {
        if (this.intro) { this.intro.finish(); return; }
        if (this.ui.closeTop()) return;
        if (this.ui.screen === 'room') this.setPaused(!this.paused);
        else if (this.ui.screen === 'menu') this.ui.openOptions();
      }
    });

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    for (const sc of [this.room, this.intro]) {
      if (sc) { sc.camera.aspect = w / h; sc.camera.updateProjectionMatrix(); }
    }
  }

  // ---------------- bucle principal ----------------
  _loop(nowMs) {
    requestAnimationFrame((t) => this._loop(t));
    const dt = Math.min(0.05, this._last ? (nowMs - this._last) / 1000 : 0.016);
    this._last = nowMs;

    // FPS para el chip del HUD
    this._frames++;
    this._fpsT += dt;
    if (this._fpsT >= 0.6) { this.ui.setFps(Math.round(this._frames / this._fpsT)); this._frames = 0; this._fpsT = 0; }

    if (this.paused) return;
    this.t += dt;

    if (this.active && this.active.update) this.active.update(dt, this.t);

    // flecha que señala la PC hasta el primer entrenamiento
    if (this.ui.screen === 'room' && !this.ui.panelOpen && !state.flags.firstTraining) {
      this.ui.showArrow(this.room.towerScreenPos(window.innerWidth, window.innerHeight));
    } else {
      this.ui.showArrow(null);
    }

    // chistes de idle: si no hacés nada, el tío te interpela
    this.idle += dt;
    if (this.idle > 42 && this.ui.screen === 'room' && !this.ui.panelOpen && !this.ui.mgHandle) {
      this.idle = 0;
      this.ui.toast(this._rng.pick(FLAVOR.idle), 4200);
    }

    if (this.active) this.renderer.render(this.active.scene, this.active.camera);
  }
}

const game = new Game();
window.__overfit = game; // consola de debugging (y huevos de pascua)
game.boot();
