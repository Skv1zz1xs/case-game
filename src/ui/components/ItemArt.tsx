// Рисует предмет: силуэт оружия + процедурная покраска по seed. Без внешней графики.
import { useId, memo, ReactElement } from 'react';
import { mulberry32, Rng, hashStr } from '../../core/rng';
import type { Finish } from '../../data/cases';
import type { WeaponModel } from '../../data/weapons';
import { ARTS, Part } from './weaponArt';
import { PHASE_PALETTES } from '../../data/weapons';

function blobs(r: Rng, n: number, colors: string[], rmin: number, rmax: number, op = 1): ReactElement[] {
  const out: ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    const cx = r() * 200, cy = r() * 100;
    const rx = rmin + r() * (rmax - rmin), ry = rx * (0.5 + r() * 0.6);
    out.push(<ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={colors[i % colors.length]} opacity={op}
      transform={`rotate(${Math.floor(r() * 180)} ${cx} ${cy})`} />);
  }
  return out;
}

function wave(r: Rng, y: number, amp: number, freq: number): string {
  const ph = r() * 6.28;
  let d = `M-5 ${y}`;
  for (let x = 0; x <= 210; x += 6) d += ` L${x} ${(y + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph) * amp * 0.3).toFixed(1)}`;
  return d;
}

