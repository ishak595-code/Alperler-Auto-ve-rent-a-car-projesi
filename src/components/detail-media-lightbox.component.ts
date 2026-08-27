import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';

export type DetailMediaItem = {
  kind: 'IMAGE' | 'VIDEO';
  url: string;
  posterUrl?: string;
  title?: string;
};

@Component({
  selector: 'app-detail-media-lightbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open && items.length) {
      <div
        #dialog
        class="overlay"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title || 'Medya tam ekran görünümü'"
        tabindex="-1"
        (keydown)="onKeydown($event)"
        (touchstart)="touchStart($event)"
        (touchend)="touchEnd($event)"
        (click)="backdropClick($event)"
      >
        <button #closeButton type="button" class="close" (click)="requestClose()" aria-label="Tam ekran medyayı kapat">×</button>

        @if (currentItem(); as media) {
          <div class="stage" (click)="$event.stopPropagation()">
            @if (media.kind === 'IMAGE') {
              <img [src]="media.url" [alt]="media.title || title || 'Detay görseli'" decoding="async" />
            } @else {
              <video [src]="media.url" [poster]="media.posterUrl || ''" controls playsinline preload="metadata" [attr.aria-label]="media.title || title || 'Detay videosu'"></video>
            }
          </div>
        }

        @if (items.length > 1) {
          <button type="button" class="nav previous" (click)="previous(); $event.stopPropagation()" aria-label="Önceki medya">‹</button>
          <button type="button" class="nav next" (click)="next(); $event.stopPropagation()" aria-label="Sonraki medya">›</button>
          <div class="count" aria-live="polite" aria-atomic="true">{{ normalizedIndex() + 1 }} / {{ items.length }}</div>
        }
      </div>
    }
  `,
  styles: [`
    :host{display:contents}.overlay{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;background:rgba(2,6,23,.985);padding:64px 18px 72px;overscroll-behavior:contain;touch-action:pan-y;outline:0}.stage{display:grid;width:min(100%,1440px);height:min(82dvh,980px);place-items:center}.stage img,.stage video{display:block;max-width:100%;max-height:100%;object-fit:contain;border-radius:10px;background:#020617}.close,.nav{position:absolute;z-index:2;display:grid;place-items:center;border:1px solid rgba(255,255,255,.24);background:rgba(15,23,42,.9);color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.3)}.close{top:14px;right:14px;width:48px;height:48px;border-radius:14px;font-size:29px;line-height:1}.nav{top:50%;width:50px;height:56px;transform:translateY(-50%);border-radius:15px;font-size:35px}.previous{left:14px}.next{right:14px}.count{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(15,23,42,.9);padding:8px 12px;color:#fff;font-size:11px;font-weight:900}.close:focus-visible,.nav:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}@media(max-width:640px){.overlay{padding:58px 8px 68px}.stage{height:calc(100dvh - 126px)}.nav{width:44px;height:50px;background:rgba(15,23,42,.78)}.previous{left:8px}.next{right:8px}.close{top:9px;right:9px;width:46px;height:46px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
  `],
})
export class DetailMediaLightboxComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() items: DetailMediaItem[] = [];
  @Input() index = 0;
  @Input() title = '';
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly indexChange = new EventEmitter<number>();
  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;

  private invoker: HTMLElement | null = null;
  private previousBodyOverflow = '';
  private touchX = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) this.activateModal();
      else this.restorePageState();
    }
    if (changes['items'] || changes['index']) this.ensureValidIndex();
  }

  ngOnDestroy(): void {
    this.restorePageState(false);
  }

  currentItem(): DetailMediaItem | null {
    return this.items[this.normalizedIndex()] || null;
  }

  normalizedIndex(): number {
    if (!this.items.length) return 0;
    return Math.min(Math.max(0, Number.isFinite(this.index) ? Math.trunc(this.index) : 0), this.items.length - 1);
  }

  previous(): void {
    const length = this.items.length;
    if (length < 2) return;
    this.indexChange.emit((this.normalizedIndex() - 1 + length) % length);
  }

  next(): void {
    const length = this.items.length;
    if (length < 2) return;
    this.indexChange.emit((this.normalizedIndex() + 1) % length);
  }

  requestClose(): void {
    this.closed.emit();
  }

  backdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.requestClose();
  }

  touchStart(event: TouchEvent): void {
    this.touchX = event.changedTouches[0]?.clientX || 0;
  }

  touchEnd(event: TouchEvent): void {
    const end = event.changedTouches[0]?.clientX || 0;
    const delta = end - this.touchX;
    if (Math.abs(delta) < 45) return;
    delta < 0 ? this.next() : this.previous();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
      return;
    }
    if (event.key === 'Tab') this.trapTab(event);
  }

  private ensureValidIndex(): void {
    const normalized = this.normalizedIndex();
    if (this.items.length && normalized !== this.index) this.indexChange.emit(normalized);
  }

  private activateModal(): void {
    if (typeof document === 'undefined') return;
    this.invoker = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => {
      this.closeButton?.nativeElement.focus();
      if (!this.closeButton) this.dialog?.nativeElement.focus();
    });
  }

  private restorePageState(restoreFocus = true): void {
    if (typeof document !== 'undefined') document.body.style.overflow = this.previousBodyOverflow;
    if (restoreFocus && this.invoker?.isConnected) queueMicrotask(() => this.invoker?.focus());
    this.invoker = null;
  }

  private trapTab(event: KeyboardEvent): void {
    const root = this.dialog?.nativeElement;
    if (!root) return;
    const focusable = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),video[controls],[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter((element) => element.offsetParent !== null || element === document.activeElement);
    if (!focusable.length) {
      event.preventDefault();
      root.focus();
      return;
    }
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
}
