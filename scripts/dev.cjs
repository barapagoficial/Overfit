/**
 * `npm start` — modo desarrollo:
 * 1) Arranca Vite (dev server, HMR) in-process.
 * 2) Espera a que escuche y lanza Electron apuntando a esa URL.
 * Sin dependencias extra tipo concurrently/wait-on.
 */
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

(async () => {
  const { createServer } = await import('vite');
  const vite = await createServer({ root: ROOT, configFile: path.join(ROOT, 'vite.config.js') });
  await vite.listen();

  const url = vite.resolvedUrls.local[0];
  console.log(`\n[overfit dev] Vite en ${url} — abriendo Electron...\n`);

  // require('electron') desde Node devuelve la ruta del binario.
  const electronBin = require('electron');
  const child = spawn(electronBin, ['.'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, OVERFIT_DEV_URL: url }
  });

  const bye = () => {
    try { child.kill(); } catch {}
    vite.close().finally(() => process.exit(0));
  };
  child.on('exit', (code) => { vite.close().finally(() => process.exit(code ?? 0)); });
  process.on('SIGINT', bye);
  process.on('SIGTERM', bye);
})().catch((err) => {
  console.error('[overfit dev] error:', err);
  process.exit(1);
});
