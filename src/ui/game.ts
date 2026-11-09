// Единый экземпляр игры для UI + хук подписки
import { useSyncExternalStore } from 'react';
import { Game, loadProfile, saveProfile, Profile } from '../core/store';
import { setSound } from './sound';

export const game = new Game(loadProfile());
let saveT: number | undefined;
game.onChange = (p) => {
  setSound(p.settings.sound, p.settings.volume);
  clearTimeout(saveT);
  saveT = window.setTimeout(() => saveProfile(p), 150);
};
setSound(game.p.settings.sound, game.p.settings.volume);

export function useProfile(): Profile {
  return useSyncExternalStore((f) => game.subscribe(f), () => game.p);
}

// Тосты
type Toast = { id: number; text: string; kind?: 'good' | 'bad' };
let toasts: Toast[] = [];
const tsubs = new Set<() => void>();
let tid = 0;
export function toast(text: string, kind?: Toast['kind']) {
  const t = { id: ++tid, text, kind };
  toasts = [...toasts, t].slice(-4);
  tsubs.forEach((f) => f());
  setTimeout(() => { toasts = toasts.filter((x) => x.id !== t.id); tsubs.forEach((f) => f()); }, 3200);
}
export function useToasts() {
  return useSyncExternalStore((f) => { tsubs.add(f); return () => { tsubs.delete(f); }; }, () => toasts);
}
game.onNotice = (n) => toast(n.text, 'good');

export const fmt = (x: number) => {
  if (x >= 1e6) return (x / 1e6).toFixed(x >= 1e7 ? 1 : 2).replace('.', ',') + ' млн';
  if (x >= 100) return Math.round(x).toLocaleString('ru-RU');
  return x.toFixed(2).replace('.', ',');
};
