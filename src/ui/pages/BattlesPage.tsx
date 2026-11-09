// Батлы: список, создание, просмотр. Пока против ботов; онлайн-комнаты — на этапе Firebase.
import { useEffect, useMemo, useState } from 'react';
import { CASES, caseById } from '../../data/cases';
import { BattleCfg, BattleMode, BattleRule, MODE_SLOTS, RULE_NAMES, RULE_HINT, BOT_NAMES, costOf, roundsOf, runBattle, teamOf } from '../../core/battle';
import { randomSeed, uid } from '../../core/rng';
import { game, useProfile, fmt, toast } from '../game';
import { CaseImg } from '../components/CaseImg';
import { Reel } from '../components/Reel';
import { ItemCard } from '../components/ItemCard';
import { DropFx, FxState, playDropFx, fxTier } from '../components/DropFx';
import { sfx } from '../sound';
import { confetti } from '../confetti';

const MODES: BattleMode[] = ['1v1', '2v2', '1v1v1', '1v1v1v1'];
const RULES: BattleRule[] = ['normal', 'crazy', 'terminal', 'jackpot'];

export function BattlesPage({ go, openId }: { go: (p: string) => void; openId?: string }) {
  const p = useProfile();
  const [tab, setTab] = useState<'all' | 'wait' | 'run'>('all');
  const [create, setCreate] = useState(false);
  const open = openId ? p.battles.find((b) => b.cfg.id === openId) : undefined;
  if (open) return <BattleView cfg={open.cfg} done={open.done} onBack={() => go('battles')} />;
  const list = p.battles.filter((b) => (tab === 'all' ? true : tab === 'run' ? !b.done : false));

  return (
    <div>
      <div className="glass bt-head">
        <div className="bt-ic">⚔️</div>
        <div className="grow"><h1>Батлы кейсов</h1><div className="small muted">Открывайте одни и те же кейсы рядом · соло или команды 2v2 · по сумме, наоборот, по последнему кейсу или рулеткой-джекпотом</div></div>
        <button className="btn primary lg" onClick={() => setCreate(true)}>＋ Создать батл</button>
      </div>
      <div className="row" style={{ margin: '14px 0' }}>
        <div className="seg">
          <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>Все <span className="cnt">{p.battles.length}</span></button>
          <button className={tab === 'wait' ? 'on' : ''} onClick={() => setTab('wait')}>Ожидание <span className="cnt">0</span></button>
          <button className={tab === 'run' ? 'on' : ''} onClick={() => setTab('run')}>Идёт <span className="cnt">{p.battles.filter((b) => !b.done).length}</span></button>
        </div>
        <div className="grow" />
        <span className="small muted">Друзья появятся тут, когда подключим онлайн</span>
      </div>
      {list.length === 0 ? <div className="empty">Батлов пока нет — создай первый, свободные места займут боты</div> : (
        <div className="bt-list">
          {list.map(({ cfg, done, won, prize }) => {
            const rounds = roundsOf(cfg).length;
            return (
              <div key={cfg.id} className={`bt-row${done ? (won ? ' won' : ' lost') : ''}`}>
                <div className="bt-meta">
                  <div className="row" style={{ gap: 6 }}><span className="bt-mode">{cfg.mode}</span>{cfg.rule !== 'normal' && <span className="bt-rule">{RULE_NAMES[cfg.rule]}</span>}</div>
                  <div className="small" style={{ marginTop: 6 }}>{done ? (won ? <span style={{ color: 'var(--good)' }}>ПОБЕДА</span> : <span style={{ color: 'var(--bad)' }}>ПОРАЖЕНИЕ</span>) : <span style={{ color: 'var(--bad)' }}>● ИДЁТ</span>}</div>
                  <div className="small muted">{rounds} раунд{rounds === 1 ? '' : rounds < 5 ? 'а' : 'ов'}</div>
                </div>
                <div className="bt-cases">
                  {cfg.cases.map((c) => { const cd = caseById(c.caseId)!; return <div key={c.caseId} className="bt-case"><CaseImg c={cd} />{c.count > 1 && <span>×{c.count}</span>}</div>; })}
                </div>
                <div className="bt-price"><div className="small muted">ЦЕНА ЗА ИГРОКА</div><b><i className="coin" /> {fmt(costOf(cfg))}</b>
                  <div className="small muted">ВЫИГРЫШ</div><b style={{ color: 'var(--good)' }}><i className="coin" /> {fmt(prize ?? 0)}</b></div>
                <div className="bt-players">
                  {cfg.slots.map((s, i) => (
                    <span key={i} className={`bt-ava team${teamOf(cfg.mode, i)}`} title={s.nick}>{s.bot ? '🤖' : s.nick[0]?.toUpperCase()}</span>
                  ))}
                </div>
                <button className="btn" onClick={() => go('battle/' + cfg.id)}>Смотреть</button>
              </div>
            );
          })}
        </div>
      )}
      {create && <CreateBattle onClose={() => setCreate(false)} onCreated={(id) => { setCreate(false); go('battle/' + id); }} />}
    </div>
  );
}

