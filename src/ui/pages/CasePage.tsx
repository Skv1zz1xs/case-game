import { useEffect, useMemo, useState } from 'react';
import { RARITIES, WEAR_SPREAD, STATTRAK_MULT, PATTERN_TIERS, rarityDef } from '../../config/economy';
import { CaseDef } from '../../data/cases';
import { Item, round2 } from '../../core/items';
import { game, useProfile, fmt, toast } from '../game';
import { Reel } from '../components/Reel';
import { ItemCard } from '../components/ItemCard';
import { CaseBox } from '../components/CaseBox';
import { DropFx, FxState, fxTier, playDropFx } from '../components/DropFx';
import { useNow, Countdown } from '../components/Countdown';
import { sfx } from '../sound';
import { HeroItem } from '../three/HeroItem';

const COUNTS = [1, 3, 5, 10];

export function CasePage({ c, onBack, free }: { c: CaseDef; onBack: () => void; free?: boolean }) {
  const p = useProfile();
  const now = useNow(1000);
  const [n, setN] = useState(1);
  const [items, setItems] = useState<Item[] | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(0);
  const [result, setResult] = useState<Item[] | null>(null);
  const [fx, setFx] = useState<FxState | null>(null);
  const [showOdds, setShowOdds] = useState(false);
  const fast = p.settings.fast;
  const count = free ? 1 : n;
  const avail = free ? null : game.caseAvailability(c);
  const err = free ? (game.freeReady() ? null : 'Фри кейс ещё не готов') : game.canOpen(c.id, count);

  useEffect(() => { window.scrollTo(0, 0); }, [c.id]);

  const open = () => {
    if (spinning) return;
    try {
      const got = free ? [game.openFree()] : game.open(c.id, count);
      sfx.whoosh();
      setItems(got); setDone(0); setSpinning(true); setResult(null); setSpinKey((k) => k + 1);
    } catch (e) { toast((e as Error).message, 'bad'); }
  };

  const best = useMemo(() => items?.reduce((a, b) => (fxTier(b) > fxTier(a) || (fxTier(b) === fxTier(a) && b.price > a.price) ? b : a)), [items]);

  const onReelDone = () => setDone((d) => d + 1);
  useEffect(() => {
    if (!items || done < items.length || !spinning) return;
    setSpinning(false);
    const tier = best ? fxTier(best) : 0;
    if (best) playDropFx(best, p.settings.anim, setFx);
    const wait = p.settings.anim === 'full' ? [350, 500, 900, 1600, 2000, 3000][tier] : 300;
    const t = setTimeout(() => setResult(items), wait);
    return () => clearTimeout(t);
  }, [done]);

  const sum = result ? round2(result.reduce((s, i) => s + i.price, 0)) : 0;
  const sellAll = () => {
    if (!result) return;
    const ids = new Set(game.p.inventory.map((i) => i.id));
    const got = game.sell(result.filter((i) => ids.has(i.id)).map((i) => i.id));
    sfx.coin(); toast(`Продано на ${fmt(got)}`, 'good'); setResult(null);
  };

  const tease = !!best && fxTier(best) >= 3 && p.settings.anim === 'full';
  const compact = count > 1;

  return (
    <div>
      <button className="back" onClick={onBack}>← Все кейсы</button>
      <div className="case-head">
        <CaseBox c={c} big shake={spinning} />
        <div>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)' }}>{c.name}</h1>
          <div className="muted" style={{ margin: '6px 0 10px' }}>{c.tagline}</div>
          {c.cat === 'event' && avail && (
            <div className="small" style={{ color: 'var(--accent)', fontWeight: 800 }}>
              {avail.ok ? <>⏳ До конца ивента: <Countdown to={avail.ends!} now={now} /> · осталось открытий: {avail.left}</>
                : avail.left === 0 ? <>Лимит исчерпан · новое окно через <Countdown to={avail.ends!} now={now} /></>
                : <>Ивент начнётся через <Countdown to={avail.ends!} now={now} /></>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {Array.from({ length: count }, (_, i) => items?.[i] ?? null).map((it, i) => (
          <Reel key={i} c={c} winner={it} spinKey={spinKey} fast={fast} compact={compact}
            sound={i === 0 && p.settings.sound} tease={tease && it === best} onDone={onReelDone} />
        ))}
      </div>

      <div className="open-bar">
        {!free && (
          <div className="seg" role="group" aria-label="Сколько открыть">
            {COUNTS.map((k) => <button key={k} className={n === k ? 'on' : ''} onClick={() => { setN(k); setItems(null); }} disabled={spinning}>x{k}</button>)}
          </div>
        )}
        <button className="btn primary lg" onClick={open} disabled={!!err || spinning}>
          {spinning ? 'Крутим…' : free ? 'Открыть бесплатно' : <>Открыть за <i className="coin" />{fmt(c.price * count)}</>}
        </button>
        <button className={`btn${fast ? ' green' : ''}`} onClick={() => game.setSettings({ fast: !fast })}>⚡ Быстро</button>
      </div>
      {err && !spinning && <div className="muted small" style={{ textAlign: 'center', marginTop: -6 }}>{err}</div>}

      <div className="section" style={{ marginTop: 18 }}>
        <div className="section-h">
          <h2>Содержимое</h2><div className="grow" />
          <button className="btn sm" onClick={() => setShowOdds(true)}>📊 Шансы призов</button>
        </div>
        <div className="item-grid">
          {c.skins.map((s) => <ItemCard key={s.id} skin={s} />)}
        </div>
      </div>

      {showOdds && <OddsModal c={c} onClose={() => setShowOdds(false)} />}
      <DropFx fx={fx} onEnd={() => setFx(null)} />

      {result && (
        <div className="overlay" onClick={() => setResult(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <div className={`result-hero${best && fxTier(best) >= 3 ? ' epic' : ''}`} style={{ ['--rc' as any]: best ? rarityDef(best.rarity).color : '' }}>
              {best && <HeroItem item={best} />}
              {best?.pattern && best.pattern.tier !== 'normal' && (
                <div style={{ marginTop: 10, fontWeight: 800 }}>
                  Паттерн #{best.pattern.n} · {best.pattern.name} · {PATTERN_TIERS.find((t) => t.id === best.pattern!.tier)!.name} (x{PATTERN_TIERS.find((t) => t.id === best.pattern!.tier)!.mult})
                </div>
              )}
            </div>
            {result.length > 1 && (
              <div className="result-items">
                {result.filter((x) => x !== best).map((it) => <ItemCard key={it.id} item={it} />)}
              </div>
            )}
            <div className="row" style={{ marginTop: 14 }}>
              <div className="grow"><span className="muted">Итого:</span> <b><i className="coin" /> {fmt(sum)}</b>
                {!free && <span className={sum >= c.price * result.length ? '' : 'muted'} style={{ marginLeft: 8, color: sum >= c.price * result.length ? 'var(--good)' : undefined }}>
                  ({sum >= c.price * result.length ? '+' : ''}{fmt(sum - c.price * result.length)})
                </span>}
              </div>
              <button className="btn" onClick={sellAll}>Продать за {fmt(sum)}</button>
              <button className="btn green" onClick={() => setResult(null)}>Забрать</button>
              {!free && <button className="btn primary" onClick={() => { setResult(null); setTimeout(open, 50); }} disabled={!!game.canOpen(c.id, count)}>Ещё раз</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OddsModal({ c, onClose }: { c: CaseDef; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h2 className="grow" style={{ fontSize: 18 }}>Шансы призов · {c.name}</h2><button className="iconbtn" onClick={onClose}>✕</button></div>
        <p className="muted small">Цена зависит от износа (±{WEAR_SPREAD * 100}%), StatTrak™ — x{STATTRAK_MULT} (шанс 10%).
          У ножей и перчаток есть паттерны: редкий x2.5, гем x8, супергем x30.</p>
        <table className="odds">
          <thead><tr><th>Предмет</th><th className="num">Шанс</th><th className="num">Цена</th></tr></thead>
          <tbody>
            {RARITIES.map((r) => {
              const list = c.skins.filter((s) => s.rarity === r.id);
              if (!list.length) return null;
              return [
                <tr key={r.id}><td colSpan={3} style={{ color: r.color, fontWeight: 800, paddingTop: 14 }}>
                  <span className="rdot" style={{ ['--rc' as any]: r.color }} />{r.name} — {(r.chance * 100).toLocaleString('ru-RU', { maximumFractionDigits: 3 })}%
                </td></tr>,
                ...list.map((s) => {
                  const lo = s.base * (1 - WEAR_SPREAD);
                  const hi = s.base * (1 + WEAR_SPREAD) * STATTRAK_MULT * (r.id === 'rare' ? 30 : 1);
                  return (
                    <tr key={s.id}>
                      <td>{s.model.name} | {s.skin}</td>
                      <td className="num">{((r.chance / list.length) * 100).toLocaleString('ru-RU', { maximumFractionDigits: 4 })}%</td>
                      <td className="num">{fmt(lo)} – {fmt(hi)}</td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
