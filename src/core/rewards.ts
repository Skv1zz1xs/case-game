// Награды: за время в игре, ежедневный дроп (2 из 4), колесо, задания. Состояние — в профиле.
import * as E from '../config/economy';
import { CASES, SkinDef } from '../data/cases';
import { Item } from './items';
import { mulberry32, hashStr, weighted } from './rng';
import { itemWithPrice } from './upgrade';
import type { Game } from './store';

const ALL = CASES.flatMap((c) => c.skins).filter((s) => s.rarity !== 'contraband');

// Предмет-награда примерно нужной стоимости (детерминированно по seed)
export function rewardItem(value: number, seed: number, ts: number, src: Item['src'] = 'pass'): Item {
  const r = mulberry32(seed);
  const near = ALL.filter((s) => s.base > value * 0.6 && s.base < value * 1.6);
  const skin: SkinDef = near.length ? near[Math.floor(r() * near.length)] : ALL[Math.floor(r() * ALL.length)];
  return itemWithPrice(skin, value, r, src, ts);
}

// ——— время в игре ———
export function playtime(g: Game) {
  const pt = g.p.play;
  return E.PLAYTIME_REWARDS.map((x, i) => ({ ...x, ready: pt.secs >= x.min * 60 && !pt.got[i], got: pt.got[i], left: Math.max(0, x.min * 60 - pt.secs) }));
}
export function tickPlay(g: Game, secs: number) {
  g.p.play = { ...g.p.play, secs: Math.min(g.p.play.secs + secs, 60 * 60) };
}
export function claimPlay(g: Game, i: number): number {
  const st = playtime(g)[i];
  if (!st.ready) throw new Error('Ещё рано');
  const got = [...g.p.play.got]; got[i] = true;
  g.p.play = { ...g.p.play, got };
  g.addCoins(st.coins);
  // весь цикл забран — начинаем новый
  if (got.every(Boolean)) g.p.play = { secs: 0, got: got.map(() => false) };
  g.emit('reward', { kind: 'play' });
  g.commit();
  return st.coins;
}

// ——— ежедневный дроп ———
export const dropWindow = (t: number) => Math.floor(t / (E.DAILY_DROP_HOURS * 3600000));
const offerCache = new Map<string, Item[]>();
export function dropOffer(g: Game): { win: number; items: Item[]; picked: number[]; ends: number } {
  const win = dropWindow(g.now());
  const ck = g.p.nick + ':' + win;
  const r = mulberry32(hashStr(ck));
  const items = offerCache.get(ck) ?? [0, 1, 2, 3].map((k) => {
    const [lo, hi] = E.DAILY_DROP_VALUE;
    const v = Math.round(lo + (hi - lo) * Math.pow(r(), 1.6));
    return rewardItem(v, hashStr(`${g.p.nick}:${win}:${k}`), win * E.DAILY_DROP_HOURS * 3600000, 'pass');
  });
  if (offerCache.size > 50) offerCache.clear();
  offerCache.set(ck, items);
  const picked = g.p.drop.win === win ? g.p.drop.picked : [];
  return { win, items, picked, ends: (win + 1) * E.DAILY_DROP_HOURS * 3600000 };
}
export function pickDrop(g: Game, k: number): Item {
  const o = dropOffer(g);
  if (o.picked.includes(k)) throw new Error('Уже забрано');
  if (o.picked.length >= E.DAILY_DROP_PICK) throw new Error('Можно забрать только 2');
  const it = { ...o.items[k], id: o.items[k].id + ':' + o.win, ts: g.now() };
  g.p.drop = { win: o.win, picked: [...o.picked, k] };
  g.addItems([it]);
  g.emit('reward', { kind: 'drop' });
  g.commit();
  return it;
}

// ——— колесо ———
export function wheelReady(g: Game) { return g.now() >= g.p.wheelAt; }
export function spinWheel(g: Game): { index: number; coins?: number; item?: Item } {
  if (!wheelReady(g)) throw new Error('Колесо ещё не готово');
  const seg = weighted(g.rng, E.WHEEL_SEGMENTS);
  const index = E.WHEEL_SEGMENTS.indexOf(seg);
  g.p.wheelAt = g.now() + E.WHEEL_COOLDOWN_MS;
  let res: { index: number; coins?: number; item?: Item } = { index };
  if (seg.skin) {
    const it = rewardItem(seg.value, Math.floor(g.rng() * 2 ** 31), g.now(), 'pass');
    g.addItems([it]); res = { index, item: it };
  } else { g.addCoins(seg.value); res = { index, coins: seg.value }; }
  g.emit('reward', { kind: 'wheel' });
  g.commit();
  return res;
}

