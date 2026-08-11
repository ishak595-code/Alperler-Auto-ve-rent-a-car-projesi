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
    <div class="bg-slate-950 text-slate-300 min-h-screen font-sans pb-20">
      <!-- Sticky Module Header -->
      <div
        class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"
      >
        <div class="max-w-7xl mx-auto px-4">
          <div class="h-16 flex items-center gap-3">
            <button
              (click)="goBack()"
              class="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors shrink-0"
              aria-label="Geri Dön"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold text-white">
              Alperler Keşif Rehberi
            </h1>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="text-center mb-16">
          <p class="text-slate-500 max-w-2xl mx-auto">
            Yüksekova'nın doğası, tarihi ve araç kiralama dünyasına dair her
            şey.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          @for (post of blogPosts(); track post.id) {
            <div
              [routerLink]="['/blog', post.id]"
              class="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col h-full cursor-pointer relative top-0 hover:-top-2 border border-slate-100"
            >
              <div class="h-60 overflow-hidden relative">
                <img
                  [src]="post.image"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                ></div>
                <div
                  class="absolute top-4 left-4 bg-white text-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm"
                >
                  {{ post.readTime }}
                </div>
              </div>
              <div class="p-8 flex flex-col flex-grow bg-white">
                <div
                  class="flex items-center text-xs text-slate-400 font-medium mb-3"
                >
                  <mat-icon class="text-[14px] w-[14px] h-[14px] mr-1"
                    >calendar_today</mat-icon
                  >
                  {{ post.date }}
                </div>
                <h3
                  class="font-bold text-xl text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight"
                >
                  {{ post.title }}
                </h3>
                <p
                  class="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3"
                >
                  {{ post.summary }}
                </p>

                <div class="mt-auto border-t border-slate-100 pt-4">
                  <div class="flex items-center justify-between w-full py-2 hover:opacity-80 active:opacity-60 transition-opacity">
                    <span
                      class="text-blue-600 font-bold uppercase text-xs tracking-widest"
                    >
                      Devamını Oku
                    </span>
                    <div
                      class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors"
                    >
                      <mat-icon class="text-blue-600 text-[18px] group-hover:text-white"
                        >arrow_forward</mat-icon
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class BlogListComponent {
  carService = inject(CarService);
  router = inject(Router);
  blogPosts = this.carService.getBlogPosts();

  location = inject(Location);

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(["/"]);
    }
  }
}
