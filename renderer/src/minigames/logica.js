// Lógica: completar secuencia numérica / de patrones.
import { Minigame } from './base.js';

export class LogicaMinigame extends Minigame {
  constructor(container, opts) {
    super(container, opts);
    this.title = '🧩 LÓGICA';
    this.skillLabel = 'Lógica';
    this.timeLimit = opts.difficulty === 'extreme' ? 12 : 20;
    this._rounds = opts.difficulty === 'extreme' ? 4 : 3;
    this._cur = 0;
    this._correct = 0;
  }

  getInstructions() { return '¿Qué número sigue en la secuencia?'; }

  _build() { this._nextRound(); }

  _genSequence() {
    const isExtreme = this.difficulty === 'extreme';
    const types = isExtreme ? ['arith','geom','fib','square'] : ['arith','geom'];
    const type = types[Math.floor(Math.random()*types.length)];
    let seq = [], answer;
    if (type === 'arith') {
      const start = Math.floor(Math.random()*(isExtreme?20:10))+1;
      const step = Math.floor(Math.random()*(isExtreme?9:5))+1;
      for (let i=0;i<4;i++) seq.push(start + step*i);
      answer = start + step*4;
    } else if (type === 'geom') {
      const start = Math.floor(Math.random()*3)+1;
      const ratio = Math.floor(Math.random()*2)+2; // 2 o 3
      for (let i=0;i<4;i++) seq.push(start * Math.pow(ratio,i));
      answer = start * Math.pow(ratio,4);
    } else if (type === 'fib') {
      let a = Math.floor(Math.random()*3)+1, b = Math.floor(Math.random()*3)+1;
      seq.push(a, b);
      for (let i=0;i<2;i++) { const c = a+b; seq.push(c); a=b; b=c; }
      answer = a + b;
    } else { // square
      const start = Math.floor(Math.random()*5)+1;
      for (let i=0;i<4;i++) seq.push(Math.pow(start+i, 2));
      answer = Math.pow(start+4, 2);
    }
    return { seq, answer };
  }

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
    wrap.className = 'mg-logic-wrap';

    const progress = document.createElement('div');
    progress.className = 'minigame-info';
    progress.textContent = `Ronda ${this._cur}/${this._rounds}`;
    wrap.appendChild(progress);

    const { seq, answer } = this._genSequence();
    this._answer = answer;

    const seqDiv = document.createElement('div');
    seqDiv.className = 'mg-logic-seq';
    seq.forEach(n => {
      const el = document.createElement('div');
      el.className = 'mg-logic-item';
      el.textContent = n;
      seqDiv.appendChild(el);
    });
    const q = document.createElement('div');
    q.className = 'mg-logic-item mg-logic-q';
    q.textContent = '?';
    seqDiv.appendChild(q);
    wrap.appendChild(seqDiv);

    // Opciones
    const optsDiv = document.createElement('div');
    optsDiv.className = 'mg-logic-options';
    const options = new Set([answer]);
    while (options.size < 4) {
      const delta = Math.floor(Math.random()*9) - 4;
      const fake = Math.max(0, answer + delta + (Math.random()<0.3 ? Math.floor(Math.random()*20)-10 : 0));
      if (fake !== answer) options.add(fake);
    }
    const arr = Array.from(options);
    for (let i = arr.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    this._locked = false;
    arr.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'mg-logic-opt';
      b.textContent = opt;
      b.addEventListener('click', () => {
        if (this._locked) return;
        this._locked = true;
        if (opt === answer) {
          b.style.background = '#4ef037';
          b.style.color = '#000';
          this._correct++;
          setTimeout(() => this._nextRound(), 450);
        } else {
          b.style.background = '#e94560';
          // Mostrar correcta
          Array.from(optsDiv.children).forEach(c => {
            if (parseInt(c.textContent,10) === answer) {
              c.style.background = '#4ef037';
              c.style.color = '#000';
            }
          });
          setTimeout(() => this._nextRound(), 900);
        }
      });
      optsDiv.appendChild(b);
    });
    wrap.appendChild(optsDiv);
    body.appendChild(wrap);
  }

  async _finalize(perf) {
    const ok = perf >= (this.difficulty === 'extreme' ? 0.5 : 0.4);
    await this.showResult(perf, ok);
    this.finish(perf);
  }
}
