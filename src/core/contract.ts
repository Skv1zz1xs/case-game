// Контракты: 10 предметов одной редкости → 1 следующей редкости из коллекций вложенного
import { CONTRACT_SIZE, CONTRACT_PAYOUT_TABLE, RARITY_ORDER, RarityId, rarityIndex } from '../config/economy';
import { CASES, caseById, SkinDef } from '../data/cases';
import { Item, round2 } from './items';
import { Rng, weighted, randRange } from './rng';
import { itemWithPrice } from './upgrade';

export function contractError(items: Item[]): string | null {
  if (items.length !== CONTRACT_SIZE) return `Нужно ровно ${CONTRACT_SIZE} предметов`;
  const r = items[0].rarity;
  if (items.some((i) => i.rarity !== r)) return 'Все предметы должны быть одной редкости';
  if (r === 'contraband') return 'Контрабанду нельзя положить в контракт';
  return null;
}

export const nextRarity = (r: RarityId): RarityId => RARITY_ORDER[Math.min(RARITY_ORDER.length - 1, rarityIndex(r) + 1)];

// Шансы коллекций: доля вложенных предметов из каждого кейса
export function contractOdds(items: Item[]): { caseId: string; share: number }[] {
  const m = new Map<string, number>();
  for (const it of items) {
    const id = caseById(it.caseId) ? it.caseId : 'novice';
    m.set(id, (m.get(id) ?? 0) + 1);
  }
  return [...m.entries()].map(([caseId, n]) => ({ caseId, share: n / items.length }));
}

export function contractValueRange(items: Item[]) {
  const sum = items.reduce((s, i) => s + i.price, 0);
  const lo = CONTRACT_PAYOUT_TABLE[0].min, hi = CONTRACT_PAYOUT_TABLE[CONTRACT_PAYOUT_TABLE.length - 1].max;
  return { sum: round2(sum), min: round2(sum * lo), max: round2(sum * hi) };
}

export function rollContract(items: Item[], rng: Rng, ts: number): Item {
  const odds = contractOdds(items);
  const caseId = weighted(rng, odds.map((o) => ({ ...o, weight: o.share }))).caseId;
  const c = caseById(caseId) ?? CASES[0];
  const nr = nextRarity(items[0].rarity);
  const list: SkinDef[] = c.skins.filter((s) => s.rarity === nr);
  const skin = list[Math.floor(rng() * list.length)];
  const sum = items.reduce((s, i) => s + i.price, 0);
  const row = weighted(rng, CONTRACT_PAYOUT_TABLE);
  return itemWithPrice(skin, sum * randRange(rng, row.min, row.max), rng, 'contract', ts);
}
