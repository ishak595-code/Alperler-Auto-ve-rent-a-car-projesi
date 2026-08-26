import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const serviceWorkerSource = fs.readFileSync('public/service-worker.js', 'utf8');
const releaseMatch = /^const RELEASE = ['"](v[0-9][A-Za-z0-9._-]*)['"];?$/m.exec(serviceWorkerSource);
if (!releaseMatch) throw new Error('PWA_RELEASE_NOT_FOUND');
const release = releaseMatch[1];
const shellCacheName = `alperler-pwa-${release}-shell`;
const staticCacheName = `alperler-pwa-${release}-static`;

async function waitForWorkerControl(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;

    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 8_000);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.clearTimeout(timer);
        resolve();
      }, { once: true });
    });
  });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

test.describe('Alperler production PWA runtime', () => {
  test('registers current worker, offline shell and cleans obsolete releases', async ({ page }) => {
    await waitForWorkerControl(page);

    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.pwaRelease || '')).toBe(release);

    const state = await page.evaluate(async ({ shellCacheName, staticCacheName }) => {
      const registration = await navigator.serviceWorker.ready;
      const keys = await caches.keys();
      const shellName = keys.find((name) => name === shellCacheName) || '';
      const shell = shellName ? await caches.open(shellName) : null;
      const offline = shell ? await shell.match('/offline.html') : null;
      const obsoleteCaches = keys.filter((name) =>
        name.startsWith('alperler-pwa-') &&
        name !== shellCacheName &&
        name !== staticCacheName
      );

      return {
        scope: registration.scope,
        controller: navigator.serviceWorker.controller?.scriptURL || '',
        shellName,
        offlineReady: Boolean(offline),
        obsoleteCaches,
        displayMode: document.documentElement.dataset.pwaDisplayMode || '',
        online: document.documentElement.dataset.pwaOnline || '',
      };
    }, { shellCacheName, staticCacheName });

    expect(state.scope).toBe('http://127.0.0.1:4174/');
    expect(state.controller).toContain('/service-worker.js');
    expect(state.shellName).toBe(shellCacheName);
    expect(state.offlineReady).toBe(true);
    expect(state.obsoleteCaches).toEqual([]);
    expect(state.displayMode).toBe('browser');
    expect(state.online).toBe('true');
  });

  test('caches hashed build assets but not dynamic business routes', async ({ page }) => {
    await waitForWorkerControl(page);
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect.poll(async () => {
      return page.evaluate(async (staticCacheName) => {
        const cache = await caches.open(staticCacheName);
        return (await cache.keys()).length;
      }, staticCacheName);
    }).toBeGreaterThan(0);

    const cachedUrls = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const key of await caches.keys()) {
        if (!key.startsWith('alperler-pwa-')) continue;
        const cache = await caches.open(key);
        for (const request of await cache.keys()) urls.push(request.url);
      }
      return urls;
    });

    expect(cachedUrls.some((url) => /\.(?:js|css)(?:\?|$)/.test(url))).toBe(true);
    expect(cachedUrls.some((url) => /\/api(?:\/|\?|$)/.test(url))).toBe(false);
    expect(cachedUrls.some((url) => /\/catalog-media(?:\/|\?|$)/.test(url))).toBe(false);
    expect(cachedUrls.some((url) => /supabase\.co\//.test(url))).toBe(false);
  });

  test('serves the self-contained offline shell for failed navigations', async ({ context, page }) => {
    await waitForWorkerControl(page);

    await context.setOffline(true);
    try {
      await page.goto('/fleet?runtime-offline-test=1', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'İnternet bağlantısı yok' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tekrar dene' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Ana sayfaya dön' })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});
