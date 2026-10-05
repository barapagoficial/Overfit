/**
 * ⚙️ CONFIGURACIÓN DEL JUEGO — tocá este archivo para moddear sin tocar código.
 * Acá viven los nombres de las 8 áreas (requisito del diseño), el balance de
 * AI Points y los textos de humor. Todo se muestra tal cual en la UI.
 */

export const GAME = {
  title: 'OVERFIT',
  tagline: 'Entrená tu IA en la GTX 1050 que te regaló tu tío',
  version: '0.1.0',
  saveKey: 'overfit:save:v1' // clave en localStorage (fallback web)
};

/**
 * Las 8 áreas de la IA. `name` es editable; `id` NO (referencia interna).
 * `base` es un multiplicador temático por área (todas ~1 para que duelan igual).
 */
export const SKILLS = [
  { id: 'calculo',      name: 'Cálculo',           icon: '🧮', color: '#ffb200', base: 1.0,  tag: 'Ensamblá la ecuación' },
  { id: 'logica',       name: 'Lógica',            icon: '🧩', color: '#8a6bff', base: 1.0,  tag: '¿Qué sigue en la secuencia?' },
  { id: 'memoria',      name: 'Memoria',           icon: '🧠', color: '#4fa3ff', base: 1.05, tag: 'Repetí el pulso neuronal' },
  { id: 'lenguaje',     name: 'Lenguaje',          icon: '🗣️', color: '#3ecf8e', base: 0.95, tag: 'Ordená las letras' },
  { id: 'percepcion',   name: 'Percepción visual', icon: '👁️', color: '#00d5d5', base: 1.0,  tag: 'Encontrá el bicho raro' },
  { id: 'estrategia',   name: 'Estrategia',        icon: '♟️', color: '#f4f45c', base: 1.1,  tag: 'Duelo de cartones contra tu tía' },
  { id: 'creatividad',  name: 'Creatividad',       icon: '🎨', color: '#ff5db1', base: 0.95, tag: 'Ideas descabelladas' },
  { id: 'sentido',      name: 'Sentido común',     icon: '🤔', color: '#ff8a5c', base: 0.9,  tag: '¿Qué está mal acá?' }
];
export const SKILLS_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

/**
 * Balance de AI Points. Fórmula:
 *   ganancia = base × (1 + skillLevelBonus·(nivel−1)) × multDificultad × rendimiento × multHardware
 * (y × generalFactor si es entrenamiento general).
 * Arrancamos en ~0.02 AP por éxito fácil: lento A PROPÓSITO, es la gracia.
 */
export const BALANCE = {
  basePoints: 0.02,        // puntos base de un éxito perfecto en fácil, nivel 1
  generalFactor: 0.35,     // el entrenamiento general rinde poco... pero sube todo
  generalXpShare: 0.35,    // ...y lo poco que rinde se reparte entre las 8 áreas
  skillLevelBonus: 0.18,   // +18% de base por nivel de área (motor de progresión)
  failPerformance: 0.05,   // techo de rendimiento al fallar => ganancia mínima
  maxLevel: 25,            // cap del MVP ("el resto es DLC emocional")
  difficulty: {
    facil:   { label: 'Fácil',    mult: 1, blurb: 'Bajo riesgo, poca recompensa. Como tu primera nómina.' },
    extremo: { label: 'EXTREMO',  mult: 7, blurb: '×7 de recompensa. Si fallás, ganás migajas. Suena justo.' }
  },
  /** XP necesaria para pasar de nivel L a L+1 (en AI Points ganados en esa área). */
  xpForLevel: (L) => +(0.35 + 0.5 * (L - 1)).toFixed(2)
};

/**
 * Hardware. Empieza en el mínimo (GTX 1050). La estructura soporta más tiers
 * para futuro; la tienda y las mejoras de hardware están FUERA DEL ALCANCE.
 */
export const HARDWARE = {
  tiers: [
    { id: 'gtx1050', name: 'NVIDIA GTX 1050 2GB', short: 'GTX 1050', mult: 1.00, note: '“Para que juegues”, dijo tu tío.' },
    // ➜ Futuras mejoras (no implementar aún):
    // { id: 'gtx1650', name: 'NVIDIA GTX 1650 4GB', short: 'GTX 1650', mult: 1.50, note: 'hermana mayor, mismas deudas' },
  ],
  startTier: 0
};

/** Nivel del hardware => multiplicador (estructura lista para upgrades). */
export function hardwareMult(tierIndex) {
  const t = HARDWARE.tiers[clampTier(tierIndex)];
  return t.mult;
}
function clampTier(i) {
  return Math.max(0, Math.min(HARDWARE.tiers.length - 1, i | 0));
}

/** Frases de sabor para el modal de resultados (humor latino, bajo en azucar). */
export const FLAVOR = {
  win: [
    'La IA aprendió algo. Probablemente.',
    'Tu tío estaría orgulloso. O confundido.',
    'Ni Skynet, pero va por buen camino.',
    'Esto sí optimiza, che.',
    'La 1050 sopló un poquito pero salió.',
    'Progreso: 0.1% del total. No cuentes los años.'
  ],
  loss: [
    'La IA se quedó pensando en otra cosa.',
    'Eso... también es aprendizaje, supuestamente.',
    'El ventilador zumbó con decepción.',
    'Tu tía juega mejor a las cartas.',
    'Se sobrecalentó la vergüenza, no la GPU.'
  ],
  idle: [
    '—¿Ya comiste, mijo? —contestale a tu tío.',
    'El ventilador de la 1050 pide vacaciones.',
    'Un calcetín te está juzgando desde el piso.',
    'Hasta el café frío se enfrió más.'
  ]
};

/** Chistes al hacer clic en objetos del cuarto (huevos de pascua baratos). */
export const ROOM_JOKES = {
  trash: 'Basura acumulada: 47 días. La IA aún no aprende a limpiar. Obvio.',
  window: 'Afuera está nublado. coincide con tu futuro financiero.',
  poster: '"NO AGREGUES CÓDIGO QUE NO ENTENDÁS" — el póster te está regañando.',
  bed: 'La cama te susurra. Resiste, campeón.',
  fan: 'El ventilador gira a la velocidad exacta de tu progreso.'
};
