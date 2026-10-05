/**
 * Genera build/icon.png (256x256) proceduralmente: la legendaria GTX 1050.
 * Sin librerías: PNG codificado a mano (zlib + CRC32). electron-builder lo
 * convierte a .ico al empaquetar. Se ejecuta con `npm run gen-icon`.
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const W = 256, H = 256;
const px = Buffer.alloc(W * H * 4); // RGBA

// ---------- helpers de "pintura" ----------
function set(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}
function rect(x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c[0], c[1], c[2], c[3] ?? 255);
}
function circle(cx, cy, rad, c, hollow = 0) {
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++)
    for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rad && (!hollow || d >= rad - hollow)) set(x, y, c[0], c[1], c[2], c[3] ?? 255);
    }
}

// ---------- dibujo: fondo + placa + fans ----------
// Fondo degradado "feo" (barra marrón abajo, azul arriba): estética del juego.
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const t = y / H;
  set(x, y, Math.round(20 + 30 * t), Math.round(22 + 18 * t), Math.round(38 + 10 * t));
}
const red = [210, 45, 45], silver = [188, 195, 205], dark = [30, 32, 38];
const fan = [60, 66, 78], hub = [150, 160, 170], pink = [255, 90, 190], gold = [212, 175, 55], cyan = [70, 220, 220];

rect(24, 176, 208, 26, silver);            // PCB
rect(24, 176, 208, 4, [220, 228, 238]);   // borde PCB
rect(34, 74, 188, 108, red);              // shroud rojo
rect(34, 74, 188, 6, [240, 90, 90]);      // brillo superior
rect(46, 86, 70, 84, dark);               // hueco fan 1
rect(140, 86, 70, 84, dark);              // hueco fan 2
circle(81, 128, 33, fan, 6);              // aspas (anillos = palas estilizadas)
circle(175, 128, 33, fan, 6);
circle(81, 128, 11, hub);
circle(175, 128, 11, hub);
rect(16, 66, 12, 138, silver);            // bracket metálico
rect(20, 70, 6, 30, cyan);                // ventilación bracket
rect(60, 202, 120, 10, gold);             // dedos PCIe
for (let i = 0; i < 8; i++) rect(64 + i * 15, 202, 2, 10, dark); // muescas PCIe
for (let i = 0; i < 3; i++) set(52 + i * 8, 60, ...pink);         // LED frontal
for (let i = 0; i < 3; i++) rect(50 + i * 8, 58, 4, 4, pink);
// "neuronas" flotando: chispa de IA saliendo de la placa
circle(206, 40, 7, cyan); circle(230, 62, 5, pink); circle(190, 22, 4, [255, 220, 90]);

// ---------- codificador PNG ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
// filtros scanline = 0 (sin comprimir inteligentemente; zlib hace el resto)
const raw = Buffer.alloc(H * (W * 4 + 1));
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const out = path.join(__dirname, '..', 'build');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.png'), png);
console.log('[gen-icon] build/icon.png generado ✔');
