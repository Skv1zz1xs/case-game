# Как нарисовать свой скин в Figma

1. Скачай шаблон нужной модели из `public/templates/` (например, `ak.svg` для AK-47, `awp.svg`, `karambit.svg`).
   На GitHub: открой файл → кнопка «Download raw file».
2. В Figma: перетащи SVG на холст. Белые детали — то, что красится (рисуешь по ним). Серые — металл и полимер, их краска не касается. Розовые линии — контуры.
3. Рисуй поверх шаблона в том же фрейме: градиенты, узоры, надписи, наклейки. Можно выходить за контуры — лишнее не видно.
4. Перед экспортом скрой слой шаблона (иначе контуры попадут на скин).
5. Экспортируй фрейм целиком: **PNG, 2x** (или SVG). Размер фрейма не меняй — иначе рисунок съедет.
6. Загрузи картинку в репозиторий в папку `public/skins/` (на GitHub: Add file → Upload files).
7. Добавь строчку в `src/data/customSkins.ts`:
   ```ts
   { caseId: 'gta6', rarity: 'covert', model: 'ak47', name: 'Мой скин', image: 'skins/мой-скин.png' },
   ```
   - `caseId` — в каком кейсе выпадает (список в `src/data/themes.ts`)
   - `rarity` — редкость: consumer, industrial, milspec, restricted, classified, covert, rare (ножи/перчатки), contraband
   - `model` — модель: glock, deagle, usp, p250, mp7, p90, mac10, ak47, m4a4, m4a1s, galil, awp, ssg08, nova, xm1014, negev,
     karambit, butterfly, m9, bowie, stiletto, gsport, gdriver, gtact
8. Пуш в `main` → через пару минут скин в игре на 3D-модели, с износом и StatTrak.

Шаблон ↔ модель: ak (AK-47, Galil AR), m4 (M4A4), m4s (M4A1-S), awp (AWP, SSG 08), glock (Glock-18, P250), deagle, usp,
mp7, p90, mac10, nova (Nova, XM1014), negev, karambit, butterfly, bayonet (M9), bowie, stiletto, gloves (все перчатки).

Пример готового скина: `public/skins/demo-ak-sunset.svg`.

## 3D-модели (Blender)
Модели собираются скриптом: `blender -b --python scripts/blender/build_models.py` (сначала `npx tsx scripts/blender/export-arts.ts`).
Результат — `public/models/*.glb`. Шаблоны пересобираются командой `npx tsx scripts/make-templates.ts`.
