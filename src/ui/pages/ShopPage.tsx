// Магазин: косметика профиля за игровые монеты и промокоды. Реальных денег нет.
import { useState } from 'react';
import { COSMETICS, Cosmetic, cosmeticById } from '../../data/cosmetics';
import { game, useProfile, fmt, toast } from '../game';
import { sfx } from '../sound';
import { ProfileCard } from '../components/ProfileCard';

export function ShopPage() {
  const p = useProfile();
  const [tab, setTab] = useState<'cos' | 'codes'>('cos');
  const [code, setCode] = useState('');
  const buy = (c: Cosmetic) => {
    try {
      if (p.cos.owned.includes(c.id)) game.equipCosmetic(c.kind, p.cos[c.kind] === c.id ? undefined : c.id);
      else { game.buyCosmetic(c.id); sfx.coin(); toast(`Куплено: ${c.name}`, 'good'); }
    } catch (e) { toast((e as Error).message, 'bad'); }
  };
  const Section = ({ kind, title }: { kind: Cosmetic['kind']; title: string }) => (
    <div className="glass shop-sec">
      <div className="shop-sec-h"><b>{title}</b><span className="small muted">{COSMETICS.filter((c) => c.kind === kind).length}</span></div>
      <div className="shop-grid">
        {COSMETICS.filter((c) => c.kind === kind).map((c) => {
          const own = p.cos.owned.includes(c.id), on = p.cos[c.kind] === c.id;
          return (
            <button key={c.id} className={`shop-item${on ? ' on' : ''}`} onClick={() => buy(c)}>
              <div className="shop-prev">
                {kind === 'bg' && <div className="sp-bg" style={{ background: c.css }}><span className="sp-ava">{p.nick[0]?.toUpperCase()}</span><i /><i /></div>}
                {kind === 'frame' && <span className="sp-ava big" style={{ boxShadow: `0 0 0 3px ${c.css}, 0 0 14px ${c.css}` }}>{p.nick[0]?.toUpperCase()}</span>}
                {kind === 'title' && <span className="tag-title" style={{ background: c.css }}>{c.name}</span>}
              </div>
              <b>{c.name}</b>
              <span className="small">{on ? '✓ надето' : own ? 'надеть' : <><i className="coin" /> {fmt(c.price)}</>}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
  return (
    <div>
      <div className="row" style={{ marginBottom: 14 }}>
        <h1 style={{ fontFamily: 'var(--font-h)', textTransform: 'uppercase', fontWeight: 500, fontSize: 28 }}>🏪 Магазин</h1>
        <div className="page-tabs" style={{ marginBottom: 0 }}>
          <button className={tab === 'cos' ? 'on' : ''} onClick={() => setTab('cos')}>Косметика</button>
          <button className={tab === 'codes' ? 'on' : ''} onClick={() => setTab('codes')}>Промокоды</button>
        </div>
        <div className="grow" />
        <div className="glass" style={{ padding: '10px 14px' }}><span className="small muted">БАЛАНС </span><b><i className="coin" /> {fmt(p.balance)}</b></div>
      </div>
      {tab === 'cos' ? (
        <div className="shop-layout">
          <div style={{ display: 'grid', gap: 12 }}>
            <Section kind="bg" title="Фоны профиля" />
            <Section kind="frame" title="Рамки профиля" />
            <Section kind="title" title="Титулы" />
          </div>
          <div className="glass shop-sec">
            <div className="shop-sec-h"><b>Превью профиля</b></div>
            <ProfileCard />
            <div className="small muted" style={{ marginTop: 10 }}>Выбрано: фон «{cosmeticById(p.cos.bg)?.name ?? 'обычный'}», рамка «{cosmeticById(p.cos.frame)?.name ?? 'без рамки'}», титул «{cosmeticById(p.cos.title)?.name ?? 'без титула'}». Нажми на купленное, чтобы надеть или снять.</div>
          </div>
        </div>
      ) : (
        <div className="glass shop-sec" style={{ maxWidth: 720 }}>
          <div className="shop-sec-h"><b>Активируй код</b></div>
          <form className="row" onSubmit={(e) => { e.preventDefault(); try { const v = game.redeem(code); sfx.coin(); toast(`Промокод: +${fmt(v)}`, 'good'); setCode(''); } catch (er) { toast((er as Error).message, 'bad'); } }}>
            <input className="input grow" style={{ width: 'auto' }} placeholder="Введи код" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn primary" disabled={!code.trim()}>Активировать</button>
          </form>
          <div className="small muted" style={{ marginTop: 8 }}>Регистр букв не важен · каждый код — один раз</div>
          {p.promos.length > 0 && <div style={{ marginTop: 14 }}><b className="small">Недавние активации</b>{p.promos.map((k) => <div key={k} className="glass quest" style={{ marginTop: 6 }}><span style={{ color: 'var(--good)' }}>✓</span><b className="grow">{k}</b><span className="small muted">активирован</span></div>)}</div>}
        </div>
      )}
    </div>
  );
}
