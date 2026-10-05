/**
 * Estado del juego: AI Points, niveles/XP de las 8 áreas, hardware, ajustes,
 * estadísticas, guardado automático y TODA la matemática de recompensas.
 *
 * Fórmula (según diseño):
 *   ganancia = puntos_base × multiplicador_dificultad × rendimiento(0..1) × mult_hardware
 * donde puntos_base escala con el nivel del área entrenada (motor de progresión
 * ya que no hay tienda en el MVP). Ver DECISIONES.md.
 */
import { BALANCE, HARDWARE, SKILLS, SKILLS_BY_ID, hardwareMult } from './config.js';
import { storage } from './save.js';
import { clamp } from './utils.js';

/** Estado por defecto (partida nueva). */
function freshState() {
  const skills = {};
  for (const s of SKILLS) skills[s.id] = { level: 1, xp: 0 };
  return {
    aiPoints: 0,
    totalEarned: 0, // AP histórico (para HUD y orgullo personal)
    hardwareTier: HARDWARE.startTier,
    skills,
    settings: { musicVol: 0.55, sfxVol: 0.8, parallax: true, flicker: true },
    flags: { introSeen: false, firstTraining: false },
    stats: { runs: 0, wins: 0, fails: 0, streak: 0, bestStreak: 0 }
  };
}

export const state = freshState();

// ---------- mini event bus ----------
const listeners = new Set();
export function onGameEvent(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(type, payload) { for (const fn of listeners) { try { fn(type, payload); } catch (e) { console.error(e); } } }

// ---------- guardado ----------
let saveTimer = 0;
let dirty = false;

export function serialize() { return JSON.stringify({ v: 1, savedAt: Date.now(), ...state }); }

export function markDirty() {
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(), 2500); // autosave con debounce
}

export async function saveNow() {
  dirty = false;
  await storage.save(serialize());
  emit('saved', {});
}

/** Carga la save y la fusiona con el estado por defecto (tolerante a saves viejas). */
export async function loadGame() {
  const data = await storage.load();
  if (data && data.skills) {
    Object.assign(state, {
      aiPoints: +data.aiPoints || 0,
      totalEarned: +data.totalEarned || 0,
      hardwareTier: data.hardwareTier | 0
    });
    for (const s of SKILLS) {
      const sv = data.skills[s.id];
      if (sv) state.skills[s.id] = { level: Math.max(1, sv.level | 0), xp: +sv.xp || 0 };
    }
    Object.assign(state.settings, data.settings || {});
    Object.assign(state.flags, data.flags || {});
    Object.assign(state.stats, data.stats || {});
    emit('loaded', {});
    return true;
  }
  return false; // sin save: partida nueva
}

export async function resetGame() {
  Object.assign(state, freshState());
  await saveNow();
  emit('reset', {});
}

// Al cerrar la pestaña/ventana: flush final (mejor esfuerzo).
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { if (dirty) storage.save(serialize()); });
  // Electron: el main pide permiso para cerrar => guardamos y le devolvemos el JSON
  if (window.overfit && window.overfit.onFlush) {
    window.overfit.onFlush(() => {
      const json = serialize();
      dirty = false;
      storage.save(json);
      try { window.overfit.flushed(json); } catch {}
    });
  }
}

// ---------- hardware ----------
export function hardware() {
  const t = HARDWARE.tiers[clamp(state.hardwareTier, 0, HARDWARE.tiers.length - 1)];
  return { ...t, mult: hardwareMult(state.hardwareTier) };
}

/** Nivel global de la IA = suma de niveles de áreas (8 al inicio). */
export function aiLevel() {
  let sum = 0;
  for (const s of SKILLS) sum += state.skills[s.id].level;
  return sum;
}

// ---------- progreso de área ----------
export function skillProgress(skillId) {
  const sk = state.skills[skillId];
  const need = BALANCE.xpForLevel(sk.level);
  return { level: sk.level, xp: sk.xp, need, pct: clamp(sk.xp / need, 0, 1) };
}

// ---------- la fórmula sagrada ----------
/**
 * Calcula la ganancia SIN mutar el estado (para mostrar "≈ +0.21" antes de jugar).
 * @param skillId id de área o 'general'
 * @param difficulty 'facil' | 'extremo'
 * @param performance rendimiento 0..1 del minijuego (o BALANCE.failPerformance al fallar)
 */
export function computeGain(skillId, difficulty, performance) {
  const diff = BALANCE.difficulty[difficulty] || BALANCE.difficulty.facil;
  const perf = clamp(performance, 0, 1);
  let base = BALANCE.basePoints;
  if (skillId === 'general') {
    base *= BALANCE.generalFactor; // general: ganancia baja, a propósito
  } else {
    const cfg = SKILLS_BY_ID[skillId];
    const lvl = state.skills[skillId]?.level ?? 1;
    base *= (cfg?.base ?? 1) * (1 + BALANCE.skillLevelBonus * (lvl - 1));
  }
  return base * diff.mult * perf * hardware().mult;
}

/**
 * Aplica el resultado de un ejercicio: suma AP, reparte XP, sube niveles.
 * @returns {gain, xpBySkill: {id: n}, levelUps: [{id, level}], pointsDelta}
 */
export function applyGain(skillId, difficulty, result) {
  state.stats.runs++;
  let perf = clamp(result.performance ?? 0, 0, 1);
  if (!result.success) {
    // Fallar => la ganancia es MÍNIMA (techo de rendimiento, aplica a ambas dificultades)
    perf = Math.min(perf, BALANCE.failPerformance);
    state.stats.fails++;
    state.stats.streak = 0;
  } else {
    state.stats.wins++;
    state.stats.streak++;
    state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streak);
  }

  const gain = computeGain(skillId, difficulty, perf);
  state.aiPoints += gain;
  state.totalEarned += gain;
  state.flags.firstTraining = true;

  // XP por área
  const xpBySkill = {};
  const grantXp = (id, amount) => {
    const sk = state.skills[id];
    sk.xp += amount;
    const ups = [];
    while (sk.level < BALANCE.maxLevel && sk.xp >= BALANCE.xpForLevel(sk.level)) {
      sk.xp -= BALANCE.xpForLevel(sk.level);
      sk.level++;
      ups.push(sk.level);
    }
    if (sk.level >= BALANCE.maxLevel) sk.xp = Math.min(sk.xp, BALANCE.xpForLevel(sk.level));
    if (ups.length) xpBySkill[id] = { xp: amount, levels: ups };
    else xpBySkill[id] = { xp: amount, levels: [] };
  };

  if (skillId === 'general') {
    for (const s of SKILLS) grantXp(s.id, gain * BALANCE.generalXpShare);
  } else {
    grantXp(skillId, gain);
  }

  const levelUps = Object.entries(xpBySkill)
    .flatMap(([id, v]) => v.levels.map((level) => ({ id, level })));

  markDirty();
  emit('points', { gain });
  if (levelUps.length) emit('levelup', { levelUps });

  return { gain, xpBySkill, levelUps, performance: perf };
}

/** El nivel de área sube el base points: se lo mostramos al jugador como dato. */
export function areaBasePreview(skillId) {
  const gEasy = computeGain(skillId === 'general' ? 'general' : skillId, 'facil', 1);
  const gHard = computeGain(skillId, 'extremo', 1);
  const gHardFail = computeGain(skillId, 'extremo', BALANCE.failPerformance);
  return { easy: gEasy, hard: gHard, hardFail: gHardFail };
}
