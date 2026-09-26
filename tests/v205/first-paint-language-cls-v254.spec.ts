import { expect, test } from "../helpers/fixtures";

/**
 * V254 first paint: a visitor with a saved EN/DE language gets that language on the very first frame,
 * and the desktop header reserves its brand/nav boxes, so the header never reflows after bootstrap
 * (previously TR → EN/DE label swap and an empty-then-filled nav caused ~0.03–0.07 CLS at 1440px).
 */

test.use({ serviceWorkers: "block" });

for (const lang of ["EN", "DE"]) {
  test(`V254 desktop header does not reflow after first paint (${lang})`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "desktop header contract");
    // Registered after the suite-wide TR fixture, so this language wins.
    await page.addInitScript((l) => {
      localStorage.setItem("alperler-language", l);
      (window as any).__v254Shifts = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any[]) {
          if (e.hadRecentInput) continue;
          for (const s of e.sources || []) {
            const node = s.node && s.node.nodeType === 1 ? s.node : s.node?.parentElement;
            if (!node || !node.closest || !node.closest("app-navbar")) continue;
            const moved = Math.max(Math.abs(s.previousRect.x - s.currentRect.x), Math.abs(s.previousRect.y - s.currentRect.y));
            (window as any).__v254Shifts.push({ cls: node.className, moved: Math.round(moved), value: e.value });
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    }, lang);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", lang.toLowerCase());
    await expect(page.locator(".desktop-nav a.nav-link").first()).toBeVisible();
    await page.waitForTimeout(1500);
    const shifts = await page.evaluate(() => (window as any).__v254Shifts as { cls: string; moved: number; value: number }[]);
    const big = shifts.filter((s) => s.moved > 12);
    expect(big, `header boxes must not jump after first paint: ${JSON.stringify(big)}`).toEqual([]);
  });
}
