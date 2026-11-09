// Секретные рецепты контрактов: особые комбинации дают скрытые эксклюзивы.
// В книге рецептов до открытия видна только загадка.
import type { Item } from '../core/items';
import { skinById, registerSkin, SkinDef } from './cases';
import { KNIVES, WEAPONS } from './weapons';
import { wearName } from '../core/items';

export interface Recipe {
  id: string;
  name: string;       // имя эксклюзива
  riddle: string;     // подсказка-загадка
  how: string;        // условие (видно после открытия)
  test: (items: Item[]) => boolean;
  skin: SkinDef;
}

const allFrom = (id: string) => (it: Item[]) => it.every((x) => x.caseId === id);
const ex = (id: string, model: SkinDef['model'], name: string, style: SkinDef['finish']['style'], colors: [string, string, string]): SkinDef => ({
  id: `ex:${id}`, caseId: 'secret', model, skin: name, rarity: 'covert', base: 1, exclusive: true,
  finish: { style, colors, seed: id.length * 7919 },
});

export const RECIPES: Recipe[] = [
  {
    id: 'mirror', name: 'Зеркальный близнец', riddle: 'Десять близнецов в одной коробке — и родится одиннадцатый, отражённый.',
    how: 'Все 10 предметов — одна и та же модель оружия',
    test: (it) => it.every((x) => skinById(x.skinId)?.model.id === skinById(it[0].skinId)?.model.id),
    skin: ex('mirror', WEAPONS[9], 'Зеркальный близнец', 'hologram', ['#e0f7ff', '#90a4ae', '#ffffff']),
  },
  {
    id: 'mint', name: 'Камень чистоты', riddle: 'Десять нетронутых — и чистота станет камнем.',
    how: 'Все 10 предметов в износе «Прямо с завода»',
    test: (it) => it.every((x) => wearName(x.float).short === 'ПЗ'),
    skin: ex('mint', WEAPONS[11], 'Камень чистоты', 'marble', ['#ffffff', '#b2ebf2', '#00e5ff']),
  },
  {
    id: 'rust', name: 'Ржавый король', riddle: 'Из десяти шрамов выковывают корону.',
    how: 'Все 10 предметов «Закалённые в боях»',
    test: (it) => it.every((x) => wearName(x.float).short === 'ЗБ'),
    skin: ex('rust', WEAPONS[7], 'Ржавый король', 'lava', ['#b5651d', '#3e1f00', '#ffd700']),
  },
  {
    id: 'counter', name: 'Счётчик судьбы', riddle: 'Трое считают чужие ошибки — четвёртый считает твою удачу.',
    how: 'Не меньше 4 предметов StatTrak™',
    test: (it) => it.filter((x) => x.st).length >= 4,
    skin: ex('counter', WEAPONS[4], 'Счётчик судьбы', 'circuit', ['#ff9d3c', '#1a0d00', '#ffe0b2']),
  },
  {
    id: 'rainbow', name: 'Восемь домов', riddle: 'Восемь разных домов за одним столом.',
    how: 'Предметы минимум из 8 разных кейсов',
    test: (it) => new Set(it.map((x) => x.caseId)).size >= 8,
    skin: ex('rainbow', WEAPONS[1], 'Восемь домов', 'hologram', ['#ff00e5', '#00e5ff', '#7cff00']),
  },
  {
    id: 'throne', name: 'Унитазный трон', riddle: 'Десять гостей из одной уборной — и трон твой.',
    how: 'Все 10 предметов из кейса «Скибиди»',
    test: allFrom('skibidi'),
    skin: ex('throne', KNIVES[3], 'Унитазный трон', 'galaxy', ['#e0e0e0', '#3f51b5', '#ffeb3b']),
  },
  {
    id: 'mutant', name: 'Мозговой мутант', riddle: 'Половина мозга, половина уборной.',
    how: '5 предметов из «Брейнрота» и 5 из «Скибиди»',
    test: (it) => it.filter((x) => x.caseId === 'brainrot').length === 5 && it.filter((x) => x.caseId === 'skibidi').length === 5,
    skin: ex('mutant', WEAPONS[13], 'Мозговой мутант', 'acid', ['#7cff00', '#ff00a8', '#240046']),
  },
  {
    id: 'diploma', name: 'Красный диплом', riddle: 'Сдай десять экзаменов в одной общаге.',
    how: 'Все 10 предметов из «Жизы студента»',
    test: allFrom('student'),
    skin: ex('diploma', WEAPONS[0], 'Красный диплом', 'damascus', ['#c62828', '#3e0000', '#ffd54f']),
  },
  {
    id: 'service', name: 'Бабушкин сервиз', riddle: 'Десять тарелок от той, что всегда говорит «поешь».',
    how: 'Все 10 предметов из «Бабушкиного»',
    test: allFrom('babushka'),
    skin: ex('service', KNIVES[4], 'Бабушкин сервиз', 'marble', ['#ffffff', '#1565c0', '#ffd54f']),
  },
];
RECIPES.forEach((r) => registerSkin(r.skin));

// Сначала узкие рецепты, потом общие
const ORDER = ['mutant', 'throne', 'diploma', 'service', 'mirror', 'rainbow', 'counter', 'mint', 'rust'];
export function matchRecipe(items: Item[]): Recipe | undefined {
  for (const id of ORDER) {
    const r = RECIPES.find((x) => x.id === id)!;
    if (r.test(items)) return r;
  }
  return undefined;
}
