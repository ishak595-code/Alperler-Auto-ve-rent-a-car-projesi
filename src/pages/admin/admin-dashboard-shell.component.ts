import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { AdminDashboardComponent } from "./admin-dashboard.component";

@Component({
  selector: "app-admin-dashboard-shell",
  standalone: true,
  imports: [RouterLink, MatIconModule, AdminDashboardComponent],
  template: `
    <section class="border-b border-slate-200 bg-slate-950 px-4 py-5 text-white md:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="mb-4">
          <p class="text-[10px] font-black uppercase tracking-[.2em] text-blue-400">İçerik ve Operasyon Merkezi</p>
          <h2 class="mt-1 text-xl font-black">Hızlı Yönetim</h2>
          <p class="mt-1 text-xs text-slate-400">Siteyi oluşturan canlı veritabanı modüllerine doğrudan erişin.</p>
        </div>
        <nav class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Admin hızlı yönetim araçları">
          @for (item of tools; track item.route) {
            <a
              [routerLink]="item.route"
              class="group flex min-h-20 flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <mat-icon class="text-blue-400">{{ item.icon }}</mat-icon>
              <span class="mt-3 text-xs font-black leading-tight text-white">{{ item.label }}</span>
            </a>
          }
        </nav>
      </div>
    </section>
    <app-admin-dashboard />
  `,
})
export class AdminDashboardShellComponent {
  readonly tools = [
    { route: "/admin/homepage", icon: "view_quilt", label: "Ana Sayfa Vitrini" },
    { route: "/admin/campaigns", icon: "campaign", label: "Kampanyalar" },
    { route: "/admin/media", icon: "perm_media", label: "Fotoğraf & Video" },
    { route: "/admin/catalog-editor", icon: "tune", label: "Tam Katalog Editörü" },
    { route: "/admin/team", icon: "groups", label: "Ekip & Şubeler" },
    { route: "/admin/settings", icon: "settings", label: "İletişim & WhatsApp" },
  ];
}