function CreateBattle({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const p = useProfile();
  const [mode, setMode] = useState<BattleMode>('1v1');
  const [rule, setRule] = useState<BattleRule>('normal');
  const [cases, setCases] = useState<{ caseId: string; count: number }[]>([]);
  const [q, setQ] = useState('');
  const cost = costOf({ cases });
  const rounds = cases.reduce((a, c) => a + c.count, 0);
  const add = (id: string) => setCases((cs) => (rounds >= 50 ? cs : cs.some((c) => c.caseId === id) ? cs.map((c) => (c.caseId === id ? { ...c, count: c.count + 1 } : c)) : [...cs, { caseId: id, count: 1 }]));
  const dec = (id: string) => setCases((cs) => cs.flatMap((c) => (c.caseId !== id ? [c] : c.count > 1 ? [{ ...c, count: c.count - 1 }] : [])));
  const list = CASES.filter((c) => c.cat !== 'event' && (!q || c.name.toLowerCase().includes(q.toLowerCase())));
  const startIt = () => {
    try {
      const n = MODE_SLOTS[mode];
      const bots = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
      const cfg: BattleCfg = { id: uid(), mode, rule, cases, seed: randomSeed(), created: Date.now(),
        slots: Array.from({ length: n }, (_, i) => (i === 0 ? { nick: p.nick, bot: false } : { nick: bots[i - 1], bot: true })) };
      game.startBattle(cfg);
      sfx.whoosh();
      onCreated(cfg.id);
    } catch (e) { toast((e as Error).message, 'bad'); }
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 10 }}><h2 className="grow" style={{ fontSize: 20 }}>Создать батл</h2><button className="iconbtn" onClick={onClose}>✕</button></div>
        <div className="small muted" style={{ marginBottom: 6 }}>Формат</div>
        <div className="seg" style={{ marginBottom: 10 }}>{MODES.map((m) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m}</button>)}</div>
        <div className="small muted" style={{ marginBottom: 6 }}>Режим</div>
        <div className="seg" style={{ marginBottom: 4, flexWrap: 'wrap' }}>{RULES.map((r) => <button key={r} className={rule === r ? 'on' : ''} onClick={() => setRule(r)}>{RULE_NAMES[r]}</button>)}</div>
        <div className="small" style={{ marginBottom: 12, color: 'var(--accent)' }}>{RULE_HINT[rule]}</div>
        <div className="bt-picked">
          {cases.length === 0 && <span className="muted small">Выбери кейсы ниже (до 50 раундов)</span>}
          {cases.map((c) => { const cd = caseById(c.caseId)!; return (
            <div key={c.caseId} className="bt-case big"><CaseImg c={cd} /><span>×{c.count}</span>
              <div className="bt-pm"><button onClick={() => dec(c.caseId)}>−</button><button onClick={() => add(c.caseId)}>＋</button></div></div>); })}
        </div>
        <input className="input" placeholder="Поиск кейса" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: '10px 0' }} />
        <div className="bt-pick-grid">
          {list.map((c) => (
            <button key={c.id} className="case-card" onClick={() => add(c.id)}>
              <div className="cimg"><CaseImg c={c} /></div>
              <div className="cinfo"><div className="ttl">{c.name}</div><div className="price"><i className="coin" />{fmt(c.price)}</div></div>
            </button>
          ))}
        </div>
        <div className="row sticky-create">
          <span className="grow">Раундов: <b>{rounds}</b> · цена за игрока <b><i className="coin" /> {fmt(cost)}</b></span>
          <button className="btn primary lg" disabled={!cases.length || p.balance < cost} onClick={startIt}>Создать и начать</button>
        </div>
      </div>
    </div>
  );
}

