// Модели оружия: реальные образцы (рисуются в ui/components/weaponArt.ts)
export type WeaponKind = 'pistol' | 'smg' | 'rifle' | 'sniper' | 'shotgun' | 'mg' | 'knife' | 'gloves';

export interface WeaponModel {
  id: string;
  name: string;
  kind: WeaponKind;
  art: string; // ключ рисунка
}

export const WEAPONS: WeaponModel[] = [
  { id: 'glock', name: 'Glock-18', kind: 'pistol', art: 'glock' },
  { id: 'deagle', name: 'Desert Eagle', kind: 'pistol', art: 'deagle' },
  { id: 'usp', name: 'USP-S', kind: 'pistol', art: 'usp' },
  { id: 'p250', name: 'P250', kind: 'pistol', art: 'glock' },
  { id: 'mp7', name: 'MP7', kind: 'smg', art: 'mp7' },
  { id: 'p90', name: 'P90', kind: 'smg', art: 'p90' },
  { id: 'mac10', name: 'MAC-10', kind: 'smg', art: 'mac10' },
  { id: 'ak47', name: 'AK-47', kind: 'rifle', art: 'ak' },
  { id: 'm4a4', name: 'M4A4', kind: 'rifle', art: 'm4' },
  { id: 'm4a1s', name: 'M4A1-S', kind: 'rifle', art: 'm4s' },
  { id: 'galil', name: 'Galil AR', kind: 'rifle', art: 'ak' },
  { id: 'awp', name: 'AWP', kind: 'sniper', art: 'awp' },
  { id: 'ssg08', name: 'SSG 08', kind: 'sniper', art: 'awp' },
  { id: 'nova', name: 'Nova', kind: 'shotgun', art: 'nova' },
  { id: 'xm1014', name: 'XM1014', kind: 'shotgun', art: 'nova' },
  { id: 'negev', name: 'Negev', kind: 'mg', art: 'negev' },
];

export const KNIVES: WeaponModel[] = [
  { id: 'karambit', name: 'Керамбит', kind: 'knife', art: 'karambit' },
  { id: 'butterfly', name: 'Нож-бабочка', kind: 'knife', art: 'butterfly' },
  { id: 'm9', name: 'Штык-нож M9', kind: 'knife', art: 'bayonet' },
  { id: 'bowie', name: 'Нож Боуи', kind: 'knife', art: 'bowie' },
  { id: 'stiletto', name: 'Стилет', kind: 'knife', art: 'stiletto' },
];

export const GLOVES: WeaponModel[] = [
  { id: 'gsport', name: 'Спортивные перчатки', kind: 'gloves', art: 'gloves' },
  { id: 'gdriver', name: 'Водительские перчатки', kind: 'gloves', art: 'gloves' },
  { id: 'gtact', name: 'Тактические перчатки', kind: 'gloves', art: 'gloves' },
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
  | 'marble' | 'tiger' | 'digital' | 'stripes' | 'galaxy' | 'lava' | 'circuit' | 'anodized' | 'graphic';

// Чем выше редкость, тем «дороже» выглядит узор
export const PATTERNS_BY_TIER: PatternStyle[][] = [
  ['solid', 'camo', 'digital', 'stripes'],                 // ширпотреб
  ['camo', 'digital', 'stripes', 'carbon', 'fade'],        // промышленное
  ['carbon', 'fade', 'tiger', 'acid', 'anodized'],         // армейское
  ['fade', 'graphic', 'acid', 'damascus', 'anodized'],     // запрещённое
  ['graphic', 'marble', 'circuit', 'lava', 'fade'],        // засекреченное
  ['graphic', 'lava', 'hologram', 'galaxy', 'marble'],     // тайное
  ['damascus', 'marble', 'hologram', 'galaxy', 'fade', 'anodized'], // редкое
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
