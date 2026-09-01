import { expect, test } from "@playwright/test";

async function settleFrames(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function scrollRange(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
}

test("mobile dock belongs only to home and stays TalkBack-safe", async ({ page }) => {
  await page.goto("/");

  const dock = page.locator("nav.customer-command-dock");
  const accessibleDock = page.getByRole("navigation", { name: "Alt hızlı menü" });
  await expect(dock).toHaveCount(1);
  await expect(dock).toBeVisible();
  await expect(accessibleDock).toHaveCount(1);
  await expect(dock.locator("a.dock-action")).toHaveCount(5);
  await expect(dock.locator('a[href="/fleet"]')).toHaveAttribute("aria-label", "Kiralık");
  await expect(dock.locator('a[href="/sales"]')).toHaveAttribute("aria-label", "Satılık");
  await expect(dock.locator('a[href="/search"]')).toHaveAttribute("aria-label", "Ara");
  await expect(dock.locator('a[href="/campaigns"]')).toHaveAttribute("aria-label", "Fırsatlar");
  await expect(dock.locator('a[href="/account"]')).toHaveAttribute("aria-label", "Profil");
  await expect(dock.locator('a[href="/appointment"]')).toHaveCount(0);
  await expect(dock.locator('a[href="/search"]')).toHaveClass(/dock-primary/);

  await expect.poll(() => scrollRange(page)).toBeGreaterThan(200);
  const scrollTarget = Math.min(520, await scrollRange(page));
  const focusedLink = dock.locator('a[href="/fleet"]');
  await focusedLink.focus();
  await page.evaluate((top) => window.scrollTo(0, top), scrollTarget);
  await settleFrames(page);
  await expect.poll(async () => (await dock.getAttribute("class")) || "").toContain("dock-auto-hidden");
  await expect(dock).toHaveAttribute("aria-hidden", "true");
  await expect(dock).toHaveAttribute("inert", "");
  await expect(accessibleDock).toHaveCount(0);
  await expect(focusedLink).not.toBeFocused();

  await page.evaluate(() => window.scrollBy(0, -260));
  await settleFrames(page);
  await expect.poll(async () => (await dock.getAttribute("class")) || "").not.toContain("dock-auto-hidden");
  await expect(accessibleDock).toHaveCount(1);

  const internalRoutes = [
    "/fleet",
    "/sales",
    "/search",
    "/campaigns",
    "/tours",
    "/blog",
    "/branches",
    "/appointment",
    "/about",
    "/faq",
    "/legal",
    "/account",
    "/account/wallet",
  ];

  for (const route of internalRoutes) {
    await page.goto(route);
    await settleFrames(page);
    await expect(dock).toHaveCount(0);
    await expect(accessibleDock).toHaveCount(0);
  }
});
