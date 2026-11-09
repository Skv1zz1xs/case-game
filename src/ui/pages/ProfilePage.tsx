// Профиль: карточка игрока, лучший дроп в 3D, стоимость коллекции, вкладки предметов/истории/статистики
import { useState } from 'react';
import { xpForLevel } from '../../config/economy';
import { round2 } from '../../core/items';
import { hashStr } from '../../core/rng';
import { skinById } from '../../data/cases';
import { useProfile, fmt } from '../game';
import { useFeed } from '../feed';
import { ItemCard } from '../components/ItemCard';
import { Inspect3D } from '../three/Inspect3D';
import { InventoryPage } from './InventoryPage';

export function ProfilePage({ onSettings }: { onSettings: () => void }) {
  const p = useProfile();
  const feed = useFeed();
  const [tab, setTab] = useState<'items' | 'history' | 'stats'>('items');
  const st = p.stats;
  const best = st.best;
  const bs = best ? skinById(best.skinId) : undefined;
  const invValue = round2(p.inventory.reduce((s, i) => s + i.price, 0));
  const need = xpForLevel(p.level);
  const id = (hashStr(p.nick) % 900000000) + 100000000;

  return (
    <div>
      <div className="prof-top">
        <div className="prof-card">
          <div className="prof-head">
            <div className="prof-ava">{(p.nick || '?')[0].toUpperCase()}</div>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row"><h1 style={{ fontSize: 22 }} className="grow">{p.nick}</h1><button className="btn sm" onClick={onSettings}>⚙️</button></div>
              <div className="small muted">ID:{id}</div>
              <div className="prof-rank"><span className="rank-badge">{p.level}</span>
                <div className="grow"><div className="small muted" style={{ textAlign: 'right' }}>уровень · {fmt(p.xp)} / {fmt(need)} XP</div>
                  <div className="progress" style={{ height: 4 }}><div style={{ width: `${Math.min(100, (p.xp / need) * 100)}%` }} /></div></div>
              </div>
            </div>
          </div>
          <div className="prof-bal"><div><div className="small muted">Баланс</div><div className="v"><i className="coin" /> {fmt(p.balance)}</div></div></div>
          <div className="prof-stats"><span title="Кейсов открыто">📦 {st.opened}</span><span title="Апгрейды (выиграно)">⏫ {st.upgradesWon}</span><span title="Контракты">📜 {st.contracts}</span></div>
        </div>
        <div className="prof-card prof-best">
          <div className="small muted" style={{ position: 'absolute', top: 14, left: 16 }}>Лучший дроп</div>
          {best && bs ? (
            <>
              <Inspect3D model={bs.model} finish={bs.finish} float={best.float} wearSeed={best.id} phase={best.pattern?.tier !== 'normal' ? best.pattern?.name : undefined} />
              <div style={{ position: 'relative' }}>
                <div className="small muted">{bs.model.kind === 'knife' || bs.model.kind === 'gloves' ? '★ ' : ''}{bs.model.name}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{bs.skin}</div>
                <div style={{ fontWeight: 800 }}><i className="coin" /> {fmt(best.price)}</div>
              </div>
            </>
          ) : <div className="muted small">Пока пусто — открой кейс</div>}
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="prof-card prof-val"><div className="small muted">Стоимость коллекции</div><div className="v"><i className="coin" /> {fmt(invValue)}</div><div className="small">{p.inventory.length} предметов</div></div>
          <div className="prof-card"><div className="small" style={{ color: 'var(--accent)', fontWeight: 800 }}>ПОТРАЧЕНО / ПРОДАНО</div><div className="small muted">{fmt(st.spent)} / {fmt(st.sold)}</div></div>
        </div>
      </div>

      <div className="glass prof-banner"><span style={{ fontSize: 26 }}>🎁</span><span className="grow">Кейсы, апгрейды и контракты дают опыт. За каждый новый уровень — награда монетами.</span></div>

      <div className="page-tabs">
        <button className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>Предметы</button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>История</button>
        <button className={tab === 'stats' ? 'on' : ''} onClick={() => setTab('stats')}>Статистика</button>
      </div>
      {tab === 'items' && <InventoryPage embedded />}
      {tab === 'history' && (feed.length ? <div className="item-grid">{feed.map((e) => <ItemCard key={e.item.id + e.ts} item={e.item} />)}</div> : <div className="empty">История пуста</div>)}
      {tab === 'stats' && (
        <div className="stat-grid">
          {([['Кейсов открыто', st.opened], ['Фри кейсов', st.freeOpened], ['Потрачено', fmt(st.spent)], ['Продано на', fmt(st.sold)],
            ['Апгрейды', `${st.upgradesWon} / ${st.upgrades}`], ['Контракты', st.contracts], ['Батлы', `${st.battlesWon} / ${st.battles}`], ['Рецептов открыто', p.recipes.length]] as [string, string | number][])
            .map(([k, v]) => <div key={k} className="glass stat"><div className="muted small">{k}</div><div className="v">{v}</div></div>)}
        </div>
      )}
    </div>
  );
}
