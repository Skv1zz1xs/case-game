// Шаблоны для рисования скинов в Figma: вид сбоку, рамка = вся текстура.
// Белое — окрашиваемые детали (сюда рисуешь), серое — металл/полимер (не красится).
import { writeFileSync, mkdirSync } from 'node:fs';
import { ARTS } from '../src/ui/components/weaponArt';
const out = new URL('../public/templates/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const [key, a] of Object.entries(ARTS)) {
  const [vx, vy, vw, vh] = a.vb;
  const W = 2048, H = Math.round((2048 * vh) / vw);
  const parts = a.parts.map((p) => `<path d="${p.d}" ${p.ev ? 'fill-rule="evenodd" ' : ''}fill="${p.m === 'paint' ? '#ffffff' : '#5a5f68'}" fill-opacity="${p.m === 'paint' ? 1 : 0.6}" stroke="#ff2d7a" stroke-width="${vw / 600}"/>`).join('\n  ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${vx} ${vy} ${vw} ${vh}">
  <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#1d1f26"/>
  ${parts}
</svg>
`;
  writeFileSync(new URL(`${key}.svg`, out), svg);
}
console.log('шаблонов:', Object.keys(ARTS).length);
