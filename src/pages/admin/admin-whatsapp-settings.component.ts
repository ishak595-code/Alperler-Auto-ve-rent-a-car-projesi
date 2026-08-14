import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { CarService } from "../../services/car.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-whatsapp-settings",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-4xl space-y-6">
        <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-emerald-400">Merkezî iletişim ayarı</p>
          <h1 class="mt-2 text-3xl font-black md:text-4xl">WhatsApp Yönetimi</h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Araç kartları, kampanyalar ve sabit WhatsApp düğmesi aynı ayarı kullanır. Burada değiştirdiğiniz numara bütün siteye uygulanır.</p>
        </header>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div class="grid gap-5 md:grid-cols-2">
            <label class="field">
              <span>WhatsApp telefon numarası</span>
              <input [(ngModel)]="whatsapp" inputmode="tel" autocomplete="tel" placeholder="905379594851" />
              <small>Ülke koduyla yalnızca rakam kullanılması önerilir. Örnek: 905379594851.</small>
            </label>

            <label class="field">
              <span>WhatsApp kullanıcı adı</span>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">@</span>
                <input [(ngModel)]="whatsappUsername" class="!pl-8" autocomplete="off" placeholder="alperlerauto" />
              </div>
              <small>WhatsApp hesabınızda ayırttığınız kullanıcı adını yazın. @ işaretini eklemeniz gerekmez.</small>
            </label>
          </div>

          <label class="field mt-5">
            <span>Varsayılan WhatsApp karşılama mesajı</span>
            <textarea [(ngModel)]="whatsappMessage" rows="5" maxlength="800" placeholder="Merhaba, araç kiralama veya satış hakkında bilgi almak istiyorum."></textarea>
            <small>Araç kartı ve genel WhatsApp düğmesi bu metni başlangıç mesajı olarak kullanır. Kampanyalar kendi özel mesajlarını ekleyebilir.</small>
          </label>

          <div class="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950">
            <strong class="block font-black">WhatsApp kullanıcı adı durumu</strong>
            <p class="mt-1">Meta kullanıcı adı rezervasyonunu 2026'da başlattı ve iletişim özelliğini kademeli açıyor. Bu nedenle web sitesinin garantili çalışan bağlantısı şu an telefon numarasıdır. Kullanıcı adınızı burada saklayarak yeni bağlantı yöntemi resmen açıldığında hazır olursunuz.</p>
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" (click)="save()" class="min-h-12 rounded-xl bg-emerald-600 px-5 font-black text-white hover:bg-emerald-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30">Ayarları Kaydet</button>
            <button type="button" (click)="testWhatsapp()" [disabled]="!cleanNumber()" class="min-h-12 rounded-xl border border-slate-200 bg-white px-5 font-black text-slate-800 hover:bg-slate-50 disabled:opacity-40">WhatsApp Bağlantısını Test Et</button>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <h2 class="text-lg font-black text-slate-900">Sitede kullanılacak değerler</h2>
          <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div class="rounded-xl bg-slate-50 p-4"><dt class="text-xs font-black uppercase text-slate-400">Numara</dt><dd class="mt-1 break-all font-bold text-slate-900">{{ cleanNumber() || 'Tanımlı değil' }}</dd></div>
            <div class="rounded-xl bg-slate-50 p-4"><dt class="text-xs font-black uppercase text-slate-400">Kullanıcı adı</dt><dd class="mt-1 break-all font-bold text-slate-900">{{ cleanUsername() ? '@' + cleanUsername() : 'Tanımlı değil' }}</dd></div>
          </dl>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(71 85 105)}.field input,.field textarea{width:100%;min-height:46px;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:10px 12px;color:rgb(15 23 42);outline:none}.field textarea{min-height:110px}.field input:focus,.field textarea:focus{border-color:rgb(16 185 129);box-shadow:0 0 0 2px rgb(16 185 129/.15)}.field small{font-size:.72rem;line-height:1.45;color:rgb(100 116 139)}
  `],
})
export class AdminWhatsappSettingsComponent implements OnInit {
  private readonly carService = inject(CarService);
  private readonly toast = inject(ToastService);

  whatsapp = "";
  whatsappUsername = "";
  whatsappMessage = "";

  ngOnInit(): void {
    const config = this.carService.getConfig()();
    this.whatsapp = config.whatsapp || "";
    this.whatsappUsername = config.whatsappUsername || "";
    this.whatsappMessage = config.whatsappMessage || "";
  }

  cleanNumber(): string {
    return String(this.whatsapp || "").replace(/\D/g, "");
  }

  cleanUsername(): string {
    return String(this.whatsappUsername || "").trim().replace(/^@+/, "").replace(/\s+/g, "");
  }

  save(): void {
    const number = this.cleanNumber();
    if (number && (number.length < 8 || number.length > 15)) {
      this.toast.show("WhatsApp numarası ülke koduyla 8-15 rakam olmalıdır.", "error");
      return;
    }
    const current = this.carService.getConfig()();
    this.carService.updateConfig({
      ...current,
      whatsapp: number,
      whatsappUsername: this.cleanUsername(),
      whatsappMessage: this.whatsappMessage.trim(),
    });
    this.whatsapp = number;
    this.whatsappUsername = this.cleanUsername();
    this.toast.show("WhatsApp ayarları site geneline uygulanmak üzere kaydedildi.", "success");
  }

  testWhatsapp(): void {
    const number = this.cleanNumber();
    if (!number || typeof window === "undefined") return;
    const message = this.whatsappMessage.trim() || "Merhaba, detaylı bilgi almak istiyorum.";
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }
}
