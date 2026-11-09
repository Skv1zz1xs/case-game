// Свои скины, нарисованные в Figma по шаблону public/templates/<модель>.svg.
// Картинку кладёшь в public/skins/, строчку добавляешь сюда — скин появится в кейсе
// на месте одного из предметов нужной редкости (цена и шансы кейса не меняются).
import type { RarityId } from '../config/economy';

export interface CustomSkin {
  caseId: string;     // id кейса из data/themes.ts, напр. 'gta6'
  rarity: RarityId;   // 'consumer' | 'industrial' | 'milspec' | 'restricted' | 'classified' | 'covert' | 'rare' | 'contraband'
  model: string;      // id модели из data/weapons.ts, напр. 'ak47', 'awp', 'karambit'
  name: string;       // название скина
  image: string;      // путь к картинке, напр. 'skins/ak-neon.png'
}

export const CUSTOM_SKINS: CustomSkin[] = [
  // Пример: картинка нарисована поверх шаблона public/templates/ak.svg
  { caseId: 'gta6', rarity: 'covert', model: 'ak47', name: 'Неоновый закат', image: 'skins/demo-ak-sunset.svg' },
];
