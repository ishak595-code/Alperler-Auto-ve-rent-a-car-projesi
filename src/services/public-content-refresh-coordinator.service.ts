import { Injectable, inject, signal } from "@angular/core";
import { BranchService } from "./branch.service";
import { CampaignService } from "./campaign.service";
import { CarService } from "./car.service";
import { HomepageLayoutService } from "./homepage-layout.service";

type PublicRefreshTaskKey = "config" | "homepage" | "branches" | "campaigns" | "catalog";
type PublicRefreshReason = "start" | "timer" | "visible" | "online" | "manual";

interface PublicRefreshTask {
  key: PublicRefreshTaskKey;
  cadenceMs: number;
  run: () => Promise<unknown>;
}

export interface PublicContentRefreshState {
  running: boolean;
  online: boolean;
  visible: boolean;
  lastReason?: PublicRefreshReason;
  lastCycleAt?: number;
  failures: Partial<Record<PublicRefreshTaskKey, number>>;
}

const ACTIVE_CONTENT_CADENCE_MS = 60_000;
const CONFIG_CADENCE_MS = 5 * 60_000;
const BRANCH_DIRECTORY_CADENCE_MS = 5 * 60_000;
const FAILURE_RETRY_BASE_MS = 15_000;
const MIN_TIMER_DELAY_MS = 80;

@Injectable({ providedIn: "root" })
export class PublicContentRefreshCoordinatorService {
  private readonly carService = inject(CarService);
  private readonly campaignService = inject(CampaignService);
  private readonly branchService = inject(BranchService);
  private readonly homepageLayout = inject(HomepageLayoutService);

  private readonly tasks: PublicRefreshTask[] = [
    {
      key: "config",
      cadenceMs: CONFIG_CADENCE_MS,
      run: () => this.carService.refreshSiteConfig(true),
    },
    {
      key: "homepage",
      cadenceMs: ACTIVE_CONTENT_CADENCE_MS,
      run: () => this.homepageLayout.refreshPublicState(),
    },
    {
      key: "branches",
      cadenceMs: BRANCH_DIRECTORY_CADENCE_MS,
      run: () => this.branchService.refresh(),
    },
    {
      key: "campaigns",
      cadenceMs: ACTIVE_CONTENT_CADENCE_MS,
      run: () => this.campaignService.refreshPublicState(),
    },
    {
      key: "catalog",
      cadenceMs: ACTIVE_CONTENT_CADENCE_MS,
      run: () => this.carService.refreshCloudCatalog(true),
    },
  ];

  private readonly nextDueAt = new Map<PublicRefreshTaskKey, number>();
  private readonly failureCounts = new Map<PublicRefreshTaskKey, number>();
  private timer?: number;
  private started = false;
  private cycleInFlight = false;
  private forceAfterCycle = false;
  private readonly _state = signal<PublicContentRefreshState>({
    running: false,
    online: this.isOnline(),
    visible: this.isVisible(),
    failures: {},
  });

  readonly state = this._state.asReadonly();

  start(): void {
    if (typeof window === "undefined" || this.started) return;
    this.started = true;
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    const now = Date.now();
    const startup = this.startupOffsets();
    for (const task of this.tasks) {
      this.nextDueAt.set(task.key, now + startup[task.key]);
    }
    void this.runCycle(false, "start");
  }

  stop(): void {
    if (typeof window === "undefined" || !this.started) return;
    this.started = false;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.clearTimer();
    this._state.update((value) => ({ ...value, running: false }));
  }

  refreshNow(reason: PublicRefreshReason = "manual"): void {
    if (!this.started || !this.canRun()) return;
    void this.runCycle(true, reason);
  }

  private readonly handleOnline = () => {
    this._state.update((value) => ({ ...value, online: true }));
    this.refreshNow("online");
  };

  private readonly handleOffline = () => {
    this.clearTimer();
    this._state.update((value) => ({ ...value, online: false, running: false }));
  };

