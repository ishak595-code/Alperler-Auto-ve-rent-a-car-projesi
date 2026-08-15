import { Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { UiService } from "../services/ui.service";
import { CarService } from "../services/car.service";
import { VisitorAnalyticsService } from "../services/visitor-analytics.service";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-legal",
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  template: `
    <div class="bg-slate-950 text-slate-300 min-h-screen font-sans pb-20">
      <div class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg">
        <div class="max-w-7xl mx-auto px-4">
          <div class="h-16 flex items-center gap-3">
            <button (click)="goBack()" class="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors shrink-0" aria-label="Geri Dön">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold text-white">Kurumsal & Yasal</h1>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        @if (!currentType()) {
          <div class="text-center mb-10">
            <h1 class="text-4xl font-serif font-bold text-slate-100 mb-4">Kurumsal & Yasal</h1>
            <p class="text-slate-400 text-lg">Şirket politikalarımız, yasal metinlerimiz ve sıkça sorulan sorular.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (doc of documents; track doc.id) {
              <a [routerLink]="doc.path" [queryParams]="doc.query" class="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-between group cursor-pointer">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-blue-900 transition-colors">
                    <mat-icon class="text-slate-400 group-hover:text-blue-400">{{ doc.icon }}</mat-icon>
                  </div>
                  <div><h3 class="font-bold text-slate-200 group-hover:text-white transition-colors">{{ doc.title }}</h3></div>
                </div>
                <mat-icon class="text-slate-600 group-hover:text-blue-500 transition-colors">chevron_right</mat-icon>
              </a>
            }
          </div>
        } @else {
          <div class="bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-800">
            <div class="p-6 sm:p-10">
              <button (click)="clearType()" class="mb-8 flex items-center text-sm font-bold text-slate-400 hover:text-white transition-colors">
                <mat-icon class="mr-1 text-sm">arrow_back</mat-icon>Kurumsal Menüye Dön
              </button>

              <h1 class="text-3xl font-serif font-bold text-white mb-8">{{ title() }}</h1>
              <div class="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-line" [innerHTML]="content()"></div>

              @if (isAnalyticsDocument()) {
                <section class="mt-8 rounded-2xl border border-blue-500/25 bg-blue-950/30 p-5" aria-labelledby="analytics-kvkk-title">
                  <h2 id="analytics-kvkk-title" class="text-lg font-black text-white">Web analitiği ve ziyaretçi davranış kayıtları</h2>
                  <p class="mt-3 text-sm leading-6 text-slate-300">Analitik tercihi kabul edildiğinde oturum kimliği, IP ve ağ güvenliği bilgisi, yaklaşık ülke/şehir/bölge, cihaz türü ve modeli, işletim sistemi, tarayıcı, ekran ölçüleri, ziyaret edilen sayfalar, tıklanan arayüz öğeleri, kaydırma derinliği, formun başlatılması/gönderilmesi/vazgeçilmesi ve teknik hata kayıtları ölçülebilir.</p>
                  <p class="mt-3 text-sm leading-6 text-slate-300">Analitik kayıt sistemimiz form alanlarına yazılan metinleri, parolaları veya kart bilgilerini analitik olay olarak kaydetmez. Bir ziyaretçi rezervasyon, iletişim veya araç değerlendirme başvurusu gönderirse, yalnız kullanıcının kendisinin verdiği iletişim bilgileri ilgili işlem kaydıyla eşleştirilebilir.</p>
                  <p class="mt-3 text-sm leading-6 text-slate-300">Varsayılan veri saklama politikamızda ham IP güvenlik bağlamı 30 gün sonra anonimleştirilir; davranış analitiği oturumları 180 gün sonra temizlenir. Operasyonel, sözleşmesel veya mevzuattan doğan ayrı kayıtların saklama süreleri kendi amaçlarına göre farklı olabilir.</p>
                  <div class="mt-4 flex flex-wrap items-center gap-3">
                    <span class="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-200">Mevcut tercih: {{ analyticsConsentLabel() }}</span>
                    <button type="button" (click)="analytics.resetChoice()" class="min-h-11 rounded-xl bg-white px-4 text-sm font-black text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Analitik tercihini yeniden seç</button>
                  </div>
                </section>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class LegalComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  uiService = inject(UiService);
  carService = inject(CarService);
  location = inject(Location);
  analytics = inject(VisitorAnalyticsService);
  config = this.carService.getConfig();

  currentType = signal<string | null>(null);
  title = signal("");
  content = signal("");

  documents = [
    { id: "terms", title: "Kullanım Şartları", icon: "gavel", path: ["/legal"], query: { type: "terms" } },
    { id: "kvkk", title: "KVKK Aydınlatma Metni", icon: "policy", path: ["/legal"], query: { type: "kvkk" } },
    { id: "privacy", title: "Gizlilik Politikası", icon: "privacy_tip", path: ["/legal"], query: { type: "privacy" } },
    { id: "cookies", title: "Çerez Politikası", icon: "cookie", path: ["/legal"], query: { type: "cookies" } },
    { id: "distance-selling", title: "Mesafeli Satış Sözleşmesi", icon: "receipt_long", path: ["/legal"], query: { type: "distance-selling" } },
    { id: "cancellation", title: "İade ve İptal Politikası", icon: "assignment_return", path: ["/legal"], query: { type: "cancellation" } },
    { id: "insurance", title: "Araç Sigorta ve Sorumluluk", icon: "health_and_safety", path: ["/legal"], query: { type: "insurance" } },
    { id: "faq", title: "Sıkça Sorulan Sorular", icon: "help_outline", path: ["/faq"], query: {} },
  ];

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params["type"]) {
        this.currentType.set(params["type"]);
        this.setContent(params["type"]);
        window.scrollTo(0, 0);
      } else {
        this.currentType.set(null);
      }
    });
  }

  goBack() {
    if (window.history.length > 1) this.location.back();
    else this.router.navigate(["/"]);
  }

  clearType() {
    this.router.navigate(["/legal"]);
  }

  isAnalyticsDocument(): boolean {
    return ["kvkk", "privacy", "cookies"].includes(this.currentType() || "");
  }

  analyticsConsentLabel(): string {
    return this.analytics.consent() === "accepted" ? "Analitik açık" : this.analytics.consent() === "rejected" ? "Sadece gerekli" : "Henüz seçilmedi";
  }

  setContent(type: string) {
    const cfg = this.config();
    if (type === "kvkk") { this.title.set("KVKK Aydınlatma Metni"); this.content.set(cfg.kvkkText); }
    else if (type === "privacy") { this.title.set("Gizlilik Politikası"); this.content.set(cfg.privacyText); }
    else if (type === "cookies") { this.title.set("Çerez Politikası"); this.content.set(cfg.cookiesText); }
    else if (type === "terms") { this.title.set("Kullanım Şartları"); this.content.set(cfg.termsText); }
    else if (type === "distance-selling") { this.title.set("Mesafeli Satış Sözleşmesi"); this.content.set(cfg.distanceSellingText); }
    else if (type === "cancellation") { this.title.set("İade ve İptal Politikası"); this.content.set(cfg.cancellationText); }
    else if (type === "insurance") { this.title.set("Araç Sigorta ve Sorumluluk Metinleri"); this.content.set(cfg.insuranceText); }
  }
}
