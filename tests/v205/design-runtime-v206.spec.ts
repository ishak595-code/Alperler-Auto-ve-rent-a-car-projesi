import { expect, test } from "@playwright/test";

const coarseTouchProjects = new Set([
  "android-phone",
  "iphone-webkit",
  "android-landscape-phone",
  "ipad-mini-webkit",
  "android-tablet",
]);

function seconds(value: string): number {
  const first = value.split(",")[0]?.trim() || "0s";
  if (first.endsWith("ms")) return Number.parseFloat(first) / 1000;
  if (first.endsWith("s")) return Number.parseFloat(first);
  return Number.parseFloat(first) || 0;
}

test("premium semantic palette resolves through the canonical runtime tokens", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("app-home-v71")).toBeVisible();

  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const read = (name: string) => style.getPropertyValue(name).trim();
    return {
      background: read("--alper-bg"),
      surface: read("--alper-surface"),
      text: read("--alper-text"),
      accent: read("--alper-accent"),
      legacyAccent: read("--alper-blue"),
      accentLight: read("--alper-accent-light"),
      legacyAccentLight: read("--alper-blue-light"),
      brandGold: read("--alper-brand-gold"),
      legacyGold: read("--alper-gold"),
    };
  });

  expect(tokens.background).not.toBe("");
  expect(tokens.surface).not.toBe("");
  expect(tokens.text).not.toBe("");
  expect(tokens.accent).toBe(tokens.legacyAccent);
  expect(tokens.accentLight).toBe(tokens.legacyAccentLight);
  expect(tokens.brandGold).toBe(tokens.legacyGold);
});

test("cinematic depth is desktop-forward and flattened on coarse touch devices", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const stage = page.locator("app-home-v71 .hero-stage");
  await expect(stage).toBeVisible();

  const perspective = await stage.evaluate((node) => getComputedStyle(node).perspective);
  if (coarseTouchProjects.has(testInfo.project.name)) {
    expect(perspective).toBe("none");
  } else {
    expect(perspective).toBe("1500px");
  }

  await expect(page.locator("app-home-v71 canvas")).toHaveCount(0);
});

test("system reduced-motion preference suppresses cinematic transition duration", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const heading = page.locator("app-home-v71 .hero h1");
  await expect(heading).toBeVisible();
  const duration = await heading.evaluate((node) => getComputedStyle(node).transitionDuration);
  expect(seconds(duration)).toBeLessThanOrEqual(0.01);
});
