import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

interface CalendarDay {
  key: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  disabled: boolean;
  ariaLabel: string;
}

let nextDateControlId = 0;

@Component({
  selector: "app-accessible-native-date",
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="date-control">
      <span class="date-label" [id]="labelId">{{ normalizedLabel() }}</span>

      <button
        #triggerButton
        class="date-surface"
        type="button"
        [disabled]="disabled"
        [attr.aria-label]="triggerAccessibleName()"
        aria-haspopup="dialog"
        [attr.aria-expanded]="dialogOpen"
        [attr.aria-controls]="dialogOpen ? dialogId : null"
        (click)="openCalendar()"
      >
        <span class="date-copy" aria-hidden="true">
          <strong>Tarihi seç</strong>
          @if (value) { <small>{{ formattedValue() }}</small> }
        </span>
        <mat-icon aria-hidden="true">calendar_month</mat-icon>
      </button>
    </div>

    @if (dialogOpen) {
      <dialog
        #calendarDialog
        class="calendar-dialog"
        [id]="dialogId"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="dialogTitleId"
        (keydown)="onDialogKeydown($event)"
        (pointerdown)="onDialogPointerDown($event)"
      >
        <div class="calendar-dialog-content" (pointerdown)="$event.stopPropagation()">
          <header class="calendar-header">
            <div>
              <p class="calendar-context">{{ normalizedLabel() }}</p>
              <h2 [id]="dialogTitleId">Tarih seç</h2>
            </div>
            <button class="calendar-icon-button" type="button" aria-label="Takvimi kapat" (click)="closeCalendar(true)">
              <mat-icon aria-hidden="true">close</mat-icon>
            </button>
          </header>

          <div class="calendar-month-row">
            <button
              class="calendar-icon-button"
              type="button"
              aria-label="Önceki ay"
              [disabled]="previousMonthDisabled()"
              (click)="changeMonth(-1)"
            >
              <mat-icon aria-hidden="true">chevron_left</mat-icon>
            </button>

            <div class="calendar-month" aria-live="polite" aria-atomic="true">{{ monthTitle() }}</div>

            <button
              class="calendar-icon-button"
              type="button"
              aria-label="Sonraki ay"
              [disabled]="nextMonthDisabled()"
              (click)="changeMonth(1)"
            >
              <mat-icon aria-hidden="true">chevron_right</mat-icon>
            </button>
          </div>

          <div class="calendar-weekdays" aria-hidden="true">
            @for (weekday of weekdays; track weekday) { <span>{{ weekday }}</span> }
          </div>

          <div class="calendar-grid" role="group" [attr.aria-label]="monthTitle() + ' tarihleri'">
            @for (day of calendarDays(); track day.key) {
              <button
                class="calendar-day"
                type="button"
                [class.outside]="!day.isCurrentMonth"
                [class.today]="day.isToday"
                [class.selected]="day.isSelected"
                [disabled]="day.disabled"
                [attr.data-date]="day.key"
                [attr.tabindex]="dayTabIndex(day)"
                [attr.aria-label]="day.ariaLabel"
                [attr.aria-current]="day.isToday ? 'date' : null"
                [attr.aria-pressed]="day.isSelected"
                (focus)="activeDateKey = day.key"
                (keydown)="onDayKeydown($event, day.key)"
                (click)="selectDate(day.key)"
              >
                {{ day.day }}
              </button>
            }
          </div>

          <footer class="calendar-footer">
            @if (value) {
              <button class="calendar-secondary" type="button" (click)="clearDate()">Tarihi temizle</button>
            }
            <button class="calendar-secondary" type="button" (click)="selectToday()" [disabled]="todayDisabled()">Bugün</button>
          </footer>
        </div>
      </dialog>
    }
  `,
  styles: [`
    :host{display:block;min-width:0}
    .date-control{display:block;min-width:0}
    .date-label{display:block;margin-bottom:.38rem;color:var(--date-label,var(--alper-muted,#b9c3d2));font-size:.66rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
    .date-surface{display:flex;width:100%;min-height:58px;align-items:center;justify-content:space-between;gap:.7rem;border:1px solid var(--date-border,var(--alper-border,rgba(148,163,184,.24)));border-radius:min(var(--site-radius,12px),16px);background:var(--date-bg,var(--alper-card,#050c1a));padding:.72rem .82rem .72rem .92rem;color:var(--date-color,var(--alper-text,#fff));text-align:left;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:border-color .16s ease,box-shadow .16s ease,background-color .16s ease}
    .date-surface:focus-visible{outline:0;border-color:var(--date-focus,var(--alper-blue-light,#60a5fa));box-shadow:0 0 0 3px color-mix(in srgb,var(--date-focus,var(--alper-blue-light,#60a5fa)) 24%,transparent)}
    .date-surface:active:not(:disabled){border-color:var(--date-focus,var(--alper-blue-light,#60a5fa));background:color-mix(in srgb,var(--date-bg,var(--alper-card,#050c1a)) 92%,var(--date-focus,var(--alper-blue-light,#60a5fa)) 8%)}
    .date-surface:disabled{cursor:not-allowed;opacity:.55}
    .date-copy{display:block;min-width:0}
    .date-copy strong,.date-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .date-copy strong{font:900 .82rem/1.2 ui-sans-serif,system-ui,sans-serif}
    .date-copy small{margin-top:.18rem;color:var(--date-hint,var(--alper-muted,#b9c3d2));font:700 .66rem/1.25 ui-sans-serif,system-ui,sans-serif}
    .date-surface mat-icon{flex:0 0 auto;color:var(--date-icon,var(--alper-blue-light,#93c5fd))}
    .calendar-dialog{position:fixed;inset:0;margin:auto;width:min(calc(100% - 2rem),420px);max-height:min(88dvh,720px);overflow:auto;overscroll-behavior:contain;border:1px solid var(--alper-border,rgba(148,163,184,.24));border-radius:min(var(--site-radius,16px),22px);background:var(--alper-card,#071120);color:var(--alper-text,#fff);box-shadow:0 24px 70px rgba(0,0,0,.46);padding:0}
    .calendar-dialog::backdrop{background:rgba(1,6,15,.72);backdrop-filter:blur(8px)}
    .calendar-dialog-content{padding:1rem}
    .calendar-header,.calendar-month-row,.calendar-footer{display:flex;align-items:center}
    .calendar-header{justify-content:space-between;gap:1rem}
    .calendar-context{margin:0 0 .15rem;color:var(--alper-muted,#b9c3d2);font:800 .67rem/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}
    .calendar-header h2{margin:0;font:900 1.05rem/1.25 ui-sans-serif,system-ui,sans-serif}
    .calendar-month-row{justify-content:space-between;gap:.65rem;margin:.9rem 0 .65rem}
    .calendar-month{min-width:0;text-align:center;font:900 .84rem/1.2 ui-sans-serif,system-ui,sans-serif}
    .calendar-icon-button{display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border:1px solid var(--alper-border,rgba(148,163,184,.24));border-radius:12px;background:var(--alper-surface,#0b1627);color:var(--alper-text,#fff);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .calendar-icon-button:disabled{opacity:.35;cursor:not-allowed}
    .calendar-icon-button:focus-visible,.calendar-day:focus-visible,.calendar-secondary:focus-visible{outline:3px solid color-mix(in srgb,var(--alper-blue-light,#60a5fa) 65%,transparent);outline-offset:2px}
    .calendar-weekdays,.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.3rem}
    .calendar-weekdays{margin-bottom:.3rem;color:var(--alper-muted,#b9c3d2);font:800 .62rem/1.1 ui-sans-serif,system-ui,sans-serif;text-align:center}
    .calendar-weekdays span{padding:.25rem 0}
    .calendar-day{width:100%;min-width:0;aspect-ratio:1;border:1px solid transparent;border-radius:11px;background:transparent;color:var(--alper-text,#fff);font:800 .74rem/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .calendar-day.outside{color:var(--alper-muted,#b9c3d2);opacity:.88}
    .calendar-day.today{border-color:var(--alper-blue-light,#60a5fa)}
    .calendar-day.selected{background:var(--alper-blue,#2563eb);color:#fff;border-color:var(--alper-blue-light,#60a5fa)}
    .calendar-day:disabled{opacity:.3;cursor:not-allowed}
    .calendar-footer{justify-content:flex-end;flex-wrap:wrap;gap:.5rem;margin-top:.85rem}
    .calendar-secondary{min-height:44px;border:1px solid var(--alper-border,rgba(148,163,184,.24));border-radius:11px;background:var(--alper-surface,#0b1627);padding:.65rem .85rem;color:var(--alper-text,#fff);font:850 .72rem/1.2 ui-sans-serif,system-ui,sans-serif;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .calendar-secondary:disabled{opacity:.4;cursor:not-allowed}
    @media(max-width:600px){
      .calendar-dialog{inset:auto 0 0 0;margin:0;width:100%;max-width:none;max-height:88dvh;border-radius:20px 20px 0 0}
      .calendar-dialog-content{padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom))}
      .calendar-day{min-height:44px;aspect-ratio:auto}
    }
    @media(prefers-reduced-motion:reduce){.date-surface{transition:none!important}}
  `],
})
export class AccessibleNativeDateComponent implements OnDestroy {
  readonly inputId = `alperler-date-${++nextDateControlId}`;
  readonly labelId = `${this.inputId}-label`;
  readonly dialogId = `${this.inputId}-dialog`;
  readonly dialogTitleId = `${this.inputId}-dialog-title`;
  readonly weekdays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  @ViewChild("triggerButton") private triggerButton?: ElementRef<HTMLButtonElement>;
  @ViewChild("calendarDialog") private calendarDialog?: ElementRef<HTMLDialogElement>;

  @Input({ required: true }) label = "Tarih";
  @Input() value = "";
  @Input() min = "";
  @Input() max = "";
  @Input() disabled = false;
  @Output() readonly valueChange = new EventEmitter<string>();

  dialogOpen = false;
  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth();
  activeDateKey = "";
  private previousBodyOverflow = "";
  private bodyScrollLocked = false;

  ngOnDestroy(): void {
    const dialog = this.calendarDialog?.nativeElement;
    if (dialog?.open) dialog.close();
    this.restoreBodyScroll();
  }

  normalizedLabel(): string {
    const label = String(this.label || "").trim();
    return label || "Tarih";
  }

  triggerAccessibleName(): string {
    return this.value
      ? `${this.normalizedLabel()}: ${this.formattedValue()}, tarihi değiştir`
      : `${this.normalizedLabel()}: Tarihi seç`;
  }

  formattedValue(): string {
    const date = this.parseDateKey(this.value);
    return date ? this.formatLongDate(date) : this.value;
  }

  openCalendar(): void {
    if (this.disabled || this.dialogOpen) return;
    const initial = this.initialDateKey();
    const date = this.parseDateKey(initial) || new Date();
    this.viewYear = date.getFullYear();
    this.viewMonth = date.getMonth();
    this.activeDateKey = initial;
    this.dialogOpen = true;
    this.lockBodyScroll();
    this.afterRender(() => this.showDialog());
    this.afterRender(() => this.focusDate(initial));
  }

  closeCalendar(restoreFocus = true): void {
    if (!this.dialogOpen) return;
    const dialog = this.calendarDialog?.nativeElement;
    if (dialog?.open) dialog.close();
    this.dialogOpen = false;
    this.restoreBodyScroll();
    if (restoreFocus) this.afterRender(() => this.triggerButton?.nativeElement.focus({ preventScroll: true }));
  }

  onDialogPointerDown(event: PointerEvent): void {
    if (event.target === event.currentTarget) this.closeCalendar(true);
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.closeCalendar(true);
      return;
    }
    if (event.key !== "Tab") return;
    const dialog = this.calendarDialog?.nativeElement;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
      .filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  calendarDays(): CalendarDay[] {
    const first = new Date(this.viewYear, this.viewMonth, 1, 12);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(this.viewYear, this.viewMonth, 1 - mondayOffset, 12);
    const todayKey = this.toDateKey(new Date());
    const selectedKey = this.isValidDateKey(this.value) ? this.value : "";
    const days: CalendarDay[] = [];

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12);
      const key = this.toDateKey(date);
      days.push({
        key,
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === this.viewMonth && date.getFullYear() === this.viewYear,
        isToday: key === todayKey,
        isSelected: key === selectedKey,
        disabled: !this.isWithinBounds(key),
        ariaLabel: this.dayAccessibleName(date, key === selectedKey, key === todayKey),
      });
    }
    return days;
  }

  dayTabIndex(day: CalendarDay): number {
    return day.key === this.activeDateKey && !day.disabled ? 0 : -1;
  }

  monthTitle(): string {
    return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" })
      .format(new Date(this.viewYear, this.viewMonth, 1, 12));
  }

  changeMonth(delta: number): void {
    const month = new Date(this.viewYear, this.viewMonth + delta, 1, 12);
    const preferredDay = this.parseDateKey(this.activeDateKey)?.getDate() || 1;
    const maxDay = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12).getDate();
    this.moveActiveDate(new Date(month.getFullYear(), month.getMonth(), Math.min(preferredDay, maxDay), 12));
  }

  previousMonthDisabled(): boolean {
    return !this.monthHasEnabledDate(this.viewYear, this.viewMonth - 1);
  }

  nextMonthDisabled(): boolean {
    return !this.monthHasEnabledDate(this.viewYear, this.viewMonth + 1);
  }

  selectDate(key: string): void {
    if (!this.isWithinBounds(key)) return;
    this.activeDateKey = key;
    if (key !== this.value) this.valueChange.emit(key);
    this.closeCalendar(true);
  }

  clearDate(): void {
    if (this.value) this.valueChange.emit("");
    this.closeCalendar(true);
  }

  selectToday(): void {
    const key = this.toDateKey(new Date());
    if (this.isWithinBounds(key)) this.selectDate(key);
  }

  todayDisabled(): boolean {
    return !this.isWithinBounds(this.toDateKey(new Date()));
  }

  onDayKeydown(event: KeyboardEvent, key: string): void {
    let deltaDays = 0;
    if (event.key === "ArrowLeft") deltaDays = -1;
    else if (event.key === "ArrowRight") deltaDays = 1;
    else if (event.key === "ArrowUp") deltaDays = -7;
    else if (event.key === "ArrowDown") deltaDays = 7;
    else if (event.key === "Home") deltaDays = -(((this.parseDateKey(key)?.getDay() ?? 1) + 6) % 7);
    else if (event.key === "End") deltaDays = 6 - (((this.parseDateKey(key)?.getDay() ?? 1) + 6) % 7);
    else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      event.stopPropagation();
      this.changeMonth(event.key === "PageUp" ? -1 : 1);
      return;
    } else return;

    event.preventDefault();
    event.stopPropagation();
    const current = this.parseDateKey(key);
    if (!current) return;
    this.moveActiveDate(new Date(current.getFullYear(), current.getMonth(), current.getDate() + deltaDays, 12));
  }

  private showDialog(): void {
    const dialog = this.calendarDialog?.nativeElement;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }

  private moveActiveDate(target: Date): void {
    const nextKey = this.nearestEnabledDateKey(target);
    const next = this.parseDateKey(nextKey);
    if (!next) return;
    this.viewYear = next.getFullYear();
    this.viewMonth = next.getMonth();
    this.activeDateKey = nextKey;
    this.afterRender(() => this.focusDate(nextKey));
  }

  private focusDate(key: string): void {
    const dialog = this.calendarDialog?.nativeElement;
    if (!dialog?.open) return;
    const day = dialog.querySelector<HTMLButtonElement>(`button.calendar-day[data-date="${key}"]:not([disabled])`);
    if (day) day.focus({ preventScroll: true });
    else dialog.querySelector<HTMLButtonElement>("button.calendar-day:not([disabled])")?.focus({ preventScroll: true });
  }

  private initialDateKey(): string {
    if (this.isValidDateKey(this.value) && this.isWithinBounds(this.value)) return this.value;
    const today = this.toDateKey(new Date());
    if (this.isWithinBounds(today)) return today;
    if (this.isValidDateKey(this.min)) return this.min;
    if (this.isValidDateKey(this.max)) return this.max;
    return today;
  }

  private nearestEnabledDateKey(date: Date): string {
    const candidate = this.toDateKey(date);
    if (this.isWithinBounds(candidate)) return candidate;
    if (this.isValidDateKey(this.min) && candidate < this.min) return this.min;
    if (this.isValidDateKey(this.max) && candidate > this.max) return this.max;
    return candidate;
  }

  private monthHasEnabledDate(year: number, month: number): boolean {
    const first = new Date(year, month, 1, 12);
    const normalizedYear = first.getFullYear();
    const normalizedMonth = first.getMonth();
    const firstKey = this.toDateKey(new Date(normalizedYear, normalizedMonth, 1, 12));
    const lastKey = this.toDateKey(new Date(normalizedYear, normalizedMonth + 1, 0, 12));
    if (this.isValidDateKey(this.max) && firstKey > this.max) return false;
    if (this.isValidDateKey(this.min) && lastKey < this.min) return false;
    return true;
  }

  private isWithinBounds(key: string): boolean {
    if (!this.isValidDateKey(key)) return false;
    if (this.isValidDateKey(this.min) && key < this.min) return false;
    if (this.isValidDateKey(this.max) && key > this.max) return false;
    return true;
  }

  private dayAccessibleName(date: Date, selected: boolean, today: boolean): string {
    const parts = [this.formatLongDate(date)];
    if (today) parts.push("bugün");
    if (selected) parts.push("seçili");
    return parts.join(", ");
  }

  private formatLongDate(date: Date): string {
    return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  private parseDateKey(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 12);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }

  private isValidDateKey(value: string): boolean {
    return Boolean(this.parseDateKey(value));
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private afterRender(callback: () => void): void {
    setTimeout(callback, 0);
  }

  private lockBodyScroll(): void {
    if (this.bodyScrollLocked || typeof document === "undefined") return;
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this.bodyScrollLocked = true;
  }

  private restoreBodyScroll(): void {
    if (!this.bodyScrollLocked || typeof document === "undefined") return;
    document.body.style.overflow = this.previousBodyOverflow;
    this.bodyScrollLocked = false;
  }
}