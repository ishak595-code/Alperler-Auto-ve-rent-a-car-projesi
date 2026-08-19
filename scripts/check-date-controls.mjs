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

function audit(file) {
  const source = fs.readFileSync(file, "utf8");
  const re = /<input\b[^>]*type=["'](?:date|datetime-local)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(source))) {
    const tag = match[0];
    const directlyNamed = /aria-label\s*=|\[attr\.aria-label\]\s*=/.test(tag);
    const intentionallyHidden = /aria-hidden=["']true["']/.test(tag) && /tabindex=["']-1["']/.test(tag);
    if (directlyNamed) continue;
    if (intentionallyHidden) {
      const hasNamedProxy = /<button\b[\s\S]*?\[attr\.aria-label\]\s*=/.test(source);
      if (hasNamedProxy) continue;
    }
    const line = source.slice(0, match.index).split("\n").length;
    failures.push(`${file}:${line}: native date control must be directly named or hidden behind one explicitly named date button`);
  }
}

walk("src");

const css = fs.readFileSync("src/runtime-stability.css", "utf8");
if (
  !css.includes('input[type="date"]::-webkit-calendar-picker-indicator') ||
  !css.includes('input[type="datetime-local"]::-webkit-calendar-picker-indicator') ||
  !css.includes('display: none')
) {
  failures.push("global native picker TalkBack suppression is missing");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Date-control accessibility guard passed.");