function paint(f: Finish, id: string): { defs: ReactElement[]; body: ReactElement[] } {
  const r = mulberry32(f.seed);
  const [a, b, c] = f.colors;
  const defs: ReactElement[] = [];
  const body: ReactElement[] = [];
  const gid = `${id}g`;
  switch (f.style) {
    case 'solid':
      defs.push(<linearGradient key="g" id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>);
      body.push(<rect key="b" width="200" height="100" fill={`url(#${gid})`} />);
      break;
    case 'fade':
      defs.push(<linearGradient key="g" id={gid} x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stopColor={a} /><stop offset="0.5" stopColor={c} /><stop offset="1" stopColor={b} /></linearGradient>);
      body.push(<rect key="b" width="200" height="100" fill={`url(#${gid})`} />);
      break;
    case 'camo':
      body.push(<rect key="b" width="200" height="100" fill={a} />, ...blobs(r, 22, [b, c, '#1a1a1a'], 12, 30));
      break;
    case 'digital': {
      body.push(<rect key="b" width="200" height="100" fill={a} />);
      const cols = [b, c, '#111'];
      for (let i = 0; i < 112; i++) {
        if (r() < 0.45) body.push(<rect key={'d' + i} x={(i % 14) * 14.3} y={Math.floor(i / 14) * 12.5} width={14.3} height={12.5} fill={cols[Math.floor(r() * 3)]} opacity={0.85} />);
      }
      break;
    }
    case 'stripes': {
      body.push(<rect key="b" width="200" height="100" fill={a} />);
      for (let i = -10; i < 22; i++) body.push(<rect key={'s' + i} x={i * 16} y={-20} width={8} height={160} fill={i % 2 ? b : c} transform="rotate(25)" />);
      break;
    }
    case 'carbon': {
      defs.push(<pattern key="p" id={gid} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#151515" /><rect width="3" height="3" fill="#2a2a2a" /><rect x="3" y="3" width="3" height="3" fill="#2a2a2a" /></pattern>);
      body.push(<rect key="b" width="200" height="100" fill={`url(#${gid})`} />, <rect key="t" width="200" height="100" fill={a} opacity={0.35} />);
      break;
    }
    case 'tiger': {
      body.push(<rect key="b" width="200" height="100" fill={a} />);
      for (let i = 0; i < 14; i++) {
        const x = i * 15 + r() * 8;
        body.push(<path key={'t' + i} d={`M${x} -5 Q${x + 12 * (r() - 0.5) * 2} 30 ${x + 4} 50 T${x - 2} 105 L${x + 6} 105 Q${x + 14} 60 ${x + 8} 50 T${x + 6} -5 Z`} fill={i % 3 ? '#140c06' : b} opacity={0.9} />);
      }
      break;
    }
    case 'acid': {
      defs.push(<filter key="f" id={gid}><feGaussianBlur stdDeviation="6" /></filter>);
      body.push(<rect key="b" width="200" height="100" fill={b} />, <g key="g" filter={`url(#${gid})`}>{blobs(r, 18, [a, c], 10, 30, 0.9)}</g>);
      break;
    }
    case 'damascus': {
      body.push(<rect key="b" width="200" height="100" fill={b} />);
      for (let i = 0; i < 16; i++) body.push(<path key={'w' + i} d={wave(r, i * 7, 4 + r() * 4, 0.04 + r() * 0.03)} stroke={i % 2 ? a : c} strokeWidth={2.6} fill="none" opacity={0.8} />);
      break;
    }
    case 'marble':
    case 'lava': {
      const lava = f.style === 'lava';
      defs.push(
        <filter key="f" id={gid} x="0" y="0" width="100%" height="100%">
          <feTurbulence type={lava ? 'fractalNoise' : 'turbulence'} baseFrequency={lava ? '0.02 0.06' : '0.015 0.04'} numOctaves={lava ? 3 : 4} seed={f.seed % 1000} />
          <feColorMatrix type="matrix" values={lava ? '0 0 0 0 1  0 0 0 0 0.4  0 0 0 0 0  0 0 0 -2.2 1.3' : '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.6 1.5'} />
        </filter>,
      );
      body.push(<rect key="b" width="200" height="100" fill={lava ? '#1a0500' : a} />,
        <rect key="c" width="200" height="100" fill={lava ? a : b} opacity={0.6} />,
        <rect key="n" width="200" height="100" filter={`url(#${gid})`} opacity={lava ? 0.95 : 0.7} />);
      if (lava) body.push(<rect key="h" width="200" height="100" fill={c} opacity={0.18} />);
      break;
    }
    case 'hologram': {
      defs.push(
        <linearGradient key="g" id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff00e5" /><stop offset="0.25" stopColor="#00e5ff" /><stop offset="0.5" stopColor="#7cff00" />
          <stop offset="0.75" stopColor="#ffe600" /><stop offset="1" stopColor="#ff00e5" />
          <animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0;-1 0" dur="6s" repeatCount="indefinite" />
        </linearGradient>,
      );
      body.push(<rect key="b" width="200" height="100" fill={a} />, <rect key="h" width="200" height="100" fill={`url(#${gid})`} opacity={0.85} />, <rect key="h2" width="200" height="100" fill={a} opacity={0.25} />);
      break;
    }
    case 'galaxy': {
      defs.push(<radialGradient key="g" id={gid}><stop offset="0" stopColor={a} stopOpacity={0.9} /><stop offset="1" stopColor={a} stopOpacity={0} /></radialGradient>);
      body.push(<rect key="b" width="200" height="100" fill="#05010f" />);
      body.push(<rect key="bg" width="200" height="100" fill={b} opacity={0.5} />);
      for (let i = 0; i < 6; i++) body.push(<ellipse key={'n' + i} cx={r() * 200} cy={r() * 100} rx={30 + r() * 40} ry={18 + r() * 22} fill={i % 2 ? `url(#${gid})` : c} opacity={0.6} />);
      for (let i = 0; i < 70; i++) body.push(<circle key={'s' + i} cx={r() * 200} cy={r() * 100} r={r() * 1.3 + 0.3} fill="#fff" opacity={0.5 + r() * 0.5} />);
      break;
    }
    case 'anodized': {
      // Анодированный металл: насыщенный цвет с сильным бликом
      defs.push(
        <linearGradient key="g" id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} /><stop offset="0.18" stopColor="#ffffff" stopOpacity="0.9" /><stop offset="0.32" stopColor={a} />
          <stop offset="0.7" stopColor={b} /><stop offset="1" stopColor="#05060a" />
        </linearGradient>,
      );
      body.push(<rect key="b" width="200" height="100" fill={`url(#${gid})`} />);
      for (let i = 0; i < 6; i++) body.push(<rect key={'a' + i} x={r() * 200} y={0} width={1 + r() * 2} height={100} fill="#fff" opacity={0.08} />);
      break;
    }
    case 'graphic': {
      // Графичный дизайн: крупные диагональные плашки, обводки, «логотип»-ромб
      body.push(<rect key="b" width="200" height="100" fill={b} />);
      const ang = -20 - r() * 30;
      body.push(
        <g key="g" transform={`rotate(${ang} 100 50)`}>
          <rect x={-40} y={20 + r() * 10} width={300} height={22} fill={a} />
          <rect x={-40} y={46 + r() * 6} width={300} height={6} fill={c} />
          <rect x={-40} y={58 + r() * 8} width={300} height={14} fill="#0b0b0f" />
          <rect x={-40} y={10} width={300} height={3} fill={c} />
        </g>,
      );
      const cx = 40 + r() * 120;
      body.push(<path key="d" d={`M${cx} 22 L${cx + 18} 50 L${cx} 78 L${cx - 18} 50 Z`} fill={c} stroke="#0b0b0f" strokeWidth={3} />,
        <path key="d2" d={`M${cx} 36 L${cx + 9} 50 L${cx} 64 L${cx - 9} 50 Z`} fill="#0b0b0f" />);
      for (let i = 0; i < 18; i++) body.push(<circle key={'p' + i} cx={r() * 200} cy={r() * 100} r={0.8 + r() * 1.6} fill={c} opacity={0.7} />);
      break;
    }
    case 'circuit': {
      body.push(<rect key="b" width="200" height="100" fill={b} />);
      for (let i = 0; i < 26; i++) {
        let x = Math.floor(r() * 20) * 10, y = Math.floor(r() * 10) * 10;
        let d = `M${x} ${y}`;
        for (let k = 0; k < 4; k++) { if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * 20; else y += (r() < 0.5 ? -1 : 1) * 20; d += ` L${x} ${y}`; }
        body.push(<path key={'c' + i} d={d} stroke={i % 3 ? a : c} strokeWidth={2.2} fill="none" />, <circle key={'p' + i} cx={x} cy={y} r={2.8} fill={c} />);
      }
      break;
    }
  }
  return { defs, body };
}

