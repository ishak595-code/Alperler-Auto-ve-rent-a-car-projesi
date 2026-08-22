import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";

let nextDateControlId = 0;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

@Component({
  selector: "app-accessible-native-date",
  standalone: true,
  template: `
    <fieldset class="date-control" [disabled]="disabled">
      <legend class="date-label">{{ label }}</legend>
      <div class="date-grid" [attr.aria-label]="label">
        <label class="segment" [for]="dayId">
          <span>Gün</span>
          <select
            [id]="dayId"
            [value]="day"
            [disabled]="disabled"
            [attr.aria-label]="label + ' gün seç'"
            (change)="changeDay($event)"
          >
            <option value="">Gün</option>
            @for (value of days(); track value) {
              <option [value]="value" [disabled]="!candidateAllowed(year, month, value)">{{ value }}</option>
            }
          </select>
        </label>

        <label class="segment month" [for]="monthId">
          <span>Ay</span>
          <select
            [id]="monthId"
            [value]="month"
            [disabled]="disabled"
            [attr.aria-label]="label + ' ay seç'"
            (change)="changeMonth($event)"
          >
            <option value="">Ay</option>
            @for (item of months; track item.value) {
              <option [value]="item.value" [disabled]="!monthAllowed(year, item.value)">{{ item.label }}</option>
            }
          </select>
        </label>

        <label class="segment" [for]="yearId">
          <span>Yıl</span>
          <select
            [id]="yearId"
            [value]="year"
            [disabled]="disabled"
            [attr.aria-label]="label + ' yıl seç'"
            (change)="changeYear($event)"
          >
            <option value="">Yıl</option>
            @for (value of years(); track value) {
              <option [value]="value">{{ value }}</option>
            }
          </select>
        </label>
      </div>
      <p class="date-hint">{{ value ? formattedValue() : 'Tarih seçmek için gün, ay ve yılı belirleyin.' }}</p>
    </fieldset>
  `,
  styles: [`
    :host{display:block;min-width:0}.date-control{min-width:0;margin:0;border:0;padding:0}.date-label{display:block;width:100%;margin:0 0 .38rem;padding:0;color:var(--date-label,#b9c3d2);font-size:.66rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.date-grid{display:grid;grid-template-columns:.78fr 1.35fr 1fr;gap:.45rem}.segment{display:grid;min-width:0;gap:.22rem}.segment>span{color:var(--date-label,#9aa8bb);font-size:.58rem;font-weight:850}.segment select{display:block;width:100%;min-height:52px;border:1px solid var(--date-border,rgba(148,163,184,.24));border-radius:12px;background:var(--date-bg,#050c1a);padding:0 .55rem;color:var(--date-color,#fff);font:800 .78rem/1.2 ui-sans-serif,system-ui,sans-serif;outline:none;color-scheme:dark;touch-action:manipulation}.segment select:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.segment select:disabled{opacity:.55}.date-hint{margin:.38rem 0 0;color:var(--date-hint,#7f8da1);font-size:.6rem;line-height:1.4}@media(max-width:350px){.date-grid{grid-template-columns:.72fr 1.28fr 1fr;gap:.3rem}.segment select{padding:0 .35rem;font-size:.72rem}}@media(prefers-reduced-motion:reduce){.segment select{scroll-behavior:auto}}
  `],
})
export class AccessibleNativeDateComponent implements OnChanges {
  @Input({ required: true }) label = "Tarih";
  @Input() value = "";
  @Input() min = "";
  @Input() max = "";
  @Input() disabled = false;
  @Output() readonly valueChange = new EventEmitter<string>();

  readonly controlId = ++nextDateControlId;
  readonly dayId = `accessible-date-day-${this.controlId}`;
  readonly monthId = `accessible-date-month-${this.controlId}`;
  readonly yearId = `accessible-date-year-${this.controlId}`;
  readonly months = [
    { value: 1, label: "Ocak" }, { value: 2, label: "Şubat" }, { value: 3, label: "Mart" },
    { value: 4, label: "Nisan" }, { value: 5, label: "Mayıs" }, { value: 6, label: "Haziran" },
    { value: 7, label: "Temmuz" }, { value: 8, label: "Ağustos" }, { value: 9, label: "Eylül" },
    { value: 10, label: "Ekim" }, { value: 11, label: "Kasım" }, { value: 12, label: "Aralık" },
  ];

