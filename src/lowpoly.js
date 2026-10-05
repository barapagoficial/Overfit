/**
 * Constructores de geometría low-poly compartidos entre la sala (juego) y la
 * intro. Todo procedural: cajas, cilindros y texturas dibujadas en canvas.
 * Reutilizamos una única BoxGeometry unitaria escalada por mesh => poquísimos
 * draw calls de geometría, ideal para gráficos integrados.
 */
import * as THREE from 'three';

// ---------- paleta "deliberadamente fea" ----------
export const PAL = {
  wall: 0xa8974e, wallPatch: 0x9a8a44, crack: 0x5b4d24, floor: 0x35564c,
  baseboard: 0x6b5b3a, desk: 0x7a5230, deskLeg: 0x4a3220, bed: 0x39404d,
  blanket: 0xb23a63, pillow: 0xd8cba3, monitor: 0x23252c, tower: 0x1d1f26,
  gpu: 0xd02d2d, pcb: 0x2e7d32, ledPink: 0xff5abe, ledGreen: 0x39ff88,
  chair: 0x33353f, trash: 0x8a8f99, cup: 0xd9d2c4, coffee: 0x3d2b1f,
  shirt1: 0x2d7d46, skin1: 0xc98d5f, pants1: 0x39456b, hair1: 0x241a12,
  shirt2: 0x7a4a2f, skin2: 0xd8a06f, pants2: 0x444a52, hair2: 0x9aa1ad
};

// ---------- primitivas compartidas ----------
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const UNIT_CONE = new THREE.ConeGeometry(1, 1, 8);
const UNIT_TORUS = new THREE.TorusGeometry(1, 0.12, 6, 14);
const UNIT_CIRCLE = new THREE.CircleGeometry(1, 18);

const matCache = new Map();
export function mat(color, { emissive = 0, basic = false, opacity = 1 } = {}) {
  const key = `${color}|${emissive}|${basic}|${opacity}`;
  if (!matCache.has(key)) {
    let m;
    if (basic || emissive > 0) {
      m = new THREE.MeshBasicMaterial({ color }); // "emisivos": sin costo de luz
    } else {
      m = new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity });
    }
    matCache.set(key, m);
  }
  return matCache.get(key);
}

export function box(parent, color, w, h, d, x = 0, y = 0, z = 0, rot = null, opts = {}) {
  const m = new THREE.Mesh(UNIT_BOX, opts.texture ? opts.texture : mat(color, opts));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  parent.add(m);
  return m;
}
export function cyl(parent, color, r, h, x = 0, y = 0, z = 0, rot = null) {
  const m = new THREE.Mesh(UNIT_CYL, mat(color));
  m.scale.set(r * 2, h, r * 2);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  parent.add(m);
  return m;
}
export function cone(parent, color, r, h, x, y, z, rot = null) {
  const m = new THREE.Mesh(UNIT_CONE, mat(color));
  m.scale.set(r * 2, h, r * 2);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0);
  parent.add(m);
  return m;
}

// ---------- texturas procedurales ----------
function canvasTex(size, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; // look pixelado, a propósito
  return t;
}

/** Póster feo con texto (WordArt de garaje). */
export function posterTexture(lines, bg, fg, accent) {
  return canvasTex(256, (c, s) => {
    c.fillStyle = bg; c.fillRect(0, 0, s, s);
    c.strokeStyle = accent; c.lineWidth = 10; c.strokeRect(12, 12, s - 24, s - 24);
    let y = s / 2 - (lines.length - 1) * 26;
    for (const ln of lines) {
      c.font = `bold ${ln.length > 14 ? 22 : 30}px monospace`;
      c.textAlign = 'center';
      c.fillStyle = accent; c.fillText(ln, s / 2 + 3, y + 3);
      c.fillStyle = fg; c.fillText(ln, s / 2, y);
      y += 44;
    }
    // manchas "reales"
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.arc((i * 97) % s, (i * 53) % s, 6 + (i % 4) * 4, 0, 7);
      c.fill();
    }
  });
}

