import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-accessible-native-date",
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="date-control">
      <span class="date-label" aria-hidden="true">{{ label }}</span>
      <div class="date-surface" [class.disabled]="disabled">
        <span class="button-copy" aria-hidden="true">
          <strong>Tarihi seç</strong>
          <small>{{ value ? formattedValue() : 'Takvimden seçin' }}</small>
        </span>
        <mat-icon aria-hidden="true">calendar_month</mat-icon>

        <input
          class="native-date-control"
          type="date"
          [value]="value"
          [min]="min"
          [max]="max"
          [disabled]="disabled"
          [attr.aria-label]="inputAccessibleName()"
          [attr.title]="inputAccessibleName()"
          (input)="emitInput($event)"
          (change)="emitInput($event)"
        />
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;min-width:0}.date-control{display:block;min-width:0}.date-label{display:block;margin-bottom:.38rem;color:var(--date-label,#b9c3d2);font-size:.66rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.date-surface{position:relative;display:flex;width:100%;min-height:52px;align-items:center;justify-content:space-between;gap:.7rem;overflow:hidden;border:1px solid var(--date-border,rgba(148,163,184,.24));border-radius:12px;background:var(--date-bg,#050c1a);padding:.58rem .78rem .58rem .9rem;color:var(--date-color,#fff);text-align:left}.date-surface:focus-within{outline:3px solid #60a5fa;outline-offset:2px}.date-surface.disabled{opacity:.55}.button-copy{display:block;min-width:0;pointer-events:none}.button-copy strong,.button-copy small{display:block}.button-copy strong{font:900 .8rem/1.2 ui-sans-serif,system-ui,sans-serif}.button-copy small{margin-top:.18rem;color:var(--date-hint,#8f9db0);font:700 .66rem/1.25 ui-sans-serif,system-ui,sans-serif}.date-surface mat-icon{flex:0 0 auto;color:#93c5fd;pointer-events:none}.native-date-control{position:absolute!important;inset:0!important;z-index:2;width:100%!important;height:100%!important;min-height:100%!important;margin:0!important;border:0!important;border-radius:inherit!important;padding:0!important;opacity:.001;background:transparent!important;color:transparent!important;cursor:pointer;touch-action:manipulation}.native-date-control:focus{outline:0}.native-date-control:disabled{cursor:not-allowed}@media(prefers-reduced-motion:reduce){.date-surface{transition:none!important}}
  `],
})
export class AccessibleNativeDateComponent {
  @Input({ required: true }) label = "Tarih";
  @Input() value = "";
  @Input() min = "";
  @Input() max = "";
  @Input() disabled = false;
  @Output() readonly valueChange = new EventEmitter<string>();

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

  inputAccessibleName(): string {
    const selected = this.value ? `, seçili tarih ${this.formattedValue()}` : "";
    return `${this.normalizedLabel()}: Tarihi seç${selected}`;
  }

  private normalizedLabel(): string {
    const raw = this.label.trim();
    return raw || "Tarih";
  }
}
