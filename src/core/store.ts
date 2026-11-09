// Состояние игрока и все действия экономики. Без React — используется и в UI, и в тестах.
import * as E from '../config/economy';
import { CaseDef, caseById, eventWindow, skinById } from '../data/cases';
import { FREE_CASE_TABLE } from '../config/economy';
import { FREE_SKINS } from '../data/free';
import { Item, openCase, round2 } from './items';
import { Rng, rand, uid, weighted, randRange } from './rng';
import { rollUpgrade, targetAllowed, skinNear, itemWithPrice } from './upgrade';
import { contractError, rollContractEx } from './contract';
import type { Recipe } from '../data/recipes';
import { rewardItem, questEvent } from './rewards';
import { BattleCfg, costOf, runBattle, prizeFor } from './battle';
import { hashStr } from './rng';

export type AnimMode = 'full' | 'short' | 'off';

export interface Stats {
  opened: number; spent: number; earned: number; sold: number;
  upgrades: number; upgradesWon: number; contracts: number;
  battles: number; battlesWon: number; freeOpened: number;
  best?: Item;
}

export interface Settings { sound: boolean; volume: number; anim: AnimMode; fast: boolean }

export interface Profile {
  v: number;
  nick: string;
  balance: number;
  inventory: Item[];
  stats: Stats;
  freeAt: number;                 // когда снова доступен фри кейс
  daily: { day: string; streak: number };
  promos: string[];
  xp: number;
  level: number;
  rakeback: number;               // копилка
  eventOpens: Record<string, number>; // ключ: id:начало_окна
  showcase: string[];             // id предметов в витрине (до 6)
  achievements: string[];
  recipes: string[];
  settings: Settings;
  play: { secs: number; got: boolean[] };
  drop: { win: number; picked: number[] };
  wheelAt: number;
  quests: { win: number; prog: Record<string, number>; got: string[] };
  battles: { cfg: BattleCfg; done: boolean; won?: boolean; prize?: number }[];
}

export const newProfile = (nick = ''): Profile => ({
  v: 1, nick, balance: E.START_BALANCE, inventory: [],
  stats: { opened: 0, spent: 0, earned: 0, sold: 0, upgrades: 0, upgradesWon: 0, contracts: 0, battles: 0, battlesWon: 0, freeOpened: 0 },
  freeAt: 0, daily: { day: '', streak: 0 }, promos: [], xp: 0, level: 1, rakeback: 0,
  eventOpens: {}, showcase: [], achievements: [], recipes: [],
  play: { secs: 0, got: [false, false, false] }, drop: { win: -1, picked: [] }, wheelAt: 0, quests: { win: -1, prog: {}, got: [] }, battles: [],
  settings: { sound: true, volume: 0.5, anim: 'full', fast: false },
});

export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export type Notice = { kind: 'level' | 'achievement' | 'info'; text: string };

export class Game {
  p: Profile;
  rng: Rng;
  now: () => number;
  private subs = new Set<() => void>();
  private notices: Notice[] = [];
  onNotice?: (n: Notice) => void;
  onChange?: (p: Profile) => void;
  hooks: ((ev: string, data?: unknown) => void)[] = [];

  constructor(p: Profile, rng: Rng = rand, now: () => number = () => Date.now()) {
    this.p = p; this.rng = rng; this.now = now;
  }

  subscribe(fn: () => void) { this.subs.add(fn); return () => { this.subs.delete(fn); }; }
  commit() {
    this.p = { ...this.p };
    this.onChange?.(this.p);
    this.subs.forEach((f) => f());
  }
  notify(n: Notice) { this.notices.push(n); this.onNotice?.(n); }
  emit(ev: string, data?: unknown) {
    questEvent(this, ev, data);
    this.hooks.forEach((h) => h(ev, data));
  }

