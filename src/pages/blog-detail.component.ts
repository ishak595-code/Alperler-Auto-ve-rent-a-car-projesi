import { Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterLink, Router } from "@angular/router";
import { CarService, BlogPost } from "../services/car.service";
import { UiService } from "../services/ui.service";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-blog-detail",
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="bg-white min-h-screen font-sans">
      <!-- Sticky Module Header -->
      <div
        class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm"
      >
        <div class="max-w-7xl mx-auto px-4">
          <div class="h-16 flex items-center gap-3">
            <button
              (click)="goBack()"
              class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 shrink-0"
              aria-label="Geri Dön"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold text-slate-900 truncate">
              {{ post()?.title || "Blog Yazısı" }}
            </h1>
          </div>
        </div>
      </div>

      @if (post()) {
        <!-- Hero Image -->
        <div class="relative h-[40vh] w-full">
          <img
            [src]="post()!.image"
            [alt]="post()!.title"
            class="object-cover w-full h-full brightness-50"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"
          ></div>
          <div class="absolute bottom-0 left-0 w-full p-8 md:p-16">
            <div class="max-w-4xl mx-auto">
              <h1
                class="text-3xl md:text-5xl font-serif font-bold text-white leading-tight mb-4"
              >
                {{ post()!.title }}
              </h1>
              <div
                class="flex items-center text-slate-300 text-sm font-medium space-x-4"
              >
                <span class="flex items-center">
                  <svg
                    class="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {{ post()!.date }}
                </span>
                <span class="w-1 h-1 bg-blue-500 rounded-full"></span>
                <span class="flex items-center">
                  <svg
                    class="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {{ post()!.readTime }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div
            class="prose prose-lg prose-slate mx-auto first-letter:text-5xl first-letter:font-serif first-letter:text-slate-900 first-letter:float-left first-letter:mr-3"
            [innerHTML]="post()!.content"
          ></div>

          <!-- Action Buttons -->
          <div class="mt-16 pt-8 border-t border-slate-200 flex flex-col gap-6">
            <div
              class="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center"
            >
              <h3 class="font-serif text-xl font-bold text-slate-900 mb-2">
                Bu Hikayeyi Sevdiklerinizle Paylaşın
              </h3>
              <p class="text-slate-500 text-sm mb-6">
                Yüksekova'nın güzelliklerini herkes görsün.
              </p>

              <div class="flex justify-center gap-4">
                <button
                  (click)="sharePost()"
                  class="flex items-center bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105"
                >
                  <svg
                    class="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"
                    />
                  </svg>
                  WhatsApp
                </button>
                <button
                  (click)="copyLink()"
                  class="flex items-center bg-slate-900 hover:bg-blue-500 hover:text-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105"
                >
                  <svg
                    class="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Paylaş
                </button>
              </div>

              @if (showCopyMsg()) {
                <div
                  class="mt-2 text-green-600 font-bold text-xs animate-fade-in"
                >
                  Bağlantı kopyalandı!
                </div>
              }
            </div>

            <div class="flex justify-between items-center">
              <a
                routerLink="/blog"
                class="text-slate-500 hover:text-slate-900 font-bold text-sm flex items-center"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Diğer Yazılar
              </a>
              <button
                (click)="openContact()"
                class="bg-slate-900 text-white px-6 py-3 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-blue-500 hover:text-slate-900 transition-colors shadow-lg"
              >
                Hemen İletişime Geçin
              </button>
            </div>
          </div>
        </div>
      } @else {
        <div class="min-h-screen flex items-center justify-center">
          <p class="text-slate-500 text-xl">Yazı bulunamadı.</p>
        </div>
      }
    </div>
  `,
})
export class BlogDetailComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  carService = inject(CarService);
  uiService = inject(UiService);
  post = signal<BlogPost | undefined>(undefined);
  showCopyMsg = signal(false);

  goBack() {
    this.router.navigate(["/blog"]);
  }

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = Number(params["id"]);
      if (id) {
        this.post.set(this.carService.getBlogPost(id));
        window.scrollTo(0, 0);
      }
    });
  }

  openContact() {
    this.router.navigate(["/contact"]);
  }

  sharePost() {
    const title = this.post()?.title || "Alperler Auto Blog";
    const url = window.location.href;

    if (navigator.share) {
      navigator
        .share({
          title: title,
          text: "Yüksekova Alperler Auto Blogunda harika bir yazı buldum!",
          url: url,
        })
        .catch(console.error);
    } else {
      // Fallback to WhatsApp specific link
      window.open(
        `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`,
        "_blank",
      );
    }
  }

  copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.showCopyMsg.set(true);
      setTimeout(() => this.showCopyMsg.set(false), 2000);
    });
  }
}
