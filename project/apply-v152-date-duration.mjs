import fs from 'node:fs';

const DATE_COMPONENT_BASE64 = 'aW1wb3J0IHsgQ29tcG9uZW50LCBFbGVtZW50UmVmLCBFdmVudEVtaXR0ZXIsIElucHV0LCBPdXRwdXQsIFZpZXdDaGlsZCB9IGZyb20gIkBhbmd1bGFyL2NvcmUiOwppbXBvcnQgeyBNYXRJY29uTW9kdWxlIH0gZnJvbSAiQGFuZ3VsYXIvbWF0ZXJpYWwvaWNvbiI7CgpsZXQgbmV4dERhdGVDb250cm9sSWQgPSAwOwoKQENvbXBvbmVudCh7CiAgc2VsZWN0b3I6ICJhcHAtYWNjZXNzaWJsZS1uYXRpdmUtZGF0ZSIsCiAgc3RhbmRhbG9uZTogdHJ1ZSwKICBpbXBvcnRzOiBbTWF0SWNvbk1vZHVsZV0sCiAgdGVtcGxhdGU6IGAKICAgIDxkaXYgY2xhc3M9ImRhdGUtY29udHJvbCI+CiAgICAgIDxzcGFuIGNsYXNzPSJkYXRlLWxhYmVsIiBbaWRdPSJsYWJlbElkIj57eyBsYWJlbCB9fTwvc3Bhbj4KICAgICAgPGJ1dHRvbgogICAgICAgIHR5cGU9ImJ1dHRvbiIKICAgICAgICBjbGFzcz0iZGF0ZS1idXR0b24iCiAgICAgICAgW2Rpc2FibGVkXT0iZGlzYWJsZWQiCiAgICAgICAgW2F0dHIuYXJpYS1sYWJlbGxlZGJ5XT0ibGFiZWxJZCIKICAgICAgICBbYXR0ci5hcmlhLWRlc2NyaWJlZGJ5XT0idmFsdWUgPyB2YWx1ZUlkIDogbnVsbCIKICAgICAgICBbYXR0ci5hcmlhLWxhYmVsXT0iYnV0dG9uQWNjZXNzaWJsZU5hbWUoKSIKICAgICAgICAoY2xpY2spPSJvcGVuUGlja2VyKCkiCiAgICAgID4KICAgICAgICA8c3BhbiBjbGFzcz0iYnV0dG9uLWNvcHkiPgogICAgICAgICAgPHN0cm9uZz5UYXJpaGkgc2XDpzwvc3Ryb25nPgogICAgICAgICAgPHNtYWxsIFtpZF09InZhbHVlSWQiPnt7IHZhbHVlID8gZm9ybWF0dGVkVmFsdWUoKSA6ICdUYWt2aW1kZW4gc2XDp2luJyB9fTwvc21hbGw+CiAgICAgICAgPC9zcGFuPgogICAgICAgIDxtYXQtaWNvbiBhcmlhLWhpZGRlbj0idHJ1ZSI+Y2FsZW5kYXJfbW9udGg8L21hdC1pY29uPgogICAgICA8L2J1dHRvbj4KCiAgICAgIDxpbnB1dAogICAgICAgICNwaWNrZXIKICAgICAgICBjbGFzcz0ibmF0aXZlLWRhdGUtcHJveHkiCiAgICAgICAgdHlwZT0iZGF0ZSIKICAgICAgICBbdmFsdWVdPSJ2YWx1ZSIKICAgICAgICBbbWluXT0ibWluIgogICAgICAgIFttYXhdPSJtYXgiCiAgICAgICAgW2Rpc2FibGVkXT0iZGlzYWJsZWQiCiAgICAgICAgYXJpYS1oaWRkZW49InRydWUiCiAgICAgICAgdGFiaW5kZXg9Ii0xIgogICAgICAgIChjaGFuZ2UpPSJlbWl0SW5wdXQoJGV2ZW50KSIKICAgICAgLz4KICAgIDwvZGl2PgogIGAsCiAgc3R5bGVzOiBbYAogICAgOmhvc3R7ZGlzcGxheTpibG9jazttaW4td2lkdGg6MH0uZGF0ZS1jb250cm9se3Bvc2l0aW9uOnJlbGF0aXZlO2Rpc3BsYXk6YmxvY2s7bWluLXdpZHRoOjB9LmRhdGUtbGFiZWx7ZGlzcGxheTpibG9jazttYXJnaW4tYm90dG9tOi4zOHJlbTtjb2xvcjp2YXIoLS1kYXRlLWxhYmVsLCNiOWMzZDIpO2ZvbnQtc2l6ZTouNjZyZW07Zm9udC13ZWlnaHQ6OTAwO2xldHRlci1zcGFjaW5nOi4wNmVtO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZX0uZGF0ZS1idXR0b257ZGlzcGxheTpmbGV4O3dpZHRoOjEwMCU7bWluLWhlaWdodDo1MnB4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtnYXA6LjdyZW07Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1kYXRlLWJvcmRlcixyZ2JhKDE0OCwxNjMsMTg0LC4yNCkpO2JvcmRlci1yYWRpdXM6MTJweDtiYWNrZ3JvdW5kOnZhcigtLWRhdGUtYmcsIzA1MGMxYSk7cGFkZGluZzouNThyZW0gLjc4cmVtIC41OHJlbSAuOXJlbTtjb2xvcjp2YXIoLS1kYXRlLWNvbG9yLCNmZmYpO3RleHQtYWxpZ246bGVmdDtvdXRsaW5lOm5vbmU7dG91Y2gtYWN0aW9uOm1hbmlwdWxhdGlvbn0uZGF0ZS1idXR0b246Zm9jdXMtdmlzaWJsZXtvdXRsaW5lOjNweCBzb2xpZCAjNjBhNWZhO291dGxpbmUtb2Zmc2V0OjJweH0uZGF0ZS1idXR0b246ZGlzYWJsZWR7b3BhY2l0eTouNTV9LmJ1dHRvbi1jb3B5e2Rpc3BsYXk6YmxvY2s7bWluLXdpZHRoOjB9LmJ1dHRvbi1jb3B5IHN0cm9uZywuYnV0dG9uLWNvcHkgc21hbGx7ZGlzcGxheTpibG9ja30uYnV0dG9uLWNvcHkgc3Ryb25ne2ZvbnQ6OTAwIC44cmVtLzEuMiB1aS1zYW5zLXNlcmlmLHN5c3RlbS11aSxzYW5zLXNlcmlmfS5idXR0b24tY29weSBzbWFsbHttYXJnaW4tdG9wOi4xOHJlbTtjb2xvcjp2YXIoLS1kYXRlLWhpbnQsIzhmOWRiMCk7Zm9udDo3MDAgLjY2cmVtLzEuMjUgdWktc2Fucy1zZXJpZixzeXN0ZW0tdWksc2Fucy1zZXJpZn0uZGF0ZS1idXR0b24gbWF0LWljb257ZmxleDowIDAgYXV0bztjb2xvcjojOTNjNWZkfS5uYXRpdmUtZGF0ZS1wcm94eXtwb3NpdGlvbjphYnNvbHV0ZSFpbXBvcnRhbnQ7bGVmdDowO2JvdHRvbTowO3dpZHRoOjFweCFpbXBvcnRhbnQ7aGVpZ2h0OjFweCFpbXBvcnRhbnQ7bWluLWhlaWdodDowIWltcG9ydGFudDtvcGFjaXR5Oi4wMTtwb2ludGVyLWV2ZW50czpub25lO2JvcmRlcjowIWltcG9ydGFudDtwYWRkaW5nOjAhaW1wb3J0YW50O2NsaXAtcGF0aDppbnNldCg1MCUpO292ZXJmbG93OmhpZGRlbn1AbWVkaWEocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjpyZWR1Y2Upey5kYXRlLWJ1dHRvbnt0cmFuc2l0aW9uOm5vbmUhaW1wb3J0YW50fX0KICBgXSwKfSkKZXhwb3J0IGNsYXNzIEFjY2Vzc2libGVOYXRpdmVEYXRlQ29tcG9uZW50IHsKICBASW5wdXQoeyByZXF1aXJlZDogdHJ1ZSB9KSBsYWJlbCA9ICJUYXJpaCI7CiAgQElucHV0KCkgdmFsdWUgPSAiIjsKICBASW5wdXQoKSBtaW4gPSAiIjsKICBASW5wdXQoKSBtYXggPSAiIjsKICBASW5wdXQoKSBkaXNhYmxlZCA9IGZhbHNlOwogIEBPdXRwdXQoKSByZWFkb25seSB2YWx1ZUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8c3RyaW5nPigpOwogIEBWaWV3Q2hpbGQoInBpY2tlciIpIHByaXZhdGUgcGlja2VyPzogRWxlbWVudFJlZjxIVE1MSW5wdXRFbGVtZW50PjsKCiAgcmVhZG9ubHkgY29udHJvbElkID0gKytuZXh0RGF0ZUNvbnRyb2xJZDsKICByZWFkb25seSBsYWJlbElkID0gYGFjY2Vzc2libGUtZGF0ZS1sYWJlbC0ke3RoaXMuY29udHJvbElkfWA7CiAgcmVhZG9ubHkgdmFsdWVJZCA9IGBhY2Nlc3NpYmxlLWRhdGUtdmFsdWUtJHt0aGlzLmNvbnRyb2xJZH1gOwoKICBvcGVuUGlja2VyKCk6IHZvaWQgewogICAgaWYgKHRoaXMuZGlzYWJsZWQpIHJldHVybjsKICAgIGNvbnN0IGlucHV0ID0gdGhpcy5waWNrZXI/Lm5hdGl2ZUVsZW1lbnQ7CiAgICBpZiAoIWlucHV0KSByZXR1cm47CgogICAgdHJ5IHsKICAgICAgaWYgKHR5cGVvZiBpbnB1dC5zaG93UGlja2VyID09PSAiZnVuY3Rpb24iKSB7CiAgICAgICAgaW5wdXQuc2hvd1BpY2tlcigpOwogICAgICAgIHJldHVybjsKICAgICAgfQogICAgfSBjYXRjaCB7CiAgICAgIC8vIFNvbWUgZW1iZWRkZWQgYnJvd3NlcnMgYmxvY2sgc2hvd1BpY2tlciBldmVuIGR1cmluZyBhIHVzZXIgZ2VzdHVyZS4KICAgIH0KCiAgICB0cnkgewogICAgICBpbnB1dC5mb2N1cyh7IHByZXZlbnRTY3JvbGw6IHRydWUgfSk7CiAgICAgIGlucHV0LmNsaWNrKCk7CiAgICB9IGNhdGNoIHsKICAgICAgLy8gSWYgYSBsZWdhY3kgYnJvd3NlciBjYW5ub3Qgb3BlbiBhIG5hdGl2ZSBwaWNrZXIsIHRoZSBjb250cm9sIHJlbWFpbnMgc3RhYmxlLgogICAgfQogIH0KCiAgZW1pdElucHV0KGV2ZW50OiBFdmVudCk6IHZvaWQgewogICAgY29uc3QgbmV4dCA9IChldmVudC50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7CiAgICBpZiAobmV4dCAhPT0gdGhpcy52YWx1ZSkgdGhpcy52YWx1ZUNoYW5nZS5lbWl0KG5leHQpOwogIH0KCiAgZm9ybWF0dGVkVmFsdWUoKTogc3RyaW5nIHsKICAgIGNvbnN0IG1hdGNoID0gL14oXGR7NH0pLShcZHsyfSktKFxkezJ9KSQvLmV4ZWModGhpcy52YWx1ZSB8fCAiIik7CiAgICBpZiAoIW1hdGNoKSByZXR1cm4gdGhpcy52YWx1ZTsKICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShOdW1iZXIobWF0Y2hbMV0pLCBOdW1iZXIobWF0Y2hbMl0pIC0gMSwgTnVtYmVyKG1hdGNoWzNdKSk7CiAgICByZXR1cm4gTnVtYmVyLmlzTmFOKGRhdGUuZ2V0VGltZSgpKQogICAgICA/IHRoaXMudmFsdWUKICAgICAgOiBuZXcgSW50bC5EYXRlVGltZUZvcm1hdCgidHItVFIiLCB7IGRheTogIjItZGlnaXQiLCBtb250aDogImxvbmciLCB5ZWFyOiAibnVtZXJpYyIgfSkuZm9ybWF0KGRhdGUpOwogIH0KCiAgYnV0dG9uQWNjZXNzaWJsZU5hbWUoKTogc3RyaW5nIHsKICAgIGNvbnN0IHNlbGVjdGVkID0gdGhpcy52YWx1ZSA/IGAsIHNlw6dpbGkgdGFyaWggJHt0aGlzLmZvcm1hdHRlZFZhbHVlKCl9YCA6ICIiOwogICAgcmV0dXJuIGAke3RoaXMubm9ybWFsaXplZExhYmVsKCl9IGnDp2luIHRhcmloaSBzZcOnJHtzZWxlY3RlZH1gOwogIH0KCiAgcHJpdmF0ZSBub3JtYWxpemVkTGFiZWwoKTogc3RyaW5nIHsKICAgIGNvbnN0IHJhdyA9IHRoaXMubGFiZWwudHJpbSgpOwogICAgcmV0dXJuIHJhdyB8fCAiVGFyaWgiOwogIH0KfQo=';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOne(path, before, after) {
  const source = read(path);
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing replacement target in ${path}: ${before.slice(0, 100)}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Replacement target is not unique in ${path}`);
  write(path, source.replace(before, after));
}
function replaceRegex(path, pattern, after) {
  const source = read(path);
  if (!pattern.test(source)) throw new Error(`Missing regex replacement target in ${path}`);
  pattern.lastIndex = 0;
  write(path, source.replace(pattern, after));
}

write('src/components/accessible-native-date.component.ts', Buffer.from(DATE_COMPONENT_BASE64, 'base64').toString('utf8'));

replaceOne(
  'src/models/booking.model.ts',
  'export type RentalDuration = "hourly" | "daily" | "monthly" | "longterm";',
  'export type RentalDuration = "hourly" | "daily" | "weekly" | "monthly" | "longterm";'
);

replaceOne(
  'src/pages/home-v71.component.ts',
  '<option value="hourly">Saatlik</option><option value="daily">Günlük</option><option value="monthly">Aylık</option><option value="longterm">Uzun Dönem</option>',
  '<option value="hourly">Saatlik</option><option value="daily">Günlük</option><option value="weekly">Haftalık</option><option value="monthly">Aylık</option><option value="longterm">Uzun Süre</option>'
);

replaceOne(
  'src/pages/rental-results.component.ts',
  '<option value="hourly">Saatlik</option><option value="daily">Günlük</option><option value="monthly">Aylık</option><option value="longterm">Uzun dönem</option>',
  '<option value="hourly">Saatlik</option><option value="daily">Günlük</option><option value="weekly">Haftalık</option><option value="monthly">Aylık</option><option value="longterm">Uzun süre</option>'
);
replaceOne(
  'src/pages/rental-results.component.ts',
  'Saatlik veya günlük kiralama süresini seçin, ardından araçları fiyat ve gerçek zaman aralığına göre daraltın.',
  'Saatlik, günlük, haftalık, aylık veya uzun süreli kiralama seçin, ardından araçları fiyat ve gerçek zaman aralığına göre daraltın.'
);
replaceOne(
  'src/pages/rental-results.component.ts',
  'durationLabel():string{return this.rentalDuration()==="hourly"?"Saatlik":this.rentalDuration()==="monthly"?"Aylık":this.rentalDuration()==="longterm"?"Uzun dönem":"Günlük";}',
  'durationLabel():string{return this.rentalDuration()==="hourly"?"Saatlik":this.rentalDuration()==="weekly"?"Haftalık":this.rentalDuration()==="monthly"?"Aylık":this.rentalDuration()==="longterm"?"Uzun süre":"Günlük";}'
);
replaceOne(
  'src/pages/rental-results.component.ts',
  'private asDuration(value:string|null):RentalDuration{return value==="hourly"||value==="monthly"||value==="longterm"?value:"daily";}',
  'private asDuration(value:string|null):RentalDuration{return value==="hourly"||value==="weekly"||value==="monthly"||value==="longterm"?value:"daily";}'
);

replaceOne(
  'src/pages/booking-checkout.component.ts',
  'Saatlik, günlük veya uzun süreli kiralamayı seçin. Saatlik kiralamada aynı araç, çakışmayan saat aralıklarında farklı müşterilere ayrılabilir.',
  'Saatlik, günlük, haftalık, aylık veya uzun süreli kiralamayı seçin. Saatlik kiralamada aynı araç, çakışmayan saat aralıklarında farklı müşterilere ayrılabilir.'
);
replaceOne(
  'src/pages/booking-checkout.component.ts',
  '<option value="hourly" [disabled]="!hourlyRentalAvailable()">Saatlik</option><option value="daily">Günlük</option><option value="monthly">Aylık</option><option value="longterm">Uzun Dönem</option>',
  '<option value="hourly" [disabled]="!hourlyRentalAvailable()">Saatlik</option><option value="daily">Günlük</option><option value="weekly">Haftalık</option><option value="monthly">Aylık</option><option value="longterm">Uzun Süre</option>'
);
replaceOne(
  'src/pages/booking-checkout.component.ts',
  'private asRentalDuration(value:unknown):RentalDuration{return value==="hourly"||value==="monthly"||value==="longterm"?value:"daily";}',
  'private asRentalDuration(value:unknown):RentalDuration{return value==="hourly"||value==="weekly"||value==="monthly"||value==="longterm"?value:"daily";}'
);
replaceOne(
  'src/pages/booking-checkout.component.ts',
  '`Kiralama türü: ${this.rentalDuration==="hourly"?"Saatlik":this.rentalDuration}`',
  '`Kiralama türü: ${this.rentalDuration==="hourly"?"Saatlik":this.rentalDuration==="weekly"?"Haftalık":this.rentalDuration==="monthly"?"Aylık":this.rentalDuration==="longterm"?"Uzun süre":"Günlük"}`'
);

replaceOne(
  'src/pages/car-detail.component.ts',
  'durationLabel():string{return this.presetDuration==="hourly"?"Saatlik":this.presetDuration==="monthly"?"Aylık":this.presetDuration==="longterm"?"Uzun dönem":"Günlük";}',
  'durationLabel():string{return this.presetDuration==="hourly"?"Saatlik":this.presetDuration==="weekly"?"Haftalık":this.presetDuration==="monthly"?"Aylık":this.presetDuration==="longterm"?"Uzun süre":"Günlük";}'
);
replaceOne(
  'src/pages/car-detail.component.ts',
  'private parseDuration(value:string|null):RentalDuration{return value==="hourly"||value==="monthly"||value==="longterm"?value:"daily";}',
  'private parseDuration(value:string|null):RentalDuration{return value==="hourly"||value==="weekly"||value==="monthly"||value==="longterm"?value:"daily";}'
);

replaceOne(
  'src/services/booking.service.ts',
  'if (rentalDuration && !["hourly","daily","monthly","longterm"].includes(rentalDuration)) throw new Error("Kiralama türü geçerli değil.");',
  'if (rentalDuration && !["hourly","daily","weekly","monthly","longterm"].includes(rentalDuration)) throw new Error("Kiralama türü geçerli değil.");'
);

replaceOne(
  'supabase/functions/booking-gateway/index.ts',
  'type RentalDuration = "hourly" | "daily" | "monthly" | "longterm";',
  'type RentalDuration = "hourly" | "daily" | "weekly" | "monthly" | "longterm";'
);
replaceOne(
  'supabase/functions/booking-gateway/index.ts',
  'return normalized === "hourly" || normalized === "monthly" || normalized === "longterm"\n    ? normalized\n    : "daily";',
  'return normalized === "hourly" || normalized === "weekly" || normalized === "monthly" || normalized === "longterm"\n    ? normalized\n    : "daily";'
);

replaceRegex(
  '.github/workflows/customer-ops-v150-gate.yml',
  /          # Android\/TalkBack date selection must not regress[\s\S]*?          grep -Fq \"Saati seç\" src\/services\/accessibility-runtime\.service\.ts/,
  `          # Date selection uses one stable visible button that opens the native calendar.\n          grep -Fq 'type="date"' src/components/accessible-native-date.component.ts\n          grep -Fq 'class="date-button"' src/components/accessible-native-date.component.ts\n          grep -Fq '>Tarihi seç<' src/components/accessible-native-date.component.ts\n          grep -Fq 'aria-hidden="true"' src/components/accessible-native-date.component.ts\n          grep -Fq 'tabindex="-1"' src/components/accessible-native-date.component.ts\n          grep -Fq 'showPicker' src/components/accessible-native-date.component.ts\n          ! grep -Fq 'calendar-picker-indicator' src/components/accessible-native-date.component.ts\n          grep -Fq \"Saati seç\" src/services/accessibility-runtime.service.ts`
);

// The helper exists only to produce the source commit. Remove both helper files
// so the pull request contains only product and regression-guard changes.
fs.rmSync('project/apply-v152-date-duration.mjs', { force: true });
fs.rmSync('.github/workflows/v152-apply.yml', { force: true });

console.log('V152 date picker and duration patch applied.');
