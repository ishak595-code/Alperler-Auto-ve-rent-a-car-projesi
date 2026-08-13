#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/pages/home.component.ts';
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
  'class="relative h-[85vh] min-h-[600px] flex flex-col items-center justify-center overflow-hidden group"',
  'class="relative min-h-[calc(100dvh-72px)] md:h-[85vh] md:min-h-[600px] flex flex-col items-center justify-center overflow-hidden group py-8 md:py-0"',
  'dynamic mobile hero height',
);

s = replaceOnce(
  s,
  'class="font-serif text-[28px] md:text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-xl max-w-4xl mx-auto truncate"',
  'class="font-serif text-[28px] sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-xl max-w-4xl mx-auto text-balance break-words leading-tight"',
  'hero title wrapping',
);

s = replaceOnce(
  s,
  'class="text-sm md:text-lg text-slate-100 mt-2 max-w-2xl mx-auto font-medium drop-shadow-md leading-relaxed text-center opacity-90 truncate"',
  'class="text-sm md:text-lg text-slate-100 mt-2 max-w-2xl mx-auto font-medium drop-shadow-md leading-relaxed text-center opacity-90 text-pretty break-words"',
  'hero subtitle wrapping',
);

s = replaceOnce(
  s,
  'class="relative flex items-center bg-white/95 backdrop-blur-xl rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.15)] p-2 transition-all duration-300 ring-8 ring-white/10 focus-within:ring-white/20 focus-within:bg-white focus-within:shadow-[0_30px_60px_rgba(0,0,0,0.3)] hover:ring-white/20 group"',
  'class="relative flex items-center bg-white/95 backdrop-blur-xl rounded-3xl md:rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.15)] p-2 transition-all duration-300 ring-4 sm:ring-8 ring-white/10 focus-within:ring-white/20 focus-within:bg-white focus-within:shadow-[0_30px_60px_rgba(0,0,0,0.3)] hover:ring-white/20 group"',
  'mobile search container',
);

s = replaceOnce(
  s,
  'type="text"\n                [(ngModel)]="searchQuery"\n                (focus)="isSearchFocused.set(true)"',
  'type="search"\n                inputmode="search"\n                autocomplete="off"\n                aria-label="Araç, model veya tur ara"\n                [(ngModel)]="searchQuery"\n                (focus)="isSearchFocused.set(true)"\n                (keyup.enter)="submitSearch()"',
  'hero search semantics',
);

s = replaceOnce(
  s,
  'class="flex-1 bg-transparent border-none text-slate-800 px-4 py-4 md:py-5 text-[16px] md:text-[20px] font-medium focus:ring-0 outline-none placeholder:text-slate-400 placeholder:font-light w-full cursor-text"',
  'class="flex-1 min-w-0 bg-transparent border-none text-slate-800 px-2 sm:px-4 py-4 md:py-5 text-[16px] md:text-[20px] font-medium focus:ring-0 outline-none placeholder:text-slate-400 placeholder:font-light w-full cursor-text"',
  'search input min width',
);

s = replaceOnce(
  s,
  'class="mr-2 shrink-0 flex items-center justify-center w-10 h-10 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"',
  'class="mr-1 sm:mr-2 shrink-0 flex items-center justify-center w-11 h-11 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  'search clear touch target',
);

s = replaceOnce(
  s,
  '<button \n                class="bg-slate-900 text-white font-bold text-sm md:text-base px-6 md:px-8 h-12 md:h-16 rounded-full hover:bg-slate-800 transition-colors shadow-sm shrink-0"\n              >\n                Bul\n              </button>',
  '<button\n                type="button"\n                (click)="submitSearch()"\n                aria-label="Aramayı çalıştır"\n                class="bg-slate-900 text-white font-bold text-sm md:text-base px-4 sm:px-6 md:px-8 h-12 md:h-16 rounded-2xl md:rounded-full hover:bg-slate-800 transition-colors shadow-sm shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"\n              >\n                Bul\n              </button>',
  'working search button',
);

s = replaceAllSafe(s, 'max-h-[60vh] overflow-y-auto', 'max-h-[min(60dvh,36rem)] overflow-y-auto overscroll-contain');

s = replaceAllSafe(
  s,
  'class="px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center shrink-0 border border-slate-200"',
  'class="min-h-11 px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center shrink-0 border border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
);

s = replaceOnce(
  s,
  'class="flex items-center p-4 md:p-5 hover:bg-blue-50/80 transition-colors cursor-pointer group"',
  'class="flex items-center p-3 sm:p-4 md:p-5 hover:bg-blue-50/80 transition-colors cursor-pointer group min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"',
  'search result mobile layout',
);

s = replaceOnce(
  s,
  'class="ml-4 md:ml-6 flex-1"',
  'class="ml-3 sm:ml-4 md:ml-6 flex-1 min-w-0"',
  'search result text min width',
);

s = replaceOnce(
  s,
  'class="text-slate-900 font-bold text-base md:text-xl group-hover:text-blue-600 transition-colors"',
  'class="text-slate-900 font-bold text-sm sm:text-base md:text-xl group-hover:text-blue-600 transition-colors break-words line-clamp-2"',
  'search result title wrapping',
);

s = replaceOnce(
  s,
  'class="text-blue-600 font-extrabold text-base md:text-lg bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm"',
  'class="text-blue-600 font-extrabold text-xs sm:text-sm md:text-lg bg-blue-50 px-2 sm:px-3 md:px-4 py-2 rounded-xl border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm whitespace-nowrap"',
  'search result price fit',
);

s = replaceAllSafe(
  s,
  'class="p-16 text-center text-slate-500"',
  'class="px-5 py-10 sm:p-16 text-center text-slate-500"',
);

s = replaceOnce(
  s,
  'const query = this.searchQuery().toLowerCase().trim();',
  'const query = this.searchQuery().trim().toLocaleLowerCase("tr-TR");',
  'Turkish-aware search normalization',
);

s = replaceOnce(
  s,
  'windowOrigin = window.location.origin;',
  'windowOrigin = typeof window !== "undefined" ? window.location.origin : "";',
  'SSR-safe window origin',
);

s = replaceOnce(
  s,
  '  closeSearch() {\n    this.isSearchFocused.set(false);\n  }',
  '  submitSearch() {\n    const firstResult = this.searchResults()[0];\n    if (!firstResult?.url) {\n      this.isSearchFocused.set(true);\n      return;\n    }\n\n    this.isSearchFocused.set(false);\n    this.router.navigateByUrl(firstResult.url);\n  }\n\n  closeSearch() {\n    this.isSearchFocused.set(false);\n  }',
  'search submit behavior',
);

await writeFile(path, s, 'utf8');
console.log('Home responsive/search/accessibility hotfix applied.');