  // ——— деньги и опыт ———
  addCoins(x: number) { this.p.balance = round2(this.p.balance + x); this.p.stats.earned = round2(this.p.stats.earned + x); }
  spend(x: number, rakeback = false) {
    this.p.balance = round2(this.p.balance - x);
    this.p.stats.spent = round2(this.p.stats.spent + x);
    if (rakeback) this.p.rakeback = round2(this.p.rakeback + x * E.RAKEBACK_RATE);
    this.addXp(x * E.XP_PER_COIN);
  }
  addXp(x: number) {
    this.p.xp += x;
    while (this.p.xp >= E.xpForLevel(this.p.level)) {
      this.p.xp -= E.xpForLevel(this.p.level);
      this.p.level++;
      const r = E.levelReward(this.p.level);
      this.addCoins(r);
      this.notify({ kind: 'level', text: `Уровень ${this.p.level}! +${r} монет` });
    }
  }
  addItems(items: Item[]) {
    this.p.inventory = [...items, ...this.p.inventory];
    for (const it of items) {
      if (!this.p.stats.best || it.price > this.p.stats.best.price) this.p.stats.best = it;
    }
  }

  // ——— кейсы ———
  caseAvailability(c: CaseDef): { ok: boolean; reason?: string; left?: number; ends?: number } {
    if (c.cat === 'event') {
      const w = eventWindow(c.id, this.now());
      if (!w.active) return { ok: false, reason: 'Ивент сейчас не идёт', ends: w.start };
      const used = this.p.eventOpens[`${c.id}:${w.start}`] ?? 0;
      const left = (c.limit ?? 0) - used;
      if (left <= 0) return { ok: false, reason: 'Лимит открытий исчерпан', left: 0, ends: w.end };
      return { ok: true, left, ends: w.end };
    }
    return { ok: true };
  }

  canOpen(caseId: string, n: number): string | null {
    const c = caseById(caseId);
    if (!c) return 'Нет такого кейса';
    const a = this.caseAvailability(c);
    if (!a.ok) return a.reason!;
    if (a.left !== undefined && a.left < n) return `Осталось открытий: ${a.left}`;
    if (this.p.balance < c.price * n) return 'Не хватает монет';
    return null;
  }

  open(caseId: string, n: number): Item[] {
    const err = this.canOpen(caseId, n);
    if (err) throw new Error(err);
    const c = caseById(caseId)!;
    const t = this.now();
    this.spend(c.price * n, true);
    questEvent(this, 'spend', c.price * n);
    if (c.cat === 'event') {
      const w = eventWindow(c.id, t);
      const k = `${c.id}:${w.start}`;
      this.p.eventOpens = { ...this.p.eventOpens, [k]: (this.p.eventOpens[k] ?? 0) + n };
    }
    const items: Item[] = [];
    for (let i = 0; i < n; i++) items.push(openCase(c, this.rng, t + i, 'case'));
    this.p.stats = { ...this.p.stats, opened: this.p.stats.opened + n };
    this.addItems(items);
    this.emit('open', { caseId, n, items });
    this.commit();
    return items;
  }

  // ——— фри кейс ———
  freeReady() { return this.now() >= this.p.freeAt; }
  openFree(): Item {
    if (!this.freeReady()) throw new Error('Фри кейс ещё не готов');
    const t = this.now();
    const idx = FREE_CASE_TABLE.indexOf(weighted(this.rng, FREE_CASE_TABLE));
    const row = FREE_CASE_TABLE[idx];
    const skin = FREE_SKINS[idx];
    const it: Item = {
      id: uid(this.rng), skinId: skin.id, caseId: 'free', rarity: skin.rarity,
      float: Math.round(this.rng() * 1e6) / 1e6, st: false,
      price: round2(randRange(this.rng, row.min, row.max)), ts: t, src: 'free',
    };
    this.p.freeAt = t + E.FREE_CASE_COOLDOWN_MS;
    this.p.stats = { ...this.p.stats, freeOpened: this.p.stats.freeOpened + 1 };
    this.addItems([it]);
    this.emit('free', it);
    this.commit();
    return it;
  }

