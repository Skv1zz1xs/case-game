// Награды батл-пасса: бесплатная и премиум-дорожки, сезонные эксклюзивы (свои скины)
import { PASS_LEVELS } from '../config/economy';
import { registerSkin, SkinDef, caseById } from './cases';
import { WEAPONS, KNIVES, GLOVES } from './weapons';

export type PassReward = { kind: 'coins'; value: number } | { kind: 'case'; caseId: string } | { kind: 'skin'; skinId: string; value: number };

const ex = (id: string, model: SkinDef['model'], name: string, style: SkinDef['finish']['style'], colors: [string, string, string], rarity: SkinDef['rarity']): SkinDef => ({
  id: `pass:${id}`, caseId: 'pass', model, skin: name, rarity, base: 1, exclusive: true, finish: { style, colors, seed: 7000 + id.length * 131 },
});
export const PASS_SKINS: SkinDef[] = [
  ex('s1ak', WEAPONS[7], 'Первый сезон', 'galaxy', ['#2de2d0', '#1a0a3a', '#ff4dd2'], 'covert'),
  ex('s1glock', WEAPONS[0], 'Ледяной старт', 'fade', ['#bff6ff', '#2962ff', '#ffffff'], 'classified'),
  ex('s1awp', WEAPONS[11], 'Северный свет', 'hologram', ['#00e5ff', '#6200ea', '#ffd600'], 'covert'),
  ex('s1knife', KNIVES[0], 'Полярная ночь', 'galaxy', ['#00e5ff', '#05010f', '#b388ff'], 'rare'),
  ex('s1gloves', GLOVES[0], 'Сезонные', 'beast', ['#2de2d0', '#14161c', '#ffd600'], 'rare'),
];
PASS_SKINS.forEach(registerSkin);

// Таблица наград по уровням (1..60)
export const PASS_TRACK: { free: PassReward | null; prem: PassReward }[] = Array.from({ length: PASS_LEVELS }, (_, i) => {
  const lvl = i + 1;
  const free: PassReward | null =
    lvl === 30 ? { kind: 'skin', skinId: 'pass:s1glock', value: 2500 }
    : lvl === 60 ? { kind: 'skin', skinId: 'pass:s1ak', value: 15000 }
    : lvl % 5 === 0 ? { kind: 'case', caseId: lvl < 30 ? 'arsenal' : 'chrome' }
    : lvl % 2 === 0 ? { kind: 'coins', value: 60 + lvl * 8 } : null;
  const prem: PassReward =
    lvl === 20 ? { kind: 'skin', skinId: 'pass:s1awp', value: 12000 }
    : lvl === 40 ? { kind: 'skin', skinId: 'pass:s1gloves', value: 40000 }
    : lvl === 60 ? { kind: 'skin', skinId: 'pass:s1knife', value: 90000 }
    : lvl % 5 === 0 ? { kind: 'case', caseId: lvl < 30 ? 'cobalt' : 'dragon' }
    : { kind: 'coins', value: 150 + lvl * 25 };
  return { free, prem };
});

export const rewardValue = (r: PassReward) => (r.kind === 'coins' ? r.value : r.kind === 'skin' ? r.value : caseById(r.caseId)?.price ?? 0);
