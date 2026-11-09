// Генерация кейсов из тем: состав, цены предметов, масштаб под RTP
import {
  RARITIES, RarityId, RTP, STATTRAK_CHANCE, STATTRAK_MULT, PATTERN_TIERS,
} from '../config/economy';
import { mulberry32, hashStr, Rng } from '../core/rng';
import {
  WEAPONS, KNIVES, GLOVES, WeaponModel, PatternStyle, PATTERNS_BY_TIER, PHASE_NAMES,
} from './weapons';
import { THEMES, ThemeDef, GENERIC_NAMES, CaseCat } from './themes';

export interface Finish {
  style: PatternStyle;
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
    }
    models.forEach((model, i) => {
      // Базовые множители ровно распределены по диапазону редкости
      const k = n === 1 ? 0.5 : i / (n - 1);
      const mult = r.min + (r.max - r.min) * k;
      const styles = PATTERNS_BY_TIER[tier];
      const pal = t.palette;
      const c = (j: number) => pal[(Math.floor(rng() * pal.length) + j) % pal.length];
      skins.push({
        id: `${t.id}:${r.id}:${i}`,
        caseId: t.id,
        model,
        skin: nameFor(tier),
        rarity: r.id,
        base: mult, // временно: множитель цены кейса
        finish: { style: styles[Math.floor(rng() * styles.length)], colors: [c(0), c(1), c(2)], seed: Math.floor(rng() * 1e9) },
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
  // Внутри редкости — от дешёвого к дорогому
  skins.sort((a, b) => b.base - a.base);

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
