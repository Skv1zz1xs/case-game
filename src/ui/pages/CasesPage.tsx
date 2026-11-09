import { useState } from 'react';
import { CASES, eventWindow } from '../../data/cases';
import { CAT_NAMES, CaseCat } from '../../data/themes';
import { game, useProfile, fmt } from '../game';
import { CaseImg } from '../components/CaseImg';
import { FREE_CASE } from '../../data/free';
import { useNow, Countdown } from '../components/Countdown';


export function CasesPage({ onOpen, onBonus }: { onOpen: (id: string) => void; onBonus: () => void }) {
  const p = useProfile();
  const now = useNow(1000);
  const [cat] = useState<CaseCat | 'all'>('all');
  const [q, setQ] = useState('');
  const freeLeft = p.freeAt - now;
  const daily = game.dailyState();
  const order: CaseCat[] = ['event', 'cheap', 'theme', 'knife', 'mid', 'elite'];
  const shown = (cat === 'all' ? order : [cat]);

  return (
    <div className="cases-page">
      <div className="case-search"><span>⌕</span><input placeholder="поиск…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {!q && <div className="section">
        <div className="section-h"><h2>Бесплатные кейсы</h2></div>
        <div className="case-grid">
          <button className="case-card" style={{ ['--c1' as any]: FREE_CASE.palette[0] }} onClick={() => onOpen('free')}>
            <div className="cimg"><CaseImg c={FREE_CASE} /></div>
            <div className="cinfo"><div className="ttl">Бесплатный кейс</div>
              <div className="price" style={{ color: 'var(--good)' }}>{freeLeft > 0 ? <>через <Countdown to={p.freeAt} now={now} /></> : 'БЕСПЛАТНО'}</div></div>
          </button>
          <button className="case-card" onClick={onBonus}>
            <div className="cimg"><CaseImg c={{ ...FREE_CASE, id: 'daily', name: 'Награда дня' }} /></div>
            <div className="cinfo"><div className="ttl">Ежедневная награда</div>
              <div className="price" style={{ color: daily.claimed ? undefined : 'var(--good)' }}>{daily.claimed ? `стрик ${daily.streak} дн.` : `+${fmt(daily.amount)} · ЗАБРАТЬ`}</div></div>
          </button>
        </div>
      </div>}


      {shown.map((k) => {
        const list = CASES.filter((c) => c.cat === k && (!q || c.name.toLowerCase().includes(q.toLowerCase())));
        if (!list.length) return null;
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
                    {c.cat === 'elite' && <span className="badge vip">ЭЛИТ</span>}
                    {(c.cat === 'theme' || c.cat === 'knife') && c.price >= 40 && c.price <= 900 && <span className="badge new">НОВОЕ</span>}
                    <div className="cimg"><CaseImg c={c} /></div>
                    <div className="cinfo">
                      <div className="ttl">{c.name}</div>
                      <div className="price">{ev && ev.active ? <span className="muted small">осталось {(c.limit ?? 0) - used}/{c.limit} · </span> : null}<i className="coin" />{fmt(c.price)}</div>
                    </div>
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
