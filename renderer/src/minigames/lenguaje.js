// Lenguaje: identificar sinónimos / categorías / intrusos.
import { Minigame } from './base.js';

const DATA = {
  easy: [
    { prompt: '¿Cuál es el intruso? (no pertenece al grupo)', words: ['perro','gato','vaca','martillo','conejo'], answer: 'martillo' },
    { prompt: 'Selecciona el sinónimo de "feliz"', words: ['alegre','triste','rápido','azul','lento'], answer: 'alegre' },
    { prompt: '¿Cuál es un color?', words: ['correr','rojo','comer','silla','libro'], answer: 'rojo' },
    { prompt: 'Selecciona la fruta', words: ['mesa','coche','manzana','lápiz','camisa'], answer: 'manzana' },
    { prompt: '¿Qué palabra es un verbo?', words: ['casa','correr','sol','piedra','luna'], answer: 'correr' },
    { prompt: 'Selecciona el antónimo de "caliente"', words: ['tibio','frío','húmedo','seco','ardiente'], answer: 'frío' },
    { prompt: 'El intruso entre países:', words: ['México','Argentina','Madrid','Chile','Perú'], answer: 'Madrid' },
    { prompt: '¿Cuál es un animal?', words: ['silla','león','roca','nube','lápiz'], answer: 'león' }
  ],
  extreme: [
    { prompt: 'Selecciona el intruso (cuidado)', words: ['lluvia','nieve','granizo','viento','océano','trueno'], answer: 'océano' },
    { prompt: '¿Cuál NO es un lenguaje de programación?', words: ['Python','Java','HTML','Rust','Go','Cobra'], answer: 'Cobra' },
    { prompt: 'Sinónimo de "efímero"', words: ['eterno','breve','denso','brillante','torpe','lejano'], answer: 'breve' },
    { prompt: 'Antónimo de "sagaz"', words: ['astuto','listo','torpe','veloz','hábil','perspicaz'], answer: 'torpe' },
    { prompt: 'Intruso en deportes:', words: ['fútbol','tenis','natación','ajedrez','pintura','boxeo'], answer: 'pintura' },
    { prompt: '¿Cuál palabra no es un tipo de pasta?', words: ['spaghetti','ravioli','fettuccine','lasagna','tortilla','macaroni'], answer: 'tortilla' },
    { prompt: 'Selecciona el hipónimo de "mueble"', words: ['nube','silla','río','pájaro','nieve','coche'], answer: 'silla' },
    { prompt: '¿Cuál NO es un metal?', words: ['hierro','cobre','plata','madera','oro','zinc'], answer: 'madera' }
  ]
};

export class LenguajeMinigame extends Minigame {
  constructor(container, opts) {
    super(container, opts);
    this.title = '💬 LENGUAJE';
    this.skillLabel = 'Lenguaje';
    this.timeLimit = opts.difficulty === 'extreme' ? 12 : 18;
    this._rounds = opts.difficulty === 'extreme' ? 5 : 3;
    this._cur = 0;
    this._correct = 0;
    this._locked = false;
  }

  getInstructions() { return 'Lee con cuidado y elige la palabra correcta.'; }

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
    wrap.className = 'mg-lang-wrap';

    const prog = document.createElement('div');
    prog.className = 'minigame-info';
    prog.textContent = `Ronda ${this._cur}/${this._rounds}`;
    wrap.appendChild(prog);

    const pool = DATA[this.difficulty];
    const q = pool[Math.floor(Math.random()*pool.length)];
    this._currentQ = q;

    const prompt = document.createElement('div');
    prompt.className = 'mg-prompt';
    prompt.textContent = q.prompt;
    wrap.appendChild(prompt);

    const cloud = document.createElement('div');
    cloud.className = 'mg-word-cloud';
    this._locked = false;
    q.words.forEach(w => {
      const chip = document.createElement('button');
      chip.className = 'mg-word-chip';
      chip.textContent = w;
      chip.addEventListener('click', () => {
        if (this._locked) return;
        this._locked = true;
        if (w === q.answer) {
          chip.classList.add('correct');
          this._correct++;
          setTimeout(() => this._nextRound(), 500);
        } else {
          chip.classList.add('wrong');
          Array.from(cloud.children).forEach(c => {
            if (c.textContent === q.answer) c.classList.add('correct');
          });
          setTimeout(() => this._nextRound(), 1000);
        }
      });
      cloud.appendChild(chip);
    });
    wrap.appendChild(cloud);

    body.appendChild(wrap);
  }

  async _finalize(perf) {
    const ok = perf >= (this.difficulty === 'extreme' ? 0.5 : 0.4);
    await this.showResult(perf, ok);
    this.finish(perf);
  }
}