// Просмотр батла: раунды крутятся одновременно у всех слотов
function BattleView({ cfg, done, onBack }: { cfg: BattleCfg; done: boolean; onBack: () => void }) {
  const p = useProfile();
  const res = useMemo(() => runBattle(cfg), [cfg]);
  const rounds = roundsOf(cfg);
  const [r, setR] = useState(done ? rounds.length : 0);
  const [spinKey, setSpinKey] = useState(0);
  const [fx, setFx] = useState<FxState | null>(null);
  const finished = r >= rounds.length;
  const fast = p.settings.fast;

  useEffect(() => {
    if (finished) {
      if (!done) {
        game.finishBattle(cfg.id);
        const won = res.winners.includes(0);
        if (won) { sfx.win(3); if (p.settings.anim !== 'off') confetti(['#2fd47a', '#2de2d0', '#ffd700', '#fff'], 200, 1.2); } else sfx.lose();
      }
      return;
    }
    setSpinKey((k) => k + 1);
    const t = setTimeout(() => {
      const best = res.drops[r].reduce((a, b) => (fxTier(b) > fxTier(a) ? b : a));
      if (fxTier(best) >= 3) playDropFx(best, p.settings.anim, setFx);
      setR((x) => x + 1);
    }, (fast ? 1400 : 5600) + 700);
    return () => clearTimeout(t);
  }, [r]);

  const shownTotals = cfg.slots.map((_, s) => res.drops.slice(0, Math.min(r, rounds.length)).reduce((a, row) => a + row[s].price, 0));
  const cur = Math.min(r, rounds.length - 1);
  const c = caseById(rounds[cur])!;
  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn sm" onClick={onBack}>← К батлам</button>
        <span className="bt-mode">{cfg.mode}</span>{cfg.rule !== 'normal' && <span className="bt-rule">{RULE_NAMES[cfg.rule]}</span>}
        <div className="grow" />
        <b>{finished ? 'Батл завершён' : `Раунд ${r + 1} / ${rounds.length}`}</b>
        <span className="small muted">· {c.name}</span>
      </div>
      <div className="bt-progress"><div style={{ width: `${(Math.min(r, rounds.length) / rounds.length) * 100}%` }} /></div>
      <div className="bt-rounds">
        {rounds.map((cid, k) => (
          <div key={k} className={`bt-round${k === cur && !finished ? ' cur' : ''}${k < r ? ' done' : ''}`}><CaseImg c={caseById(cid)!} /></div>
        ))}
      </div>
      <div className="bt-arena" style={{ gridTemplateColumns: `repeat(${cfg.slots.length}, minmax(0, 1fr))` }}>
        {cfg.slots.map((s, i) => {
          const win = finished && res.winners.includes(i);
          return (
            <div key={i} className={`bt-col team${teamOf(cfg.mode, i)}${finished ? (win ? ' win' : ' lose') : ''}`}>
              <div className="bt-player">
                <span className={`bt-ava team${teamOf(cfg.mode, i)}`}>{s.bot ? '🤖' : s.nick[0]?.toUpperCase()}</span>
                <div className="grow" style={{ minWidth: 0 }}><b className="ellip">{s.nick}</b><div className="small"><i className="coin" /> {fmt(shownTotals[i])}</div></div>
                {win && <span className="bt-crown">👑</span>}
              </div>
              {!finished && (
                <Reel c={c} winner={res.drops[r][i]} spinKey={spinKey} fast={fast} compact sound={i === 0 && p.settings.sound}
                  seed={(cfg.seed ^ (r * 7919 + i * 104729)) >>> 0} />
              )}
              <div className="bt-drops">
                {res.drops.slice(0, Math.min(r, rounds.length)).map((row, k) => <ItemCard key={k} item={row[i]} compact />).reverse()}
              </div>
            </div>
          );
        })}
      </div>
      {finished && (
        <div className="glass bt-result">
          {cfg.rule === 'jackpot' && <div className="small muted">Рулетка джекпота: {(res.jackpotRoll! * 100).toFixed(1)}%</div>}
          <div className={`bt-verdict ${res.winners.includes(0) ? 'win' : 'lose'}`}>{res.winners.includes(0) ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}</div>
          <div className="small">{res.winners.map((w) => cfg.slots[w].nick).join(' и ')} забира{res.winners.length > 1 ? 'ют' : 'ет'} всё: <b><i className="coin" /> {fmt(res.drops.flat().reduce((a, i) => a + i.price, 0))}</b></div>
          <button className="btn primary" onClick={onBack}>К батлам</button>
        </div>
      )}
      <DropFx fx={fx} onEnd={() => setFx(null)} />
    </div>
  );
}
