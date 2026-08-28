import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'phone-320', width: 320, height: 720 },
  { name: 'phone-360', width: 360, height: 800 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'phone-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 900 },
  { name: 'desktop-1440', width: 1440, height: 1000 },
];

const pages = [
  { path: '/sales/2001', actions: 'app-sale-car-detail .bottom-actions', labels: ['Ara', 'Satış Talebi', 'WhatsApp'] },
  { path: '/fleet/1001', actions: 'app-car-detail .fixed-actions', labels: ['Ara', 'WhatsApp', 'Rezerve Et'] },
  { path: '/tour/3001', actions: 'app-tour-detail .action-bar', labels: ['WhatsApp', 'Rezerve Et'] },
];

test('canonical detail screens fit phone tablet and desktop without CTA gaps or overflow', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const target of pages) {
      await page.goto(target.path, { waitUntil: 'domcontentloaded' });
      const actions = page.locator(target.actions);
      await expect(actions, `${viewport.name} ${target.path} action bar`).toBeVisible({ timeout: 20_000 });

      const overflow = await page.evaluate(() => ({
        body: document.body.scrollWidth - window.innerWidth,
        root: document.documentElement.scrollWidth - window.innerWidth,
      }));
      expect(overflow.body, `${viewport.name} ${target.path} body horizontal overflow`).toBeLessThanOrEqual(1);
      expect(overflow.root, `${viewport.name} ${target.path} root horizontal overflow`).toBeLessThanOrEqual(1);

      const actionBox = await actions.boundingBox();
      expect(actionBox, `${viewport.name} ${target.path} action bar box`).not.toBeNull();
      if (!actionBox) continue;
      expect(actionBox.x, `${viewport.name} ${target.path} action bar left`).toBeGreaterThanOrEqual(-1);
      expect(actionBox.x + actionBox.width, `${viewport.name} ${target.path} action bar right`).toBeLessThanOrEqual(viewport.width + 1);

      const childBoxes = await actions.locator(':scope > a, :scope > button').evaluateAll((nodes) => nodes.map((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
      }));
      expect(childBoxes.length, `${viewport.name} ${target.path} action count`).toBeGreaterThanOrEqual(2);
      for (let index = 0; index < childBoxes.length; index += 1) {
        const box = childBoxes[index];
        expect(box.width, `${viewport.name} ${target.path} action ${index} width`).toBeGreaterThan(44);
        expect(box.left, `${viewport.name} ${target.path} action ${index} left`).toBeGreaterThanOrEqual(-1);
        expect(box.right, `${viewport.name} ${target.path} action ${index} right`).toBeLessThanOrEqual(viewport.width + 1);
        if (index > 0) {
          const previous = childBoxes[index - 1];
          expect(Math.abs(box.left - previous.right), `${viewport.name} ${target.path} inter-action gap`).toBeLessThanOrEqual(1.5);
        }
      }

      for (const label of target.labels) {
        await expect(actions.getByText(label, { exact: false }).first(), `${viewport.name} ${target.path} ${label}`).toBeVisible();
      }
    }
  }
});

test('sale detail keeps facts in İlan Bilgileri instead of duplicate price summary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sales/2001', { waitUntil: 'domcontentloaded' });
  const detail = page.locator('app-sale-car-detail');
  await expect(detail.locator('.listing-price')).toBeVisible({ timeout: 20_000 });
  await expect(detail.locator('.listing-head .summary')).toHaveCount(0);
  const listing = detail.locator('.listing-table');
  await expect(listing).toContainText('Yıl');
  await expect(listing).toContainText('Kilometre');
  await expect(listing).toContainText('Yakıt');
  await expect(listing).toContainText('Vites');
  await expect(listing).toContainText('Kasa Tipi');
});
