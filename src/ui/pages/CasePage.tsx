import { useEffect, useMemo, useState } from 'react';
import { RARITIES, WEAR_SPREAD, STATTRAK_MULT, PATTERN_TIERS, rarityDef } from '../../config/economy';
import { CaseDef } from '../../data/cases';
import { Item, round2 } from '../../core/items';
import { game, useProfile, fmt, toast } from '../game';
import { Reel } from '../components/Reel';
import { ItemCard } from '../components/ItemCard';
import { CaseImg } from '../components/CaseImg';
import { DropFx, FxState, fxTier, playDropFx } from '../components/DropFx';
import { useNow, Countdown } from '../components/Countdown';
import { sfx } from '../sound';
import { floatFrom } from '../juice';
import { HeroItem } from '../three/HeroItem';

const COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
    sfx.coin(); floatFrom(document.querySelector('.bal:not(.inv)'), `+${fmt(got)}`); toast(`Продано на ${fmt(got)}`, 'good');
  };

  const tease = !!best && fxTier(best) >= 3 && p.settings.anim === 'full';

  const epic = !!result && !!best && fxTier(best) >= 3;
  const [epicOpen, setEpicOpen] = useState(false);
  useEffect(() => { setEpicOpen(epic); }, [result]);
  const inInv = new Set(p.inventory.map((i) => i.id));
  const sellOne = (it: Item, el?: Element | null) => { const v = game.sell([it.id]); sfx.coin(); floatFrom(el ?? null, `+${fmt(v)}`); };
  // предметы кейса по убыванию шанса, у каждого свой процент
  const byChance = useMemo(() => {
    const cnt = new Map<string, number>();
    for (const s of c.skins) cnt.set(s.rarity, (cnt.get(s.rarity) ?? 0) + 1);
    return c.skins.map((s) => ({ s, pct: (RARITIES.find((r) => r.id === s.rarity)!.chance / cnt.get(s.rarity)!) * 100 }))
      .sort((x, y) => y.pct - x.pct || x.s.base - y.s.base);
  }, [c]);

  return (
    <div>
      <div className={`case-stage${(items && spinning) || result ? ' busy' : ''}`} style={{ ['--stage-img' as any]: `url(${new URL(((import.meta as any).env?.BASE_URL ?? './') + 'stage.webp', location.href).href})` }}>
        <button className="btn sm stage-back" onClick={onBack}>← К кейсам</button>
        <div className="stage-logo">🎰 КЕЙС-РОЯЛЬ</div>
        <button className={`stage-snd${p.settings.sound ? '' : ' off'}`} title="Звук" onClick={() => game.setSettings({ sound: !p.settings.sound })}>{p.settings.sound ? '🔊' : '🔇'}</button>
        <CaseImg c={c} className="big-case" />
        {items && spinning && (
          <div className={`reel-grid n${items.length}`}>
            {items.map((it, i) => (
              <Reel key={i} c={c} winner={it} spinKey={spinKey} fast={fast} compact={items.length > 1}
                sound={i === 0 && p.settings.sound} tease={tease && it === best} onDone={onReelDone} />
            ))}
          </div>
        )}
        {result && !spinning && (
          <div className={`drop-grid n${result.length}`}>
            {result.map((it) => (
              <div className="cell" key={it.id}>
                <ItemCard item={it} />
                {inInv.has(it.id)
                  ? <button className="btn sell-btn" onClick={(e) => sellOne(it, e.currentTarget)}>Продать {fmt(it.price)} <i className="coin" /></button>
                  : <button className="btn sell-btn" disabled>Продано</button>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="open-panel">
        <button className="btn sm odds-btn" onClick={() => setShowOdds(true)}>Шансы призов</button>
        <h2>{c.name}</h2>
        {c.cat === 'event' && avail && (
          <div className="small" style={{ color: 'var(--accent)', fontWeight: 800 }}>
            {avail.ok ? <>⏳ До конца ивента <Countdown to={avail.ends!} now={now} /> · осталось открытий: {avail.left}</>
              : avail.left === 0 ? <>Лимит исчерпан · новое окно через <Countdown to={avail.ends!} now={now} /></>
              : <>Ивент начнётся через <Countdown to={avail.ends!} now={now} /></>}
          </div>
        )}
        <div className="open-row">
          {!free ? (
            <select className="count-select" value={n} disabled={spinning} onChange={(e) => { setN(Number(e.target.value)); setItems(null); setResult(null); }} aria-label="Сколько открыть">
              {COUNTS.map((k) => <option key={k} value={k}>ОТКРЫТЬ ЗА РАЗ {k}</option>)}
            </select>
          ) : <div className="count-select" style={{ display: 'grid', placeItems: 'center' }}>ОТКРЫТЬ ЗА РАЗ 1</div>}
          <button className={`bolt${fast ? ' on' : ''}`} title="Быстрое открытие" onClick={() => game.setSettings({ fast: !fast })}>⚡</button>
          {spinning
            ? <button className="btn primary open-btn" onClick={() => setDone(items?.length ?? 0)}>Пропустить анимацию</button>
            : <button className="btn primary open-btn" onClick={open} disabled={!!err}>
                {free ? 'Открыть бесплатно' : <>Открыть за {fmt(c.price * count)} <i className="coin" /></>}
              </button>}
        </div>
        {err && !spinning && <div className="muted small">{err}</div>}
        {spinning && count > 1 && <div className="small" style={{ color: 'var(--good)' }}>ВСЕ {count} СЛОТОВ ОТКРЫТЫ · {free ? 'БЕСПЛАТНО' : `${fmt(c.price * count)}`}</div>}
        {result && result.length > 1 && !spinning && result.some((i) => inInv.has(i.id)) && (
          <button className="btn" onClick={sellAll}>Продать всё {fmt(round2(result.filter((i) => inInv.has(i.id)).reduce((a, i) => a + i.price, 0)))} <i className="coin" /></button>
        )}
      </div>

      <div className="section case-items">
        <div className="item-grid">
          {byChance.map(({ s, pct }) => (
            <div key={s.id} style={{ position: 'relative' }}>
              <ItemCard skin={s} corner={`${pct < 0.01 ? pct.toFixed(4) : pct.toFixed(3)}%`} />
            </div>
          ))}
        </div>
      </div>

      {showOdds && <OddsModal c={c} onClose={() => setShowOdds(false)} />}
      <DropFx fx={fx} onEnd={() => setFx(null)} />

      {epicOpen && result && (
        <div className="overlay" onClick={() => setEpicOpen(false)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <div className={`result-hero${best && fxTier(best) >= 3 ? ' epic' : ''}`} style={{ ['--rc' as any]: best ? rarityDef(best.rarity).color : '' }}>
              {best && <HeroItem item={best} />}
              {best?.pattern && best.pattern.tier !== 'normal' && (
                <div style={{ marginTop: 10, fontWeight: 800 }}>
                  Паттерн #{best.pattern.n} · {best.pattern.name} · {PATTERN_TIERS.find((t) => t.id === best.pattern!.tier)!.name} (x{PATTERN_TIERS.find((t) => t.id === best.pattern!.tier)!.mult})
                </div>
              )}
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <div className="grow"><span className="muted">Итого:</span> <b><i className="coin" /> {fmt(sum)}</b>
                {!free && <span className={sum >= c.price * result.length ? '' : 'muted'} style={{ marginLeft: 8, color: sum >= c.price * result.length ? 'var(--good)' : undefined }}>
                  ({sum >= c.price * result.length ? '+' : ''}{fmt(sum - c.price * result.length)})
                </span>}
              </div>
              <button className="btn green" onClick={() => setEpicOpen(false)}>Круто!</button>
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
