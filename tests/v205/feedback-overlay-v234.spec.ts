import { expect, test } from "@playwright/test";

async function settle(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function overlaySnapshot(page: import("@playwright/test").Page) {
  return page.locator("app-feedback .panel").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      bodyOverflow: document.body.style.overflow,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.route(/\/rest\/v1\/footer_settings\?/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        config_key: "main",
        is_enabled: true,
        show_feedback: true,
        newsletter_enabled: false,
        show_phone: false,
        show_whatsapp: false,
        show_social: false,
        show_legal_links: false,
      }]),
    });
  });
  await page.route(/\/rest\/v1\/footer_links\?/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        link_key: "feedback.test",
        config_key: "main",
        group_key: "BOTTOM",
        label: "Geri Bildirim Gönder",
        action_type: "FEEDBACK",
        route: null,
        query_params: {},
        external_url: null,
        sort_order: 10,
        is_enabled: true,
        opens_new_tab: false,
        is_secondary: false,
      }]),
    });
  });
  await page.route(/\/rest\/v1\/prefooter_settings\?/, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ config_key: "main", is_enabled: false }]) });
  });
});

test("feedback opens on the first click as a stable full-screen dialog and closes cleanly", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const trigger = page.getByRole("button", { name: "Geri Bildirim Gönder", exact: true });
  await expect(trigger).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: /geri bildirim/i });
  await expect(dialog).toBeVisible();
  await settle(page);

  const first = await overlaySnapshot(page);
  expect(Math.abs(first.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(first.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(first.width - first.viewportWidth)).toBeLessThanOrEqual(2);
  expect(Math.abs(first.height - first.viewportHeight)).toBeLessThanOrEqual(2);
  expect(first.scrollWidth).toBeLessThanOrEqual(first.viewportWidth + 2);
  expect(first.bodyOverflow).toBe("hidden");

  await page.waitForTimeout(220);
  const second = await overlaySnapshot(page);
  expect(Math.abs(second.x - first.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(second.y - first.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(second.width - first.width)).toBeLessThanOrEqual(2);
  expect(Math.abs(second.height - first.height)).toBeLessThanOrEqual(2);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");

  await trigger.click();
  await expect(page.getByRole("dialog", { name: /geri bildirim/i })).toBeVisible();
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /geri bildirim/i })).toHaveCount(0);
});
