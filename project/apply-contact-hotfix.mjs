#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/pages/contact.component.ts';
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
  '  throw new Error(JSON.stringify(errInfo));',
  '  console.error("Firestore operation failed", { error: errInfo.error, operationType, path });\n  throw new Error(errInfo.error);',
  'Firestore privacy-safe error handling',
);

s = replaceOnce(
  s,
  'class="font-sans min-h-screen bg-slate-950 text-slate-300 pb-20"',
  'class="font-sans min-h-screen bg-slate-950 text-slate-300 pb-20 overflow-x-hidden"',
  'contact horizontal overflow guard',
);

s = replaceOnce(
  s,
  'class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"',
  'class="bg-slate-900 border-b border-slate-800 sticky top-[72px] md:top-[96px] z-40 shadow-lg"',
  'contact sticky header offset',
);

s = replaceOnce(
  s,
  'class="h-16 flex items-center gap-3"',
  'class="min-h-16 flex items-center gap-2 sm:gap-3 py-2"',
  'contact mobile header row',
);

s = replaceOnce(
  s,
  'class="p-2 -ml-2 hover:bg-slate-800 hover:text-white rounded-full transition-colors text-slate-400 shrink-0"',
  'class="w-11 h-11 -ml-2 hover:bg-slate-800 hover:text-white rounded-full transition-colors text-slate-400 shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  'contact back touch target',
);

s = replaceOnce(
  s,
  'class="text-lg font-bold text-white"',
  'class="text-base sm:text-lg font-bold text-white min-w-0 break-words"',
  'contact header title fit',
);

s = replaceAllSafe(s, 'class="p-8"', 'class="p-4 sm:p-8"');

s = replaceOnce(
  s,
  'class="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100"',
  'class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8 pb-8 border-b border-slate-100"',
  'checkout product summary mobile layout',
);

s = replaceOnce(
  s,
  'class="w-32 h-24 object-cover rounded-lg shadow-md"',
  'class="w-full sm:w-32 h-44 sm:h-24 object-cover rounded-xl shadow-md"',
  'checkout product image mobile fit',
);

s = replaceOnce(
  s,
  'class="text-2xl font-bold text-slate-900"',
  'class="text-xl sm:text-2xl font-bold text-slate-900 break-words"',
  'checkout item title wrapping',
);

s = replaceAllSafe(
  s,
  'class="bg-slate-900 text-white p-6 flex justify-between items-center"',
  'class="bg-slate-900 text-white p-4 sm:p-6 flex justify-between items-center gap-3"',
);

s = replaceAllSafe(
  s,
  'class="text-2xl font-bold font-serif"',
  'class="text-xl sm:text-2xl font-bold font-serif leading-tight"',
);

s = replaceAllSafe(
  s,
  'class="text-blue-500 font-bold"',
  'class="text-blue-500 text-xs sm:text-base font-bold shrink-0"',
);

s = replaceAllSafe(
  s,
  'class="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"',
  'class="w-full min-h-12 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"',
);

s = replaceAllSafe(
  s,
  'class="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none resize-none"',
  'class="w-full min-h-28 bg-white border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none resize-y"',
);

s = replaceAllSafe(
  s,
  'class="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8"',
  'class="bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 mb-8"',
);

s = replaceOnce(
  s,
  'class="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between font-bold text-sm hover:border-blue-500 transition-colors"',
  'class="w-full min-h-12 bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex items-center justify-between font-bold text-sm hover:border-blue-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
  'extras dropdown touch target',
);

s = replaceAllSafe(
  s,
  'class="text-red-500 hover:text-red-700"',
  'class="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"',
);

s = replaceOnce(
  s,
  '[disabled]="!startDate || !endDate"',
  '[disabled]="!startDate || (rentalDuration !== \'hourly\' && !endDate) || (rentalDuration === \'hourly\' && selectedHours < 1)"',
  'hourly checkout validation',
);

s = replaceAllSafe(
  s,
  'class="w-full bg-slate-900 text-white py-5 rounded-xl font-bold text-lg uppercase tracking-widest hover:bg-blue-500 hover:text-slate-900 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"',
  'class="w-full min-h-14 bg-slate-900 text-white px-4 py-4 rounded-xl font-bold text-base sm:text-lg uppercase tracking-widest hover:bg-blue-500 hover:text-slate-900 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"',
);

s = replaceAllSafe(
  s,
  'class="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2"',
  'class="absolute z-20 mt-2 w-full max-h-[min(60dvh,24rem)] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2"',
);

await writeFile(path, s, 'utf8');
console.log('Checkout/contact responsive, validation and privacy hotfix applied.');
