import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { AdminOperationsDashboardComponent } from "./admin-operations-dashboard.component";

@Component({
  selector: "app-admin-dashboard-shell",
  standalone: true,
  imports: [RouterLink, MatIconModule, AdminOperationsDashboardComponent],
  template: `
    <section class="border-b border-slate-200 bg-slate-950 px-4 py-5 text-white md:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="mb-4">
          <p class="text-[10px] font-black uppercase tracking-[.2em] text-blue-400">İçerik, Analitik ve Operasyon Merkezi</p>
          <h2 class="mt-1 text-xl font-black">Hızlı Yönetim</h2>
          <p class="mt-1 text-xs text-slate-400">Production veritabanı, ziyaretçi davranışı, yayın, ekip, medya ve müşteri operasyonlarına doğrudan erişin.</p>
        </div>
        <nav class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Admin hızlı yönetim araçları">
          @for (item of tools; track item.route) {
            <a [routerLink]="item.route" [attr.aria-label]="item.label" class="group flex min-h-20 flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              <mat-icon class="text-blue-400" aria-hidden="true">{{ item.icon }}</mat-icon>
              <span class="mt-3 text-xs font-black leading-tight text-white">{{ item.label }}</span>
            </a>
          }
        </nav>
      </div>
    </section>
    <app-admin-operations-dashboard />
  `,
})
export class AdminDashboardShellComponent {
  readonly tools = [
    { route: "/admin/analytics", icon: "query_stats", label: "Ziyaretçi Analitiği" },
    { route: "/admin/homepage", icon: "view_quilt", label: "Ana Sayfa Vitrini" },
    { route: "/admin/navigation", icon: "menu_open", label: "Mobil Menü & Alt Bar" },
    { route: "/admin/campaigns", icon: "campaign", label: "Kampanyalar" },
    { route: "/admin/media", icon: "perm_media", label: "Fotoğraf & Video" },
    { route: "/admin/catalog-editor", icon: "tune", label: "Tam Katalog Editörü" },
    { route: "/admin/reservations", icon: "event_note", label: "Rezervasyonlar" },
    { route: "/admin/partner-requests", icon: "directions_car", label: "Araç Başvuruları" },
    { route: "/admin/branch-partner-requests", icon: "add_business", label: "Şube Başvuruları" },
    { route: "/admin/feedback", icon: "mark_email_unread", label: "Mesaj Kutusu" },
    { route: "/admin/subscribers", icon: "mark_email_read", label: "Bülten Merkezi" },
    { route: "/admin/team", icon: "groups", label: "Ekip & Yetkiler" },
    { route: "/admin/assignments", icon: "assignment_ind", label: "Görev Merkezi" },
    { route: "/admin/branches", icon: "storefront", label: "Şubeler" },
    { route: "/admin/whatsapp", icon: "chat", label: "WhatsApp Ayarları" },
    { route: "/admin/system-health", icon: "monitor_heart", label: "Sistem Sağlığı" },
    { route: "/admin/audit", icon: "history", label: "İşlem Geçmişi" },
  ];
}
