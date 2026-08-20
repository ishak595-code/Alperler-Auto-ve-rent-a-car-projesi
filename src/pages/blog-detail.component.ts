import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { ActivatedRoute, RouterLink, Router } from "@angular/router";
import { CarService } from "../services/car.service";
import { UiService } from "../services/ui.service";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-blog-detail",
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="bg-white min-h-screen font-sans">
      <div class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-4">
          <div class="h-16 flex items-center gap-3">
            <button type="button" (click)="goBack()" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" aria-label="Blog yazısından geri dön">
              <mat-icon aria-hidden="true">arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold text-slate-900 truncate">{{ post()?.title || "Blog Yazısı" }}</h1>
          </div>
        </div>
      </div>

      @if (post()) {
        @if (post()!.image) {
          <div class="relative h-[40vh] w-full">
            <img [src]="post()!.image" [alt]="post()!.title" class="object-cover w-full h-full brightness-50" />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>
            <div class="absolute bottom-0 left-0 w-full p-8 md:p-16">
              <div class="max-w-4xl mx-auto">
                <h1 class="text-3xl md:text-5xl font-serif font-bold text-white leading-tight mb-4">{{ post()!.title }}</h1>
                <div class="flex items-center text-slate-300 text-sm font-medium space-x-4">
                  <span class="flex items-center"><mat-icon aria-hidden="true" class="!h-4 !w-4 !text-base mr-2">calendar_today</mat-icon>{{ post()!.date }}</span>
                  <span class="w-1 h-1 bg-blue-500 rounded-full"></span>
                  <span class="flex items-center"><mat-icon aria-hidden="true" class="!h-4 !w-4 !text-base mr-2">schedule</mat-icon>{{ post()!.readTime }}</span>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="bg-slate-950 px-4 py-12 text-white sm:py-16">
            <div class="mx-auto max-w-4xl">
              <p class="text-xs font-black uppercase tracking-[.16em] text-blue-300">Alperler Rent A Car Rehber</p>
              <h1 class="mt-3 font-serif text-3xl font-black leading-tight sm:text-5xl">{{ post()!.title }}</h1>
              <div class="mt-5 flex flex-wrap gap-4 text-sm text-slate-300"><span>{{ post()!.date }}</span><span>{{ post()!.readTime }}</span></div>
            </div>
          </div>
        }

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div class="prose prose-lg prose-slate mx-auto first-letter:text-5xl first-letter:font-serif first-letter:text-slate-900 first-letter:float-left first-letter:mr-3" [innerHTML]="post()!.content"></div>

          <div class="mt-16 pt-8 border-t border-slate-200 flex flex-col gap-6">
            <div class="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">
              <h3 class="font-serif text-xl font-bold text-slate-900 mb-2">Bu yazıyı paylaşın</h3>
              <p class="text-slate-500 text-sm mb-6">Size yararlı olduysa bağlantıyı paylaşarak daha sonra kolayca yeniden ulaşabilirsiniz.</p>

              <div class="flex flex-wrap justify-center gap-4">
                <button type="button" (click)="sharePost()" class="flex min-h-12 items-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700">
                  <mat-icon aria-hidden="true" class="mr-2">share</mat-icon>
                  Paylaş
                </button>
                <button type="button" (click)="copyLink()" class="flex min-h-12 items-center bg-slate-900 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
                  <mat-icon aria-hidden="true" class="mr-2">link</mat-icon>
                  Bağlantıyı Kopyala
                </button>
              </div>

              @if (showCopyMsg()) {
                <div class="mt-3 text-green-700 font-bold text-xs" role="status">Bağlantı kopyalandı.</div>
              }
            </div>

            <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <a routerLink="/blog" class="flex min-h-11 items-center text-slate-600 hover:text-slate-950 font-bold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                <mat-icon aria-hidden="true" class="mr-1">arrow_back</mat-icon>
                Tüm Yazılara Dön
              </a>
              <button type="button" (click)="openContact()" class="min-h-11 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Bize Ulaşın</button>
            </div>
          </div>
        </div>
      } @else {
        <div class="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p class="text-slate-500 text-xl">Yazı bulunamadı.</p>
          <a routerLink="/blog" class="min-h-11 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">Tüm Yazılara Dön</a>
        </div>
      }
    </div>
  `,
})
export class BlogDetailComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  location = inject(Location);
  carService = inject(CarService);
  uiService = inject(UiService);
  private readonly routeId = signal("");
  readonly post = computed(() => {
    const id = this.routeId();
    if (!id) return undefined;
    return this.carService.getBlogPosts()().find((item) =>
      String(item.id) === id || String(item.cloudId || "") === id || String(item.cloudSlug || "") === id,
    );
  });
  showCopyMsg = signal(false);

  goBack(): void {
    if (typeof window !== "undefined" && window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl("/blog");
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.routeId.set(String(params["id"] || "").trim());
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  openContact(): void {
    void this.router.navigate(["/contact"]);
  }

  sharePost(): void {
    const title = this.post()?.title || "Alperler Rent A Car Rehber";
    const url = window.location.href;

    if (navigator.share) {
      void navigator.share({ title, text: "Alperler Rent A Car rehberinde bu yazıyı inceleyin.", url }).catch(() => undefined);
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(title + " " + url)}`, "_blank", "noopener,noreferrer");
  }

  copyLink(): void {
    const url = window.location.href;
    if (!navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(url).then(() => {
      this.showCopyMsg.set(true);
      setTimeout(() => this.showCopyMsg.set(false), 2000);
    });
  }
}
