#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`${label}: expected source text not found`);
  return source.replace(from, to);
}

// NAVBAR: constrain the logo hit target to its real visual bounds and avoid duplicate screen-reader announcements.
{
  const path = 'src/components/navbar.component.ts';
  let s = await readFile(path, 'utf8');
  s = replaceOnce(
    s,
    'class="flex items-center min-w-0 group rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
    'class="inline-flex flex-none items-center w-auto max-w-[150px] sm:max-w-[210px] md:max-w-[280px] group rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"',
    'navbar logo hit target',
  );
  s = replaceOnce(
    s,
    'alt="Alperler Auto"\n                class="w-[var(--logo-width-mobile)]',
    'alt=""\n                aria-hidden="true"\n                class="w-[var(--logo-width-mobile)]',
    'decorative linked logo image',
  );
  s = replaceOnce(
    s,
    'class="flex flex-col justify-center min-w-0 max-w-[110px] sm:max-w-[180px] md:max-w-[240px]"',
    'class="flex flex-col justify-center min-w-0 max-w-[96px] sm:max-w-[150px] md:max-w-[220px] pointer-events-none"',
    'mobile logo text box',
  );
  s = replaceOnce(
    s,
    'class="font-serif font-bold text-lg md:text-2xl text-white tracking-wider leading-none group-hover:text-blue-500 transition-colors truncate"',
    'class="font-serif font-bold text-[15px] sm:text-base md:text-xl text-white tracking-wide leading-none group-hover:text-blue-500 transition-colors whitespace-nowrap"',
    'mobile logo label fit',
  );
  await writeFile(path, s, 'utf8');
}

