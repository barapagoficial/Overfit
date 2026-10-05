/**
 * Registro de minijuegos: un juego por cada área (mínimo del MVP).
 * Cada archivo exporta { id, name, hint, timeLimit, start(ctx) }.
 */
import calculo from './calculo.js';
import logica from './logica.js';
import memoria from './memoria.js';
import lenguaje from './lenguaje.js';
import percepcion from './percepcion.js';
import estrategia from './estrategia.js';
import creatividad from './creatividad.js';
import sentido from './sentido.js';

export const MINIGAMES = {
  calculo, logica, memoria, lenguaje, percepcion, estrategia, creatividad, sentido
};

/** Elige un minijuego al azar (para entrenamiento general). */
export function randomMinigame(rng, avoidId = null) {
  const ids = Object.keys(MINIGAMES).filter((id) => id !== avoidId);
  const id = ids[rng.int(0, ids.length - 1)];
  return MINIGAMES[id];
}
