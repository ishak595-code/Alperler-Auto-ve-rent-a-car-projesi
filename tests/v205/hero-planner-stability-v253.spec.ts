import type { Page } from "@playwright/test";
import { expect, test } from "../helpers/fixtures";

/**
 * V253 regression contract for the homepage hero:
 * - quick planner ("Hızlı planlama") never shifts layout while options/dates/errors change,
 * - the WhatsApp FAB and the phone bottom dock never overlap or show together,
 * - hero type stays inside its fluid clamp() bounds without horizontal scroll,
 * - every internal link on the main public pages resolves (no not-found page).
 */

test.use({ serviceWorkers: "block" });

const PHONE_DOCK_QUERY = "(max-width:639px) and (pointer:coarse), (max-width:950px) and (max-height:500px) and (pointer:coarse)";

async function settle(page: Page, ms = 220): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(ms);
}

async function installShiftObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __v253Shifts: Array<{ value: number; sources: string[] }> };
    w.__v253Shifts = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ value: number; sources?: Array<{ node?: Node | null }> }>) {
          w.__v253Shifts.push({
            value: entry.value,
            sources: (entry.sources ?? []).map((s) => (s.node instanceof Element ? `${s.node.tagName.toLowerCase()}.${String(s.node.className).slice(0, 60)}` : "#node")),
          });
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      /* WebKit has no layout-shift entries; geometry assertions still apply there. */
    }
  });
}

async function shiftSum(page: Page): Promise<number> {
  return page.evaluate(() => ((window as unknown as { __v253Shifts?: Array<{ value: number }> }).__v253Shifts ?? []).reduce((sum, e) => sum + e.value, 0));
}

async function plannerGeometry(page: Page) {
  return page.evaluate(() => {
    const planner = document.querySelector<HTMLElement>("app-home-v71 .planner")!.getBoundingClientRect();
    const h1 = document.querySelector<HTMLElement>("app-home-v71 h1")!.getBoundingClientRect();
    return { plannerHeight: planner.height, plannerTop: planner.top + window.scrollY, h1Top: h1.top + window.scrollY, overflow: document.documentElement.scrollWidth - window.innerWidth };
  });
}

test("V253 quick planner interactions cause no layout shift and keep a constant size", async ({ page }) => {
  await installShiftObserver(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const planner = page.locator("app-home-v71 .planner");
  const service = planner.locator('select[name="homeService"]');
  await expect(service).toBeVisible();
  // The designed first-paint entrance is not an interaction; measure after it.
  await page.waitForTimeout(1200);
  await service.scrollIntoViewIfNeeded();
  await settle(page, 400);

  const base = await plannerGeometry(page);
  const baseShift = await shiftSum(page);
  expect(base.overflow).toBeLessThanOrEqual(1);

  const expectStable = async (step: string) => {
    await settle(page);
    const now = await plannerGeometry(page);
    expect(Math.abs(now.plannerHeight - base.plannerHeight), `${step}: planner height must not change`).toBeLessThanOrEqual(1);
    expect(Math.abs(now.plannerTop - base.plannerTop), `${step}: planner must not move`).toBeLessThanOrEqual(1);
    expect(Math.abs(now.h1Top - base.h1Top), `${step}: headline must not move`).toBeLessThanOrEqual(1);
    expect(now.overflow, `${step}: no horizontal scroll`).toBeLessThanOrEqual(1);
  };

  const serviceValues = await service.locator("option").evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
  expect(serviceValues.length).toBeGreaterThanOrEqual(2);
  for (const value of [...serviceValues, serviceValues[0]]) {
    await service.selectOption(value);
    await expectStable(`service=${value}`);
  }

  const duration = planner.locator('select[name="homeDuration"]');
  if (await duration.isVisible()) {
    const durations = await duration.locator("option").evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
    for (const value of durations) {
      await duration.selectOption(value);
      await expectStable(`duration=${value}`);
    }
    await duration.selectOption(durations[0]);
  }

  const action = planner.locator("button.planner-action");
  await action.click();
  await expect(planner.locator('[role="alert"]')).toBeVisible();
  await expectStable("validation error");

  const dateTrigger = planner.locator(".when-variant.is-active app-accessible-native-date button.date-surface").first();
  await dateTrigger.click();
  const dialog = page.locator("dialog.calendar-dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expectStable("date picked");

  await planner.hover();
  await expectStable("hover");

  expect(await shiftSum(page) - baseShift, "interaction layout-shift sum").toBeLessThan(0.01);
});

test("V253 WhatsApp FAB and phone dock never overlap or show together", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const fab = page.locator('a[data-chrome="whatsapp-fab"]');
  await expect(fab).toHaveCount(1);
  const phone = await page.evaluate((q) => matchMedia(q).matches, PHONE_DOCK_QUERY);

  if (!phone) {
    await expect(fab).toBeVisible();
    const box = (await fab.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    return;
  }

  const dock = page.locator("nav.customer-command-dock");
  const state = async () => page.evaluate(() => {
    const vis = (el: Element | null) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.5 || r.width === 0) return null;
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    return { fab: vis(document.querySelector('a[data-chrome="whatsapp-fab"]')), dock: vis(document.querySelector("nav.customer-command-dock")), vh: window.innerHeight, vw: window.innerWidth };
  });
  const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  await expect(dock).toBeVisible();
  await page.waitForTimeout(400);
  let s = await state();
  expect(s.dock, "dock visible at the top of the page").not.toBeNull();
  expect(s.fab, "FAB yields while the dock is visible").toBeNull();

  // Scroll down: the dock auto-hides and the FAB takes its place.
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight), { timeout: 10_000 }).toBeGreaterThan(400);
  const target = await page.evaluate(() => Math.min(document.documentElement.scrollHeight - window.innerHeight, Math.max(320, window.innerHeight * 0.9)));
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), target);
  await expect.poll(async () => (await dock.getAttribute("class")) || "", { timeout: 3_000 }).toContain("dock-auto-hidden");
  await expect(dock).toBeHidden();
  await page.waitForTimeout(400);
  s = await state();
  expect(s.fab, "FAB appears once the dock hides").not.toBeNull();
  expect(s.fab!.w).toBeGreaterThanOrEqual(44);
  expect(s.fab!.y + s.fab!.h).toBeLessThanOrEqual(s.vh);
  expect(s.fab!.x + s.fab!.w).toBeLessThanOrEqual(s.vw);

  // Scroll back up: dock returns, FAB yields again; never both at once.
  await page.evaluate((distance) => window.scrollBy({ top: -distance, behavior: "instant" }), Math.min(260, target));
  await expect.poll(async () => (await dock.getAttribute("class")) || "", { timeout: 3_000 }).not.toContain("dock-auto-hidden");
  await expect(dock).toBeVisible();
  await page.waitForTimeout(400);
  s = await state();
  if (s.fab && s.dock) expect(overlap(s.fab, s.dock), "FAB must never cover the dock").toBe(false);
  expect(s.fab).toBeNull();
});

