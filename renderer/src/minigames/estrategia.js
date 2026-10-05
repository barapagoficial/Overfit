// Estrategia: laberinto rápido. El jugador debe trazar el camino desde START hasta END
// haciendo clic en casillas adyacentes, en un número de pasos cercano al mínimo,
// evitando muros.
import { Minigame } from './base.js';

export class EstrategiaMinigame extends Minigame {
  constructor(container, opts) {
    super(container, opts);
    this.title = '♟️ ESTRATEGIA';
    this.skillLabel = 'Estrategia';
    this.timeLimit = opts.difficulty === 'extreme' ? 12 : 22;
    this._size = opts.difficulty === 'extreme' ? 6 : 5;
    this._grid = [];
    this._start = {x:0,y:0};
    this._end = {x:0,y:0};
    this._path = []; // camino actual del jugador
    this._minSteps = 0;
    this._stepLimit = 0;
  }

  getInstructions() { return 'Traza el camino desde 🟢 hasta 🔴 haciendo clic en casillas adyacentes. ¡Pocos pasos!'; }

  _build() {
    this._genMaze();
    this._render();
  }

  _genMaze() {
    const N = this._size;
    // Crear grilla vacía
    this._grid = Array.from({length:N}, () => Array(N).fill(0));
    // Muros aleatorios
    const wallDensity = this.difficulty === 'extreme' ? 0.25 : 0.2;
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      if ((x===0 && y===0) || (x===N-1 && y===N-1)) continue;
      if (Math.random() < wallDensity) this._grid[y][x] = 1;
    }
    this._start = {x:0,y:0};
    this._end = {x:N-1,y:N-1};
    this._grid[0][0] = 0;
    this._grid[N-1][N-1] = 0;
    // BFS para saber si hay camino y obtener pasos mínimos
    const dist = this._bfs(this._start, this._end);
    if (dist[this._end.y][this._end.x] == null) {
      // Sin camino: volvemos a generar (eliminar algunos muros)
      for (let i=0;i<N*N;i++) {
        const rx = Math.floor(Math.random()*N), ry = Math.floor(Math.random()*N);
        this._grid[ry][rx] = 0;
        const d = this._bfs(this._start, this._end);
        if (d[this._end.y][this._end.x] != null) break;
      }
    }
    const d2 = this._bfs(this._start, this._end);
    this._minSteps = d2[this._end.y][this._end.x];
    this._stepLimit = Math.round(this._minSteps * 1.5) + 2;
    this._path = [{...this._start}];
  }

  _bfs(start, end) {
    const N = this._size;
    const dist = Array.from({length:N}, () => Array(N).fill(null));
    const prev = Array.from({length:N}, () => Array(N).fill(null));
    const q = [start];
    dist[start.y][start.x] = 0;
    while (q.length) {
      const cur = q.shift();
      if (cur.x === end.x && cur.y === end.y) break;
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dx,dy] of dirs) {
        const nx = cur.x+dx, ny = cur.y+dy;
        if (nx<0||ny<0||nx>=N||ny>=N) continue;
        if (this._grid[ny][nx] === 1) continue; // muro
        if (dist[ny][nx] != null) continue;
        dist[ny][nx] = dist[cur.y][cur.x] + 1;
        prev[ny][nx] = cur;
        q.push({x:nx,y:ny});
      }
    }
    return dist;
  }

  _render() {
    const body = this._bodyEl;
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'mg-strategy-wrap';

    const info = document.createElement('div');
    info.className = 'minigame-info';
    info.innerHTML = `Pasos: <span id="steps-count">0</span>/<b>${this._stepLimit}</b> &nbsp; · &nbsp; Mínimo posible: ${this._minSteps}`;
    wrap.appendChild(info);
    this._stepsCount = info.querySelector('#steps-count');

    const maze = document.createElement('div');
    maze.className = 'mg-strategy-maze';
    maze.style.gridTemplateColumns = `repeat(${this._size}, 40px)`;
    this._mazeEl = maze;
    this._drawMaze();
    wrap.appendChild(maze);

    const btnRow = document.createElement('div');
    btnRow.className = 'minigame-btn-row';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-mini';
    resetBtn.textContent = 'Reiniciar camino';
    resetBtn.addEventListener('click', () => {
      this._path = [{...this._start}];
      this._drawMaze();
    });
    btnRow.appendChild(resetBtn);
    wrap.appendChild(btnRow);

    body.appendChild(wrap);
  }

  _drawMaze() {
    const N = this._size;
    this._mazeEl.innerHTML = '';
    const inPath = (x,y) => this._path.some(p => p.x===x && p.y===y);
    const last = this._path[this._path.length-1];
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const cell = document.createElement('div');
      cell.className = 'mg-strat-cell';
      if (this._grid[y][x] === 1) {
        cell.classList.add('wall');
        cell.textContent = '';
      } else if (x===this._start.x && y===this._start.y) {
        cell.classList.add('start');
        cell.textContent = '🟢';
      } else if (x===this._end.x && y===this._end.y) {
        cell.classList.add('end');
        cell.textContent = '🔴';
      } else {
        cell.classList.add('floor');
      }
      if (inPath(x,y) && !(x===this._start.x && y===this._start.y) && !(x===this._end.x && y===this._end.y)) {
        cell.classList.add('path');
      }
      if (last.x===x && last.y===y) cell.classList.add('player');

      // Click para mover
      if (this._grid[y][x] === 0) {
        cell.addEventListener('click', () => this._onCellClick(x,y));
      }
      this._mazeEl.appendChild(cell);
    }
    this._stepsCount.textContent = this._path.length - 1;
  }

  _onCellClick(x,y) {
    const last = this._path[this._path.length-1];
    // Si ya es la última casilla del camino, no hacemos nada
    if (last.x === x && last.y === y) return;
    // Si es una casilla anterior al último, retrocedemos
    if (this._path.length >= 2) {
      const prev = this._path[this._path.length-2];
      if (prev.x === x && prev.y === y) {
        this._path.pop();
        this._drawMaze();
        return;
      }
    }
    // Debe ser adyacente
    const dx = Math.abs(x-last.x), dy = Math.abs(y-last.y);
    if (dx + dy !== 1) return;
    // No se puede visitar dos veces
    if (this._path.some(p => p.x===x && p.y===y)) return;
    this._path.push({x,y});
    this._drawMaze();
    // ¿Llegó al final?
    if (x === this._end.x && y === this._end.y) {
      const steps = this._path.length - 1;
      let perf;
      if (steps <= this._minSteps + 1) perf = 1;
      else if (steps <= this._stepLimit) perf = 1 - (steps - this._minSteps) / (this._stepLimit - this._minSteps + 1) * 0.5;
      else perf = 0.3;
      this._finalize(Math.max(0.1, perf));
    } else if (this._path.length - 1 >= this._stepLimit) {
      // Se pasó de pasos
      this._finalize(0.2);
    }
  }

  _finishTimeout() {
    this._finalize(0);
  }

  async _finalize(perf) {
    const ok = perf >= (this.difficulty === 'extreme' ? 0.5 : 0.35);
    await this.showResult(perf, ok);
    this.finish(perf);
  }
}
