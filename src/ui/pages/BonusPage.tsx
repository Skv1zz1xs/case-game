import { useState } from 'react';
import { DAILY_BASE, DAILY_STREAK_STEP, DAILY_STREAK_MAX_DAYS, RAKEBACK_RATE, xpForLevel, levelReward } from '../../config/economy';
import { game, useProfile, fmt, toast } from '../game';
import { useNow, Countdown } from '../components/Countdown';
import { sfx } from '../sound';
import { confetti } from '../confetti';

export function BonusPage({ onFree }: { onFree: () => void }) {
  const p = useProfile();
  const now = useNow(1000);
  const [code, setCode] = useState('');
  const d = game.dailyState();
  const need = xpForLevel(p.level);

  const act = (f: () => number, msg: string) => {
    try { const v = f(); sfx.coin(); toast(`${msg}: +${fmt(v)}`, 'good'); if (v >= 1000) confetti(['#ffd700', '#ffb020', '#fff'], 90); }
    catch (e) { toast((e as Error).message, 'bad'); }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Бонусы</h1>

      <div className="glass section" style={{ padding: 18 }}>
        <div className="row">
          <div style={{ fontSize: 40 }}>🎉</div>
          <div className="grow">
            <h2 style={{ fontSize: 17 }}>Бесплатный кейс</h2>
            <div className="muted small">Раз в 5 минут. Обычно 50–400 монет, иногда больше 2000.</div>
          </div>
          {p.freeAt > now
            ? <div className="btn" style={{ cursor: 'default' }}>⏳ <Countdown to={p.freeAt} now={now} /></div>
            : <button className="btn green" onClick={onFree}>Открыть</button>}
        </div>
      </div>

      <div className="glass section" style={{ padding: 18 }}>
        <div className="row">
          <div style={{ fontSize: 40 }}>📅</div>
          <div className="grow">
            <h2 style={{ fontSize: 17 }}>Ежедневная награда</h2>
            <div className="muted small">{fmt(DAILY_BASE)} + {DAILY_STREAK_STEP} за каждый день подряд (до +{DAILY_STREAK_STEP * DAILY_STREAK_MAX_DAYS})</div>
          </div>
          <button className="btn primary" disabled={d.claimed} onClick={() => act(() => game.claimDaily(), 'Ежедневная награда')}>
            {d.claimed ? 'Завтра снова' : `Забрать ${fmt(d.amount)}`}
          </button>
        </div>
        <div className="streak">
          {Array.from({ length: 8 }, (_, i) => {
            const day = i + 1;
            const done = day < d.streak || (d.claimed && day === d.streak);
            return <div key={i} className={`${done ? 'done' : ''}${day === d.streak && !d.claimed ? ' today' : ''}`}>
              <div>День {day}</div><div style={{ color: 'var(--accent)' }}>{fmt(DAILY_BASE + DAILY_STREAK_STEP * Math.min(i, DAILY_STREAK_MAX_DAYS))}</div>
            </div>;
          })}
        </div>
      </div>

      <div className="glass section" style={{ padding: 18 }}>
        <div className="row">
          <div style={{ fontSize: 40 }}>🐷</div>
          <div className="grow">
            <h2 style={{ fontSize: 17 }}>Копилка</h2>
            <div className="muted small">{RAKEBACK_RATE * 100}% от всех трат на кейсы копится здесь</div>
          </div>
          <button className="btn" disabled={p.rakeback < 1} onClick={() => act(() => game.claimRakeback(), 'Копилка')}>
            Забрать <i className="coin" />{fmt(p.rakeback)}
          </button>
        </div>
      </div>

      <div className="glass section" style={{ padding: 18 }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 40 }}>⭐</div>
          <div className="grow">
            <h2 style={{ fontSize: 17 }}>Уровень {p.level}</h2>
            <div className="muted small">Опыт за потраченные монеты. Следующий уровень: +{fmt(levelReward(p.level + 1))} монет</div>
          </div>
          <div className="small muted">{fmt(p.xp)} / {fmt(need)}</div>
        </div>
        <div className="progress"><div style={{ width: `${Math.min(100, (p.xp / need) * 100)}%` }} /></div>
      </div>

      <div className="glass section" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 17, marginBottom: 10 }}>🎟️ Промокод</h2>
        <form className="row" onSubmit={(e) => { e.preventDefault(); act(() => game.redeem(code), 'Промокод'); setCode(''); }}>
          <input className="input grow" style={{ minWidth: 160, width: 'auto' }} placeholder="Введи код" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn primary" disabled={!code.trim()}>Активировать</button>
        </form>
      </div>
    </div>
  );
}
