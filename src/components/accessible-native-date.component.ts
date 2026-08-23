import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

let nextDateControlId = 0;

@Component({
  selector: "app-accessible-native-date",
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="date-control">
      <span class="date-label" [id]="labelId">{{ label }}</span>
      <button
        type="button"
        class="date-button"
        [disabled]="disabled"
        [attr.aria-labelledby]="labelId"
        [attr.aria-describedby]="value ? valueId : null"
        [attr.aria-label]="buttonAccessibleName()"
        (click)="openPicker()"
      >
        <span class="button-copy">
          <strong>Tarihi seç</strong>
          <small [id]="valueId">{{ value ? formattedValue() : 'Takvimden seçin' }}</small>
        </span>
        <mat-icon aria-hidden="true">calendar_month</mat-icon>
      </button>

      <input
        #picker
        class="native-date-proxy"
        type="date"
        [value]="value"
        [min]="min"
        [max]="max"
        [disabled]="disabled"
        aria-hidden="true"
        tabindex="-1"
        (change)="emitInput($event)"
      />
    </div>
  `,
  styles: [`
    :host{display:block;min-width:0}.date-control{position:relative;display:block;min-width:0}.date-label{display:block;margin-bottom:.38rem;color:var(--date-label,#b9c3d2);font-size:.66rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.date-button{display:flex;width:100%;min-height:52px;align-items:center;justify-content:space-between;gap:.7rem;border:1px solid var(--date-border,rgba(148,163,184,.24));border-radius:12px;background:var(--date-bg,#050c1a);padding:.58rem .78rem .58rem .9rem;color:var(--date-color,#fff);text-align:left;outline:none;touch-action:manipulation}.date-button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.date-button:disabled{opacity:.55}.button-copy{display:block;min-width:0}.button-copy strong,.button-copy small{display:block}.button-copy strong{font:900 .8rem/1.2 ui-sans-serif,system-ui,sans-serif}.button-copy small{margin-top:.18rem;color:var(--date-hint,#8f9db0);font:700 .66rem/1.25 ui-sans-serif,system-ui,sans-serif}.date-button mat-icon{flex:0 0 auto;color:#93c5fd}.native-date-proxy{position:absolute!important;left:0;bottom:0;width:1px!important;height:1px!important;min-height:0!important;opacity:.01;pointer-events:none;border:0!important;padding:0!important;clip-path:inset(50%);overflow:hidden}@media(prefers-reduced-motion:reduce){.date-button{transition:none!important}}
  `],
})
export class AccessibleNativeDateComponent {
  @Input({ required: true }) label = "Tarih";
  @Input() value = "";
  @Input() min = "";
  @Input() max = "";
  @Input() disabled = false;
  @Output() readonly valueChange = new EventEmitter<string>();
  @ViewChild("picker") private picker?: ElementRef<HTMLInputElement>;

  readonly controlId = ++nextDateControlId;
  readonly labelId = `accessible-date-label-${this.controlId}`;
  readonly valueId = `accessible-date-value-${this.controlId}`;

  openPicker(): void {
    if (this.disabled) return;
    const input = this.picker?.nativeElement;
    if (!input) return;

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // Some embedded browsers block showPicker even during a user gesture.
    }

    try {
      input.focus({ preventScroll: true });
      input.click();
    } catch {
      // If a legacy browser cannot open a native picker, the control remains stable.
    }
  }

  emitInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    if (next !== this.value) this.valueChange.emit(next);
  }

  formattedValue(): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.value || "");
    if (!match) return this.value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime())
      ? this.value
      : new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  }

  buttonAccessibleName(): string {
    const selected = this.value ? `, seçili tarih ${this.formattedValue()}` : "";
    return `${this.normalizedLabel()} için tarihi seç${selected}`;
  }

  private normalizedLabel(): string {
    const raw = this.label.trim();
    return raw || "Tarih";
  }
}
