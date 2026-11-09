// Выбор предметов из инвентаря (для апгрейдера и контрактов)
import { useMemo, useState } from 'react';
import { RARITIES, RarityId } from '../../config/economy';
import { Item, sortItems } from '../../core/items';
import { ItemCard } from './ItemCard';

interface Props {
  items: Item[];
  selected: string[];
  onToggle: (it: Item) => void;
  lockRarity?: RarityId | null;   // контракт: после первого предмета — только эта редкость
  exclude?: (it: Item) => boolean;
}

const PAGE = 60;

export function ItemPicker({ items, selected, onToggle, lockRarity, exclude }: Props) {
  const [rar, setRar] = useState<RarityId | 'all'>('all');
  const [sort, setSort] = useState<'price' | 'new'>('price');
  const [dir, setDir] = useState<1 | -1>(-1);
  const [limit, setLimit] = useState(PAGE);
  const r = lockRarity ?? rar;
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) if (!it.locked && !exclude?.(it)) m.set(it.rarity, (m.get(it.rarity) ?? 0) + 1);
    return m;
  }, [items, exclude]);
  const list = useMemo(() => sortItems(items.filter((it) => !it.locked && !exclude?.(it) && (r === 'all' || it.rarity === r)), sort, dir), [items, r, sort, dir, exclude]);
  const sel = new Set(selected);

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="chips grow">
          {!lockRarity && <button className={`chip${rar === 'all' ? ' on' : ''}`} onClick={() => setRar('all')}>Все</button>}
          {RARITIES.filter((x) => counts.get(x.id) && (!lockRarity || x.id === lockRarity)).map((x) => (
            <button key={x.id} className={`chip${r === x.id ? ' on' : ''}`} onClick={() => setRar(x.id)}
              style={r === x.id ? { background: x.color, borderColor: x.color } : { color: x.color }}>{x.name} · {counts.get(x.id)}</button>
          ))}
        </div>
        <select className="input" style={{ width: 'auto', minHeight: 36 }} value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="price">Цена</option><option value="new">Новые</option>
        </select>
        <button className="btn sm" onClick={() => setDir((d) => (d === 1 ? -1 : 1))}>{dir === -1 ? '↓' : '↑'}</button>
      </div>
      {list.length === 0 ? <div className="empty">Нет подходящих предметов</div> : (
        <div className="item-grid">
          {list.slice(0, limit).map((it) => <ItemCard key={it.id} item={it} selected={sel.has(it.id)} onClick={() => onToggle(it)} />)}
        </div>
      )}
      {list.length > limit && <div style={{ textAlign: 'center', marginTop: 10 }}><button className="btn sm" onClick={() => setLimit((l) => l + PAGE)}>Ещё ({list.length - limit})</button></div>}
    </div>
  );
}
