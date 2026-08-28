import { expect, test } from "@playwright/test";

async function settleFrames(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function scrollRange(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
}

test("mobile dock survives tab taps and hides only after downward scroll", async ({ page }) => {
  await page.goto("/");

  const dock = page.locator("nav.customer-command-dock");
  await expect(dock).toHaveCount(1);
  await expect(dock).toBeVisible();
  await expect(dock).not.toHaveClass(/dock-hidden/);

  const routes = ["/fleet", "/sales", "/search", "/campaigns"];
  for (const route of routes) {
    await dock.locator(`a[href="${route}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(?:[?#].*)?$`));
    await settleFrames(page);
    await expect(dock).toHaveCount(1);
    await expect(dock).toBeVisible();
    await expect(dock).not.toHaveClass(/dock-hidden/);
    await expect(dock).not.toHaveAttribute("aria-hidden", "true");
    await expect(dock).not.toHaveAttribute("inert", "");
  }

  await dock.locator('a[href="/fleet"]').click();
  await expect(page).toHaveURL(/\/fleet(?:[?#].*)?$/);
  await settleFrames(page);
  await expect(dock).toBeVisible();
  await expect.poll(() => scrollRange(page)).toBeGreaterThan(200);

  const scrollTarget = Math.min(520, await scrollRange(page));
  expect(scrollTarget).toBeGreaterThan(120);

  await page.evaluate((top) => window.scrollTo(0, top), scrollTarget);
  await expect(dock).toHaveClass(/dock-hidden/);
  await expect(dock).toHaveAttribute("aria-hidden", "true");
  await expect(dock).toHaveAttribute("inert", "");

  await page.evaluate(() => window.scrollBy(0, -90));
  await expect(dock).not.toHaveClass(/dock-hidden/);
  await expect(dock).not.toHaveAttribute("aria-hidden", "true");
  await expect(dock).not.toHaveAttribute("inert", "");
  await expect(dock).toBeVisible();

  const rememberedY = await page.evaluate(() => window.scrollY);
  expect(rememberedY).toBeGreaterThan(24);

  await dock.locator('a[href="/campaigns"]').click();
  await expect(page).toHaveURL(/\/campaigns(?:[?#].*)?$/);
  await expect(dock).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/fleet(?:[?#].*)?$/);
  await settleFrames(page);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(24);
  await expect(dock).toHaveCount(1);
  await expect(dock).toBeVisible();
  await expect(dock).not.toHaveClass(/dock-hidden/);
  await expect(dock).not.toHaveAttribute("aria-hidden", "true");
  await expect(dock).not.toHaveAttribute("inert", "");
});
