# DECISIONES.md

Decisiones tomadas durante el desarrollo de Overfit MVP donde la especificación no era lo suficientemente precisa.

---

## 1. Tecnologías y stack

- **Vite** se usa para el bundling del renderer porque simplifica mucho el dev server con HMR y el build de producción del frontend. El main process de Electron se carga como ES modules sin bundling.
- **No se usan frameworks reactivos** (React/Vue/etc.). El DOM se actualiza de forma imperativa en un único `main.js`; la app es suficientemente simple para que eso sea mantenible y reduce peso del bundle.
- **Audio procedural** vía WebAudio API en lugar de archivos de sonido: cumple con el requisito "offline, sin dependencias externas" y evita problemas con la distribución del portable.
- **No hay texturas ni modelos externos**. Toda la escena 3D se construye con primitivas de Three.js (cajas, esferas, planos) y colores planos. Esto cumple el requisito de "bajos polígonos" y "funcionar en gráficos integrados a 60 FPS".
- Las sombras y efectos caros (`shadowMap`, antialias alto, post-procesado) están **desactivados** a propósito para priorizar rendimiento.

## 2. Cámara y movimiento

- Se eligió una **cámara libre en primera persona** (estilo FPS con pointer lock) en lugar de cámara fija, porque es más divertido explorar el cuarto desordenado.
- Colisiones simples por límites del mapa + rechazos contra el escritorio y la cama (sin librería de física, para mantener el peso bajo).
- El hint de interacción con el PC ("Pulsa E") se muestra solo cuando el jugador está a menos de 2.5 unidades del monitor.

## 3. Intro

- La intro se implementa como **diálogos de texto con temporizador** en un overlay negro, no como cinemática 3D. Esto mantiene el scope del MVP acotado y permite que el jugador la salte con ESPACIO.
- El texto completo del guión se define en un array en `main.js` (`INTRO_LINES`) para poder editarlo fácilmente.

## 4. Sistema de AI Points

- La fórmula final es:
  `puntos = base × dificultad × rendimiento(0–1) × multiplicador_de_hardware`
- Puntos base:
  - **Fácil específico**: 0.08 por ejercicio.
  - **General**: 0.04 (se divide entre todas las skills).
  - **Extremo**: multiplicador aleatorio entre ×5 y ×10 sobre la base del fácil.
- Si el jugador rinde por debajo del umbral en extremo (performance < 30%) se considera "fallo" y solo recibe el 5% de lo que hubiera ganado (en vez de 0, para que no se sienta totalmente estéril).
- Los AI Points se muestran siempre con **2 decimales** para reforzar la sensación de progreso lento.
- La animación de suma incluye: (1) efecto "pop" en el número grande, (2) número flotante +X.XX que se desvanece hacia arriba.

## 5. Las 8 habilidades

- Los nombres, íconos y colores son configurables en `renderer/src/config/skills.js`.
- Cada habilidad tiene **experiencia (exp)** y **nivel**. Se necesitan 10 puntos de exp para subir de nivel. El nivel solo es cosmético en este MVP (preparado para futuros multiplicadores pasivos).
- Las habilidades se muestran en el HUD inferior como "chips" con el nivel, y en el panel de entrenamiento como tarjetas con barra de progreso.

## 6. Minijuegos

- Hay **1 minijuego distinto por cada habilidad** (8) más un minijuego de entrenamiento general. Todos tienen 2 dificultades que afectan time limits, cantidad de rondas y tamaño/señal de los objetivos.
- Los minijuegos se **generan proceduralmente**: los valores cambian cada vez que se juega.
- El "rendimiento" que se usa en la fórmula de puntos es siempre un valor entre 0 y 1 calculado por cada minijuego según:
  - Proporción de aciertos (cálculo, lógica, lenguaje, memoria, percepción, sentido común).
  - Precisión vs. pasos mínimos (estrategia).
  - Cobertura del lienzo (creatividad).
  - Proporción de aciertos por rondas (general).
- Algunos minijuegos (ej. creatividad pintando) tienen una evaluación intencionalmente relajada para no frustrar: no se intenta reconocer dibujos por IA, que sería técnicamente excesivo para un MVP.

## 7. Guardado

- Se guarda en un archivo JSON en `app.getPath('userData')` mediante IPC desde el proceso principal de Electron.
- Existe un fallback a `localStorage` cuando la API de Electron no está disponible (modo desarrollo en navegador).
- Autosave cada 15 segundos y al volver al menú.
- Al iniciar, si no hay archivo de guardado válido, se empieza con estado limpio.

## 8. Opciones

- Solo **volumen maestro** y **volumen SFX** por ahora (gráficos y resolución se dejan para futuras versiones; el juego se adapta al tamaño de la ventana automáticamente).
- Opción para borrar partida guardada con confirmación.

## 9. Distribución / build

- El target de electron-builder es **`portable`** en `win x64` como pidió la especificación. Sin instalador, sin accesos directos.
- No se incluye ícono personalizado en este MVP (Electron usa el suyo por defecto); el campo `icon` está en `null` a propósito para evitar warnings en el build.
- El renderer se builda con Vite a `dist-renderer/` y Electron lo carga con `loadFile` en producción; en desarrollo usa el URL de Vite.

## 10. Rendimiento

- `setPixelRatio` limitado a 1.5 para no sobrecargar GPUs integradas en pantallas HiDPI.
- `Fog` en la escena para reducir distancia de dibujado y ocultar low-poly.
- Sin luces dinámicas por frame (solo una luz puntual del monitor que varía levemente para el parpadeo).
- Los objetos del desorden son primitivas simples (CylinderGeometry, BoxGeometry, CapsuleGeometry) con muy pocos triángulos.

## 11. Humor / tono

- El cuarto está **deliberadamente desordenado**: latas tiradas, pizza sobre el escritorio, un calcetín, un cartón tapando la ventana, un cuadro chueco. Esto es intencional y parte de la estética pedida.
- La pantalla del CRT parpadea y ocasionalmente se pone verde para transmitir la sensación de "PC vieja".
- Los mensajes de resultado del minijuego y el reward popup tienen tono informal y humorístico ("la GTX 1050 se queja", "tu IA está un poquito menos tonta").

## 12. Cosas que quedaron fuera del MVP a propósito

- Tienda / upgrades de hardware: la estructura de `HARDWARE_TIERS` ya está definida y el multiplicador de hardware se aplica en el cálculo de puntos, pero no hay UI para comprar nada.
- Sistema de progresión más profundo (prestigios, desbloqueos, logros).
- Música de fondo (solo hay SFX para no inflar el build y porque generar música procedural decente requiere más trabajo).
- Cualquier tipo de online/leaderboards.
