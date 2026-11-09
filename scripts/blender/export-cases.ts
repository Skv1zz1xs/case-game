// Список кейсов для рендера в Blender
import { writeFileSync } from 'node:fs';
import { CASES } from '../../src/data/cases';
import { FREE_CASE } from '../../src/data/free';
const list = [FREE_CASE, ...CASES].map((c) => ({ id: c.id, cat: c.cat, palette: c.palette, name: c.name, glyph: c.glyph }));
writeFileSync(new URL('./cases.json', import.meta.url), JSON.stringify(list));
console.log('кейсов:', list.length);
