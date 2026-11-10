// Генерация кейсов из тем: состав, цены предметов, масштаб под RTP
import {
  RARITIES, RarityId, RTP, STATTRAK_CHANCE, STATTRAK_MULT, PATTERN_TIERS,
} from '../config/economy';
import { mulberry32, hashStr, Rng } from '../core/rng';
import {
  WEAPONS, KNIVES, GLOVES, STICKER, CHARM, WeaponModel, PatternStyle, PATTERNS_BY_TIER, PHASE_NAMES,
} from './weapons';
import { THEMES, ThemeDef, GENERIC_NAMES, CaseCat } from './themes';
import { CUSTOM_SKINS } from './customSkins';
import { ALL_MODELS } from './weapons';

export interface Scheme { sec: string; acc: string; secKind: 0 | 1 | 2; accKind: 0 | 1 | 2 } // 0 мат, 1 лак, 2 металл
export interface Finish {
  style: PatternStyle;
  scheme?: Scheme;      // цвета частей: второстепенные детали и акценты
  word?: string;        // трафаретное слово-наклейка
  tier?: number;        // редкость (0..7): сколько наклеек
  image?: string;        // свой скин-картинка (из Figma): путь от корня сайта, напр. 'skins/my.png'
  colors: [string, string, string];
  seed: number;
}

export interface SkinDef {
  id: string;
  caseId: string;
  model: WeaponModel;
  skin: string;          // имя покраски
  rarity: RarityId;
  base: number;          // базовая цена в монетах (уже под RTP)
  finish: Finish;
  phases?: { normal: string[]; rare: string; gem: string; supergem: string };
  exclusive?: boolean;
}

export interface CaseDef {
  id: string;
  name: string;
  price: number;
  cat: CaseCat;
  rtp: number;
  glyph: string;
  tagline: string;
  palette: string[];
  skins: SkinDef[];
  limit?: number;
}

// Сколько разных скинов каждой редкости в кейсе
const COUNTS: Record<RarityId, number> = {
  consumer: 4, industrial: 4, milspec: 4, restricted: 3,
  classified: 2, covert: 2, rare: 3, contraband: 1,
};

const EV_STATTRAK = 1 - STATTRAK_CHANCE + STATTRAK_CHANCE * STATTRAK_MULT;
export const EV_PATTERN = PATTERN_TIERS.reduce((s, t) => s + t.chance * t.mult, 0);

// Матожидание множителей сверх базы (износ в среднем ×1)
export function modsEV(r: RarityId): number {
  return EV_STATTRAK * (r === 'rare' ? EV_PATTERN : 1);
}

function pickN<T>(rng: Rng, arr: readonly T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(a[i % a.length]);
  return out;
}

function makePhases(rng: Rng, phaseNames: typeof PHASE_NAMES) {
  return {
    normal: phaseNames.normal,
    rare: phaseNames.rare[Math.floor(rng() * phaseNames.rare.length)],
    gem: phaseNames.gem[Math.floor(rng() * phaseNames.gem.length)],
    supergem: phaseNames.supergem[Math.floor(rng() * phaseNames.supergem.length)],
  };
}

