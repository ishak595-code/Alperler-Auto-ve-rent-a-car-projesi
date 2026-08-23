import fs from "node:fs";
import path from "node:path";

const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|html)$/.test(entry.name)) audit(file);
  }
}

function hasAccessibleWrappingLabel(source, index) {
  const labelStart = source.lastIndexOf("<label", index);
  if (labelStart < 0) return false;
  const previousLabelEnd = source.lastIndexOf("</label>", index);
  if (previousLabelEnd > labelStart) return false;
  const labelEnd = source.indexOf("</label>", index);
  return labelEnd >= index;
}

function audit(file) {
  const source = fs.readFileSync(file, "utf8");
  const re = /<input\b[^>]*type=["'](?:date|datetime-local)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(source))) {
    const tag = match[0];
    const directlyNamed = /aria-label\s*=|\[attr\.aria-label\]\s*=/.test(tag);
    const wrappingLabel = hasAccessibleWrappingLabel(source, match.index);
    const removedFromAccessibilityTree = /aria-hidden=["']true["']/.test(tag) || /tabindex=["']-1["']/.test(tag);
    const line = source.slice(0, match.index).split("\n").length;

    if (removedFromAccessibilityTree) {
      failures.push(`${file}:${line}: native date control may not be aria-hidden or tabindex=-1`);
      continue;
    }
    if (!directlyNamed || !wrappingLabel) {
      failures.push(`${file}:${line}: native date control needs both a permanent accessible name and a real wrapping label`);
    }
  }

  if (/\.showPicker\s*\(/.test(source)) {
    failures.push(`${file}: programmatic showPicker() is forbidden; the user must activate the real native date control directly`);
  }
}

walk("src");

const dateComponent = fs.readFileSync("src/components/accessible-native-date.component.ts", "utf8");
const invariants = [
  ['class="native-date-control"', 'shared component must expose one native date input'],
  ['aria-label="Tarihi seç"', 'date input accessible name must permanently be Tarihi seç'],
  ['[attr.aria-describedby]="contextId"', 'date context must be described without replacing the permanent accessible name'],
  ['[for]="inputId"', 'visible date surface must be a real label associated with the native input'],
  ['position:absolute', 'native date input must cover the complete date surface'],
  ['inset:0', 'native date input must cover the complete date surface'],
  ['-webkit-text-fill-color:transparent', 'native date text must be visually suppressed without hiding the control from accessibility'],
];
for (const [needle, message] of invariants) {
  if (!dateComponent.includes(needle)) failures.push(message);
}
if (/opacity\s*:\s*(?:0|\.0|0\.0)/.test(dateComponent)) {
  failures.push('shared date input must not use opacity hiding; Samsung TalkBack needs a real visible control in the accessibility tree');
}
if (/aria-hidden=["']true["'][^>]*type=["']date/.test(dateComponent) || /tabindex=["']-1["'][^>]*type=["']date/.test(dateComponent)) {
  failures.push('shared native date input may never be removed from the accessibility tree');
}

const css = fs.readFileSync("src/runtime-stability.css", "utf8");
if (
  !css.includes('input[type="date"]::-webkit-calendar-picker-indicator') ||
  !css.includes('input[type="datetime-local"]::-webkit-calendar-picker-indicator') ||
  !css.includes('display: none')
) {
  failures.push("global native picker duplicate-icon suppression is missing");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Date-control guard passed: permanent Tarihi seç label, one real native focus target, no hidden proxy and no showPicker.");
