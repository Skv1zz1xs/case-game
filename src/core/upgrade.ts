// Апгрейдер: шанс = ставка / цель × EDGE в пределах [MIN, MAX]
import { UPGRADE_EDGE, UPGRADE_MIN_CHANCE, UPGRADE_MAX_CHANCE } from '../config/economy';
import { CASES, SkinDef } from '../data/cases';
import { Item, round2 } from './items';
import { Rng, uid } from './rng';

export function upgradeChance(stake: number, target: number): number {
  if (stake <= 0 || target <= 0) return 0;
  return Math.min(UPGRADE_MAX_CHANCE, Math.max(UPGRADE_MIN_CHANCE, (stake / target) * UPGRADE_EDGE));
}

// Цель допустима, только если «честный» шанс не ниже минимума (иначе минимум дал бы плюс)
export function targetAllowed(stake: number, target: number): boolean {
  return target > stake && (stake / target) * UPGRADE_EDGE >= UPGRADE_MIN_CHANCE - 1e-9;
}

const ALL_SKINS: SkinDef[] = CASES.flatMap((c) => c.skins);

// Скин, чья «нормальная» цена ближе всего к сумме (для выдачи предмета-выигрыша)
export function skinNear(value: number, rng: Rng): SkinDef {
  let best = ALL_SKINS[0], bd = Infinity;
  for (const s of ALL_SKINS) {
    const d = Math.abs(Math.log(s.base / value)) + rng() * 0.15;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export function itemWithPrice(skin: SkinDef, price: number, rng: Rng, src: Item['src'], ts: number): Item {
  // Износ подбираем так, чтобы он не противоречил цене, но цена фиксирована
  const f = Math.min(0.99, Math.max(0, (1.2 - Math.min(1.2, Math.max(0.8, price / skin.base))) / 0.4));
  return { id: uid(rng), skinId: skin.id, caseId: skin.caseId, rarity: skin.rarity, float: Math.round(f * 1e6) / 1e6, st: rng() < 0.1, price: round2(price), ts, src };
}

export function rollUpgrade(stake: number, target: number, rng: Rng): { win: boolean; chance: number; roll: number } {
  const chance = upgradeChance(stake, target);
  const roll = rng();
  return { win: roll < chance, chance, roll };
}
