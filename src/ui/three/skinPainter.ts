// Генератор текстур скинов на canvas: многослойные «дорогие» покрытия.
// Всё процедурное и своё. Результат: цвет (RGB) + карта покрытия (A: 0 мат … 1 зеркальный металл).
import type { Finish } from '../../data/cases';
import { mulberry32, Rng } from '../../core/rng';

// ——— шум ———
function makeNoise(seed: number) {
  const r = mulberry32(seed);
  const P = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const G = Array.from({ length: 256 }, () => { const a = r() * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const dot = (h: number, x: number, y: number) => G[h][0] * x + G[h][1] * y;
  const n2 = (x: number, y: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const a = P[P[X] + Y], b = P[P[X + 1] + Y], c = P[P[X] + Y + 1], d = P[P[X + 1] + Y + 1];
    const x1 = dot(a, xf, yf) + u * (dot(b, xf - 1, yf) - dot(a, xf, yf));
    const x2 = dot(c, xf, yf - 1) + u * (dot(d, xf - 1, yf - 1) - dot(c, xf, yf - 1));
    return x1 + v * (x2 - x1); // ~[-0.7, 0.7]
  };
  const fbm = (x: number, y: number, oct = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f); f *= 2.02; a *= 0.5; } return s; };
  return { n2, fbm };
}

