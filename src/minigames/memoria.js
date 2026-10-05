/**
 * Memoria → "Pulso neuronal": un anillo de neuronas se ilumina en secuencia;
 * hay que repetirlo. Fácil: longitudes [3,4,5], alcanzable. Extremo: [5,6,7,8]
 * con 3 rondas perfectas obligatorias y reloj global.
 */
import { roundBar } from './_harness.js';
import { makeRng } from '../utils.js';

const NODE_COLORS = ['#ff5db1', '#4fa3ff', '#3ecf8e', '#ffb200', '#8a6bff', '#00d5d5', '#ff8a5c', '#f4f45c', '#e2e2e2'];

export default {
  id: 'memoria',
  name: 'Pulso neuronal',
  hint: 'Mirá la secuencia de chispas... y repetila exacta. Como tu profe de historia pedía.',
  timeLimit: { facil: 0, extremo: 75 },

  start(ctx) {
    const { root, hard, finish, rng } = ctx;
    const lengths = hard ? [5, 6, 7] : [3, 4, 5];
    const need = hard ? lengths.length : 2; // fácil: con 2/3 alcanza; extremo: todo perfecto
    const n = 8;

    const bar = roundBar(root);
    const cv = document.createElement('canvas');
    cv.className = 'mg-canvas';
    cv.width = 560; cv.height = 420;
    root.appendChild(cv);
    const c = cv.getContext('2d');
    const cx = 280, cy = 210, R = 150;

    // posiciones fijas de las neuronas + sinapsis decorativas
    const nodes = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: 30, glow: 0, color: NODE_COLORS[i % NODE_COLORS.length] };
    });
    const synapses = Array.from({ length: n + 3 }, () => [rng.int(0, n - 1), rng.int(0, n - 1)]).filter(([a, b]) => a !== b);

    let roundIdx = -1, passed = 0, phase = 'idle', seq = [], input = [], wrongIdx = -1;
    let raf = 0;

    const draw = (t) => {
      c.fillStyle = '#0d1018';
      c.fillRect(0, 0, 560, 420);
      // sinapsis
      c.strokeStyle = 'rgba(90,120,200,0.18)';
      c.lineWidth = 1.5;
      for (const [a, b] of synapses) {
        c.beginPath();
        c.moveTo(nodes[a].x, nodes[a].y);
        c.lineTo(nodes[b].x, nodes[b].y);
        c.stroke();
      }
      // neuronas
      for (const nd of nodes) {
        nd.glow = Math.max(0, nd.glow - 0.035);
        const g = nd.glow;
        c.beginPath();
        c.arc(nd.x, nd.y, nd.r + g * 8, 0, Math.PI * 2);
        c.fillStyle = g > 0.02 ? shade(nd.color, g) : '#1b2230';
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = shade(nd.color, 0.25 + g * 0.75);
        c.stroke();
        if (g > 0.4) { // halo
          const rg = c.createRadialGradient(nd.x, nd.y, 5, nd.x, nd.y, nd.r * 2.4);
          rg.addColorStop(0, 'rgba(255,255,255,' + 0.5 * g + ')');
          rg.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = rg;
          c.beginPath(); c.arc(nd.x, nd.y, nd.r * 2.4, 0, Math.PI * 2); c.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    const shade = (hex, k) => {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      const mix = (v) => Math.round(v + (255 - v) * k);
      return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
    };
    raf = requestAnimationFrame(draw);
    ctx.onAbort(() => cancelAnimationFrame(raf));

    const pulse = (i, dur = 380) => new Promise((res) => {
      nodes[i].glow = 1;
      ctx.audio.sfx('neuron');
      const hz = 320 + i * 70;
      const t0 = performance.now();
      const step = () => {
        if (performance.now() - t0 > dur) return res();
        requestAnimationFrame(step);
      };
      step();
    });

    const playRound = async () => {
      roundIdx++;
      if (roundIdx >= lengths.length) return done();
      const L = lengths[roundIdx];
      seq = Array.from({ length: L }, () => rng.int(0, n - 1));
      input = [];
      phase = 'show';
      bar.set(`Ronda <b>${roundIdx + 1}/${lengths.length}</b> · memorizá <b>${L}</b> pulsos ${passed >= need ? '' : `(${passed} ok)`}`);
      await wait(420);
      for (const idx of seq) {
        if (phase === 'dead') return;
        await pulse(idx);
        await wait(160);
      }
      phase = 'input';
      bar.set(`Ronda <b>${roundIdx + 1}/${lengths.length}</b> · ¡te toca! repetí ${L} pulsos`);
    };

    const wait = (ms) => new Promise((r) => ctx.after(ms, r));

    const hit = (ev) => {
      if (phase !== 'input') return;
      const rect = cv.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * (560 / rect.width);
      const y = (ev.clientY - rect.top) * (420 / rect.height);
      const i = nodes.findIndex((nd) => Math.hypot(nd.x - x, nd.y - y) < nd.r + 6);
      if (i < 0) return;
      nodes[i].glow = 1;
      ctx.audio.sfx('neuron');
      const want = seq[input.length];
      input.push(i);
      if (i !== want) {
        // error: la red neuronal hace cortocircuito
        ctx.audio.sfx('error');
        phase = 'dead';
        nodes.forEach((nd) => (nd.glow = 0.9));
        done();
        return;
      }
      if (input.length === seq.length) {
        passed++;
        phase = 'show';
        bar.set(`Ronda <b>${roundIdx + 1}</b> ✔ ¡sinapsis formada!`);
        ctx.audio.sfx('win');
        ctx.after(520, playRound);
      }
    };
    ctx.listen(cv, 'pointerdown', hit);

    const done = () => {
      phase = 'dead';
      finish({
        success: passed >= need,
        performance: passed / lengths.length,
        summary: `secuencias completadas: ${passed}/${lengths.length}`
      });
    };

    playRound();
  }
};
