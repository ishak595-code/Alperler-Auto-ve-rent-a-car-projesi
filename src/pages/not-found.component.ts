import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-not-found",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div
      class="min-h-[70vh] flex flex-col justify-center items-center px-4 text-center"
    >
      <h1 class="text-9xl font-black text-blue-500 drop-shadow-lg mb-4">404</h1>
      <h2 class="text-3xl font-bold text-slate-900 mb-6">Sayfa Bulunamadı</h2>
      <p class="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
        Aradığınız sayfaya ulaşılamıyor. URL'yi yanlış yazmış olabilirsiniz veya
        sayfa kaldırılmış olabilir.
      </p>
      <a
        routerLink="/"
        class="bg-slate-900 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-500 hover:text-slate-900 transition-all shadow-lg active:scale-95 flex items-center gap-2"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Ana Sayfaya Dön
      </a>
    </div>
  `,
})
export class NotFoundComponent {}
