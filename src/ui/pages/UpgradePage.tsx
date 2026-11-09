// Апгрейдер: ставка (предметы + баланс) → цель-предмет, шанс = ставка / цель × 0,95
import { useMemo, useRef, useState } from 'react';
import { UPGRADE_MAX_ITEMS, UPGRADE_EDGE } from '../../config/economy';
import { CASES, SkinDef } from '../../data/cases';
import { Item, round2, sortItems } from '../../core/items';
import { upgradeChance, targetAllowed } from '../../core/upgrade';
import { game, useProfile, fmt, toast } from '../game';
import { ItemCard } from '../components/ItemCard';
import { DropFx, FxState, playDropFx } from '../components/DropFx';
import { sfx } from '../sound';

const ALL_SKINS = CASES.flatMap((c) => c.skins).sort((a, b) => a.base - b.base);
const nearest = (v: number) => ALL_SKINS.reduce((a, b) => (Math.abs(Math.log(b.base / v)) < Math.abs(Math.log(a.base / v)) ? b : a));

// Круглая шкала: заполненная дуга = шанс, стрелка вращается к результату
function Gauge({ chance, angle, spinning, fast, state }: { chance: number; angle: number; spinning: boolean; fast: boolean; state: 'idle' | 'win' | 'lose' }) {
  const R = 92, C = 2 * Math.PI * R;
  const col = state === 'win' ? '#2fd47a' : state === 'lose' ? '#ff4d6d' : '#ff9a1f';
  return (
    <div className={`gauge ${state}`}>
      <svg viewBox="0 0 240 240">
        <defs>
          <radialGradient id="gg"><stop offset="0" stopColor="#2a2c33" /><stop offset="1" stopColor="#15161a" /></radialGradient>
        </defs>
        {Array.from({ length: 60 }, (_, i) => (
          <line key={i} x1="120" y1="6" x2="120" y2={i % 5 ? 12 : 16} stroke="rgba(255,255,255,.28)" strokeWidth="1.5" transform={`rotate(${i * 6} 120 120)`} />
        ))}
        <circle cx="120" cy="120" r={R} fill="url(#gg)" stroke="rgba(255,255,255,.08)" strokeWidth="16" />
        <circle cx="120" cy="120" r={R} fill="none" stroke={col} strokeWidth="16" strokeDasharray={`${C * chance} ${C}`}
          transform="rotate(-90 120 120)" style={{ transition: 'stroke-dasharray .35s, stroke .3s', filter: `drop-shadow(0 0 8px ${col})` }} />
        <text x="120" y="22" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.5)">100%</text>
      </svg>
      <div className="gauge-needle" style={{ transform: `rotate(${angle}deg)`, transition: spinning ? `transform ${fast ? 1.3 : 4.2}s cubic-bezier(.12,.75,.22,1)` : 'none' }}><i /></div>
      <div className="gauge-c">
        <div className="gauge-pct" style={{ color: state === 'idle' ? '#fff' : col }}>{(chance * 100).toFixed(2).replace('.', ',')}%</div>
        <div className="gauge-sub">{state === 'win' ? 'ПОБЕДА' : state === 'lose' ? 'НЕ ПОВЕЗЛО' : 'ШАНС'}</div>
      </div>
      {state !== 'idle' && !spinning && <div className={`gauge-stamp ${state}`}>{state === 'win' ? 'АПГРЕЙД!' : 'МИМО'}</div>}
      {state === 'win' && !spinning && <div className="gauge-burst" />}
    </div>
  );
}

