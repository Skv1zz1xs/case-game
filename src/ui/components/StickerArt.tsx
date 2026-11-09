// Наклейки: свои рисованные дизайны на canvas (морда существа, надпись, эмблема, пламя, сердце-бомба).
// Покрытие по редкости: бумага → голо (радужный перелив) → фольга (металлик). Белая вырубка по контуру.
import { memo, useMemo } from 'react';
import type { Finish } from '../../data/cases';
import { mulberry32 } from '../../core/rng';

const cache = new Map<string, string>();

function draw(f: Finish, name: string): string {
  const key = `${f.seed}|${f.colors.join()}|${f.tier ?? 0}|${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 360, H = 260;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const r = mulberry32(f.seed);
  const [a, b, cc] = f.colors;
  const tier = f.tier ?? 0;
  const kind = ['face', 'word', 'emblem', 'flame', 'bomb'][Math.floor(r() * 5)];
  const cx = W / 2, cy = H / 2;

  // форма наклейки (контур для вырубки)
  const shape = new Path2D();
  if (kind === 'word') { const w = 300, h = 120; shape.roundRect(cx - w / 2, cy - h / 2, w, h, 26); }
  else if (kind === 'emblem') { for (let i = 0; i < 12; i++) { const an = -Math.PI / 2 + i * Math.PI / 6, rr = i % 2 ? 92 : 112; if (i) shape.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); else shape.moveTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } shape.closePath(); }
  else shape.ellipse(cx, cy, 118, 104, 0, 0, Math.PI * 2);

  // белая вырубка с тенью
  g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 14; g.shadowOffsetY = 6;
  g.lineJoin = 'round'; g.strokeStyle = '#fbfbf8'; g.lineWidth = 22; g.stroke(shape); g.fillStyle = '#fbfbf8'; g.fill(shape); g.restore();
  g.save(); g.clip(shape);

  const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, b); grd.addColorStop(1, a);
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const ink = '#111216';

  if (kind === 'face') { // морда существа
    g.fillStyle = cc; g.strokeStyle = ink; g.lineWidth = 6;
    g.beginPath(); g.ellipse(cx, cy + 8, 80, 70, 0, 0, 7); g.fill(); g.stroke();
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * 50, cy - 40); g.lineTo(cx + sx * 78, cy - 92); g.lineTo(cx + sx * 20, cy - 58); g.closePath(); g.fillStyle = a; g.fill(); g.stroke(); }
    for (const sx of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + sx * 30, cy - 4, 20, 14, sx * 0.4, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#e8102c'; g.beginPath(); g.arc(cx + sx * 30, cy - 3, 6, 0, 7); g.fill(); }
    g.fillStyle = '#3a0010'; g.beginPath(); g.moveTo(cx - 44, cy + 26); g.quadraticCurveTo(cx, cy + 74, cx + 44, cy + 26); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { const tx = cx - 38 + i * 11; g.beginPath(); g.moveTo(tx, cy + 28); g.lineTo(tx + 5.5, cy + 42); g.lineTo(tx + 11, cy + 28); g.fill(); }
  } else if (kind === 'word') { // надпись в стиле граффити
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(r() * W, r() * H, 3 + r() * 10, 0, 7); g.fill(); }
    g.font = '900 italic 64px "Roboto Condensed", Arial Narrow, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const word = name.toUpperCase().slice(0, 9);
    let fs = 64; while (g.measureText(word).width > 260 && fs > 26) { fs -= 4; g.font = `900 italic ${fs}px "Roboto Condensed", Arial Narrow, sans-serif`; }
    g.lineWidth = 12; g.strokeStyle = ink; g.strokeText(word, cx, cy + 4);
    g.fillStyle = cc; g.fillText(word, cx, cy + 4);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText(word, cx - 2, cy + 1);
  } else if (kind === 'emblem') { // эмблема-звезда
    g.fillStyle = ink; g.beginPath(); g.arc(cx, cy, 72, 0, 7); g.fill();
    g.fillStyle = cc; g.beginPath(); for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 26 : 62; g.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } g.closePath(); g.fill();
    g.strokeStyle = cc; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 80, 0, 7); g.stroke();
  } else if (kind === 'flame') { // пламя
    for (let k = 0; k < 3; k++) {
      g.fillStyle = [a, cc, '#fff6c8'][k]; g.strokeStyle = ink; g.lineWidth = k ? 0 : 6;
      const s = 1 - k * 0.28;
      g.beginPath(); g.moveTo(cx, cy - 95 * s);
      g.bezierCurveTo(cx + 70 * s, cy - 20 * s, cx + 60 * s, cy + 70 * s, cx, cy + 80 * s);
      g.bezierCurveTo(cx - 60 * s, cy + 70 * s, cx - 70 * s, cy - 10 * s, cx - 20 * s, cy - 40 * s);
      g.bezierCurveTo(cx - 10 * s, cy - 10 * s, cx + 5 * s, cy - 60 * s, cx, cy - 95 * s); g.closePath(); g.fill(); if (!k) g.stroke();
    }
  } else { // бомба-сердце
    g.fillStyle = cc; g.strokeStyle = ink; g.lineWidth = 6;
    g.beginPath(); g.moveTo(cx, cy + 70); g.bezierCurveTo(cx - 110, cy, cx - 60, cy - 80, cx, cy - 30); g.bezierCurveTo(cx + 60, cy - 80, cx + 110, cy, cx, cy + 70); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.moveTo(cx + 30, cy - 50); g.quadraticCurveTo(cx + 60, cy - 90, cx + 90, cy - 80); g.stroke();
    g.fillStyle = '#ffd60a'; g.beginPath(); g.arc(cx + 92, cy - 82, 9, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(cx - 34, cy - 20, 14, 8, -0.6, 0, 7); g.fill();
  }
  // покрытие по редкости
  if (tier >= 2) {
    const holo = g.createLinearGradient(0, 0, W, H);
    ['#ff00e5', '#00e5ff', '#7cff00', '#ffe600', '#ff00e5'].forEach((col, i) => holo.addColorStop(i / 4, col));
    g.globalCompositeOperation = tier >= 3 ? 'color-dodge' : 'overlay'; g.globalAlpha = tier >= 3 ? 0.35 : 0.55;
    g.fillStyle = holo; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  // блик ламинации
  const sh = g.createLinearGradient(0, 0, W, H * 0.7); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.45, 'rgba(255,255,255,.35)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  g.restore();
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

export const StickerArt = memo(function StickerArt({ finish, name, big }: { finish: Finish; name: string; big?: boolean }) {
  const url = useMemo(() => draw(finish, name), [finish.seed, finish.tier, name]);
  return <div className={`art3d sticker${big ? ' big' : ''}`}><img src={url} alt="" draggable={false} /></div>;
});