type RGB = [number, number, number];
const hex = (h: string): RGB => { const v = h.replace('#', ''); return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]; };
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ramp = (stops: RGB[], t: number): RGB => { t = clamp01(t) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(t)); return mix(stops[i], stops[i + 1], t - i); };
const hsl = (h: number, s: number, l: number): RGB => {
  const k = (n: number) => (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
};

// Покрытие стиля: 0 — мат, 0.5 — лак, 1 — металлик
export const FINISH_KIND: Record<string, number> = {
  anodized: 1, fade: 0.95, galaxy: 0.9, hologram: 1, damascus: 1, marble: 0.6, lava: 0.5, circuit: 0.7,
  carbon: 0.6, graphic: 0.5, flames: 0.55, retrowave: 0.55, beast: 0.5, splatter: 0.45, acid: 0.55, lowpoly: 0.6,
  neongrid: 0.6, ornament: 0.8, halftone: 0.4, tiger: 0.3, stripes: 0.35, camo: 0.1, digital: 0.15, solid: 0.4,
  photo: 0.2, photocamo: 0.1, topo: 0.3, crystal: 1, kintsugi: 0.7, scales: 0.85, honeycomb: 0.6, swirl: 0.75, splinter: 0.15,
};

// Повторяющиеся узоры красятся на каждой детали отдельно (со сдвигом), сюжетные — цельно
export const PER_PART = new Set(['photo', 'photocamo', 'camo', 'digital', 'carbon', 'damascus', 'honeycomb', 'scales', 'splinter', 'stripes', 'tiger', 'topo', 'ornament', 'halftone', 'circuit', 'neongrid']);

// Попиксельные стили (на шуме)
function pixelStyle(style: string, f: Finish, W: number, H: number, rng: Rng): ImageData {
  const { fbm, n2 } = makeNoise(f.seed);
  const [A, B, C] = f.colors.map(hex) as RGB[];
  const img = new ImageData(W, H);
  const d = img.data;
  const sx = 6 / W;
  const off = rng() * 100;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x * sx + off, v = y * sx;
      let c: RGB;
      switch (style) {
        case 'fade': { // металлический фейд с плавной волной
          const t = x / W + 0.12 * fbm(u * 0.5, v * 0.5, 3);
          c = ramp([A, C, B, mix(B, [255, 255, 255], 0.3)], t);
          break;
        }
        case 'anodized': { // насыщенный «леденец» с брашированными полосами
          const streak = n2(u * 0.15, v * 40) * 0.5 + n2(u * 0.4, v * 90) * 0.25;
          c = mix(A, B, clamp01(0.5 + 0.8 * fbm(u * 0.4, v * 0.4, 3)));
          c = mix(c, [255, 255, 255], clamp01(streak * 0.35 + 0.05));
          break;
        }
        case 'galaxy': { // туманность: облака трёх цветов + звёзды
          const n1 = fbm(u * 0.6, v * 0.6), n3 = fbm(u * 1.3 + 9, v * 1.3 + 4, 4);
          c = mix([8, 6, 22], A, smooth(-0.05, 0.45, n1));
          c = mix(c, C, smooth(0.05, 0.5, n3) * 0.85);
          c = mix(c, B, smooth(0.25, 0.6, fbm(u * 2 + 3, v * 2, 3)) * 0.6);
          const st = n2(x * 0.9, y * 0.9);
          if (st > 0.62) c = mix(c, [255, 255, 255], (st - 0.62) * 6);
          break;
        }
        case 'marble': { // мраморный фейд: прожилки
          const vein = Math.abs(Math.sin((u * 1.2 + fbm(u * 0.8, v * 0.8, 6) * 4) * Math.PI));
          const base = ramp([A, C, B], x / W + fbm(u * 0.3, v * 0.3, 2) * 0.2);
          c = mix(base, [20, 18, 26], Math.pow(1 - vein, 10) * 0.85);
          c = mix(c, [255, 255, 255], Math.pow(vein, 40) * 0.5);
          break;
        }
        case 'damascus': { // дамасская сталь: слои металла
          const w = Math.sin((v * 7 + fbm(u * 0.9, v * 0.9, 5) * 3.5) * Math.PI * 2);
          const t = 0.5 + 0.5 * w;
          c = mix(mix([60, 64, 72], [205, 212, 222], t), A, 0.25);
          break;
        }
        case 'lava': { // лава: тёмная корка и светящиеся трещины
          const n1 = fbm(u * 0.9, v * 0.9);
          const crack = Math.pow(clamp01(1 - Math.abs(n1) * 6), 3);
          c = mix([22, 14, 12], [50, 30, 24], clamp01(fbm(u * 3, v * 3, 3) + 0.5));
          c = mix(c, ramp([A, B, [255, 236, 160]], crack), crack);
          break;
        }
        case 'acid': { // кислотные потёки сверху вниз
          const drip = fbm(u * 2.2, v * 0.25, 4) + (1 - y / H) * 0.6 - 0.35;
          const rim = smooth(0.0, 0.06, drip) - smooth(0.06, 0.14, drip);
          c = mix(B, A, smooth(0.0, 0.05, drip));
          c = mix(c, C, clamp01(rim * 1.5));
          c = mix(c, [255, 255, 255], Math.max(0, n2(x * 0.3, y * 0.3) - 0.55) * 2);
          break;
        }
        case 'hologram': { // переливающаяся голограмма
          const h = (x / W) * 1.4 + fbm(u * 0.5, v * 0.5, 3) * 0.6 + y / H * 0.3;
          c = hsl(((h % 1) + 1) % 1, 0.85, 0.6);
          c = mix(c, A, 0.2);
          break;
        }
        case 'topo': { // топографические линии
          const h = fbm(u * 0.5, v * 0.5, 5) * 6;
          const line = 1 - smooth(0.0, 0.12, Math.abs(h - Math.round(h)));
          c = mix(A, B, clamp01(0.5 + fbm(u * 0.2, v * 0.2, 2)));
          c = mix(c, C, line * 0.9);
          break;
        }
        case 'kintsugi': { // тёмная керамика, трещины залиты золотом
          const n1 = Math.abs(fbm(u * 0.8, v * 0.8, 6)), n3 = Math.abs(fbm(u * 1.7 + 20, v * 1.7, 5));
          const crack = Math.max(1 - smooth(0.0, 0.03, n1), (1 - smooth(0.0, 0.02, n3)) * 0.8);
          c = mix([18, 18, 22], A, 0.18 + 0.1 * fbm(u * 3, v * 3, 2));
          c = mix(c, mix([255, 200, 90], [255, 236, 170], crack), crack);
          break;
        }
        case 'swirl': { // гидрографика: закрученные разводы краски
          const wx = fbm(u * 0.4, v * 0.4, 4) * 3, wy = fbm(u * 0.4 + 7, v * 0.4 + 3, 4) * 3;
          const t = 0.5 + 0.5 * Math.sin((u * 0.6 + wx) * 3 + (v * 0.6 + wy) * 2);
          c = ramp([A, B, C, A], t);
          c = mix(c, [255, 255, 255], Math.pow(t, 18) * 0.6);
          break;
        }
        case 'crystal': { // самоцвет: грани (ячейки Вороного) с бликами по краям граней
          let d1 = 9, d2 = 9, id = 0;
          const gx = u * 1.6, gy = v * 1.6, cx = Math.floor(gx), cy = Math.floor(gy);
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
            const hx = cx + i, hy = cy + j;
            const h = Math.sin(hx * 127.1 + hy * 311.7) * 43758.5453;
            const px = hx + (h - Math.floor(h)), py = hy + ((h * 1.7) - Math.floor(h * 1.7));
            const dd = (gx - px) ** 2 + (gy - py) ** 2;
            if (dd < d1) { d2 = d1; d1 = dd; id = h - Math.floor(h); } else if (dd < d2) d2 = dd;
          }
          const edge = 1 - smooth(0.0, 0.08, Math.sqrt(d2) - Math.sqrt(d1));
          c = ramp([B, A, C], id);
          c = mix(c, [255, 255, 255], edge * 0.45);
          c = mix(c, mix(A, [255, 255, 255], 0.3), Math.pow(1 - Math.sqrt(d1), 6) * 0.25);
          break;
        }
        case 'camo': { // многослойный камуфляж с рваными краями
          const l1 = fbm(u * 0.7, v * 0.7, 5), l2 = fbm(u * 0.7 + 50, v * 0.7, 5), l3 = fbm(u * 1.1 + 90, v * 1.1, 5);
          c = A;
          if (l1 > 0.06) c = B;
          if (l2 > 0.12) c = C;
          if (l3 > 0.2) c = [28, 28, 26];
          c = mix(c, [0, 0, 0], clamp01(fbm(u * 8, v * 8, 2) * 0.3 + 0.05));
          break;
        }
        default: c = A;
      }
      const i = (y * W + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
  return img;
}

const PIXEL = new Set(['fade', 'anodized', 'galaxy', 'marble', 'damascus', 'lava', 'acid', 'hologram', 'camo', 'topo', 'kintsugi', 'swirl', 'crystal']);

// Векторные стили (рисунок поверх шумовой базы)
function vectorStyle(style: string, f: Finish, g: CanvasRenderingContext2D, W: number, H: number, r: Rng) {
  const [a, b, c] = f.colors;
  const S = W / 200; // единица = 1/200 ширины
  g.save();
  switch (style) {
    case 'flames': {
      g.fillStyle = b; g.fillRect(0, 0, W, H);
      for (let k = 0; k < 3; k++) {
        const grad = g.createLinearGradient(0, H, W * 0.8, 0);
        grad.addColorStop(0, k === 2 ? '#fff6c8' : c); grad.addColorStop(0.5, a); grad.addColorStop(1, '#ffe9a8');
        g.fillStyle = grad; g.strokeStyle = '#120806'; g.lineWidth = 2.5 * S;
        g.beginPath(); g.moveTo(-10, H);
        for (let x = -10; x <= W + 30; x += 22 * S) {
          const h = H * (0.35 + 0.35 * r()) * (1 - k * 0.22);
          g.quadraticCurveTo(x + 6 * S, H - h * 0.55, x + 11 * S, H - h);
          g.quadraticCurveTo(x + 14 * S, H - h * 0.5, x + 22 * S, H - h * 0.3);
        }
        g.lineTo(W + 30, H); g.closePath(); g.fill(); if (k < 2) g.stroke();
      }
      break;
    }
    case 'graphic': case 'splatter': { // стикербомб: брызги, капли, «теги»-каракули, полосы
      g.fillStyle = b; g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.9;
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? a : c; g.save(); g.translate(W / 2, H / 2); g.rotate(-0.35); g.fillRect(-W, (i - 2) * 22 * S, W * 2, 9 * S); g.restore(); }
      for (let i = 0; i < 18; i++) {
        const cx = r() * W, cy = r() * H, rr = (4 + r() * 12) * S, col = [a, c, '#111', '#fff'][i % 4];
        g.fillStyle = col; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill();
        for (let k = 0; k < 9; k++) { const an = r() * 6.28, dd = rr + r() * 18 * S; g.beginPath(); g.arc(cx + Math.cos(an) * dd, cy + Math.sin(an) * dd, (0.6 + r() * 2.4) * S, 0, 7); g.fill(); }
        if (r() > 0.5) { g.fillRect(cx - 1.5 * S, cy, 3 * S, rr * (1 + r() * 3)); g.beginPath(); g.arc(cx, cy + rr * (1 + r() * 3), 2.4 * S, 0, 7); g.fill(); }
      }
      g.strokeStyle = '#0b0b10'; g.lineWidth = 2.2 * S; g.lineCap = 'round';
      for (let i = 0; i < 6; i++) { let x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.3) * 14 * S; y += (r() - 0.5) * 10 * S; g.lineTo(x, y); } g.stroke(); }
      break;
    }
    case 'beast': { // своё существо: рог, глаз, пасть, когтистые полосы
      const grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, b); grad.addColorStop(1, '#0b0b10');
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? a : '#0b0b10'; g.beginPath(); const x = i * 26 * S - 20 * S; g.moveTo(x, 0); g.lineTo(x + 14 * S, 0); g.lineTo(x - 18 * S, H); g.lineTo(x - 34 * S, H); g.closePath(); g.fill(); }
      const fx = W * (0.35 + r() * 0.3), fy = H * 0.5, R = H * 0.36;
      g.fillStyle = c; g.strokeStyle = '#0b0b10'; g.lineWidth = 3 * S;
      g.beginPath(); g.ellipse(fx, fy, R * 1.25, R, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = a; g.beginPath(); g.moveTo(fx - R * 0.6, fy - R * 0.7); g.quadraticCurveTo(fx - R * 1.4, fy - R * 1.9, fx - R * 0.2, fy - R * 1.6); g.closePath(); g.fill(); g.stroke();
      for (const ex of [-0.45, 0.45]) {
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(fx + ex * R, fy - R * 0.25, R * 0.28, R * 0.18, ex * 0.6, 0, 7); g.fill(); g.stroke();
        g.fillStyle = '#e8102c'; g.beginPath(); g.arc(fx + ex * R, fy - R * 0.25, R * 0.09, 0, 7); g.fill();
      }
      g.fillStyle = '#3a0010'; g.beginPath(); g.moveTo(fx - R * 0.8, fy + R * 0.2); g.quadraticCurveTo(fx, fy + R * 1.05, fx + R * 0.8, fy + R * 0.2); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff';
      for (let i = 0; i < 9; i++) { const tx = fx - R * 0.72 + i * R * 0.18; g.beginPath(); g.moveTo(tx, fy + R * 0.22); g.lineTo(tx + R * 0.09, fy + R * (i % 2 ? 0.48 : 0.42)); g.lineTo(tx + R * 0.18, fy + R * 0.22); g.fill(); }
      break;
    }
    case 'retrowave': {
      const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#16052e'); grad.addColorStop(0.6, b); grad.addColorStop(1, '#05010f');
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
      const sx = W * (0.3 + r() * 0.4), sr = H * 0.32;
      const sg = g.createLinearGradient(0, H * 0.15, 0, H * 0.8); sg.addColorStop(0, '#ffe066'); sg.addColorStop(1, a);
      g.fillStyle = sg; g.beginPath(); g.arc(sx, H * 0.5, sr, 0, 7); g.fill();
      g.fillStyle = '#16052e'; for (let i = 0; i < 6; i++) g.fillRect(sx - sr, H * 0.5 + i * sr * 0.16, sr * 2, sr * (0.03 + i * 0.015));
      g.strokeStyle = c; g.lineWidth = 1.2 * S; g.shadowColor = c; g.shadowBlur = 8 * S;
      for (let i = 0; i < 10; i++) { const y = H * 0.62 + i * i * H * 0.006; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * W * 0.02, H * 0.62); g.lineTo(W / 2 + i * W * 0.12, H); g.stroke(); }
      break;
    }
    case 'lowpoly': {
      const cols = [a, b, c].map(hex);
      const N = 16, M = 6, pts: number[][][] = [];
      for (let j = 0; j <= M; j++) { pts.push([]); for (let i = 0; i <= N; i++) pts[j].push([i * W / N + (i && i < N ? (r() - 0.5) * W / N * 0.6 : 0), j * H / M + (j && j < M ? (r() - 0.5) * H / M * 0.6 : 0)]); }
      for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
        for (const tri of [[pts[j][i], pts[j][i + 1], pts[j + 1][i + 1]], [pts[j][i], pts[j + 1][i + 1], pts[j + 1][i]]]) {
          const base = cols[Math.floor(r() * 3)], l = 0.75 + r() * 0.45;
          g.fillStyle = `rgb(${base.map((v) => Math.min(255, v * l)).join(',')})`;
          g.beginPath(); g.moveTo(tri[0][0], tri[0][1]); g.lineTo(tri[1][0], tri[1][1]); g.lineTo(tri[2][0], tri[2][1]); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 1; g.stroke();
        }
      }
      break;
    }
    case 'carbon': { // карбоновое плетение в цвете скина: пучки нитей с бликом
      const base = hex(b), tint = hex(a);
      g.fillStyle = `rgb(${base.map((v) => v * 0.35).join(',')})`; g.fillRect(0, 0, W, H);
      const s = 5 * S;
      for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
        const k = (Math.floor(x / s) + Math.floor(y / s)) % 2;
        const gr = k ? g.createLinearGradient(x, y, x + s, y) : g.createLinearGradient(x, y, x, y + s);
        const lo = mix(base, [0, 0, 0], 0.55), hi = mix(tint, [255, 255, 255], 0.15);
        gr.addColorStop(0, `rgb(${lo.join(',')})`); gr.addColorStop(0.5, `rgb(${hi.join(',')})`); gr.addColorStop(1, `rgb(${lo.join(',')})`);
        g.fillStyle = gr; g.fillRect(x + 0.4, y + 0.4, s - 0.8, s - 0.8);
      }
      // широкий блик лака по диагонали
      const sh = g.createLinearGradient(0, 0, W, H); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.7, 'rgba(255,255,255,0)');
      g.fillStyle = sh; g.fillRect(0, 0, W, H);
      break;
    }
    case 'digital': { // пиксельный камуфляж: 4 тона, крупные блоки + мелкий «шум» по краям пятен
      const { fbm } = makeNoise(f.seed);
      const tones = [a, b, c, `rgb(${mix(hex(b), [0, 0, 0], 0.6).join(',')})`];
      const big = 6 * S, small = 3 * S;
      for (let y = 0; y < H; y += small) for (let x = 0; x < W; x += small) {
        const bx = Math.floor(x / big) * big, by = Math.floor(y / big) * big;
        let n = fbm(bx / W * 4, by / W * 4, 4);
        n += (fbm(x / W * 30, y / W * 30, 2)) * 0.12; // мелкие пиксели на границах
        g.fillStyle = tones[n > 0.2 ? 3 : n > 0.07 ? 2 : n > -0.08 ? 1 : 0];
        g.fillRect(x, y, small + 0.5, small + 0.5);
      }
      break;
    }
    case 'stripes': { // гоночные полосы с окантовкой поверх двухтонного лака
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, a); gr.addColorStop(1, `rgb(${mix(hex(a), hex(b), 0.6).join(',')})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const y0 = H * (0.32 + r() * 0.2), w1 = 7 * S, gap = 3 * S;
      for (const [yy, ww] of [[y0, w1], [y0 + w1 + gap, w1 * 0.55]] as [number, number][]) {
        g.fillStyle = '#0b0b0f'; g.fillRect(0, yy - 1.2 * S, W, ww + 2.4 * S);
        g.fillStyle = c; g.fillRect(0, yy, W, ww);
      }
      break;
    }
    case 'tiger': {
      g.fillStyle = a; g.fillRect(0, 0, W, H);
      g.fillStyle = `rgb(${mix(hex(b), [0, 0, 0], 0.65).join(',')})`;
      for (let i = 0; i < 22; i++) {
        const x = i * W / 20 + r() * 10 * S; g.beginPath(); g.moveTo(x, -5);
        g.bezierCurveTo(x + (r() - 0.5) * 30 * S, H * 0.3, x + (r() - 0.5) * 30 * S, H * 0.7, x + (r() - 0.5) * 20 * S, H + 5);
        g.lineTo(x + (3 + r() * 6) * S, H + 5);
        g.bezierCurveTo(x + 10 * S, H * 0.6, x + 8 * S, H * 0.3, x + (4 + r() * 5) * S, -5); g.closePath(); g.fill();
      }
      break;
    }
    case 'circuit': case 'neongrid': { // светящиеся дорожки и узлы на тёмной плате (без квадратов)
      const bg = mix(hex(b), [0, 0, 0], 0.75);
      g.fillStyle = `rgb(${bg.join(',')})`; g.fillRect(0, 0, W, H);
      g.strokeStyle = `rgba(${hex(a).join(',')},0.12)`; g.lineWidth = 1;
      for (let x = 0; x < W; x += 10 * S) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += 10 * S) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.lineWidth = 1.6 * S; g.shadowBlur = 8 * S; g.lineJoin = 'round';
      for (let i = 0; i < 60; i++) {
        let x = Math.round(r() * 40) * W / 40, y = Math.round(r() * 12) * H / 12;
        const col = i % 3 ? a : c; g.strokeStyle = col; g.shadowColor = col; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * W / 20; else { const d = (r() < 0.5 ? -1 : 1) * H / 6; x += d * 0.6; y += d; } g.lineTo(x, y); }
        g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(x, y, 2.4 * S, 0, 7); g.fill();
        g.fillStyle = `rgb(${bg.join(',')})`; g.beginPath(); g.arc(x, y, 1.1 * S, 0, 7); g.fill();
      }
      break;
    }
    case 'ornament': { // орнамент-завитки поверх градиента
      const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, b); gr.addColorStop(1, `rgb(${mix(hex(b), [0, 0, 0], 0.5).join(',')})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const s = 14 * S;
      g.strokeStyle = a; g.lineWidth = 1.6 * S;
      for (let y = 0; y < H + s; y += s) for (let x = 0; x < W + s; x += s) {
        g.beginPath(); g.arc(x, y, s * 0.42, 0, Math.PI); g.stroke();
        g.beginPath(); g.arc(x + s / 2, y + s / 2, s * 0.18, 0, 7); g.fillStyle = c; g.fill();
      }
      break;
    }
    case 'halftone': { // растр: точки от плотных к редким поверх градиента, акцентная полоса
      const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, b); gr.addColorStop(1, a);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const s = 6 * S;
      g.fillStyle = `rgb(${mix(hex(b), [0, 0, 0], 0.55).join(',')})`;
      for (let y = 0; y < H + s; y += s) for (let x = 0; x < W + s; x += s) {
        const rr = s * 0.48 * Math.pow(1 - x / W, 1.3);
        if (rr > 0.3) { g.beginPath(); g.arc(x + ((y / s) % 2 ? s / 2 : 0), y, rr, 0, 7); g.fill(); }
      }
      g.fillStyle = c; g.fillRect(0, H * 0.58, W, 4 * S);
      break;
    }
    case 'solid': { // двухтонный лак с плавным переходом
      const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, a); gr.addColorStop(0.55, a); gr.addColorStop(1, b);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      break;
    }
    case 'scales': { // драконья чешуя: ряды полукругов с градиентом и бликом
      g.fillStyle = '#0c0b10'; g.fillRect(0, 0, W, H);
      const s = 12 * S;
      for (let y = -s; y < H + s; y += s * 0.55) for (let x = -s; x < W + s; x += s) {
        const ox = (Math.round(y / (s * 0.55)) % 2) * s / 2;
        const gr = g.createRadialGradient(x + ox, y - s * 0.2, s * 0.05, x + ox, y, s * 0.6);
        gr.addColorStop(0, c); gr.addColorStop(0.5, a); gr.addColorStop(1, b);
        g.fillStyle = gr; g.beginPath(); g.arc(x + ox, y, s * 0.56, 0, Math.PI); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2 * S; g.stroke();
      }
      break;
    }
    case 'honeycomb': { // соты с подсветкой
      g.fillStyle = b; g.fillRect(0, 0, W, H);
      const R = 7 * S, hh = R * Math.sqrt(3);
      for (let y = 0; y < H + hh; y += hh) for (let x = 0, k = 0; x < W + R * 2; x += R * 1.5, k++) {
        const cy = y + (k % 2 ? hh / 2 : 0);
        g.beginPath(); for (let i = 0; i < 6; i++) { const an = Math.PI / 3 * i; g.lineTo(x + R * 0.88 * Math.cos(an), cy + R * 0.88 * Math.sin(an)); } g.closePath();
        const lit = r();
        g.fillStyle = lit > 0.85 ? c : a; g.globalAlpha = lit > 0.85 ? 1 : 0.55 + lit * 0.35; g.fill(); g.globalAlpha = 1;
        g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1.4 * S; g.stroke();
      }
      break;
    }
    case 'splinter': { // осколочный камуфляж: острые многоугольники
      g.fillStyle = a; g.fillRect(0, 0, W, H);
      const cols = [b, c, '#1b1d1a'];
      for (let i = 0; i < 46; i++) {
        const x = r() * W, y = r() * H, sz = (14 + r() * 30) * S, an = -0.5 + r() * 0.3;
        g.fillStyle = cols[i % 3]; g.beginPath();
        for (let k = 0; k < 4 + Math.floor(r() * 2); k++) { const t = an + k * 1.4 + r() * 0.5; g.lineTo(x + Math.cos(t) * sz * (0.4 + r()), y + Math.sin(t) * sz * 0.35 * (0.4 + r())); }
        g.closePath(); g.fill();
      }
      break;
    }
    default: { g.fillStyle = a; g.fillRect(0, 0, W, H); }
  }
  g.restore();
}

