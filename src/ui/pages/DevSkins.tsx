// Служебная витрина стилей (#/dev-skins): по одному скину каждого стиля на AK-47, крупно
import { WEAPONS, KNIVES } from '../../data/weapons';
import type { PatternStyle } from '../../data/weapons';
import { ItemView } from '../three/ItemView';

const STYLES: PatternStyle[] = ['galaxy', 'fade', 'anodized', 'marble', 'damascus', 'lava', 'acid', 'hologram', 'beast', 'flames', 'graphic', 'retrowave', 'lowpoly', 'carbon', 'camo', 'circuit'];
const PALS: [string, string, string][] = [['#7c4dff', '#18ffff', '#ff4081'], ['#ff1744', '#ffd600', '#ff6d00'], ['#00e676', '#1de9b6', '#ffea00'], ['#2962ff', '#e040fb', '#00e5ff']];

export function DevSkins() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
      {STYLES.map((st, i) => (
        <div key={st} className="glass" style={{ padding: 8 }}>
          <div className="small muted">{st}</div>
          <ItemView model={i % 4 === 3 ? KNIVES[i % KNIVES.length] : WEAPONS[[7, 11, 8, 1][i % 4]]} finish={{ style: st, colors: PALS[i % 4], seed: 1000 + i * 37, scheme: [{ sec: '#121316', acc: '#d9a83a', secKind: 0, accKind: 2 }, { sec: '#e9eaee', acc: '#d5dbe3', secKind: 1, accKind: 2 }, { sec: PALS[i % 4][1], acc: '#121316', secKind: 2, accKind: 1 }, { sec: '#3a3f48', acc: PALS[i % 4][2], secKind: 2, accKind: 1 }][i % 4] as any }} float={0.05 + (i % 5) * 0.12} wearSeed={'dev' + i} />
        </div>
      ))}
    </div>
  );
}
