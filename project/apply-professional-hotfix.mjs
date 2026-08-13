#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/pages/fleet.component.ts';

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) {
    throw new Error(`${label}: expected source text not found`);
  }
  return source.replace(from, to);
}

function replaceAllSafe(source, from, to) {
  if (source.includes(to)) return source;
  return source.replaceAll(from, to);
}

let s = await readFile(path, 'utf8');

s = replaceOnce(
  s,
  'import { Router, ActivatedRoute } from "@angular/router";',
  'import { Router, ActivatedRoute, RouterLink } from "@angular/router";',
  'RouterLink import',
);

s = replaceOnce(
  s,
  'imports: [CommonModule, FormsModule, MatIconModule, VehicleCardComponent],',
  'imports: [CommonModule, FormsModule, MatIconModule, VehicleCardComponent, RouterLink],',
  'RouterLink standalone import',
);

s = replaceOnce(
  s,
  'class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"',
  'class="bg-slate-900 border-b border-slate-800 sticky top-[72px] md:top-[96px] z-40 shadow-lg"',
  'sticky header offset',
);

s = replaceOnce(
  s,
  'class="max-w-7xl mx-auto px-4"',
  'class="max-w-7xl mx-auto px-2 sm:px-4"',
  'header mobile gutters',
);

s = replaceOnce(
  s,
  'class="h-16 flex items-center gap-3"',
  'class="min-h-16 flex items-center gap-2 sm:gap-3 py-2"',
  'mobile toolbar layout',
);

s = replaceOnce(
  s,
  'class="p-2 -ml-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"',
  'class="w-11 h-11 shrink-0 -ml-1 sm:-ml-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  'back button touch target',
);

s = replaceOnce(
  s,
  'class="relative flex-grow"',
  'class="relative flex-grow min-w-0"',
  'search min width',
);

s = replaceOnce(
  s,
  'type="text"\n                [(ngModel)]="searchQuery"',
  'type="search"\n                inputmode="search"\n                autocomplete="off"\n                aria-label="Araçlarda ara"\n                [(ngModel)]="searchQuery"',
  'search semantics',
);

s = replaceOnce(
  s,
  'class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 text-sm text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-800"',
  'class="w-full min-h-11 pl-10 pr-3 py-2.5 rounded-xl border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all bg-slate-800 outline-none"',
  'search touch and focus styling',
);

s = replaceAllSafe(
  s,
  'class="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all',
  'class="w-11 h-11 shrink-0 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
);

s = s.replace(
  '(click)="showFilterModal.set(true)"\n              class="w-11',
  '(click)="showFilterModal.set(true)"\n              aria-haspopup="dialog"\n              [attr.aria-expanded]="showFilterModal()"\n              class="w-11',
);
s = s.replace(
  '(click)="showSortModal.set(true)"\n              class="w-11',
  '(click)="showSortModal.set(true)"\n              aria-haspopup="dialog"\n              [attr.aria-expanded]="showSortModal()"\n              class="w-11',
);

s = replaceAllSafe(
  s,
  'class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"',
  'class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" role="dialog" aria-modal="true"',
);

s = replaceAllSafe(
  s,
  'class="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up"',
  'class="bg-white w-full max-w-lg max-h-[calc(100dvh-72px)] sm:max-h-[min(90dvh,52rem)] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up"',
);

s = replaceAllSafe(
  s,
  'class="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up"',
  'class="bg-white w-full max-w-sm max-h-[calc(100dvh-72px)] sm:max-h-[min(90dvh,40rem)] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up"',
);

s = replaceAllSafe(
  s,
  'max-h-[70vh] overflow-y-auto',
  'max-h-[min(70dvh,44rem)] overflow-y-auto overscroll-contain',
);

s = replaceAllSafe(
  s,
  'class="p-2 hover:bg-slate-100 rounded-full transition-colors"',
  'class="w-11 h-11 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Pencereyi kapat"',
);

s = replaceAllSafe(
  s,
  'class="py-2 px-4 rounded-xl text-sm font-medium transition-all border border-transparent"',
  'class="min-h-11 py-2 px-4 rounded-xl text-sm font-medium transition-all border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
);

s = replaceOnce(
  s,
  '(click)="tempWithDriver.set(!tempWithDriver())"\n                  class="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200"',
  '(click)="tempWithDriver.set(!tempWithDriver())"\n                  [attr.aria-pressed]="tempWithDriver()"\n                  class="w-full min-h-14 flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  'driver toggle accessibility',
);

s = replaceAllSafe(
  s,
  'class="p-6 border-t border-slate-100 flex gap-3"',
  'class="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-slate-100 flex gap-3"',
);

s = replaceAllSafe(
  s,
  'class="flex-1 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"',
  'class="flex-1 min-h-12 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
);

s = replaceAllSafe(
  s,
  'class="flex-[2] py-4 rounded-2xl font-bold text-white bg-slate-900 hover:bg-blue-500 hover:text-slate-900 transition-all shadow-lg shadow-slate-200"',
  'class="flex-[2] min-h-12 py-3 rounded-2xl font-bold text-white bg-slate-900 hover:bg-blue-500 hover:text-slate-900 transition-all shadow-lg shadow-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
);

s = replaceOnce(
  s,
  'class="w-full text-left p-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"',
  'class="w-full min-h-12 text-left p-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  'sort option touch target',
);

s = replaceOnce(
  s,
  'class="text-3xl md:text-4xl font-bold text-slate-900 mb-2"',
  'class="text-3xl md:text-4xl font-bold text-white mb-2"',
  'dark page heading contrast',
);

s = replaceOnce(
  s,
  'class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"',
  'class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0"',
  'responsive fleet grid',
);

s = replaceOnce(
  s,
  'class="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 mt-6"',
  'class="flex flex-col items-center justify-center py-16 sm:py-20 px-5 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 mt-6 mx-4 md:mx-0"',
  'empty state mobile gutter',
);

s = replaceAllSafe(
  s,
  'class="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"',
  'class="min-h-12 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"',
);

s = replaceOnce(
  s,
  'class="ml-4 text-xs underline text-blue-700 hover:text-blue-900"',
  'class="ml-4 min-h-11 px-2 text-xs underline text-blue-700 hover:text-blue-900 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  'driver remove touch target',
);

s = replaceOnce(
  s,
  'const query = this.searchQuery().toLowerCase();',
  'const query = this.searchQuery().trim().toLocaleLowerCase("tr-TR");',
  'search normalization',
);

s = replaceOnce(
  s,
  'window.history.back();',
  'this.location.back();',
  'Angular back navigation',
);

await writeFile(path, s, 'utf8');
console.log('Fleet professional responsive/accessibility hotfix applied.');