// Наклейки и надписи поверх покраски: трафаретное слово, эмблема-розетка, полосы «опасность», номер
export function decals(g: CanvasRenderingContext2D, W: number, H: number, f: Finish, word: string, tier: number) {
  const r = mulberry32(f.seed ^ 0x27d4eb2f);
  const n = tier >= 5 ? 3 : tier >= 3 ? 2 : tier >= 1 ? 1 : 0;
  const S = W / 200;
  const [a, , c] = f.colors;
  const kinds = ['word', 'roundel', 'hazard', 'number'];
  for (let i = 0; i < n; i++) {
    const k = kinds[Math.floor(r() * kinds.length)];
    // наклейки — в центральной зоне корпуса, где основные детали
    const x = W * (0.22 + r() * 0.4), y = H * (0.42 + r() * 0.25);
    g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.25);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 3 * S;
    if (k === 'word' && word) {
      g.font = `900 ${Math.round(16 * S)}px "Roboto Condensed", Arial Narrow, sans-serif`;
      g.fillStyle = r() < 0.5 ? '#f4f4f4' : '#111';
      g.strokeStyle = c; g.lineWidth = 1.2 * S;
      g.fillText(word.toUpperCase(), 0, 0); g.strokeText(word.toUpperCase(), 0, 0);
    } else if (k === 'roundel') {
      const R = 9 * S;
      g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
      g.fillStyle = c; g.beginPath(); g.arc(0, 0, R * 0.78, 0, 7); g.fill();
      g.fillStyle = a; g.beginPath(); for (let t = 0; t < 10; t++) { const rr = t % 2 ? R * 0.28 : R * 0.68, an = -Math.PI / 2 + t * Math.PI / 5; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } g.closePath(); g.fill();
    } else if (k === 'hazard') {
      g.beginPath(); g.rect(0, 0, 40 * S, 6 * S); g.clip();
      g.fillStyle = '#ffcc00'; g.fillRect(0, 0, 40 * S, 6 * S);
      g.fillStyle = '#111'; for (let t = -2; t < 12; t++) { g.beginPath(); g.moveTo(t * 5 * S, 6 * S); g.lineTo(t * 5 * S + 2.5 * S, 6 * S); g.lineTo(t * 5 * S + 8.5 * S, 0); g.lineTo(t * 5 * S + 6 * S, 0); g.fill(); }
    } else {
      g.font = `900 italic ${Math.round(16 * S)}px "Roboto Condensed", Arial Narrow, sans-serif`;
      g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 2 * S;
      const t = String(1 + Math.floor(r() * 99)).padStart(2, '0');
      g.strokeText(t, 0, 0); g.fillText(t, 0, 0);
    }
    g.restore();
  }
}

