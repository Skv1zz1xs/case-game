// Картинка кейса: рендер из Blender (public/cases/<id>.png), если нет — CSS-коробка
import { useState } from 'react';
import type { CaseDef } from '../../data/cases';
import { CaseBox } from './CaseBox';

export function CaseImg({ c, className, shake }: { c: CaseDef; className?: string; shake?: boolean }) {
  const [bad, setBad] = useState(false);
  const base = (import.meta as any).env?.BASE_URL ?? './';
  if (bad) return <CaseBox c={c} big={className === 'big-case'} shake={shake} />;
  return <img className={`${className ?? ''}${shake ? ' shake' : ''}`} src={`${base}cases/${c.id}.webp`} alt={c.name} loading="lazy" draggable={false} onError={() => setBad(true)} />;
}