// ——— задания ———
export interface QuestDef { id: string; text: string; goal: number; coins: number; diff: 'легко' | 'средне' | 'сложно'; ev: string; test?: (d: any) => number }
const QUEST_POOL: QuestDef[] = [
  { id: 'open10', text: 'Открой 10 кейсов', goal: 10, coins: 80, diff: 'легко', ev: 'open', test: (d) => d.n },
  { id: 'open30', text: 'Открой 30 кейсов', goal: 30, coins: 200, diff: 'средне', ev: 'open', test: (d) => d.n },
  { id: 'up2', text: 'Выиграй 2 апгрейда', goal: 2, coins: 100, diff: 'легко', ev: 'upgrade', test: (d) => (d.win ? 1 : 0) },
  { id: 'up5x', text: 'Выиграй апгрейд x5 или выше', goal: 1, coins: 180, diff: 'сложно', ev: 'upgrade', test: (d) => (d.win && d.mult >= 5 ? 1 : 0) },
  { id: 'contract', text: 'Подпиши контракт', goal: 1, coins: 100, diff: 'средне', ev: 'contract', test: () => 1 },
  { id: 'free3', text: 'Открой 3 бесплатных кейса', goal: 3, coins: 70, diff: 'легко', ev: 'free', test: () => 1 },
  { id: 'spend2k', text: 'Потрать 2 000 на кейсы', goal: 2000, coins: 120, diff: 'средне', ev: 'spend', test: (d) => d },
  { id: 'rare', text: 'Выбей предмет «Засекреченное» или выше', goal: 1, coins: 200, diff: 'сложно', ev: 'open', test: (d) => d.items.filter((i: Item) => E.rarityIndex(i.rarity) >= 4).length },
  { id: 'wheel', text: 'Крутани колесо', goal: 1, coins: 40, diff: 'легко', ev: 'reward', test: (d) => (d.kind === 'wheel' ? 1 : 0) },
];
export const questWindow = (t: number) => Math.floor(t / (E.QUEST_HOURS * 3600000));
export function quests(g: Game) {
  const win = questWindow(g.now());
  const r = mulberry32(hashStr(g.p.nick + ':q' + win));
  const pool = QUEST_POOL.slice();
  const list: QuestDef[] = [];
  for (const diff of ['легко', 'средне', 'сложно'] as const) {
    const c = pool.filter((q) => q.diff === diff);
    list.push(c[Math.floor(r() * c.length)]);
  }
  const st = g.p.quests.win === win ? g.p.quests : { win, prog: {}, got: [] as string[] };
  return { win, ends: (win + 1) * E.QUEST_HOURS * 3600000, list: list.map((q) => ({ ...q, prog: Math.min(q.goal, st.prog[q.id] ?? 0), got: st.got.includes(q.id) })) };
}
export function questEvent(g: Game, ev: string, data: any) {
  const q = quests(g);
  let changed = false;
  const st = g.p.quests.win === q.win ? { ...g.p.quests, prog: { ...g.p.quests.prog } } : { win: q.win, prog: {} as Record<string, number>, got: [] as string[] };
  for (const x of q.list) {
    if (x.ev !== ev || x.got) continue;
    const add = x.test ? x.test(data) : 1;
    if (add > 0) { st.prog[x.id] = Math.min(x.goal, (st.prog[x.id] ?? 0) + add); changed = true; }
  }
  if (changed) g.p.quests = st;
}
export function claimQuest(g: Game, id: string): number {
  const q = quests(g).list.find((x) => x.id === id);
  if (!q || q.got || q.prog < q.goal) throw new Error('Задание не выполнено');
  g.p.quests = { ...g.p.quests, got: [...g.p.quests.got, id] };
  g.addCoins(q.coins);
  g.commit();
  return q.coins;
}
