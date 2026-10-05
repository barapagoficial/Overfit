/**
 * Smoke test headless (herramienta de desarrollo, no forma parte del juego):
 * abre el dist/ construido en una ventana offscreen de Electron, captura
 * errores de consola y guarda un screenshot para verificar que el render
 * WebGL/DOM levanta. Uso: `npm run smoke` (después de `npm run build:web`).
 */
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const errors = [];
const logs = [];

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('ozone-platform', 'headless');
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280, height: 720, show: false,
    webPreferences: { offscreen: true, preload: path.join(__dirname, '..', 'electron', 'preload.cjs') }
  });
  win.webContents.on('console-message', (_e, level, message, line, src) => {
    const rec = `[${level === 3 ? 'ERR' : 'log'}] ${message} (${src.split('/').pop()}:${line})`;
    logs.push(rec);
    if (level === 3) errors.push(rec);
  });
  win.webContents.on('preload-error', (_e, p, err) => errors.push('PRELOAD: ' + err.message));
  win.webContents.on('render-process-gone', (_e, d) => errors.push('GONE: ' + JSON.stringify(d)));

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  // dejar pasar varios frames de animación
  await new Promise((r) => setTimeout(r, 4500));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, '..', 'smoke.png'), img.toPNG());
  // Simular interacciones básicas: cerrar intro y navegar pantallas
  const js = (code) => win.webContents.executeJavaScript(code).catch((e) => 'EXEC-ERR ' + e.message);
  logs.push('boot: ' + (await js('JSON.stringify({screen: __overfit.ui.screen})')));
  logs.push('skip intro: ' + (await js(`(() => { if (__overfit.intro) __overfit.intro.finish(); return 'ok' })()`)));
  await new Promise((r) => setTimeout(r, 600));
  logs.push('screen: ' + await js('window.__overfit.ui.screen'));
  logs.push('menu visible: ' + await js('document.querySelector(".menu").classList.contains("show")'));
  logs.push('go room: ' + await js('(() => { __overfit.startGame(); return "ok" })()'));
  await new Promise((r) => setTimeout(r, 600));
  logs.push('panel open: ' + await js('(() => { __overfit.ui.togglePanel(true); return "ok" })()'));
  await new Promise((r) => setTimeout(r, 400));
  logs.push('cards: ' + await js('document.querySelectorAll(".pcard").length'));
  const img2 = await win.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, '..', 'smoke2.png'), img2.toPNG());
  // lanzar un ejercicio real (memoria, fácil)
  logs.push('ejercicio: ' + await js('(() => { __overfit.ui._startExercise("memoria","facil"); return "ok" })()'));
  await new Promise((r) => setTimeout(r, 1600));
  logs.push('mg overlay: ' + await js('!!document.querySelector(".mg-overlay")'));
  const img3 = await win.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, '..', 'smoke3.png'), img3.toPNG());

  console.log('LOGS:\n' + logs.join('\n'));
  console.log('\nERRORS(' + errors.length + '):\n' + errors.join('\n'));
  app.exit(errors.length ? 1 : 0);
});
