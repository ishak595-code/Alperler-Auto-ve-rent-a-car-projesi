import type { Page } from "@playwright/test";
import { expect, test } from "../helpers/fixtures";

// V250: the cinematic hero (3D tilt inside a 1500px perspective) and the desktop
// link row must never be clipped by the viewport edge, in any UI language.
const DESKTOP_WIDTHS = [1024, 1180, 1280, 1366, 1440, 1920];
const LANGUAGES = ["TR", "EN", "DE", "FR", "KU", "ES", "RU", "ZH", "AR"];

async function viewportFitIssues(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const issues: string[] = [];
    if (document.documentElement.scrollWidth > vw) issues.push(`scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
    const visible = (el: Element) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const selectors = [
      "app-home-v71 .eyebrow",
      "app-home-v71 .hero h1",
      "app-home-v71 .hero-copy",
      "app-home-v71 .search-shell",
      "app-home-v71 .trust-row span",
      "app-home-v71 .planner",
      "app-home-v71 .planner .field",
      "app-navbar .brand-link",
      "app-navbar .navbar-actions > *",
    ];
    for (const selector of selectors) {
      for (const el of Array.from(document.querySelectorAll(selector))) {
        if (!visible(el)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.left < -0.5 || rect.right > vw + 0.5) issues.push(`${selector} [${rect.left.toFixed(1)}, ${rect.right.toFixed(1)}] outside 0..${vw}`);
      }
    }
    const nav = document.querySelector<HTMLElement>("app-navbar .desktop-nav");
    const trigger = document.querySelector("#mobile-menu-trigger");
    if (nav && visible(nav)) {
      if (nav.scrollWidth - nav.clientWidth > 1) issues.push(`desktop links overflow ${nav.scrollWidth} > ${nav.clientWidth}`);
    } else if (!(trigger && visible(trigger))) {
      issues.push("neither desktop links nor the menu button are reachable");
    }
    return issues;
  });
}

test("V250 hero and navigation stay inside the viewport on the device matrix", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("app-home-v71 .hero h1")).toBeVisible();
  await expect.poll(() => viewportFitIssues(page), { timeout: 5_000 }).toEqual([]);
});

test("V250 desktop hero and link row fit every width and language", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "width/language sweep runs once on desktop");
  for (const lang of LANGUAGES) {
    await page.evaluate((value) => localStorage.setItem("alperler-language", value), lang).catch(() => undefined);
    await page.addInitScript((value) => localStorage.setItem("alperler-language", value), lang);
    await page.setViewportSize({ width: DESKTOP_WIDTHS[0], height: 760 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("app-home-v71 .hero h1")).toBeVisible();
    for (const width of DESKTOP_WIDTHS) {
      await page.setViewportSize({ width, height: 760 });
      await expect.poll(() => viewportFitIssues(page), { timeout: 5_000, message: `${lang} @ ${width}px` }).toEqual([]);
    }
  }
});
