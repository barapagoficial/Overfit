// Sentido común: pregunta de situación cotidiana con 3-4 opciones, solo una correcta (sentido común).
import { Minigame } from './base.js';

const PREGUNTAS = {
  easy: [
    {
      scenario: 'Llueve mucho y vos tenés que salir. ¿Qué hacés?',
      choices: ['Salgo en shorts y ojotas', 'Llevo un paraguas o impermeable', 'Me pongo ropa de abrigo de nieve', 'No salgo nunca'],
      correct: 1
    },
    {
      scenario: 'Se te quemó la comida en la hornalla. ¿Qué hacés primero?',
      choices: ['Le echo nafta', 'Apago el fuego / la hornalla', 'Abro todas las ventanas y espero', 'Llamo al delivery'],
      correct: 1
    },
    {
      scenario: 'Tu teléfono se quedó sin batería y lo necesitás usar.',
      choices: ['Lo dejo al sol para cargarlo', 'Lo conecto al cargador', 'Lo meto al congelador', 'Le grito fuerte'],
      correct: 1
    },
    {
      scenario: 'Tenés hambre pero la heladera está vacía.',
      choices: ['Me como el control remoto', 'Pido comida o voy al supermercado', 'Me duermo a ver si pasa', 'Riego la heladera'],
      correct: 1
    },
    {
      scenario: 'Tu amigo está triste. ¿Qué es lo más lógico?',
      choices: ['Me río de él', 'Le pregunto qué pasa y lo escucho', 'Lo ignoro', 'Le doy una cebolla'],
      correct: 1
    },
    {
      scenario: 'Vas a cruzar la calle. ¿Qué hacés?',
      choices: ['Cruzo corriendo sin mirar', 'Miro a ambos lados y cruzo cuando no vienen autos', 'Cierro los ojos y rezo', 'Espero a que venga un auto para que me lleve'],
      correct: 1
    },
    {
      scenario: 'Tu PC no enciende. ¿Qué revisás primero?',
      choices: ['La sal gruesa de la esquina', 'Si está enchufada y el botón de encendido', 'Si la luna está llena', 'Si le hablás bonito'],
      correct: 1
    },
    {
      scenario: 'Hace mucho frío en la habitación.',
      choices: ['Abro la ventana', 'Me abrigo o prendo la calefacción', 'Me pongo ropa mojada', 'Me como un helado'],
      correct: 1
    }
  ],
  extreme: [
    {
      scenario: 'Estás cocinando y el aceite de la sartén se incendia. ¿Qué hacés?',
      choices: ['Le echo agua (mala idea, el aceite salta)', 'Lo apago con una tapa y corto el gas', 'Le echo más aceite', 'Salgo corriendo y dejo que se queme todo'],
      correct: 1
    },
    {
      scenario: 'Tu amigo te envía un mensaje pidiendo tu contraseña del banco porque "el sistema lo pide".',
      choices: ['Se la mando, es mi amigo', 'Se la mando pero en dos mensajes', 'No se la doy, probablemente le robaron la cuenta', 'Le mando la de Facebook'],
      correct: 2
    },
    {
      scenario: 'Ves un cable pelado en el piso mojado cerca de un enchufe.',
      choices: ['Lo agarro con la mano para moverlo', 'Corto la electricidad desde la llave térmica antes de tocarlo', 'Le pongo una toalla encima', 'Lo piso para ver si chispea'],
      correct: 1
    },
    {
      scenario: 'Te ofrecen una inversión que duplica tu dinero en una semana "garantizado".',
      choices: ['Meto todos mis ahorros', 'Es probable que sea una estafa, investigo antes', 'Le pido al vecino que invierta primero', 'Pido un préstamo para invertir más'],
      correct: 1
    },
    {
      scenario: 'Sentís olor a gas en tu casa.',
      choices: ['Enciendo un fósforo para ver de dónde viene', 'Abro ventanas, no enciendo nada y salgo', 'Prendo la luz para revisar', 'Le echo perfume para tapar el olor'],
      correct: 1
    },
    {
      scenario: 'Un correo dice que ganaste un premio millonario y pide tus datos bancarios.',
      choices: ['¡Genial! Doy mis datos', 'Lo borro/marco como phishing', 'Respondo preguntando cuánto es', 'Le doy los datos de mi primo'],
      correct: 1
    },
    {
      scenario: 'Estás por firmar un contrato pero no entendés una cláusula.',
      choices: ['Firmo igual, total es papel', 'Pido que me la expliquen o consulto a alguien que sepa', 'Firmo y después leo', 'Le pido al vendedor que firme por mí'],
      correct: 1
    },
    {
      scenario: 'Tu laptop empieza a echar humo mientras la usás.',
      choices: ['Le echo agua y sigo', 'La apago, desconecto de la corriente y la llevo a revisar', 'Le pongo una manta encima', 'Sigo usando hasta que explote'],
      correct: 1
    }
  ]
};

export class SentidoComunMinigame extends Minigame {
  constructor(container, opts) {
    super(container, opts);
    this.title = '🤔 SENTIDO COMÚN';
    this.skillLabel = 'Sentido común';
    this.timeLimit = opts.difficulty === 'extreme' ? 18 : 25;
    this._rounds = opts.difficulty === 'extreme' ? 4 : 3;
    this._cur = 0;
    this._correct = 0;
  }

  getInstructions() { return 'Elegí la respuesta más lógica (la que no te haría quedar como un idiota).'; }

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
    wrap.className = 'mg-common-wrap';

    const prog = document.createElement('div');
    prog.className = 'minigame-info';
    prog.textContent = `Situación ${this._cur}/${this._rounds}`;
    wrap.appendChild(prog);

    const pool = PREGUNTAS[this.difficulty];
    const q = pool[Math.floor(Math.random()*pool.length)];

    const scenario = document.createElement('div');
    scenario.className = 'mg-scenario';
    scenario.textContent = q.scenario;
    wrap.appendChild(scenario);

    const choices = document.createElement('div');
    choices.className = 'mg-choices';
    let locked = false;
    q.choices.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.className = 'mg-choice';
      btn.textContent = c;
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        if (idx === q.correct) {
          btn.classList.add('correct');
          this._correct++;
          setTimeout(() => this._nextRound(), 500);
        } else {
          btn.classList.add('wrong');
          Array.from(choices.children)[q.correct].classList.add('correct');
          setTimeout(() => this._nextRound(), 1100);
        }
      });
      choices.appendChild(btn);
    });
    wrap.appendChild(choices);
    body.appendChild(wrap);
  }

  async _finalize(perf) {
    const ok = perf >= (this.difficulty === 'extreme' ? 0.5 : 0.4);
    await this.showResult(perf, ok);
    this.finish(perf);
  }
}
