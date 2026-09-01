import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/pages', 'src/components'];
const excluded = [
  /(?:^|\/)admin(?:\/|-)/i,
  /(?:^|\/)branch-portal(?:\/|-|\.)/i,
  /(?:^|\/)branch-subscription(?:\/|-|\.)/i,
  /(?:^|\/)track-car\.component\.ts$/i,
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
  ['internal version', /\bV\d{2,4}(?:\.\d+)?\b/i],
  ['checkout', /\bcheckout\b/i],
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

function visibleLiteralText(template) {
  const snippets = [];
  const withoutComments = template.replace(/<!--[\s\S]*?-->/g, ' ');

  const readableAttribute = /\b(?:aria-label|title|placeholder|alt)\s*=\s*(["'])([\s\S]*?)\1/gi;
  let attributeMatch;
  while ((attributeMatch = readableAttribute.exec(withoutComments))) {
    snippets.push(attributeMatch[2].replace(/\{\{[\s\S]*?\}\}/g, ' '));
  }

  const textNodes = withoutComments
    .replace(/\{\{[\s\S]*?\}\}/g, ' ')
    .replace(/@let\b[^;]*;/g, ' ')
    .replace(/@(?:if|for|switch|case)\s*\([^)]*\)\s*\{/g, ' ')
    .replace(/@else(?:\s+if\s*\([^)]*\))?\s*\{/g, ' ')
    .replace(/@default\s*\{/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[{}]/g, ' ');

  snippets.push(textNodes);
  return snippets.join('\n');
}

const failures = [];
for (const file of roots.flatMap(walk).filter((file) => file.endsWith('.ts'))) {
  const normalized = file.replaceAll('\\', '/');
  if (excluded.some((pattern) => pattern.test(normalized))) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const template of templates(source)) {
    const customerText = visibleLiteralText(template);
    for (const [label, pattern] of forbidden) {
      if (pattern.test(customerText)) failures.push(`${normalized}: customer-visible technical phrase: ${label}`);
    }
  }
}

if (failures.length) {
  console.error('V225_CUSTOMER_COPY_FAIL');
  for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V225 customer copy OK: public/customer literal UI copy is free of implementation-language leakage. Dynamic/admin-managed content is intentionally outside this source-code guard.');
