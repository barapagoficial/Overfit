// Creatividad: dibuja una figura simple. Se pide al jugador que pinte sobre un canvas
// un objeto y evaluamos cuánto del canvas cubrió con color objetivo (cobertura de píxeles).
// Es simple y "procedural" al cambiar el objetivo cada vez.
import { Minigame } from './base.js';

export class CreatividadMinigame extends Minigame {
  constructor(container, opts) {
    super(container, opts);
    this.title = '🎨 CREATIVIDAD';
    this.skillLabel = 'Creatividad';
    this.timeLimit = opts.difficulty === 'extreme' ? 10 : 18;
    this._canvas = null;
    this._ctx = null;
    this._drawing = false;
    this._color = '#e94560';
    this._paintedPixels = 0;
    this._targetPixels = 0;
    this._target = null;
  }

  getInstructions() {
    return '¡Pinta tan rápido como puedas! Mantén el ratón presionado sobre el lienzo.';
  }

  _getTargets() {
    return [
      { name: 'un sol', color: '#ffd369' },
      { name: 'una nube', color: '#eeeeee' },
      { name: 'un monstruo', color: '#4ef037' },
      { name: 'fuego', color: '#ff5500' },
      { name: 'el mar', color: '#0088cc' },
      { name: 'una manzana', color: '#e94560' },
      { name: 'un pasto', color: '#44aa22' },
      { name: 'un fantasma', color: '#ccccff' }
    ];
  }

  _build() {
    const body = this._bodyEl;
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'mg-creative-wrap';

    const targets = this._getTargets();
    this._target = targets[Math.floor(Math.random() * targets.length)];

    const prompt = document.createElement('div');
    prompt.className = 'mg-creative-target';
    prompt.innerHTML = `Dibuja rápidamente: <strong style="color:${this._target.color}">${this._target.name.toUpperCase()}</strong>`;
    wrap.appendChild(prompt);

    this._canvas = document.createElement('canvas');
    this._canvas.className = 'mg-canvas-paint';
    const size = this.difficulty === 'extreme' ? 280 : 340;
    this._canvas.width = size;
    this._canvas.height = size;
    this._ctx = this._canvas.getContext('2d');
    this._ctx.fillStyle = '#ffffff';
    this._ctx.fillRect(0,0,size,size);
    this._color = this._target.color;
    this._targetPixels = size * size * 0.25; // al menos cubrir 25% para full puntuación
    wrap.appendChild(this._canvas);

    // Paleta (pueden usar otros colores pero el objetivo pide el color)
    const colors = document.createElement('div');
    colors.className = 'mg-colors';
    [this._target.color, '#e94560', '#4ef037', '#ffd369', '#00d4ff', '#7b68ee', '#000000'].forEach(c => {
      const d = document.createElement('div');
      d.className = 'mg-color' + (c === this._color ? ' active' : '');
      d.style.background = c;
      d.addEventListener('click', () => {
        this._color = c;
        colors.querySelectorAll('.mg-color').forEach(el => el.classList.remove('active'));
        d.classList.add('active');
      });
      colors.appendChild(d);
    });
    wrap.appendChild(colors);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-mini';
    clearBtn.textContent = 'Limpiar lienzo';
    clearBtn.addEventListener('click', () => {
      this._ctx.fillStyle = '#fff';
      this._ctx.fillRect(0,0,this._canvas.width,this._canvas.height);
      this._paintedPixels = 0;
    });
    wrap.appendChild(clearBtn);

    body.appendChild(wrap);

    // Eventos de dibujo
    const startDraw = (e) => {
      this._drawing = true;
      this._draw(e);
    };
    const endDraw = () => { this._drawing = false; };
    const move = (e) => { if (this._drawing) this._draw(e); };
    this._canvas.addEventListener('mousedown', startDraw);
    window.addEventListener('mouseup', endDraw);
    this._canvas.addEventListener('mousemove', move);
    // Touch
    this._canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this._drawing = true; this._drawTouch(e); });
    this._canvas.addEventListener('touchend', endDraw);
    this._canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (this._drawing) this._drawTouch(e); });

    this._cleanup = () => {
      this._canvas.removeEventListener('mousedown', startDraw);
      window.removeEventListener('mouseup', endDraw);
      this._canvas.removeEventListener('mousemove', move);
    };
  }

  _getPos(e) {
    const r = this._canvas.getBoundingClientRect();
    const sx = this._canvas.width / r.width;
    const sy = this._canvas.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }
  _drawTouch(e) {
    const t = e.touches[0]; if (!t) return;
    this._draw({ clientX: t.clientX, clientY: t.clientY });
  }
  _draw(e) {
    const { x, y } = this._getPos(e);
    const ctx = this._ctx;
    const radius = this.difficulty === 'extreme' ? 8 : 14;
    ctx.fillStyle = this._color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI*2);
    ctx.fill();
    // Contamos aprox los píxeles pintados (no es pixel-perfect pero sirve)
    this._paintedPixels += Math.PI * radius * radius * 0.6;
  }

  _finishTimeout() {
    const ratio = Math.min(1, this._paintedPixels / this._targetPixels);
    this._resolve(ratio);
  }
  async _resolve(perf) {
    const ok = perf > (this.difficulty === 'extreme' ? 0.35 : 0.25);
    await this.showResult(perf, ok);
    this.finish(perf);
  }
}
