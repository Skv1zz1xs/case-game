// Рисует предмет: силуэт оружия + процедурная покраска по seed. Без внешней графики.
import { useId, memo, ReactElement } from 'react';
import { mulberry32, Rng } from '../../core/rng';
import type { Finish } from '../../data/cases';
import type { WeaponModel } from '../../data/weapons';
import { PHASE_PALETTES } from '../../data/weapons';

type Shape = { vb: string; d: string; details: string[] };

// Силуэты в поле 200×100
const SHAPES: Record<string, Shape> = {
  pistol: {
    vb: '36 20 136 78',
    d: 'M45 28 H158 Q162 28 162 32 V42 Q162 44 158 44 H140 V50 H106 Q104 62 96 62 H90 Q86 62 86 56 V50 H84 L74 88 Q73 90 70 90 H52 Q48 90 49 86 L58 50 Q50 48 46 44 Z M91 52 H101 Q100 58 96 58 H93 Q91 58 91 55 Z',
    details: ['M50 36 H150', 'M120 30 V42', 'M126 30 V42', 'M132 30 V42', 'M62 60 L72 62', 'M60 68 L70 70', 'M58 76 L68 78'],
  },
  pistol2: {
    vb: '22 22 158 78',
    d: 'M30 36 H112 V30 H134 V36 H172 V44 H134 V52 Q134 58 126 58 H116 Q112 66 104 66 Q98 66 98 60 H92 L80 90 Q78 93 74 93 H58 Q54 93 55 89 L66 58 Q58 56 58 50 V44 H30 Z',
    details: ['M116 32 V54', 'M124 32 V54', 'M36 40 H108', 'M72 66 L64 86'],
  },
  rifle: {
    vb: '2 24 196 66',
    d: 'M8 40 L40 36 H70 V32 H150 V38 H192 V42 H150 V48 H128 L122 50 H112 Q118 66 116 80 L102 82 Q100 64 96 50 H84 L80 58 Q78 62 74 62 H70 Q66 62 66 58 V50 H52 L44 62 Q42 66 36 66 L10 60 Q6 59 6 55 V44 Q6 41 8 40 Z',
    details: ['M70 40 H150', 'M130 34 V46', 'M136 34 V46', 'M142 34 V46', 'M20 46 L46 44', 'M104 56 L112 56'],
  },
  rifle2: {
    vb: '2 22 196 62',
    d: 'M6 38 H60 L64 34 H156 V39 H194 V43 H156 V50 H120 V76 H106 V50 H90 Q88 60 80 62 H72 Q68 60 68 54 L60 52 L58 60 H6 Z',
    details: ['M64 40 H154', 'M14 44 H56', 'M108 56 H118', 'M108 64 H118', 'M80 30 H120 V34'],
  },
  sniper: {
    vb: '0 16 200 60',
    d: 'M4 44 L34 40 H60 V30 H70 V24 H132 V30 H138 V40 H196 V44 H140 V50 H118 V66 H108 V50 H92 Q90 60 82 62 H76 Q72 60 72 54 L60 52 L52 64 Q50 68 44 68 L6 62 Z',
    details: ['M74 27 H128', 'M64 44 H136', 'M160 41 V43', 'M14 50 L50 48'],
  },
  smg: {
    vb: '22 24 156 64',
    d: 'M30 36 H140 V32 H152 V36 H170 V44 H140 V50 H112 V80 H100 V50 H88 Q86 60 78 62 H72 Q68 60 68 54 L62 52 L56 74 Q55 77 52 77 H42 Q39 77 40 74 L46 50 H30 Z',
    details: ['M36 41 H136', 'M102 58 H110', 'M102 66 H110', 'M118 38 V48', 'M124 38 V48'],
  },
  shotgun: {
    vb: '0 22 184 54',
    d: 'M6 46 L44 38 H80 V34 H176 V40 H180 V52 H96 L90 54 Q88 62 80 62 H76 Q72 62 72 56 L60 54 L50 64 L10 60 Q4 59 4 54 V50 Q4 47 6 46 Z',
    details: ['M84 40 H174', 'M110 44 H160 V52', 'M110 44 V52', 'M118 44 V52', 'M126 44 V52', 'M16 52 L50 48'],
  },
  mg: {
    vb: '2 24 196 56',
    d: 'M6 40 L40 34 H150 V38 H194 V44 H150 V52 H130 V70 H96 V52 H86 Q84 62 76 62 H70 Q66 62 66 56 L54 54 L46 64 L8 58 Z',
    details: ['M44 40 H148', 'M100 56 H126', 'M100 62 H126', 'M170 44 L160 70', 'M174 44 L184 70'],
  },
  claw: {
    vb: '14 4 172 82',
    d: 'M30 70 Q20 60 30 52 L70 46 Q110 40 140 20 Q170 6 180 18 Q150 30 128 50 Q110 62 84 64 L72 66 Q62 80 48 80 Q34 80 30 70 Z M37 68 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z',
    details: ['M74 50 Q120 40 166 16', 'M62 52 L66 64'],
  },
  butterfly: {
    vb: '2 26 190 50',
    d: 'M14 50 H92 V44 L174 40 Q188 45 176 52 L96 58 V62 H14 Q6 56 14 50 Z',
    details: ['M18 56 H90', 'M96 47 L170 44', 'M30 53 V59', 'M50 53 V59', 'M70 53 V59'],
  },
  bayonet: {
    vb: '0 26 198 48',
    d: 'M10 44 H70 L76 36 H84 V44 L176 44 L194 50 L176 56 H84 V64 H76 L70 56 H10 Q4 50 10 44 Z',
    details: ['M88 50 H176', 'M20 48 V52', 'M32 48 V52', 'M44 48 V52', 'M56 48 V52', 'M140 44 Q150 47 160 44'],
  },
  bowie: {
    vb: '0 24 196 54',
    d: 'M10 46 H64 L70 36 H78 V46 H150 Q178 46 192 32 Q190 62 160 62 H78 V70 H70 L64 60 H10 Q4 53 10 46 Z',
    details: ['M82 52 H160 Q180 50 188 40', 'M22 50 V56', 'M36 50 V56', 'M50 50 V56'],
  },
  stiletto: {
    vb: '4 28 192 44',
    d: 'M14 46 H80 L84 40 H90 V47 L192 50 L90 53 V60 H84 L80 54 H14 Q8 50 14 46 Z',
    details: ['M94 50 H186', 'M24 48 V52', 'M40 48 V52', 'M56 48 V52'],
  },
  gloves: {
    vb: '20 2 124 94',
    d: 'M70 94 V62 Q60 58 56 50 L42 34 Q38 27 45 25 Q51 23 56 30 L66 42 V18 Q66 11 72 11 Q78 11 78 18 V40 H82 V12 Q82 5 88 5 Q94 5 94 12 V40 H98 V14 Q98 7 104 7 Q110 7 110 14 V42 H114 V22 Q114 15 120 15 Q126 15 126 22 V64 Q126 76 118 82 V94 Z',
    details: ['M70 82 H118', 'M72 88 H116', 'M78 40 V58', 'M94 40 V58', 'M110 42 V58', 'M66 50 Q80 60 110 58'],
  },
};

