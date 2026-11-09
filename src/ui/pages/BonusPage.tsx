// Награды: за время в игре, ежедневный дроп, серия входов, колесо, задания, копилка, промокоды
import { useState } from 'react';
import * as E from '../../config/economy';
import { game, useProfile, fmt, toast } from '../game';
import * as RW from '../../core/rewards';
import { useNow, Countdown, fmtLeft } from '../components/Countdown';
import { ItemCard } from '../components/ItemCard';
import { sfx } from '../sound';
import { confetti } from '../confetti';

const PLAY_COLORS = ['#3b2a8f', '#6a2a8f', '#8f2a3a'];

export function BonusPage({ onFree }: { onFree: () => void }) {
  const p = useProfile();
  const now = useNow(1000);
  const [code, setCode] = useState('');
  const d = game.dailyState();
  const play = RW.playtime(game);
  const drop = RW.dropOffer(game);
  const q = RW.quests(game);
  const act = (f: () => number, msg: string) => {
    try { const v = f(); sfx.coin(); toast(`${msg}: +${fmt(v)}`, 'good'); if (v >= 1000) confetti(['#2fd47a', '#2de2d0', '#fff'], 90); }
    catch (e) { toast((e as Error).message, 'bad'); }
  };

  return (
    <div className="rewards">
      <div className="section-h"><h2>Награды за игру</h2></div>
      <div className="play-grid section">
        {play.map((x, i) => (
          <div key={i} className="play-card" style={{ ['--pc' as any]: PLAY_COLORS[i] }}>
            <div className="pc-top">
              <h3>Играй {x.min} минут</h3>
              <div className="pc-prize"><i className="coin" /> {fmt(x.coins)}</div>
              <div className="pc-timer">{x.got ? 'Получено' : x.ready ? 'Готово!' : fmtLeft(x.left * 1000)}</div>
            </div>
            <div className="pc-bot">
              <button className="btn primary sm" disabled={!x.ready} onClick={() => act(() => RW.claimPlay(game, i), `${x.min} минут`)}>{x.ready ? 'Забрать' : 'Играй дальше'}</button>
              <span className="small muted">Прогресс · {Math.min(x.min, Math.floor(p.play.secs / 60))} / {x.min} мин</span>
            </div>
          </div>
        ))}
      </div>

      <div className="drop-banner section">
        <div className="drop-items">
          {drop.items.map((it, k) => {
            const got = drop.picked.includes(k);
            const can = !got && drop.picked.length < E.DAILY_DROP_PICK;
            return (
              <button key={k} className={`drop-card${got ? ' got' : ''}`} disabled={!can}
                onClick={() => { try { RW.pickDrop(game, k); sfx.coin(); toast('Скин добавлен в инвентарь', 'good'); } catch (e) { toast((e as Error).message, 'bad'); } }}>
                <span className="drop-check">{got ? '✓' : ''}</span>
                <ItemCard item={it} />
                <div className="drop-free">{got ? 'Получено' : 'Бесплатно'}</div>
              </button>
            );
          })}
        </div>
        <div className="drop-info">
          <h2>Ежедневный дроп</h2>
          <div className="drop-next">Следующий дроп через <Countdown to={drop.ends} now={now} /></div>
          <div className="small">Выбери {E.DAILY_DROP_PICK} из 4 скинов · обновляется каждые {E.DAILY_DROP_HOURS} часа</div>
          <div className="small muted">Забрано {drop.picked.length} / {E.DAILY_DROP_PICK}</div>
        </div>
      </div>

      <div className="section-h"><h2>Серия входов</h2><span className="muted small">🔥 {d.claimed ? d.streak : d.streak - 1} дн. подряд</span></div>
      <div className="streak7 section">
        {E.STREAK_DAYS.map((day, i) => {
          const cur = d.dayIndex === i;
          const done = i < d.dayIndex || (cur && d.claimed);
          return (
            <div key={i} className={`sday${done ? ' done' : ''}${cur && !d.claimed ? ' today' : ''}${i === 6 ? ' jackpot' : ''}`}>
              <div className="sday-h">День {i + 1}{i === 6 && <span className="tagj">джекпот</span>}{done && <span>✓</span>}</div>
              <div className="sday-ic">{day.type === 'skin' ? '🔪' : '⬢'}</div>
              <div className="sday-v"><i className="coin" /> {fmt(day.value)}</div>
              <div className="small muted">{day.type === 'skin' ? 'скин' : 'монеты'}</div>
              {cur && !d.claimed && <button className="btn primary sm" onClick={() => act(() => game.claimDaily(), 'Серия входов')}>Забрать</button>}
              {cur && d.claimed && <div className="small">завтра</div>}
            </div>
          );
        })}
      </div>

      <div className="two-col section">
        <WheelBlock now={now} />
        <div>
          <div className="section-h"><h2>Задания</h2><span className="muted small">новые через <Countdown to={q.ends} now={now} /></span></div>
          <div className="quests">
            {q.list.map((x) => (
              <div key={x.id} className="glass quest">
                <span className={`qdiff ${x.diff === 'легко' ? 'e' : x.diff === 'средне' ? 'm' : 'h'}`}>{x.diff}</span>
                <div className="grow">
                  <b>{x.text}</b>
                  <div className="progress" style={{ marginTop: 6 }}><div style={{ width: `${(x.prog / x.goal) * 100}%` }} /></div>
                  <div className="small muted" style={{ marginTop: 4 }}>{fmt(x.prog)} / {fmt(x.goal)} · <i className="coin" /> {fmt(x.coins)}</div>
                </div>
                <button className="btn primary sm" disabled={x.got || x.prog < x.goal} onClick={() => act(() => RW.claimQuest(game, x.id), 'Задание')}>{x.got ? '✓' : 'Забрать'}</button>
              </div>
            ))}
          </div>
          <div className="glass quest" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 28 }}>🎉</div>
            <div className="grow"><b>Бесплатный кейс</b><div className="small muted">Раз в 5 минут</div></div>
            {p.freeAt > now ? <span className="timer">{fmtLeft(p.freeAt - now)}</span> : <button className="btn primary sm" onClick={onFree}>Открыть</button>}
          </div>
          <div className="glass quest" style={{ marginTop: 8 }}>
            <div style={{ fontSize: 28 }}>🐷</div>
            <div className="grow"><b>Копилка</b><div className="small muted">{E.RAKEBACK_RATE * 100}% от трат на кейсы</div></div>
            <button className="btn sm" disabled={p.rakeback < 1} onClick={() => act(() => game.claimRakeback(), 'Копилка')}><i className="coin" /> {fmt(p.rakeback)}</button>
          </div>
          <form className="glass quest" style={{ marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); act(() => game.redeem(code), 'Промокод'); setCode(''); }}>
            <div style={{ fontSize: 28 }}>🎟️</div>
            <input className="input grow" style={{ width: 'auto' }} placeholder="Промокод" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn primary sm" disabled={!code.trim()}>Активировать</button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Колесо: 16 секторов, бесплатный спин раз в час
