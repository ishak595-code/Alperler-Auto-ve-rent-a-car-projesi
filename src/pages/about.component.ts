import { CommonModule, Location } from "@angular/common";
import { Component, inject } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-about",
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <main class="about-root">
      <header class="module-head">
        <div class="head-inner">
          <button type="button" (click)="goBack()" aria-label="Geri" class="back-button"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <div><p>AlperAuto</p><h1>Hakkımızda</h1></div>
        </div>
      </header>

      <section class="hero" aria-labelledby="about-title">
        <div class="hero-glow" aria-hidden="true"></div>
        <div class="hero-inner">
          <p class="eyebrow">Kiralama · Satış · Transfer · Tur</p>
          <h2 id="about-title">{{ config().aboutTitle || 'Araç, yolculuk ve seyahatte tek noktadan çözüm' }}</h2>
          <p class="hero-copy">İnsanların ve kurumların doğru araca, doğru bilgiye ve doğru hizmete daha az uğraşla ulaşabilmesi için çalışıyoruz.</p>
          <div class="hero-actions" aria-label="Hizmetlere hızlı erişim">
            <a routerLink="/fleet">Kiralık Araçlar</a>
            <a routerLink="/sales">Satılık Araçlar</a>
            <a routerLink="/tours">Turlar</a>
          </div>
        </div>
      </section>

      <section class="story" aria-labelledby="mission-title">
        <div class="story-inner">
          <div class="story-heading">
            <p class="eyebrow dark">Neden Varız?</p>
            <h2 id="mission-title">Bir araçtan fazlası, ihtiyaca uygun çözüm.</h2>
          </div>
          <div class="story-copy">{{ config().aboutText }}</div>
        </div>
      </section>

      <section class="solutions" aria-labelledby="solutions-title">
        <div class="section-inner">
          <div class="section-heading"><p class="eyebrow dark">Tek Platform</p><h2 id="solutions-title">İhtiyacınız değişse de çözüm aynı yerde.</h2></div>
          <div class="solution-grid">
            <article><span aria-hidden="true"><mat-icon>key</mat-icon></span><h3>Araç Kiralama</h3><p>Günlük, uzun dönem, şoförlü veya özel gün ihtiyaçlarında uygun seçenekleri daha kolay karşılaştırın.</p><a routerLink="/fleet">Kiralık araçları gör</a></article>
            <article><span aria-hidden="true"><mat-icon>directions_car</mat-icon></span><h3>Alım, Satım ve Değerleme</h3><p>Satılık araçları inceleyin veya kendi aracınızı satış ve kiralama filosu için değerlendirmeye gönderin.</p><a routerLink="/sales">Satılık araçları gör</a></article>
            <article><span aria-hidden="true"><mat-icon>explore</mat-icon></span><h3>Tur ve Transfer</h3><p>Yerel saha bilgisiyle özel rotaları, transferleri ve bölgesel seyahat seçeneklerini tek yerden planlayın.</p><a routerLink="/tours">Turları keşfet</a></article>
          </div>
        </div>
      </section>

      <section class="team-section" aria-labelledby="team-title">
        <div class="section-inner">
          <div class="section-heading center"><p class="eyebrow">AlperAuto Ekibi</p><h2 id="team-title">Yerel bilgi, ortak sorumluluk.</h2><p>Hizmetin dijital taraftan saha operasyonuna kadar tek ekip anlayışıyla ilerlemesini hedefliyoruz.</p></div>
          <div class="team-grid">
            @for (member of config().team; track member.id) {
              <article class="team-card">
                @if (member.image) {
                  <img [src]="member.image" width="160" height="160" [alt]="member.name" loading="lazy" />
                } @else {
                  <div class="initials" aria-hidden="true">{{ initials(member.name) }}</div>
                }
                <h3>{{ member.name }}</h3>
                <p class="role">{{ member.role }}</p>
                <p class="description">{{ member.description }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <section class="closing" aria-labelledby="closing-title">
        <div><p class="eyebrow">AlperAuto</p><h2 id="closing-title">Daha az belirsizlik, daha hızlı çözüm.</h2><p>Bireysel veya kurumsal ihtiyacınızı anlatın. Doğru araç, satış, transfer ya da tur seçeneğine birlikte ulaşalım.</p></div>
        <a routerLink="/contact">Bize Ulaşın <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.about-root{min-height:100vh;background:#f8fafc;color:#0f172a}.module-head{position:sticky;top:0;z-index:45;border-bottom:1px solid rgba(148,163,184,.15);background:rgba(3,8,23,.96);color:#fff;backdrop-filter:blur(16px)}.head-inner{width:min(100% - 1.5rem,80rem);min-height:64px;margin:auto;display:flex;align-items:center;gap:.7rem}.back-button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:12px;background:#101a2e;color:#fff}.head-inner p{margin:0;color:#60a5fa;font-size:.58rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.head-inner h1{margin:.1rem 0 0;font-size:.9rem}.hero{position:relative;isolation:isolate;overflow:hidden;background:linear-gradient(135deg,#020617,#071426 58%,#0b1b34);color:#fff}.hero-glow{position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 78% 20%,rgba(37,99,235,.34),transparent 30%),radial-gradient(circle at 18% 90%,rgba(14,165,233,.17),transparent 34%)}.hero-inner{width:min(100% - 1.5rem,80rem);margin:auto;padding:4rem 0 4.5rem}.eyebrow{margin:0;color:#93c5fd;font-size:.65rem;font-weight:950;letter-spacing:.15em;text-transform:uppercase}.eyebrow.dark{color:#2563eb}.hero h2{max-width:900px;margin:.8rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(2.35rem,8vw,5rem);line-height:1.02;letter-spacing:-.035em}.hero-copy{max-width:700px;margin:1rem 0 0;color:#cbd5e1;font-size:clamp(.92rem,2vw,1.12rem);line-height:1.7}.hero-actions{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1.5rem}.hero-actions a{display:inline-flex;min-height:46px;align-items:center;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.07);padding:0 1rem;color:#fff;font-size:.75rem;font-weight:900;text-decoration:none}.story{background:#fff}.story-inner,.section-inner{width:min(100% - 1.5rem,80rem);margin:auto;padding:3.25rem 0}.story-inner{display:grid;gap:1.5rem}.story-heading h2,.section-heading h2,.closing h2{margin:.4rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(2rem,5vw,3.3rem);line-height:1.05;letter-spacing:-.025em}.story-copy{white-space:pre-line;color:#475569;font-size:.9rem;line-height:1.8}.solutions{background:#eef3f9}.section-heading{max-width:760px}.section-heading>p:not(.eyebrow){color:#64748b;line-height:1.6}.solution-grid{display:grid;gap:.8rem;margin-top:1.5rem}.solution-grid article{border:1px solid #dbe3ee;border-radius:20px;background:#fff;padding:1.25rem;box-shadow:0 10px 28px rgba(15,23,42,.05)}.solution-grid article>span{display:grid;width:44px;height:44px;place-items:center;border-radius:13px;background:#eff6ff;color:#2563eb}.solution-grid h3{margin:.8rem 0 .35rem;font-size:1rem}.solution-grid p{margin:0;color:#64748b;font-size:.78rem;line-height:1.6}.solution-grid a{display:inline-flex;margin-top:.9rem;color:#1d4ed8;font-size:.72rem;font-weight:900;text-decoration:none}.team-section{background:#050b18;color:#fff}.section-heading.center{text-align:center;margin:auto}.team-section .section-heading>p:not(.eyebrow){color:#94a3b8}.team-grid{display:grid;gap:.8rem;margin-top:1.7rem}.team-card{border:1px solid rgba(148,163,184,.14);border-radius:20px;background:#0c1628;padding:1.25rem;text-align:center}.team-card img,.initials{width:82px;height:82px;margin:auto;border-radius:999px}.team-card img{object-fit:cover}.initials{display:grid;place-items:center;background:linear-gradient(145deg,#2563eb,#1d4ed8);color:#fff;font:900 1.25rem/1 Georgia,serif;box-shadow:0 15px 34px rgba(37,99,235,.25)}.team-card h3{margin:.9rem 0 .25rem;font-family:Georgia,"Times New Roman",serif;font-size:1.15rem}.team-card .role{margin:0;color:#60a5fa;font-size:.65rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em}.team-card .description{margin:.65rem 0 0;color:#94a3b8;font-size:.75rem;line-height:1.55}.closing{width:min(100% - 1.5rem,80rem);margin:2rem auto;display:grid;gap:1rem;border-radius:24px;background:linear-gradient(135deg,#0f172a,#071426);padding:1.5rem;color:#fff}.closing p:not(.eyebrow){max-width:700px;margin:.6rem 0 0;color:#a8b4c7;font-size:.82rem;line-height:1.6}.closing a{display:flex;min-height:48px;align-items:center;justify-content:center;gap:.25rem;border-radius:12px;background:#fff;padding:0 1.1rem;color:#0f172a;font-size:.75rem;font-weight:950;text-decoration:none}.closing mat-icon{width:17px;height:17px;font-size:17px}@media(min-width:700px){.story-inner{grid-template-columns:.9fr 1.1fr;gap:3rem}.solution-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.team-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.closing{grid-template-columns:1fr auto;align-items:center;padding:2rem}.closing a{padding:0 1.35rem}}@media(min-width:1050px){.team-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.hero-inner{padding:6rem 0 6.5rem}}
  `],
})
export class AboutComponent {
  private readonly carService = inject(CarService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly config = this.carService.getConfig();

  initials(name: string): string {
    return String(name || "A").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("tr-TR") || "").join("");
  }

  goBack(): void {
    if (typeof window !== "undefined" && window.history.length > 1) this.location.back();
    else void this.router.navigate(["/"]);
  }
}
