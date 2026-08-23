import fs from 'node:fs';

function replace(path, from, to) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`Target not found in ${path}: ${from}`);
  fs.writeFileSync(path, source.replace(from, to));
}

replace(
  'src/pages/home-v71.component.ts',
  "Hizmet türünü, kiralama süresini ve teslim noktasını seçin. Uygun seçenekleri doğrudan görüntüleyin.",
  "Hizmet türünü, teslim noktasını ve kiralama süresini seçin. Uygun seçenekleri doğrudan görüntüleyin.",
);

replace(
  'src/pages/admin/admin-homepage.component.ts',
  '<h4>Tablet ve Bilgisayar Hızlı Planlama</h4>',
  '<h4>Hızlı Planlama</h4>',
);
replace(
  'src/pages/admin/admin-homepage.component.ts',
  '<p class="hint">Bu alan telefonda gösterilmez. Tablet ve bilgisayarda teslim noktaları ile araç/tur sonuçları mevcut canlı şube ve katalog verilerinden otomatik gelir.</p>',
  '<p class="hint">Bu alan telefon, tablet ve bilgisayarda aynı canlı ayarları kullanır. Teslim noktaları ile araç/tur sonuçları mevcut canlı şube ve katalog verilerinden otomatik gelir.</p>',
);

fs.writeFileSync('scripts/check-accessible-buttons.mjs', `import fs from "node:fs";
import path from "node:path";

const reportOnly = process.argv.includes("--report-only");
const issues = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\\.(ts|html)$/.test(entry.name)) audit(full);
  }
}

function hasAccessibleName(attrs, body) {
  if (/aria-label(?:ledby)?\\s*=|\\[attr\\.aria-label(?:ledby)?\\]\\s*=/.test(attrs)) return true;
  if (/<img\\b[^>]*\\balt\\s*=\\s*["'][^"']+/.test(body)) return true;
  const text = body
    .replace(/<mat-icon\\b[^>]*>[\\s\\S]*?<\\/mat-icon>/gi, "")
    .replace(/<svg\\b[\\s\\S]*?<\\/svg>/gi, "")
    .replace(/<img\\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\{\\{[\\s\\S]*?\\}\\}/g, " dynamic ")
    .replace(/@[a-z]+[^{}]*\\{/gi, " ")
    .replace(/\\}/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  return Boolean(text);
}

function auditElement(source, file, tag) {
  const re = new RegExp(\`<\${tag}\\\\b([^>]*)>([\\\\s\\\\S]*?)<\\\\/\${tag}>\`, "gi");
  let match;
  while ((match = re.exec(source))) {
    const attrs = match[1];
    const body = match[2];
    if (/aria-hidden\\s*=\\s*["']true["']/.test(attrs)) continue;
    if (hasAccessibleName(attrs, body)) continue;
    const line = source.slice(0, match.index).split("\\n").length;
    issues.push(\`\${file}:\${line}: \${tag} has no accessible name\`);
  }
}

function insideWrappingLabel(source, index) {
  const before = source.slice(0, index);
  const open = before.lastIndexOf("<label");
  const close = before.lastIndexOf("</label>");
  return open > close && source.indexOf("</label>", index) > index;
}

function hasExplicitLabelFor(source, attrs) {
  const id = /\\bid\\s*=\\s*["']([^"']+)["']/.exec(attrs)?.[1];
  if (!id) return false;
  const escaped = id.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
  return new RegExp(\`<label\\\\b[^>]*\\\\bfor\\\\s*=\\\\s*["']\${escaped}["']\`, "i").test(source);
}

function auditFormControls(source, file) {
  const re = /<(input|select|textarea)\\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(source))) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    if (/aria-hidden\\s*=\\s*["']true["']/.test(attrs)) continue;
    if (/\\btype\\s*=\\s*["']hidden["']/.test(attrs)) continue;
    if (/aria-label(?:ledby)?\\s*=|\\[attr\\.aria-label(?:ledby)?\\]\\s*=/.test(attrs)) continue;
    if (insideWrappingLabel(source, match.index)) continue;
    if (hasExplicitLabelFor(source, attrs)) continue;
    const line = source.slice(0, match.index).split("\\n").length;
    issues.push(\`\${file}:\${line}: \${tag} has no accessible label association\`);
  }
}

function audit(file) {
  const source = fs.readFileSync(file, "utf8");
  auditElement(source, file, "button");
  auditElement(source, file, "a");
  auditFormControls(source, file);
}

walk("src");

if (issues.length) {
  console.error(issues.join("\\n"));
  if (!reportOnly) process.exit(1);
} else {
  console.log("Accessible interaction guard passed: no unlabeled buttons, links or form controls found.");
}
`);

console.log('V154 final accessibility audit patch applied.');
