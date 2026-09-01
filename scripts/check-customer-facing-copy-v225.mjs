import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/pages', 'src/components'];
const excluded = [
  /(?:^|\/)admin(?:\/|-)/i,
  /(?:^|\/)branch-portal(?:\/|-|\.)/i,
  /(?:^|\/)branch-subscription(?:\/|-|\.)/i,
];
const forbidden = [
  ['Supabase', /\bsupabase\b/i],
  ['API', /\bapi\b/i],
  ['fallback', /\bfallback\b/i],
  ['veritabanı', /veritaban/i],
  ['sunucu', /sunucu/i],
  ['backend', /\bbackend\b/i],
  ['frontend', /\bfrontend\b/i],
  ['endpoint', /\bendpoint\b/i],
  ['service role', /service\s+role/i],
  ['RLS', /\brls\b/i],
  ['row level security', /row\s+level\s+security/i],
  ['veri kaynağı', /veri\s+kaynağ/i],
  ['güvenli kaynak', /güvenli\s+kaynak/i],
  ['güvenli katalog', /güvenli\s+katalog/i],
  ['canonical', /\bcanonical\b/i],
];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function templates(source) {
  const values = [];
  const regex = /template\s*:\s*`([\s\S]*?)`\s*,/g;
  let match;
  while ((match = regex.exec(source))) values.push(match[1]);
  return values;
}

const failures = [];
for (const file of roots.flatMap(walk).filter((file) => file.endsWith('.ts'))) {
  const normalized = file.replaceAll('\\', '/');
  if (excluded.some((pattern) => pattern.test(normalized))) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const template of templates(source)) {
    for (const [label, pattern] of forbidden) {
      if (pattern.test(template)) failures.push(`${normalized}: customer-visible technical phrase: ${label}`);
    }
  }
}

if (failures.length) {
  console.error('V225_CUSTOMER_COPY_FAIL');
  for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V225 customer copy OK: public/customer templates are free of implementation-language leakage.');
