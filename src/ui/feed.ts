// Живая лента дропов. Пока локальная (твои дропы), на этапе 3 станет общей через Firebase.
import { useSyncExternalStore } from 'react';
import type { Item } from '../core/items';
import { rarityIndex } from '../config/economy';
import { game } from './game';

export interface FeedEntry { item: Item; nick: string; src: string; ts: number }
const KEY = 'caseroyale.feed.v1';
let feed: FeedEntry[] = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } })();
const subs = new Set<() => void>();

export function pushFeed(items: Item[], src: string) {
  const nick = game.p.nick;
  // в ленту попадают армейское и выше, а также всё дороже 100 монет
  const add = items.filter((i) => rarityIndex(i.rarity) >= 2 || i.price >= 100).map((item) => ({ item, nick, src, ts: Date.now() }));
  if (!add.length) return;
  feed = [...add, ...feed].slice(0, 60);
  try { localStorage.setItem(KEY, JSON.stringify(feed)); } catch { /* ignore */ }
  subs.forEach((f) => f());
}

game.hooks.push((ev, data: any) => {
  if (ev === 'open') pushFeed(data.items, 'кейс');
  if (ev === 'free') pushFeed([data], 'фри кейс');
  if (ev === 'contract') pushFeed([data.out], 'контракт');
  if (ev === 'upgrade' && data.item) pushFeed([data.item], 'апгрейд');
});

export function useFeed() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => feed);
}
