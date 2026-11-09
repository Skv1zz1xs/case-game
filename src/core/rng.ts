// Детерминированный ГСЧ (mulberry32). Один seed → одна и та же последовательность на всех устройствах.
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Хеш строки в 32 бита (FNV-1a)
export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return (Math.random() * 2 ** 32) >>> 0;
}

// Глобальный ГСЧ для обычных (не батловых) открытий
let shared: Rng = mulberry32(randomSeed());
export const rand: Rng = () => shared();
export function reseed(seed: number) { shared = mulberry32(seed); }

export const randRange = (r: Rng, min: number, max: number) => min + (max - min) * r();
export const randInt = (r: Rng, min: number, max: number) => Math.floor(randRange(r, min, max + 1));
export const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];

export function weighted<T extends { weight: number }>(r: Rng, arr: readonly T[]): T {
  let total = 0;
  for (const x of arr) total += x.weight;
  let v = r() * total;
  for (const x of arr) { v -= x.weight; if (v < 0) return x; }
  return arr[arr.length - 1];
}

export function uid(r: Rng = rand): string {
  return Math.floor(r() * 2 ** 32).toString(36) + Math.floor(r() * 2 ** 32).toString(36);
}
