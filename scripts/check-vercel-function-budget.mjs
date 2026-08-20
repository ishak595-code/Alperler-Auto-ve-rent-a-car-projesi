import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = 'api';
const maxFunctions = 12;
const extensions = new Set(['.js', '.mjs', '.cjs', '.ts']);
const functions = [];

function extname(name) {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index) : '';
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile() || !extensions.has(extname(entry.name))) continue;
    functions.push(relative('.', full).replaceAll('\\', '/'));
  }
}

if (statSync(root).isDirectory()) walk(root);
functions.sort();

console.log(`Vercel Serverless Function count: ${functions.length}/${maxFunctions}`);
for (const file of functions) console.log(` - ${file}`);

if (functions.length > maxFunctions) {
  throw new Error(`Vercel Hobby function budget exceeded: ${functions.length} functions found, maximum is ${maxFunctions}. Merge related API routes before deployment.`);
}
