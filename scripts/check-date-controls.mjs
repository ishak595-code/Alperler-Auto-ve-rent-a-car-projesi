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
  if (labelEnd < 0) return false;
  const beforeInput = source.slice(labelStart, index);
  return /<span\b[^>]*>[\s\S]*?\S[\s\S]*?<\/span>/i.test(beforeInput);
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
      failures.push(`${file}:${line}: native date control must remain the single focusable TalkBack control; aria-hidden/tabindex=-1 date proxies are forbidden`);
      continue;
    }
    if (!directlyNamed && !wrappingLabel) {
      failures.push(`${file}:${line}: native date control must have an aria-label or an accessible wrapping label`);
    }
  }

  if (/\.showPicker\s*\(/.test(source)) {
    failures.push(`${file}: programmatic showPicker() is forbidden; direct native date interaction prevents Android/TalkBack focus jitter`);
  }
}

walk("src");

const dateComponent = fs.readFileSync("src/components/accessible-native-date.component.ts", "utf8");
if (!dateComponent.includes('class="native-date-control"')) {
  failures.push("shared date component must expose one real native date input across the whole visual date surface");
}
if (!dateComponent.includes("position:absolute") || !dateComponent.includes("inset:0")) {
  failures.push("shared native date input must cover the visual date surface so touch opens the calendar directly");
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
console.log("Date-control accessibility guard passed: one native focus target, direct calendar interaction, no showPicker proxy.");
