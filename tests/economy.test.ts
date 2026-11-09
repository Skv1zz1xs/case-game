import { describe, it, expect } from 'vitest';
import { CASES, modsEV, eventWindow } from '../src/data/cases';
import { RARITIES } from '../src/config/economy';
import { openCase, rollFreeValue } from '../src/core/items';
import { mulberry32 } from '../src/core/rng';
import { Game, newProfile } from '../src/core/store';

describe('кейсы', () => {
  it('минимум 40 кейсов, у всех все редкости', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(40);
    for (const c of CASES) for (const r of RARITIES) expect(c.skins.some((s) => s.rarity === r.id)).toBe(true);
  });
  it('аналитическое матожидание = RTP × цена', () => {
    for (const c of CASES) {
      let ev = 0;
      for (const r of RARITIES) {
        const l = c.skins.filter((s) => s.rarity === r.id);
        ev += r.chance * (l.reduce((a, s) => a + s.base, 0) / l.length) * modsEV(r.id);
      }
      expect(ev / c.price).toBeCloseTo(c.rtp, 6);
    }
  });
  it('Монте-Карло: отдача близка к RTP', () => {
    const rng = mulberry32(42);
    const c = CASES.find((x) => x.id === 'arsenal')!;
    let sum = 0; const N = 400000;
    for (let i = 0; i < N; i++) sum += openCase(c, rng, 0).price;
    // хвост тяжёлый (контрабанда, гемы) — допуск шире
    expect(sum / N / c.price).toBeGreaterThan(0.85);
    expect(sum / N / c.price).toBeLessThan(1.05);
  });
  it('фри кейс в среднем ≈250', () => {
    const rng = mulberry32(1);
    let s = 0; const N = 200000;
    for (let i = 0; i < N; i++) s += rollFreeValue(rng);
    expect(s / N).toBeGreaterThan(235);
    expect(s / N).toBeLessThan(265);
  });
  it('ивенты: всегда 2 из 3 активны', () => {
    const ev = CASES.filter((c) => c.cat === 'event');
    for (let t = 0; t < 7 * 86400000; t += 3600000) {
      expect(ev.filter((c) => eventWindow(c.id, t).active).length).toBe(2);
    }
  });
});

describe('экономика игрока', () => {
  it('открытие, продажа, дейлик, промокод, фри кейс', () => {
    let t = 1_700_000_000_000;
    const g = new Game(newProfile('тест'), mulberry32(5), () => t);
    const items = g.open('novice', 10);
    expect(items).toHaveLength(10);
    expect(g.p.balance).toBe(990);
    const got = g.sellBelow(1e9);
    expect(g.p.inventory).toHaveLength(0);
    expect(got).toBeGreaterThan(0);
    expect(g.claimDaily()).toBe(1000);
    expect(() => g.claimDaily()).toThrow();
    t += 86400000;
    expect(g.claimDaily()).toBe(1150);
    expect(g.redeem('старт')).toBe(500);
    expect(() => g.redeem('СТАРТ')).toThrow();
    g.openFree();
    expect(() => g.openFree()).toThrow();
    t += 5 * 60000;
    g.openFree();
    expect(g.p.stats.freeOpened).toBe(2);
  });
});

