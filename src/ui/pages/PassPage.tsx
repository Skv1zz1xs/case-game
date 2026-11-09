// Батл-пасс: уровень, дорожки «Бесплатно / Премиум», задания, топ сезона
import { useState } from 'react';
import * as E from '../../config/economy';
import { PASS_TRACK, PassReward, rewardValue } from '../../data/battlepass';
import { caseById, skinById } from '../../data/cases';
import * as RW from '../../core/rewards';
import { game, useProfile, fmt, toast } from '../game';
import { CaseImg } from '../components/CaseImg';
import { ItemView } from '../three/ItemView';
import { useNow, Countdown } from '../components/Countdown';
import { sfx } from '../sound';
import { confetti } from '../confetti';

function RewardBox({ r }: { r: PassReward }) {
  if (r.kind === 'coins') return <div className="pr-coins"><span className="pr-hex">⬢</span><b><i className="coin" /> {fmt(r.value)}</b><span className="small muted">монеты</span></div>;
  if (r.kind === 'case') { const c = caseById(r.caseId)!; return <div className="pr-case"><CaseImg c={c} /><span className="small">{c.name}</span></div>; }
  const s = skinById(r.skinId)!;
  return <div className="pr-skin"><ItemView model={s.model} finish={s.finish} /><span className="small muted ellip">{s.model.name}</span><b className="ellip">{s.skin}</b><span className="small"><i className="coin" /> {fmt(rewardValue(r))}</span></div>;
}

