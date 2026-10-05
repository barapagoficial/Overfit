// Entrenamiento general: barra que se mueve, clic cuando está en la zona verde.
// Varias rondas, da pocos puntos a todas las skills.
import { Minigame } from './base.js';

export class GeneralMinigame extends Minigame {
  constructor(container, opts) {
    super(container, opts);
    this.title = '⚡ ENTRENAMIENTO GENERAL';
    this.skillLabel = 'Todas las áreas';
    this.timeLimit = opts.difficulty === 'extreme' ? 8 : 12;
    this._rounds = opts.difficulty === 'extreme' ? 5 : 3;
    this._cur = 0;
    this._hits = 0;
    this._pos = 0;
    this._speed = 0;
    this._zoneStart = 0;
    this._zoneWidth = 0;
    this._dir = 1;
    this._running = false;
    this._canvas = null;
    this._ctx = null;
  }

  getInstructions() { return 'Pulsa ESPACIO o clic cuando la barra esté en la zona VERDE.'; }

  async _build() {
    const body = this._bodyEl;
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '1rem';
    wrap.style.width = '100%';

    this._status = document.createElement('div');
    this._status.className = 'minigame-info';
    this._status.textContent = `Clic 0/${this._rounds} — ¡Cuidado!`;
    wrap.appendChild(this._status);

    this._canvas = document.createElement('canvas');
    this._canvas.width = 500;
    this._canvas.height = 100;
    this._canvas.style.background = '#0a0a1a';
    this._canvas.style.border = '2px solid #444';
    this._canvas.style.borderRadius = '6px';
    this._ctx = this._canvas.getContext('2d');
    wrap.appendChild(this._canvas);

    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.textContent = '¡TAP! (espacio/clic)';
    const tap = () => this._tap();
    btn.addEventListener('click', tap);
    this._keyHandler = (e) => { if (e.code === 'Space') { e.preventDefault(); tap(); } };
    window.addEventListener('keydown', this._keyHandler);
    wrap.appendChild(btn);

    body.appendChild(wrap);
    this._startRound();
  }

  _startRound() {
    if (this._cur >= this._rounds) {
      this._running = false;
      this._finalize();
      return;
    }
    this._cur++;
    const extreme = this.difficulty === 'extreme';
    this._zoneWidth = extreme ? 0.08 : 0.18;
    this._zoneStart = 0.15 + Math.random() * (0.85 - this._zoneWidth - 0.15);
    this._speed = (extreme ? 1.3 : 0.7) + Math.random()*0.3;
    this._pos = 0;
    this._dir = 1;
    this._running = true;
    this._status.textContent = `Clic ${this._cur}/${this._rounds}`;
  }

  _update(dt) {
    if (!this._running) return;
    this._pos += this._speed * dt * this._dir;
    if (this._pos > 1) { this._pos = 1; this._dir = -1; }
    if (this._pos < 0) { this._pos = 0; this._dir = 1; }
    this._draw();
  }

  _draw() {
    const ctx = this._ctx;
    const w = this._canvas.width, h = this._canvas.height;
    ctx.clearRect(0,0,w,h);
    // Zona verde
    ctx.fillStyle = '#e94560';
    ctx.fillRect(20, 30, w-40, 40);
    ctx.fillStyle = '#4ef037';
    ctx.fillRect(20 + this._zoneStart*(w-40), 30, this._zoneWidth*(w-40), 40);
    // Indicador
    ctx.fillStyle = '#ffd369';
    const px = 20 + this._pos*(w-40);
    ctx.fillRect(px-4, 20, 8, 60);
  }

  _tap() {
    if (!this._running) return;
    const inZone = this._pos >= this._zoneStart && this._pos <= this._zoneStart + this._zoneWidth;
    if (inZone) {
      this._hits++;
      // flash
      this._canvas.style.boxShadow = '0 0 20px #4ef037';
      setTimeout(() => this._canvas.style.boxShadow = '', 150);
    } else {
      this._canvas.style.boxShadow = '0 0 20px #e94560';
      setTimeout(() => this._canvas.style.boxShadow = '', 150);
    }
    this._running = false;
    setTimeout(() => this._startRound(), 400);
  }

  _cleanup() {
    super._cleanup();
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
  }

  _finishTimeout() {
    this._running = false;
    this._finalize();
  }

  async _finalize() {
    const perf = this._hits / this._rounds;
    const ok = perf >= (this.difficulty === 'extreme' ? 0.4 : 0.3);
    await this.showResult(perf, ok);
    this.finish(perf);
  }
}
