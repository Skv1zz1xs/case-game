import { useMemo, useState } from 'react';
import { RARITIES, rarityDef, PATTERN_TIERS } from '../../config/economy';
import { Item, itemName, sortItems, wearName, round2 } from '../../core/items';
import { skinById, caseById } from '../../data/cases';
import { KIND_NAMES, WeaponKind } from '../../data/weapons';
import { game, useProfile, fmt, toast } from '../game';
import { ItemCard } from '../components/ItemCard';
import { Inspect3D } from '../three/Inspect3D';
import { sfx } from '../sound';

const PAGE = 120;

export function InventoryPage() {
  const p = useProfile();
  const [rar, setRar] = useState<string>('all');
  const [kind, setKind] = useState<string>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'price' | 'new' | 'rarity'>('new');
  const [dir, setDir] = useState<1 | -1>(-1);
  const [sel, setSel] = useState<Set<string> | null>(null);
  const [below, setBelow] = useState('10');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<Item | null>(null);

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const f = p.inventory.filter((it) => {
      if (rar !== 'all' && it.rarity !== rar) return false;
      const s = skinById(it.skinId);
      if (kind !== 'all' && s?.model.kind !== kind) return false;
      if (ql && !itemName(it).toLowerCase().includes(ql)) return false;
      return true;
    });
    return sortItems(f, sort, dir);
  }, [p.inventory, rar, kind, q, sort, dir]);

  const total = round2(p.inventory.reduce((s, i) => s + i.price, 0));
  const selSum = sel ? round2(list.filter((i) => sel.has(i.id)).reduce((s, i) => s + i.price, 0)) : 0;
  const belowN = Number(below.replace(',', '.')) || 0;
  const belowItems = p.inventory.filter((i) => i.price < belowN && !i.locked);
  const belowSum = round2(belowItems.reduce((s, i) => s + i.price, 0));

  const sellIds = (ids: string[]) => {
    if (!ids.length) return;
    const got = game.sell(ids); sfx.coin(); toast(`Продано на ${fmt(got)}`, 'good');
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 24 }} className="grow">Инвентарь</h1>
        <div className="muted small">{p.inventory.length} шт. · <i className="coin" /> {fmt(total)}</div>
      </div>

      <div className="chips" style={{ marginBottom: 10 }}>
        <button className={`chip${rar === 'all' ? ' on' : ''}`} onClick={() => setRar('all')}>Все</button>
        {RARITIES.map((r) => (
          <button key={r.id} className={`chip${rar === r.id ? ' on' : ''}`} onClick={() => setRar(r.id)}
            style={rar === r.id ? { background: r.color, borderColor: r.color } : { color: r.color }}>{r.name}</button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" style={{ flex: '1 1 160px', width: 'auto' }} placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ flex: '0 1 150px', width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">Все типы</option>
          {(Object.keys(KIND_NAMES) as WeaponKind[]).map((k) => <option key={k} value={k}>{KIND_NAMES[k]}</option>)}
        </select>
        <select className="input" style={{ flex: '0 1 150px', width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="new">По новизне</option><option value="price">По цене</option><option value="rarity">По редкости</option>
        </select>
        <button className="btn sm" onClick={() => setDir((d) => (d === 1 ? -1 : 1))} aria-label="Направление">{dir === -1 ? '↓' : '↑'}</button>
      </div>

      {list.length === 0 ? <div className="empty">Пусто. Открой пару кейсов!</div> : (
        <div className="item-grid">
          {list.slice(0, limit).map((it) => (
            <ItemCard key={it.id} item={it} selected={sel?.has(it.id)} star={p.showcase.includes(it.id)}
              onClick={() => {
                if (sel) { const n = new Set(sel); if (n.has(it.id)) n.delete(it.id); else if (!it.locked) n.add(it.id); setSel(n); }
                else setOpen(it);
              }} />
          ))}
        </div>
      )}
      {list.length > limit && <div style={{ textAlign: 'center', marginTop: 12 }}><button className="btn" onClick={() => setLimit((l) => l + PAGE)}>Показать ещё ({list.length - limit})</button></div>}

      <div className="glass sticky-actions">
        {sel ? (
          <>
            <span className="small grow">Выбрано: {sel.size} · <i className="coin" /> {fmt(selSum)}</span>
            <button className="btn sm" onClick={() => setSel(new Set(list.filter((i) => !i.locked).map((i) => i.id)))}>Все</button>
            <button className="btn sm green" disabled={!sel.size} onClick={() => { sellIds([...sel]); setSel(null); }}>Продать</button>
            <button className="btn sm" onClick={() => setSel(null)}>Отмена</button>
          </>
        ) : (
          <>
            <button className="btn sm" onClick={() => setSel(new Set())}>☑ Выбрать</button>
            <div className="grow" />
            <span className="small muted">Продать всё дешевле</span>
            <input className="input" style={{ width: 80, minHeight: 36 }} inputMode="decimal" value={below} onChange={(e) => setBelow(e.target.value)} />
            <button className="btn sm green" disabled={!belowItems.length} onClick={() => sellIds(belowItems.map((i) => i.id))}>
              {belowItems.length} шт. · {fmt(belowSum)}
            </button>
          </>
        )}
      </div>

      {open && <ItemModal it={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function ItemModal({ it, onClose }: { it: Item; onClose: () => void }) {
  const p = useProfile();
  const cur = p.inventory.find((x) => x.id === it.id);
  const s = skinById(it.skinId);
  if (!s) return null;
  const rd = rarityDef(it.rarity);
  const tierDef = it.pattern ? PATTERN_TIERS.find((t) => t.id === it.pattern!.tier) : undefined;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ borderColor: rd.color + '66' }}>
        <div className="row"><div className="grow" style={{ color: rd.color, fontWeight: 800 }}>{rd.name}</div><button className="iconbtn" onClick={onClose}>✕</button></div>
        <div style={{ padding: '10px 0' }}>
          <Inspect3D model={s.model} finish={s.finish} color={rd.color} float={it.float} wearSeed={it.id} phase={it.pattern?.tier !== 'normal' ? it.pattern?.name : undefined} />
        </div>
        <h2 style={{ fontSize: 18 }}>{it.st && <span style={{ color: '#ff9d3c' }}>StatTrak™ </span>}{s.model.name} | {s.skin}</h2>
        <div className="muted small" style={{ margin: '8px 0 12px', lineHeight: 1.7 }}>
          Износ: {wearName(it.float).name} ({it.float.toFixed(6)})<br />
          {it.pattern && <>Паттерн #{it.pattern.n} · {it.pattern.name} · {tierDef?.name} (x{tierDef?.mult})<br /></>}
          Из: {caseById(it.caseId)?.name ?? (it.caseId === 'free' ? 'Бесплатный кейс' : 'особый')}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}><i className="coin" /> {fmt(it.price)}</div>
        {cur && (
          <div className="row">
            <button className="btn green grow" disabled={cur.locked} onClick={() => { const v = game.sell([it.id]); sfx.coin(); toast(`Продано за ${fmt(v)}`, 'good'); onClose(); }}>Продать</button>
            <button className="btn" onClick={() => game.toggleLock(it.id)}>{cur.locked ? '🔓 Открепить' : '🔒 Закрепить'}</button>
            <button className="btn" onClick={() => game.toggleShowcase(it.id)}>{p.showcase.includes(it.id) ? '★ Из витрины' : '☆ В витрину'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
