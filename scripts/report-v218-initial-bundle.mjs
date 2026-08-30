import fs from 'node:fs';
import path from 'node:path';

function findFile(root, name) {
  if (!fs.existsSync(root)) return null;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isFile() && entry.name === name) return full;
    if (entry.isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    }
  }
  return null;
}

const statsPath = findFile('dist', 'stats.json');
if (!statsPath) {
  console.error('V218 stats reporter: stats.json not found under dist.');
  process.exit(1);
}

const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
const outputs = stats.outputs && typeof stats.outputs === 'object' ? stats.outputs : null;
if (!outputs) {
  console.error(`V218 stats reporter: unsupported stats shape. Keys: ${Object.keys(stats).join(', ')}`);
  process.exit(1);
}

const indexPath = findFile('dist', 'index.html');
if (!indexPath) {
  console.error('V218 stats reporter: dist index.html not found.');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const referencedAssets = [...indexHtml.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)]
  .map((match) => match[1].split('?')[0].split('#')[0])
  .map((value) => path.basename(value));

const outputEntries = Object.entries(outputs);
const byBasename = new Map(outputEntries.map(([key, value]) => [path.basename(key), [key, value]]));
const initial = new Map();
const queue = [];
for (const asset of referencedAssets) {
  const entry = byBasename.get(asset);
  if (entry) queue.push(entry);
}

while (queue.length) {
  const [key, output] = queue.shift();
  if (initial.has(key)) continue;
  initial.set(key, output);
  for (const dependency of output.imports || []) {
    if (dependency.external || dependency.kind === 'dynamic-import') continue;
    const direct = outputs[dependency.path] ? [dependency.path, outputs[dependency.path]] : byBasename.get(path.basename(dependency.path));
    if (direct && !initial.has(direct[0])) queue.push(direct);
  }
}

const initialBytes = [...initial.values()].reduce((total, output) => total + Number(output.bytes || 0), 0);
const inputBytes = new Map();
for (const output of initial.values()) {
  for (const [input, contribution] of Object.entries(output.inputs || {})) {
    inputBytes.set(input, (inputBytes.get(input) || 0) + Number(contribution.bytesInOutput || 0));
  }
}

const topInputs = [...inputBytes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
const kb = (bytes) => `${(bytes / 1024).toFixed(2)} KiB`;

console.log(`V218 stats reporter: ${initial.size} initial output files, ${kb(initialBytes)} from static index graph.`);
console.log('V218 top initial source contributions:');
for (const [input, bytes] of topInputs) console.log(`${kb(bytes).padStart(12)}  ${input}`);