let grain: HTMLCanvasElement | null = null;
function grainTile() {
  if (grain) return grain;
  grain = document.createElement('canvas'); grain.width = grain.height = 128;
  const g = grain.getContext('2d')!, img = g.createImageData(128, 128), r = mulberry32(99);
  for (let i = 0; i < img.data.length; i += 4) { const v = 96 + r() * 64; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return grain;
}

// Финальная текстура: стиль + общая фактура (зерно, лёгкая виньетка)
// ——— Фото-фактуры (Poly Haven, CC0): реалистичные скины низких редкостей ———
export const PHOTO_TEX = ["american_walnut_veneer", "black_walnut_veneer_02", "cherry_veneer", "ash_veneer", "marble_01", "grey_cartago_01", "terrazzo_tiles", "denim_fabric", "crepe_satin", "curly_teddy_checkered", "brown_leather", "leather_white", "green_metal_rust", "rust_coarse_01", "blue_metal_plate", "painted_metal_shutter", "aerial_beach_01", "aerial_rocks_02", "aerial_grass_rock", "bark_platanus", "japanese_sycamore", "moon_01", "snow_02", "cracked_red_ground", "coral_fort_wall_01", "granite_tile_03"];
const photoCache = new Map<string, Promise<HTMLImageElement>>();
export function loadPhoto(name: string): Promise<HTMLImageElement> {
  let p = photoCache.get(name);
  if (!p) {
    const img = new Image();
    img.src = ((import.meta as any).env?.BASE_URL ?? './') + 'tex/skin/' + name + '.webp';
    p = img.decode().then(() => img);
    photoCache.set(name, p);
  }
  return p;
}
export const photoFor = (f: Finish, k = 0) => PHOTO_TEX[(f.seed + k * 7) % PHOTO_TEX.length];

// Фото-скин: фактура с тонировкой в цвет палитры; photocamo — две фактуры через рваную маску
function photoStyle(g: CanvasRenderingContext2D, W: number, H: number, f: Finish, imgs: HTMLImageElement[]) {
  const tile = (img: HTMLImageElement, sc: number) => { const pat = g.createPattern(img, 'repeat')!; pat.setTransform(new DOMMatrix().scale(sc)); return pat; };
  g.fillStyle = tile(imgs[0], W / 1400); g.fillRect(0, 0, W, H);
  // тонировка: мягкий свет цветом палитры (сохраняет фактуру)
  g.save(); g.globalCompositeOperation = 'color'; g.globalAlpha = f.style === 'photo' ? 0.1 : 0.2; g.fillStyle = f.colors[0]; g.fillRect(0, 0, W, H); g.restore();
  if (f.style === 'photocamo' && imgs[1]) {
    const m = document.createElement('canvas'); m.width = W; m.height = H;
    const mg = m.getContext('2d')!;
    const { fbm } = makeNoise(f.seed + 3);
    const id = mg.createImageData(W, H);
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const v = fbm(x / W * 4, y / W * 4, 5) > 0.04 ? 255 : 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = ((y + dy) * W + x + dx) * 4; id.data[i + 3] = v; }
    }
    mg.putImageData(id, 0, 0);
    mg.globalCompositeOperation = 'source-in'; mg.fillStyle = tile(imgs[1], W / 700); mg.fillRect(0, 0, W, H);
    mg.globalCompositeOperation = 'color'; mg.globalAlpha = 0.25; mg.fillStyle = f.colors[1]; mg.fillRect(0, 0, W, H);
    g.drawImage(m, 0, 0);
  }
}

