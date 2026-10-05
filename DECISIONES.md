# DECISIONES.md — suposiciones y decisiones del MVP

Como se pidió, no se hizo ninguna pregunta: todo lo que la especificación dejaba
abierto se resolvió con el criterio más razonable y queda anotado acá.

## Stack / empaquetado

1. **Vite SÍ se usó**: la especificación lo permitía "si realmente simplifica el
   build". Simplifica muchísimo: bundlea `three` dentro de `dist/` (offline real,
   sin CDN), da HMR en dev y un pipeline de 2 líneas. No hay framework de UI: la
   interfaz es DOM vanilla + CSS.
2. **Electron `main`/`preload` en CommonJS (`.cjs`)** aunque el proyecto es
   `"type": "module"`. Motivo: el preload sandboxeado de Electron sigue siendo más
   robusto en CJS. Todo el código del juego (`src/`) es ESM moderno, como pedía la
   spec. El `package.json` marca `"main": "electron/main.cjs"`.
3. **`npm start` lanza Vite + Electron juntos** desde un script propio
   (`scripts/dev.cjs`) sin sumar dependencias tipo `concurrently`/`wait-on`.
4. **`.exe` portable se compila en Windows** (`npm run build`). electron-builder
   para targets NSIS/portable fuera de Windows puede requerir Wine; el proyecto
   queda listo, la spec no pedía ejecutar el empaquetado desde este entorno.
5. **Ícono**: `build/icon.png` se genera con `npm run gen-icon` (PNG codificado a
   mano, sin librerías). electron-builder lo convierte a `.ico`. Se commitió el
   PNG generado para que el build de Windows no dependa de correr el script.

## Rendimiento (PC modesto)

6. **Sin sombras, sin post-proceso, materiales Lambert** compartidos (cache de
   materiales), una sola `BoxGeometry` unitaria escalada por mesh, texturas canvas
   de 256–512px con `NearestFilter`, `pixelRatio` cap en 1.5, y luces: 2 fijas +
   2 puntos (una de ellas la "LED" de la GPU). Los minijuegos 2D son DOM/canvas
   2D para no agregar passes GL.
7. El render 3D sigue corriendo detrás de la UI (fondo vivo del menú/cuarto), pero
   el update completo se congela en pausa. Si el overlay está abierto, se apaga el
   raycasting (no cuesta nada si no hay hover).

## Bucle y economía de AI Points

8. **No hay "gasto" de AI Points**: la spec prohíbe tienda/upgrades y pide que la
   progresión la den las áreas. Decisión: los AI Points son la puntuación global
   acumulada **y** la moneda implícita: el rendimiento de cada entrenamiento suma
   XP al área elegida (o a las 8, al 35%, si es general). Cada nivel de área
   aumenta un **+18% el `puntos_base` de esa área**, multiplicando el rédito futuro.
   Así "con AI Points mejorás la IA" se cumple sin economía completa (fuera de
   alcance) y sin tienda.
9. **Curva inicial deliberadamente miserable** (spec): `puntos_base = 0.02`, con lo
   que un éxito perfecto fácil ≈ 0.02 AP y uno extremo perfecto ≈ 0.14 AP; fallar
   (en cualquiera) pisa el rendimiento a 0.05 → migajas. Con `rendimiento ∈ (0..1]`
   el rango percibido al inicio cae en los ~0.01–0.5 pedidos.
10. **Multiplicadores**: Fácil ×1, Extremo ×7 (la spec pedía ×5–×10; 7 es el punto
    medio y queda configurable en `config.js`).
11. **XP umbral**: `0.35 + 0.5·(nivel−1)` AI Points → el nivel 2 llega tras ~15–20
    entrenamientos fáciles al inicio. Cap de nivel: 25 (el "cap" es flavor +
    estabilidad del MVP).
12. **Nivel del hardware** entra en la fórmula como `mult` (GTX 1050 = ×1.0) con la
    estructura lista (`HARDWARE.tiers`) para agregar mejoras sin tocar `state.js`.
    No hay UI de upgrades (fuera de alcance).
