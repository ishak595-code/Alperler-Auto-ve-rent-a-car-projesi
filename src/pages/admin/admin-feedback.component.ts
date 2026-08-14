import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  ContactAdminRecord,
  ContactAdminService,
  ContactStatus,
} from "../../services/contact-admin.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-feedback",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-900">
      <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-5 shadow-sm backdrop-blur md:px-8">
        <div class="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="goBack()"
              aria-label="Kontrol paneline dön"
              class="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              ←
            </button>
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Müşteri İletişimi</p>
              <h1 class="text-2xl font-black tracking-tight text-slate-950">Mesaj Kutusu</h1>
              <p class="mt-1 text-xs text-slate-500">Web iletişim formundan Supabase'e güvenli kaydedilen gerçek mesajlar.</p>
            </div>
          </div>

          <button
            type="button"
            (click)="refresh()"
            [disabled]="contactService.loading()"
            class="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {{ contactService.loading() ? "Yenileniyor..." : "Mesajları Yenile" }}
          </button>
        </div>
      </header>

      <section class="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          @for (item of statusCards; track item.value) {
            <button
              type="button"
              (click)="setFilter(item.value)"
              [class.ring-2]="filter() === item.value"
              [class.ring-blue-500]="filter() === item.value"
              class="min-h-20 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300"
            >
              <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">{{ item.label }}</span>
              <strong class="mt-1 block text-2xl font-black text-slate-950">{{ countFor(item.value) }}</strong>
            </button>
          }
        </div>

        <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]">
          <label class="block">
            <span class="sr-only">Mesajlarda ara</span>
            <input
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              type="search"
              autocomplete="off"
              placeholder="Referans, ad, telefon, e-posta veya mesaj içinde ara..."
              class="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white"
            />
          </label>
          <select
            [ngModel]="filter()"
            (ngModelChange)="setFilter($event)"
            aria-label="Mesaj durumuna göre filtrele"
            class="min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black"
          >
            <option value="ALL">Tüm durumlar</option>
            <option value="NEW">Yeni</option>
            <option value="READ">Okundu</option>
            <option value="REPLIED">Yanıtlandı</option>
            <option value="ARCHIVED">Arşiv</option>
          </select>
        </div>

        @if (contactService.error()) {
          <div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            Mesaj kaynağına ulaşılamadı: {{ contactService.error() }}
          </div>
        }

        @if (contactService.loading() && contactService.records().length === 0) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center font-bold text-slate-500">Mesajlar yükleniyor...</div>
        } @else {
          <div class="grid gap-4">
            @for (item of filteredMessages(); track item.id) {
              <article
                class="rounded-2xl border bg-white p-5 shadow-sm transition md:p-6"
                [class.border-blue-300]="item.status === 'NEW'"
                [class.border-slate-200]="item.status !== 'NEW'"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span [class]="statusClass(item.status)" class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">{{ statusLabel(item.status) }}</span>
                      <span class="font-mono text-xs font-black text-slate-500">{{ item.reference }}</span>
                      <span class="text-xs text-slate-400">{{ item.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
                    </div>

                    <h2 class="mt-4 break-words text-lg font-black text-slate-950">{{ item.name }}</h2>
                    <div class="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      <a [href]="'mailto:' + item.email" class="font-bold text-blue-700 hover:underline">{{ item.email }}</a>
                      @if (item.phone) {
                        <a [href]="'tel:' + item.phone" class="font-bold text-slate-700 hover:underline">{{ item.phone }}</a>
                      }
                    </div>
                    @if (item.subject) {
                      <p class="mt-3 text-xs font-black uppercase tracking-wider text-slate-400">{{ item.subject }}</p>
                    }
                    <p class="mt-4 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{{ item.message }}</p>
                  </div>

                  <div class="w-full space-y-3 lg:w-72">
                    <label class="block">
                      <span class="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Durum</span>
                      <select
                        [ngModel]="item.status"
                        (ngModelChange)="changeStatus(item, $event)"
                        [disabled]="savingReference() === item.reference"
                        class="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black disabled:opacity-50"
                      >
                        <option value="NEW">Yeni</option>
                        <option value="READ">Okundu</option>
                        <option value="REPLIED">Yanıtlandı</option>
                        <option value="ARCHIVED">Arşiv</option>
                      </select>
                    </label>

                    <label class="block">
                      <span class="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">İç not</span>
                      <textarea
                        #noteBox
                        rows="3"
                        [value]="item.internalNotes || ''"
                        maxlength="2000"
                        class="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        placeholder="Müşteriye gösterilmez"
                      ></textarea>
                    </label>
                    <button
                      type="button"
                      (click)="saveNote(item, noteBox.value)"
                      [disabled]="savingReference() === item.reference"
                      class="min-h-12 w-full rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                    >
                      {{ savingReference() === item.reference ? "Kaydediliyor..." : "Notu Kaydet" }}
                    </button>
                  </div>
                </div>
              </article>
            } @empty {
              <div class="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                <h2 class="text-lg font-black text-slate-800">Mesaj bulunamadı</h2>
                <p class="mt-2 text-sm text-slate-500">Seçili filtre veya arama için kayıt yok.</p>
              </div>
            }
          </div>
        }
      </section>
    </main>
  `,
})
export class AdminFeedbackComponent implements OnInit {
  readonly contactService = inject(ContactAdminService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly filter = signal<"ALL" | ContactStatus>("ALL");
  readonly searchQuery = signal("");
  readonly savingReference = signal("");

  readonly statusCards: Array<{ value: "ALL" | ContactStatus; label: string }> = [
    { value: "ALL", label: "Toplam" },
    { value: "NEW", label: "Yeni" },
    { value: "READ", label: "Okundu" },
    { value: "REPLIED", label: "Yanıtlandı" },
    { value: "ARCHIVED", label: "Arşiv" },
  ];

  readonly filteredMessages = computed(() => {
    const status = this.filter();
    const query = this.searchQuery().trim().toLocaleLowerCase("tr-TR");
    return this.contactService.records().filter((item) => {
      if (status !== "ALL" && item.status !== status) return false;
      if (!query) return true;
      return `${item.reference} ${item.name} ${item.email} ${item.phone || ""} ${item.subject || ""} ${item.message}`
        .toLocaleLowerCase("tr-TR")
        .includes(query);
    });
  });

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      await this.contactService.refresh();
    } catch {
      this.toastService.show("Mesaj kutusu yenilenemedi.", "error");
    }
  }

  setFilter(value: "ALL" | ContactStatus): void {
    this.filter.set(value);
  }

  countFor(status: "ALL" | ContactStatus): number {
    const records = this.contactService.records();
    return status === "ALL" ? records.length : records.filter((item) => item.status === status).length;
  }

  async changeStatus(item: ContactAdminRecord, status: ContactStatus): Promise<void> {
    if (item.status === status || this.savingReference()) return;
    this.savingReference.set(item.reference);
    try {
      await this.contactService.update(item.reference, status, item.internalNotes || "");
      this.toastService.show(`Mesaj durumu ${this.statusLabel(status).toLocaleLowerCase("tr-TR")} olarak kaydedildi.`, "success");
    } catch {
      this.toastService.show("Mesaj durumu güncellenemedi.", "error");
    } finally {
      this.savingReference.set("");
    }
  }

  async saveNote(item: ContactAdminRecord, internalNotes: string): Promise<void> {
    if (this.savingReference()) return;
    this.savingReference.set(item.reference);
    try {
      const nextStatus: ContactStatus = item.status === "NEW" ? "READ" : item.status;
      await this.contactService.update(item.reference, nextStatus, internalNotes.trim().slice(0, 2000));
      this.toastService.show("İç not güvenli şekilde kaydedildi.", "success");
    } catch {
      this.toastService.show("İç not kaydedilemedi.", "error");
    } finally {
      this.savingReference.set("");
    }
  }

  statusLabel(status: ContactStatus): string {
    const labels: Record<ContactStatus, string> = {
      NEW: "Yeni",
      READ: "Okundu",
      REPLIED: "Yanıtlandı",
      ARCHIVED: "Arşiv",
    };
    return labels[status];
  }

  statusClass(status: ContactStatus): string {
    const classes: Record<ContactStatus, string> = {
      NEW: "bg-blue-100 text-blue-800",
      READ: "bg-amber-100 text-amber-800",
      REPLIED: "bg-emerald-100 text-emerald-800",
      ARCHIVED: "bg-slate-200 text-slate-700",
    };
    return classes[status];
  }

  goBack(): void {
    void this.router.navigate(["/admin/dashboard"]);
  }
}
