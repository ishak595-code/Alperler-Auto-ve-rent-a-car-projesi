#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/pages/car-detail.component.ts';
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
  'class="min-h-screen bg-white pb-24 lg:pb-0 font-sans text-[#212121]"',
  'class="min-h-screen bg-white pb-28 lg:pb-0 font-sans text-[#212121] overflow-x-hidden"',
  'detail page bottom spacing',
);

s = replaceOnce(
  s,
  'class="sticky top-0 left-0 right-0 z-[60] bg-[#005c8d] text-white flex items-center justify-between px-4 h-14 shadow-md pointer-events-auto"',
  'class="sticky top-[72px] md:top-[96px] left-0 right-0 z-40 bg-[#005c8d] text-white flex items-center justify-between px-2 sm:px-4 min-h-14 shadow-md pointer-events-auto"',
  'detail sticky header offset',
);

s = replaceOnce(
  s,
  'class="flex items-center gap-3"',
  'class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1"',
  'detail header left group',
);

s = replaceOnce(
  s,
  'class="p-1 hover:bg-white/10 rounded-full transition-colors"',
  'class="w-11 h-11 shrink-0 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"',
  'detail back touch target',
);

s = replaceOnce(
  s,
  'class="text-lg font-bold tracking-tight line-clamp-1"',
  'class="text-sm sm:text-lg font-bold tracking-tight line-clamp-1 min-w-0"',
  'detail header title fit',
);

s = replaceOnce(
  s,
  'class="flex items-center gap-1 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white shadow-[0_2px_10px_rgba(0,0,0,0.3)]"',
  'class="hidden md:flex items-center gap-1 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white shadow-[0_2px_10px_rgba(0,0,0,0.3)]"',
  'viewer pill mobile fit',
);

s = replaceAllSafe(
  s,
  'class="p-2 rounded-full bg-black/20 backdrop-blur-sm text-white shadow-[0_2px_10px_rgba(0,0,0,0.3)]"',
  'class="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-sm text-white shadow-[0_2px_10px_rgba(0,0,0,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"',
);

s = replaceOnce(
  s,
  '<swiper-slide\n                class="w-full h-full cursor-zoom-in"\n                (click)="openLightbox($index)"\n              >',
  '<swiper-slide\n                class="w-full h-full cursor-zoom-in focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500"\n                role="button"\n                tabindex="0"\n                [attr.aria-label]="(car()?.brand || \'Araç\') + \' \' + (car()?.model || \'\') + \' görselini büyüt\'"\n                (click)="openLightbox($index)"\n                (keydown.enter)="openLightbox($index)"\n                (keydown.space)="$event.preventDefault(); openLightbox($index)"\n              >',
  'gallery keyboard access',
);

s = replaceOnce(
  s,
  '>\n              KİRALIK\n            </span>',
  '>\n              {{ car()?.category === "SALE" ? "SATILIK" : "KİRALIK" }}\n            </span>',
  'dynamic vehicle badge',
);

s = replaceOnce(
  s,
  '>\n                  GÜNLÜK\n                </div>',
  '>\n                  {{ car()?.category === "SALE" ? "SATIŞ FİYATI" : "GÜNLÜK" }}\n                </div>',
  'dynamic price label',
);

s = replaceOnce(
  s,
  'class="flex justify-between items-end border-b border-slate-100 pb-4"',
  'class="flex justify-between items-end gap-4 border-b border-slate-100 pb-4"',
  'detail heading spacing',
);

s = replaceOnce(
  s,
  'class="text-xl font-bold text-[#212121]"',
  'class="text-xl font-bold text-[#212121] min-w-0 break-words"',
  'detail heading wrapping',
);

s = replaceOnce(
  s,
  'class="text-right"',
  'class="text-right shrink-0"',
  'detail price shrink',
);

s = replaceOnce(
  s,
  '<!-- 4. Kiralama Hesaplayıcı -->\n          <section class="bg-slate-50 rounded-2xl p-6 space-y-4">',
  '<!-- 4. Kiralama Hesaplayıcı -->\n          @if (car()?.category === "RENTAL") {\n          <section class="bg-slate-50 rounded-2xl p-4 sm:p-6 space-y-4">',
  'rental calculator rental-only',
);

