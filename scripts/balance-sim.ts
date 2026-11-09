// Симуляция баланса: тысячи 2-часовых сессий со старта, на настоящем коде игры.
// Запуск: npx tsx scripts/balance-sim.ts [--n 4000] [--minutes 120] [--bonus] [--seed 1]
import { CASES, eventWindow } from '../src/data/cases';
import { Game, newProfile } from '../src/core/store';
import { mulberry32, Rng, pick } from '../src/core/rng';
import { Item, round2 } from '../src/core/items';
import { CONTRACT_SIZE, PROMO_CODES } from '../src/config/economy';
import { targetAllowed } from '../src/core/upgrade';
import * as RW from '../src/core/rewards';
const REWARDS = !process.argv.includes('--no-rewards');

const arg = (k: string, d: number) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const N = arg('n', 4000);
const MIN = arg('minutes', 120);
const SEED = arg('seed', 1);
const BONUS = process.argv.includes('--bonus'); // дейлик + все промокоды на старте
const T0 = 1_700_000_000_000;

interface Style { name: string; share: number; bet: [number, number]; upP: number; mults: number[]; keepP: number; fast: number }
const STYLES: Style[] = [
  { name: 'осторожный', share: 0.3, bet: [0.03, 0.08], upP: 0.06, mults: [1.5, 2], keepP: 0.3, fast: 0.2 },
  { name: 'обычный', share: 0.45, bet: [0.08, 0.22], upP: 0.15, mults: [2, 3, 5], keepP: 0.5, fast: 0.5 },
  { name: 'рисковый', share: 0.25, bet: [0.2, 0.6], upP: 0.3, mults: [3, 5, 10, 20, 50], keepP: 0.6, fast: 0.8 },
];
const REGULAR = CASES.filter((c) => c.cat !== 'event').sort((a, b) => a.price - b.price);
const EVENTS = CASES.filter((c) => c.cat === 'event');

const worth = (g: Game) => g.p.balance + g.p.inventory.reduce((s, i) => s + i.price, 0);

