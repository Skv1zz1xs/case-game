// Картинка предмета: 3D-превью (если есть WebGL), пока рендерится — 2D-чертёж
import { useEffect, useState, memo } from 'react';
import type { WeaponModel } from '../../data/weapons';
import type { Finish } from '../../data/cases';
import { ItemArt } from '../components/ItemArt';
import { renderThumb, webglOk } from './render3d';

interface Props { model: WeaponModel; finish: Finish; color?: string; phase?: string; gem?: boolean; float?: number; wearSeed?: string }

export const ItemView = memo(function ItemView(p: Props) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!webglOk) return;
    let alive = true;
    renderThumb(p.model, p.finish, { phase: p.phase, float: p.float, wearSeed: p.wearSeed }).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [p.model.id, p.finish.seed, p.finish.style, p.phase, p.float, p.wearSeed]);
  if (!url) return <ItemArt {...p} />;
  return (
    <div className={`art3d${p.gem ? ' gem' : ''}`} style={p.color ? { filter: `drop-shadow(0 4px 10px ${p.color}66)` } : undefined}>
      <img src={url} alt="" draggable={false} />
    </div>
  );
});
