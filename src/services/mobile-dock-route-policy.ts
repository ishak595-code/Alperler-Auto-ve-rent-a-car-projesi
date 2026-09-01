const MOBILE_DOCK_SUPPRESSED_EXACT = new Set([
  '/account/login',
  '/account/callback',
  '/account/wallet',
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
  /^\/blog\/[^/]+$/,
  /^\/branches\/[^/]+$/,
] as const;

export function cleanCustomerPath(rawUrl: string): string {
  const path = String(rawUrl || '').split('?')[0].split('#')[0].trim();
  if (!path || path === '/') return '/';
  return path.startsWith('/') ? path.replace(/\/+$/, '') || '/' : `/${path.replace(/\/+$/, '')}`;
}

function hasDeepCustomerSubview(rawUrl:string,path:string):boolean{
  const raw=String(rawUrl||'').split('#')[0];
  const query=raw.includes('?')?raw.slice(raw.indexOf('?')+1):'';
  const params=new URLSearchParams(query);
  if(path==='/account'){
    const view=String(params.get('view')||'').toLowerCase();
    if(view&&view!=='overview')return true;
  }
  if(path==='/fleet'&&params.get('favs')==='true')return true;
  return false;
}

export function shouldRenderMobileDock(rawUrl: string): boolean {
  const path = cleanCustomerPath(rawUrl);
  if (MOBILE_DOCK_SUPPRESSED_EXACT.has(path)) return false;
  if (MOBILE_DOCK_SUPPRESSED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return false;
  if (MOBILE_DOCK_DETAIL_ROUTES.some((pattern) => pattern.test(path))) return false;
  if (hasDeepCustomerSubview(rawUrl,path)) return false;
  return true;
}

export function isDockItemCurrent(rawUrl: string, itemRoute: string): boolean {
  const path = cleanCustomerPath(rawUrl);
  const route = cleanCustomerPath(itemRoute);
  if (route === '/') return path === '/';
  return path === route || path.startsWith(`${route}/`);
}
