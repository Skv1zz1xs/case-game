import { memo } from 'react';
import { rarityDef } from '../../config/economy';
import type { Item } from '../../core/items';
import { wearName } from '../../core/items';
import type { SkinDef } from '../../data/cases';
import { skinById } from '../../data/cases';
import { ItemView } from '../three/ItemView';
import { fmt } from '../game';

interface Props {
  item?: Item;
  skin?: SkinDef;
  priceText?: string;
  compact?: boolean;
  selected?: boolean;
  star?: boolean;
  onClick?: () => void;
  onLock?: () => void;
  corner?: string;   // текст в правом верхнем углу плитки вместо цены (шанс)
}

export const ItemCard = memo(function ItemCard({ item, skin, priceText, compact, selected, star, onClick, onLock, corner }: Props) {
  const s = skin ?? (item ? skinById(item.skinId) : undefined);
  if (!s) return null;
  const rd = rarityDef(item?.rarity ?? s.rarity);
  const gem = item?.pattern && (item.pattern.tier === 'gem' || item.pattern.tier === 'supergem');
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`item${compact ? ' compact' : ''}${selected ? ' sel' : ''}${item?.locked ? ' locked' : ''}`}
      style={{ ['--rc' as any]: rd.color }} onClick={onClick} title={`${s.model.name} | ${s.skin}`}>
      <div className="tile">
        {item && !compact && (
          <div className="meta">
            <span>{wearName(item.float).short}</span>
            {item.st && <span className="st">{s.model.kind === 'sticker' ? 'ГОЛО' : 'ST'}</span>}
            {item.pattern && item.pattern.tier !== 'normal' && <span className={gem ? 'gem' : ''}>{item.pattern.name}</span>}
          </div>
        )}
        {star && <span className="star">⭐</span>}
        {onLock && item && <span className={`lockbtn${item.locked ? ' on' : ''}`} role="button" title={item.locked ? 'Открепить' : 'Закрепить (не продастся)'} onClick={(e) => { e.stopPropagation(); onLock(); }}>{item.locked ? '🔒' : '🔓'}</span>}
        {corner ? <div className="pr">{corner}</div> : priceText !== '' && <div className="pr"><i className="coin" />{priceText ?? (item ? fmt(item.price) : fmt(s.base))}</div>}
        <ItemView model={s.model} finish={s.finish} color={rd.color} float={item?.float} wearSeed={item?.id} phase={item?.pattern?.tier !== 'normal' ? item?.pattern?.name : undefined} gem={!!gem} />
      </div>
      <div className="cap">
        <div className="nm">{item?.st && s.model.kind !== 'sticker' ? 'StatTrak™ ' : ''}{s.model.kind === 'knife' || s.model.kind === 'gloves' ? '★ ' : ''}{s.model.name}</div>
        <div className="sk">{s.skin}</div>
      </div>
    </Tag>
  );
});
