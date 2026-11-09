// Левая колонка (ПК): онлайн, батл-пасс, живая лента дропов
import { useState } from 'react';
import { rarityDef, passXpNeed } from '../../config/economy';
import { skinById } from '../../data/cases';
import { useProfile, fmt } from '../game';
import { useFeed } from '../feed';
import { ItemView } from '../three/ItemView';

export function Sidebar({ go }: { go: (p: string) => void }) {
  const p = useProfile();
  const feed = useFeed();
  const [tab, setTab] = useState<'all' | 'top'>('all');
  const list = tab === 'all' ? feed : [...feed].sort((a, b) => b.item.price - a.item.price).slice(0, 20);
  return (
    <aside className="side">
      <div className="side-online"><span className="pulse" />1 <span className="muted small">онлайн</span></div>
      <button className="side-bp" onClick={() => go('pass')}>
        <div><b>БАТЛ-ПАСС</b><div className="accent">СЕЗОН 1</div><div className="small muted">ур. {p.pass.level}{p.pass.premium ? ' · PREMIUM' : ''}</div></div>
        <div className="bp-bar"><div style={{ width: `${Math.min(100, (p.pass.xp / passXpNeed(p.pass.level)) * 100)}%` }} /></div>
      </button>
      <div className="side-tabs">
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>▦</button>
        <button className={tab === 'top' ? 'on' : ''} onClick={() => setTab('top')}>🔥</button>
      </div>
      <div className="feed">
        {list.length === 0 && <div className="muted small" style={{ padding: 14 }}>Здесь появятся крутые дропы. Открой кейс!</div>}
        {list.map((e) => {
          const s = skinById(e.item.skinId);
          if (!s) return null;
          const rd = rarityDef(e.item.rarity);
          return (
            <div key={e.item.id + e.ts} className="feed-row" style={{ ['--rc' as any]: rd.color }}>
              <div className="feed-img"><ItemView model={s.model} finish={s.finish} float={e.item.float} wearSeed={e.item.id}
                phase={e.item.pattern?.tier !== 'normal' ? e.item.pattern?.name : undefined} /></div>
              <div className="feed-txt">
                <b>{e.item.st ? 'ST™ ' : ''}{s.model.kind === 'knife' || s.model.kind === 'gloves' ? '★ ' : ''}{s.model.name}</b>
                <span className="muted">{s.skin}</span>
                <span><i className="coin" /> {fmt(e.item.price)}</span>
                <span className="feed-nick">{e.nick} · {e.src}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
