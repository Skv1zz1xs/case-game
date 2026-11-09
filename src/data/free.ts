// Бесплатный кейс: свой состав, цены строго по FREE_CASE_TABLE (не зависят от уровня)
import { FREE_CASE_TABLE, RarityId } from '../config/economy';
import { CaseDef, SkinDef, registerSkin } from './cases';
import { WEAPONS, KNIVES } from './weapons';

const RAR: RarityId[] = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert'];
const NAMES = ['Подарок', 'Халява', 'Бонус дня', 'Щедрость', 'Джекпот', 'Чудо'];
const MODELS = [WEAPONS[0], WEAPONS[4], WEAPONS[7], WEAPONS[11], WEAPONS[8], KNIVES[0]];
const STYLES = ['solid', 'camo', 'fade', 'acid', 'marble', 'hologram'] as const;

export const FREE_SKINS: SkinDef[] = FREE_CASE_TABLE.map((row, i) => ({
  id: `free:${i}`,
  caseId: 'free',
  model: MODELS[i],
  skin: NAMES[i],
  rarity: RAR[i],
  base: (row.min + row.max) / 2,
  finish: { style: STYLES[i], colors: ['#38ef7d', '#11998e', '#f9f871'], seed: 1000 + i },
}));
FREE_SKINS.forEach(registerSkin);

export const FREE_CASE: CaseDef = {
  id: 'free', name: 'Бесплатный кейс', price: 0, cat: 'cheap', rtp: 1, glyph: '🎉',
  tagline: 'Раз в 5 минут', palette: ['#38ef7d', '#11998e', '#f9f871'], skins: FREE_SKINS,
};
