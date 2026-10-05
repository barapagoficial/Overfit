# OVERFIT — el idle de entrenar una IA en una GTX 1050 🎮🧠

> *"Toma mijo, para que juegues." — Tu tío, regalándote la tarjeta gráfica más
> inútil del 2026. Ahora solo te queda enseñarle a pensar.*

Simulación/idle de escritorio con humor latino, estética low-poly y decoración
deliberadamente fea. Entrenás tu IA con minijuegos procedurales para ganar
**AI Points** (ridículamente lentos al principio: es la gracia).

- **Three.js** (r186) para el 3D — cuarto procedural, todo generado por código.
- **Electron** 44 como contenedor de escritorio.
- **electron-builder** con target `portable`: un `.exe` único, sin instalador.
- **Vite** solo para bundlear el renderer (Three.js queda inline: 0 dependencias de red).
- **100% offline**: sin CDNs, sin fuentes externas, sin assets descargados. Texturas,
  sonidos y música se generan por código.

---

## 📋 Requisitos (Windows)

- [Node.js](https://nodejs.org) **20.19+ o 22+** (con npm, que viene incluido).
- No necesitás GPU dedicada: apunta a 60 FPS en gráficos integrados.

## 🚀 Instalar y ejecutar (desarrollo)

```bat
cd Overfit
npm install
npm start
```

`npm start` levanta el dev server de Vite y abre la ventana de Electron con HMR.
(Para probar solo la parte web sin Electron: `npm run start:web` y abrí
`http://localhost:5173`.)

## 🏗️ Compilar el .exe portable

```bat
npm run build
```

Esto hace dos cosas:
1. `vite build` → empaqueta el juego en `dist/`.
2. `electron-builder --win portable` → genera **`release/Overfit-Portable-0.1.0.exe`**.

Ese `.exe` es autocontenido: lo copiás a una USB, lo ejecutás en cualquier PC
Windows x64 y funciona (extrae en temp y corre; sin instalador, sin registro).

> **Nota:** construir el `.exe` de Windows se recomienda **en Windows**. En
> macOS/Linux electron-builder puede necesitar Wine para targets NSIS/portable.

## 🕹️ Cómo se juega

1. Mirá (o saltá con **Esc**) la intro: tu tío te regala una GTX 1050.
2. Estás en tu cuarto. Hacé clic en **la torre de la PC** (te la señala una flecha).
3. Elegí una de las **8 áreas de la IA** (Cálculo, Lógica, Memoria, Lenguaje,
   Percepción visual, Estrategia, Creatividad, Sentido común) —o "Entrenamiento
   general", que rinde poco pero sube todo—.
4. Elegí dificultad: **Fácil (×1)** o **Extremadamente difícil (×7)**.
5. Jugá el minijuego procedural. Ganancia:
   `puntos_base × multiplicador_dificultad × rendimiento(0..1) × nivel_hardware`.
6. Los AI Points suben las barras de XP de cada área; cada nivel aumenta el
   `puntos_base` de esa área → la curva se acelera de a poco. Eso es todo.
   No hay tienda (a propósito: el MVP no la incluye).
7. **Esc** abre la pausa; las opciones tienen volumen y algún que otro lujito.

El progreso se **autoguarda** como JSON en la carpeta de datos de usuario de
Electron (Windows: `%APPDATA%\Overfit\savegame.json`). En modo navegador usa
localStorage.

## 🗂️ Estructura

```
Overfit/
├─ electron/            # proceso principal + preload (guardado en userData)
│  ├─ main.cjs
│  └─ preload.cjs
├─ scripts/
│  ├─ dev.cjs           # npm start: Vite + Electron con HMR
│  └─ gen-icon.cjs      # genera build/icon.png (procedural, sin librerías)
├─ src/
│  ├─ main.js           # orquestador: escenas, input, loop, pausa
│  ├─ config.js         # ⚙️ nombres de áreas, balance, textos (moddeable)
│  ├─ state.js          # AI Points, XP, niveles, fórmula, autosave
│  ├─ save.js           # storage: IPC Electron ↔ localStorage
│  ├─ audio.js          # SFX + música generativa WebAudio (0 archivos)
│  ├─ scene.js          # el cuarto 3D (Three.js) con hotspots clickeables
│  ├─ intro.js          # escena narrativa saltable
│  ├─ lowpoly.js        # constructores de geometría/texturas procedurales
│  ├─ ui.js             # HUD, menús, panel, opciones, resultados
│  ├─ runner.js         # arnés de ejercicios (overlay + reloj global)
│  ├─ utils.js          # RNG con semilla, tween, typewriter...
│  └─ minigames/        # 1 juego por área, fácil + extremo, procedural
│     ├─ _harness.js    # ctx compartido (limpieza, fichas drag&drop, timers)
│     ├─ index.js       # registro
│     ├─ calculo.js     · ensamblá la ecuación (drag de fichas)
│     ├─ logica.js      · ¿qué sigue? (números y formas)
│     ├─ memoria.js     · pulso neuronal (Simon sobre canvas)
│     ├─ lenguaje.js    · letras al desorden (anagramas)
│     ├─ percepcion.js  · encontrá el bicho raro (canvas)
│     ├─ estrategia.js  · duelo de cartones (game theory vs la tía)
│     ├─ creatividad.js · ideas descabelladas
│     └─ sentido.js     · ¿qué está mal acá?
├─ index.html           # entry del renderer
├─ vite.config.js
└─ package.json         # scripts + config de electron-builder
```

## 🎨 Moddear el contenido

Casi todo el contenido "de superficie" está en **`src/config.js`**: nombres,
iconos y colores de las áreas, balance de AI Points, multiplicadores de
dificultad, textos de humor. Los minijuegos agregan dificultad con parámetros
en sus propios archivos (`rounds`, tiempos) y datos en pools.

## 🔧 Solución de problemas

- **Pantalla negra al abrir**: corré `npm run build:web` primero (a veces Electron
  en dev quiere `dist/` no, pero `npm start` no depende de eso — si falla, mirá la
  consola de devtools que se abre).
- **No se genera el .exe en Linux/macOS**: instálalo/en Wine o usá Windows (recomendado).
- **El juego va lento**: apagá parallax y parpadeo en Opciones; ya viene con
  pixelRatio cap a 1.5, sin sombras y con materiales Lambert.
- **Resetear la partida**: Opciones → Borrar partida (o borrá
  `%APPDATA%\Overfit\savegame.json`).

## 📄 Licencia

MIT. Hacé lo que quieras, pero la GTX 1050 la puso tu tío.
