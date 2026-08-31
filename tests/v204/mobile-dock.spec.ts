import { expect, test } from "@playwright/test";

async function settleFrames(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function scrollRange(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
}

test("home-only mobile dock disappears for TalkBack on downward scroll and hands off to home WhatsApp", async ({ page }) => {
  await page.goto("/");

  const dock = page.locator("nav.customer-command-dock");
  const accessibleDock = page.getByRole("navigation", { name: "Alt hızlı menü" });
  const homeWhatsapp = page.locator("a.whatsapp-fab");

  await expect(dock).toBeVisible();
  await expect(accessibleDock).toHaveCount(1);
  await expect(homeWhatsapp).toHaveCount(0);
  await expect.poll(() => scrollRange(page)).toBeGreaterThan(200);

  const focusTarget = dock.locator("a.dock-action").first();
  await focusTarget.focus();
  await expect(focusTarget).toBeFocused();

  const target = Math.min(520, await scrollRange(page));
  await page.evaluate((top) => window.scrollTo(0, top), target);
  await settleFrames(page);

  await expect.poll(async () => (await dock.getAttribute("class")) || "").toContain("dock-auto-hidden");
  await expect(dock).toHaveAttribute("aria-hidden", "true");
  await expect(dock).toHaveAttribute("inert", "");
  await expect(dock).toBeHidden();
  await expect(accessibleDock).toHaveCount(0);
  await expect(focusTarget).not.toBeFocused();
  await expect(homeWhatsapp).toBeVisible();
  await expect(homeWhatsapp).toHaveAttribute("href", /wa\.me\//);

  await page.evaluate(() => window.scrollBy(0, -280));
  await settleFrames(page);

  await expect.poll(async () => (await dock.getAttribute("class")) || "").not.toContain("dock-auto-hidden");
  await expect(dock).toBeVisible();
  await expect(accessibleDock).toHaveCount(1);
  await expect(dock).not.toHaveAttribute("aria-hidden", "true");
  await expect(dock).not.toHaveAttribute("inert", "");
  await expect(homeWhatsapp).toHaveCount(0);

  for (const route of ["/fleet", "/sales", "/campaigns", "/tours", "/blog", "/contact"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(dock).toHaveCount(0);
    await expect(page.locator("a.whatsapp-fab")).toHaveCount(0);
  }
});
