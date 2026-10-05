/**
 * Proceso principal de Electron.
 * - En desarrollo (OVERFIT_DEV_URL) apunta al dev server de Vite.
 * - En producción carga dist/index.html desde file:// (dentro del asar).
 * - Expone el guardado: JSON en la carpeta de datos de usuario de Electron
 *   (en Windows: %APPDATA%/Overfit/savegame.json).
 *
 * Se usa .cjs (CommonJS) a propósito: el preload sandboxeado de Electron
 * solo soporta require() sin banderas experimentales. Todo el código del
 * JUEGO (src/) sí es ESM. Ver DECISIONES.md.
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !!process.env.OVERFIT_DEV_URL;
const SAVE_VERSION = 1;

let win = null;
let pendingSave = null; // último JSON pendiente de escribir en disco

/** Ruta del archivo de guardado dentro de userData. */
function savePath() {
  return path.join(app.getPath('userData'), 'savegame.json');
}

/** Escritura atómica: tmp + rename (si el juego crashea, no corrompe la save). */
function writeSave(json) {
  try {
    const p = savePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = p + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, p);
    return true;
  } catch (err) {
    console.error('[overfit] no se pudo guardar:', err);
    return false;
  }
}

function flushPending() {
  if (pendingSave !== null) {
    writeSave(pendingSave);
    pendingSave = null;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 760,
    minWidth: 1024,
    minHeight: 576,
    title: 'Overfit — la 1050 que sueña con ser Skynet',
    backgroundColor: '#0b0c12',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once('ready-to-show', () => win.show());

  // Cualquier link externo (no debería haber ninguno) va al navegador, no a una ventana nueva.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(process.env.OVERFIT_DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  // Antes de cerrar: pide al renderer que haga flush final y destruye la ventana.
  win.on('close', (e) => {
    if (win._closing) return;
    win._closing = true;
    e.preventDefault();
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      flushPending();
      win.destroy();
    };
    win.webContents.once('ipc-message', (_ev, ch, finalJson) => {
      if (ch === 'ovf:flushed') {
        if (typeof finalJson === 'string') pendingSave = finalJson; // snapshot final, a prueba de races
        done();
      }
    });
    win.webContents.send('ovf:flush');
    setTimeout(done, 400); // red de seguridad si el renderer no responde
  });
}

// ---------- IPC de guardado ----------
ipcMain.handle('ovf:load', () => {
  try {
    const raw = fs.readFileSync(savePath(), 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    data.__version = SAVE_VERSION;
    return JSON.stringify(data);
  } catch {
    return null; // sin guardado todavía
  }
});

ipcMain.on('ovf:save', (_ev, json) => {
  // El renderer manda JSON a menudo; guardamos en memoria y diferimos el disco.
  if (typeof json === 'string') {
    pendingSave = json;
    clearTimeout(writeSave._t);
    writeSave._t = setTimeout(flushPending, 1500);
  }
});

ipcMain.on('ovf:quit', () => {
  if (win) win.close(); else app.quit();
});

// ---------- Ciclo de vida ----------
app.setName('Overfit');

// GPU integradas (el target es "PC modesto"): habilita aceleración aunque
// el driver sea white-list; si va mal, el usuario puede quitar el flag.
app.commandLine.appendSwitch('ignore-gpu-blocklist');

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', flushPending);
app.on('window-all-closed', () => app.quit());
