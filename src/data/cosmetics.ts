// Косметика профиля: фоны, рамки, титулы — только за игровые монеты
import { SHOP_PRICES } from '../config/economy';
export interface Cosmetic { id: string; kind: 'bg' | 'frame' | 'title'; name: string; price: number; css: string }
export const COSMETICS: Cosmetic[] = [
  { id: 'bg-inv', kind: 'bg', name: 'Склад', price: SHOP_PRICES.bg[0], css: 'linear-gradient(135deg,#0b2a1c,#123b2a 50%,#0b1f17)' },
  { id: 'bg-room', kind: 'bg', name: 'Кейс-рум', price: SHOP_PRICES.bg[1], css: 'linear-gradient(135deg,#1a0838,#3a0d6b 45%,#ff2d7a33)' },
  { id: 'bg-market', kind: 'bg', name: 'Неоновый рынок', price: SHOP_PRICES.bg[2], css: 'linear-gradient(120deg,#05101e,#0c3b5c 40%,#ff00c855 70%,#05101e)' },
  { id: 'bg-gold', kind: 'bg', name: 'Золотой зал', price: SHOP_PRICES.bg[3], css: 'radial-gradient(80% 120% at 80% 50%,#c9a22766,transparent 60%),linear-gradient(135deg,#1a1405,#3a2a08)' },
  { id: 'fr-green', kind: 'frame', name: 'Зелёная', price: SHOP_PRICES.frame[0], css: '#2fd47a' },
  { id: 'fr-blue', kind: 'frame', name: 'Синяя', price: SHOP_PRICES.frame[1], css: '#3d8bff' },
  { id: 'fr-purple', kind: 'frame', name: 'Фиолетовая', price: SHOP_PRICES.frame[2], css: '#a64dff' },
  { id: 'fr-red', kind: 'frame', name: 'Красная', price: SHOP_PRICES.frame[3], css: '#ff3b5c' },
  { id: 'tt-player', kind: 'title', name: 'ИГРОК', price: SHOP_PRICES.title[0], css: '#1f6b46' },
  { id: 'tt-collector', kind: 'title', name: 'КОЛЛЕКЦИОНЕР', price: SHOP_PRICES.title[1], css: '#2b5f9e' },
  { id: 'tt-trader', kind: 'title', name: 'ТРЕЙДЕР', price: SHOP_PRICES.title[2], css: '#1f6b6b' },
  { id: 'tt-whale', kind: 'title', name: 'ХАЙРОЛЛЕР', price: SHOP_PRICES.title[3], css: '#9a2a2a' },
];
export const cosmeticById = (id?: string) => COSMETICS.find((c) => c.id === id);