export function PassPage() {
  const p = useProfile();
  const now = useNow(1000);
  const [tab, setTab] = useState<'pass' | 'quests' | 'top'>('pass');
  const ps = p.pass;
  const need = E.passXpNeed(ps.level);
  const end = Date.parse(E.PASS_SEASON_END);
  const claimable = PASS_TRACK.some((row, i) => i < ps.level && ((row.free && !ps.claimed.includes(`${i + 1}:free`)) || (ps.premium && !ps.claimed.includes(`${i + 1}:prem`))));
  const q = RW.quests(game);
  const claim = (l: number, t: 'free' | 'prem') => { try { game.claimPass(l, t); sfx.coin(); toast('Награда получена', 'good'); } catch (e) { toast((e as Error).message, 'bad'); } };

  return (
    <div>
      <div className="glass pass-head">
        <div className="pass-lvl"><span className="small muted">УРОВЕНЬ</span><b>{ps.level}</b><span className="small muted">из {E.PASS_LEVELS}</span></div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row"><h1>Батл-пасс</h1><span className="pass-season">СЕЗОН 1</span></div>
          <div className="small muted">⏱ Осталось <Countdown to={end} now={now} /></div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}><span className="small">Уровень {ps.level} → {Math.min(E.PASS_LEVELS, ps.level + 1)}</span><span className="small" style={{ color: 'var(--accent)' }}>{fmt(ps.xp)} / {fmt(need)} XP</span></div>
          <div className="pass-bar"><div style={{ width: `${Math.min(100, (ps.xp / need) * 100)}%` }} /></div>
          <div className="small muted" style={{ marginTop: 4 }}>1–60 XP за каждый открытый кейс (чем дороже кейс, тем больше) · {E.PASS_XP_DAILY_LOGIN} XP за ежедневную награду · задания</div>
        </div>
        <div className="pass-btns">
          <button className="btn primary" disabled={!claimable} onClick={() => { const n = game.claimAllPass(); sfx.coin(); toast(`Получено наград: ${n}`, 'good'); }}>{claimable ? 'Забрать всё' : 'Нечего забирать'}</button>
          <button className="btn gold" disabled={ps.premium} onClick={() => { try { game.buyPremium(); sfx.win(3); confetti(['#ffd700', '#ffb020', '#fff'], 160); } catch (e) { toast((e as Error).message, 'bad'); } }}>
            {ps.premium ? 'PREMIUM АКТИВЕН' : <>PREMIUM · <i className="coin" /> {fmt(E.PASS_PREMIUM_PRICE)}</>}
          </button>
        </div>
      </div>

      <div className="page-tabs" style={{ marginTop: 14 }}>
        <button className={tab === 'pass' ? 'on' : ''} onClick={() => setTab('pass')}>Пасс</button>
        <button className={tab === 'quests' ? 'on' : ''} onClick={() => setTab('quests')}>Задания</button>
        <button className={tab === 'top' ? 'on' : ''} onClick={() => setTab('top')}>Топ-10</button>
      </div>

      {tab === 'pass' && (
        <div className="track-wrap glass">
          <div className="track-labels">
            <div className="tl"><span>🎫</span><b>БЕСПЛАТНО</b><span className="small muted">для всех</span></div>
            <div className="tl prem"><span>👑</span><b>ПРЕМИУМ</b><span className="small muted">{ps.premium ? 'открыто' : 'закрыто'}</span></div>
          </div>
          <div className="track">
            {PASS_TRACK.map((row, i) => {
              const lvl = i + 1, open = ps.level >= lvl;
              const fk = `${lvl}:free`, pk = `${lvl}:prem`;
              return (
                <div key={lvl} className={`tcol${open ? ' open' : ''}${lvl === ps.level + 1 ? ' next' : ''}`}>
                  <div className="tnode">{lvl}</div>
                  <div className={`tcell${row.free ? '' : ' empty'}`}>
                    {row.free && <RewardBox r={row.free} />}
                    {row.free && (ps.claimed.includes(fk) ? <span className="tstate ok">✓ получено</span>
                      : open ? <button className="btn primary sm" onClick={() => claim(lvl, 'free')}>Забрать</button> : <span className="tstate">🔒 закрыто</span>)}
                  </div>
                  <div className="tcell prem">
                    <RewardBox r={row.prem} />
                    {ps.claimed.includes(pk) ? <span className="tstate ok">✓ получено</span>
                      : open && ps.premium ? <button className="btn gold sm" onClick={() => claim(lvl, 'prem')}>Забрать</button> : <span className="tstate gold">PREMIUM</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'quests' && (
        <div className="quests-3">
          <div>
            <div className="qcol-h"><b>ЕЖЕДНЕВНЫЕ</b><span className="small muted">новые через <Countdown to={q.ends} now={now} /></span></div>
            {q.list.map((x) => (
              <div key={x.id} className="glass quest">
                <div className="grow"><b>{x.text}</b>
                  <div className="progress" style={{ marginTop: 6 }}><div style={{ width: `${(x.prog / x.goal) * 100}%` }} /></div>
                  <div className="small muted" style={{ marginTop: 4 }}>{fmt(x.prog)} / {fmt(x.goal)} · <i className="coin" /> {fmt(x.coins)}</div></div>
                <button className="btn primary sm" disabled={x.got || x.prog < x.goal} onClick={() => { try { RW.claimQuest(game, x.id); sfx.coin(); } catch (e) { toast((e as Error).message, 'bad'); } }}>{x.got ? '✓' : 'Забрать'}</button>
              </div>
            ))}
          </div>
          <div>
            <div className="qcol-h"><b style={{ color: '#a98bff' }}>НЕДЕЛЬНЫЕ</b></div>
            <WeekQuest text="Открой 150 кейсов" prog={p.stats.opened} goal={150} />
            <WeekQuest text="Выиграй 10 апгрейдов" prog={p.stats.upgradesWon} goal={10} />
            <WeekQuest text="Выиграй 3 батла" prog={p.stats.battlesWon} goal={3} />
          </div>
          <div>
            <div className="qcol-h"><b style={{ color: '#ffd36b' }}>СЕЗОН</b><span className="small muted">до конца <Countdown to={end} now={now} /></span></div>
            <WeekQuest text="Открой 1000 кейсов" prog={p.stats.opened} goal={1000} />
            <WeekQuest text="Подпиши 20 контрактов" prog={p.stats.contracts} goal={20} />
            <WeekQuest text="Открой 3 секретных рецепта" prog={p.recipes.length} goal={3} />
          </div>
        </div>
      )}

      {tab === 'top' && (
        <div className="glass" style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-h)', textTransform: 'uppercase', fontWeight: 500 }}>Лидеры сезона</h2>
          <p className="muted small">Побеждает самый высокий уровень пасса, при равенстве — кто дошёл первым. Таблица заработает, когда подключим онлайн с друзьями.</p>
          <div className="glass quest"><b style={{ color: 'var(--accent)' }}>ТЫ</b><span className="grow">Уровень {ps.level} · {fmt(ps.xp)} XP</span></div>
        </div>
      )}
    </div>
  );
}

// Недельные и сезонные цели — прогресс по статистике (награда — опыт пасса, начисляется автоматически позже)
function WeekQuest({ text, prog, goal }: { text: string; prog: number; goal: number }) {
  const k = Math.min(1, prog / goal);
  return (
    <div className="glass quest">
      <div className="grow"><b>{text}</b>
        <div className="progress" style={{ marginTop: 6 }}><div style={{ width: `${k * 100}%` }} /></div>
        <div className="small muted" style={{ marginTop: 4 }}>{fmt(Math.min(prog, goal))} / {fmt(goal)}</div></div>
      <span className="small" style={{ color: k >= 1 ? 'var(--good)' : 'var(--muted)' }}>{k >= 1 ? '✓' : `${Math.round(k * 100)}%`}</span>
    </div>
  );
}
