import type { Page } from "@playwright/test";
import { expect, test } from "../helpers/fixtures";

// V251: the hero must read eyebrow -> headline -> subtitle -> search -> badges on every
// device class. On phones the Quick Planning card sits between the subtitle and the badges.
const LANGUAGES = ["TR", "EN", "DE", "FR", "KU", "ES", "RU", "ZH", "AR"];
const PHONE_WIDTHS = [320, 360, 390, 430, 480, 600, 767];

async function readingOrderIssues(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || rect.height === 0) return null;
      return { top: rect.top, bottom: rect.bottom };
    };
    const sequence: Array<[string, string]> = [
      ["eyebrow", "app-home-v71 .eyebrow"],
      ["headline", "app-home-v71 .hero h1"],
      ["subtitle", "app-home-v71 .hero-copy"],
      ["search", "app-home-v71 .desktop-search"],
      ["badges", "app-home-v71 .trust-row"],
    ];
    const issues: string[] = [];
    const present = sequence.map(([name, selector]) => ({ name, rect: box(selector) })).filter((item) => item.rect);
    for (const required of ["eyebrow", "headline", "subtitle", "badges"]) {
      if (!present.some((item) => item.name === required)) issues.push(`${required} is not rendered`);
    }
    for (let i = 1; i < present.length; i += 1) {
      const previous = present[i - 1];
      const current = present[i];
      if (current.rect!.top < previous.rect!.bottom - 1) issues.push(`${current.name} (top ${current.rect!.top.toFixed(1)}) renders above ${previous.name} (bottom ${previous.rect!.bottom.toFixed(1)})`);
    }
    const headline = box("app-home-v71 .hero h1");
    const subtitle = box("app-home-v71 .hero-copy");
    if (headline && subtitle && !(headline.top < subtitle.top)) issues.push("headline top must be above subtitle top");
    return issues;
  });
}

test("V251 hero reads eyebrow, headline, subtitle, search, badges on this device class", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("app-home-v71 .hero h1")).toBeVisible();
  await expect.poll(() => readingOrderIssues(page), { timeout: 5_000 }).toEqual([]);
});

test("V251 phone-width hero reading order holds in every language", async ({ page }, testInfo) => {
  test.skip(!["android-phone", "desktop-chromium"].includes(testInfo.project.name), "sweep runs on one touch phone and one fine-pointer project");
  for (const lang of LANGUAGES) {
    await page.addInitScript((value) => localStorage.setItem("alperler-language", value), lang);
    await page.setViewportSize({ width: PHONE_WIDTHS[0], height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("app-home-v71 .hero h1")).toBeVisible();
    for (const width of PHONE_WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await expect.poll(() => readingOrderIssues(page), { timeout: 5_000, message: `${lang} @ ${width}px` }).toEqual([]);
    }
  }
});
