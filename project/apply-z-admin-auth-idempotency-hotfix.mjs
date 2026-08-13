#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/pages/admin/admin-login.component.ts';
let s = await readFile(path, 'utf8');

// The security hotfix is intentionally re-runnable. Collapse any repeated signal declaration
// produced by older runs so the quality gate remains deterministic.
s = s.replace(
  /(\n\s*generatedPassword = signal\(''\);){2,}/g,
  "\n  generatedPassword = signal('');",
);

await writeFile(path, s, 'utf8');
console.log('Admin auth hotfix output normalized for repeatable CI runs.');
