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

// Короткий шум (щелчок механики, удар) через буфер случайных значений
function noise(dur: number, gain: number, when = 0, freq = 3000, q = 1) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + when;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.value = gain * volume;
  src.connect(f).connect(g).connect(a.destination); src.start(t);
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
  // щелчок ленты: механический клик с лёгким разбросом высоты
  tick() { noise(0.025, 0.5, 0, 2600 + Math.random() * 900, 4); tone(1700 + Math.random() * 200, 0.02, 'triangle', 0.05); },
  // открытие кейса: защёлки + нарастающий «вжух»
  open() { noise(0.05, 0.6, 0, 1800, 3); noise(0.05, 0.6, 0.12, 2200, 3); tone(140, 0.7, 'sawtooth', 0.05, 0.1, 5); noise(0.5, 0.25, 0.25, 900, 0.7); },
  // глухой удар (проигрыш апгрейда, лишний предмет)
  thud() { tone(90, 0.3, 'sine', 0.4, 0, 0.5); noise(0.15, 0.4, 0, 400, 1); },
  click() { tone(600, 0.05, 'triangle', 0.15); },
  coin() { tone(1320, 0.08, 'square', 0.1); tone(1760, 0.12, 'square', 0.1, 0.06); },
  lose() { tone(300, 0.35, 'sawtooth', 0.12, 0, 0.4); tone(90, 0.3, 'sine', 0.35, 0.05, 0.5); },
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
