// Clase base para minijuegos. Provee timer, start/end, callbacks.
// Cada minijuego implementa _build(), _update(dt), _cleanup() y opcionalmente _onAction().

export class Minigame {
  constructor(container, opts = {}) {
    this.container = container;
    this.difficulty = opts.difficulty || 'easy'; // 'easy' | 'extreme'
    this.skillId = opts.skillId || 'general';
    this.timeLimit = opts.timeLimit || 15;
    this.onComplete = opts.onComplete; // callback(performance 0..1, reason)
    this._elapsed = 0;
    this._running = false;
    this._rafId = null;
    this._lastTime = 0;

    this.dom = null;
    this._timerEl = null;
    this._bodyEl = null;
  }

  async start() {
    this._buildShell();
    await this._build();
    this._running = true;
    this._lastTime = performance.now();
    this._loop();
  }

  _buildShell() {
    this.dom = document.createElement('div');
    this.dom.className = 'minigame-inner';
    this.dom.innerHTML = `
      <div class="minigame-header">
        <div class="minigame-title">${this.title || 'Entrenamiento'}</div>
        <div class="minigame-info">${this.getSubtitle()}</div>
        <div class="minigame-timer">${this.timeLimit.toFixed(1)}s</div>
      </div>
      <div class="minigame-body"></div>
      <div class="minigame-footer">${this.getInstructions()}</div>
    `;
    this.container.appendChild(this.dom);
    this._timerEl = this.dom.querySelector('.minigame-timer');
    this._bodyEl = this.dom.querySelector('.minigame-body');
  }

  getSubtitle() { return `${this.skillLabel || ''} — ${this.difficulty === 'extreme' ? 'MODO EXTREMO' : 'Fácil'}`; }
  getInstructions() { return '¡Rápido!'; }

  _loop = () => {
    if (!this._running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._lastTime) / 1000);
    this._lastTime = now;
    this._elapsed += dt;
    const remaining = Math.max(0, this.timeLimit - this._elapsed);
    this._timerEl.textContent = remaining.toFixed(1) + 's';
    if (remaining < 5) this._timerEl.style.color = '#e94560';

    this._update(dt);

    if (this._elapsed >= this.timeLimit) {
      this._finishTimeout();
      return;
    }
    this._rafId = requestAnimationFrame(this._loop);
  };

  finish(performance, reason = 'done') {
    if (!this._running) return;
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._cleanup();
    if (this.onComplete) this.onComplete(Math.max(0, Math.min(1, performance)), reason);
  }

  _finishTimeout() {
    this.finish(0, 'timeout');
  }

  showResult(performance, success) {
    this._bodyEl.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'mg-result';
    const pct = Math.round(performance * 100);
    div.innerHTML = `
      <div class="mg-result-text">${success ? '¡Bien hecho!' : 'La IA no aprendió nada...'}</div>
      <div class="mg-result-score ${success ? 'good' : 'bad'}">${pct}%</div>
      <div class="mg-result-text">${this.getResultMessage(performance, success)}</div>
      <button class="btn-primary" id="mg-continue">Continuar</button>
    `;
    this._bodyEl.appendChild(div);
    this._timerEl.textContent = '—';
    return new Promise(resolve => {
      div.querySelector('#mg-continue').addEventListener('click', () => resolve());
    });
  }

  getResultMessage(perf, success) {
    if (!success) return 'La GTX 1050 se queja. Pero al menos lo intentaste.';
    if (perf >= 0.9) return '¡Rendimiento casi perfecto! Tu IA está un poquito menos tonta.';
    if (perf >= 0.6) return 'Resultado decente. Los AI Points fluyen, aunque sea a cuentagotas.';
    return 'No fue brillante, pero todo suma. Eventualmente.';
  }

  _build() { /* override */ }
  _update(dt) { /* override */ }
  _cleanup() {
    if (this.dom && this.dom.parentNode) this.dom.parentNode.removeChild(this.dom);
  }
}
