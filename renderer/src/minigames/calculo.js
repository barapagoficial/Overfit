// Cálculo: resolver una ecuación simple arrastrando piezas (clic en piezas para rellenar huecos).
import { Minigame } from './base.js';

export class CalculoMinigame extends Minigame {
  constructor(container, opts) {
    super(container, opts);
    this.title = '🧮 CÁLCULO';
    this.skillLabel = 'Cálculo';
    this.timeLimit = opts.difficulty === 'extreme' ? 12 : 20;
    this._rounds = opts.difficulty === 'extreme' ? 3 : 2;
    this._currentRound = 0;
    this._correctInRound = 0;
    this._totalInRound = 0;
  }

  getInstructions() {
    return 'Clickea los números en orden para completar la ecuación.';
  }

  async _build() {
    await this._nextRound();
  }

  async _nextRound() {
    if (this._currentRound >= this._rounds) {
      const perf = this._totalInRound > 0 ? this._correctInRound / this._totalInRound : 0;
      await this.showResult(perf, perf >= (this.difficulty === 'extreme' ? 0.5 : 0.3));
      this.finish(perf);
      return;
    }
    this._currentRound++;
    this._buildEquation();
  }

  _buildEquation() {
    const body = this._bodyEl;
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'mg-calc';

    // Generar ecuación
    const diff = this.difficulty;
    let a, b, c, answer, op, opSymbol;
    if (diff === 'easy') {
      // a + b = ? o a - b = ? con pequeños
      a = Math.floor(Math.random()*15) + 2;
      b = Math.floor(Math.random()*a) + 1;
      if (Math.random() < 0.5) {
        answer = a + b; op = '+'; opSymbol = '+';
      } else {
        answer = a; // a = answer + b
        op = '-'; opSymbol = '−';
        a = answer + b;
        answer = a - b;
      }
    } else {
      // Extremo: multiplicación o suma de 3 números con 2 dígitos
      const kind = Math.floor(Math.random()*3);
      if (kind === 0) {
        a = Math.floor(Math.random()*12) + 2;
        b = Math.floor(Math.random()*12) + 2;
        answer = a * b; op = '*'; opSymbol = '×';
      } else if (kind === 1) {
        a = Math.floor(Math.random()*40) + 10;
        b = Math.floor(Math.random()*40) + 10;
        answer = a + b; op = '+'; opSymbol = '+';
      } else {
        a = Math.floor(Math.random()*50) + 30;
        b = Math.floor(Math.random()*25) + 5;
        answer = a - b; op = '-'; opSymbol = '−';
      }
    }

    const answerStr = String(answer);
    const numSlots = answerStr.length;
    this._slotsNeeded = numSlots;
    this._slotsFilled = 0;
    this._currentBuffer = [];

    const eq = document.createElement('div');
    eq.className = 'mg-calc-equation';
    eq.textContent = `${a} ${opSymbol} ${b} = `;
    const slotsDiv = document.createElement('span');
    slotsDiv.className = 'mg-calc-slots-holder';
    slotsDiv.style.display = 'inline-flex';
    slotsDiv.style.gap = '4px';
    slotsDiv.style.verticalAlign = 'middle';
    this._slotsDiv = slotsDiv;
    eq.appendChild(slotsDiv);

    for (let i = 0; i < numSlots; i++) {
      const s = document.createElement('span');
      s.className = 'mg-calc-slot';
      s.textContent = '_';
      slotsDiv.appendChild(s);
    }

    wrap.appendChild(eq);

    // Generar piezas: los dígitos correctos + distractores
    const correctDigits = answerStr.split('');
    const allDigits = [...correctDigits];
    const distractors = diff === 'easy' ? 3 : 5;
    while (allDigits.length < correctDigits.length + distractors) {
      allDigits.push(String(Math.floor(Math.random()*10)));
    }
    // Mezclar
    for (let i = allDigits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [allDigits[i], allDigits[j]] = [allDigits[j], allDigits[i]];
    }

    const piecesDiv = document.createElement('div');
    piecesDiv.className = 'mg-calc-pieces';
    this._piecesDiv = piecesDiv;
    allDigits.forEach((d, idx) => {
      const p = document.createElement('button');
      p.className = 'mg-calc-piece';
      p.textContent = d;
      p.addEventListener('click', () => this._onPieceClick(d, p, correctDigits));
      piecesDiv.appendChild(p);
    });
    wrap.appendChild(piecesDiv);

    // Botón de borrar / comprobar
    const btnRow = document.createElement('div');
    btnRow.className = 'minigame-btn-row';
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn-mini';
    clearBtn.textContent = 'Borrar';
    clearBtn.addEventListener('click', () => this._clearSlots(correctDigits));
    const checkBtn = document.createElement('button');
    checkBtn.className = 'btn-mini';
    checkBtn.textContent = 'Comprobar';
    checkBtn.addEventListener('click', () => this._checkAnswer(answer));
    btnRow.appendChild(clearBtn);
    btnRow.appendChild(checkBtn);
    wrap.appendChild(btnRow);

    body.appendChild(wrap);
  }

  _onPieceClick(digit, btn, correctDigits) {
    if (btn.classList.contains('used')) return;
    if (this._slotsFilled >= this._slotsNeeded) return;
    btn.classList.add('used');
    this._currentBuffer.push(digit);
    const slot = this._slotsDiv.children[this._slotsFilled];
    slot.textContent = digit;
    slot.classList.add('filled');
    this._slotsFilled++;
  }

  _clearSlots() {
    this._currentBuffer = [];
    this._slotsFilled = 0;
    Array.from(this._slotsDiv.children).forEach(s => {
      s.textContent = '_';
      s.classList.remove('filled');
    });
    Array.from(this._piecesDiv.children).forEach(p => p.classList.remove('used'));
  }

  _checkAnswer(answer) {
    if (this._slotsFilled < this._slotsNeeded) return;
    const val = parseInt(this._currentBuffer.join(''), 10);
    this._totalInRound++;
    if (val === answer) {
      this._correctInRound++;
      // Breve feedback
      Array.from(this._slotsDiv.children).forEach(s => s.style.color = '#4ef037');
      setTimeout(() => this._nextRound(), 400);
    } else {
      Array.from(this._slotsDiv.children).forEach(s => s.style.color = '#e94560');
      setTimeout(() => {
        this._clearSlots();
        Array.from(this._slotsDiv.children).forEach(s => s.style.color = '');
      }, 500);
    }
  }
}
