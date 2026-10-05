/**
 * Sentido común → "¿Qué está mal acá?": una escena con objetos normales + UN
 * intruso absurdamente fuera de lugar. Fácil: 1 escena, 4 opciones, sin reloj.
 * Extremo: 3 escenas seguidas, 5 opciones (los distractores también son medio
 * raros) y 12s por escena.
 */
import { flash, roundTimer, roundBar } from './_harness.js';

/** Pools procedurales: contexto + normales + absurdos (2 niveles de sutileza). */
const SCENES = [
  { icon: '🍖', where: 'En el ASADO del domingo', ok: ['carbón', 'carne', 'sal gruesa', 'fuego', 'chimichurri'], silly: [['un ventilador para enfriar el carbón', 1], ['una toalla mojada sobre el asador', 2], ['el control remoto del horno', 0], ['flores de plástico para perfumar el humo', 2]] },
  { icon: '🎒', where: 'En la MOCHILA para la escuela', ok: ['cuadernos', 'goma', 'birome', 'lonchera', 'tarea (mentira)'], silly: [['un ladrillo "por si acaso"', 1], ['un acuario portátil', 2], ['la cama entera', 2], ['otro estuche adentro del estuche', 0]] },
  { icon: '💻', where: 'En el SETUP GAMER', ok: ['teclado mecánico', 'mouse con luces', 'auriculares', 'silla gamer', 'gaseosa tibia'], silly: [['una tostadora como "segunda GPU"', 1], ['el monitor mirando a la pared', 2], ['velas de cumpleaños para el RGB', 2], ['un disipador de arroz frito', 0]] },
  { icon: '🏥', where: 'En la SALA DE ESPERA', ok: ['revistas viejas', 'sillas incómodas', 'turnos', 'silencio', 'un reloj que no anda'], silly: [['una pileta de pelotas para adultos', 2], ['el dentista escondido jugando al celular', 1], ['una chango con la tele prendida', 2], ['el turnero cantando cumbia', 0]] },
  { icon: '🎂', where: 'En el CUMPLE del primo', ok: ['torta', 'globos', 'sorpresa', 'un regalo enviado mal', 'música de los 2000'], silly: [['la piñata colgada del ventilador de techo', 1], ['20 velas para apagar la pirotecnia', 2], ['el cumpleañero como decoración', 0], ['un karaoke para el discurso del tío', 1]] },
  { icon: '⚽', where: 'En la CANCHA del barrio', ok: ['11 jugadores', 'un arco mal pintado', 'la pelota desinflada', 'hinchas en remera', 'el perro del partido'], silly: [['el VAR: un señor con cinta de embalar', 1], ['el arquero con silla de escritorio', 2], ['árbitro con traje de buzo', 1], ['la línea de cal con regla y lápiz', 0]] },
  { icon: '🛏️', where: 'En el CUARTO a las 3AM', ok: ['techo', 'ruido de heladera', 'celular a 100% (y vos a 4%)', 'calcetines sin par', 'planes de vida'], silly: [['la cama armada "por si viene visita"', 1], ['aspiradora para el silencio', 2], ['el oso de peluche haciendo la guardia', 0], ['linterna para ver mejor la oscuridad', 2]] },
  { icon: '🚌', where: 'En el MICRO de media distancia', ok: ['ventanilla corrida', 'manta sospechosa', 'DVD con 1 sola película', 'el que habla fuerte por teléfono', 'panchos a mitad de ruta'], silly: [['asientos en versión escalera de mano', 2], ['el chofer que pide que empujen en cada loma', 1], ['ventanillas extra de burbujas', 1], ['la azafata es el perro', 2]] },
  { icon: '🌾', where: 'En el CAMPO del tío', ok: ['vacas mirando al infinito', 'tractor con parches', 'mate amargo', 'perro que mandonea', 'alambrado con fe'], silly: [['los espantapájaros con auriculares', 1], ['el silo lleno de gomitas', 2], ['el tractor cargando a los caballos', 0], ['sensores de humedad: el tío escupiendo al viento', 2]] },
  { icon: '🏦', where: 'En el BANCO un lunes', ok: ['número 47 que no llega nunca', 'sillas de plástico', 'el que se queja de todo', 'café malo gratis', 'reloj lento a propósito'], silly: [['la cola rápida para 1 solo trámite, con 60 personas', 1], ['cajero automático con cortinita y todo', 2], ['gerente de la felicidad en la fila', 0], ['los guardias jugando a la mancha', 1]] }
];

export default {
  id: 'sentido',
  name: '¿Qué está mal acá?',
  hint: 'Uno de estos NO pertenece a la escena. Encontrá lo ilógico. La IA aún no lo entiende; vos sí.',
  timeLimit: { facil: 0, extremo: 0 },

  start(ctx) {
    const { root, hard, rng, finish } = ctx;
    const total = hard ? 3 : 1;
    const picked = rng.shuffle(SCENES).slice(0, total);
    let round = 0, solved = 0;

    const bar = roundBar(root);
    const stage = document.createElement('div');
    stage.className = 'sc-stage';
    root.appendChild(stage);
    let stop = null;

    const render = () => {
      const sc = picked[round];
      // fácil: 3 normales + 1 absurdo obvio. extremo: 4 normales + 1 absurdo sutil (o 2 absurdos y vale el más sutil)
      const normals = rng.shuffle(sc.ok).slice(0, hard ? 4 : 3);
      let sillys = rng.shuffle(sc.silly);
      if (hard) sillys = sillys.filter(([, tier]) => tier >= 1).slice(0, 1).concat(sillys[0][1] >= 1 ? [] : [sillys[0]]);
      const [wrongText] = sillys[0];
      const decoys = hard ? [...normals, ...sillys.slice(1, 1).map((s) => s[0])].slice(0, 4) : normals;
      const opts = rng.shuffle([...decoys, wrongText]);

      bar.set(`Escena <b>${round + 1}/${total}</b> · detectadas <b>${solved}</b>`);
      stage.innerHTML = `<div class="sc-head">${sc.icon} ${sc.where}</div><div class="sc-opts"></div>`;
      const optsWrap = stage.querySelector('.sc-opts');
      for (const o of opts) {
        const b = document.createElement('button');
        b.className = 'sc-opt';
        b.textContent = o;
        b.onclick = () => {
          stop && stop();
          const ok = o === wrongText;
          flash(b, ok);
          if (ok) { solved++; ctx.after(430, advance); }
          else {
            // mostrar cuál era: aprendizaje forzado
            [...optsWrap.children].forEach((x) => { if (x.textContent === wrongText) x.classList.add('was-it'); });
            ctx.after(900, advance);
          }
        };
        optsWrap.appendChild(b);
      }
      stop = roundTimer(bar.el, hard ? 12 : 0, () => { ctx.audio.sfx('error'); advance(); });
    };

    const advance = () => {
      round++;
      if (round >= total) {
        stop && stop();
        finish({
          success: solved === total,
          performance: solved / total,
          summary: `${solved}/${total} absurdos detectados — ${solved === total ? 'vos tenés más sentido común que la IA junta' : 'el jurado del sentido común te suspendió'}`
        });
      } else render();
    };

    render();
  }
};