13. **El HUD muestra "IA Nv.X"** = suma de los niveles de las 8 áreas: una métrica
    global simple que da sensación de avance sin inventar un sistema nuevo.

## Minijuegos

14. **1 por área (mínimo del MVP), cada uno con 2 variantes de dificultad**
    (fácil/extremo) que cambian cantidad de rondas, tamaños, tiempos y umbrales de
    éxito. Todo procedural con RNG sembrado (`mulberry32`), sin dos partidas
    iguales.
15. **Presentación "visual"**: los juegos usan DOM+CSS y canvas 2D con fichas
    grandes, animaciones y sonidos, en lugar de formularios de texto. Drag & drop
    real (Pointer Events) en Cálculo, canvas interactivo en Memoria/Percepción.
16. **El "rendimiento 0..1" no es binario**: cada juego devuelve un porcentaje
    (ecuaciones resueltas, patrones acertados, "descaro" promedio en creatividad,
    margen de victoria en estrategia...). Fallar => el runner pisa el rendimiento al
    piso de 0.05 (spec: "si falla, la ganancia es mínima").
17. **Salir de un ejercicio = abandonarlo** (sin ganancia ni penalización de
    estadísticas). Más justo que castigar con "fallo" a quien solo quería cerrar.
18. **Creatividad** es puntuable porque cada opción lleva un "tier" de descaro
    curado en los datos; el juego elige la opción más descabellada, no la "correcta"
    moral. Humor sobre judgement: revelamos los tiers al elegir (educativo).
19. **Estrategia** usa el juego del deque (tomar extremos) contra una IA avara
    determinista: perder/es-tar-atento importa, y es beatable pensando 2 jugadas —
    un juego de estrategia real en ~60 líneas.

## Guardado / plataforma

20. **Formato**: un único JSON `savegame.json` en `app.getPath('userData')`
    (Windows: `%APPDATA%\Overfit\`). Escritura atómica (`tmp` + `rename`), autosave
    con debounce de 2.5 s + flush en `pagehide` + flush coordinado al cerrar la
    ventana (`ovf:flush` / `ovf:flushed`). Carga tolerante: campos faltantes toman
    defaults (las saves viejas no rompen el juego).
21. **Fallback navegador** a `localStorage` con la misma clave, para poder probar el
    juego en el browser sin Electron (`npm run start:web`).
22. **Audio**: WebAudio sintetizado al 100% (sfx con osciladores/ruido + loop musical
    generativo). Opciones guarda volúmenes de música y efectos (persistidos). No hay
    ningún archivo `.mp3/.ogg` en el repo: offline sin peso binario.

## Narrativa y UI

23. **Intro**: escena 3D propia (misma sala de render, otro scene graph) con 8
    líneas de diálogo tipeado, el tío entregando la GPU y botón/skip con Esc.
    Saltable por definición y reversible desde Opciones ("Ver intro de nuevo").
24. **El cuarto es "cámara fija interactiva"**, no free-walk: parallax suave con el
    mouse + hotspots (PC abre el panel; cama/basura/ventana/ventilador tiran chistes).
    Decisión consciente: menos bugs de colisión/cámara, 60 FPS garantizados, y el
    desorden feo se ve mejor encuadrado a mano.
25. **Textos 100% en español rioplatense neutro-ish** ("vos/mijo/chabón-free"),
    configurables en `config.js` (`FLAVOR`, `ROOM_JOKES`) — el humor es contenido,
    no código.
26. **Idioma del código**: comentarios y strings en español, identificadores en
    inglés estándar para datos internos (`calculo`, `sentido`...) porque son claves
    de save/registro y no deben depender del idioma visible.

## Fuera de alcance (confirmado, NO implementado)

Tienda, upgrades de hardware (solo la estructura de datos), otros personajes
jugables (el tío actúa en la intro y "vive" en chistes), combate, multijugador,
logros, onboarding guiado.
