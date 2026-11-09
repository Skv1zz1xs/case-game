import { useMemo, useRef, useState } from 'react';
import { UPGRADE_MULTIPLIERS, UPGRADE_MAX_ITEMS, rarityDef } from '../../config/economy';
import { CASES, skinById } from '../../data/cases';
import { Item, round2 } from '../../core/items';
import { upgradeChance, targetAllowed } from '../../core/upgrade';
import { game, useProfile, fmt, toast } from '../game';
import { ItemPicker } from '../components/ItemPicker';
import { ItemCard } from '../components/ItemCard';
import { DropFx, FxState, playDropFx } from '../components/DropFx';
import { sfx } from '../sound';

const ALL_SKINS = CASES.flatMap((c) => c.skins).sort((a, b) => a.base - b.base);

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.sin(a * 2 * Math.PI), cy - r * Math.cos(a * 2 * Math.PI)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 0.5 ? 1 : 0} 1 ${x1} ${y1}`;
}

export function Wheel({ chance, angle, spinning, fast, state }: { chance: number; angle: number; spinning: boolean; fast: boolean; state: 'idle' | 'win' | 'lose' }) {
  const col = state === 'lose' ? 'var(--bad)' : 'var(--good)';
  return (
    <div className={`wheel ${state}`}>
      <svg viewBox="0 0 240 240">
        <circle cx="120" cy="120" r="100" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="22" />
        {chance > 0 && (chance >= 0.999
          ? <circle cx="120" cy="120" r="100" fill="none" stroke={col} strokeWidth="22" />
          : <path d={arc(120, 120, 100, 0, chance)} fill="none" stroke={col} strokeWidth="22" strokeLinecap="butt" style={{ filter: `drop-shadow(0 0 8px ${state === 'lose' ? '#ff4d6d' : '#38ef7d'})` }} />)}
        {Array.from({ length: 40 }, (_, i) => (
          <line key={i} x1="120" y1="8" x2="120" y2={i % 5 ? 14 : 18} stroke="rgba(255,255,255,.25)" strokeWidth="2" transform={`rotate(${i * 9} 120 120)`} />
        ))}
        <circle cx="120" cy="120" r="78" fill="url(#wg)" />
        <defs><radialGradient id="wg"><stop offset="0" stopColor="#1e2335" /><stop offset="1" stopColor="#0d1019" /></radialGradient></defs>
      </svg>
      <div className="needle" style={{ transform: `rotate(${angle}deg)`, transition: spinning ? `transform ${fast ? 1.3 : 4.2}s cubic-bezier(.12,.75,.22,1)` : 'none' }}>
        <div />
      </div>
      <div className="wheel-center">
        <div className="pct">{(chance * 100).toFixed(2).replace('.', ',')}%</div>
        <div className="muted small">шанс</div>
      </div>
    </div>
  );
}

export function UpgradePage({ onBack, onContract }: { onBack: () => void; onContract?: () => void }) {
  const p = useProfile();
  const [sel, setSel] = useState<string[]>([]);
  const [coinsStr, setCoinsStr] = useState('');
  const [mode, setMode] = useState<'mult' | 'skin'>('mult');
  const [mult, setMult] = useState(2);
  const [skinId, setSkinId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [state, setState] = useState<'idle' | 'win' | 'lose'>('idle');
  const [won, setWon] = useState<Item | null>(null);
  const [fx, setFx] = useState<FxState | null>(null);
  const [pick, setPick] = useState(false);
  const base = useRef(0);
  const [lastChance, setLastChance] = useState(0);

  const items = sel.map((id) => p.inventory.find((i) => i.id === id)).filter(Boolean) as Item[];
  const coins = Math.max(0, Math.min(p.balance, Number(coinsStr.replace(',', '.')) || 0));
  const stake = round2(items.reduce((s, i) => s + i.price, 0) + coins);
  const skin = skinId ? skinById(skinId) : undefined;
  const target = mode === 'mult' ? round2(stake * mult) : skin ? round2(skin.base) : 0;
  const ok = stake > 0 && target > 0 && targetAllowed(stake, target);
  const chance = ok ? upgradeChance(stake, target) : 0;

  const skinList = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return ALL_SKINS.filter((s) => s.base > stake * 1.05 && (stake <= 0 || targetAllowed(stake, s.base)) && (!ql || `${s.model.name} ${s.skin}`.toLowerCase().includes(ql))).slice(0, 60);
  }, [stake, q]);

  const toggle = (it: Item) => setSel((s) => (s.includes(it.id) ? s.filter((x) => x !== it.id) : s.length >= UPGRADE_MAX_ITEMS ? s : [...s, it.id]));

  const go = () => {
    if (!ok || spinning) return;
    try {
      const r = game.upgrade(sel, coins, target, mode === 'skin' ? skinId ?? undefined : undefined);
      sfx.whoosh();
      setLastChance(r.chance);
      setState('idle'); setWon(null); setSpinning(true);
      base.current += 360 * (p.settings.fast ? 3 : 6) - (base.current % 360);
      setAngle(base.current + r.roll * 360);
      setSel([]); setCoinsStr('');
      setTimeout(() => {
        setSpinning(false);
        setState(r.win ? 'win' : 'lose');
        if (r.win && r.item) { setWon(r.item); playDropFx(r.item, p.settings.anim, setFx); } else sfx.lose();
      }, p.settings.fast ? 1350 : 4250);
    } catch (e) { toast((e as Error).message, 'bad'); }
  };

  return (
    <div>
      <div className="page-tabs">
        <button className="on">⬆️ Апгрейдер</button>
        <button onClick={onContract}>📜 Контракты</button>
      </div>
      <span style={{ display: 'none' }} onClick={onBack} />

      <div className="upg-layout">
        <div className="glass upg-side">
          <div className="row"><b className="grow">Ставка</b><span><i className="coin" /> {fmt(stake)}</span></div>
          <div className="upg-slots">
            {items.map((it) => <ItemCard key={it.id} item={it} compact onClick={() => toggle(it)} />)}
            {items.length < UPGRADE_MAX_ITEMS && <button className="slot" onClick={() => setPick(true)}>+ предмет</button>}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <input className="input grow" style={{ width: 'auto', minWidth: 100 }} inputMode="decimal" placeholder="+ монеты" value={coinsStr} onChange={(e) => setCoinsStr(e.target.value)} />
            {[0.1, 0.5, 1].map((k) => <button key={k} className="btn sm" onClick={() => setCoinsStr(String(Math.floor(p.balance * k * 100) / 100))}>{k === 1 ? 'Всё' : `${k * 100}%`}</button>)}
          </div>
        </div>

        <div className="upg-center">
          <Wheel chance={spinning || (state !== 'idle' && stake === 0) ? lastChance : chance} angle={angle} spinning={spinning} fast={p.settings.fast} state={state} />
          <button className="btn primary lg" style={{ width: '100%', maxWidth: 320 }} disabled={!ok || spinning} onClick={go}>
            {spinning ? 'Крутим…' : ok ? `Апгрейд x${(target / stake).toFixed(2).replace('.', ',')}` : stake <= 0 ? 'Поставь предметы или монеты' : 'Выбери цель'}
          </button>
          {state === 'lose' && !spinning && <div style={{ color: 'var(--bad)', fontWeight: 800, marginTop: 8 }}>Не повезло…</div>}
          {won && !spinning && <div style={{ maxWidth: 220, margin: '10px auto 0' }}><ItemCard item={won} /></div>}
        </div>

        <div className="glass upg-side">
          <div className="row"><b className="grow">Цель</b><span><i className="coin" /> {fmt(target)}</span></div>
          <div className="seg" style={{ margin: '10px 0' }}>
            <button className={mode === 'mult' ? 'on' : ''} onClick={() => setMode('mult')}>Множитель</button>
            <button className={mode === 'skin' ? 'on' : ''} onClick={() => setMode('skin')}>Предмет</button>
          </div>
          {mode === 'mult' ? (
            <div className="row">
              {UPGRADE_MULTIPLIERS.map((m) => <button key={m} className={`chip${mult === m ? ' on' : ''}`} onClick={() => setMult(m)}>x{m}</button>)}
            </div>
          ) : (
            <>
              {skin && <div style={{ maxWidth: 200, marginBottom: 8 }}><ItemCard skin={skin} /></div>}
              <input className="input" placeholder="Поиск предмета" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="upg-skins">
                {skinList.map((s) => (
                  <button key={s.id} className={`upg-skin${skinId === s.id ? ' on' : ''}`} style={{ ['--rc' as any]: rarityDef(s.rarity).color }} onClick={() => setSkinId(s.id)}>
                    <span className="rdot" />{s.model.name} | {s.skin}<span className="grow" /><b>{fmt(s.base)}</b>
                    <span className="muted small" style={{ minWidth: 52, textAlign: 'right' }}>{(upgradeChance(stake, s.base) * 100).toFixed(1)}%</span>
                  </button>
                ))}
                {!skinList.length && <div className="muted small" style={{ padding: 10 }}>Сначала поставь что-нибудь</div>}
              </div>
            </>
          )}
          <p className="muted small" style={{ marginBottom: 0 }}>Шанс = ставка / цель × 0,95, от 1% до 75%.</p>
        </div>
      </div>

      {pick && (
        <div className="overlay" onClick={() => setPick(false)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ marginBottom: 10 }}><h2 className="grow" style={{ fontSize: 18 }}>Предметы для ставки ({sel.length}/{UPGRADE_MAX_ITEMS})</h2><button className="btn green sm" onClick={() => setPick(false)}>Готово</button></div>
            <ItemPicker items={p.inventory} selected={sel} onToggle={toggle} />
          </div>
        </div>
      )}
      <DropFx fx={fx} onEnd={() => setFx(null)} />
    </div>
  );
}