test("V253 FAB is present on inner public pages and absent where a page owns the bottom bar", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  await expect(page.locator('a[data-chrome="whatsapp-fab"]')).toHaveCount(1);
  await expect(page.locator('a[data-chrome="whatsapp-fab"]')).toHaveAttribute("href", /^https:\/\/wa\.me\/\d{11,13}\?text=.+contact/);
  await page.goto("/account/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await expect(page.locator('a[data-chrome="whatsapp-fab"]')).toHaveCount(0);
});

test("V253 hero type and controls stay inside their fluid bounds", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("app-home-v71 h1")).toBeVisible();
  await page.waitForTimeout(900);
  const m = await page.evaluate(() => {
    const px = (sel: string, prop: "fontSize" | "height" = "fontSize") => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) return -1;
      return prop === "height" ? el.getBoundingClientRect().height : parseFloat(getComputedStyle(el).fontSize);
    };
    return {
      h1: px("app-home-v71 h1"),
      eyebrow: px("app-home-v71 .eyebrow"),
      sub: px("app-home-v71 .hero-copy"),
      h2: px("app-home-v71 .planner h2"),
      select: px('app-home-v71 select[name="homeService"]', "height"),
      selectFont: px('app-home-v71 select[name="homeService"]'),
      action: px("app-home-v71 button.planner-action", "height"),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(m.h1).toBeGreaterThanOrEqual(29);
  expect(m.h1).toBeLessThanOrEqual(76.5);
  expect(m.eyebrow).toBeGreaterThanOrEqual(11.5);
  expect(m.eyebrow).toBeLessThanOrEqual(14.5);
  expect(m.sub).toBeGreaterThanOrEqual(15);
  expect(m.sub).toBeLessThanOrEqual(19.5);
  expect(m.h2).toBeGreaterThanOrEqual(21);
  expect(m.h2).toBeLessThanOrEqual(30.5);
  // iOS zooms inputs under 16px; tap targets must be at least 44px.
  expect(m.selectFont).toBeGreaterThanOrEqual(16);
  expect(m.select).toBeGreaterThanOrEqual(44);
  expect(m.action).toBeGreaterThanOrEqual(44);
  expect(m.overflow).toBeLessThanOrEqual(1);
});

test("V253 internal links on the main public pages never land on the not-found page", async ({ page }, testInfo) => {
  test.skip(!["desktop-chromium", "android-phone"].includes(testInfo.project.name), "crawl once per form factor");
  test.setTimeout(240_000);
  const routes = ["/", "/fleet", "/sales", "/tours", "/contact", "/about", "/faq", "/blog", "/campaigns", "/branches", "/legal"];
  const links = new Set<string>();
  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    await expect(page.locator("app-not-found"), `${route} must exist`).toHaveCount(0);
    // A page may still finish a client-side redirect (e.g. canonical query params); retry the read.
    let found: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.waitForLoadState("domcontentloaded");
        found = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") || "").filter((h) => h.startsWith("/") && !h.startsWith("//")).map((h) => h.split("#")[0]));
        break;
      } catch {
        await page.waitForTimeout(400);
      }
    }
    for (const href of found) if (href && !/^\/(admin|branch-portal)/.test(href)) links.add(href);
  }
  expect(links.size).toBeGreaterThan(8);
  for (const href of links) {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(350);
    await expect(page.locator("app-not-found"), `${href} must not 404`).toHaveCount(0);
  }
});
