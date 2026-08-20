import { Component, inject } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { RouterLink, Router } from "@angular/router";
import { CarService } from "../services/car.service";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-blog-list",
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <main class="min-h-screen bg-slate-950 pb-20 font-sans text-slate-300">
      <header class="sticky top-0 z-50 border-b border-slate-800 bg-slate-900 shadow-lg">
        <div class="mx-auto max-w-7xl px-4"><div class="flex h-16 items-center gap-3"><button type="button" (click)="goBack()" class="-ml-2 grid min-h-12 min-w-12 place-items-center rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button><h1 class="min-w-0 text-lg font-bold text-white">Alperler Rent A Car Rehberi</h1></div></div>
      </header>

      <section class="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8" aria-label="Blog yazıları">
        <div class="mb-8 max-w-3xl sm:mb-10"><p class="text-[10px] font-black uppercase tracking-[.16em] text-blue-400">Rehber ve İçerikler</p><h2 class="mt-1 text-2xl font-black text-white sm:text-3xl">Yola çıkmadan önce bilmeniz gerekenler</h2><p class="mt-2 text-sm leading-6 text-slate-400 sm:text-base">Araç kullanımı, bölgesel rotalar ve seyahat planlamasına ilişkin güncel içerikleri okuyun.</p></div>

        @if (blogPosts().length) {
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            @for (post of blogPosts(); track post.id) {
              <a [routerLink]="['/blog', post.cloudSlug || post.cloudId || post.id]" [attr.aria-label]="post.title + ' yazısını aç'" class="group relative top-0 flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white text-slate-900 shadow-sm transition-all duration-300 hover:-top-1 hover:border-blue-200 hover:shadow-xl active:top-0 active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <div class="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  @if (post.image) {<img [src]="post.image" [alt]="post.title + ' yazısı kapak görseli'" loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                  @else {<div class="grid h-full w-full place-items-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400" aria-label="Bu yazı için kapak görseli eklenmedi"><mat-icon aria-hidden="true" class="!h-12 !w-12 !text-5xl">article</mat-icon></div>}
                  <span class="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-800 shadow-sm">{{ post.readTime }}</span>
                </div>
                <div class="flex flex-grow flex-col p-5 sm:p-6 lg:p-7"><div class="mb-3 flex items-center text-xs font-medium text-slate-400"><mat-icon aria-hidden="true" class="mr-1 !h-[14px] !w-[14px] !text-[14px]">calendar_today</mat-icon>{{ post.date }}</div><h3 class="line-clamp-2 text-xl font-black leading-tight text-slate-900 transition-colors group-hover:text-blue-600">{{ post.title }}</h3><p class="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-500">{{ post.summary }}</p><div class="mt-auto border-t border-slate-100 pt-5"><div class="flex min-h-11 items-center justify-between gap-3"><span class="text-xs font-black uppercase tracking-widest text-blue-600">Yazıyı Aç</span><span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 transition-colors group-hover:bg-blue-600"><mat-icon aria-hidden="true" class="text-[18px] text-blue-600 group-hover:text-white">arrow_forward</mat-icon></span></div></div></div>
              </a>
            }
          </div>
        } @else {
          <div class="rounded-3xl border border-dashed border-slate-700 bg-slate-900 px-6 py-12 text-center"><mat-icon aria-hidden="true" class="!h-12 !w-12 !text-5xl text-slate-600">article</mat-icon><h2 class="mt-3 text-lg font-black text-white">Henüz yayınlanmış yazı yok</h2><p class="mt-2 text-sm text-slate-400">Yönetim panelinden yayınlanan içerikler burada otomatik görünür.</p></div>
        }
      </section>
    </main>
  `,
})
export class BlogListComponent {
  private readonly carService = inject(CarService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly blogPosts = this.carService.getBlogPosts();
  goBack(): void { if (typeof window !== "undefined" && window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }
}
