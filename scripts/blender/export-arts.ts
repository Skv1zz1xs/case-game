// Выгружает чертежи деталей оружия в JSON для Blender
import { writeFileSync } from 'node:fs';
import { ARTS } from '../../src/ui/components/weaponArt';
writeFileSync(new URL('./arts.json', import.meta.url), JSON.stringify(ARTS, null, 1));
console.log('арт-ключей:', Object.keys(ARTS).length);
