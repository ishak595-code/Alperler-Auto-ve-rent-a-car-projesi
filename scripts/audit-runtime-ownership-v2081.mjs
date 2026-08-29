import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'src');
const servicesRoot = join(srcRoot, 'services');
const failures = [];

function walk(dir) {
  const result = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) result.push(...walk(full));
    else if (stat.isFile()) result.push(full);
  }
  return result;
}

const isTypeScriptSource = (file) => /\.(?:ts|tsx|mts|cts)$/.test(file);
const browserEntrypoints = [join(root, 'index.tsx')].filter((file) => existsSync(file));
const sourceFiles = [...walk(srcRoot).filter(isTypeScriptSource), ...browserEntrypoints];
const sourceSet = new Set(sourceFiles.map((file) => normalize(file)));
const inbound = new Map(sourceFiles.map((file) => [normalize(file), new Set()]));

function resolveSpecifier(importer, specifier) {
  if (!specifier) return null;

  let base;
  if (specifier.startsWith('.')) base = resolve(dirname(importer), specifier);
  else if (specifier.startsWith('src/')) base = resolve(root, specifier);
  else return null;

  // TypeScript module specifiers routinely contain semantic dots such as
  // `car.service`, `home.component` and `booking.model` while omitting the
  // actual `.ts` extension. Never infer the real extension from path.extname().
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
    join(base, 'index.mts'),
    join(base, 'index.cts'),
  ];

  for (const candidate of candidates) {
    const normalized = normalize(candidate);
    if (sourceSet.has(normalized)) return normalized;
  }
  return null;
}

const staticImport = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const dynamicImport = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const importer of sourceFiles) {
  const source = readFileSync(importer, 'utf8');
  for (const regex of [staticImport, dynamicImport]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source)) !== null) {
      const target = resolveSpecifier(importer, match[1]);
      if (!target || target === normalize(importer)) continue;
      inbound.get(target)?.add(normalize(importer));
    }
  }
}

const serviceFiles = sourceFiles.filter((file) => {
  const normalized = normalize(file);
  return normalized.startsWith(`${normalize(servicesRoot)}${process.platform === 'win32' ? '\\' : '/'}`)
    && file.endsWith('.service.ts');
});

const zeroInbound = serviceFiles
  .filter((file) => (inbound.get(normalize(file))?.size ?? 0) === 0)
  .map((file) => relative(root, file).replaceAll('\\', '/'))
  .sort();

if (zeroInbound.length) {
  failures.push(`Runtime service files with zero inbound browser-runtime imports: ${zeroInbound.length}`);
  for (const file of zeroInbound) failures.push(`ORPHAN_CANDIDATE ${file}`);
}

const unresolvedRelativeImports = [];
for (const importer of sourceFiles) {
  const source = readFileSync(importer, 'utf8');
  for (const regex of [staticImport, dynamicImport]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source)) !== null) {
      const specifier = match[1];
      if (!specifier?.startsWith('.')) continue;
      if (resolveSpecifier(importer, specifier)) continue;

      const rawBase = resolve(dirname(importer), specifier);
      const nonTsCandidates = [
        rawBase,
        `${rawBase}.json`,
        `${rawBase}.css`,
        `${rawBase}.scss`,
        `${rawBase}.sass`,
        `${rawBase}.html`,
        `${rawBase}.svg`,
      ];
      if (nonTsCandidates.some((candidate) => existsSync(candidate))) continue;

      unresolvedRelativeImports.push(`${relative(root, importer).replaceAll('\\', '/')} -> ${specifier}`);
    }
  }
}

for (const item of [...new Set(unresolvedRelativeImports)].sort()) {
  failures.push(`UNRESOLVED_RELATIVE_IMPORT ${item}`);
}

if (failures.length) {
  console.error('V208.1 runtime ownership audit: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`V208.1 runtime ownership audit: PASS (${sourceFiles.length} browser-runtime TS files, ${serviceFiles.length} service files, zero orphan services).`);
