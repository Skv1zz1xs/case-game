import { useState } from 'react';
import { CASES, eventWindow } from '../../data/cases';
import { CAT_NAMES, CaseCat } from '../../data/themes';
import { game, useProfile, fmt } from '../game';
import { CaseBox } from '../components/CaseBox';
import { useNow, Countdown } from '../components/Countdown';

const CATS: (CaseCat | 'all')[] = ['all', 'event', 'cheap', 'theme', 'knife', 'mid', 'elite'];

export function CasesPage({ onOpen, onBonus }: { onOpen: (id: string) => void; onBonus: () => void }) {
  const p = useProfile();
  const now = useNow(1000);
  const [cat, setCat] = useState<CaseCat | 'all'>('all');
  const freeLeft = p.freeAt - now;
  const daily = game.dailyState();
  const order: CaseCat[] = ['event', 'cheap', 'theme', 'knife', 'mid', 'elite'];
  const shown = (cat === 'all' ? order : [cat]);

  return (
    <div>
      <div className="hero-banner">
        <button className="glass bonus-card" onClick={() => onOpen('free')} style={{ textAlign: 'left' }}>
          <div className="big">🎉</div>
          <div className="grow">
            <div style={{ fontWeight: 800 }}>Бесплатный кейс</div>
            <div className="muted small">{freeLeft > 0 ? <>Через <Countdown to={p.freeAt} now={now} /></> : 'Готов! Жми, чтобы открыть'}</div>
          </div>
          {freeLeft <= 0 && <span className="btn green sm">Открыть</span>}
        </button>
        <button className="glass bonus-card" onClick={onBonus} style={{ textAlign: 'left' }}>
          <div className="big">📅</div>
          <div className="grow">
            <div style={{ fontWeight: 800 }}>Ежедневная награда</div>
            <div className="muted small">{daily.claimed ? `Получено · стрик ${daily.streak} дн.` : `+${fmt(daily.amount)} монет · день ${daily.streak}`}</div>
          </div>
          {!daily.claimed && <span className="btn primary sm">Забрать</span>}
        </button>
      </div>

      <div className="chips section">
        {CATS.map((c) => <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c === 'all' ? 'Все' : CAT_NAMES[c]}</button>)}
      </div>

      {shown.map((k) => {
        const list = CASES.filter((c) => c.cat === k);
        return (
          <div className="section" key={k}>
            <div className="section-h"><h2>{CAT_NAMES[k]}</h2><span className="muted small">{list.length}</span></div>
            <div className="case-grid">
              {list.map((c) => {
                const ev = c.cat === 'event' ? eventWindow(c.id, now) : null;
                const used = ev ? p.eventOpens[`${c.id}:${ev.start}`] ?? 0 : 0;
                return (
                  <button key={c.id} className="case-card" style={{ ['--c1' as any]: c.palette[0], opacity: ev && !ev.active ? 0.55 : 1 }} onClick={() => onOpen(c.id)}>
                    {ev && <span className={`badge${ev.active ? ' hot' : ''}`}>{ev.active ? <>⏳ <Countdown to={ev.end} now={now} /></> : <>🔒 <Countdown to={ev.start} now={now} /></>}</span>}
                    {c.cat === 'elite' && <span className="badge">ЭЛИТ</span>}
                    <CaseBox c={c} />
                    <div className="ttl">{c.name}</div>
                    <div className="tag">{ev && ev.active ? `Осталось: ${(c.limit ?? 0) - used} из ${c.limit}` : c.tagline}</div>
                    <div className="price"><i className="coin" />{fmt(c.price)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
