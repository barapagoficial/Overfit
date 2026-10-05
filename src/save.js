/**
 * Capa de persistencia: si hay puente de Electron, guarda JSON en la carpeta
 * de datos del usuario; en navegador puro, fallback a localStorage (dev web).
 */
import { GAME } from './config.js';

const api = typeof window !== 'undefined' ? window.overfit : null;
const LS_KEY = GAME.saveKey;

export const storage = {
  hasBridge: !!api,

  /** @returns {Promise<object|null>} estado guardado o null si no hay save */
  async load() {
    try {
      const raw = api ? await api.load() : localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : null;
    } catch {
      return null; // save corrupta => empezar de cero, no crashear
    }
  },

  /** @param {string} json cadena serializada del estado */
  async save(json) {
    try {
      if (api) await api.save(json);
      else localStorage.setItem(LS_KEY, json);
      return true;
    } catch {
      return false;
    }
  },

  async wipe() {
    try {
      if (api) await api.save('null');
      localStorage.removeItem(LS_KEY);
    } catch {}
  }
};
