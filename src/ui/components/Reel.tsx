// Горизонтальная лента с замедлением и тиками
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { REEL_LENGTH, REEL_WIN_INDEX, SPIN_MS, SPIN_FAST_MS, RARITIES, rarityIndex } from '../../config/economy';
import type { CaseDef, SkinDef } from '../../data/cases';
import type { Item } from '../../core/items';
import { mulberry32, randomSeed } from '../../core/rng';
import { ItemCard } from './ItemCard';
import { sfx } from '../sound';

// Наполнитель ленты: редкие чуть чаще реального — для интриги
const TEASE = [0.42, 0.25, 0.16, 0.09, 0.045, 0.025, 0.012, 0.004];

export function fillerSkins(c: CaseDef, n: number, seed: number): SkinDef[] {
  const r = mulberry32(seed);
  const out: SkinDef[] = [];
  for (let i = 0; i < n; i++) {
    let v = r(), k = 0;
    while (k < TEASE.length - 1 && v > TEASE[k]) { v -= TEASE[k]; k++; }
    const list = c.skins.filter((s) => s.rarity === RARITIES[k].id);
    out.push(list[Math.floor(r() * list.length)] ?? c.skins[c.skins.length - 1]);
  }
  return out;
}

interface Props {
  c: CaseDef;
  winner: Item | null;
  spinKey: number;      // смена — новый прокрут
  fast?: boolean;
  compact?: boolean;
  sound?: boolean;
  tease?: boolean;      // долгое замедление для ножей и выше
  seed?: number;        // для батлов: одинаковая лента у всех
  onDone?: () => void;
}

export function Reel({ c, winner, spinKey, fast, compact, sound = true, tease, seed, onDone }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [state, setState] = useState<'idle' | 'spin' | 'done'>('idle');
  const fillSeed = useMemo(() => seed ?? randomSeed(), [spinKey, seed]);
  const cells = useMemo(() => fillerSkins(c, REEL_LENGTH, fillSeed), [c, fillSeed]);
  const cellW = Math.round(Math.max(compact ? 84 : 104, Math.min(compact ? 120 : 170, w / (compact ? 5 : 4.2))));

  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!winner || !strip.current) return;
    const el = strip.current;
    const r = mulberry32(fillSeed ^ 0x9e3779b9);
    const offset = (r() - 0.5) * 0.76 * cellW;
    const target = REEL_WIN_INDEX * cellW + cellW / 2 - w / 2 + offset;
    const dur = (fast ? SPIN_FAST_MS : SPIN_MS) + (tease && !fast ? 1700 : 0);
    const pow = tease && !fast ? 5.2 : 4;
    const t0 = performance.now();
    let raf = 0, lastCell = -1, lastTick = 0;
    setState('spin');
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, pow);
      const x = target * e;
      el.style.transform = `translate3d(${-x}px,0,0)`;
      const cell = Math.floor((x + w / 2) / cellW);
      if (cell !== lastCell) {
        lastCell = cell;
        if (sound && t - lastTick > 28) { sfx.tick(); lastTick = t; }
      }
      if (k < 1) raf = requestAnimationFrame(step);
      else { setState('done'); onDone?.(); }
    };
    el.style.transform = 'translate3d(0,0,0)';
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  const wc = winner ? RARITIES[rarityIndex(winner.rarity)].color : 'transparent';
  const big = winner && rarityIndex(winner.rarity) >= 6;
  return (
    <div ref={wrap} className={`reel-wrap${state === 'done' ? (big && tease ? ' win shake' : ' win') : ''}`} style={{ ['--wc' as any]: wc }}>
      <div className="reel-marker" />
      <div ref={strip} className="reel">
        {cells.map((s, i) => (
          <div key={i} className="cell" style={{ width: cellW }}>
            {i === REEL_WIN_INDEX && winner
              ? <ItemCard item={winner} compact={compact} />
              : <ItemCard skin={s} compact={compact} priceText="" />}
          </div>
        ))}
      </div>
    </div>
  );
}