  private readonly handleVisibilityChange = () => {
    const visible = this.isVisible();
    this._state.update((value) => ({ ...value, visible }));
    if (!visible) {
      this.clearTimer();
      return;
    }
    this.refreshNow("visible");
  };

  private async runCycle(forceAll: boolean, reason: PublicRefreshReason): Promise<void> {
    if (!this.started || !this.canRun()) return;
    if (this.cycleInFlight) {
      if (forceAll) this.forceAfterCycle = true;
      return;
    }

    this.cycleInFlight = true;
    this.clearTimer();
    this._state.update((value) => ({
      ...value,
      running: true,
      online: true,
      visible: true,
      lastReason: reason,
    }));

    try {
      const now = Date.now();
      const dueTasks = this.tasks.filter((task) => forceAll || (this.nextDueAt.get(task.key) ?? 0) <= now);
      if (dueTasks.length === 0) return;

      const results = await Promise.allSettled(dueTasks.map((task) => task.run()));
      const completedAt = Date.now();
      const failures: Partial<Record<PublicRefreshTaskKey, number>> = { ...this._state().failures };

      results.forEach((result, index) => {
        const task = dueTasks[index];
        if (result.status === "fulfilled") {
          this.failureCounts.set(task.key, 0);
          delete failures[task.key];
          this.nextDueAt.set(task.key, completedAt + this.withJitter(task.cadenceMs));
          return;
        }

        const count = (this.failureCounts.get(task.key) ?? 0) + 1;
        this.failureCounts.set(task.key, count);
        failures[task.key] = count;
        const retryMs = Math.min(task.cadenceMs, FAILURE_RETRY_BASE_MS * 2 ** Math.min(count - 1, 3));
        this.nextDueAt.set(task.key, completedAt + this.withJitter(retryMs));
        console.info(`Public content refresh deferred for ${task.key}.`, result.reason);
      });

      this._state.update((value) => ({ ...value, lastCycleAt: completedAt, failures }));
    } finally {
      this.cycleInFlight = false;
      this._state.update((value) => ({ ...value, running: false }));
      if (this.forceAfterCycle) {
        this.forceAfterCycle = false;
        void this.runCycle(true, reason);
        return;
      }
      this.scheduleNextCycle();
    }
  }

  private scheduleNextCycle(): void {
    if (!this.started || !this.canRun() || typeof window === "undefined") return;
    const now = Date.now();
    const next = Math.min(...this.tasks.map((task) => this.nextDueAt.get(task.key) ?? now));
    const delay = Math.max(MIN_TIMER_DELAY_MS, next - now);
    this.clearTimer();
    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      void this.runCycle(false, "timer");
    }, delay);
  }

  private startupOffsets(): Record<PublicRefreshTaskKey, number> {
    // Every dataset rendered on the homepage is first-paint critical. Starting
    // all owners together prevents viewport-dependent or timer-dependent gaps
    // while Promise.allSettled keeps one slow/failing source from blocking the
    // rest of the page. Recurring refreshes remain independently cadenced.
    return { config: 0, homepage: 0, branches: 0, campaigns: 0, catalog: 0 };
  }

  private clearTimer(): void {
    if (this.timer === undefined || typeof window === "undefined") return;
    window.clearTimeout(this.timer);
    this.timer = undefined;
  }

  private canRun(): boolean {
    return this.isOnline() && this.isVisible();
  }

  private isOnline(): boolean {
    return typeof navigator === "undefined" || navigator.onLine !== false;
  }

  private isVisible(): boolean {
    return typeof document === "undefined" || document.visibilityState === "visible";
  }

  private withJitter(value: number): number {
    const spread = Math.max(500, Math.floor(value * 0.08));
    return Math.max(MIN_TIMER_DELAY_MS, value - spread + Math.floor(Math.random() * spread * 2));
  }
}