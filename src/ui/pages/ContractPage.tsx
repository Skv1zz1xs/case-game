import { useState } from 'react';
import { CONTRACT_SIZE, rarityDef } from '../../config/economy';
import { caseById } from '../../data/cases';
import { RECIPES } from '../../data/recipes';
import { Item, sortItems } from '../../core/items';
import { contractError, contractOdds, contractValueRange, nextRarity } from '../../core/contract';
import type { Recipe } from '../../data/recipes';
import { game, useProfile, fmt, toast } from '../game';
import { ItemPicker } from '../components/ItemPicker';
import { ItemCard } from '../components/ItemCard';
import { ItemArt } from '../components/ItemArt';
import { DropFx, FxState, playDropFx } from '../components/DropFx';
import { sfx } from '../sound';
import { HeroItem } from '../three/HeroItem';
import { confetti } from '../confetti';

export function ContractPage({ onBack }: { onBack: () => void }) {
  const p = useProfile();
  const [sel, setSel] = useState<string[]>([]);
  const [signing, setSigning] = useState(false);
  const [res, setRes] = useState<{ item: Item; recipe?: Recipe; first?: boolean } | null>(null);
  const [fx, setFx] = useState<FxState | null>(null);
  const [book, setBook] = useState(false);

  const items = sel.map((id) => p.inventory.find((i) => i.id === id)).filter(Boolean) as Item[];
  const rar = items[0]?.rarity ?? null;
  const err = contractError(items);
  const range = contractValueRange(items);
  const odds = items.length ? contractOdds(items) : [];

  const toggle = (it: Item) => setSel((s) => (s.includes(it.id) ? s.filter((x) => x !== it.id) : s.length >= CONTRACT_SIZE || (rar && it.rarity !== rar) ? s : [...s, it.id]));
  const autofill = () => {
    const r = rar ?? sortItems(p.inventory.filter((i) => !i.locked && i.rarity !== 'contraband'), 'price', 1)[0]?.rarity;
    if (!r) return toast('Нет подходящих предметов', 'bad');
    const pool = sortItems(p.inventory.filter((i) => i.rarity === r && !i.locked && !sel.includes(i.id)), 'price', 1);
    setSel((s) => [...s, ...pool.slice(0, CONTRACT_SIZE - s.length).map((i) => i.id)]);
  };
  const sign = () => {
    if (err || signing) return;
    try {
      const out = game.contractEx(sel);
      sfx.whoosh(); setSigning(true); setSel([]);
      setTimeout(() => {
        setSigning(false); setRes(out);
        playDropFx(out.item, p.settings.anim, setFx);
        if (out.recipe && p.settings.anim !== 'off') confetti(['#ff00e5', '#00e5ff', '#ffd700', '#fff'], 200, 1.3);
      }, p.settings.fast ? 600 : 1800);
    } catch (e) { toast((e as Error).message, 'bad'); }
  };

  return (
    <div>
      <button className="back" onClick={onBack}>← Режимы</button>
      <div className="row" style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 24 }} className="grow">Контракты</h1>
        <button className="btn sm" onClick={() => setBook(true)}>📖 Книга рецептов {p.recipes.length}/{RECIPES.length}</button>
      </div>

      <div className="glass" style={{ padding: 14, marginBottom: 14 }}>
        <div className="contract-slots">
          {Array.from({ length: CONTRACT_SIZE }, (_, i) => items[i]
            ? <ItemCard key={items[i].id} item={items[i]} compact onClick={() => toggle(items[i])} />
            : <div key={i} className="slot">{i + 1}</div>)}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="grow small">
            {rar ? <>Вложено <b><i className="coin" /> {fmt(range.sum)}</b> → <span style={{ color: rarityDef(nextRarity(rar)).color, fontWeight: 800 }}>{rarityDef(nextRarity(rar)).name}</span> за {fmt(range.min)} – {fmt(range.max)}</>
              : <span className="muted">10 предметов одной редкости → 1 предмет следующей редкости. В среднем отдаёт 95–100% вложенного.</span>}
            {odds.length > 0 && <div className="muted" style={{ marginTop: 4 }}>Коллекции: {odds.map((o) => `${caseById(o.caseId)?.name ?? '?'} ${Math.round(o.share * 100)}%`).join(' · ')}</div>}
          </div>
          <button className="btn sm" onClick={autofill} disabled={sel.length >= CONTRACT_SIZE}>Автозаполнить</button>
          <button className="btn sm" onClick={() => setSel([])} disabled={!sel.length}>Очистить</button>
          <button className="btn primary" onClick={sign} disabled={!!err || signing}>{signing ? 'Подписываем…' : `Подписать (${sel.length}/${CONTRACT_SIZE})`}</button>
        </div>
      </div>

      <ItemPicker items={p.inventory} selected={sel} onToggle={toggle} lockRarity={rar} exclude={(i) => i.rarity === 'contraband'} />

      {signing && (
        <div className="overlay"><div className="contract-anim"><div className="paper">📜</div><div className="stamp">ПОДПИСАНО</div></div></div>
      )}
      {res && (
        <div className="overlay" onClick={() => setRes(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            {res.recipe && <div className="recipe-banner">✨ Секретный рецепт{res.first ? ' открыт' : ''}: «{res.recipe.name}»</div>}
            <div className={`result-hero${res.recipe ? ' epic' : ''}`} style={{ ['--rc' as any]: rarityDef(res.item.rarity).color }}><HeroItem item={res.item} /></div>
            <button className="btn green" style={{ marginTop: 14, width: '100%' }} onClick={() => setRes(null)}>Забрать</button>
          </div>
        </div>
      )}
      {book && <RecipeBook onClose={() => setBook(false)} />}
      <DropFx fx={fx} onEnd={() => setFx(null)} />
    </div>
  );
}

function RecipeBook({ onClose }: { onClose: () => void }) {
  const p = useProfile();
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 6 }}><h2 className="grow" style={{ fontSize: 19 }}>📖 Книга рецептов</h2><button className="iconbtn" onClick={onClose}>✕</button></div>
        <p className="muted small">Особые комбинации в контракте дают скрытые эксклюзивы, которые стоят дороже обычного результата. Пока рецепт не открыт, видна только загадка.</p>
        <div className="recipes">
          {RECIPES.map((r) => {
            const open = p.recipes.includes(r.id);
            return (
              <div key={r.id} className={`glass recipe${open ? ' open' : ''}`}>
                <div className="recipe-art">{open ? <ItemArt model={r.skin.model} finish={r.skin.finish} color="#ff4dff" gem /> : <span>❓</span>}</div>
                <div className="grow">
                  <b>{open ? r.name : '???'}</b>
                  <div className="small" style={{ fontStyle: 'italic', margin: '4px 0' }}>«{r.riddle}»</div>
                  {open && <div className="small" style={{ color: 'var(--good)' }}>{r.how}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