export function shapeKey(m: WeaponModel): string {
  if (m.kind === 'knife') return m.shape ?? 'claw';
  if (m.shape === 'pistol2' || m.shape === 'rifle2') return m.shape;
  return m.kind;
}

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

interface Props {
  model: WeaponModel;
  finish: Finish;
  color?: string;           // свечение редкости
  phase?: string;           // фаза ножа (перекрашивает гемы)
  gem?: boolean;
  className?: string;
}

export const ItemArt = memo(function ItemArt({ model, finish, color, phase, gem, className }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const shape = SHAPES[shapeKey(model)] ?? SHAPES.rifle;
  const f: Finish = phase && PHASE_PALETTES[phase] ? { ...finish, colors: PHASE_PALETTES[phase] } : finish;
  const { defs, body } = paint(f, id);
  return (
    <svg viewBox={shape.vb} className={className} style={color ? { filter: `drop-shadow(0 0 6px ${color}88)` } : undefined} aria-hidden>
      <defs>
        <clipPath id={`${id}c`}><path d={shape.d} fillRule="evenodd" clipRule="evenodd" /></clipPath>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" /><stop offset="0.38" stopColor="#fff" stopOpacity="0.08" /><stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
        {defs}
      </defs>
      <g clipPath={`url(#${id}c)`}>
        {body}
        <rect width="200" height="100" fill={`url(#${id}s)`} />
        {gem && (
          <rect width="60" height="140" x="-80" y="-20" fill="#fff" opacity="0.35" transform="rotate(20)">
            <animate attributeName="x" values="-80;260" dur="2.2s" repeatCount="indefinite" />
          </rect>
        )}
      </g>
      {shape.details.map((d, i) => <path key={i} d={d} stroke="#000" strokeOpacity="0.35" strokeWidth="1.2" fill="none" clipPath={`url(#${id}c)`} />)}
      <path d={shape.d} fillRule="evenodd" fill="none" stroke="rgba(0,0,0,.65)" strokeWidth="1.6" />
      <path d={shape.d} fillRule="evenodd" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="0.6" transform="translate(0,-0.6)" />
    </svg>
  );
});
