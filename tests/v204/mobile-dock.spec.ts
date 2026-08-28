import { expect, test } from "@playwright/test";

async function settleFrames(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

test("mobile dock survives tab taps and hides only after downward scroll", async ({ page }) => {
  await page.goto("/");

  const dock = page.getByRole("navigation", { name: "Hızlı menü" });
  await expect(dock).toBeVisible();
  await expect(dock).not.toHaveClass(/dock-hidden/);

  const routes = ["/fleet", "/sales", "/search", "/campaigns"];
  for (const route of routes) {
    await dock.locator(`a[href="${route}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(?:[?#].*)?$`));
    await settleFrames(page);
    await expect(dock).toBeVisible();
    await expect(dock).not.toHaveClass(/dock-hidden/);
    await expect(dock).not.toHaveAttribute("aria-hidden", "true");
  }

  await dock.locator('a[href="/fleet"]').click();
  await expect(page).toHaveURL(/\/fleet(?:[?#].*)?$/);
  await settleFrames(page);
  await expect(dock).toBeVisible();

  const scrollTarget = await page.evaluate(() => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return Math.min(520, max);
  });
  expect(scrollTarget).toBeGreaterThan(120);

  await page.evaluate((top) => window.scrollTo(0, top), scrollTarget);
  await expect(dock).toHaveClass(/dock-hidden/);
  await expect(dock).toHaveAttribute("aria-hidden", "true");

  await page.evaluate(() => window.scrollBy(0, -90));
  await expect(dock).not.toHaveClass(/dock-hidden/);
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
  await expect(dock).toBeVisible();
  await expect(dock).not.toHaveClass(/dock-hidden/);
  await expect(dock).not.toHaveAttribute("aria-hidden", "true");
});
