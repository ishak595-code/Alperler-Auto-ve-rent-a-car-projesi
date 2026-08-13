#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/components/footer.component.ts';
let s = await readFile(path, 'utf8');

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`${label}: expected source text not found`);
  return source.replace(from, to);
}
function replaceAllSafe(source, from, to) {
  if (source.includes(to)) return source;
  return source.replaceAll(from, to);
}

s = replaceOnce(
  s,
  'class="bg-slate-950 text-slate-400 pt-16 border-t border-slate-900 font-sans"',
  'class="bg-slate-950 text-slate-300 pt-12 sm:pt-16 border-t border-slate-900 font-sans overflow-x-hidden"',
  'footer contrast and overflow',
);

s = replaceOnce(
  s,
  'class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12"',
  'class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-12"',
  'footer responsive grid',
);

s = replaceOnce(
  s,
  '<div\n              class="flex items-center mb-6 group cursor-pointer"\n              routerLink="/"\n            >',
  '<a\n              class="flex items-center mb-6 group cursor-pointer rounded-lg w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"\n              routerLink="/"\n              aria-label="Alperler Auto ana sayfa"\n            >',
  'semantic footer logo start',
);
s = replaceOnce(
  s,
  '            </div>\n            <p class="text-slate-500 mb-4 leading-relaxed text-sm">',
  '            </a>\n            <p class="text-slate-400 mb-4 leading-relaxed text-sm">',
  'semantic footer logo end',
);

s = replaceOnce(
  s,
  'class="text-slate-700 text-[10px] mb-6 leading-relaxed font-medium italic"',
  'class="text-slate-500 text-xs mb-6 leading-relaxed font-medium italic"',
  'footer promise contrast',
);

s = replaceAllSafe(
  s,
  'target="_blank"\n                  aria-label=',
  'target="_blank"\n                  rel="noopener noreferrer"\n                  aria-label=',
);

s = replaceAllSafe(
  s,
  'class="text-slate-400 hover:text-green-500 transition-all flex items-center group bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:border-green-500/30"',
  'class="text-slate-300 hover:text-green-500 transition-all flex items-center justify-center group bg-slate-900/50 hover:bg-slate-900 min-w-11 min-h-11 px-3 py-2 rounded-lg border border-slate-800 hover:border-green-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"',
);
s = replaceAllSafe(
  s,
  'class="text-slate-400 hover:text-pink-500 transition-all flex items-center group bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:border-pink-500/30"',
  'class="text-slate-300 hover:text-pink-500 transition-all flex items-center justify-center group bg-slate-900/50 hover:bg-slate-900 min-w-11 min-h-11 px-3 py-2 rounded-lg border border-slate-800 hover:border-pink-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"',
);

s = replaceAllSafe(
  s,
  'href="javascript:void(0)"',
  'href="#" (click)="$event.preventDefault()" aria-disabled="true" tabindex="-1"',
);

s = replaceAllSafe(
  s,
  'transition-all flex items-center group bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-lg border',
  'transition-all flex items-center justify-center group bg-slate-900/50 hover:bg-slate-900 min-w-11 min-h-11 px-3 py-2 rounded-lg border',
);

s = replaceAllSafe(
  s,
  'class="text-slate-400 hover:text-white transition-colors flex items-center group"',
  'class="text-slate-300 hover:text-white transition-colors flex items-center group min-h-11 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
);
s = replaceAllSafe(
  s,
  'class="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center group"',
  'class="text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center group min-h-11 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
);

s = replaceOnce(
  s,
  'class="text-blue-500 hover:text-blue-400 transition-colors font-medium flex items-center mt-2 bg-blue-500/10 px-3 py-2 rounded border border-blue-500/20 w-fit"',
  'class="text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center min-h-11 mt-2 bg-blue-500/10 px-3 py-2 rounded border border-blue-500/20 w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  'feedback link touch target',
);

s = replaceOnce(
  s,
  'type="email"\n                  [(ngModel)]="email"',
  'type="email"\n                  inputmode="email"\n                  autocomplete="email"\n                  autocapitalize="none"\n                  spellcheck="false"\n                  [(ngModel)]="email"',
  'newsletter email semantics',
);

s = replaceOnce(
  s,
  'class="w-full bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-4 py-3 focus:ring-1 focus:ring-blue-500 outline-none transition-all"',
  'class="w-full min-h-12 bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 text-sm rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"',
  'newsletter email contrast',
);

s = replaceOnce(
  s,
  'class="bg-blue-500 hover:bg-blue-600 text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"',
  'class="min-h-12 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"',
  'newsletter submit accessibility',
);

s = replaceOnce(
  s,
  'class="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start animate-fade-in"',
  'class="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start animate-fade-in" role="status" aria-live="polite"',
  'newsletter status live region',
);

s = replaceOnce(
  s,
  'class="inline-flex items-center justify-center bg-slate-800 hover:bg-white hover:text-slate-900 text-slate-300 font-bold py-3 px-6 rounded-lg transition-all duration-300 w-full border border-slate-700 hover:border-white"',
  'class="inline-flex min-h-12 items-center justify-center bg-slate-800 hover:bg-white hover:text-slate-900 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 w-full border border-slate-700 hover:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  'footer contact button',
);

s = replaceOnce(
  s,
  'class="border-t border-slate-900 py-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600 relative"',
  'class="border-t border-slate-800 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 relative"',
  'footer bottom safe area contrast',
);

s = replaceOnce(
  s,
  'class="ml-2 text-slate-800 hover:text-slate-600 transition-colors"',
  'class="ml-2 inline-flex min-w-11 min-h-11 items-center justify-center text-slate-500 hover:text-white transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  'admin link accessibility',
);

s = replaceOnce(
  s,
  '  subscribe(e: Event) {\n    e.preventDefault();\n    if (this.email) {\n      this.carService.addSubscriber(this.email);\n      this.subscribed.set(true);\n      this.email = "";\n      setTimeout(() => this.subscribed.set(false), 3000);\n    }\n  }',
  '  subscribe(e: Event) {\n    e.preventDefault();\n    const normalizedEmail = this.email.trim().toLocaleLowerCase("tr-TR");\n    const isValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail);\n    if (!isValid) return;\n\n    this.carService.addSubscriber(normalizedEmail);\n    this.subscribed.set(true);\n    this.email = "";\n    setTimeout(() => this.subscribed.set(false), 3000);\n  }',
  'newsletter validation',
);

await writeFile(path, s, 'utf8');
console.log('Footer/newsletter accessibility, semantics and responsive hotfix applied.');
