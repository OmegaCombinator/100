import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const source = resolve(process.cwd(), '../acornlib-top100/projects/top100/frontend/top100.json');
const target = resolve(process.cwd(), 'public/content/top100.json');

const stats = statSync(source);
if (!stats.isFile()) {
  throw new Error(`Not a file: ${source}`);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`Copied ${source} -> ${target}`);