export function UpgradePage({ onContract }: { onBack?: () => void; onContract?: () => void }) {
  const p = useProfile();
  const [sel, setSel] = useState<string[]>([]);
  const [coins, setCoins] = useState(0);
  const [target, setTarget] = useState<SkinDef | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [state, setState] = useState<'idle' | 'win' | 'lose'>('idle');
  const [won, setWon] = useState<Item | null>(null);
  const [fx, setFx] = useState<FxState | null>(null);
  const [lastChance, setLastChance] = useState(0);
  const base = useRef(0);

  const items = sel.map((id) => p.inventory.find((i) => i.id === id)).filter(Boolean) as Item[];
  const coinsUsed = Math.min(coins, p.balance);
  const stake = round2(items.reduce((s, i) => s + i.price, 0) + coinsUsed);
  const tPrice = target ? round2(target.base) : 0;
  const ok = !!target && stake > 0 && targetAllowed(stake, tPrice);
  const chance = ok ? upgradeChance(stake, tPrice) : 0;

  const mine = useMemo(() => sortItems(p.inventory.filter((i) => !i.locked), 'price', -1), [p.inventory]);
  const catalog = useMemo(() => {
    const lo = Number(from.replace(',', '.')) || 0, hi = Number(to.replace(',', '.')) || Infinity;
    return ALL_SKINS.filter((s) => s.base >= lo && s.base <= hi && (stake <= 0 || targetAllowed(stake, s.base))).slice(0, 80);
  }, [from, to, stake]);

  const toggle = (it: Item) => { setState('idle'); setSel((s) => (s.includes(it.id) ? s.filter((x) => x !== it.id) : s.length >= UPGRADE_MAX_ITEMS ? s : [...s, it.id])); };
  const pickMult = (m: number) => { if (stake > 0) { setState('idle'); setTarget(nearest(stake * m)); } };
  const pickChance = (c: number) => { if (stake > 0) { setState('idle'); setTarget(nearest((stake * UPGRADE_EDGE) / c)); } };

  const go = () => {
    if (!ok || spinning || !target) return;
    try {
      const r = game.upgrade(sel, coinsUsed, tPrice, target.id);
      sfx.whoosh();
      setLastChance(r.chance); setState('idle'); setWon(null); setSpinning(true);
      base.current += 360 * (p.settings.fast ? 3 : 6) - (base.current % 360);
      setAngle(base.current + r.roll * 360);
      setSel([]); setCoins(0);
      setTimeout(() => {
        setSpinning(false); setState(r.win ? 'win' : 'lose');
        if (r.win && r.item) { setWon(r.item); playDropFx(r.item, p.settings.anim, setFx); sfx.win(2); } else sfx.lose();
      }, p.settings.fast ? 1350 : 4250);
    } catch (e) { toast((e as Error).message, 'bad'); }
  };

  return (
    <div>
      <div className="page-tabs">
        <button className="on">⬆️ Апгрейдер</button>
        <button onClick={onContract}>📜 Контракты</button>
      </div>

      <div className="upg3">
        <div className="upg-box">
          <div className="upg-box-h"><span>Выбрано: {items.length} предмет{items.length === 1 ? '' : items.length < 5 && items.length ? 'а' : 'ов'}</span><button onClick={() => { setSel([]); setCoins(0); }}>Убрать</button></div>
          <div className="upg-box-b">
            {won && state === 'win' && !items.length ? <ItemCard item={won} /> : items.length ? (
              <div className="upg-sel">{items.map((it) => <ItemCard key={it.id} item={it} onClick={() => toggle(it)} />)}</div>
            ) : <div className="upg-empty">Выбери предметы снизу</div>}
          </div>
          <div className="upg-sum"><i className="coin" /> {fmt(stake)}</div>
        </div>

        <div className="upg-mid">
          <Gauge chance={spinning || state !== 'idle' ? lastChance : chance} angle={angle} spinning={spinning} fast={p.settings.fast} state={state} />
        </div>

        <div className="upg-box">
          <div className="upg-box-h"><span>Цель апгрейда</span><button onClick={() => setTarget(null)}>Убрать</button></div>
          <div className="upg-box-b">{target ? <ItemCard skin={target} priceText={fmt(target.base)} /> : <div className="upg-empty">Выбери предмет снизу или нажми x2 / x5 / 30%…</div>}</div>
          <div className="upg-sum">{target ? <>x{(tPrice / Math.max(stake, 0.01)).toFixed(2).replace('.', ',')}</> : '—'}</div>
        </div>

        <div className="upg-ctl glass">
          <span className="small" style={{ fontWeight: 800, lineHeight: 1.1 }}>ДОБАВИТЬ<br />БАЛАНС</span>
          <input type="range" min={0} max={Math.floor(p.balance)} value={Math.min(coins, Math.floor(p.balance))} onChange={(e) => { setState('idle'); setCoins(Number(e.target.value)); }} />
          <span className="small"><i className="coin" /> {fmt(coinsUsed)}</span>
        </div>
        <button className="btn primary upg-go" disabled={!ok || spinning} onClick={go}>{spinning ? 'Крутим…' : 'Апгрейд'}</button>
        <div className="upg-ctl glass quick">
          {[2, 5, 10].map((m) => <button key={m} className="qk" onClick={() => pickMult(m)}>x{m}</button>)}
          {[0.3, 0.5, 0.75].map((c) => <button key={c} className="qk" onClick={() => pickChance(c)}>{c * 100}%</button>)}
        </div>
      </div>

      <div className="upg-lists">
        <div className="glass upg-list">
          <div className="upg-list-h"><b>🗃 Мои предметы</b></div>
          {mine.length ? (
            <div className="item-grid">{mine.slice(0, 60).map((it) => <ItemCard key={it.id} item={it} selected={sel.includes(it.id)} onClick={() => toggle(it)} />)}</div>
          ) : <div className="empty">Инвентарь пуст — открой пару кейсов</div>}
        </div>
        <div className="glass upg-list">
          <div className="upg-list-h">
            <b>⏫ Выбери предмет</b><span className="grow" />
            <span className="small muted">Цена</span>
            <input className="input" style={{ width: 80, minHeight: 34 }} inputMode="decimal" placeholder="От" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input className="input" style={{ width: 80, minHeight: 34 }} inputMode="decimal" placeholder="До" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="item-grid">
            {catalog.map((s) => (
              <div key={s.id} style={{ position: 'relative' }}>
                <ItemCard skin={s} priceText={fmt(s.base)} selected={target?.id === s.id} onClick={() => { setState('idle'); setTarget(s); }} />
                {stake > 0 && <span className="pct-badge">{(upgradeChance(stake, s.base) * 100).toFixed(1)}%</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <DropFx fx={fx} onEnd={() => setFx(null)} />
    </div>
  );
}
