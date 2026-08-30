import { expect, test } from '@playwright/test';

test.describe('customer privacy surface', () => {
  test('customer routes never render the removed custom consent banner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('app-analytics-consent')).toHaveCount(0);
    await expect(page.getByText('Gizlilik ve Çerez Tercihleri', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sadece gerekli' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Yalnız analitik' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tercihleri düzenle' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tüm isteğe bağlıları kabul et' })).toHaveCount(0);
  });

  test('legal documents remain accessible without inline consent controls', async ({ page }) => {
    await page.goto('/legal?type=cookies', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Çerez Politikası' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gizlilik tercihlerini yeniden seç' })).toHaveCount(0);
    await expect(page.getByText(/^Analitik:/)).toHaveCount(0);
    await expect(page.getByText(/^Pazarlama:/)).toHaveCount(0);
  });
});
