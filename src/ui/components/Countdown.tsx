import { useEffect, useState } from 'react';

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export function fmtLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const pad = (x: number) => String(x).padStart(2, '0');
  if (d) return `${d}д ${pad(h)}:${pad(m)}`;
  return h ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

export function Countdown({ to, now }: { to: number; now: number }) {
  return <span className="timer">{fmtLeft(to - now)}</span>;
}
