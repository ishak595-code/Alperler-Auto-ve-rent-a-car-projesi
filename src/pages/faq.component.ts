import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { PublicFaqV217, PublicFaqV217Service } from "../services/public-faq-v217.service";

@Component({
  selector: "app-faq",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <main class="bg-slate-950 text-slate-300 min-h-screen font-sans pb-20">
      <header class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg">
        <div class="max-w-7xl mx-auto px-4">
          <div class="h-16 flex items-center gap-3">
            <button
              type="button"
              (click)="goBack()"
              class="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors shrink-0"
              aria-label="Geri dön"
            >
              <mat-icon aria-hidden="true">arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold text-white">Sıkça Sorulan Sorular</h1>
          </div>
        </div>
      </header>

      <section class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-labelledby="faq-title">
        <div class="text-center mb-12">
          <h2 id="faq-title" class="text-2xl font-bold text-white">Merak ettiklerinizin yanıtları</h2>
          <p class="text-slate-400 mt-3">Kiralama, satış ve hizmet süreçleriyle ilgili güncel bilgileri burada bulabilirsiniz.</p>
        </div>

        @if (loading()) {
          <div class="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center" role="status">Sorular hazırlanıyor...</div>
        } @else if (loadError()) {
          <div class="rounded-xl border border-red-900/60 bg-slate-900 p-6 text-center" role="alert">
            <p>FAQ bilgilerine şu anda ulaşılamıyor.</p>
            <button type="button" (click)="reload()" class="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white">Tekrar dene</button>
          </div>
        } @else if (faqs().length === 0) {
          <div class="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center" role="status">Henüz yayınlanmış soru bulunmuyor.</div>
        } @else {
          <div class="space-y-4">
            @for (faq of faqs(); track faq.id) {
              <article class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md group hover:border-blue-500">
                <h3>
                  <button
                    type="button"
                    (click)="toggleFaq(faq.id)"
                    class="w-full flex justify-between items-center p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 bg-slate-900 hover:bg-slate-800 transition-colors"
                    [attr.aria-expanded]="isOpen(faq.id)"
                    [attr.aria-controls]="'faq-answer-' + faq.id"
                  >
                    <span class="font-bold text-slate-100 text-lg group-hover:text-blue-400 transition-colors">{{ faq.question }}</span>
                    <span class="text-slate-400 transform transition-transform duration-300 bg-slate-800 rounded-full p-1" [class.rotate-180]="isOpen(faq.id)">
                      <mat-icon aria-hidden="true">expand_more</mat-icon>
                    </span>
                  </button>
                </h3>
                <div
                  [id]="'faq-answer-' + faq.id"
                  class="bg-slate-900 text-slate-400 leading-relaxed overflow-hidden transition-all duration-300"
                  [style.max-height]="isOpen(faq.id) ? '700px' : '0'"
                  [style.opacity]="isOpen(faq.id) ? '1' : '0'"
                  [attr.aria-hidden]="!isOpen(faq.id)"
                >
                  <div class="p-6 pt-4 border-t border-slate-800">{{ faq.answer }}</div>
                </div>
              </article>
            }
          </div>
        }
      </section>
    </main>
  `,
})
export class FaqComponent implements OnInit {
  private readonly faqService = inject(PublicFaqV217Service);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly openIds = signal<ReadonlySet<string>>(new Set());

  readonly faqs = signal<PublicFaqV217[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      this.faqs.set(await this.faqService.list(100));
    } catch {
      this.faqs.set([]);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  isOpen(id: string): boolean {
    return this.openIds().has(id);
  }

  toggleFaq(id: string): void {
    this.openIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  goBack(): void {
    if (typeof window !== "undefined" && window.history.length > 1) this.location.back();
    else void this.router.navigate(["/"]);
  }
}
