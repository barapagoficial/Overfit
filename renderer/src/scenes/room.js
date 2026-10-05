// Escena 3D: el cuarto desordenado del protagonista con una PC (GTX 1050).
// Estética low-poly deliberadamente fea y colorinche.
import * as THREE from 'three';

export class RoomScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    this.pcInteractable = null;
    this.pcScreenMesh = null;
    this.gpuMesh = null;
    this.onInteract = null; // callback cuando el jugador activa el PC
    this.isNearPC = false;
    this.keys = {};
    this.playerPos = new THREE.Vector3(0, 1, 4);
    this.playerYaw = Math.PI;
    this.disposed = false;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._interactPressed = false;
    this._pointerLocked = false;
    this._started = false;

    this._init();
  }

  _init() {
    const { canvas } = this;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'default' // para gráficas integradas
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false; // bajo rendimiento a propósito
    this.renderer.setClearColor(0x2a1a3a);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x2a1a3a, 8, 25);

    // Cámara
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.copy(this.playerPos);
    this.camera.rotation.y = this.playerYaw;

    // Iluminación
    const ambient = new THREE.AmbientLight(0xffaa77, 0.6);
    this.scene.add(ambient);

    const lampLight = new THREE.PointLight(0xffee66, 1.2, 15);
    lampLight.position.set(0, 3.5, 2);
    this.scene.add(lampLight);

    const monitorLight = new THREE.PointLight(0x4488ff, 0.8, 5);
    monitorLight.position.set(0, 1.5, -1.8);
    this.scene.add(monitorLight);
    this._monitorLight = monitorLight;

    this._buildRoom();
    this._buildFurniture();
    this._buildClutter();

    // Controles: click para empezar, WASD + mouse para mirar (estilo FPS simple)
    this._bindInputs();
    window.addEventListener('resize', this._onResize);

    // Pantalla parpadeante
    this._screenPhase = Math.random() * Math.PI * 2;
  }

  _buildRoom() {
    // Suelo (feo, a cuadros)
    const floorGeo = new THREE.PlaneGeometry(16, 16, 8, 8);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    // Colorear caras aleatoriamente para un patrón desordenado
    const colors = [];
    const palette = [0x7a3b10, 0x8b4513, 0x6b2f0a, 0x9c5523, 0x552208];
    const posAttr = floorGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      // Cada 2 vértices aprox: color aleatorio
      const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
      colors.push(c.r, c.g, c.b);
    }
    floorGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const floorMat2 = new THREE.MeshLambertMaterial({ vertexColors: true });
    const floor = new THREE.Mesh(floorGeo, floorMat2);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);

    // Paredes (colores feos)
    const wallMatA = new THREE.MeshLambertMaterial({ color: 0xaa7755 }); // papel tapiz manchado
    const wallMatB = new THREE.MeshLambertMaterial({ color: 0x8aa775 }); // verde moho
    const wallMatC = new THREE.MeshLambertMaterial({ color: 0x5577aa }); // azul triste

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 0.3), wallMatA);
    backWall.position.set(0, 2.5, -5);
    this.scene.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 0.3), wallMatC);
    frontWall.position.set(0, 2.5, 5);
    this.scene.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 10), wallMatB);
    leftWall.position.set(-8, 2.5, 0);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 10), wallMatB);
    rightWall.position.set(8, 2.5, 0);
    this.scene.add(rightWall);

    // Techo
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshLambertMaterial({ color: 0x332244 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    this.scene.add(ceiling);

    // Una ventana en la pared derecha (cartón tapándola, humor)
    const windowBox = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 0.1), new THREE.MeshLambertMaterial({ color: 0x5a3a1a }));
    windowBox.position.set(7.8, 3, -2);
    this.scene.add(windowBox);
  }

  _buildFurniture() {
    // Escritorio
    const deskMat = new THREE.MeshLambertMaterial({ color: 0x4a2f1a });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 1.3), deskMat);
    desk.position.set(0, 1.0, -2.2);
    this.scene.add(desk);
    // Patas
    for (const [x, z] of [[-1.4, -1.7],[1.4,-1.7],[-1.4,-2.7],[1.4,-2.7]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), deskMat);
      leg.position.set(x, 0.5, z);
      this.scene.add(leg);
    }

    // Silla
    const chairMat = new THREE.MeshLambertMaterial({ color: 0x222244 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), chairMat);
    seat.position.set(0, 0.7, -0.3);
    this.scene.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.1), chairMat);
    back.position.set(0, 1.2, 0.05);
    this.scene.add(back);
    for (const [x,z] of [[-0.35,-0.65],[0.35,-0.65],[-0.35,0.05],[0.35,0.05]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), chairMat);
      leg.position.set(x, 0.35, z);
      this.scene.add(leg);
    }

    // Monitor (caja fea CRT-ish)
    const monitorBodyMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.6), monitorBodyMat);
    monitor.position.set(0, 1.7, -2.0);
    this.scene.add(monitor);
    // Base del monitor
    const monitorBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.4), monitorBodyMat);
    monitorBase.position.set(0, 1.13, -2.0);
    this.scene.add(monitorBase);
    // Pantalla (interactiva)
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x1155aa });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), screenMat);
    screen.position.set(0, 1.7, -1.69);
    this.scene.add(screen);
    this.pcScreenMesh = screen;
    this._screenMat = screenMat;

    // El PC (torre) al lado derecho del escritorio
    const caseMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.6), caseMat);
    tower.position.set(1.3, 0.55, -2.2);
    this.scene.add(tower);
    // LED
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x4ef037 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), ledMat);
    led.position.set(1.48, 0.95, -1.9);
    this.scene.add(led);

    // La GTX 1050 (metida dentro, pero añadimos un cartel) — en la torre pintamos una franja roja
    const gpuStripe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0xe94560 }));
    gpuStripe.position.set(1.3, 0.65, -1.89);
    this.scene.add(gpuStripe);

    // Zona interactiva del PC (caja invisible alrededor del monitor)
    const interactBox = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.5, 1.5),
      new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, transparent: true, opacity: 0.0 })
    );
    interactBox.position.set(0, 1.5, -1.8);
    this.scene.add(interactBox);
    this.pcInteractable = interactBox;

    // Teclado
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.3), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    kb.position.set(0, 1.05, -1.6);
    this.scene.add(kb);
    // Ratón
    const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.22), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    mouse.position.set(0.7, 1.05, -1.6);
    this.scene.add(mouse);

    // Cama al fondo
    const bedMat = new THREE.MeshLambertMaterial({ color: 0xaa4466 });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.4, 3.5), bedMat);
    bed.position.set(-5, 0.2, 1);
    this.scene.add(bed);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.7), new THREE.MeshLambertMaterial({ color: 0xeeeecc }));
    pillow.position.set(-5, 0.5, -0.4);
    this.scene.add(pillow);
    // Cobija desordenada
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2), new THREE.MeshLambertMaterial({ color: 0x446688 }));
    blanket.position.set(-5, 0.5, 2);
    blanket.rotation.y = 0.1;
    this.scene.add(blanket);

    // Una lámpara de escritorio
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.05, 8), new THREE.MeshLambertMaterial({ color: 0x222 }));
    lampBase.position.set(-1.2, 1.1, -2);
    this.scene.add(lampBase);
    const lampArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), new THREE.MeshLambertMaterial({ color: 0x222 }));
    lampArm.position.set(-1.2, 1.4, -2);
    this.scene.add(lampArm);
    const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 8, 1, true), new THREE.MeshLambertMaterial({ color: 0xffee66 }));
    lampHead.position.set(-1.2, 1.7, -2);
    lampHead.rotation.x = Math.PI;
    this.scene.add(lampHead);
  }

  _buildClutter() {
    // Objetos tirados por el suelo y el escritorio para que se vea desordenado
    const junkMatColors = [0xcc3333, 0x33cc33, 0x3333cc, 0xcccc33, 0xcc33cc, 0x33cccc];

    // Latas de refresco
    for (let i = 0; i < 7; i++) {
      const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8),
        new THREE.MeshLambertMaterial({ color: junkMatColors[i % junkMatColors.length] })
      );
      can.position.set(
        -3 + Math.random() * 6,
        0.125,
        -1 + Math.random() * 4
      );
      can.rotation.z = (Math.random() - 0.5) * 1.2;
      can.rotation.x = (Math.random() - 0.5) * 0.4;
      this.scene.add(can);
    }

    // Papeles / libros
    for (let i = 0; i < 6; i++) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.35 + Math.random()*0.1, 0.05, 0.25 + Math.random()*0.1),
        new THREE.MeshLambertMaterial({ color: junkMatColors[(i+2) % junkMatColors.length] })
      );
      book.position.set(
        -3 + Math.random() * 6,
        0.03,
        -1 + Math.random() * 4
      );
      book.rotation.y = Math.random() * Math.PI;
      this.scene.add(book);
    }

    // Una pizza a medio comer
    const pizzaBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), new THREE.MeshLambertMaterial({ color: 0xd2691e }));
    pizzaBox.position.set(0.8, 1.11, -2.2);
    this.scene.add(pizzaBox);

    // Calcetín tirado
    const sock = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.2, 4, 6), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
    sock.position.set(1.5, 0.15, 1.5);
    sock.rotation.z = 0.7;
    this.scene.add(sock);

    // Póster en la pared de atrás
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), new THREE.MeshBasicMaterial({ color: 0x2222aa }));
    poster.position.set(-3.5, 3, -4.84);
    this.scene.add(poster);
    // "GTX 1050" texto en el poster (usando canvas no, mejor un color plano y un par de cubos como "letras")
    const poster2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ color: 0x333 }));
    poster2.position.set(3.5, 3.2, -4.84);
    this.scene.add(poster2);

    // Un par de cubos de colores en la pared (cuadros chuecos)
    for (let i = 0; i < 4; i++) {
      const pic = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5 + Math.random()*0.3, 0.5 + Math.random()*0.3),
        new THREE.MeshBasicMaterial({ color: junkMatColors[i % junkMatColors.length] })
      );
      pic.position.set(-6 + Math.random()*4, 2 + Math.random()*2, -4.84);
      pic.rotation.z = (Math.random()-0.5)*0.3;
      this.scene.add(pic);
    }
  }

  _bindInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' && this.isNearPC && !this._interactPressed) {
        this._interactPressed = true;
        if (this.onInteract) this.onInteract();
      }
      if (e.code === 'Escape') {
        if (document.pointerLockElement === this.canvas) {
          document.exitPointerLock();
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyE') this._interactPressed = false;
    });

    this.canvas.addEventListener('click', () => {
      if (!this._started) this._started = true;
      const state = typeof this._canInteract === 'function' ? this._canInteract() : true;
      if (state && !document.pointerLockElement) {
        this.canvas.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this._pointerLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (this._pointerLocked) {
        this.playerYaw -= e.movementX * 0.0025;
        // Limitamos pitch
        this._pitch = (this._pitch || 0) - e.movementY * 0.0025;
        this._pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, this._pitch));
      }
    });
  }

  _onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // ===== API pública =====
  start() {
    this._animate();
  }

  setInteractChecker(fn) { this._canInteract = fn; }

  _animate = () => {
    if (this.disposed) return;
    requestAnimationFrame(this._animate);

    const dt = Math.min(0.05, this.clock.getDelta());

    // Movimiento WASD
    if (this._pointerLocked) {
      const speed = 3.5;
      const fwd = new THREE.Vector3(-Math.sin(this.playerYaw), 0, -Math.cos(this.playerYaw));
      const right = new THREE.Vector3(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw));
      const move = new THREE.Vector3();
      if (this.keys['KeyW'] || this.keys['ArrowUp']) move.add(fwd);
      if (this.keys['KeyS'] || this.keys['ArrowDown']) move.sub(fwd);
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.sub(right);
      if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed * dt);
        this.playerPos.add(move);
        // Límites de la habitación
        this.playerPos.x = Math.max(-7, Math.min(7, this.playerPos.x));
        this.playerPos.z = Math.max(-4.5, Math.min(4.5, this.playerPos.z));
        // No permitir atravesar el escritorio
        if (this.playerPos.z < -1.2 && this.playerPos.x > -1.8 && this.playerPos.x < 1.8) {
          this.playerPos.z = -1.2;
        }
        // Bloquear cama
        if (this.playerPos.x < -3.5 && this.playerPos.z < 2.5 && this.playerPos.z > -0.5) {
          this.playerPos.x = -3.5;
        }
      }
    }

    // Aplicar posición a cámara
    this.camera.position.copy(this.playerPos);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.playerYaw;
    this.camera.rotation.x = this._pitch || 0;

    // Distancia al PC (para hint)
    const dist = this.playerPos.distanceTo(this.pcInteractable.position);
    const near = dist < 2.5;
    if (near !== this.isNearPC) {
      this.isNearPC = near;
      if (this.onNearPCChange) this.onNearPCChange(near);
    }

    // Parpadeo de pantalla del PC
    this._screenPhase += dt * 4;
    const flicker = 0.7 + Math.sin(this._screenPhase) * 0.05 + Math.random()*0.05;
    const col = new THREE.Color(0x1155aa);
    col.multiplyScalar(flicker);
    // Ocasionalmente cambia a tono más verdoso (estilo CRT roto)
    if (Math.random() < 0.002) {
      col.setHex(0x4ef037);
    }
    this._screenMat.color.copy(col);
    this._monitorLight.intensity = 0.7 + Math.sin(this._screenPhase*1.3)*0.1;

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
