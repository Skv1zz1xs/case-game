import { useState } from 'react';
import { round2 } from '../../core/items';
import { useProfile, fmt } from '../game';
import { ItemCard } from '../components/ItemCard';
import { ItemModal } from './InventoryPage';
import type { Item } from '../../core/items';

export function ProfilePage({ onSettings }: { onSettings: () => void }) {
  const p = useProfile();
  const [open, setOpen] = useState<Item | null>(null);
  const st = p.stats;
  const show = p.showcase.map((id) => p.inventory.find((i) => i.id === id)).filter(Boolean) as Item[];
  const top = show.length ? show : [...p.inventory].sort((a, b) => b.price - a.price).slice(0, 6);
  const invValue = round2(p.inventory.reduce((s, i) => s + i.price, 0));
  const rows: [string, string][] = [
    ['Кейсов открыто', String(st.opened)],
    ['Фри кейсов', String(st.freeOpened)],
    ['Потрачено', fmt(st.spent)],
    ['Получено с продаж', fmt(st.sold)],
    ['Апгрейды', `${st.upgradesWon} / ${st.upgrades}`],
    ['Контракты', String(st.contracts)],
    ['Батлы', `${st.battlesWon} / ${st.battles}`],
    ['Стоимость инвентаря', fmt(invValue)],
  ];
  return (
    <div>
      <div className="glass section" style={{ padding: 18 }}>
        <div className="row">
          <div style={{ width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 900, fontFamily: 'var(--font-h)', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#1a0f00' }}>
            {(p.nick || '?')[0].toUpperCase()}
          </div>
          <div className="grow">
            <h1 style={{ fontSize: 22 }}>{p.nick || 'Игрок'}</h1>
            <div className="muted small">Уровень {p.level} · баланс <i className="coin" /> {fmt(p.balance)}</div>
          </div>
          <button className="btn sm" onClick={onSettings}>⚙️ Настройки</button>
        </div>
      </div>

      <div className="section">
        <div className="section-h"><h2>Витрина</h2><span className="muted small">{show.length ? 'выбрано тобой' : 'лучшие предметы'} · отметь ☆ в инвентаре</span></div>
        {top.length ? <div className="item-grid">{top.map((it) => <ItemCard key={it.id} item={it} onClick={() => setOpen(it)} />)}</div> : <div className="empty">Пока пусто</div>}
      </div>

      {st.best && (
        <div className="section">
          <div className="section-h"><h2>Лучший дроп</h2></div>
          <div style={{ maxWidth: 240 }}><ItemCard item={st.best} /></div>
        </div>
      )}

      <div className="section">
        <div className="section-h"><h2>Статистика</h2></div>
        <div className="stat-grid">
          {rows.map(([k, v]) => <div key={k} className="glass stat"><div className="muted small">{k}</div><div className="v">{v}</div></div>)}
        </div>
      </div>
      {open && <ItemModal it={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
