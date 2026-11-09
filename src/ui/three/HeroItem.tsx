// Крупный показ выпавшего предмета: 3D с влётом + подпись
import { rarityDef } from '../../config/economy';
import { Item, wearName } from '../../core/items';
import { skinById } from '../../data/cases';
import { fmt } from '../game';
import { Inspect3D } from './Inspect3D';

export function HeroItem({ item }: { item: Item }) {
  const s = skinById(item.skinId);
  if (!s) return null;
  const rd = rarityDef(item.rarity);
  return (
    <div className="hero-item" style={{ ['--rc' as any]: rd.color }}>
      <Inspect3D model={s.model} finish={s.finish} color={rd.color} float={item.float} wearSeed={item.id} intro
        phase={item.pattern?.tier !== 'normal' ? item.pattern?.name : undefined} />
      <div className="hero-rar" style={{ color: rd.color }}>{rd.name} · {wearName(item.float).name}</div>
      <div className="hero-name">{item.st && <span style={{ color: '#ff9d3c' }}>StatTrak™ </span>}{s.model.name} | {s.skin}</div>
      <div className="hero-price"><i className="coin" /> {fmt(item.price)}</div>
    </div>
  );
}