describe('апгрейдер и контракты', () => {
  it('шанс апгрейда по формуле и пределам', async () => {
    const { upgradeChance, targetAllowed } = await import('../src/core/upgrade');
    expect(upgradeChance(100, 200)).toBeCloseTo(0.475);
    expect(upgradeChance(100, 101)).toBe(0.75);
    expect(targetAllowed(100, 9500)).toBe(true);
    expect(targetAllowed(100, 9600)).toBe(false);
  });
  it('апгрейды в среднем отдают ≈95%', () => {
    let t = 0;
    const g = new Game(newProfile('u'), mulberry32(9), () => t);
    let stake = 0, got = 0;
    for (let i = 0; i < 20000; i++) {
      g.p.balance = 1e9;
      const r = g.upgrade([], 100, 300);
      stake += 100; if (r.win) got += r.item!.price;
      g.p.inventory = [];
    }
    expect(got / stake).toBeGreaterThan(0.9);
    expect(got / stake).toBeLessThan(1.0);
  });
  it('контракты отдают 95–100% вложенного', async () => {
    const { rollContract } = await import('../src/core/contract');
    const rng = mulberry32(3);
    const c = CASES.find((x) => x.id === 'arsenal')!;
    let ins = 0, outs = 0;
    for (let k = 0; k < 20000; k++) {
      const items = Array.from({ length: 10 }, () => openCase(c, rng, 0)).map((it) => ({ ...it, rarity: 'consumer' as const }));
      ins += items.reduce((s, i) => s + i.price, 0);
      const o = rollContract(items, rng, 0);
      expect(o.rarity).toBe('industrial');
      outs += o.price;
    }
    expect(outs / ins).toBeGreaterThan(0.94);
    expect(outs / ins).toBeLessThan(1.0);
  });
});

describe('секретные рецепты', () => {
  it('рецепт срабатывает и даёт эксклюзив дороже вложенного', async () => {
    const { rollContractEx } = await import('../src/core/contract');
    const rng = mulberry32(11);
    const c = CASES.find((x) => x.id === 'skibidi')!;
    const items = Array.from({ length: 10 }, () => openCase(c, rng, 0)).map((it) => ({ ...it, rarity: 'consumer' as const, st: false }));
    const sum = items.reduce((s, i) => s + i.price, 0);
    const r = rollContractEx(items, rng, 0);
    expect(r.recipe?.id).toBe('throne');
    expect(r.item.rarity).toBe('industrial');
    expect(r.item.price).toBeGreaterThanOrEqual(Math.floor(sum * 1.05 * 100) / 100 - 0.01);
  });
  it('первое открытие рецепта записывается в профиль', () => {
    const g = new Game(newProfile('r'), mulberry32(2), () => 0);
    const c = CASES.find((x) => x.id === 'student')!;
    const rng = mulberry32(4);
    g.p.inventory = Array.from({ length: 10 }, () => ({ ...openCase(c, rng, 0), rarity: 'consumer' as const, st: false }));
    const out = g.contractEx(g.p.inventory.map((i) => i.id));
    expect(out.first).toBe(true);
    expect(g.p.recipes).toContain('diploma');
  });
});

describe('батлы', () => {
  it('детерминированы по seed и честны (без комиссии)', async () => {
    const { runBattle, prizeFor, costOf } = await import('../src/core/battle');
    const cfg = { id: 'b1', mode: '2v2' as const, rule: 'normal' as const, cases: [{ caseId: 'arsenal', count: 3 }], seed: 12345, created: 0,
      slots: [{ nick: 'a', bot: false }, { nick: 'b', bot: true }, { nick: 'c', bot: true }, { nick: 'd', bot: true }] };
    const r1 = runBattle(cfg), r2 = runBattle(cfg);
    expect(r1.totals).toEqual(r2.totals);
    expect(r1.winners.length).toBe(2);
    const pot = r1.drops.flat().reduce((a, i) => a + i.price, 0);
    const paid = [0, 1, 2, 3].reduce((a, s) => a + prizeFor(cfg, r1, s).reduce((x, i) => x + i.price, 0), 0);
    expect(paid).toBeCloseTo(pot, 2);
    expect(costOf(cfg)).toBe(300);
  });
  it('«Безумный» отдаёт победу меньшему дропу', async () => {
    const { runBattle } = await import('../src/core/battle');
    const cfg = { id: 'b2', mode: '1v1' as const, rule: 'crazy' as const, cases: [{ caseId: 'arsenal', count: 2 }], seed: 7, created: 0,
      slots: [{ nick: 'a', bot: false }, { nick: 'b', bot: true }] };
    const r = runBattle(cfg);
    expect(r.totals[r.winners[0]]).toBeLessThanOrEqual(Math.max(...r.totals));
    expect(r.totals[r.winners[0]]).toBe(Math.min(...r.totals));
  });
});