s = replaceOnce(
  s,
  '          </section>\n\n          <!-- 5. Özellikler & Açıklama -->',
  '          </section>\n          }\n\n          <!-- 5. Özellikler & Açıklama -->',
  'close rental-only calculator',
);

s = replaceOnce(
  s,
  'class="grid grid-cols-2 gap-4"',
  'class="grid grid-cols-1 sm:grid-cols-2 gap-4"',
  'calculator mobile columns',
);

s = replaceAllSafe(
  s,
  'class="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"',
  'class="w-full min-h-12 bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"',
);

s = replaceOnce(
  s,
  'class="fixed bottom-0 left-0 right-0 z-[70] bg-white/95 backdrop-blur-xl border-t border-slate-100 p-3 lg:px-8 flex items-center gap-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] pb-safe"',
  'class="fixed bottom-0 left-0 right-0 z-[70] bg-white/95 backdrop-blur-xl border-t border-slate-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-8 flex items-stretch gap-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]"',
  'detail bottom safe area',
);

s = replaceAllSafe(
  s,
  'class="flex-1 bg-red-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-red-600/20"',
  'class="flex-1 min-w-0 min-h-12 bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1 sm:gap-2 active:scale-95 transition-all shadow-lg shadow-red-600/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"',
);

s = replaceAllSafe(
  s,
  'class="flex-1 bg-green-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-600/20"',
  'class="flex-1 min-w-0 min-h-12 bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1 sm:gap-2 active:scale-95 transition-all shadow-lg shadow-green-600/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"',
);

s = replaceOnce(
  s,
  '<button\n            (click)="rentCar(car())"\n            class="flex-1 bg-[#212121] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-black/20"\n          >',
  '<button\n            (click)="rentCar(car())"\n            [disabled]="car()?.isAvailable === false"\n            [attr.aria-label]="car()?.category === \'SALE\' ? \'Araç hakkında bilgi al\' : \'Aracı rezerve et\'"\n            class="flex-1 min-w-0 min-h-12 bg-[#212121] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1 sm:gap-2 active:scale-95 transition-all shadow-lg shadow-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700"\n          >',
  'detail primary CTA availability',
);

s = replaceOnce(
  s,
  '<span class="text-xs uppercase tracking-wider">Rezerve Et</span>',
  '<span class="text-[10px] sm:text-xs uppercase tracking-wider">{{ car()?.category === "SALE" ? "Bilgi Al" : "Rezerve Et" }}</span>',
  'detail primary CTA label',
);

s = replaceAllSafe(
  s,
  '<span class="text-xs uppercase tracking-wider">',
  '<span class="text-[10px] sm:text-xs uppercase tracking-wider">',
);

s = replaceOnce(
  s,
  '  rentCar(car: Car | null) {\n    if (!car) return;\n\n    this.carService.setBookingRequest({\n      type: "RENTAL",',
  '  rentCar(car: Car | null) {\n    if (!car || car.isAvailable === false) return;\n\n    const isSale = car.category === "SALE";\n    this.carService.setBookingRequest({\n      type: isSale ? ("SALE_INQUIRY" as const) : ("RENTAL" as const),',
  'detail booking type',
);

s = replaceOnce(
  s,
  '      startDate: this.startDate(),\n      endDate: this.endDate(),\n      rentalDuration: "daily",\n      withDriver: car.driverOption === "WITH_DRIVER" || this.wantsDriver(),',
  '      startDate: isSale ? undefined : this.startDate(),\n      endDate: isSale ? undefined : this.endDate(),\n      rentalDuration: isSale ? undefined : "daily",\n      withDriver: !isSale && (car.driverOption === "WITH_DRIVER" || this.wantsDriver()),',
  'detail sale/rental request fields',
);

await writeFile(path, s, 'utf8');
console.log('Vehicle detail responsive/business-logic/accessibility hotfix applied.');
