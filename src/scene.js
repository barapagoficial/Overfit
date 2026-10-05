/**
 * Escena 3D del cuarto (cámara fija interactiva con parallax de mouse).
 * Hotspots clickeables: la PC (abre el panel) y objetos con chistes.
 * Geometría mínima + materiales Lambert compartidos: pensado para iGPU.
 */
import * as THREE from 'three';
import { PAL, mat, box, cyl, buildGPU, buildClutter, buildCup, buildFan, posterTexture, monitorTexture } from './lowpoly.js';
import { makeRng } from './utils.js';
import { ROOM_JOKES } from './config.js';

const V = THREE.Vector3;

export class RoomScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0c12);
    this.scene.fog = new THREE.Fog(0x0b0c12, 9, 16); // profundidad barata sin post-proceso

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
    this.camBase = new V(0.35, 1.85, 4.0);
    this.camLook = new V(0.25, 1.05, -1.4);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.camLook);

    this.pointer = new THREE.Vector2(0, 0);
    this._ndc = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.hotspots = [];      // grupos clickeables
    this.spinners = [];      // fans que giran
    this.time = 0;
    this.hovered = null;
    this.enabled = true;     // se apaga con overlays de UI
    this.flicker = true;

    this._build();
  }

  // ---------------- construcción ----------------
  _build() {
    const s = this.scene;
    const rng = makeRng(0xC0FFEE); // seed fija: el desorden es "canon"

    // luces: ambiente + "cielo" hemisférico + direccional = 3 luces baratas
    s.add(new THREE.AmbientLight(0x8f9ab5, 1.15));
    s.add(new THREE.HemisphereLight(0xd9c98a, 0x2c3a38, 0.75));
    const key = new THREE.DirectionalLight(0xfff2cc, 1.6);
    key.position.set(2.5, 4, 3);
    s.add(key);
    this.lamp = new THREE.PointLight(0xffe1a1, 14, 9, 1.9);
    this.lamp.position.set(0.3, 2.5, 0.4);
    s.add(this.lamp);
    this.gpuLight = new THREE.PointLight(PAL.ledPink, 3.2, 2.6, 1.8);
    this.gpuLight.position.set(1.7, 0.55, -2.3);
    s.add(this.gpuLight);

    // ---- cuarto 7x7, pared en z=-3.4, x=±3.4 ----
    const floorMat = mat(PAL.floor);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    s.add(floor);
    // manchas en el piso (círculos planos apenas elevados)
    for (let i = 0; i < 4; i++) {
      const st = new THREE.Mesh(new THREE.CircleGeometry(0.25 + rng.next() * 0.3, 10), mat(0x223c33));
      st.rotation.x = -Math.PI / 2;
      st.position.set(rng.range(-2.5, 2.5), 0.002, rng.range(-2.5, 2));
      s.add(st);
    }

    const wall = (w, h, x, y, z, ry) => {
      const m = box(s, PAL.wall, w, h, 0.12, x, y, z, [0, ry, 0]);
      m.rotation.z = 0.004; // "asimetría arquitectónica"
      return m;
    };
    wall(7.2, 3.2, 0, 1.6, -3.45, 0);          // fondo
    wall(7.2, 3.2, -3.45, 1.6, 0, Math.PI / 2); // izquierda
    wall(7.2, 3.2, 3.45, 1.6, 0, Math.PI / 2);  // derecha
    box(s, PAL.baseboard, 7, 0.16, 0.06, 0, 0.08, -3.37);
    // parches de pintura y grieta (deliberadamente feo)
    box(s, PAL.wallPatch, 1.1, 0.7, 0.02, -1.9, 2.3, -3.37, [0, 0, 0.06]);
    box(s, PAL.wallPatch, 0.55, 0.35, 0.02, 2.5, 1.1, -3.37, [0, 0, -0.1]);
    box(s, PAL.crack, 0.04, 1.15, 0.02, 1.05, 2.35, -3.37, [0, 0, 0.5]);

    // ---- mesa + monitor + teclado ----
    const desk = new THREE.Group();
    box(desk, PAL.desk, 1.9, 0.07, 0.85, 0.55, 0.75, -2.75, [0, 0.015, 0]);
    for (const [lx, lz] of [[-0.32, -3.08], [1.42, -3.08], [-0.32, -2.42], [1.42, -2.42]])
      box(desk, PAL.deskLeg, 0.07, 0.75, 0.07, lx, 0.375, lz);
    s.add(desk);

    // monitor (hotspot pc también)
    const monG = new THREE.Group();
    monG.position.set(0.35, 0.78, -2.85);
    box(monG, PAL.monitor, 0.16, 0.06, 0.16, 0, 0.03, 0);
    box(monG, PAL.monitor, 0.05, 0.28, 0.05, 0, 0.17, 0);
    box(monG, 0x181a20, 0.98, 0.62, 0.06, 0, 0.62, 0);
    this.monitorTex = monitorTexture();
    this.monitor = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.52), new THREE.MeshBasicMaterial({ map: this.monitorTex.texture }));
    this.monitor.position.set(0, 0.62, 0.035);
    monG.add(this.monitor);
    s.add(monG);
    box(s, 0x2a2d36, 0.42, 0.02, 0.14, 0.4, 0.8, -2.55, [0, 0.05, 0]); // teclado
    box(s, 0x35394a, 0.07, 0.03, 0.11, 0.78, 0.8, -2.55);               // mouse
    buildCup(s, -0.05, 0.79, -2.6);                                       // taza de café fría

    // ---- la torre con la 1050 a la vista (hotspot principal) ----
    const tower = new THREE.Group();
    tower.position.set(1.72, 0, -2.62);
    tower.rotation.y = -0.22;
    box(tower, PAL.tower, 0.46, 0.95, 0.5, 0, 0.475, 0);
    box(tower, 0x0c0d11, 0.4, 0.86, 0.03, 0.02, 0.47, 0.24);            // panel interno
    const gpu = buildGPU(0.5);
    gpu.position.set(0.03, 0.42, 0.15);
    gpu.rotation.z = 0.03;
    tower.add(gpu);
    this.gpuFans = gpu.userData.allFans;
    this.gpuLed = gpu.userData.led;
    box(tower, 0x111319, 0.42, 0.06, 0.06, 0, 0.9, 0.23);               // rejilla
    for (let i = 0; i < 4; i++) box(tower, PAL.ledGreen, 0.02, 0.015, 0.02, -0.14 + i * 0.09, 0.87, 0.255);
    tower.userData = { hs: 'pc', label: 'PC de guerra — clic para entrenar la IA' };
    s.add(tower);
    this.hotspots.push(tower, monG);
    monG.userData = { hs: 'pc', label: 'Monitor 1080p a 15 Hz (por respeto)' };

    // cables colgando (2 tubos feos)
    for (let c = 0; c < 2; c++) {
      const pts = [];
      for (let i = 0; i <= 6; i++) pts.push(new V(1.4 + c * 0.12 + Math.sin(i) * 0.1, 0.12 + i * 0.13, -2.35 + Math.cos(i * 1.7) * 0.16));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.016, 5), mat(0x14151a));
      s.add(tube);
    }

    // ---- silla giradora mal aparcada ----
    const chair = new THREE.Group();
    chair.position.set(0.05, 0, -1.7);
    chair.rotation.y = 2.6;
    box(chair, PAL.chair, 0.48, 0.07, 0.48, 0, 0.47, 0);
    box(chair, PAL.chair, 0.46, 0.55, 0.07, 0, 0.76, -0.22, [-0.12, 0, 0]);
    cyl(chair, 0x202228, 0.035, 0.42, 0, 0.25, 0);
    for (let i = 0; i < 3; i++) box(chair, 0x202228, 0.34, 0.04, 0.07, 0, 0.05, 0, [0, (i / 3) * Math.PI * 2, 0]).translateX(0.14);
    s.add(chair);

    // ---- cama con nido de ropa ----
    const bed = new THREE.Group();
    bed.position.set(-2.3, 0, -0.7);
    bed.rotation.y = 0.03;
    box(bed, 0x4a3220, 1.05, 0.3, 2.0, 0, 0.15, 0);
    box(bed, PAL.bed, 1.0, 0.16, 1.95, 0, 0.38, 0);
    box(bed, PAL.blanket, 1.02, 0.08, 1.25, 0.03, 0.47, 0.35, [0, 0.12, 0.02]);
    box(bed, PAL.pillow, 0.5, 0.12, 0.4, 0.05, 0.5, -0.72, [0, 0.4, 0]);
    bed.userData = { hs: 'bed', label: ROOM_JOKES.bed };
    s.add(bed);
    this.hotspots.push(bed);
    buildClutter(s, rng, -1.55, 0.25, 6); // ropa en el piso, obvio

    // ---- rincón de la basura ----
    const trash = new THREE.Group();
    trash.position.set(2.85, 0, -0.9);
    cyl(trash, PAL.trash, 0.18, 0.42, 0, 0.21, 0);
    cyl(trash, 0x707580, 0.15, 0.36, -0.28, 0.18, 0.22, [0.0, 0, 0.25]);
    box(trash, 0xd9c14a, 0.42, 0.05, 0.42, 0.1, 0.03, -0.3, [0, 0.6, 0]); // caja de pizza
    buildCup(trash, -0.1, 0, -0.34);
    buildCup(trash, 0.24, 0, 0.28);
    buildClutter(trash, rng, 0.35, -0.1, 3);
    trash.userData = { hs: 'trash', label: ROOM_JOKES.trash };
    s.add(trash);
    this.hotspots.push(trash);

    // ---- pósters (texturas canvas, cero bytes descargados) ----
    const mkPoster = (x, y, z, ry, rz, lines, bg, fg, accent, hs) => {
      const tex = posterTexture(lines, bg, fg, accent);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshLambertMaterial({ map: tex }));
      p.position.set(x, y, z);
      p.rotation.set(0, ry, rz);
      if (hs) { p.userData = { hs, label: ROOM_JOKES.poster }; this.hotspots.push(p); }
      s.add(p);
    };
    mkPoster(-1.15, 1.85, -3.36, 0.1, 0.055, ['GAMER', '24/7'], '#1d2340', '#7de0ff', '#ff5db1', 'poster');
    mkPoster(2.15, 1.75, -3.36, -0.12, -0.07, ['NO AGREGUES', 'CODIGO QUE', 'NO ENTENDAS'], '#3a2a12', '#ffd98a', '#8bff6a', null);
    mkPoster(-3.36, 1.6, -1.9, Math.PI / 2, 0.03, ['HOLA', 'CRANKY'], '#123412', '#e0ffe0', '#ff4f9a', null);

    // ---- ventana derecha (noche eterna) ----
    const win = new THREE.Group();
    win.position.set(3.37, 1.75, 0.6);
    win.rotation.y = -Math.PI / 2;
    box(win, 0x22303f, 1.2, 1.0, 0.04, 0, 0, 0, null, { basic: true, emissive: 1 });
    win.children[0].material = new THREE.MeshBasicMaterial({ color: 0x1a2842 });
    box(win, 0x5c4628, 1.3, 0.08, 0.1, 0, 0.53, 0.03);
    box(win, 0x5c4628, 1.3, 0.08, 0.1, 0, -0.53, 0.03);
    box(win, 0x5c4628, 0.07, 1.05, 0.1, 0, 0, 0.04);
    win.userData = { hs: 'window', label: ROOM_JOKES.window };
    s.add(win);
    this.hotspots.push(win);
    this.windowPane = win.children[0];

    // ---- ventilador que sufre + luz de techo ----
    this.floorFan = buildFan(s, -2.9, 2.2);
    Object.assign(this.floorFan.userData, { hs: 'fan', label: ROOM_JOKES.fan }); // ojo: no pisar blades
    this.hotspots.push(this.floorFan);
    box(s, 0x111218, 0.02, 0.5, 0.02, 0.3, 2.95, 0.4);          // cable de lámpara
    this.bulb = box(s, 0xffe1a1, 0.14, 0.14, 0.14, 0.3, 2.62, 0.4, [0, 0.7, 0.3], { basic: true, emissive: 1 });
    this.bulb.material = new THREE.MeshBasicMaterial({ color: 0xffe9b8 });

    // estantería con porquería
    const shelf = new THREE.Group();
    shelf.position.set(-1.0, 1.9, -3.2);
    box(shelf, PAL.desk, 1.1, 0.05, 0.26, 0, 0, 0);
    let bx = -0.45;
    for (let i = 0; i < 6; i++) {
      box(shelf, [0xb23a63, 0x2d7d46, 0x39456b, 0xd9c14a, 0x8a5c2f, 0x556][i % 6], 0.1, rng.range(0.18, 0.26), 0.16, bx, 0.11, 0, [0, 0, rng.range(-0.16, 0.16)]);
      bx += 0.14 + rng.range(0, 0.05);
    }
    s.add(shelf);

    // anillo de highlight para hotspots (uno solo, reutilizado)
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 6, 22), new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.9 }));
    this.ring.rotation.x = Math.PI / 2;
    this.ring.visible = false;
    s.add(this.ring);
  }

  // ---------------- update ----------------
  update(dt, elapsed) {
    this.time += dt;
    // fans de GPU (rápidas, como si fueran a despegar) y del cuarto
    for (const f of this.gpuFans) f.rotation.x += dt * 18;
    if (this.floorFan) this.floorFan.userData.blades.rotation.z += dt * 6.2;
    // LED rosado pulsando (escala, no material: los mats están cacheados)
    if (this.gpuLed) {
      const p = 0.8 + Math.sin(this.time * 5.1) * 0.25;
      this.gpuLed.scale.set(0.02 * p, 0.012 * p, 0.2);
      this.gpuLight.intensity = 2.4 + Math.sin(this.time * 5.1) * 1.2;
    }
    // parpadeo de la lamparita (se puede apagar en Opciones)
    if (this.flicker) {
      const n = Math.sin(this.time * 13) * Math.sin(this.time * 3.7);
      this.lamp.intensity = 14 + n * 2.2 + (this.time % 4.3 < 0.08 ? -8 : 0);
      this.bulb.material.color.setScalar(0.9 + n * 0.06 + 0.08);
    } else {
      this.lamp.intensity = 14;
      this.bulb.material.color.setHex(0xffe9b8);
    }
    // monitor "trabajando"
    if (this.monitorTex) this.monitorTex.update(dt);
    // parallax suave siguiendo el mouse (si está habilitado)
    const tx = this._px ?? 0, ty = this._py ?? 0;
    this._cx = (this._cx ?? 0) + (tx - (this._cx ?? 0)) * Math.min(1, dt * 3.2);
    this._cy = (this._cy ?? 0) + (ty - (this._cy ?? 0)) * Math.min(1, dt * 3.2);
    this.camera.position.set(this.camBase.x + this._cx * 0.55, this.camBase.y + this._cy * 0.28, this.camBase.z);
    this.camera.lookAt(this.camLook.x + this._cx * 0.3, this.camLook.y + this._cy * 0.2, this.camLook.z);
    // respiración del anillo de hover
    if (this.ring.visible) {
      const k = 1 + Math.sin(this.time * 6) * 0.06;
      this.ring.scale.setScalar(k);
      this.ring.rotation.z += dt * 1.5;
    }
  }

  // ---------------- interacción ----------------
  setParallax(nx, ny) { this._px = nx; this._py = ny; }

  _pick(nx, ny) {
    this._ndc.set(nx, ny);
    this.raycaster.setFromCamera(this._ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.hotspots, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.hs) o = o.parent;
    return o;
  }

  /** @returns hotspot bajo el cursor; deja el anillo de highlight listo. */
  hover(nx, ny) {
    if (!this.enabled) return null;
    const h = this._pick(nx, ny);
    if (h !== this.hovered) {
      this.hovered = h;
      if (h) {
        const bb = new THREE.Box3().setFromObject(h);
        const c = bb.getCenter(new V());
        this.ring.visible = true;
        this.ring.position.set(c.x, Math.max(0.04, bb.min.y + 0.03), c.z);
        const size = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.85;
        this.ring.scale.setScalar(Math.max(0.35, size));
        document.body.style.cursor = 'pointer';
      } else {
        this.ring.visible = false;
        document.body.style.cursor = 'default';
      }
    }
    return h;
  }

  click(nx, ny) {
    if (!this.enabled) return null;
    const h = this._pick(nx, ny);
    return h ? { hs: h.userData.hs, label: h.userData.label } : null;
  }

  /** Proyecta un punto 3D a coordenadas de pantalla (para la flecha indicadora). */
  worldToScreen(target, w, h) {
    const v = target.clone().project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 };
  }

  towerScreenPos(w, h) {
    return this.worldToScreen(new V(1.72, 1.35, -2.3), w, h);
  }
}
