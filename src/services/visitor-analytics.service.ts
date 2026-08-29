import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { supabaseFunctionUrl } from '../supabase.config';

export type AnalyticsConsent = 'unknown' | 'accepted' | 'rejected';
type AnalyticsEventType =
  | 'session_start'
  | 'page_view'
  | 'click'
  | 'rage_click'
  | 'scroll_depth'
  | 'form_start'
  | 'form_submit'
  | 'form_abandon'
  | 'js_error'
  | 'unhandled_rejection'
  | 'session_end';

interface QueuedEvent {
  id: string;
  type: AnalyticsEventType;
  path: string;
  pageTitle: string;
  event: Record<string, unknown>;
}

interface ActiveForm {
  name: string;
  path: string;
  submitted: boolean;
}

interface BookingEntryAttribution {
  step: 'entry_mobile_dock' | 'entry_home_closing_cta' | 'entry_other_appointment_link';
  section: 'mobile_dock' | 'closing_cta' | 'appointment_link';
}

const CONSENT_KEY = 'alperler.analytics.consent.v1';
const VISITOR_KEY = 'alperler.analytics.visitor.v1';
const SESSION_KEY = 'alperler.analytics.session.v1';
const BOOKING_FUNNEL = 'booking_conversion';
const FLUSH_MS = 5000;

@Injectable({ providedIn: 'root' })
export class VisitorAnalyticsService {
  private readonly router = inject(Router);
  private readonly endpoint = supabaseFunctionUrl('analytics-ingest');
  private readonly _consent = signal<AnalyticsConsent>('unknown');
  private started = false;
  private visitorId = '';
  private sessionId = '';
  private queue: QueuedEvent[] = [];
  private flushTimer: number | undefined;
  private currentPath = '/';
  private landingPath = '/';
  private readonly scrollMarks = new Map<string, Set<number>>();
  private readonly activeForms = new Map<HTMLFormElement, ActiveForm>();
  private lastClick = { key: '', at: 0, count: 0 };

  readonly consent = this._consent.asReadonly();

  init(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    const stored = window.localStorage.getItem(CONSENT_KEY);
    this._consent.set(stored === 'accepted' || stored === 'rejected' ? stored : 'unknown');
    if (this._consent() === 'accepted') this.startTracking();
  }

