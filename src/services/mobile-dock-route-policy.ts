export function cleanCustomerPath(rawUrl: string): string {
  const path = String(rawUrl || '').split('?')[0].split('#')[0].trim();
  if (!path || path === '/') return '/';
  return path.startsWith('/')
    ? path.replace(/\/+$/, '') || '/'
    : `/${path.replace(/\/+$/, '')}`;
}

export function shouldRenderMobileDock(rawUrl: string): boolean {
  return cleanCustomerPath(rawUrl) === '/';
}

export function isDockItemCurrent(rawUrl: string, itemRoute: string): boolean {
  const path = cleanCustomerPath(rawUrl);
  const route = cleanCustomerPath(itemRoute);
  if (route === '/') return path === '/';
  return path === route || path.startsWith(`${route}/`);
}
