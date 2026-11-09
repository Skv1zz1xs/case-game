// ВСЕ цифры экономики — здесь. Меняешь баланс — меняешь только этот файл.

export type RarityId =
  | 'consumer' | 'industrial' | 'milspec' | 'restricted'
  | 'classified' | 'covert' | 'rare' | 'contraband';

export interface RarityDef {
  id: RarityId;
  name: string;
  chance: number;          // доля выпадения в обычном кейсе
  min: number; max: number; // стоимость предмета в долях цены кейса (до масштабирования под RTP)
  color: string;
}

export const RARITIES: RarityDef[] = [
  { id: 'consumer',   name: 'Ширпотреб',     chance: 0.55,   min: 0.10, max: 0.30, color: '#b0bccb' },
  { id: 'industrial', name: 'Промышленное',  chance: 0.25,   min: 0.35, max: 0.70, color: '#5e98d9' },
  { id: 'milspec',    name: 'Армейское',     chance: 0.12,   min: 0.9,  max: 1.6,  color: '#4b69ff' },
  { id: 'restricted', name: 'Запрещённое',   chance: 0.055,  min: 2.2,  max: 4,    color: '#8847ff' },
  { id: 'classified', name: 'Засекреченное', chance: 0.018,  min: 5,    max: 10,   color: '#d32ce6' },
  { id: 'covert',     name: 'Тайное',        chance: 0.0055, min: 13,   max: 30,   color: '#eb4b4b' },
  { id: 'rare',       name: 'Редкий',        chance: 0.0013, min: 35,   max: 110,  color: '#ffd700' },
  { id: 'contraband', name: 'Контрабанда',   chance: 0.0002, min: 180,  max: 500,  color: '#ff8a00' },
];

export const RARITY_ORDER: RarityId[] = RARITIES.map((r) => r.id);
export const rarityDef = (id: RarityId) => RARITIES.find((r) => r.id === id)!;
export const rarityIndex = (id: RarityId) => RARITY_ORDER.indexOf(id);

// Износ: float 0..1, цена ×(1 + WEAR_SPREAD) у нового до ×(1 − WEAR_SPREAD) у убитого
export const WEAR_SPREAD = 0.2;
export const WEARS = [
  { max: 0.07, name: 'Прямо с завода', short: 'ПЗ' },
  { max: 0.15, name: 'Немного поношенное', short: 'НП' },
  { max: 0.38, name: 'После полевых', short: 'ПП' },
  { max: 0.45, name: 'Поношенное', short: 'П' },
  { max: 1.0,  name: 'Закалённое в боях', short: 'ЗБ' },
];

export const STATTRAK_CHANCE = 0.1;
export const STATTRAK_MULT = 1.5;

// Паттерны — только у «Редких» (ножи, перчатки)
export type PatternTier = 'normal' | 'rare' | 'gem' | 'supergem';
export const PATTERN_TIERS: { id: PatternTier; name: string; chance: number; mult: number }[] = [
  { id: 'normal',   name: 'Обычный',   chance: 0.85,  mult: 1 },
  { id: 'rare',     name: 'Редкий',    chance: 0.12,  mult: 2.5 },
  { id: 'gem',      name: 'Гем',       chance: 0.027, mult: 8 },
  { id: 'supergem', name: 'Супергем',  chance: 0.003, mult: 30 },
];

// RTP по категориям кейсов
export const RTP = {
  cheap: 0.95,
  theme: 0.95,
  mid: 0.95,
  knife: 0.93,
  elite: 0.92,
  event: 1.02, // ивенты 100–105%, у каждого кейса своё значение в data/cases.ts
};

export const START_BALANCE = 1000;

// Фри кейс: раз в 5 минут, в среднем ≈250 монет. Не растёт с уровнем — честно для всех.
export const FREE_CASE_COOLDOWN_MS = 5 * 60 * 1000;
export const FREE_CASE_TABLE: { min: number; max: number; weight: number }[] = [
  { min: 50,   max: 120,  weight: 35 },
  { min: 120,  max: 250,  weight: 30 },
  { min: 250,  max: 400,  weight: 25 },
  { min: 400,  max: 800,  weight: 8 },
  { min: 800,  max: 2000, weight: 1.6 },
  { min: 2000, max: 5000, weight: 0.4 },
];

// Ежедневная награда: база + стрик (за каждый день подряд), с потолком
export const DAILY_BASE = 1000;
export const DAILY_STREAK_STEP = 150;
export const DAILY_STREAK_MAX_DAYS = 7; // с 8-го дня бонус не растёт

// Промокоды: каждый — один раз на игрока
export const PROMO_CODES: Record<string, number> = {
  'СТАРТ': 500,
  'ДРУЗЬЯ': 1000,
  'КЕЙСРОЯЛЬ': 500,
  'ЖИЗАСТУДЕНТА': 300,
  'СИГМА': 333,
  'ГЕМ': 777,
};

// Копилка (рейкбек): доля от трат на кейсы, забирается вручную
export const RAKEBACK_RATE = 0.01;

// Опыт и уровни: 1 XP за каждую потраченную монету (кейсы, апгрейды, батлы)
export const XP_PER_COIN = 1;
export const xpForLevel = (lvl: number) => Math.round(500 * Math.pow(lvl, 1.6)); // XP до следующего уровня
export const levelReward = (lvl: number) => Math.min(150 + lvl * 50, 2500);     // разовая награда за новый уровень

// Апгрейдер: шанс = ставка / цель × UPGRADE_EDGE, в пределах [MIN, MAX]
export const UPGRADE_EDGE = 0.95;
export const UPGRADE_MIN_CHANCE = 0.01;
export const UPGRADE_MAX_CHANCE = 0.75;
export const UPGRADE_MAX_ITEMS = 6;
export const UPGRADE_MULTIPLIERS = [1.5, 2, 3, 5, 10, 20, 50];

// Контракты: 10 предметов одной редкости → 1 следующей
export const CONTRACT_SIZE = 10;
// Отдача в долях суммы вложенного (среднее ≈0.97)
export const CONTRACT_PAYOUT_TABLE: { min: number; max: number; weight: number }[] = [
  { min: 0.35, max: 0.75, weight: 42 },
  { min: 0.75, max: 1.15, weight: 35 },
  { min: 1.15, max: 1.9,  weight: 18.5 },
  { min: 1.9,  max: 3.5,  weight: 4.5 },
];

// Лента рулетки
export const REEL_LENGTH = 60;     // клеток в ленте
export const REEL_WIN_INDEX = 52;  // где лежит выигрыш
export const SPIN_MS = 5600;
export const SPIN_FAST_MS = 1400;