function WheelBlock({ now }: { now: number }) {
  const p = useProfile();
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const segs = E.WHEEL_SEGMENTS;
  const n = segs.length;
  const ready = now >= p.wheelAt;
  const total = segs.reduce((s, x) => s + x.weight, 0);
  const cols = ['#3a2f7a', '#1f4d6b', '#2a6b4a', '#6b2a4a'];
  const spin = () => {
    try {
      const r = RW.spinWheel(game);
      setSpinning(true);
      const target = 360 * 6 + (360 - (r.index + 0.5) * (360 / n));
      setRot((x) => x - (x % 360) + target);
      setTimeout(() => {
        setSpinning(false);
        sfx.win(r.item ? 2 : 1);
        toast(r.item ? 'Колесо: скин в инвентаре!' : `Колесо: +${fmt(r.coins!)}`, 'good');
      }, 4200);
    } catch (e) { toast((e as Error).message, 'bad'); }
  };
  return (
    <div>
      <div className="section-h"><h2>Колесо</h2><span className="muted small">бесплатный спин раз в час</span></div>
      <div className="wheel2-wrap">
        <div className="wheel2-pointer" />
        <svg viewBox="-110 -110 220 220" className="wheel2" style={{ transform: `rotate(${rot}deg)`, transition: spinning ? 'transform 4.1s cubic-bezier(.12,.8,.2,1)' : 'none' }}>
          {segs.map((sgm, i) => {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
            const big = sgm.value >= 750;
            return (
              <g key={i}>
                <path d={`M0 0 L${Math.cos(a0) * 100} ${Math.sin(a0) * 100} A100 100 0 0 1 ${Math.cos(a1) * 100} ${Math.sin(a1) * 100} Z`} fill={big ? '#7a5a12' : cols[i % 4]} stroke="#15161a" strokeWidth="1" />
                <text transform={`rotate(${((i + 0.5) / n) * 360} 0 0) translate(0 -76)`} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{sgm.skin ? '🔪' : ''}{sgm.value}</text>
              </g>
            );
          })}
          <circle r="34" fill="#1d1f25" stroke="#2de2d0" strokeWidth="2" />
        </svg>
        <div className="wheel2-center">
          {ready ? <button className="btn primary" disabled={spinning} onClick={spin}>{spinning ? '…' : 'Крутить'}</button>
            : <><div className="small muted">следующий спин</div><div className="timer" style={{ fontSize: 20 }}>{fmtLeft(p.wheelAt - now)}</div></>}
        </div>
      </div>
      <table className="odds" style={{ marginTop: 10 }}>
        <tbody>
          {segs.slice().reverse().slice(0, 6).map((sgm) => (
            <tr key={sgm.value}><td>{sgm.skin ? 'Скин ~' : ''}<i className="coin" /> {fmt(sgm.value)}</td><td className="num">{((sgm.weight / total) * 100).toFixed(1)}%</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
