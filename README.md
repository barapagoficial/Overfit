# OVERFIT 🧠💥

> Entrená tu propia IA con una GTX 1050. ¿Qué puede salir mal?

Juego idle/simulación con humor latino, estética low-poly deliberadamente fea. Construido con **Three.js** + **Electron**. Empaquetable como `.exe` portable para Windows.

---

## 🎮 ¿De qué va?

Es 2026. Tu tío te regala una GTX 1050 "para que juegues". Obviamente no sirve para nada moderno. En lugar de tirarla decidís entrenar tu propia inteligencia artificial.

El juego consiste en:
1. Estás en tu cuarto (escena 3D que podés recorrer).
2. Te acercás a la PC y pulsás **E**.
3. Resolvé minijuegos para ganar **AI Points**.
4. Mejorás las 8 áreas de tu IA: Cálculo, Creatividad, Lógica, Lenguaje, Memoria, Percepción visual, Estrategia y Sentido común.
5. Elegís entre dificultad **Fácil** (ganancia baja pero segura) y **EXTREMO** (multiplicador ×5–×10, pero más probable fallar).

Los AI Points empiezan siendo ridículamente bajos (0.01–0.5 por entrenamiento). Es a propósito. La gracia es el humor del grind absurdo.

---

## 🚀 Controles

| Acción | Tecla |
| --- | --- |
| Moverse | W A S D / flechas |
| Mirar alrededor | Mouse (hacé clic en la pantalla para activar) |
| Interactuar con la PC | **E** |
| Pausar / Menú | **ESC** o el botón ☰ |
| Soltar el mouse (salir de cámara) | **ESC** |

---

## 📦 Estructura del proyecto

```
Overfit/
├── electron/              # Backend Electron (ventana + guardado IPC)
│   ├── main.js
│   └── preload.js
├── renderer/              # Frontend (cargado por Electron)
│   ├── index.html
│   └── src/
│       ├── main.js            # Punto de entrada, UI principal
│       ├── styles.css         # Estilos (estética fea-deliberada)
│       ├── config/skills.js   # Config de habilidades, progresión, GPU
│       ├── core/state.js      # Estado global + persistencia
│       ├── scenes/room.js     # Escena 3D del cuarto (Three.js)
│       ├── minigames/         # Minijuegos (1 por cada habilidad + general)
│       │   ├── base.js
│       │   ├── calculo.js
│       │   ├── creatividad.js
│       │   ├── logica.js
│       │   ├── lenguaje.js
│       │   ├── memoria.js
│       │   ├── percepcion.js
│       │   ├── estrategia.js
│       │   ├── sentidocomun.js
│       │   ├── general.js
│       │   └── index.js
│       └── utils/audio.js     # Audio procedural (WebAudio, sin assets)
├── public/                # (assets estáticos si los hubiera)
├── vite.config.js
└── package.json
```

---

## 🛠️ Instalación y ejecución

### Requisitos

- **Node.js 18+** (recomendado 20 LTS).
- **Windows 10/11** para generar el `.exe`. En Linux/macOS podés desarrollar sin problemas.

### Paso a paso

1. Instalá dependencias:

```bash
npm install
```

> Si por algún motivo Electron no puede descargarse el binario (firewall, proxy, red restringida), podés instalar el resto con:
> ```bash
> ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install
> ```
> y usar el modo desarrollo en navegador con `npx vite`.

2. Ejecutar en modo desarrollo:

```bash
npm start
```

Esto levanta:
- **Vite** en `http://localhost:5173` (recarga en caliente del renderer).
- **Electron** apuntando a ese servidor (la ventana de escritorio se abre sola).

> Si querés desarrollar solo en navegador sin Electron, ejecutá `npx vite` y abrí `http://localhost:5173`. El guardado usa localStorage como fallback cuando no está Electron.

3. Compilar el `.exe` portable para Windows:

```bash
npm run build
```

Esto genera:
- `dist-renderer/` — build optimizado del frontend.
- `dist/Overfit-Portable.exe` — ejecutable portable de Windows (no necesita instalación, se puede llevar en un USB).

> El target está configurado como `portable` en `package.json` bajo la clave `build.win`. Para generar el `.exe` tenés que estar en Windows (o tener Wine configurado, pero no es oficial).

---

## 💾 Guardado

El juego guarda automáticamente cada 15 segundos en la carpeta de datos de usuario de Electron:
- Windows: `%APPDATA%/Overfit/savegame.json`
- Linux: `~/.config/Overfit/savegame.json`
- macOS: `~/Library/Application Support/Overfit/savegame.json`

En modo navegador usa `localStorage` como fallback.

---

## 🎵 Audio

Todos los sonidos se generan proceduralmente con WebAudio API (beeps estilo chiptune). No hay archivos de audio externos: el juego corre completamente offline.

---

## 🧩 Minijuegos implementados (MVP)

| Habilidad | Minijuego |
| --- | --- |
| Cálculo | Completar ecuaciones con piezas |
| Creatividad | Dibujar rápido en un canvas |
| Lógica | Secuencias numéricas |
| Lenguaje | Sinónimos/antónimos/intrusos |
| Memoria | Simon dice con neuronas |
| Percepción visual | Encontrar el elemento diferente |
| Estrategia | Trazar el camino óptimo en un laberinto |
| Sentido común | Preguntas de situaciones cotidianas |
| Entrenamiento general | Barra clic en zona verde (recompensa a todas las skills) |

---

## 🚫 Fuera de alcance en este MVP

- Tienda de componentes / upgrades de hardware (la estructura está lista pero no implementada).
- Otros personajes además del tío en la intro.
- Combate, multijugador, DLCs.

---

## 📝 Decisiones de diseño

Ver [`DECISIONES.md`](./DECISIONES.md) para las suposiciones tomadas durante el desarrollo.