function session(seed: number) {
  const r: Rng = mulberry32(seed);
  let t = T0 + Math.floor(r() * 7 * 86400000);
  const g = new Game(newProfile('sim'), mulberry32(seed ^ 0xabcdef), () => t);
  let u = r(), style = STYLES[0];
  for (const s of STYLES) { if (u < s.share) { style = s; break; } u -= s.share; }
  if (BONUS) { g.claimDaily(); for (const k of Object.keys(PROMO_CODES)) g.redeem(k); }
  const end = t + MIN * 60000;
  let peak = worth(g), busts = 0, bustWait = 0;
  let calm = false; // после крупного выигрыша часть игроков сбавляет риск

  while (t < end) {
    // фри кейс — всегда, как только готов
    if (g.freeReady()) { g.openFree(); t += 7000; }
    if (REWARDS) {
      RW.playtime(g).forEach((x, i) => { if (x.ready) RW.claimPlay(g, i); });
      if (RW.wheelReady(g)) RW.spinWheel(g);
      const o = RW.dropOffer(g);
      for (let k = 0; k < 4 && RW.dropOffer(g).picked.length < 2; k++) if (!o.picked.includes(k)) RW.pickDrop(g, k);
      for (const q of RW.quests(g).list) if (!q.got && q.prog >= q.goal) RW.claimQuest(g, q.id);
    }
    const t0 = t;
    const fast = r() < style.fast;
    const stepMs = fast ? 3500 : 8000;

    // контракт, если накопилось 10 одной редкости
    const byR = new Map<string, Item[]>();
    for (const it of g.p.inventory) if (it.rarity !== 'contraband' && !it.locked) byR.set(it.rarity, [...(byR.get(it.rarity) ?? []), it]);
    const ready = [...byR.values()].find((l) => l.length >= CONTRACT_SIZE);
    if (ready) { g.contract(ready.slice(0, CONTRACT_SIZE).map((i) => i.id)); t += 6000; continue; }

    // апгрейд самого дорогого предмета
    if (g.p.inventory.length && r() < style.upP) {
      const it = g.p.inventory.reduce((a, b) => (b.price > a.price ? b : a));
      const m = pick(r, style.mults);
      const target = round2(it.price * m);
      if (targetAllowed(it.price, target)) { g.upgrade([it.id], 0, target); t += 6000; continue; }
    }

    // продать всё, что не держим под контракты
    const sellIds = g.p.inventory.filter((i) => !(i.rarity === 'consumer' || i.rarity === 'industrial' || i.rarity === 'milspec') || r() > style.keepP).map((i) => i.id);
    if (sellIds.length) g.sell(sellIds);

    const b = g.p.balance;
    if (b < 1) {
      // в нуле: ждём фри кейс (продаём остатки)
      if (g.p.inventory.length) { g.sell(g.p.inventory.map((i) => i.id)); continue; }
      busts++;
      const wait = Math.max(0, g.p.freeAt - t);
      bustWait += wait;
      t += wait;
      continue;
    }

    // ивент, если активен и есть лимит
    const ev = EVENTS.find((c) => eventWindow(c.id, t).active && !g.canOpen(c.id, 1) && c.price <= b * 0.5);
    if (ev && r() < 0.5) { g.open(ev.id, 1); t += stepMs; continue; }

    const n = pick(r, [1, 1, 1, 3, 5, 10]);
    const [lo, hi] = calm ? [0.02, 0.05] : style.bet;
    const budget = b * (lo + (hi - lo) * r()) / n;
    let c = REGULAR[0];
    for (const x of REGULAR) if (x.price <= budget) c = x;
    const cnt = Math.max(1, Math.min(n, Math.floor(b / c.price)));
    if (c.price * cnt > b) { t += stepMs; continue; }
    g.open(c.id, cnt);
    t += stepMs;
    const w = worth(g);
    if (w > peak) peak = w;
    if (REWARDS) RW.tickPlay(g, Math.round((t - t0) / 1000));
    if (!calm && w > 20000 && r() < 0.35) calm = true;
  }
  return { peak, final: worth(g), busts, bustWait, style: style.name, opened: g.p.stats.opened };
}

const res = [] as ReturnType<typeof session>[];
for (let i = 0; i < N; i++) res.push(session(SEED * 1_000_003 + i));
const pct = (f: (x: typeof res[0]) => boolean) => ((res.filter(f).length / N) * 100).toFixed(1) + '%';
const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

console.log(`Сессий: ${N} × ${MIN} мин${BONUS ? ' (с дейликом и промокодами)' : ''}`);
console.log(`Пик ≥10k: ${pct((x) => x.peak >= 10000)}  ≥50k: ${pct((x) => x.peak >= 50000)}  ≥100k: ${pct((x) => x.peak >= 100000)}`);
console.log(`Финал ≥10k: ${pct((x) => x.final >= 10000)}  ≥50k: ${pct((x) => x.final >= 50000)}  ≥100k: ${pct((x) => x.final >= 100000)}`);
console.log(`Медиана пика: ${Math.round(med(res.map((x) => x.peak)))}  медиана финала: ${Math.round(med(res.map((x) => x.final)))}`);
const bust = res.filter((x) => x.busts > 0);
console.log(`Сливались в ноль: ${pct((x) => x.busts > 0)}; среднее ожидание фри кейса после слива: ${bust.length ? (bust.reduce((s, x) => s + x.bustWait / x.busts, 0) / bust.length / 60000).toFixed(1) : 0} мин`);
for (const s of STYLES) {
  const l = res.filter((x) => x.style === s.name);
  const p = (f: (x: typeof res[0]) => boolean) => ((l.filter(f).length / l.length) * 100).toFixed(1) + '%';
  console.log(`  ${s.name}: пик≥10k ${p((x) => x.peak >= 10000)}, ≥50k ${p((x) => x.peak >= 50000)}, ≥100k ${p((x) => x.peak >= 100000)}, кейсов ~${Math.round(l.reduce((a, x) => a + x.opened, 0) / l.length)}`);
}
