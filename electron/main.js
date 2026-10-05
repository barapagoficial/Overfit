import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

// Ruta de guardado: app.getPath('userData')
function getSavePath() {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, 'savegame.json');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#1a1a2e',
    title: 'Overfit - Entrena tu IA',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Offline: no necesitamos nada externo
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // comentado para MVP limpio
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist-renderer', 'index.html');
    mainWindow.loadFile(indexHtml);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==== IPC: Guardado / Carga de partida ====

ipcMain.handle('save-game', async (_event, data) => {
  try {
    const savePath = getSavePath();
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf-8');
    return { ok: true, path: savePath };
  } catch (e) {
    console.error('Error al guardar:', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('load-game', async () => {
  try {
    const savePath = getSavePath();
    if (!fs.existsSync(savePath)) return { ok: true, data: null };
    const raw = fs.readFileSync(savePath, 'utf-8');
    return { ok: true, data: JSON.parse(raw) };
  } catch (e) {
    console.error('Error al cargar:', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('delete-save', async () => {
  try {
    const savePath = getSavePath();
    if (fs.existsSync(savePath)) fs.unlinkSync(savePath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