  year: number | "" = "";
  month: number | "" = "";
  day: number | "" = "";

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["value"] || changes["min"] || changes["max"]) this.syncFromValue();
  }

  years(): number[] {
    const now = new Date().getFullYear();
    const minimum = this.parse(this.min)?.year ?? now;
    const maximum = this.parse(this.max)?.year ?? minimum + 10;
    const selected = typeof this.year === "number" ? this.year : this.parse(this.value)?.year;
    const start = Math.min(minimum, selected ?? minimum);
    const end = Math.max(maximum, selected ?? maximum);
    return Array.from({ length: Math.max(1, end - start + 1) }, (_, index) => start + index);
  }

  days(): number[] {
    const count = typeof this.year === "number" && typeof this.month === "number"
      ? new Date(this.year, this.month, 0).getDate()
      : 31;
    return Array.from({ length: count }, (_, index) => index + 1);
  }

  changeDay(event: Event): void {
    this.day = this.numberOrEmpty((event.target as HTMLSelectElement).value);
    this.emitIfComplete();
  }

  changeMonth(event: Event): void {
    this.month = this.numberOrEmpty((event.target as HTMLSelectElement).value);
    this.repairDay();
    this.emitIfComplete();
  }

  changeYear(event: Event): void {
    this.year = this.numberOrEmpty((event.target as HTMLSelectElement).value);
    this.repairDay();
    this.emitIfComplete();
  }

  monthAllowed(year: number | "", month: number): boolean {
    if (typeof year !== "number") return true;
    const first = this.toDate({ year, month, day: 1 });
    const last = this.toDate({ year, month, day: new Date(year, month, 0).getDate() });
    const minDate = this.boundary(this.min);
    const maxDate = this.boundary(this.max);
    return (!minDate || last >= minDate) && (!maxDate || first <= maxDate);
  }

  candidateAllowed(year: number | "", month: number | "", day: number): boolean {
    if (typeof year !== "number" || typeof month !== "number") return true;
    const candidate = this.toDate({ year, month, day });
    const minDate = this.boundary(this.min);
    const maxDate = this.boundary(this.max);
    return (!minDate || candidate >= minDate) && (!maxDate || candidate <= maxDate);
  }

  formattedValue(): string {
    const parts = this.parse(this.value);
    if (!parts) return "";
    const date = this.toDate(parts);
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  }

  private syncFromValue(): void {
    const parts = this.parse(this.value);
    if (!parts) {
      this.year = "";
      this.month = "";
      this.day = "";
      return;
    }
    this.year = parts.year;
    this.month = parts.month;
    this.day = parts.day;
    this.repairDay();
  }

  private emitIfComplete(): void {
    if (typeof this.year !== "number" || typeof this.month !== "number" || typeof this.day !== "number") return;
    if (!this.candidateAllowed(this.year, this.month, this.day)) return;
    const next = `${this.year}-${String(this.month).padStart(2, "0")}-${String(this.day).padStart(2, "0")}`;
    if (next !== this.value) this.valueChange.emit(next);
  }

  private repairDay(): void {
    if (typeof this.day !== "number" || typeof this.year !== "number" || typeof this.month !== "number") return;
    const lastDay = new Date(this.year, this.month, 0).getDate();
    if (this.day > lastDay) this.day = "";
  }

  private parse(value: string): DateParts | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
    if (!match) return null;
    const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    const date = this.toDate(parts);
    if (date.getFullYear() !== parts.year || date.getMonth() + 1 !== parts.month || date.getDate() !== parts.day) return null;
    return parts;
  }

  private boundary(value: string): Date | null {
    const parts = this.parse(value);
    return parts ? this.toDate(parts) : null;
  }

  private toDate(parts: DateParts): Date {
    return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  }

  private numberOrEmpty(value: string): number | "" {
    const parsed = Number(value);
    return value && Number.isInteger(parsed) ? parsed : "";
  }
}