/** Textura de pantalla del monitor: terminal de entrenamiento fake. */
export function monitorTexture() {
  const cv = document.createElement('canvas');
  cv.width = 320; cv.height = 200;
  const ctx = cv.getContext('2d');
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const logs = [
    'overfit.exe v0.1 — cargando...', 'GPU: GTX 1050 (2GB) — "suficiente"',
    'epoch ??/?? loss=0.997 lr=0.0001', 'WARN: la IA no sabe contar hasta 3',
    'entrenando sentido_comun... 2%', 'nota: tío dice "ponte a estudiar"',
    'batch 4 de 1 (memoria: ninguna)', 'loss subió. nadie panickee.',
    'aprendiendo a ordenar tu cuarto... FAIL', 'GPU tosiendo píxeles',
    'checkpoint: 0.02 AI Points', 'sudo rm -rf excusas'
  ];
  let line = 0, y = 30, blink = 0;
  ctx.fillStyle = '#0a0f14'; ctx.fillRect(0, 0, 320, 200);
  return {
    texture: t,
    /** redibujar un poquito del "terminal" cada pocos frames */
    update(dt) {
      blink += dt;
      if (blink < 0.35) return;
      blink = 0;
      ctx.fillStyle = '#0a0f14';
      ctx.fillRect(6, 6, 308, 168);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#39ff88';
      ctx.fillText('$ overfit --train --con-dignidad', 12, 22);
      ctx.fillStyle = '#8de0ff';
      ctx.fillText(logs[line % logs.length], 12, y);
      line++;
      y += 15;
      if (y > 168) y = 36;
      if (line % 3 === 0) { // "loss" chart garabateada
        ctx.strokeStyle = '#ffb200'; ctx.beginPath();
        for (let x = 12; x < 300; x += 6) ctx.lineTo(x, 180 - 8 * Math.abs(Math.sin(x * 0.05 + line)));
        ctx.stroke();
      }
      ctx.fillStyle = blink % 1 > 0.5 ? '#39ff88' : '#0a0f14';
      t.needsUpdate = true;
    }
  };
}

// ---------- objetos compuestos ----------

/** La GTX 1050 con fans que giran (regalo del tío). */
export function buildGPU(scale = 1) {
  const g = new THREE.Group();
  box(g, PAL.pcb, 0.92, 0.05, 0.3);                        // PCB
  box(g, PAL.gpu, 0.86, 0.16, 0.34, -0.02, 0.1, 0);        // shroud rojo
  box(g, 0xf05555, 0.86, 0.02, 0.34, -0.02, 0.19, 0);      // brillo
  for (const fx of [-0.24, 0.2]) {
    const fan = new THREE.Group(); // el grupo gira en update() => las palas "rotan"
    for (let i = 0; i < 5; i++) {
      const b = box(fan, 0x2c2f38, 0.001, 0.1, 0.035, 0, 0, 0);
      b.rotation.x = (i / 5) * Math.PI * 2;
      b.position.set(0, Math.sin(b.rotation.x) * 0.05, Math.cos(b.rotation.x) * 0.05);
    }
    fan.position.set(fx, 0.1, 0.17);
    g.add(fan);
    fan.userData.isFan = true;
  }
  box(g, 0xc0c6d0, 0.03, 0.2, 0.32, -0.47, 0.05, 0);       // bracket
  box(g, 0xd9b13b, 0.3, 0.001, 0.06, 0.05, -0.03, 0.02);   // dedos PCIe
  const led = box(g, PAL.ledPink, 0.02, 0.012, 0.2, -0.4, 0.185, 0, null, { emissive: 1 });
  g.userData.allFans = [];
  g.traverse((o) => o.userData.isFan && g.userData.allFans.push(o));
  g.userData.led = led;
  g.scale.setScalar(scale);
  return g;
}

