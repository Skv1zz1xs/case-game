// Модели оружия — все названия выдуманные
export type WeaponKind = 'pistol' | 'smg' | 'rifle' | 'sniper' | 'shotgun' | 'mg' | 'knife' | 'gloves';
export type KnifeShape = 'claw' | 'butterfly' | 'bayonet' | 'bowie' | 'stiletto';

export interface WeaponModel {
  id: string;
  name: string;
  kind: WeaponKind;
  shape?: KnifeShape | 'pistol2' | 'rifle2';
}

export const WEAPONS: WeaponModel[] = [
  { id: 'p9', name: 'П-9 «Шершень»', kind: 'pistol' },
  { id: 'grom', name: 'Револьвер «Гром»', kind: 'pistol', shape: 'pistol2' },
  { id: 'kobra', name: 'ПМ-К «Кобра»', kind: 'pistol' },
  { id: 'iskra', name: 'Пистолет «Искра»', kind: 'pistol', shape: 'pistol2' },
  { id: 'osa', name: 'ПП «Оса»', kind: 'smg' },
  { id: 'vihr', name: 'ПП «Вихрь»', kind: 'smg' },
  { id: 'kvant', name: 'ПП «Квант»', kind: 'smg' },
  { id: 'taiga', name: 'Автомат «Тайга»', kind: 'rifle' },
  { id: 'sokol', name: 'Винтовка «Сокол»', kind: 'rifle', shape: 'rifle2' },
  { id: 'buran', name: 'Автомат «Буран»', kind: 'rifle' },
  { id: 'rys', name: 'Карабин «Рысь»', kind: 'rifle', shape: 'rifle2' },
  { id: 'groza', name: 'Снайперка «Гроза»', kind: 'sniper' },
  { id: 'yastreb', name: 'Винтовка «Ястреб»', kind: 'sniper' },
  { id: 'bur', name: 'Дробовик «Бур»', kind: 'shotgun' },
  { id: 'mamont', name: 'Обрез «Мамонт»', kind: 'shotgun' },
  { id: 'molot', name: 'Пулемёт «Молот»', kind: 'mg' },
];

export const KNIVES: WeaponModel[] = [
  { id: 'claw', name: 'Нож «Коготь»', kind: 'knife', shape: 'claw' },
  { id: 'moth', name: 'Нож «Мотылёк»', kind: 'knife', shape: 'butterfly' },
  { id: 'klyk', name: 'Штык «Клык»', kind: 'knife', shape: 'bayonet' },
  { id: 'medved', name: 'Тесак «Медведь»', kind: 'knife', shape: 'bowie' },
  { id: 'stilet', name: 'Нож «Стилет»', kind: 'knife', shape: 'stiletto' },
];

export const GLOVES: WeaponModel[] = [
  { id: 'gkobra', name: 'Перчатки «Кобра»', kind: 'gloves' },
  { id: 'gdrive', name: 'Перчатки «Драйв»', kind: 'gloves' },
  { id: 'gshtorm', name: 'Перчатки «Шторм»', kind: 'gloves' },
];

export const ALL_MODELS = [...WEAPONS, ...KNIVES, ...GLOVES];
export const modelById = (id: string) => ALL_MODELS.find((m) => m.id === id)!;

export const KIND_NAMES: Record<WeaponKind, string> = {
  pistol: 'Пистолеты', smg: 'ПП', rifle: 'Винтовки', sniper: 'Снайперки',
  shotgun: 'Дробовики', mg: 'Пулемёты', knife: 'Ножи', gloves: 'Перчатки',
};

// Узоры покраски (рисуются в ui/components/ItemArt.tsx)
export type PatternStyle =
  | 'solid' | 'fade' | 'camo' | 'damascus' | 'carbon' | 'acid' | 'hologram'
  | 'marble' | 'tiger' | 'digital' | 'stripes' | 'galaxy' | 'lava' | 'circuit';

// Чем выше редкость, тем «дороже» выглядит узор
export const PATTERNS_BY_TIER: PatternStyle[][] = [
  ['solid', 'camo', 'digital', 'stripes'],                 // ширпотреб
  ['camo', 'digital', 'stripes', 'carbon', 'fade'],        // промышленное
  ['carbon', 'fade', 'tiger', 'acid', 'stripes'],          // армейское
  ['fade', 'tiger', 'acid', 'damascus', 'circuit'],        // запрещённое
  ['damascus', 'marble', 'circuit', 'lava', 'fade'],       // засекреченное
  ['marble', 'lava', 'hologram', 'galaxy', 'circuit'],     // тайное
  ['damascus', 'marble', 'hologram', 'galaxy', 'fade', 'lava'], // редкое
  ['hologram', 'galaxy'],                                  // контрабанда
];

// Фазы ножей: у каждого «Редкого» скина свои названия, выбираются по хешу
export const PHASE_NAMES = {
  normal: ['Фаза I', 'Фаза II', 'Фаза III', 'Фаза IV'],
  rare: ['Рубиновый всплеск', 'Изумрудная жила', 'Лунный блик', 'Медовая волна', 'Ледяной узор'],
  gem: ['Сапфировое сердце', 'Чёрная жемчужина', 'Огненный опал', 'Аметистовый глаз'],
  supergem: ['Сверхновая', 'Око дракона', 'Абсолют'],
};

// Палитры гемов (перекрывают обычные цвета скина)
export const PHASE_PALETTES: Record<string, [string, string, string]> = {
  'Рубиновый всплеск': ['#ff1744', '#8b0018', '#ff8a80'],
  'Изумрудная жила': ['#00e676', '#00502a', '#b9f6ca'],
  'Лунный блик': ['#cfd8dc', '#455a64', '#ffffff'],
  'Медовая волна': ['#ffb300', '#7a4a00', '#ffe082'],
  'Ледяной узор': ['#80deea', '#006064', '#e0f7fa'],
  'Сапфировое сердце': ['#2962ff', '#0a1a5c', '#82b1ff'],
  'Чёрная жемчужина': ['#311b92', '#0a0a12', '#b388ff'],
  'Огненный опал': ['#ff6d00', '#3e0a00', '#ffd180'],
  'Аметистовый глаз': ['#aa00ff', '#2a0040', '#ea80fc'],
  'Сверхновая': ['#ffffff', '#ff00e5', '#00e5ff'],
  'Око дракона': ['#ffea00', '#d50000', '#00c853'],
  'Абсолют': ['#00e5ff', '#6200ea', '#ffd600'],
};