export function paintSkin(f: Finish, W: number, H: number, word = '', tier = 0, photos: HTMLImageElement[] = []): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const r = mulberry32(f.seed ^ 0x5bd1e995);
  if ((f.style === 'photo' || f.style === 'photocamo') && photos.length) photoStyle(g, W, H, f, photos);
  else if (PIXEL.has(f.style)) g.putImageData(pixelStyle(f.style, f, W, H, r), 0, 0);
  else vectorStyle(f.style, f, g, W, H, r);
  // зерно краски: готовая плитка шума поверх (быстро, без расчёта по каждому пикселю)
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.35;
  g.fillStyle = g.createPattern(grainTile(), 'repeat')!; g.fillRect(0, 0, W, H);
  g.restore();
  finishPass(g, W, H, f, r, tier);
  decals(g, W, H, f, word, tier);
  return c;
}

// Отделка поверх любого стиля: светотень по высоте, окантовочные линии вдоль оружия
function finishPass(g: CanvasRenderingContext2D, W: number, H: number, f: Finish, r: Rng, tier: number) {
  const S = W / 200;
  const sh = g.createLinearGradient(0, 0, 0, H);
  sh.addColorStop(0, 'rgba(255,255,255,0.10)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  if (tier >= 2 && !['camo', 'digital', 'splinter'].includes(f.style)) {
    // тонкие линии-пинстрайпы в цвете акцента
    const y = H * (0.25 + r() * 0.5);
    g.strokeStyle = f.colors[2]; g.globalAlpha = 0.85; g.lineWidth = 0.9 * S;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + (r() - 0.5) * 6 * S); g.stroke();
    g.lineWidth = 0.45 * S; g.beginPath(); g.moveTo(0, y + 2.2 * S); g.lineTo(W, y + 2.2 * S + (r() - 0.5) * 6 * S); g.stroke();
    g.globalAlpha = 1;
  }
}

// Карта износа: 0 — краска цела, 1 — стёрта до металла (порог задаёт float в шейдере)
export function wearMap(seed: number, W: number, H: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H), d = img.data;
  const { fbm, n2 } = makeNoise(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = clamp01(0.5 + fbm(x / W * 9, y / W * 9, 5) * 0.9 + n2(x * 0.08, y * 0.08) * 0.15);
    const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v * 255; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
