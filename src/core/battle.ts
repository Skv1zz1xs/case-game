// Батлы: весь результат детерминированно выводится из seed → у всех игроков одна и та же анимация и итог.
import { caseById } from '../data/cases';
import { Item, openCase, round2 } from './items';
import { mulberry32, hashStr } from './rng';

export type BattleMode = '1v1' | '2v2' | '1v1v1' | '1v1v1v1';
export type BattleRule = 'normal' | 'crazy' | 'terminal' | 'jackpot';
export const MODE_SLOTS: Record<BattleMode, number> = { '1v1': 2, '2v2': 4, '1v1v1': 3, '1v1v1v1': 4 };
export const RULE_NAMES: Record<BattleRule, string> = { normal: 'Обычный', crazy: 'Безумный', terminal: 'Терминал', jackpot: 'Джекпот' };
export const RULE_HINT: Record<BattleRule, string> = {
  normal: 'Больше суммарный дроп — забирает всё',
  crazy: 'Выигрывает тот, у кого дроп МЕНЬШЕ',
  terminal: 'Всё решает последний кейс',
  jackpot: 'Рулетка: шанс победы пропорционален сумме дропа',
};
export const BOT_NAMES = ['Бот Вася', 'Бот Гоша', 'Бот Луна', 'Бот Шрам', 'Бот Пиксель', 'Бот Кекс'];

export interface Slot { nick: string; bot: boolean }
export interface BattleCfg { id: string; mode: BattleMode; rule: BattleRule; cases: { caseId: string; count: number }[]; seed: number; slots: Slot[]; created: number }

export const teamOf = (mode: BattleMode, slot: number) => (mode === '2v2' ? (slot < 2 ? 0 : 1) : slot);
export const roundsOf = (cfg: BattleCfg) => cfg.cases.flatMap((c) => Array.from({ length: c.count }, () => c.caseId));
export const costOf = (cfg: Pick<BattleCfg, 'cases'>) => round2(cfg.cases.reduce((s, c) => s + (caseById(c.caseId)?.price ?? 0) * c.count, 0));

export interface BattleResult {
  drops: Item[][];          // [раунд][слот]
  totals: number[];         // по слотам
  teamTotals: number[];     // по командам (для не-2v2 = по слотам)
  winnerTeam: number;
  winners: number[];        // слоты-победители
  jackpotRoll?: number;     // 0..1 для анимации рулетки
}

export function runBattle(cfg: BattleCfg): BattleResult {
  const rounds = roundsOf(cfg);
  const n = cfg.slots.length;
  const drops: Item[][] = rounds.map((cid, r) => {
    const c = caseById(cid)!;
    return Array.from({ length: n }, (_, s) => openCase(c, mulberry32(hashStr(`${cfg.seed}:${r}:${s}`)), cfg.created + r, 'battle'));
  });
  const totals = Array.from({ length: n }, (_, s) => round2(drops.reduce((a, row) => a + row[s].price, 0)));
  const teams = cfg.mode === '2v2' ? 2 : n;
  const teamTotals = Array.from({ length: teams }, (_, t) => round2(totals.reduce((a, v, s) => (teamOf(cfg.mode, s) === t ? a + v : a), 0)));
  const tie = mulberry32(hashStr(`${cfg.seed}:tie`));
  let winnerTeam = 0;
  let jackpotRoll: number | undefined;
  const pickBy = (score: (t: number) => number, better: (a: number, b: number) => boolean) => {
    let best = [0];
    for (let t = 1; t < teams; t++) {
      if (better(score(t), score(best[0]))) best = [t];
      else if (score(t) === score(best[0])) best.push(t);
    }
    return best[Math.floor(tie() * best.length)];
  };
  if (cfg.rule === 'normal') winnerTeam = pickBy((t) => teamTotals[t], (a, b) => a > b);
  else if (cfg.rule === 'crazy') winnerTeam = pickBy((t) => teamTotals[t], (a, b) => a < b);
  else if (cfg.rule === 'terminal') {
    const last = drops[drops.length - 1];
    const lastTeam = Array.from({ length: teams }, (_, t) => last.reduce((a, it, s) => (teamOf(cfg.mode, s) === t ? a + it.price : a), 0));
    winnerTeam = pickBy((t) => lastTeam[t], (a, b) => a > b);
  } else {
    const sum = teamTotals.reduce((a, b) => a + b, 0) || 1;
    jackpotRoll = tie();
    let acc = 0;
    for (let t = 0; t < teams; t++) { acc += teamTotals[t] / sum; if (jackpotRoll < acc) { winnerTeam = t; break; } winnerTeam = t; }
  }
  const winners = cfg.slots.map((_, s) => s).filter((s) => teamOf(cfg.mode, s) === winnerTeam);
  return { drops, totals, teamTotals, winnerTeam, winners, jackpotRoll };
}

// Делёж выигрыша: всё забирают победители; в 2v2 предметы делятся по очереди от дорогих к дешёвым
export function prizeFor(cfg: BattleCfg, res: BattleResult, slot: number): Item[] {
  if (!res.winners.includes(slot)) return [];
  const all = res.drops.flat().slice().sort((a, b) => b.price - a.price);
  const k = res.winners.indexOf(slot);
  return all.filter((_, i) => i % res.winners.length === k).map((it, i) => ({ ...it, id: `${it.id}:${cfg.id}:${i}` }));
}
