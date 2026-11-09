// Звуки синтезируются WebAudio — без файлов. Громкость и выключение — в настройках.
let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.5;

export function setSound(on: boolean, vol: number) { enabled = on; volume = vol; }

function ac(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const C = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx!.state === 'suspended') ctx!.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0, slide = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * volume, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  tick() { tone(1900, 0.03, 'square', 0.08); tone(950, 0.03, 'triangle', 0.08); },
  click() { tone(600, 0.05, 'triangle', 0.15); },
  coin() { tone(1320, 0.08, 'square', 0.1); tone(1760, 0.12, 'square', 0.1, 0.06); },
  lose() { tone(300, 0.35, 'sawtooth', 0.12, 0, 0.4); },
  // победные звуки по крутости: 0 — обычный … 5 — контрабанда
  win(tier: number) {
    const base = [523, 587, 659, 784, 880, 1047];
    if (tier <= 0) { tone(660, 0.12, 'triangle', 0.18); return; }
    const notes = [0, 4, 7, 12, 16, 19, 24].slice(0, 2 + tier);
    notes.forEach((n, i) => tone(base[0] * Math.pow(2, n / 12), 0.22 + tier * 0.04, i % 2 ? 'square' : 'triangle', 0.14, i * (0.09 - tier * 0.006)));
    if (tier >= 3) tone(80, 0.9, 'sine', 0.35, 0, 0.5);
    if (tier >= 4) for (let i = 0; i < 8; i++) tone(2000 + i * 300, 0.06, 'sine', 0.06, 0.3 + i * 0.05);
    if (tier >= 5) { tone(55, 2.2, 'sawtooth', 0.2, 0, 0.7); tone(1568, 1.2, 'triangle', 0.12, 1.2); }
  },
  whoosh() { tone(200, 0.4, 'sawtooth', 0.06, 0, 4); },
};
