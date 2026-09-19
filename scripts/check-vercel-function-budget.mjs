import { readdirSync, readFileSync, statSync } from 'node:fs';
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

// Node ESM (package.json "type":"module") requires explicit .js extensions on relative
// imports. Vercel emits unbundled api/*.js files; extensionless imports crash at
// module load with FUNCTION_INVOCATION_FAILED before any handler runs.
const relativeImport = /(?:from|import)\s*(?:\(\s*)?['"](\.[^'"]+)['"]/g;
const offenders = [];
function scanImports(filePath) {
  const source = readFileSync(filePath, 'utf8');
  for (const match of source.matchAll(relativeImport)) {
    const spec = match[1];
    if (spec.endsWith('.js') || spec.endsWith('.json') || spec.endsWith('.mjs') || spec.endsWith('.cjs')) continue;
    offenders.push(`${filePath}: ${spec}`);
  }
}
function walkTs(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      walkTs(full);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) scanImports(full);
  }
}
if (statSync(root).isDirectory()) walkTs(root);
if (offenders.length) {
  console.error('API relative imports must use explicit .js extensions for Vercel ESM:');
  for (const item of offenders) console.error(` - ${item}`);
  throw new Error(`Found ${offenders.length} extensionless relative import(s) under api/.`);
}
