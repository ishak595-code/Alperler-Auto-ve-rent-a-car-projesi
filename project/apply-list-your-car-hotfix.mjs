#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

const path = 'src/pages/list-your-car.component.ts';
let s = await readFile(path, 'utf8');

function once(from, to, label) {
  if (s.includes(to)) return;
  if (!s.includes(from)) throw new Error(`${label}: expected source text not found`);
  s = s.replace(from, to);
}
function all(from, to) {
  if (s.includes(to)) return;
  s = s.replaceAll(from, to);
}

once('class="min-h-screen bg-slate-950 text-slate-300 font-sans pb-20"', 'class="min-h-screen bg-slate-950 text-slate-300 font-sans pb-20 overflow-x-hidden"', 'page overflow');
once('class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"', 'class="bg-slate-900 border-b border-slate-800 sticky top-[72px] md:top-[96px] z-40 shadow-lg"', 'sticky header');
once('class="h-16 flex items-center gap-3"', 'class="min-h-16 flex items-center gap-2 sm:gap-3 py-2"', 'header row');
once('class="p-2 -ml-2 hover:bg-slate-800 hover:text-white rounded-full transition-colors text-slate-400 shrink-0"', 'class="w-11 h-11 -ml-2 hover:bg-slate-800 hover:text-white rounded-full transition-colors text-slate-400 shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"', 'back button');
once('class="bg-slate-900 text-white py-16 mb-12"', 'class="bg-slate-900 text-white py-10 sm:py-16 mb-8 sm:mb-12"', 'hero spacing');
once('class="text-4xl md:text-5xl font-bold mb-6"', 'class="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-balance leading-tight"', 'hero title');
once('class="text-xl text-slate-300 max-w-3xl mx-auto mb-8"', 'class="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-8 text-pretty leading-relaxed"', 'hero copy');
once('class="flex justify-center gap-8 text-slate-300"', 'class="grid grid-cols-1 min-[360px]:grid-cols-3 justify-center gap-5 sm:gap-8 text-slate-300 text-sm sm:text-base"', 'trust grid');
all('class="p-8"', 'class="p-4 sm:p-8"');
once('class="flex gap-4"', 'class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"', 'intent grid');
all('class="p-4 border-2 border-slate-200 rounded-xl text-center hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all"', 'class="min-h-28 p-4 border-2 border-slate-200 rounded-xl text-center hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all flex flex-col items-center justify-center"');

once('type="text"\n                        formControlName="name"', 'type="text"\n                        autocomplete="name"\n                        aria-label="Ad Soyad"\n                        formControlName="name"', 'name semantics');
once('type="tel"\n                        formControlName="phone"', 'type="tel"\n                        inputmode="tel"\n                        autocomplete="tel"\n                        aria-label="Telefon"\n                        formControlName="phone"', 'phone semantics');
once('type="email"\n                      formControlName="email"', 'type="email"\n                      inputmode="email"\n                      autocomplete="email"\n                      autocapitalize="none"\n                      aria-label="E-posta"\n                      formControlName="email"', 'email semantics');
once('type="text"\n                        formControlName="carBrand"', 'type="text"\n                        autocomplete="off"\n                        aria-label="Araç markası"\n                        formControlName="carBrand"', 'brand semantics');
once('type="text"\n                        formControlName="carModel"', 'type="text"\n                        autocomplete="off"\n                        aria-label="Araç modeli"\n                        formControlName="carModel"', 'model semantics');
once('type="number"\n                        formControlName="carYear"', 'type="number"\n                        inputmode="numeric"\n                        aria-label="Araç yılı"\n                        formControlName="carYear"', 'year semantics');
once('type="number"\n                        formControlName="carMileage"', 'type="number"\n                        inputmode="numeric"\n                        min="0"\n                        aria-label="Araç kilometresi"\n                        formControlName="carMileage"', 'mileage semantics');

all('class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"', 'class="w-full min-h-12 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"');

once('class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-50 relative group"\n                      (click)="fileInput.click()"', 'class="border-2 border-dashed border-slate-300 rounded-xl p-6 sm:p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-50 relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"\n                      role="button"\n                      tabindex="0"\n                      aria-label="Araçla ilgili dosya listesini seç"\n                      (click)="fileInput.click()"\n                      (keydown.enter)="fileInput.click()"\n                      (keydown.space)="$event.preventDefault(); fileInput.click()"', 'file picker keyboard');
once('Dosyaları buraya bırakın veya tıklayın', 'Dosyaları seçmek için dokunun veya tıklayın', 'file instruction');
once('Görsel, Video veya PDF (Maks. 50MB)', 'En fazla 10 dosya, dosya başına 50 MB. Dosya adları başvuruya eklenir; medya içeriği ekibimiz tarafından güvenli kanaldan ayrıca istenir.', 'file truthfulness');
once('class="text-rose-500 hover:bg-rose-50 rounded-full p-1"', 'class="w-11 h-11 shrink-0 text-rose-500 hover:bg-rose-50 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"\n                              [attr.aria-label]="file.name + \' dosyasını listeden çıkar\'"', 'remove file button');