  // ——— продажа ———
  sell(ids: string[]): number {
    const set = new Set(ids);
    let sum = 0;
    const keep: Item[] = [];
    for (const it of this.p.inventory) {
      if (set.has(it.id) && !it.locked) sum += it.price; else keep.push(it);
    }
    this.p.inventory = keep;
    this.p.showcase = this.p.showcase.filter((id) => !set.has(id));
    sum = round2(sum);
    this.addCoins(sum);
    this.p.stats = { ...this.p.stats, sold: round2(this.p.stats.sold + sum) };
    this.commit();
    return sum;
  }
  sellBelow(x: number): number {
    return this.sell(this.p.inventory.filter((i) => i.price < x && !i.locked).map((i) => i.id));
  }
  toggleLock(id: string) {
    this.p.inventory = this.p.inventory.map((i) => (i.id === id ? { ...i, locked: !i.locked } : i));
    this.commit();
  }
  toggleShowcase(id: string) {
    const s = this.p.showcase;
    this.p.showcase = s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-6);
    this.commit();
  }

  // ——— бонусы ———
  dailyState() {
    const today = dayKey(this.now());
    const yest = dayKey(this.now() - 86400000);
    const claimed = this.p.daily.day === today;
    const streak = claimed ? this.p.daily.streak : this.p.daily.day === yest ? this.p.daily.streak + 1 : 1;
    const day = E.STREAK_DAYS[(streak - 1) % E.STREAK_DAYS.length];
    return { claimed, streak, amount: day.value, type: day.type, dayIndex: (streak - 1) % E.STREAK_DAYS.length };
  }
  claimDaily(): number {
    const d = this.dailyState();
    if (d.claimed) throw new Error('Уже получено сегодня');
    this.p.daily = { day: dayKey(this.now()), streak: d.streak };
    if (d.type === 'skin') this.addItems([rewardItem(d.amount, hashStr(this.p.nick + ':streak:' + this.p.daily.day), this.now(), 'pass')]);
    else this.addCoins(d.amount);
    this.emit('daily');
    this.commit();
    return d.amount;
  }
  redeem(code: string): number {
    const c = code.trim().toUpperCase().replace(/Ё/g, 'Е');
    const key = Object.keys(E.PROMO_CODES).find((k) => k.replace(/Ё/g, 'Е') === c);
    if (!key) throw new Error('Такого промокода нет');
    if (this.p.promos.includes(key)) throw new Error('Промокод уже использован');
    this.p.promos = [...this.p.promos, key];
    const v = E.PROMO_CODES[key];
    this.addCoins(v);
    this.commit();
    return v;
  }
  claimRakeback(): number {
    const v = round2(this.p.rakeback);
    if (v < 1) throw new Error('В копилке меньше 1 монеты');
    this.p.rakeback = 0;
    this.addCoins(v);
    this.commit();
    return v;
  }

  // ——— апгрейдер ———
  // ставка: предметы из инвентаря + монеты; цель: сумма в монетах
  upgrade(itemIds: string[], coins: number, target: number, skinId?: string): { win: boolean; chance: number; roll: number; item?: Item } {
    const items = this.p.inventory.filter((i) => itemIds.includes(i.id));
    if (items.length !== itemIds.length) throw new Error('Предмет не найден');
    if (items.length > E.UPGRADE_MAX_ITEMS) throw new Error(`Не больше ${E.UPGRADE_MAX_ITEMS} предметов`);
    if (coins < 0 || coins > this.p.balance) throw new Error('Не хватает монет');
    const stake = round2(items.reduce((s, i) => s + i.price, 0) + coins);
    if (stake <= 0) throw new Error('Поставь предметы или монеты');
    if (!targetAllowed(stake, target)) throw new Error('Недопустимая цель');
    const t = this.now();
    const set = new Set(itemIds);
    this.p.inventory = this.p.inventory.filter((i) => !set.has(i.id));
    this.p.showcase = this.p.showcase.filter((id) => !set.has(id));
    if (coins) this.spend(coins); else this.addXp(stake * E.XP_PER_COIN * 0.5);
    const res = rollUpgrade(stake, target, this.rng);
    let item: Item | undefined;
    if (res.win) {
      item = itemWithPrice((skinId && skinById(skinId)) || skinNear(target, this.rng), target, this.rng, 'upgrade', t);
      this.addItems([item]);
    }
    this.p.stats = { ...this.p.stats, upgrades: this.p.stats.upgrades + 1, upgradesWon: this.p.stats.upgradesWon + (res.win ? 1 : 0) };
    this.emit('upgrade', { win: res.win, mult: target / stake, stake, item });
    this.commit();
    return { ...res, item };
  }

  // ——— контракты ———
  contract(itemIds: string[]): Item {
    return this.contractEx(itemIds).item;
  }
  contractEx(itemIds: string[]): { item: Item; recipe?: Recipe; first?: boolean } {
    const items = itemIds.map((id) => this.p.inventory.find((i) => i.id === id)).filter(Boolean) as Item[];
    const err = contractError(items);
    if (err) throw new Error(err);
    const set = new Set(itemIds);
    this.p.inventory = this.p.inventory.filter((i) => !set.has(i.id));
    this.p.showcase = this.p.showcase.filter((id) => !set.has(id));
    const { item: out, recipe } = rollContractEx(items, this.rng, this.now());
    this.addItems([out]);
    let first = false;
    if (recipe && !this.p.recipes.includes(recipe.id)) {
      first = true;
      this.p.recipes = [...this.p.recipes, recipe.id];
      this.notify({ kind: 'achievement', text: `Открыт секретный рецепт: «${recipe.name}»!` });
    }
    this.p.stats = { ...this.p.stats, contracts: this.p.stats.contracts + 1 };
    this.emit('contract', { items, out, recipe: recipe?.id });
    this.commit();
    return { item: out, recipe, first };
  }

  // ——— батлы (создатель играет слотом 0, остальные — боты или друзья) ———
  startBattle(cfg: BattleCfg): BattleCfg {
    const cost = costOf(cfg);
    if (!cfg.cases.length) throw new Error('Добавь хотя бы один кейс');
    if (this.p.balance < cost) throw new Error('Не хватает монет');
    this.spend(cost);
    this.p.battles = [{ cfg, done: false }, ...this.p.battles].slice(0, 30);
    this.p.stats = { ...this.p.stats, battles: this.p.stats.battles + 1 };
    this.commit();
    return cfg;
  }
  finishBattle(id: string, slot = 0) {
    const b = this.p.battles.find((x) => x.cfg.id === id);
    if (!b || b.done) return;
    const res = runBattle(b.cfg);
    const prize = prizeFor(b.cfg, res, slot);
    const won = prize.length > 0;
    if (won) this.addItems(prize);
    this.p.battles = this.p.battles.map((x) => (x.cfg.id === id ? { ...x, done: true, won, prize: prize.reduce((a, i) => a + i.price, 0) } : x));
    this.p.stats = { ...this.p.stats, battlesWon: this.p.stats.battlesWon + (won ? 1 : 0) };
    this.emit('battle', { won, items: prize });
    this.commit();
  }

  setSettings(s: Partial<Settings>) { this.p.settings = { ...this.p.settings, ...s }; this.commit(); }
  setNick(n: string) { this.p.nick = n.slice(0, 16); this.commit(); }
}

// ——— сохранение ———
const KEY = 'caseroyale.profile.v1';
export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...newProfile(), ...JSON.parse(raw) };
  } catch { /* приватный режим */ }
  return newProfile();
}
export function saveProfile(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* переполнено */ }
}
