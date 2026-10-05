// Configuración de Vite: empaqueta el renderizador (Three.js + UI + minijuegos)
// en `dist/`. Todo queda bundleado localmente: cero dependencias en runtime.
// `base: './'` es clave para que el .exe portable cargue el build desde file://.
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome120', // Electron actual: sin transpilar de más, código moderno
    minify: 'esbuild',
    chunkSizeWarningLimit: 1200 // three.js en un solo chunk es esperado
  }
});
