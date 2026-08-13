#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const appointmentPath = 'src/pages/appointment.component.ts';
let s = await readFile(appointmentPath, 'utf8');

function once(from, to, label) {
  if (s.includes(to)) return;
  if (!s.includes(from)) throw new Error(`${label}: expected source text not found`);
  s = s.replace(from, to);
}
function all(from, to) {
  if (s.includes(to)) return;
  s = s.replaceAll(from, to);
}

once('import { CommonModule } from "@angular/common";', 'import { CommonModule, Location } from "@angular/common";', 'Location import');
once('class="bg-slate-950 text-slate-300 min-h-screen font-sans pb-20"', 'class="bg-slate-950 text-slate-300 min-h-screen font-sans pb-20 overflow-x-hidden"', 'page overflow');
once('class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"', 'class="bg-slate-900 border-b border-slate-800 sticky top-[72px] md:top-[96px] z-40 shadow-lg"', 'sticky header');
once('class="h-16 flex items-center gap-3"', 'class="min-h-16 flex items-center gap-2 sm:gap-3 py-2"', 'header row');
once('class="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors shrink-0"', 'class="w-11 h-11 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"', 'back touch target');
once('class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12"', 'class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12"', 'mobile top spacing');
once('class="text-4xl font-serif font-bold text-slate-100 mb-4"', 'class="text-3xl sm:text-4xl font-serif font-bold text-slate-100 mb-4 text-balance leading-tight"', 'page heading');
once('class="text-slate-400 text-lg"', 'class="text-slate-400 text-base sm:text-lg text-pretty leading-relaxed"', 'page intro');
all('class="p-8"', 'class="p-4 sm:p-8"');
all('class="p-4 border-2 border-slate-200 rounded-xl text-center hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all flex items-center justify-center gap-2"', 'class="min-h-14 p-4 border-2 border-slate-200 rounded-xl text-center hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all flex items-center justify-center gap-2"');

once('type="text"\n                      formControlName="name"', 'type="text"\n                      autocomplete="name"\n                      aria-label="Ad Soyad"\n                      formControlName="name"', 'name semantics');
once('type="tel"\n                      formControlName="phone"', 'type="tel"\n                      inputmode="tel"\n                      autocomplete="tel"\n                      aria-label="Telefon"\n                      formControlName="phone"', 'phone semantics');
once('type="date"\n                      formControlName="date"', 'type="date"\n                      [min]="minDate"\n                      aria-label="Randevu tarihi"\n                      formControlName="date"', 'date semantics');
once('type="time"\n                      formControlName="time"', 'type="time"\n                      aria-label="Randevu saati"\n                      formControlName="time"', 'time semantics');
once('formControlName="message"\n                    rows="4"', 'formControlName="message"\n                    aria-label="Randevu notu"\n                    rows="4"', 'message semantics');
all('class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"', 'class="w-full min-h-12 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none"');

once('<div class="pt-6">\n                  <button', '<div class="pt-6">\n                  @if (hasFormErrors()) {\n                    <div role="alert" aria-live="assertive" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">\n                      Lütfen ad-soyad, telefon, konu, tarih ve saat alanlarını geçerli biçimde doldurun.\n                    </div>\n                  }\n                  <button', 'error summary');
once('[disabled]="!appointmentForm.valid || isSubmitting()"', '[disabled]="isSubmitting()"', 'validation feedback submit');
once('class="w-full flex justify-center items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-blue-500 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"', 'class="w-full min-h-14 flex justify-center items-center gap-2 px-5 sm:px-8 py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-blue-500 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"', 'submit button');
once('class="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-500 hover:text-slate-900 transition-colors"', 'class="mt-8 min-h-12 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-500 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"', 'success return button');

once('  private router = inject(Router);', '  private router = inject(Router);\n  private location = inject(Location);', 'Location injection');
once('  isSubmitting = signal(false);\n  submitSuccess = signal(false);', '  isSubmitting = signal(false);\n  submitSuccess = signal(false);\n  hasFormErrors = signal(false);\n  minDate = new Date().toISOString().slice(0, 10);', 'appointment state');
once('    name: ["", Validators.required],\n    phone: ["", Validators.required],', '    name: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],\n    phone: ["", [Validators.required, Validators.pattern(/^[+0-9()\\s-]{7,24}$/)]],', 'contact validation');
once('    message: [""],', '    message: ["", Validators.maxLength(1000)],', 'message validation');
once('      window.history.back();', '      this.location.back();', 'Angular back navigation');

once(`  onSubmit() {
    if (this.appointmentForm.valid) {
      this.isSubmitting.set(true);`, `  async onSubmit() {
    this.hasFormErrors.set(!this.appointmentForm.valid);
    if (this.appointmentForm.valid) {
      this.isSubmitting.set(true);`, 'async appointment submit');
once('        type: "TOUR" as any, // Mismatch workaround while type doesn\'t have APPOINTMENT', '        type: "APPOINTMENT" as const,', 'appointment type');
once(`      // Simulate API call
      setTimeout(() => {
        this.carService.addReservation(newRequest);
        this.isSubmitting.set(false);
        this.submitSuccess.set(true);
        this.toastService.show(
          "Randevu talebiniz başarıyla gönderildi.",
          "success",
        );
      }, 1500);`, `      try {
        await this.carService.addReservation(newRequest);
        this.hasFormErrors.set(false);
        this.submitSuccess.set(true);
        this.toastService.show(
          "Randevu talebiniz başarıyla gönderildi.",
          "success",
        );
      } catch (error) {
        console.error("Appointment submission failed", error);
        this.toastService.show(
          "Randevu talebi gönderilemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin.",
          "error",
        );
      } finally {
        this.isSubmitting.set(false);
      }`, 'real async submission');

await writeFile(appointmentPath, s, 'utf8');

const servicePath = 'src/services/car.service.ts';
let service = await readFile(servicePath, 'utf8');
if (!service.includes('type: "RENTAL" | "TOUR" | "SALE_INQUIRY" | "APPOINTMENT";')) {
  if (!service.includes('type: "RENTAL" | "TOUR" | "SALE_INQUIRY";')) throw new Error('BookingRequest type union not found');
  service = service.replace('type: "RENTAL" | "TOUR" | "SALE_INQUIRY";', 'type: "RENTAL" | "TOUR" | "SALE_INQUIRY" | "APPOINTMENT";');
}
if (!service.includes('type: newRes.type,\n        carId:')) {
  if (!service.includes('carId: req.item?.id ? String(req.item.id) : "unknown",')) throw new Error('booking Firestore payload not found');
  service = service.replace('carId: req.item?.id ? String(req.item.id) : "unknown",', 'type: newRes.type,\n        carId: req.item?.id ? String(req.item.id) : "unknown",');
}
await writeFile(servicePath, service, 'utf8');
console.log('Appointment flow, mobile accessibility and real persistence hotfix applied.');
