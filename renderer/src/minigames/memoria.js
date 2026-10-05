// Memoria: Simón dice / neuronas que se iluminan en secuencia. El jugador repite la secuencia.
import { Minigame } from './base.js';

export class MemoriaMinigame extends Minigame {
  constructor(container, opts) {
    super(container, opts);
    this.title = '🧠 MEMORIA';
    this.skillLabel = 'Memoria';
    this.timeLimit = opts.difficulty === 'extreme' ? 20 : 30;
    this._seqLength = opts.difficulty === 'extreme' ? 6 : 4;
    this._cells = [];
    this._sequence = [];
    this._playerIdx = 0;
    this._phase = 'show'; // 'show' | 'input'
  }

  getInstructions() { return 'Observa la secuencia de neuronas y repítela.'; }

  _build() {
    const body = this._bodyEl;
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'mg-memory-wrap';

    this._status = document.createElement('div');
    this._status.className = 'mg-memory-status';
    this._status.textContent = 'Observa la secuencia...';
    wrap.appendChild(this._status);

    const grid = document.createElement('div');
    grid.className = 'mg-grid-3x3';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.className = 'mg-cell';
      cell.textContent = '';
      cell.dataset.idx = i;
      cell.addEventListener('click', () => this._onCellClick(i, cell));
      grid.appendChild(cell);
      this._cells.push(cell);
    }
    wrap.appendChild(grid);
    body.appendChild(wrap);

    // Generar secuencia
    for (let i = 0; i < this._seqLength; i++) {
      this._sequence.push(Math.floor(Math.random()*9));
    }

    setTimeout(() => this._playSequence(), 600);
  }

  _flash(idx, duration = 400) {
    return new Promise(resolve => {
      const cell = this._cells[idx];
      cell.classList.add('lit');
      setTimeout(() => {
        cell.classList.remove('lit');
        setTimeout(resolve, 150);
      }, duration);
    });
  }

  async _playSequence() {
    this._phase = 'show';
    this._status.textContent = `Observa... (${this._seqLength} neuronas)`;
    for (const idx of this._sequence) {
      await this._flash(idx, this.difficulty === 'extreme' ? 280 : 420);
    }
    this._phase = 'input';
    this._playerIdx = 0;
    this._status.textContent = '¡Repite la secuencia!';
  }

  _onCellClick(idx, cell) {
    if (this._phase !== 'input') return;
    const expected = this._sequence[this._playerIdx];
    if (idx === expected) {
      cell.classList.add('lit');
      setTimeout(() => cell.classList.remove('lit'), 250);
      this._playerIdx++;
      if (this._playerIdx >= this._sequence.length) {
        this._phase = 'done';
        this._status.textContent = '¡Perfecto!';
        setTimeout(() => this._finish(1.0), 500);
      }
    } else {
      cell.classList.add('wrong');
      setTimeout(() => cell.classList.remove('wrong'), 400);
      this._phase = 'done';
      const perf = this._playerIdx / this._sequence.length * 0.5;
      this._status.textContent = 'Fallaste...';
      setTimeout(() => this._finish(perf), 600);
    }
  }

  _finishTimeout() {
    const perf = this._phase === 'input' ? this._playerIdx / this._sequence.length * 0.6 : 0;
    this._finish(perf);
  }

  async _finish(perf) {
    const ok = perf >= (this.difficulty === 'extreme' ? 0.6 : 0.4);
    await this.showResult(perf, ok);
    this.finish(perf);
  }
}
