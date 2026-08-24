import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

let nextDateControlId = 0;

@Component({
  selector: "app-accessible-native-date",
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="date-control">
      <span class="date-label">{{ normalizedLabel() }}</span>
      <label class="date-surface" [class.disabled]="disabled" [for]="inputId">
        <span class="date-copy" aria-hidden="true">
          <strong>Tarihi seç</strong>
          @if (value) { <small>{{ formattedValue() }}</small> }
        </span>
        <mat-icon aria-hidden="true">calendar_month</mat-icon>

        <input
          [id]="inputId"
          class="native-date-control"
          type="date"
          [value]="value"
          [min]="min"
          [max]="max"
          [disabled]="disabled"
          aria-label="Tarihi seç"
          title="Tarihi seç"
          (input)="emitInput($event)"
          (change)="emitInput($event)"
        />
      </label>
    </div>
  `,
  styles: [`
    :host{display:block;min-width:0}.date-control{display:block;min-width:0}.date-label{display:block;margin-bottom:.38rem;color:var(--date-label,var(--alper-muted,#b9c3d2));font-size:.66rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.date-surface{position:relative;display:flex;width:100%;min-height:58px;align-items:center;justify-content:space-between;gap:.7rem;overflow:hidden;border:1px solid var(--date-border,var(--alper-border,rgba(148,163,184,.24)));border-radius:min(var(--site-radius,12px),16px);background:var(--date-bg,var(--alper-card,#050c1a));padding:.72rem .82rem .72rem .92rem;color:var(--date-color,var(--alper-text,#fff));text-align:left;cursor:pointer;transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease}.date-surface:focus-within{border-color:var(--date-focus,var(--alper-blue-light,#60a5fa));box-shadow:0 0 0 3px color-mix(in srgb,var(--date-focus,var(--alper-blue-light,#60a5fa)) 20%,transparent)}.date-surface:active{transform:translateY(1px)}.date-surface.disabled{cursor:not-allowed;opacity:.55}.date-copy{display:block;min-width:0;pointer-events:none}.date-copy strong,.date-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.date-copy strong{font:900 .82rem/1.2 ui-sans-serif,system-ui,sans-serif}.date-copy small{margin-top:.18rem;color:var(--date-hint,var(--alper-subtle,#8f9db0));font:700 .66rem/1.25 ui-sans-serif,system-ui,sans-serif}.date-surface mat-icon{flex:0 0 auto;color:var(--date-icon,var(--alper-blue-light,#93c5fd));pointer-events:none}.native-date-control{position:absolute!important;inset:0!important;z-index:2;width:100%!important;height:100%!important;min-height:100%!important;margin:0!important;border:0!important;border-radius:inherit!important;padding:0!important;background:transparent!important;color:transparent!important;-webkit-text-fill-color:transparent!important;font-size:0!important;caret-color:transparent!important;cursor:pointer;touch-action:manipulation}.native-date-control:focus{outline:0}.native-date-control:disabled{cursor:not-allowed}@media(prefers-reduced-motion:reduce){.date-surface{transition:none!important}}
  `],
})
export class AccessibleNativeDateComponent {
  readonly inputId = `alperler-native-date-${++nextDateControlId}`;

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

  normalizedLabel(): string {
    const label = String(this.label || "").trim();
    return label || "Tarih";
  }

  formattedValue(): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.value || "");
    if (!match) return this.value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime())
      ? this.value
      : new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  }
}
