/**
 * Preload: puente mínimo y seguro entre el renderer (juego) y Electron.
 * El juego solo ve `window.overfit`; si corre en navegador puro, el puente no
 * existe y el juego cae a localStorage (ver src/save.js).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overfit', {
  /** Lee la save como string JSON (o null). */
  load: () => ipcRenderer.invoke('ovf:load'),
  /** Pide guardado (async, el main escribe con debounce + atómico). */
  save: (json) => ipcRenderer.send('ovf:save', json),
  /** Confirma guardado inmediato al cerrar la ventana. */
  onFlush: (cb) => ipcRenderer.on('ovf:flush', cb),
  /** Al cerrar: devuelve el JSON final por si el debounce no llegó a escribir. */
  flushed: (json) => ipcRenderer.send('ovf:flushed', typeof json === 'string' ? json : undefined),
  /** Cierra la app desde "Salir". */
  quit: () => ipcRenderer.send('ovf:quit')
});
