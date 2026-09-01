export function cleanCustomerPath(rawUrl: string): string {
  const path = String(rawUrl || '').split('?')[0].split('#')[0].trim();
  if (!path || path === '/') return '/';
  return path.startsWith('/')
    ? path.replace(/\/+$/, '') || '/'
    : `/${path.replace(/\/+$/, '')}`;
}

/**
 * V225 customer navigation ownership.
 *
 * The fixed five-action dock is a homepage discovery control, not a global
 * application chrome element. Keeping it homepage-only prevents it from
 * covering account controls, catalog cards, detail CTAs and form actions on
 * compact Android/iOS viewports while preserving one predictable discovery
 * entry point on the homepage.
 */
export function shouldRenderMobileDock(rawUrl: string): boolean {
  return cleanCustomerPath(rawUrl) === '/';
}

export function isDockItemCurrent(rawUrl: string, itemRoute: string): boolean {
  const path = cleanCustomerPath(rawUrl);
  const route = cleanCustomerPath(itemRoute);
  if (route === '/') return path === '/';
  return path === route || path.startsWith(`${route}/`);
}
