import { DestroyRef, Injectable, ViewportScroller, inject } from '@angular/core';
import { Router, Scroll as RouterScroll } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DeferredRouteScrollRestorationService {
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportScroller);
  private readonly destroyRef = inject(DestroyRef);
  private retryTimer?: number;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    this.router.events
      .pipe(
        filter((event): event is RouterScroll => event instanceof RouterScroll),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.cancelRetry();
        if (!event.position || typeof window === 'undefined') return;
        this.restoreWhenScrollable(event.position);
      });

    this.destroyRef.onDestroy(() => this.cancelRetry());
  }

  private restoreWhenScrollable(position: [number, number]): void {
    const [targetX, targetY] = position;
    const startedAt = performance.now();
    const timeoutMs = 5000;

    const attempt = (): void => {
      const maxScrollY = Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight || 0,
      ) - window.innerHeight;
      const boundedMaxY = Math.max(0, maxScrollY);
      const elapsed = performance.now() - startedAt;

      if (boundedMaxY >= targetY || elapsed >= timeoutMs) {
        const y = Math.min(targetY, boundedMaxY);
        this.viewport.scrollToPosition([targetX, y]);
        if (Math.abs(window.scrollY - y) <= 2 || elapsed >= timeoutMs) return;
      }

      this.retryTimer = window.setTimeout(attempt, 50);
    };

    requestAnimationFrame(attempt);
  }

  private cancelRetry(): void {
    if (this.retryTimer === undefined || typeof window === 'undefined') return;
    window.clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
  }
}
