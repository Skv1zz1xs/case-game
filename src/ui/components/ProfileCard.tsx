// Карточка игрока с косметикой (фон, рамка, титул)
import { cosmeticById } from '../../data/cosmetics';
import { hashStr } from '../../core/rng';
import { useProfile, fmt } from '../game';

export function ProfileCard() {
  const p = useProfile();
  const bg = cosmeticById(p.cos.bg), fr = cosmeticById(p.cos.frame), tt = cosmeticById(p.cos.title);
  return (
    <div className="pcard" style={bg ? { background: bg.css } : undefined}>
      <span className="prof-ava" style={fr ? { boxShadow: `0 0 0 3px ${fr.css}, 0 0 18px ${fr.css}` } : undefined}>{(p.nick || '?')[0].toUpperCase()}</span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}><b style={{ fontSize: 18 }}>{p.nick}</b>{tt && <span className="tag-title" style={{ background: tt.css }}>{tt.name}</span>}</div>
        <div className="small muted">ID:{(hashStr(p.nick) % 900000000) + 100000000}</div>
        <div style={{ marginTop: 6, fontWeight: 800 }}><i className="coin" /> {fmt(p.balance)}</div>
      </div>
    </div>
  );
}
