import { expect, test } from "@playwright/test";

const phoneProjects = new Set(["android-phone", "iphone-webkit", "android-landscape-phone"]);
const tabletProjects = new Set(["ipad-mini-webkit", "android-tablet"]);

async function noHorizontalOverflow(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
}

async function scrollRange(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
}

test("device class keeps the intended navigation and conversion hierarchy", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const dock = page.locator("nav.customer-command-dock");
  const planner = page.locator("app-home-v71 .planner");
  const trust = page.locator("app-home-v71 .trust-row");
  const desktopSearch = page.locator("app-home-v71 .desktop-search");
  const homeWhatsapp = page.locator("a.whatsapp-fab");

  await expect(planner).toBeVisible();
  await expect.poll(() => noHorizontalOverflow(page)).toBe(true);
  await expect(homeWhatsapp).toHaveCount(0);

  if (phoneProjects.has(testInfo.project.name)) {
    await expect(dock).toBeVisible();
    await expect(desktopSearch).toBeHidden();
    await expect(trust).toBeVisible();

    const plannerBox = await planner.boundingBox();
    const trustBox = await trust.boundingBox();
    expect(plannerBox).not.toBeNull();
    expect(trustBox).not.toBeNull();
    expect(plannerBox!.y).toBeLessThan(trustBox!.y);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    expect(plannerBox!.y).toBeLessThan(viewport!.height * 0.72);
  } else {
    await expect(dock).toBeHidden();
  }

  if (tabletProjects.has(testInfo.project.name)) {
    const mobileMenuButton = page.locator('button[aria-label="Menüyü aç"],button[aria-label="Menüyü kapat"]');
    await expect(mobileMenuButton.first()).toBeVisible();
  }

  if (testInfo.project.name === "desktop-chromium") {
    await expect(desktopSearch).toBeVisible();
    await expect(dock).toBeHidden();
    await expect(homeWhatsapp).toHaveCount(0);
  }
});

test("phone home dock leaves visual and accessibility surfaces downward, then WhatsApp replaces it until upward scroll", async ({ page }, testInfo) => {
  test.skip(!phoneProjects.has(testInfo.project.name), "Phone-class behavior only.");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const dock = page.locator("nav.customer-command-dock");
  const accessibleDock = page.getByRole("navigation", { name: "Alt hızlı menü" });
  const homeWhatsapp = page.locator("a.whatsapp-fab");

  await expect(dock).toBeVisible();
  await expect(accessibleDock).toHaveCount(1);
  await expect(homeWhatsapp).toHaveCount(0);
  await expect(dock).not.toHaveClass(/dock-auto-hidden/);
  await expect(dock).not.toHaveAttribute("aria-hidden", "true");
  await expect(dock).not.toHaveAttribute("inert", "");

  await expect.poll(() => scrollRange(page), { timeout: 10_000 }).toBeGreaterThan(180);
  const target = await page.evaluate(() => {
    const range = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return Math.min(range, Math.max(240, window.innerHeight * 0.8));
  });
  expect(target).toBeGreaterThan(120);

  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), target);
  await expect.poll(async () => (await dock.getAttribute("class")) || "", { timeout: 3_000 }).toContain("dock-auto-hidden");
  await expect(dock).toHaveAttribute("aria-label", "Alt hızlı menü");
  await expect(dock).toHaveAttribute("aria-hidden", "true");
  await expect(dock).toHaveAttribute("inert", "");
  await expect(dock).toBeHidden();
  await expect(accessibleDock).toHaveCount(0);
  await expect(dock.locator("a.dock-action")).toHaveCount(5);
  await expect(homeWhatsapp).toBeVisible();
  await expect(homeWhatsapp).toHaveAttribute("href", /wa\.me\//);

  await page.evaluate((distance) => window.scrollBy({ top: -distance, behavior: "instant" }), Math.min(260, target));
  await expect.poll(async () => (await dock.getAttribute("class")) || "", { timeout: 3_000 }).not.toContain("dock-auto-hidden");
  await expect(dock).not.toHaveAttribute("aria-hidden", "true");
  await expect(dock).not.toHaveAttribute("inert", "");
  await expect(dock).toBeVisible();
  await expect(accessibleDock).toHaveCount(1);
  await expect(homeWhatsapp).toHaveCount(0);
  await expect.poll(() => noHorizontalOverflow(page)).toBe(true);
});

test("public routes stay overflow-safe and never render the home dock or home floating WhatsApp outside home", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "android-phone", "One canonical route smoke pass is sufficient.");

  const routes = [
    "/fleet",
    "/sales",
    "/search",
    "/campaigns",
    "/appointment",
    "/list-your-car",
    "/tours",
    "/branches",
    "/blog",
    "/contact",
    "/about",
  ];

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("app-not-found")).toHaveCount(0);
    await expect(page.locator("nav.customer-command-dock")).toHaveCount(0);
    await expect(page.locator("a.whatsapp-fab")).toHaveCount(0);
    await expect.poll(() => noHorizontalOverflow(page)).toBe(true);
  }
});
