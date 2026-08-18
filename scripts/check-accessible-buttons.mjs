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

function audit(file) {
  const source = fs.readFileSync(file, "utf8");
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let match;
  while ((match = re.exec(source))) {
    const attrs = match[1];
    let body = match[2];
    if (/aria-label(?:ledby)?\s*=|\[attr\.aria-label(?:ledby)?\]\s*=/.test(attrs)) continue;
    body = body
      .replace(/<mat-icon\b[^>]*>[\s\S]*?<\/mat-icon>/gi, "")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\{\{[\s\S]*?\}\}/g, " dynamic ")
      .replace(/@[a-z]+[^{}]*\{/gi, " ")
      .replace(/\}/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (body) continue;
    const line = source.slice(0, match.index).split("\n").length;
    issues.push(`${file}:${line}: icon-only button has no aria-label/aria-labelledby`);
  }
}

walk("src");

if (issues.length) {
  console.error(issues.join("\n"));
  if (!reportOnly) process.exit(1);
} else {
  console.log("Accessible button guard passed: no unlabeled icon-only buttons found.");
}
