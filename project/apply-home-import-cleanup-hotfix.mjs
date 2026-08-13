#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/pages/home.component.ts';
let s = await readFile(path, 'utf8');
s = s.replace(
  'import { CommonModule, NgOptimizedImage } from "@angular/common";',
  'import { CommonModule } from "@angular/common";',
);
s = s.replace('    NgOptimizedImage,\n', '');
await writeFile(path, s, 'utf8');
console.log('Unused NgOptimizedImage import removed after resilient hero-image update.');
