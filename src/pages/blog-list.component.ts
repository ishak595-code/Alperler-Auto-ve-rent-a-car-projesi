import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { BlogDetailPost, PublicDetailDataService } from "../services/public-detail-data.service";

@Component({
  selector: "app-blog-list",
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <main class="min-h-screen bg-[#050A18] pb-20 font-sans text-[#94A3B8]">
      <header class="sticky top-0 z-50 border-b border-[#24314A] bg-[#080F20]/95 shadow-xl backdrop-blur-xl">
        <div class="mx-auto max-w-7xl px-4"><div class="flex h-16 items-center gap-3"><button type="button" (click)="goBack()" class="-ml-2 grid min-h-12 min-w-12 place-items-center rounded-full p-2 text-[#94A3B8] transition-colors hover:bg-[#101A2E] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]" aria-label="Geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button><h1 class="min-w-0 text-lg font-bold text-[#F8FAFC]">Alperler Yol Rehberi</h1></div></div>
      </header>

      <section class="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8" aria-label="Blog yazıları">
        <div class="mb-8 max-w-3xl sm:mb-10"><p class="text-[10px] font-black uppercase tracking-[.16em] text-[#E7C777]">Yolculuk Rehberi</p><h2 class="mt-1 text-2xl font-black text-[#F8FAFC] sm:text-3xl">Daha iyi bir yolculuk için doğru bilgiler</h2><p class="mt-3 text-sm leading-6 text-[#94A3B8] sm:text-base">Araç seçimi, kiralama, güvenli sürüş ve bölgenin keşfedilmeye değer rotaları için pratik rehberler ve öneriler.</p></div>

        @if (loading()) {
          <div class="rounded-3xl border border-[#24314A] bg-[#0B1224] px-6 py-12 text-center" role="status"><mat-icon aria-hidden="true" class="!h-12 !w-12 !text-5xl text-[#E7C777]">sync</mat-icon><h2 class="mt-3 text-lg font-black text-[#F8FAFC]">Rehberler hazırlanıyor</h2></div>
        } @else if (error()) {
          <div class="rounded-3xl border border-[#7F1D1D] bg-[#1F0B12] px-6 py-12 text-center" role="alert"><mat-icon aria-hidden="true" class="!h-12 !w-12 !text-5xl text-[#FCA5A5]">error_outline</mat-icon><h2 class="mt-3 text-lg font-black text-[#F8FAFC]">Rehberlere şu anda ulaşılamıyor</h2><p class="mt-2 text-sm text-[#FCA5A5]">Lütfen kısa bir süre sonra yeniden deneyin.</p><button type="button" (click)="load()" class="mt-5 min-h-12 rounded-xl bg-[#9F1D1D] px-5 font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]">Tekrar Dene</button></div>
        } @else if (blogPosts().length) {
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            @for (post of blogPosts(); track post.cloudId || post.id) {
              <a [routerLink]="['/blog', post.cloudSlug || post.cloudId || post.id]" [attr.aria-label]="post.title + ' yazısını aç'" class="group relative top-0 flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-3xl border border-[#24314A] bg-[#0D1628] text-[#F8FAFC] shadow-lg transition-all duration-300 hover:-top-1 hover:border-[#C6A15B] hover:bg-[#101A2E] hover:shadow-2xl active:top-0 active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]">
                <div class="relative aspect-[16/10] overflow-hidden bg-[#101A2E]">@if (post.image) {<img [src]="post.image" [alt]="post.title + ' yazısı kapak görseli'" loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />} @else {<div class="grid h-full w-full place-items-center bg-gradient-to-br from-[#101A2E] to-[#0B1224] text-[#64748B]"><mat-icon aria-hidden="true" class="!h-12 !w-12 !text-5xl">article</mat-icon></div>}<div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050A18]/70 via-transparent to-transparent" aria-hidden="true"></div><span class="absolute left-4 top-4 rounded-full border border-[#24314A] bg-[#0B1224]/95 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#CBD5E1] shadow-lg">{{ post.readTime }}</span></div>
                <div class="flex flex-grow flex-col p-5 sm:p-6"><div class="mb-3 flex items-center text-xs font-medium text-[#64748B]"><mat-icon aria-hidden="true" class="mr-1 !h-[14px] !w-[14px] !text-[14px]">calendar_today</mat-icon>{{ post.date }}</div><h3 class="line-clamp-2 text-xl font-black leading-tight text-[#F8FAFC] transition-colors group-hover:text-[#E7C777]">{{ post.title }}</h3><p class="mt-3 line-clamp-3 text-sm leading-relaxed text-[#94A3B8]">{{ post.summary }}</p><div class="mt-auto border-t border-[#24314A] pt-5"><div class="flex min-h-11 items-center justify-between gap-3"><span class="text-xs font-black uppercase tracking-widest text-[#E7C777]">Devamını Oku</span><span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#101A2E] transition-colors group-hover:bg-[#9F1D1D]"><mat-icon aria-hidden="true" class="text-[18px] text-[#E7C777] group-hover:text-white">arrow_forward</mat-icon></span></div></div></div>
              </a>
            }
          </div>
        } @else {
          <div class="rounded-3xl border border-dashed border-[#24314A] bg-[#0B1224] px-6 py-12 text-center"><mat-icon aria-hidden="true" class="!h-12 !w-12 !text-5xl text-[#64748B]">article</mat-icon><h2 class="mt-3 text-lg font-black text-[#F8FAFC]">Yeni rehberler yakında burada</h2><p class="mt-2 text-sm text-[#94A3B8]">Yolculuğunuzu kolaylaştıracak yeni içerikler için tekrar uğrayın.</p></div>
        }
      </section>
    </main>
  `,
})
export class BlogListComponent implements OnInit {
  private readonly detailData = inject(PublicDetailDataService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly blogPosts = signal<BlogDetailPost[]>([]);
  readonly loading = signal(true);
  readonly error = signal("");

  ngOnInit(): void { void this.load(); }
  async load(): Promise<void> {
    this.loading.set(true); this.error.set("");
    try { this.blogPosts.set(await this.detailData.loadBlogList()); }
    catch { this.blogPosts.set([]); this.error.set("BLOG_UNAVAILABLE"); }
    finally { this.loading.set(false); }
  }
  goBack(): void { if (typeof window !== "undefined" && window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }
}
