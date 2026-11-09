// Перегоняет public/cases/*.png в .webp (через встроенный Chromium), PNG удаляет.
// Запуск: node scripts/to-webp.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'public', 'cases');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.png'))) {
    const src = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64');
    const data = await pg.evaluate(async (s) => {
      const img = new Image(); img.src = s; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', 0.86);
    }, src);
    fs.writeFileSync(path.join(dir, f.replace('.png', '.webp')), Buffer.from(data.split(',')[1], 'base64'));
    fs.unlinkSync(path.join(dir, f));
  }
  await b.close();
  console.log('готово');
})();