once('rows="3"', 'rows="4"\n                      aria-label="Ek notlar"', 'notes semantics');
all('class="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"', 'class="mt-0.5 w-5 h-5 shrink-0 text-blue-600 rounded border-slate-300 focus:ring-blue-500"');
all('target="_blank"\n                        class=', 'target="_blank"\n                        rel="noopener noreferrer"\n                        class=');

once('<div class="pt-6">\n                  <button', '<div class="pt-6">\n                  @if (hasFormErrors()) {\n                    <div role="alert" aria-live="assertive" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">\n                      Lütfen zorunlu alanları kontrol edin, geçerli iletişim ve araç bilgilerini girin ve yasal onay kutularını işaretleyin.\n                    </div>\n                  }\n                  <button', 'error summary');
once('[disabled]="!partnerForm.valid || isSubmitting()"', '[disabled]="isSubmitting()"', 'submit validation behavior');
once('class="w-full flex justify-center items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"', 'class="w-full min-h-14 flex justify-center items-center gap-2 px-6 sm:px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"', 'submit button');

once('  submitSuccess = signal(false);\n  selectedFiles = signal<File[]>([]);', '  submitSuccess = signal(false);\n  hasFormErrors = signal(false);\n  selectedFiles = signal<File[]>([]);', 'error signal');
once('    name: ["", Validators.required],\n    phone: ["", Validators.required],\n    email: [""],', '    name: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],\n    phone: ["", [Validators.required, Validators.pattern(/^[+0-9()\\s-]{7,24}$/)]],\n    email: ["", Validators.email],', 'personal validators');
once('    carMileage: ["", Validators.required],', '    carMileage: ["", [Validators.required, Validators.min(0), Validators.max(3000000)]],', 'mileage validator');

once(`  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.selectedFiles.update((current) => [
        ...current,
        ...(Array.from(files) as File[]),
      ]);
    }
  }`, `  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const incoming = Array.from(input.files || []);
    const maxBytes = 50 * 1024 * 1024;
    const current = this.selectedFiles();
    const availableSlots = Math.max(0, 10 - current.length);
    const withinSize = incoming.filter((file) => file.size <= maxBytes);
    const accepted = withinSize.slice(0, availableSlots);
    const oversizedCount = incoming.length - withinSize.length;
    const overflowCount = withinSize.length - accepted.length;

    this.selectedFiles.set([...current, ...accepted]);
    input.value = "";

    if (oversizedCount > 0) {
      this.toastService.show(
        \`\${oversizedCount} dosya 50 MB sınırını aştığı için eklenmedi.\`,
        "error",
      );
    }
    if (overflowCount > 0) {
      this.toastService.show("En fazla 10 dosya seçebilirsiniz.", "error");
    }
  }`, 'file validation');

once('  async onSubmit() {\n    if (this.partnerForm.valid) {\n      this.isSubmitting.set(true);', '  async onSubmit() {\n    this.hasFormErrors.set(!this.partnerForm.valid);\n    if (this.partnerForm.valid) {\n      this.isSubmitting.set(true);', 'submit error state');
once('          description: `${formValue.notes || ""} | Şoförlü: ${formValue.withDriver ? "Evet" : "Hayır"} | Dosya Sayısı: ${this.selectedFiles().length}`,', '          description: `${formValue.notes || ""} | Şoförlü: ${formValue.withDriver ? "Evet" : "Hayır"} | Seçilen Dosya Listesi: ${this.selectedFiles().map((file) => file.name).join(", ") || "Yok"}`,', 'file metadata');
once('        this.submitSuccess.set(true);\n        this.selectedFiles.set([]);', '        this.submitSuccess.set(true);\n        this.hasFormErrors.set(false);\n        this.selectedFiles.set([]);', 'success reset');
once('  resetForm() {\n    this.partnerForm.reset({', '  resetForm() {\n    this.hasFormErrors.set(false);\n    this.partnerForm.reset({', 'reset error state');

await writeFile(path, s, 'utf8');
console.log('Vehicle valuation form responsive, validation and truthful file-selection hotfix applied.');
