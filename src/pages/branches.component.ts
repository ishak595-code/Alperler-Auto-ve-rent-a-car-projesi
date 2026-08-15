import { CommonModule, Location } from "@angular/common";
import { Component, inject } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { BranchService } from "../services/branch.service";

@Component({
  selector: "app-branches",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-slate-950 pb-28 text-slate-200">
      <header class="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div class="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4">
          <button type="button" (click)="location.back()" aria-label="Şubelerden geri dön" class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <div class="min-w-0"><h1 class="truncate text-xl font-black text-white">Şubeler ve Teslimat Noktaları</h1><p class="text-xs text-slate-400">Size en uygun hizmet noktasını bulun</p></div>
        </div>
      </header>

      <section class="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div class="mb-8 max-w-3xl">
          <div class="text-xs font-black uppercase tracking-[0.18em] text-blue-400">Alperler Auto</div>
          <h2 class="mt-2 text-3xl font-black text-white sm:text-4xl">Size uygun hizmet noktasını seçin</h2>
          <p class="mt-3 leading-relaxed text-slate-400">Adres, çalışma saatleri ve sunulan hizmetleri karşılaştırın. Araç teslim alma, iade, satış veya tur işlemleriniz için size en uygun noktaya doğrudan ulaşabilirsiniz.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (branch of branchService.branches(); track branch.id) {
            <article class="flex min-h-full flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0"><div class="text-xs font-bold uppercase tracking-wider text-blue-400">{{ branch.city }} / {{ branch.district }}</div><h3 class="mt-1 text-xl font-black text-white">{{ branch.name }}</h3></div>
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><mat-icon aria-hidden="true">storefront</mat-icon></div>
              </div>

              <div class="mt-5 space-y-3 text-sm">
                <div class="flex items-start gap-3"><mat-icon class="shrink-0 text-slate-500" aria-hidden="true">location_on</mat-icon><span>{{ branch.addressLabel }}</span></div>
                <div class="flex items-center gap-3"><mat-icon class="shrink-0 text-slate-500" aria-hidden="true">call</mat-icon><a [href]="'tel:' + branch.phone" class="font-bold text-white hover:text-blue-300">{{ branch.phone }}</a></div>
                @if (branch.email) { <div class="flex items-center gap-3"><mat-icon class="shrink-0 text-slate-500" aria-hidden="true">mail</mat-icon><a [href]="'mailto:' + branch.email" class="min-w-0 break-all hover:text-blue-300">{{ branch.email }}</a></div> }
              </div>

              @if (branch.workingHours.length) {
                <div class="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4" aria-label="Çalışma saatleri">
                  @for (row of branch.workingHours; track row.label + row.value) { <div class="flex justify-between gap-4 py-1 text-xs"><span class="text-slate-500">{{ row.label }}</span><span class="text-right font-bold text-slate-300">{{ row.value }}</span></div> }
                </div>
              }

              <div class="mt-5 flex flex-wrap gap-2" aria-label="Sunulan hizmetler">
                @for (service of branch.services; track service) { <span class="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold text-blue-200">{{ serviceLabel(service) }}</span> }
              </div>

              <div class="mt-auto pt-6"><a [href]="'tel:' + branch.phone" class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 font-black text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"><mat-icon aria-hidden="true">call</mat-icon>Şubeyi Ara</a></div>
            </article>
          }
        </div>
      </section>
    </main>
  `,
})
export class BranchesComponent {
  readonly branchService = inject(BranchService);
  readonly location = inject(Location);

  serviceLabel(value: string): string {
    return ({ RENTAL: "Araç Kiralama", SALES: "Araç Satış", TOUR: "Tur", TRANSFER: "Transfer", PICKUP: "Araç Teslim Alma", RETURN: "Araç İade" } as Record<string,string>)[value] || value;
  }
}
