// Баланс с «отщёлкиванием» цифр и вспышкой при изменении
import { useEffect, useRef, useState } from 'react';
import { fmt } from '../game';

export function AnimatedNumber({ value, className, title, onClick, icon }: { value: number; className?: string; title?: string; onClick?: () => void; icon: React.ReactNode }) {
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState<'' | 'up' | 'down'>('');
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value;
    prev.current = value;
    if (from === to) return;
    setFlash(to > from ? 'up' : 'down');
    const t0 = performance.now(), dur = Math.min(700, 250 + Math.abs(to - from) / 50);
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(from + (to - from) * e);
      if (k < 1) raf = requestAnimationFrame(step); else setTimeout(() => setFlash(''), 250);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <button className={`${className ?? ''} ${flash}`} title={title} onClick={onClick}>{icon}{fmt(Math.round(shown * 100) / 100)}</button>;
}
