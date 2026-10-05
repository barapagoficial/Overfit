// Configuración de las 8 habilidades de la IA.
// Los nombres y emojis se pueden modificar aquí sin tocar el resto del código.

export const SKILLS = [
  {
    id: 'calculo',
    name: 'Cálculo',
    icon: '🧮',
    color: '#e94560',
    description: 'Resolver operaciones matemáticas rápidamente.'
  },
  {
    id: 'creatividad',
    name: 'Creatividad',
    icon: '🎨',
    color: '#ff6ec7',
    description: 'Dibujar y asociar ideas de forma novedosa.'
  },
  {
    id: 'logica',
    name: 'Lógica',
    icon: '🧩',
    color: '#4ef037',
    description: 'Completar secuencias y patrones.'
  },
  {
    id: 'lenguaje',
    name: 'Lenguaje',
    icon: '💬',
    color: '#ffd369',
    description: 'Identificar palabras y significados.'
  },
  {
    id: 'memoria',
    name: 'Memoria',
    icon: '🧠',
    color: '#7b68ee',
    description: 'Recordar secuencias y patrones.'
  },
  {
    id: 'percepcion',
    name: 'Percepción visual',
    icon: '👁️',
    color: '#00d4ff',
    description: 'Detectar diferencias y patrones visuales.'
  },
  {
    id: 'estrategia',
    name: 'Estrategia',
    icon: '♟️',
    color: '#ffa500',
    description: 'Planificar rutas y tomar decisiones.'
  },
  {
    id: 'sentidocomun',
    name: 'Sentido común',
    icon: '🤔',
    color: '#90ee90',
    description: 'Elegir la respuesta obvia pero correcta.'
  }
];

// Datos del hardware inicial (estructura preparada para futuros upgrades)
export const HARDWARE_TIERS = [
  { id: 'gtx1050', name: 'GTX 1050', tier: 1, multiplier: 1.0, color: '#e94560' }
  // Futuras GPU se añadirán aquí
];

// Constantes de progresión
export const PROGRESSION = {
  basePointsEasy: 0.08,       // Puntos base por entrenamiento fácil
  basePointsGeneral: 0.04,    // Puntos base entrenamiento general
  extremeMinMult: 5,
  extremeMaxMult: 10,
  failMult: 0.05,             // Si falla en extremo, 5% de lo que hubiera ganado
  levelsForUp: 10,            // Cuántos puntos de habilidad se necesitan para subir de nivel en un área
  autoSaveIntervalMs: 15000,  // Autosave cada 15s
};

// Dificultad
export const DIFFICULTY = {
  easy: { name: 'Fácil', mult: 1.0, timeLimitMult: 1.5 },
  extreme: { name: 'Extremo', multRange: [5, 10], timeLimitMult: 0.7, failChance: 0.55 }
};
