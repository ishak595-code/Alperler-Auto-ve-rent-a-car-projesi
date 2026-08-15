const CONSENT_KEY = 'alperler.analytics.consent.v1';
const SESSION_KEY = 'alperler.analytics.session.v1';

export function currentAnalyticsSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  if (window.localStorage.getItem(CONSENT_KEY) !== 'accepted') return undefined;
  const value = window.sessionStorage.getItem(SESSION_KEY) || '';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
}
