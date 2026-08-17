import { Component } from "@angular/core";
import { AdminOperationsDashboardComponent } from "./admin-operations-dashboard.component";

@Component({
  selector: "app-admin-dashboard-shell",
  standalone: true,
  imports: [AdminOperationsDashboardComponent],
  template: `
    <section class="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
      <div class="mx-auto max-w-7xl">
        <p class="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Canlı Kontrol Merkezi</p>
        <h1 class="mt-1 text-2xl font-black text-slate-950">Operasyon ve İstatistikler</h1>
        <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Burada yalnız karar vermenizi gerektiren canlı özetler bulunur. Tüm yönetim modüllerine üstteki Menü düğmesinden ulaşabilirsiniz; liste ekranlarında arama, filtre ve yeni kayıt işlemleri ilk görünen üst araç çubuğunda tutulur.</p>
      </div>
    </section>
    <app-admin-operations-dashboard />
  `,
})
export class AdminDashboardShellComponent {}
