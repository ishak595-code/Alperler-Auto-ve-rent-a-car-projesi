import { expect, test } from "@playwright/test";

async function settleFrames(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function scrollRange(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
}

test("mobile dock leaves the TalkBack tree while auto-hidden and restores cleanly", async ({ page }) => {
  await page.goto("/");

  const dock = page.locator("nav.customer-command-dock");
  const accessibleDock = page.getByRole("navigation", { name: "Alt hızlı menü" });
  await expect(dock).toHaveCount(1);
  await expect(dock).toBeVisible();
  await expect(accessibleDock).toHaveCount(1);
  await expect(dock).not.toHaveAttribute("aria-hidden", "true");
  await expect(dock).not.toHaveAttribute("inert", "");
  await expect(dock.locator('a[href="/fleet"]')).toHaveAttribute("aria-label", "Kiralık");
  await expect(dock.locator('a[href="/sales"]')).toHaveAttribute("aria-label", "Satılık");
  await expect(dock.locator('a[href="/search"]')).toHaveAttribute("aria-label", "İlan Ara");
  await expect(dock.locator('a[href="/campaigns"]')).toHaveAttribute("aria-label", "Fırsatlar");
  await expect(dock.locator('a[href="/account"]')).toHaveAttribute("aria-label", "Profil");
  await expect(dock.locator('a[href="/appointment"]')).toHaveCount(0);

  const routes = ["/fleet", "/sales", "/search", "/campaigns"];
  for (const route of routes) {
    const link = dock.locator(`a[href="${route}"]`);
    await expect(link).toHaveAttribute("aria-label", /.+/);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(?:[?#].*)?$`));
    await settleFrames(page);
    await expect(dock).toHaveCount(1);
    await expect(accessibleDock).toHaveCount(1);
    await expect(dock).not.toHaveAttribute("aria-hidden", "true");
    await expect(dock).not.toHaveAttribute("inert", "");
    await expect(dock.locator(`a[href="${route}"]`)).toHaveAttribute("aria-current", "page");
  }

  await dock.locator('a[href="/fleet"]').click();
  await expect(page).toHaveURL(/\/fleet(?:[?#].*)?$/);
  await settleFrames(page);
  await expect.poll(() => scrollRange(page)).toBeGreaterThan(200);

  const scrollTarget = Math.min(520, await scrollRange(page));
  expect(scrollTarget).toBeGreaterThan(120);

  const focusedLink = dock.locator('a[href="/fleet"]');
  await focusedLink.focus();
  await expect(focusedLink).toBeFocused();

  await page.evaluate((top) => window.scrollTo(0, top), scrollTarget);
  await settleFrames(page);
  await expect.poll(async () => (await dock.getAttribute("class")) || "").toContain("dock-auto-hidden");
  await expect(dock).toHaveAttribute("aria-hidden", "true");
  await expect(dock).toHaveAttribute("inert", "");
  await expect(dock).toBeHidden();
  await expect(accessibleDock).toHaveCount(0);
  await expect(focusedLink).not.toBeFocused();
  await expect(dock.locator('a[href="/fleet"]')).toHaveAttribute("aria-current", "page");

  const rememberedY = await page.evaluate(() => window.scrollY);
  expect(rememberedY).toBeGreaterThan(24);

  await page.evaluate(() => window.scrollBy(0, -260));
  await settleFrames(page);
  await expect.poll(async () => (await dock.getAttribute("class")) || "").not.toContain("dock-auto-hidden");
  await expect(dock).toBeVisible();
  await expect(accessibleDock).toHaveCount(1);
  await expect(dock).not.toHaveAttribute("aria-hidden", "true");
  await expect(dock).not.toHaveAttribute("inert", "");

  await dock.locator('a[href="/campaigns"]').click();
  await expect(page).toHaveURL(/\/campaigns(?:[?#].*)?$/);
  await expect(dock.locator('a[href="/campaigns"]')).toHaveAttribute("aria-current", "page");

  await page.goBack();
  await expect(page).toHaveURL(/\/fleet(?:[?#].*)?$/);
  await settleFrames(page);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(24);
  await expect(dock).toHaveCount(1);
  await expect(dock.locator('a[href="/fleet"]')).toHaveAttribute("aria-current", "page");

  await page.evaluate(() => window.scrollBy(0, -260));
  await settleFrames(page);
  await expect.poll(async () => (await dock.getAttribute("class")) || "").not.toContain("dock-auto-hidden");
  await expect(dock).toBeVisible();
  await expect(accessibleDock).toHaveCount(1);
  await expect(dock).not.toHaveAttribute("aria-hidden", "true");
  await expect(dock).not.toHaveAttribute("inert", "");
});