// Схема частей: второстепенные детали — тёмные/светлые/цвет темы; акценты — от простых к золоту и хрому по редкости
// Подобранные сочные палитры: половина скинов берёт их вместо палитры темы
const CURATED: [string, string, string][] = [
  ['#ff2d55', '#1a0b2e', '#ffd60a'], ['#00f5d4', '#3a0ca3', '#f72585'], ['#ff9f1c', '#2b2d42', '#e71d36'], ['#06d6a0', '#073b4c', '#ffd166'],
  ['#7209b7', '#0b0b14', '#4cc9f0'], ['#ff006e', '#3a86ff', '#ffbe0b'], ['#e63946', '#1d3557', '#f1faee'], ['#80ffdb', '#5390d9', '#6930c3'],
  ['#fb5607', '#14213d', '#fca311'], ['#d00000', '#03071e', '#ffba08'], ['#2ec4b6', '#011627', '#ff3366'], ['#b5179e', '#120f2a', '#f9c80e'],
  ['#38b000', '#081c15', '#ccff33'], ['#ef476f', '#26547c', '#ffd166'], ['#9b5de5', '#00bbf9', '#fee440'], ['#ff595e', '#1982c4', '#8ac926'],
  ['#c77dff', '#10002b', '#e0aaff'], ['#00b4d8', '#03045e', '#90e0ef'], ['#f94144', '#277da1', '#f9c74f'], ['#ffd700', '#1c1c1c', '#c0c0c0'],
];
const GOLD = '#d9a83a', CHROME = '#d5dbe3', BLACK = '#121316', GUNMETAL = '#3a3f48';
// ——— Гармоничные палитры: от базового оттенка по правилам цвета ———
const toHex = (h: number, sat: number, l: number) => {
  h = ((h % 1) + 1) % 1;
  const k = (n: number) => (n + h * 12) % 12, a = sat * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
};
const hueOf = (hex: string) => {
  const v = hex.replace('#', ''); const r = parseInt(v.slice(0, 2), 16) / 255, g = parseInt(v.slice(2, 4), 16) / 255, b = parseInt(v.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((h / 6) + 1) % 1;
};
// схемы: близкие оттенки, противоположный, триада, сплит-комплемент
const HARMONY = [[0, 0.06, -0.06], [0, 0.5, 0.04], [0, 0.333, 0.667], [0, 0.42, 0.58]];
function harmonious(rng: Rng, baseHue: number): [string, string, string] {
  const hm = HARMONY[Math.floor(rng() * HARMONY.length)];
  const s1 = 0.65 + rng() * 0.3, s2 = 0.55 + rng() * 0.35, s3 = 0.7 + rng() * 0.25;
  // основной — насыщенный средней яркости, второй — темнее, третий — светлый акцент
  return [toHex(baseHue + hm[0], s1, 0.45 + rng() * 0.12), toHex(baseHue + hm[1], s2, 0.22 + rng() * 0.14), toHex(baseHue + hm[2], s3, 0.6 + rng() * 0.15)];
}

function makeScheme(rng: Rng, pal: string[], tier: number): Scheme {
  const pk = () => pal[Math.floor(rng() * pal.length)];
  // второстепенные детали: глубокий тёмный оттенок основного цвета, графит или второй цвет палитры
  const deep = toHex(hueOf(pal[0]), 0.35 + rng() * 0.3, 0.1 + rng() * 0.06);
  const secOpts = [deep, deep, GUNMETAL, pal[1], BLACK];
  const accOpts = tier >= 5 ? [GOLD, CHROME, pk(), GOLD] : tier >= 3 ? [CHROME, pk(), GOLD, BLACK] : [BLACK, GUNMETAL, pk()];
  const sec = secOpts[Math.floor(rng() * secOpts.length)];
  const acc = accOpts[Math.floor(rng() * accOpts.length)];
  return { sec, acc, secKind: (rng() < 0.5 ? 0 : rng() < 0.6 ? 1 : 2) as 0 | 1 | 2, accKind: (acc === GOLD || acc === CHROME ? 2 : 1) as 0 | 1 | 2 };
}

export function buildCase(t: ThemeDef): CaseDef {
  const rng = mulberry32(hashStr(t.id));
  const rtp = t.rtp ?? RTP[t.cat];
  // Имена: сначала тематические (на редкие предметы), потом общие
  const generic = pickN(rng, GENERIC_NAMES, GENERIC_NAMES.length);
  const themeNames = t.names.slice();
  const nameFor = (tier: number): string => {
    if (tier >= 3 && themeNames.length) return themeNames.shift()!;
    if (tier < 3 && themeNames.length > 4) return themeNames.pop()!;
    return generic.shift() ?? 'Без имени';
  };

  const skins: SkinDef[] = [];
  RARITIES.slice().reverse().forEach((r) => {
    const tier = RARITIES.indexOf(r);
    const n = COUNTS[r.id];
    let models: WeaponModel[];
    if (r.id === 'rare') {
      const pool = t.focus === 'gloves' ? GLOVES : t.focus === 'knife' ? KNIVES : [...KNIVES, ...GLOVES];
      models = pickN(rng, pool, n);
    } else if (r.id === 'contraband') {
      models = pickN(rng, [...KNIVES, ...WEAPONS.filter((w) => w.kind === 'rifle' || w.kind === 'sniper')], n);
    } else {
      models = pickN(rng, WEAPONS, n);
      // до армейского — часть предметов наклейки (разнообразие, как в настоящих кейсах)
      if (tier <= 2) models = models.map((m, j) => (j === 0 && rng() < 0.5 ? STICKER : m));
      // брелоки — среди армейских и запрещённых
      if (tier === 2 || tier === 3) models = models.map((m, j) => (j === n - 1 && rng() < 0.6 ? CHARM : m));
    }
    models.forEach((model, i) => {
      // Базовые множители ровно распределены по диапазону редкости
      const k = n === 1 ? 0.5 : i / (n - 1);
      const mult = r.min + (r.max - r.min) * k;
      const styles = PATTERNS_BY_TIER[tier];
      // палитра скина: гармония от оттенка темы (иногда — от подобранной сочной палитры)
      const baseHue = hueOf(rng() < 0.7 ? t.palette[Math.floor(rng() * t.palette.length)] : CURATED[Math.floor(rng() * CURATED.length)][0]) + (rng() - 0.5) * 0.06;
      const pal = harmonious(rng, baseHue);
      const c = (j: number) => pal[j % 3];
      skins.push({
        id: `${t.id}:${r.id}:${i}`,
        caseId: t.id,
        model,
        skin: nameFor(tier),
        rarity: r.id,
        base: mult, // временно: множитель цены кейса
        finish: { style: styles[Math.floor(rng() * styles.length)], colors: [c(0), c(1), c(2)] as [string, string, string], seed: Math.floor(rng() * 1e9), scheme: makeScheme(rng, pal, tier), tier },
        phases: r.id === 'rare' ? makePhases(rng, PHASE_NAMES) : undefined,
      });
    });
  });

  // Масштаб под RTP: EV = Σ шанс_редкости × средняя_база × множители
  let ev = 0;
  for (const r of RARITIES) {
    const list = skins.filter((s) => s.rarity === r.id);
    const avg = list.reduce((s, x) => s + x.base, 0) / list.length;
    ev += r.chance * avg * modsEV(r.id);
  }
  const scale = (rtp * t.price) / ev;
  for (const s of skins) s.base = s.base * scale;
  // Слово-наклейка из названия скина (одно короткое слово)
  for (const sk of skins) {
    const w = sk.skin.replace(/[«»"]/g, '').split(/[\s-]+/).sort((x, y) => y.length - x.length)[0] ?? '';
    sk.finish.word = w.length <= 10 ? w : w.slice(0, 9);
  }
  // Внутри редкости — от дешёвого к дорогому
  skins.sort((a, b) => b.base - a.base);

  // Свои скины из Figma занимают место обычных той же редкости (цены не меняются)
  const used = new Set<string>();
  for (const cs of CUSTOM_SKINS.filter((x) => x.caseId === t.id)) {
    const slot = skins.find((s) => s.rarity === cs.rarity && !used.has(s.id));
    const model = ALL_MODELS.find((m) => m.id === cs.model);
    if (!slot || !model) continue;
    used.add(slot.id);
    slot.model = model; slot.skin = cs.name;
    slot.finish = { ...slot.finish, image: cs.image };
  }

  return {
    id: t.id, name: t.name, price: t.price, cat: t.cat, rtp, glyph: t.glyph,
    tagline: t.tagline, palette: t.palette, skins, limit: t.limit,
  };
}

export const CASES: CaseDef[] = THEMES.map(buildCase);
export const caseById = (id: string) => CASES.find((c) => c.id === id);

const SKIN_INDEX = new Map<string, SkinDef>();
for (const c of CASES) for (const s of c.skins) SKIN_INDEX.set(s.id, s);
export const skinById = (id: string) => SKIN_INDEX.get(id);
export function registerSkin(s: SkinDef) { SKIN_INDEX.set(s.id, s); }

// Окно ивента: 3 ивента, слоты по 6 часов, одновременно активны 2 из 3
export const EVENT_SLOT_MS = 6 * 3600 * 1000;
const EVENT_IDS = CASES.filter((c) => c.cat === 'event').map((c) => c.id);

export function eventWindow(caseId: string, now: number): { active: boolean; start: number; end: number } {
  const i = EVENT_IDS.indexOf(caseId);
  const slot = Math.floor(now / EVENT_SLOT_MS);
  const isOn = (s: number) => (((s + i) % 3) + 3) % 3 !== 2;
  if (isOn(slot)) {
    let a = slot; while (isOn(a - 1)) a--;
    let b = slot; while (isOn(b + 1)) b++;
    return { active: true, start: a * EVENT_SLOT_MS, end: (b + 1) * EVENT_SLOT_MS };
  }
  let b = slot + 1; while (!isOn(b)) b++;
  return { active: false, start: b * EVENT_SLOT_MS, end: b * EVENT_SLOT_MS };
}
