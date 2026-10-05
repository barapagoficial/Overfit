// Registro de minijuegos por skill.
import { CalculoMinigame } from './calculo.js';
import { CreatividadMinigame } from './creatividad.js';
import { LogicaMinigame } from './logica.js';
import { LenguajeMinigame } from './lenguaje.js';
import { MemoriaMinigame } from './memoria.js';
import { PercepcionMinigame } from './percepcion.js';
import { EstrategiaMinigame } from './estrategia.js';
import { SentidoComunMinigame } from './sentidocomun.js';
import { GeneralMinigame } from './general.js';

export const MINIGAMES = {
  calculo: CalculoMinigame,
  creatividad: CreatividadMinigame,
  logica: LogicaMinigame,
  lenguaje: LenguajeMinigame,
  memoria: MemoriaMinigame,
  percepcion: PercepcionMinigame,
  estrategia: EstrategiaMinigame,
  sentidocomun: SentidoComunMinigame,
  general: GeneralMinigame
};

export function createMinigame(skillId, container, opts) {
  const Cls = MINIGAMES[skillId] || GeneralMinigame;
  return new Cls(container, opts);
}
