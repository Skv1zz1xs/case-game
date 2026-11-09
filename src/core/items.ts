// Предметы: выпадение, износ, StatTrak, паттерны, цена
import {
  RARITIES, RarityId, WEARS, WEAR_SPREAD, STATTRAK_CHANCE, STATTRAK_MULT, PATTERN_TIERS, PatternTier,
  FREE_CASE_TABLE, rarityIndex,
} from '../config/economy';
import { CaseDef, SkinDef, skinById } from '../data/cases';
import { Rng, hashStr, uid, randRange, weighted } from './rng';

export interface Pattern { n: number; tier: PatternTier; name: string }

export interface Item {
  id: string;
  skinId: string;
  caseId: string;
  rarity: RarityId;
  float: number;
  st: boolean;
  pattern?: Pattern;
  price: number;   // итоговая цена в монетах
  ts: number;
  src: 'case' | 'free' | 'upgrade' | 'contract' | 'battle' | 'pass' | 'secret';
  locked?: boolean; // в витрине / закреплён — не продаётся массово
}

export const round2 = (x: number) => Math.round(x * 100) / 100;

export function wearName(f: number) { return WEARS.find((w) => f <= w.max)!; }
export const wearMult = (f: number) => 1 + WEAR_SPREAD - 2 * WEAR_SPREAD * f;

// Номер паттерна 0..999 → тир по перестановке, своей для каждого скина.
// Ровно 3 супергема, 27 гемов, 120 редких, остальные обычные — совпадает с шансами из конфига.
export function patternTier(skinId: string, n: number): PatternTier {
  const h = (hashStr(skinId + '#' + n) % 1000);
  let acc = 0;
  for (const t of PATTERN_TIERS.slice().reverse()) {
    acc += Math.round(t.chance * 1000);
    if (h < acc) return t.id;
  }
  return 'normal';
}

// Перебор номеров даёт неравномерность хеша, поэтому тир берём броском, а номер подбираем под тир
export function rollPattern(skin: SkinDef, rng: Rng): Pattern {
  const tier = weighted(rng, PATTERN_TIERS.map((t) => ({ ...t, weight: t.chance }))).id;
  let n = Math.floor(rng() * 1000);
  for (let i = 0; i < 4000; i++) {
    if (patternTier(skin.id, n) === tier) break;
    n = (n + 1) % 1000;
  }
  const ph = skin.phases!;
  const name = tier === 'normal' ? ph.normal[n % ph.normal.length] : ph[tier];
  return { n, tier, name };
}

export function priceOf(skin: SkinDef, float: number, st: boolean, pattern?: Pattern): number {
  let p = skin.base * wearMult(float) * (st ? STATTRAK_MULT : 1);
  if (pattern) p *= PATTERN_TIERS.find((t) => t.id === pattern.tier)!.mult;
  return Math.max(0.01, round2(p));
}

export function makeItem(skin: SkinDef, rng: Rng, src: Item['src'], ts: number): Item {
  const float = Math.round(rng() * 1e6) / 1e6;
  const st = rng() < STATTRAK_CHANCE;
  const pattern = skin.rarity === 'rare' ? rollPattern(skin, rng) : undefined;
  return {
    id: uid(rng), skinId: skin.id, caseId: skin.caseId, rarity: skin.rarity,
    float, st, pattern, price: priceOf(skin, float, st, pattern), ts, src,
  };
}

export function rollRarity(rng: Rng): RarityId {
  let v = rng();
  for (const r of RARITIES) { v -= r.chance; if (v < 0) return r.id; }
  return 'consumer';
}

export function rollSkin(c: CaseDef, rng: Rng): SkinDef {
  const r = rollRarity(rng);
  const list = c.skins.filter((s) => s.rarity === r);
  return list[Math.floor(rng() * list.length)];
}

export function openCase(c: CaseDef, rng: Rng, ts: number, src: Item['src'] = 'case'): Item {
  return makeItem(rollSkin(c, rng), rng, src, ts);
}

// Фри кейс: сумма по таблице, предмет — ближайший по цене из всех кейсов (визуально «настоящий»)
export function rollFreeValue(rng: Rng): number {
  const row = weighted(rng, FREE_CASE_TABLE);
  return round2(randRange(rng, row.min, row.max));
}

export function itemName(it: Item): string {
  const s = skinById(it.skinId);
  if (!s) return 'Неизвестный предмет';
  return `${it.st ? 'StatTrak™ ' : ''}${s.model.name} | ${s.skin}`;
}

export function sortItems(items: Item[], by: 'price' | 'new' | 'rarity', dir: 1 | -1 = -1): Item[] {
  const a = items.slice();
  a.sort((x, y) => {
    const d = by === 'price' ? x.price - y.price
      : by === 'new' ? x.ts - y.ts
      : rarityIndex(x.rarity) - rarityIndex(y.rarity) || x.price - y.price;
    return d * dir;
  });
  return a;
}