const MAT: Record<Exclude<Part['m'], 'paint'>, [string, string, string]> = {
  metal: ['#5b616c', '#262a31', '#3a3f48'],
  poly: ['#3a3d43', '#16171a', '#24262a'],
  chrome: ['#e9edf2', '#8c96a3', '#c8d0da'],
  dark: ['#2b2e35', '#0e0f12', '#1c1e23'],
};

interface Props {
  model: WeaponModel;
  finish: Finish;
  color?: string;           // свечение редкости
  phase?: string;           // фаза ножа (перекрашивает гемы)
  gem?: boolean;
  float?: number;           // износ: потёртости и грязь
  wearSeed?: string;
  className?: string;
}

export const ItemArt = memo(function ItemArt({ model, finish, color, phase, gem, float = 0.1, wearSeed, className }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const art = ARTS[model.art] ?? ARTS.ak;
  const [vx, vy, vw, vh] = art.vb;
  const f: Finish = phase && PHASE_PALETTES[phase] ? { ...finish, colors: PHASE_PALETTES[phase] } : finish;
  const { defs, body } = paint(f, id);
  const paintParts = art.parts.filter((p) => p.m === 'paint');
  // Потёртости: чем выше износ, тем больше царапин до металла
  const wr = mulberry32(hashStr(wearSeed ?? finish.seed.toString()));
  const nScr = Math.round(float * float * 70);
  const scratches: string[] = [];
  for (let i = 0; i < nScr; i++) {
    const x = vx + wr() * vw, y = vy + wr() * vh, l = 3 + wr() * 14, a = (wr() - 0.5) * 0.8;
    scratches.push(`M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(a) * l).toFixed(1)} ${(Math.sin(a) * l).toFixed(1)}`);
  }
  return (
    <svg viewBox={art.vb.join(' ')} className={className} style={color ? { filter: `drop-shadow(0 0 7px ${color}77)` } : undefined} aria-hidden>
      <defs>
        <clipPath id={`${id}c`}>{paintParts.map((p, i) => <path key={i} d={p.d} fillRule={p.ev ? 'evenodd' : 'nonzero'} clipRule={p.ev ? 'evenodd' : 'nonzero'} />)}</clipPath>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.42" /><stop offset="0.3" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
        {(Object.keys(MAT) as (keyof typeof MAT)[]).map((k) => (
          <linearGradient key={k} id={`${id}${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={MAT[k][0]} /><stop offset="0.55" stopColor={MAT[k][2]} /><stop offset="1" stopColor={MAT[k][1]} />
          </linearGradient>
        ))}
        <radialGradient id={`${id}sh`}><stop offset="0" stopColor="#000" stopOpacity="0.55" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        {defs}
      </defs>
      <ellipse cx={vx + vw / 2} cy={vy + vh * 0.93} rx={vw * 0.42} ry={vh * 0.05} fill={`url(#${id}sh)`} />
      {art.parts.map((p, i) => p.m === 'paint' ? null : (
        <path key={'m' + i} d={p.d} fillRule={p.ev ? 'evenodd' : 'nonzero'} fill={`url(#${id}${p.m})`} stroke="rgba(0,0,0,.7)" strokeWidth="1.2" />
      ))}
      <g clipPath={`url(#${id}c)`}>
        <g transform={`translate(${vx} ${vy}) scale(${vw / 200} ${vh / 100})`}>{body}</g>
        {gem && (
          <rect width={vw * 0.3} height={vh * 1.6} x={vx - vw * 0.4} y={vy - vh * 0.3} fill="#fff" opacity="0.35" transform={`rotate(20 ${vx + vw / 2} ${vy + vh / 2})`}>
            <animate attributeName="x" values={`${vx - vw * 0.4};${vx + vw * 1.1}`} dur="2.2s" repeatCount="indefinite" />
          </rect>
        )}
        {scratches.length > 0 && <path d={scratches.join(' ')} stroke="#c9ced6" strokeOpacity="0.55" strokeWidth="1" strokeLinecap="round" />}
        {float > 0.45 && <rect x={vx} y={vy} width={vw} height={vh} fill="#4a3a22" opacity={(float - 0.45) * 0.45} />}
      </g>
      {paintParts.map((p, i) => <path key={'s' + i} d={p.d} fillRule={p.ev ? 'evenodd' : 'nonzero'} fill={`url(#${id}s)`} />)}
      {art.lines.map((d, i) => <path key={'l' + i} d={d} stroke="#000" strokeOpacity="0.4" strokeWidth="1.3" fill="none" />)}
      {art.lines.map((d, i) => <path key={'h' + i} d={d} stroke="#fff" strokeOpacity="0.1" strokeWidth="0.8" fill="none" transform="translate(0 1.2)" />)}
      {art.dots?.map(([x, y, r], i) => <circle key={'d' + i} cx={x} cy={y} r={r} fill={`url(#${id}metal)`} stroke="#000" strokeOpacity="0.6" />)}
      {paintParts.map((p, i) => <path key={'o' + i} d={p.d} fillRule={p.ev ? 'evenodd' : 'nonzero'} fill="none" stroke="rgba(0,0,0,.72)" strokeWidth="1.4" />)}
    </svg>
  );
});
