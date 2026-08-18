import fs from "node:fs";
import path from "node:path";

const reportOnly = process.argv.includes("--report-only");
const issues = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|html)$/.test(entry.name)) audit(full);
  }
}

function hasAccessibleName(attrs, body) {
  if (/aria-label(?:ledby)?\s*=|\[attr\.aria-label(?:ledby)?\]\s*=/.test(attrs)) return true;
  if (/<img\b[^>]*\balt\s*=\s*["'][^"']+/.test(body)) return true;
  const text = body
    .replace(/<mat-icon\b[^>]*>[\s\S]*?<\/mat-icon>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\{[\s\S]*?\}\}/g, " dynamic ")
    .replace(/@[a-z]+[^{}]*\{/gi, " ")
    .replace(/\}/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  return Boolean(text);
}

function auditElement(source, file, tag) {
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let match;
  while ((match = re.exec(source))) {
    const attrs = match[1];
    const body = match[2];
    if (/aria-hidden\s*=\s*["']true["']/.test(attrs)) continue;
    if (hasAccessibleName(attrs, body)) continue;
    const line = source.slice(0, match.index).split("\n").length;
    issues.push(`${file}:${line}: ${tag} has no accessible name`);
  }
}

function audit(file) {
  const source = fs.readFileSync(file, "utf8");
  auditElement(source, file, "button");
  auditElement(source, file, "a");
}

walk("src");

if (issues.length) {
  console.error(issues.join("\n"));
  if (!reportOnly) process.exit(1);
} else {
  console.log("Accessible interaction guard passed: no unlabeled buttons or links found.");
}
