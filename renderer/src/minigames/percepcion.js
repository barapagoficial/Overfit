// Percepción visual: encontrar la celda diferente en una grilla (color, forma, tamaño).
import { Minigame } from './base.js';

const SHAPES = ['●','■','▲','◆','★','♥','♦','♣','♠'];

export class PercepcionMinigame extends Minigame {
  constructor(container, opts) {
    super(container, opts);
    this.title = '👁️ PERCEPCIÓN VISUAL';
    this.skillLabel = 'Percepción visual';
    this.timeLimit = opts.difficulty === 'extreme' ? 15 : 25;
    this._rounds = opts.difficulty === 'extreme' ? 4 : 3;
    this._cur = 0;
    this._correct = 0;
  }

  getInstructions() { return 'Encuentra el elemento diferente, ¡rápido!'; }

  _build() { this._nextRound(); }

  _nextRound() {
    if (this._cur >= this._rounds) {
      const perf = this._correct / this._rounds;
      this._finalize(perf);
      return;
    }
    this._cur++;
    const body = this._bodyEl;
    body.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '0.75rem';

    const prog = document.createElement('div');
    prog.className = 'minigame-info';
    prog.textContent = `Ronda ${this._cur}/${this._rounds} — ¿Cuál es diferente?`;
    wrap.appendChild(prog);

    // Tamaño de grilla: aumenta con la dificultad
    const isExtreme = this.difficulty === 'extreme';
    const size = isExtreme ? 5 : 4;
    const cellSize = isExtreme ? 55 : 65;
    const diff = isExtreme ? 25 : 45; // diferencia de tono (menor = más difícil)

    const grid = document.createElement('div');
    grid.className = 'mg-perception-grid';
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    // Color base
    const hue = Math.floor(Math.random()*360);
    const sat = 60 + Math.floor(Math.random()*20);
    const lig = 45 + Math.floor(Math.random()*15);
    const baseColor = `hsl(${hue},${sat}%,${lig}%)`;
    // Color diferente (desviación sutil)
    const diffLig = lig + (Math.random()<0.5 ? -diff : diff);
    const diffColor = `hsl(${hue},${sat}%,${diffLig}%)`;

    const shape = SHAPES[Math.floor(Math.random()*SHAPES.length)];
    const diffIdx = Math.floor(Math.random()*size*size);

    for (let i = 0; i < size*size; i++) {
      const cell = document.createElement('button');
      cell.className = 'mg-perception-cell';
      cell.style.width = cellSize + 'px';
      cell.style.height = cellSize + 'px';
      cell.style.background = i === diffIdx ? diffColor : baseColor;
      cell.style.color = i === diffIdx ? diffColor : baseColor; // el símbolo se camufla del color de fondo
      cell.textContent = shape;
      cell.addEventListener('click', () => {
        if (this._locked) return;
        this._locked = true;
        if (i === diffIdx) {
          cell.style.borderColor = '#4ef037';
          cell.style.boxShadow = '0 0 15px #4ef037';
          this._correct++;
          setTimeout(() => this._nextRound(), 350);
        } else {
          cell.style.borderColor = '#e94560';
          // Revelar
          Array.from(grid.children)[diffIdx].style.borderColor = '#4ef037';
          Array.from(grid.children)[diffIdx].style.boxShadow = '0 0 15px #4ef037';
          setTimeout(() => this._nextRound(), 800);
        }
      });
      grid.appendChild(cell);
    }
    this._locked = false;

    wrap.appendChild(grid);
    body.appendChild(wrap);
  }

  async _finalize(perf) {
    const ok = perf >= (this.difficulty === 'extreme' ? 0.5 : 0.4);
    await this.showResult(perf, ok);
    this.finish(perf);
  }
}
