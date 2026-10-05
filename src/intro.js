/**
 * Intro jugada: sala pobre, tío Beto entrega la GTX 1050, Kevin se decepciona
 * y nace el plan de entrenar una IA. Saltable (botón, Enter o Esc).
 * Reutiliza el renderer WebGL del juego (no crea un segundo contexto).
 */
import * as THREE from 'three';
import { PAL, mat, box, cyl, buildGPU, buildPerson } from './lowpoly.js';
import { typewriter, el } from './utils.js';
import { audio } from './audio.js';

const LINES = [
  { who: 'narrador', text: 'Es 2026. El cuarto de Kevin parece ferias después del apagón: ni luz de techo estable.' },
  { who: 'kevin', text: 'Tío... necesito una PC para jugar Elden Cansancio 4. Va a cambiar mi vida.' },
  { who: 'tío', text: 'Llegó tu héroe. Tomá mijo, para que juegues.', action: 'give' },
  { who: 'sistema', text: 'REGALO RECIBIDO: NVIDIA GTX 1050 2GB — usada, con cariño y un rayón.' },
  { who: 'kevin', text: '¿Una 1050? Tío, esto no corre ni el salvapantallas en 8 bits.' },
  { who: 'tío', text: 'Ponte a estudiar, mijo. Eso da de comer. Yo me voy, se me enfría el mate.', action: 'leave' },
  { who: 'kevin', text: 'Si no puedo jugar... le enseño a esta 1050 a PENSAR. Un día dominará el mundo. O al menos ordenará mi cuarto.' },
  { who: 'narrador', text: 'Así nació OVERFIT. El entrenamiento de IA más lento de la historia. Nadie pidió secuela: la tuvo igual.' }
];

const WHO_STYLE = {
  'narrador': { name: '', cls: 'narr' },
  'kevin': { name: 'KEVIN (tú)', cls: 'kevin' },
  'tío': { name: 'TÍO BETO', cls: 'tio' },
  'sistema': { name: 'sistema', cls: 'sys' }
};

