import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-accessible-date-field",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <fieldset class="date-field" [disabled]="disabled">
      <legend>{{ label }}</legend>
      <div class="date-grid" role="group" [attr.aria-label]="label">
        <label>
          <span class="sr-only">{{ label }} gün</span>
          <select
            [ngModel]="day"
            (ngModelChange)="day = $event; emitValue()"
            [attr.aria-label]="label + ' gün'"
            [disabled]="disabled"
          >
            <option value="">Gün</option>
            @for (value of dayOptions(); track value) {
              <option [value]="pad(value)">{{ value }}</option>
            }
          </select>
        </label>

        <label>
          <span class="sr-only">{{ label }} ay</span>
          <select
            [ngModel]="month"
            (ngModelChange)="month = $event; normalizeDay(); emitValue()"
            [attr.aria-label]="label + ' ay'"
            [disabled]="disabled"
          >
            <option value="">Ay</option>
            @for (item of months; track item.value) {
              <option [value]="item.value">{{ item.label }}</option>
            }
          </select>
        </label>

        <label>
          <span class="sr-only">{{ label }} yıl</span>
          <select
            [ngModel]="year"
            (ngModelChange)="year = $event; normalizeDay(); emitValue()"
            [attr.aria-label]="label + ' yıl'"
            [disabled]="disabled"
          >
            <option value="">Yıl</option>
            @for (value of yearOptions(); track value) {
              <option [value]="String(value)">{{ value }}</option>
            }
          </select>
        </label>
      </div>
      @if (value) {
        <p class="date-summary" aria-live="polite">Seçili tarih: {{ displayValue() }}</p>
      }
    </fieldset>
  `,
  styles: [`
    :host{display:block}.date-field{min-width:0;border:0;padding:0;margin:0}.date-field legend{margin-bottom:.45rem;color:inherit;font-size:.72rem;font-weight:900;letter-spacing:.055em;text-transform:uppercase}.date-grid{display:grid;grid-template-columns:.72fr 1.25fr .9fr;gap:.45rem}.date-grid label{min-width:0}.date-grid select{width:100%;min-height:48px;border:1px solid var(--date-border,#cbd5e1);border-radius:12px;background:var(--date-bg,#fff);padding:0 .65rem;color:var(--date-color,#0f172a);font:800 .82rem/1.2 ui-sans-serif,system-ui,sans-serif;outline:none}.date-grid select:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.16)}.date-grid select:disabled{opacity:.55}.date-summary{margin:.4rem 0 0;color:var(--date-muted,#64748b);font-size:.68rem;font-weight:750}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:360px){.date-grid{grid-template-columns:.7fr 1.15fr .95fr}.date-grid select{padding:0 .45rem;font-size:.75rem}}
  `],
})
export class AccessibleDateFieldComponent implements OnChanges {
  @Input() label = "Tarih";
  @Input() value = "";
  @Input() min = "";
  @Input() max = "";
  @Input() disabled = false;
  @Output() readonly valueChange = new EventEmitter<string>();

  day = "";
  month = "";
  year = "";
  readonly String = String;
  readonly months = [
    { value: "01", label: "Ocak" }, { value: "02", label: "Şubat" },
    { value: "03", label: "Mart" }, { value: "04", label: "Nisan" },
    { value: "05", label: "Mayıs" }, { value: "06", label: "Haziran" },
    { value: "07", label: "Temmuz" }, { value: "08", label: "Ağustos" },
    { value: "09", label: "Eylül" }, { value: "10", label: "Ekim" },
    { value: "11", label: "Kasım" }, { value: "12", label: "Aralık" },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["value"]) this.syncFromValue(this.value);
  }

  yearOptions(): number[] {
    const today = new Date();
    const minYear = this.parseYear(this.min) || today.getFullYear();
    const maxYear = this.parseYear(this.max) || minYear + 5;
    const selectedYear = Number(this.year) || minYear;
    const start = Math.min(minYear, selectedYear);
    const end = Math.max(maxYear, selectedYear);
    return Array.from({ length: Math.max(1, end - start + 1) }, (_, index) => start + index);
  }

  dayOptions(): number[] {
    const year = Number(this.year) || new Date().getFullYear();
    const month = Number(this.month) || 1;
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: count }, (_, index) => index + 1);
  }

  normalizeDay(): void {
    if (!this.day) return;
    const maxDay = this.dayOptions().at(-1) || 31;
    if (Number(this.day) > maxDay) this.day = this.pad(maxDay);
  }

  emitValue(): void {
    if (!this.day || !this.month || !this.year) {
      this.valueChange.emit("");
      return;
    }
    const candidate = `${this.year}-${this.month}-${this.day}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return;
    this.valueChange.emit(candidate);
  }

  displayValue(): string {
    const parsed = this.parseDate(this.value);
    if (!parsed) return this.value;
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
  }

  pad(value: number): string {
    return String(value).padStart(2, "0");
  }

  private syncFromValue(value: string): void {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) {
      this.day = "";
      this.month = "";
      this.year = "";
      return;
    }
    this.year = match[1];
    this.month = match[2];
    this.day = match[3];
    this.normalizeDay();
  }

  private parseDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseYear(value: string): number | null {
    const match = /^(\d{4})-\d{2}-\d{2}$/.exec(value || "");
    return match ? Number(match[1]) : null;
  }
}
