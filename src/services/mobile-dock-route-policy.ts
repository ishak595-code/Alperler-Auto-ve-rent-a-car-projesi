const MOBILE_DOCK_SUPPRESSED_EXACT = new Set([
  '/account/login',
  '/account/callback',
  '/booking-checkout',
]);

const MOBILE_DOCK_SUPPRESSED_PREFIXES = [
  '/admin',
  '/branch-portal',
  '/track-car',
] as const;

const MOBILE_DOCK_DETAIL_ROUTES = [
  /^\/fleet\/[^/]+$/,
  /^\/sales\/[^/]+$/,
  /^\/tour\/[^/]+$/,
] as const;

export function cleanCustomerPath(rawUrl: string): string {
  const path = String(rawUrl || '').split('?')[0].split('#')[0].trim();
  if (!path || path === '/') return '/';
  return path.startsWith('/')
    ? path.replace(/\/+$/, '') || '/'
    : `/${path.replace(/\/+$/, '')}`;
}

export function shouldRenderMobileDock(rawUrl: string): boolean {
  const path = cleanCustomerPath(rawUrl);
  if (MOBILE_DOCK_SUPPRESSED_EXACT.has(path)) return false;
  if (MOBILE_DOCK_SUPPRESSED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return false;
  if (MOBILE_DOCK_DETAIL_ROUTES.some((pattern) => pattern.test(path))) return false;
  return true;
}

export function isDockItemCurrent(rawUrl: string, itemRoute: string): boolean {
  const path = cleanCustomerPath(rawUrl);
  const route = cleanCustomerPath(itemRoute);
  if (route === '/') return path === '/';
  return path === route || path.startsWith(`${route}/`);
}
