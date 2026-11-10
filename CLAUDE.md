# Кейс-Рояль — инструкции для Claude

Браузерный симулятор открытия кейсов для компании друзей (только виртуальные монеты). Язык интерфейса — русский.
Стек: Vite + React + TypeScript, three.js для 3D, без бэкенда (пока localStorage; онлайн планируется на Firebase).

## Команды
- `npm ci`, `npm run dev` (порт 5173), `npm run build`, `npx vite preview --port 4173`
- `npx tsc --noEmit -p .`, `npx vitest run` (14 тестов: RTP кейсов, фри кейс, апгрейд, контракты, рецепты, батлы, промокоды)
- `npx tsx scripts/balance-sim.ts --n 6000` — симуляция баланса (цели: 10k+ у 25–35%, 50k+ ≈5%, 100k+ ≈2% за 2 часа)
- Blender: `bash scripts/setup-blender.sh`, затем `~/tools/blender/blender -b --python scripts/blender/<скрипт>.py`

## Устройство
- `src/config/economy.ts` — ВСЕ цифры экономики. `src/data/` — темы кейсов (themes.ts, 61 кейс), генерация кейсов под RTP (cases.ts),
  модели (weapons.ts), рецепты, батл-пасс, косметика, свои скины из Figma (customSkins.ts).
- `src/core/` — логика без React: store.ts (профиль, все действия), items, upgrade, contract, battle (детерминирован по seed), rewards.
- `src/ui/` — страницы, компоненты; `ui/three/` — 3D: render3d.ts (загрузка .glb, шейдер скина по ролям деталей, студийный HDRI),
  skinPainter.ts (генератор текстур скинов), Inspect3D (осмотр), ItemView (превью). Стили: styles/global.css + theme.css (тема под образец).
- `public/models/real/*.glb` — реальные модели (Sketchfab CC BY, авторы в CREDITS.md), обработаны scripts/blender/process_real.py
  (в цвете вершин записаны роли деталей: основная/второстепенная/акцент/металл).
- `public/cases/*.webp` — кейсы, рендер scripts/blender/build_cases.py → node scripts/to-webp.cjs.
- `public/tex/` — HDRI студии, фото-фактуры скинов (Poly Haven CC0).
- SECRETS.md — скрытые схемы для игроков (не раскрывать в интерфейсе).

## Правила
- Интерфейс повторяет устройство сайта-образца (скрины от пользователя), но без чужой графики: никаких моделей/скинов CS2,
  картинок и логотипа чужих сайтов. Только свои рендеры и материалы с открытой лицензией (CC0/CC BY, с указанием в CREDITS.md).
- После правок: tsc, vitest, build, скриншоты Playwright на 390px и 1440px (без горизонтального скролла).
- Коммиты на русском, без идентификаторов модели. Пушить в main (GitHub Pages собирается из .github/workflows/pages.yml).
- Промокод СУПЕРГЕМ (economy.ts → PROMO_ITEMS) — тестовый, убрать перед игрой с друзьями.

## Что дальше
1. Скины уровня CS: нужны рисованные дизайны (ИИ-генерация CellCog/SpriteCook или картинки от пользователя) → наложить по деталям.
2. Онлайн (Firebase): лента, лидеры, батлы с друзьями, трейды, маркет. Ждём firebaseConfig от пользователя.
3. Довести контракты, награды, магазин до уровня страницы кейса.