/** Humano low-poly de estética "recibo de luz". */
export function buildPerson({ shirt, pants, skin, hair }) {
  const g = new THREE.Group();
  const p = [];
  p.push(box(g, pants, 0.16, 0.42, 0.16, -0.1, 0.21, 0));  // piernas
  p.push(box(g, pants, 0.16, 0.42, 0.16, 0.1, 0.21, 0));
  p.push(box(g, 0x22242c, 0.2, 0.06, 0.3, -0.1, 0.02, 0.05));
  p.push(box(g, 0x22242c, 0.2, 0.06, 0.3, 0.1, 0.02, 0.05)); // zapatos
  const torso = box(g, shirt, 0.5, 0.55, 0.26, 0, 0.7, 0);
  const head = box(g, skin, 0.3, 0.3, 0.27, 0, 1.12, 0);
  box(g, hair, 0.32, 0.12, 0.29, 0, 1.27, 0);              // pelo
  box(g, 0x111111, 0.05, 0.05, 0.02, -0.07, 1.14, 0.14);   // ojos
  box(g, 0x111111, 0.05, 0.05, 0.02, 0.07, 1.14, 0.14);
  const mouth = box(g, 0x7a2f2f, 0.12, 0.03, 0.02, 0, 1.03, 0.14);
  // brazos pivotan desde el hombro (desplazamos la geometría media caja)
  const armL = box(g, shirt, 0.12, 0.44, 0.14, -0.32, 0.72, 0);
  const armR = box(g, shirt, 0.12, 0.44, 0.14, 0.32, 0.72, 0);
  armL.position.y += 0.1; armR.position.y += 0.1;
  return { group: g, head, mouth, armL, armR, torso };
}

/** pila de ropa/basura: cajas al azar, como debe ser. */
export function buildClutter(parent, rng, x, z, n = 7) {
  const colors = [0xb23a63, 0x2d7d46, 0x39456b, 0xd9c14a, 0x8a5c2f];
  for (let i = 0; i < n; i++) {
    box(parent, rng.pick(colors), rng.range(0.18, 0.4), rng.range(0.05, 0.14), rng.range(0.16, 0.34),
      x + rng.range(-0.25, 0.25), 0.03 + i * 0.055, z + rng.range(-0.2, 0.2),
      [rng.range(-0.2, 0.2), rng.range(0, Math.PI), 0]);
  }
}

/** Vaso/taza mugrosa. */
export function buildCup(parent, x, y, z, drink = PAL.coffee) {
  const g = new THREE.Group();
  cyl(g, PAL.cup, 0.05, 0.11, 0, 0.055, 0);
  cyl(g, drink, 0.042, 0.01, 0, 0.105, 0);
  const h = new THREE.Mesh(UNIT_TORUS, mat(PAL.cup));
  h.scale.setScalar(0.05); h.position.set(0.06, 0.05, 0);
  g.add(h);
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** Ventilador de pie que va a sufrir. */
export function buildFan(parent, x, z) {
  const g = new THREE.Group();
  cyl(g, 0x2a2c33, 0.16, 0.03, 0, 0.02, 0);
  cyl(g, 0x2a2c33, 0.03, 0.75, 0, 0.4, 0);
  const headG = new THREE.Group();
  headG.position.set(0, 0.82, 0);
  const cage = new THREE.Mesh(UNIT_TORUS, mat(0x4a4e58));
  cage.scale.setScalar(0.21);
  headG.add(cage);
  const blades = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = box(blades, 0x86d1ff, 0.34, 0.09, 0.01, 0, 0, 0.02);
    b.rotation.z = (i / 4) * Math.PI * 2;
    b.position.set(Math.cos(b.rotation.z) * 0.1, Math.sin(b.rotation.z) * 0.1, 0.02);
  }
  headG.add(blades);
  g.add(headG);
  g.position.set(x, 0, z);
  g.userData.blades = blades;
  parent.add(g);
  return g;
}