export class IntroScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080c);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 50);
    this.camera.position.set(0, 1.55, 4.4);
    this.camera.lookAt(0, 0.9, -0.5);
    this.i = 0;
    this.done = false;
    this.gpuPhase = 'tío';        // en manos de quién está la 1050
    this.gpuT = 0;                 // progreso del vuelo 0..1
    this._tw = null;               // typewriter activo
    this._cleanup = [];
    this._build();
    this._buildDom();
  }

  _build() {
    const s = this.scene;
    s.add(new THREE.AmbientLight(0x9aa5c0, 1.2));
    const key = new THREE.DirectionalLight(0xffe9c4, 1.5);
    key.position.set(1.5, 3, 2.5);
    s.add(key);

    box(s, 0x6e5b33, 7, 3, 0.12, 0, 1.5, -2.1);            // pared con manchas mustias
    box(s, 0x4a3f24, 7, 0.14, 0.05, 0, 0.07, -2.02);        // zócalo
    box(s, 0x2f4a42, 7, 0.02, 5, 0, 0.0, 0);                 // piso
    box(s, 0x7a3b2f, 2.4, 0.015, 1.6, 0, 0.02, 0.4);        // alfombra

    // sillón sudoroso
    const couch = new THREE.Group();
    couch.position.set(-1.6, 0, -1.2);
    box(couch, 0x5c3a4e, 1.7, 0.45, 0.7, 0, 0.3, 0);
    box(couch, 0x5c3a4e, 1.7, 0.55, 0.18, 0, 0.62, -0.27);
    box(couch, 0x6e465c, 0.78, 0.12, 0.55, -0.42, 0.58, 0.05, [0, 0.1, 0]);
    box(couch, 0x6e465c, 0.78, 0.12, 0.55, 0.42, 0.58, 0.05, [0, -0.15, 0]);
    s.add(couch);

    // planta mustia + cuadro chueco
    cyl(s, 0x9a4f2a, 0.16, 0.24, 2.4, 0.12, -1.5);
    const leaves = new THREE.Group(); leaves.position.set(2.4, 0.3, -1.5);
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.6, 5), mat(0x3f6b3a));
      c.position.set(Math.cos(i * 1.9) * 0.06, 0.3, Math.sin(i * 1.9) * 0.06);
      c.rotation.set(Math.cos(i * 1.9) * 0.5, 0, Math.sin(i * 1.7) * 0.5);
      leaves.add(c);
    }
    s.add(leaves);
    const pic = box(s, 0xd8cba3, 0.5, 0.36, 0.03, 1.1, 1.9, -2.02, [0, 0, -0.12]);
    pic.name = 'cuadro';

    // personajes
    this.kevin = buildPerson({ shirt: PAL.shirt1, pants: PAL.pants1, skin: PAL.skin1, hair: PAL.hair1 });
    this.kevin.group.position.set(-0.75, 0, 0.35);
    this.kevin.group.rotation.y = 0.5;
    s.add(this.kevin.group);

    this.tio = buildPerson({ shirt: PAL.shirt2, pants: PAL.pants2, skin: PAL.skin2, hair: PAL.hair2 });
    this.tio.group.position.set(0.85, 0, 0.3);
    this.tio.group.rotation.y = Math.PI - 0.55;
    s.add(this.tio.group);
    // el tío: remera polo con "bigote" de la vida
    box(this.tio.group, 0x2c2f38, 0.1, 0.16, 0.02, 0, 1.06, 0.135);

    // brazos en pose de entrega
    this.tio.armR.rotation.x = -1.25;
    this.kevin.armL.rotation.x = -1.1;

    // LA 1050 (protagonista silenciosa)
    this.gpu = buildGPU(1.35);
    this.gpu.position.set(0.35, 1.05, 0.55);
    this.gpu.rotation.set(0.1, 0.4, 0.05);
    s.add(this.gpu);

    this.lamp = new THREE.PointLight(0xffd98a, 9, 7, 1.9);
    this.lamp.position.set(0, 2.4, 1);
    s.add(this.lamp);
  }

  // ---------------- DOM del diálogo ----------------
  _buildDom() {
    this.root = el('div', 'intro-root', '', document.getElementById('ui'));
    const top = el('div', 'intro-top', '', this.root);
    const skip = el('button', 'btn ghost intro-skip', 'Saltar intro (Esc) »', top);
    skip.addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });

    const dlg = el('div', 'dlg', '', this.root);
    this.name = el('div', 'dlg-name', '', dlg);
    this.text = el('div', 'dlg-text', '', dlg);
    el('div', 'dlg-next', '▼ clic / Enter para seguir', dlg);
    this.prog = el('div', 'dlg-prog', '', dlg);

    const adv = (e) => {
      if (e && e.type === 'keydown' && !['Enter', ' ', 'Spacebar'].includes(e.key)) return;
      e && e.preventDefault && e.preventDefault();
      if (this.done) return;
      if (this.text.dataset.done !== '1') { this._tw && this._tw.skip(); return; }
      this._advance();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { this.finish(); return; }
      adv(e);
    };
    this.root.addEventListener('click', adv);
    window.addEventListener('keydown', onKey, true);
    this._cleanup.push(() => { window.removeEventListener('keydown', onKey, true); });

    this._renderLine();
  }

  _renderLine() {
    const ln = LINES[this.i];
    const st = WHO_STYLE[ln.who] || WHO_STYLE.narrador;
    this.name.textContent = st.name;
    this.name.className = 'dlg-name ' + st.cls;
    this.prog.textContent = `${this.i + 1} / ${LINES.length}`;
    this.text.dataset.done = '';
    this._tw = typewriter(this.text, ln.text, 16, (ch) => {
      if (ch === ',' || ch === '.' || ch === ' ') audio.sfx('type');
    });
    // acciones escénicas atadas a la línea
    if (ln.action === 'give') this.gpuPhase = 'fly';
    if (ln.action === 'leave') this.tioLeaving = true;
  }

  _advance() {
    this.i++;
    if (this.i >= LINES.length) { this.finish(); return; }
    audio.sfx('click');
    this._renderLine();
  }

  /** Termina la intro: limpia DOM/eventos y avisa al juego. */
  finish() {
    if (this.done) return;
    this.done = true;
    this._cleanup.forEach((fn) => fn());
    this.root.querySelector('.intro-end')?.remove();
    if (this.onFinish) this.onFinish();
  }

  destroy() {
    this._cleanup.forEach((fn) => fn());
    this.root.remove();
    this.scene.traverse((o) => { o.geometry && o.geometry.dispose?.(); });
  }

  update(dt, t) {
    // respiración de los personajes
    this.kevin.group.position.y = Math.sin(t * 1.8) * 0.012;
    this.tio.group.position.y = Math.sin(t * 1.4 + 1) * 0.012;
    this.kevin.head.rotation.z = Math.sin(t * 0.7) * 0.05;
    this.tio.head.rotation.z = Math.sin(t * 0.9 + 2) * 0.06;
    // lámpara nerviosa
    this.lamp.intensity = 9 + Math.sin(t * 17.3) * 1.4 + (t % 3.1 < 0.06 ? -5 : 0);

    // la 1050 vuela del tío a Kevin cuando la historia lo pide
    const tioHand = new THREE.Vector3(0.45, 1.0, 0.42);
    const kevHand = new THREE.Vector3(-0.62, 0.98, 0.62);
    if (this.gpuPhase === 'fly') {
      this.gpuT = Math.min(1, this.gpuT + dt * 1.6);
      if (this.gpuT >= 1) this.gpuPhase = 'kevin';
    }
    const k = this.gpuPhase === 'fly' ? this.gpuT * this.gpuT * (3 - 2 * this.gpuT) : 0;
    this.gpu.position.lerpVectors(tioHand, kevHand, this.gpuPhase === 'fly' ? k : (this.gpuPhase === 'kevin' ? 1 : 0));
    this.gpu.position.y += Math.sin(t * 2.2) * 0.015;
    this.gpu.rotation.z = 0.05 + Math.sin(t * 1.1) * 0.04;
    if (this.gpu.userData.allFans) for (const f of this.gpu.userData.allFans) f.rotation.x += dt * 12;

    // el tío se retira caminando (fade de posición)
    if (this.tioLeaving) {
      this.tioOff = (this.tioOff || 0) + dt;
      if (this.tioOff < 4) {
        this.tio.group.position.x += dt * 0.55;
        this.tio.group.rotation.y += dt * 0.1;
      }
    }
  }
}
