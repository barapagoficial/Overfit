// Estado global del juego y sistema de persistencia.
import { SKILLS, HARDWARE_TIERS, PROGRESSION } from '../config/skills.js';

const STORAGE_KEY = 'overfit_save_v1'; // fallback por si Electron falla

function initialState() {
  const skills = {};
  SKILLS.forEach(s => {
    skills[s.id] = { level: 0, exp: 0 };
  });
  return {
    aiPoints: 0,
    skills,
    hardwareId: 'gtx1050',
    totalTrainings: 0,
    introSeen: false,
    createdAt: Date.now()
  };
}

class GameState {
  constructor() {
    this.state = initialState();
    this.listeners = new Set();
    this.saveTimeout = null;
  }

  get() { return this.state; }

  set(newPartial) {
    this.state = { ...this.state, ...newPartial };
    this._emit();
    this.scheduleSave();
  }

  reset() {
    this.state = initialState();
    this._emit();
    this.scheduleSave();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    this.listeners.forEach(fn => fn(this.state));
  }

  // ===== Sumar AI Points =====
  addAIPoints(amount, skillId = null) {
    const gained = Math.max(0, amount);
    this.state.aiPoints += gained;

    if (skillId && this.state.skills[skillId]) {
      const skill = this.state.skills[skillId];
      skill.exp += gained;
      while (skill.exp >= PROGRESSION.levelsForUp) {
        skill.exp -= PROGRESSION.levelsForUp;
        skill.level += 1;
      }
    }
    this.state.totalTrainings += 1;
    this._emit();
    this.scheduleSave();
    return gained;
  }

  // ===== Guardado =====
  scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.save(), 2000);
  }

  async save() {
    try {
      if (window.electronAPI?.saveGame) {
        await window.electronAPI.saveGame(this.state);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.warn('No se pudo guardar:', e);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch {}
    }
  }

  async load() {
    try {
      let data = null;
      if (window.electronAPI?.loadGame) {
        try {
          const res = await window.electronAPI.loadGame();
          if (res && res.ok) data = res.data;
        } catch (e) {
          // Si falla IPC (modo browser), caemos a localStorage
        }
      }
      if (!data) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) data = JSON.parse(raw);
      }
      if (data && this._validate(data)) {
        // Asegurar que skills nuevas (si se añaden) tengan estado por defecto
        const base = initialState();
        SKILLS.forEach(s => {
          if (!data.skills[s.id]) data.skills[s.id] = { level: 0, exp: 0 };
        });
        this.state = { ...base, ...data };
        this._emit();
        return true;
      }
    } catch (e) {
      console.warn('Error cargando:', e);
    }
    return false;
  }

  async deleteSave() {
    if (window.electronAPI?.deleteSave) {
      await window.electronAPI.deleteSave();
    }
    localStorage.removeItem(STORAGE_KEY);
    this.state = initialState();
    this._emit();
  }

  hasSaveData() {
    // Chequeo síncrono rápido (localStorage) + se asincroniza mejor en main.js
    return !!localStorage.getItem(STORAGE_KEY);
  }

  _validate(d) {
    return d && typeof d.aiPoints === 'number' && d.skills;
  }

  getHardware() {
    return HARDWARE_TIERS.find(h => h.id === this.state.hardwareId) || HARDWARE_TIERS[0];
  }
}

export const gameState = new GameState();
