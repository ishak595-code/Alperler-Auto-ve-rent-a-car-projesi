import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { CarService } from "../../services/car.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-whatsapp-settings",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-4xl space-y-6">
        <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-emerald-400">Canlı site_config</p>
          <h1 class="mt-2 text-3xl font-black md:text-4xl">WhatsApp Yönetimi</h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Araç kartları, kampanyalar ve genel WhatsApp bağlantıları aynı merkezi ayarı kullanır. Değişiklik yalnız Supabase kaydı başarılı olduğunda yayınlanmış sayılır.</p>
          <div class="mt-5 flex flex-wrap gap-2">
            <button type="button" (click)="reload()" [disabled]="loading() || saving()" class="min-h-11 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white disabled:opacity-50">{{ loading() ? 'Yenileniyor…' : 'Veritabanından Yenile' }}</button>
          </div>
        </header>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div class="grid gap-5 md:grid-cols-2">
            <label class="field">
              <span>WhatsApp telefon numarası</span>
              <input [(ngModel)]="whatsapp" inputmode="tel" autocomplete="tel" placeholder="905379594851" [disabled]="loading() || saving()" />
              <small>Ülke koduyla yalnızca rakam kullanılması önerilir. Örnek: 905379594851.</small>
            </label>

            <label class="field">
              <span>WhatsApp kullanıcı adı</span>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400">@</span>
                <input [(ngModel)]="whatsappUsername" class="!pl-8" autocomplete="off" placeholder="alperlerauto" [disabled]="loading() || saving()" />
              </div>
              <small>WhatsApp hesabınızda ayırttığınız kullanıcı adını yazın. @ işaretini eklemeniz gerekmez.</small>
            </label>
          </div>

          <label class="field mt-5">
            <span>Varsayılan WhatsApp karşılama mesajı</span>
            <textarea [(ngModel)]="whatsappMessage" rows="5" maxlength="800" placeholder="Merhaba, araç kiralama veya satış hakkında bilgi almak istiyorum." [disabled]="loading() || saving()"></textarea>
            <small>Araç kartı ve genel WhatsApp düğmesi bu metni başlangıç mesajı olarak kullanır. Kampanyalar kendi özel mesajlarını ekleyebilir.</small>
          </label>

          <div class="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950">
            <strong class="block font-black">Tek kaynak</strong>
            <p class="mt-1">Bu ekran WhatsApp numarası, kullanıcı adı ve varsayılan mesaj için tek yönetim noktasıdır. Genel Ayarlar bu değerleri ikinci kez düzenlemez.</p>
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" (click)="save()" [disabled]="loading() || saving()" class="min-h-12 rounded-xl bg-emerald-600 px-5 font-black text-white hover:bg-emerald-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 disabled:opacity-50">{{ saving() ? 'Kaydediliyor…' : 'Kaydet ve Yayınla' }}</button>
            <button type="button" (click)="testWhatsapp()" [disabled]="loading() || saving() || !cleanNumber()" class="min-h-12 rounded-xl border border-slate-200 bg-white px-5 font-black text-slate-800 hover:bg-slate-50 disabled:opacity-40">WhatsApp Bağlantısını Test Et</button>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <h2 class="text-lg font-black text-slate-900">Canlı kullanılacak değerler</h2>
          <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div class="rounded-xl bg-slate-50 p-4"><dt class="text-xs font-black uppercase text-slate-400">Numara</dt><dd class="mt-1 break-all font-bold text-slate-900">{{ cleanNumber() || 'Tanımlı değil' }}</dd></div>
            <div class="rounded-xl bg-slate-50 p-4"><dt class="text-xs font-black uppercase text-slate-400">Kullanıcı adı</dt><dd class="mt-1 break-all font-bold text-slate-900">{{ cleanUsername() ? '@' + cleanUsername() : 'Tanımlı değil' }}</dd></div>
          </dl>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(71 85 105)}.field input,.field textarea{width:100%;min-height:46px;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:10px 12px;color:rgb(15 23 42);outline:none}.field textarea{min-height:110px}.field input:focus,.field textarea:focus{border-color:rgb(16 185 129);box-shadow:0 0 0 2px rgb(16 185 129/.15)}.field small{font-size:.72rem;line-height:1.45;color:rgb(100 116 139)}.field input:disabled,.field textarea:disabled{opacity:.6;cursor:not-allowed}
  `],
})
export class AdminWhatsappSettingsComponent implements OnInit {
  private readonly carService = inject(CarService);
  private readonly toast = inject(ToastService);
  readonly loading = signal(false);
  readonly saving = signal(false);

  whatsapp = "";
  whatsappUsername = "";
  whatsappMessage = "";

  async ngOnInit(): Promise<void> {
    await this.reload(false);
  }

  async reload(showToast = true): Promise<void> {
    if (this.loading() || this.saving()) return;
    this.loading.set(true);
    try {
      await this.carService.refreshCloudCatalog(true);
      this.hydrateFromConfig();
      if (showToast) this.toast.show("WhatsApp ayarları canlı veritabanından yenilendi.", "success");
    } catch (error) {
      console.error(error);
      this.toast.show("WhatsApp ayarları veritabanından yenilenemedi.", "error");
    } finally {
      this.loading.set(false);
    }
  }

  cleanNumber(): string {
    return String(this.whatsapp || "").replace(/\D/g, "");
  }

  cleanUsername(): string {
    return String(this.whatsappUsername || "").trim().replace(/^@+/, "").replace(/\s+/g, "");
  }

  async save(): Promise<void> {
    if (this.saving() || this.loading()) return;
    const number = this.cleanNumber();
    if (number && (number.length < 8 || number.length > 15)) {
      this.toast.show("WhatsApp numarası ülke koduyla 8-15 rakam olmalıdır.", "error");
      return;
    }

    this.saving.set(true);
    try {
      const current = this.carService.getConfig()();
      await this.carService.updateConfig({
        ...current,
        whatsapp: number,
        whatsappUsername: this.cleanUsername(),
        whatsappMessage: this.whatsappMessage.trim(),
      });
      await this.carService.refreshCloudCatalog(true);
      this.hydrateFromConfig();
      this.toast.show("WhatsApp ayarları Supabase’e kaydedildi ve site geneline yayınlandı.", "success");
    } catch (error) {
      console.error(error);
      this.toast.show("WhatsApp ayarları kaydedilemedi. Oturum ve veritabanı bağlantısını kontrol edin.", "error");
    } finally {
      this.saving.set(false);
    }
  }

  testWhatsapp(): void {
    const number = this.cleanNumber();
    if (!number || typeof window === "undefined") return;
    const message = this.whatsappMessage.trim() || "Merhaba, detaylı bilgi almak istiyorum.";
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  private hydrateFromConfig(): void {
    const config = this.carService.getConfig()();
    this.whatsapp = config.whatsapp || "";
    this.whatsappUsername = config.whatsappUsername || "";
    this.whatsappMessage = config.whatsappMessage || "";
  }
}