// HOME: broken hero fallback, accessible date controls, true one-column mobile vehicle lists, and calmer typography.
{
  const path = 'src/pages/home.component.ts';
  let s = await readFile(path, 'utf8');

  s = replaceOnce(
    s,
    `        <img\n          ngSrc="https://images.unsplash.com/photo-1503376713028-98e6cd35549d?q=80&w=2500&auto=format&fit=crop"\n          fill\n          priority\n          alt="Hero Image"\n          class="object-cover opacity-80"\n        />`,
    `        <img\n          src="https://images.unsplash.com/photo-1503376713028-98e6cd35549d?q=80&w=2500&auto=format&fit=crop"\n          fetchpriority="high"\n          alt=""\n          aria-hidden="true"\n          (error)="hideBrokenImage($event)"\n          class="absolute inset-0 w-full h-full object-cover opacity-80"\n        />`,
    'hero image resilience',
  );

  const oldDates = `          <!-- Dates -->\n          <div class="flex gap-4">\n            <div class="w-1/2">\n              <label\n                for="startDateInput"\n                class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1"\n                >Alış</label\n              >\n              <input\n                id="startDateInput"\n                type="date"\n                [(ngModel)]="pickupDate"\n                name="startDate"\n                aria-label="Alış tarihi"\n                class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-4 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold transition-all shadow-sm"\n              />\n            </div>\n            <div class="w-1/2">\n              <label\n                for="endDateInput"\n                class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1"\n                >İade</label\n              >\n              <input\n                id="endDateInput"\n                type="date"\n                [(ngModel)]="returnDate"\n                name="endDate"\n                aria-label="İade tarihi"\n                class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-4 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold transition-all shadow-sm"\n              />\n            </div>\n          </div>`;

  const newDates = `          <!-- Dates: custom labelled trigger prevents Android TalkBack from exposing an unlabeled native calendar sub-button. -->\n          <div class="grid grid-cols-2 gap-3 sm:gap-4">\n            <div class="min-w-0 relative">\n              <label\n                id="pickupDateLabel"\n                class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1"\n                >Alış</label\n              >\n              <input\n                #pickupDateInput\n                type="date"\n                [(ngModel)]="pickupDate"\n                name="startDate"\n                tabindex="-1"\n                aria-hidden="true"\n                class="absolute w-px h-px opacity-0 pointer-events-none"\n              />\n              <button\n                type="button"\n                aria-labelledby="pickupDateLabel"\n                [attr.aria-label]="'Alış tarihi seç. ' + dateDisplay(pickupDate, 'Tarih seçilmedi')"\n                (click)="openDatePicker(pickupDateInput)"\n                class="w-full min-h-14 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-3 sm:px-4 py-3 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold transition-all shadow-sm flex items-center justify-between gap-2"\n              >\n                <span class="truncate">{{ dateDisplay(pickupDate, 'Tarih seç') }}</span>\n                <mat-icon aria-hidden="true" class="shrink-0 text-slate-500">calendar_month</mat-icon>\n              </button>\n            </div>\n            <div class="min-w-0 relative">\n              <label\n                id="returnDateLabel"\n                class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1"\n                >İade</label\n              >\n              <input\n                #returnDateInput\n                type="date"\n                [(ngModel)]="returnDate"\n                name="endDate"\n                tabindex="-1"\n                aria-hidden="true"\n                class="absolute w-px h-px opacity-0 pointer-events-none"\n              />\n              <button\n                type="button"\n                aria-labelledby="returnDateLabel"\n                [attr.aria-label]="'İade tarihi seç. ' + dateDisplay(returnDate, 'Tarih seçilmedi')"\n                (click)="openDatePicker(returnDateInput)"\n                class="w-full min-h-14 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-3 sm:px-4 py-3 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold transition-all shadow-sm flex items-center justify-between gap-2"\n              >\n                <span class="truncate">{{ dateDisplay(returnDate, 'Tarih seç') }}</span>\n                <mat-icon aria-hidden="true" class="shrink-0 text-slate-500">calendar_month</mat-icon>\n              </button>\n            </div>\n          </div>`;
  s = replaceOnce(s, oldDates, newDates, 'accessible booking dates');

  s = s.replace(
    'class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 max-w-7xl mx-auto mb-16"',
    'class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto mb-12 md:mb-16"',
  );
  s = s.replace(
    'class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 max-w-7xl mx-auto mb-16"',
    'class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto mb-12 md:mb-16"',
  );
  s = s.replaceAll(
    'class="text-4xl md:text-6xl font-serif font-bold text-slate-900 leading-tight"',
    'class="text-3xl sm:text-4xl md:text-6xl font-serif font-bold text-slate-900 leading-tight text-balance"',
  );
  s = s.replaceAll(
    'class="text-slate-500 mt-6 text-xl font-light"',
    'class="text-slate-500 mt-4 sm:mt-6 text-base sm:text-lg md:text-xl font-light leading-relaxed text-pretty"',
  );
  s = s.replace(
    '<section class="py-24 bg-slate-50/50">',
    '<section class="py-16 sm:py-20 md:py-24 bg-slate-50/50">',
  );

  const methodAnchor = `  favorites = signal<number[]>([]);\n\n  scrollToRecommended() {`;
  const methods = `  favorites = signal<number[]>([]);\n\n  hideBrokenImage(event: Event) {\n    const image = event.target as HTMLImageElement;\n    image.style.display = 'none';\n  }\n\n  openDatePicker(input: HTMLInputElement) {\n    const picker = input as HTMLInputElement & { showPicker?: () => void };\n    if (typeof picker.showPicker === 'function') {\n      picker.showPicker();\n    } else {\n      input.focus();\n      input.click();\n    }\n  }\n\n  dateDisplay(value: string, fallback: string): string {\n    if (!value) return fallback;\n    const [year, month, day] = value.split('-');\n    if (!year || !month || !day) return value;\n    return \`${'${day}'}.${'${month}'}.${'${year}'}\`;\n  }\n\n  scrollToRecommended() {`;
  s = replaceOnce(s, methodAnchor, methods, 'homepage accessibility helpers');

  await writeFile(path, s, 'utf8');
}

console.log('Mobile screen-reader, date-picker, hero resilience and one-column vehicle list hotfix applied.');
