import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs/operators";
import { RuntimeControlsService } from "../services/runtime-controls.service";

@Component({
  selector: "app-runtime-status-gate",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (!isAdminRoute() && controls.controls().maintenanceMode) {
      <section class="fixed inset-0 z-[490] flex items-center justify-center bg-[#050b16] px-5 py-10 text-white" role="alertdialog" aria-modal="true" aria-labelledby="maintenance-title" aria-describedby="maintenance-description">
        <div class="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1526] p-6 shadow-[0_40px_100px_rgba(0,0,0,.55)] sm:p-9">
          <div aria-hidden="true" class="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl"></div>
          <div class="relative">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/10 text-blue-300"><mat-icon aria-hidden="true">engineering</mat-icon></div>
            <p class="mt-6 text-xs font-black uppercase tracking-[.2em] text-blue-300">Alperler Auto sistem durumu</p>
            <h1 id="maintenance-title" class="mt-2 font-serif text-3xl font-black leading-tight sm:text-4xl">{{ controls.controls().maintenanceTitle }}</h1>
            <p id="maintenance-description" class="mt-4 text-sm leading-7 text-slate-300 sm:text-base">{{ controls.controls().maintenanceMessage }}</p>
            @if (controls.controls().statusMessage) { <p class="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-slate-200">{{ controls.controls().statusMessage }}</p> }
            <button type="button" (click)="retry()" [disabled]="controls.loading()" class="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 font-black text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60">
              <mat-icon aria-hidden="true">refresh</mat-icon>{{ controls.loading() ? 'Kontrol ediliyor…' : 'Durumu Yeniden Kontrol Et' }}
            </button>
          </div>
        </div>
      </section>
    } @else if (!isAdminRoute() && controls.controls().readOnlyMode) {
      <div role="status" class="fixed inset-x-0 top-[72px] z-[89] border-y border-amber-300/30 bg-amber-100 px-4 py-2 text-center text-xs font-bold text-amber-950 shadow-sm md:top-[96px]">
        Şu anda görüntüleme modu aktif. Rezervasyon ve yeni başvuru işlemleri kısa süreliğine durduruldu.
      </div>
    }
  `,
})
export class RuntimeStatusGateComponent {
  readonly controls = inject(RuntimeControlsService);
  private readonly router = inject(Router);
  readonly isAdminRoute = signal(false);

  constructor() {
    this.updateRoute(this.router.url);
    void this.controls.refresh(true);
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.updateRoute((event as NavigationEnd).urlAfterRedirects);
      void this.controls.refresh();
    });
  }

  async retry(): Promise<void> { await this.controls.refresh(true); }

  private updateRoute(url: string): void {
    const path = url.split("?")[0].split("#")[0];
    this.isAdminRoute.set(path.startsWith("/admin"));
  }
}
