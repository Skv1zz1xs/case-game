// Особые анимации дропа по крутости. Режим: полные / короткие / выкл (настройки).
import { useEffect, useState } from 'react';
import { rarityIndex, rarityDef } from '../../config/economy';
import type { Item } from '../../core/items';
import type { AnimMode } from '../../core/store';
import { confetti } from '../confetti';
import { sfx } from '../sound';

// 0 обычный · 1 засекреченное · 2 тайное · 3 нож/перчатки · 4 гем · 5 контрабанда
export function fxTier(it: Item): number {
  if (it.rarity === 'contraband') return 5;
  if (it.pattern && (it.pattern.tier === 'gem' || it.pattern.tier === 'supergem')) return 4;
  const ri = rarityIndex(it.rarity);
  if (ri >= 6) return 3;
  if (ri === 5) return 2;
  if (ri === 4) return 1;
  return 0;
}

const TITLES = ['', '', 'ТАЙНОЕ!', 'РЕДКИЙ ДРОП!', 'ГЕМ!', 'КОНТРАБАНДА'];

export function playDropFx(it: Item, mode: AnimMode, setFx: (fx: FxState | null) => void) {
  const tier = fxTier(it);
  sfx.win(tier);
  if (mode === 'off' || tier === 0) return;
  const color = it.pattern?.tier === 'supergem' ? '#ff4dff' : rarityDef(it.rarity).color;
  if (mode === 'short') {
    setFx({ tier: Math.min(tier, 1), color, key: Date.now(), title: '' });
    if (tier >= 2) confetti([color, '#fff', '#ffd700'], 80);
    return;
  }
  const title = it.pattern?.tier === 'supergem' ? 'СУПЕРГЕМ!!!' : TITLES[tier];
  setFx({ tier, color, key: Date.now(), title });
  if (tier >= 2) {
    const delay = tier === 5 ? 1500 : tier === 4 ? 500 : 150;
    const cols = tier >= 4 ? ['#ff00e5', '#00e5ff', '#7cff00', '#ffe600', '#fff'] : [color, '#fff', '#ffd700'];
    setTimeout(() => confetti(cols, tier >= 3 ? 220 : 120, tier >= 3 ? 1.25 : 1), delay);
    if (tier >= 4) setTimeout(() => confetti(cols, 160, 1.4), delay + 900);
  }
}

export interface FxState { tier: number; color: string; key: number; title: string }

export function DropFx({ fx, onEnd }: { fx: FxState | null; onEnd: () => void }) {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!fx) return;
    setK(fx.key);
    const t = setTimeout(onEnd, [900, 1000, 1400, 3300, 3600, 4300][fx.tier]);
    return () => clearTimeout(t);
  }, [fx?.key]);
  if (!fx || k !== fx.key) return null;
  const st = { ['--fc' as any]: fx.color };
  return (
    <div className="fx" style={st} key={fx.key}>
      {fx.tier === 5 && <><div className="fx-dark" /><div className="fx-bars" /></>}
      {fx.tier >= 4 && <div className="fx-prism" />}
      {fx.tier >= 3 && <div className="fx-rays" />}
      <div className="fx-flash" />
      {fx.tier >= 2 && <div className="fx-ring" />}
      {fx.title && <div className="fx-title">{fx.title}</div>}
    </div>
  );
}
