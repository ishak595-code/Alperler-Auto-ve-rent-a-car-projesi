import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = 'project/apply-v154-planner.mjs';
const source = fs.readFileSync(sourcePath, 'utf8');
const marker = '// 5) CI: prevent a future regression back to unnamed runtime-mutated controls.';
const cut = source.indexOf(marker);
if (cut < 0) throw new Error('V154 patch marker not found');
const runnable = `${source.slice(0, cut)}\nconsole.log('V154 product patch applied.');\n`;
const tempPath = '/tmp/apply-v154-product.mjs';
fs.writeFileSync(tempPath, runnable);
await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