  accept(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CONSENT_KEY, 'accepted');
    this._consent.set('accepted');
    this.startTracking();
  }

  reject(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CONSENT_KEY, 'rejected');
    this._consent.set('rejected');
    this.stopTracking();
  }

  resetChoice(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(CONSENT_KEY);
    this._consent.set('unknown');
    this.stopTracking();
  }

  trackFunnel(name: string, step: string, metadata: Record<string, unknown> = {}): void {
    if (!this.isTrackingPath()) return;
    this.enqueue('click', { funnelName: this.clean(name, 120), funnelStep: this.clean(step, 120), metadata: this.safeMetadata(metadata) });
  }

  trackFormSuccess(name: string): void {
    if (!this.isTrackingPath()) return;
    this.enqueue('form_submit', { funnelName: this.clean(name, 120), funnelStep: 'success' });
  }

  private startTracking(): void {
    if (typeof window === 'undefined' || this.flushTimer !== undefined) return;
    this.visitorId = this.getOrCreateUuid(window.localStorage, VISITOR_KEY);
    this.sessionId = this.getOrCreateUuid(window.sessionStorage, SESSION_KEY);
    this.currentPath = this.safePath(location.pathname + location.search);
    this.landingPath = this.currentPath;

    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.abandonActiveForms('navigation');
      this.currentPath = this.safePath(event.urlAfterRedirects || event.url);
      if (this.isTrackingPath()) {
        this.enqueue('page_view', { metadata: { routeTo: this.currentPath } });
        this.scrollMarks.delete(this.currentPath);
      }
    });

    window.addEventListener('click', this.onClick, true);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('focusin', this.onFocusIn, true);
    window.addEventListener('submit', this.onSubmit, true);
    window.addEventListener('error', this.onError);
    window.addEventListener('unhandledrejection', this.onUnhandledRejection);
    window.addEventListener('pagehide', this.onPageHide);

    this.enqueue('session_start', {});
    if (this.isTrackingPath()) this.enqueue('page_view', {});
    this.flushTimer = window.setInterval(() => void this.flush(), FLUSH_MS);
  }

  private stopTracking(): void {
    if (typeof window === 'undefined') return;
    if (this.flushTimer !== undefined) window.clearInterval(this.flushTimer);
    this.flushTimer = undefined;
    this.queue = [];
    this.activeForms.clear();
    window.removeEventListener('click', this.onClick, true);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('focusin', this.onFocusIn, true);
    window.removeEventListener('submit', this.onSubmit, true);
    window.removeEventListener('error', this.onError);
    window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
    window.removeEventListener('pagehide', this.onPageHide);
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (!this.isTrackingPath()) return;
    const raw = event.target instanceof Element ? event.target : null;
    const target = raw?.closest('a,button,[role="button"],[data-analytics-key]') as HTMLElement | null;
    if (!target || this.isSensitiveElement(target)) return;
    const key = this.elementKey(target);
    const label = this.elementLabel(target);
    const href = target instanceof HTMLAnchorElement ? this.safeInternalHref(target.href) : '';
    const role = target.getAttribute('role') || target.tagName.toLowerCase();
    const pointerType = typeof PointerEvent !== 'undefined' && event instanceof PointerEvent ? event.pointerType || 'pointer' : 'mouse';
    const bookingEntry = this.bookingEntryAttribution(target, href);
    const now = Date.now();
    if (this.lastClick.key === key && now - this.lastClick.at < 2000) this.lastClick.count += 1;
    else this.lastClick = { key, at: now, count: 1 };
    this.lastClick.at = now;
    this.enqueue('click', {
      elementKey: key,
      elementLabel: label,
      elementRole: role,
      ...(bookingEntry ? { funnelName: BOOKING_FUNNEL, funnelStep: bookingEntry.step } : {}),
      metadata: this.safeMetadata({ href, pointerType, ...(bookingEntry ? { section: bookingEntry.section } : {}) }),
    });
    if (this.lastClick.count === 3) this.enqueue('rage_click', { elementKey: key, elementLabel: label, elementRole: role, metadata: { href } });
  };

  private readonly onScroll = (): void => {
    if (!this.isTrackingPath()) return;
    const doc = document.documentElement;
    const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
    const depth = Math.max(0, Math.min(100, Math.round((window.scrollY / scrollable) * 100)));
    const marks = this.scrollMarks.get(this.currentPath) || new Set<number>();
    for (const mark of [25, 50, 75, 90, 100]) {
      if (depth >= mark && !marks.has(mark)) {
        marks.add(mark);
        this.enqueue('scroll_depth', { scrollDepth: mark });
      }
    }
    this.scrollMarks.set(this.currentPath, marks);
  };

  private readonly onFocusIn = (event: FocusEvent): void => {
    if (!this.isTrackingPath()) return;
    const element = event.target instanceof HTMLElement ? event.target : null;
    if (!element || !['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) return;
    const form = element.closest('form');
    if (!form || this.activeForms.has(form)) return;
    const name = this.formName(form);
    this.activeForms.set(form, { name, path: this.currentPath, submitted: false });
    this.enqueue('form_start', { funnelName: name, funnelStep: 'started' });
  };

  private readonly onSubmit = (event: Event): void => {
    if (!this.isTrackingPath()) return;
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form) return;
    const existing = this.activeForms.get(form) || { name: this.formName(form), path: this.currentPath, submitted: false };
    existing.submitted = true;
    this.activeForms.set(form, existing);
    this.enqueue('form_submit', { funnelName: existing.name, funnelStep: 'submit_attempt' });
  };

  private readonly onError = (event: ErrorEvent): void => {
    if (!this.isTrackingPath()) return;
    this.enqueue('js_error', { errorMessage: this.clean(event.message || 'JavaScript error', 900), metadata: { component: this.clean(event.filename, 180) } });
  };

  private readonly onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    if (!this.isTrackingPath()) return;
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason || 'Unhandled rejection');
    this.enqueue('unhandled_rejection', { errorMessage: this.clean(reason, 900) });
  };

  private readonly onPageHide = (): void => {
    if (this._consent() !== 'accepted') return;
    this.abandonActiveForms('pagehide');
    this.enqueue('session_end', {});
    void this.flush(true);
  };

  private abandonActiveForms(reason: string): void {
    for (const item of this.activeForms.values()) {
      if (!item.submitted) this.enqueue('form_abandon', { funnelName: item.name, funnelStep: 'abandoned', metadata: { reason } });
    }
    this.activeForms.clear();
  }

  private enqueue(type: AnalyticsEventType, event: Record<string, unknown>): void {
    if (this._consent() !== 'accepted' || !this.sessionId || !this.visitorId || !this.isTrackingPath()) return;
    this.queue.push({ id: crypto.randomUUID(), type, path: this.currentPath, pageTitle: this.clean(document.title, 300), event });
    if (this.queue.length >= 10) void this.flush();
  }

  private async flush(keepalive = false): Promise<void> {
    if (this._consent() !== 'accepted' || this.queue.length === 0) return;
    const batch = this.queue.splice(0, 25);
    const payload = {
      analyticsConsent: true,
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      context: this.context(),
      events: batch,
    };
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive,
        credentials: 'omit',
      });
      if (!response.ok && response.status >= 500 && this.queue.length < 75) this.queue.unshift(...batch);
    } catch {
      if (this.queue.length < 75) this.queue.unshift(...batch);
    }
  }

  private context(): Record<string, unknown> {
    const params = new URLSearchParams(location.search);
    const parsed = this.parseUserAgent(navigator.userAgent || '');
    return {
      analyticsConsent: true,
      consentVersion: 'kvkk-v1',
      landingPath: this.landingPath,
      referrer: document.referrer || '',
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
      locale: navigator.language || 'tr-TR',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      deviceType: this.deviceType(),
      deviceModel: parsed.deviceModel,
      osName: parsed.osName,
      osVersion: parsed.osVersion,
      browserName: parsed.browserName,
      browserVersion: parsed.browserVersion,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      dnt: navigator.doNotTrack === '1',
    };
  }

  private parseUserAgent(ua: string): { deviceModel: string; osName: string; osVersion: string; browserName: string; browserVersion: string } {
    let browserName = 'Other', browserVersion = '', osName = 'Other', osVersion = '', deviceModel = '';
    const browser = ua.match(/Edg\/([\d.]+)/) || ua.match(/SamsungBrowser\/([\d.]+)/) || ua.match(/Chrome\/([\d.]+)/) || ua.match(/Firefox\/([\d.]+)/) || ua.match(/Version\/([\d.]+).*Safari/);
    if (/Edg\//.test(ua)) browserName = 'Edge'; else if (/SamsungBrowser\//.test(ua)) browserName = 'Samsung Internet'; else if (/Chrome\//.test(ua)) browserName = 'Chrome'; else if (/Firefox\//.test(ua)) browserName = 'Firefox'; else if (/Safari\//.test(ua)) browserName = 'Safari';
    browserVersion = browser?.[1] || '';
    const android = ua.match(/Android\s+([\d.]+).*?;\s*([^;)]+?)(?:\s+Build|;|\))/i);
    const ios = ua.match(/OS\s([\d_]+)/);
    const windows = ua.match(/Windows NT\s([\d.]+)/);
    const mac = ua.match(/Mac OS X\s([\d_]+)/);
    if (android) { osName = 'Android'; osVersion = android[1]; deviceModel = this.clean(android[2], 120); }
    else if (/iPhone|iPad|iPod/.test(ua)) { osName = 'iOS'; osVersion = (ios?.[1] || '').replaceAll('_', '.'); deviceModel = /iPad/.test(ua) ? 'iPad' : 'iPhone'; }
    else if (windows) { osName = 'Windows'; osVersion = windows[1]; }
    else if (mac) { osName = 'macOS'; osVersion = mac[1].replaceAll('_', '.'); }
    else if (/Linux/.test(ua)) osName = 'Linux';
    return { deviceModel, osName, osVersion, browserName, browserVersion };
  }

  private deviceType(): 'mobile' | 'tablet' | 'desktop' {
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet|SM-T|Tab/i.test(ua)) return 'tablet';
    if (/Mobi|Android|iPhone|iPod/i.test(ua) || window.innerWidth < 768) return 'mobile';
    return 'desktop';
  }

  private formName(form: HTMLFormElement): string {
    return this.clean(form.dataset['analyticsForm'] || form.getAttribute('aria-label') || form.id || form.getAttribute('name') || `${this.currentPath}:form`, 120);
  }

  private bookingEntryAttribution(element: HTMLElement, href: string): BookingEntryAttribution | null {
    if (href.split('?')[0] !== '/appointment') return null;
    if (element.closest('[data-dock-item="appointment"]')) return { step: 'entry_mobile_dock', section: 'mobile_dock' };
    if (element.closest('[aria-labelledby="closing_cta-title"]')) return { step: 'entry_home_closing_cta', section: 'closing_cta' };
    return { step: 'entry_other_appointment_link', section: 'appointment_link' };
  }

  private elementKey(element: HTMLElement): string {
    return this.clean(element.dataset['analyticsKey'] || element.id || element.getAttribute('name') || element.getAttribute('href') || `${element.tagName.toLowerCase()}:${this.elementLabel(element)}`, 200);
  }

  private elementLabel(element: HTMLElement): string {
    return this.clean(element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent || '', 180);
  }

  private isSensitiveElement(element: HTMLElement): boolean {
    return Boolean(element.closest('[data-analytics-private="true"],input,textarea,select'));
  }

  private safeInternalHref(raw: string): string {
    if (!raw) return '';
    try {
      const url = new URL(raw, location.origin);
      return url.origin === location.origin ? this.safePath(url.pathname + url.search) : `${url.protocol}//${url.hostname}`;
    } catch { return ''; }
  }

  private safePath(value: string): string {
    const path = this.clean(value || '/', 500);
    return path.startsWith('/') ? path : '/';
  }

  private safeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const allowed = new Set(['href', 'section', 'component', 'statusCode', 'durationMs', 'reason', 'routeFrom', 'routeTo', 'networkState', 'pointerType']);
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) if (allowed.has(key) && ['string', 'number', 'boolean'].includes(typeof value)) out[key] = value;
    return out;
  }

  private getOrCreateUuid(storage: Storage, key: string): string {
    const existing = storage.getItem(key);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const value = crypto.randomUUID();
    storage.setItem(key, value);
    return value;
  }

  private isTrackingPath(): boolean {
    return this._consent() === 'accepted' && !this.currentPath.startsWith('/admin');
  }

  private clean(value: unknown, max: number): string {
    return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
  }
}