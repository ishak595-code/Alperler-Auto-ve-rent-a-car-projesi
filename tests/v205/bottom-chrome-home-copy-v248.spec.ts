import type { Page, Route } from "@playwright/test";
import { expect, test } from "../helpers/fixtures";

/**
 * V248: a Supabase quota / API outage must never wipe the public chrome or the homepage copy.
 * - WhatsApp (FAB + footer pill) stays visible with a working wa.me target.
 * - "Geri Bildirim Gönder" stays in its own place and opens its dialog; neither replaces the other.
 * - Vitrin section titles/descriptions render from built-in Turkish defaults when nothing else exists.
 */

// The PWA service worker would otherwise answer Supabase reads itself and bypass page.route()
// (observed on WebKit once an earlier test installed it), making the mocks non-deterministic.
test.use({ serviceWorkers: "block" });

const QUOTA_BODY = JSON.stringify({
  message: "Service for this project is restricted due to the following violations: exceed_cached_egress_quota.",
});

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

/** Cross-origin Supabase REST mocks need CORS headers (and a preflight answer) so WebKit accepts them. */
async function fulfillSupabase(route: Route, status: number, body: string): Promise<void> {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS_HEADERS, body: "" });
    return;
  }
  await route.fulfill({ status, contentType: "application/json", headers: CORS_HEADERS, body });
}

async function simulateQuotaOutage(page: Page, overrides: Record<string, unknown> | null = null): Promise<void> {
  await page.route(/\/rest\/v1\//, async (route: Route) => {
    const url = route.request().url();
    if (overrides && /\/rest\/v1\/footer_settings\?/.test(url)) {
      await fulfillSupabase(route, 200, JSON.stringify([{ config_key: "main", is_enabled: true, ...overrides }]));
      return;
    }
    await fulfillSupabase(route, 402, QUOTA_BODY);
  });
  await page.route(/\/api\/(catalog|branches)(\?|$)/, async (route: Route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: { "retry-after": "600", "cache-control": "no-store" },
      body: JSON.stringify({ ok: false, code: "CATALOG_QUOTA_PAYMENT_REQUIRED" }),
    });
  });
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test("quota outage keeps WhatsApp and Feedback both visible and working in the bottom area", async ({ page }) => {
  await simulateQuotaOutage(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const fab = page.locator('a[data-chrome="whatsapp-fab"]');
  await expect(fab).toBeVisible();
  await expect(fab).toHaveAttribute("href", /^https:\/\/wa\.me\/\d{11,13}\?text=.+/);
  await expect(fab).toHaveAttribute("target", "_blank");

  const footer = page.locator("app-customer-footer-v70");
  const whatsappPill = footer.locator("a.contact-pill.whatsapp");
  await expect(whatsappPill).toHaveAttribute("href", /^https:\/\/wa\.me\/\d{11,13}\?text=.+/);

  const feedback = footer.getByRole("button", { name: "Geri Bildirim Gönder", exact: true });
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveCount(1);

  // Both controls coexist on screen at the end of the page without covering each other.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(fab).toBeVisible();
  await feedback.scrollIntoViewIfNeeded();
  const fabBox = await fab.boundingBox();
  const feedbackBox = await feedback.boundingBox();
  expect(fabBox, "WhatsApp FAB must have a layout box").toBeTruthy();
  expect(feedbackBox, "Feedback CTA must have a layout box").toBeTruthy();
  expect(overlaps(fabBox!, feedbackBox!), "WhatsApp FAB must not sit on top of the Feedback CTA").toBeFalsy();

  await feedback.click();
  const dialog = page.getByRole("dialog", { name: /geri bildirim/i });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(fab).toBeVisible();
});

test("quota outage still renders vitrin section titles and descriptions from stable defaults", async ({ page }) => {
  await simulateQuotaOutage(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const expected: Array<[string, string]> = [
    ["campaigns", "Aktif Fırsatlar"],
    ["rental_featured", "Kiralık Araçlar"],
    ["sale_featured", "İkinci El Araçlar"],
    ["tour_featured", "Turlar ve Rotalar"],
    ["blog_featured", "Rehber ve İçerikler"],
  ];
  for (const [key, title] of expected) {
    const heading = page.locator(`[id="${key}-title"]`);
    await expect(heading, `${key} heading must render during an outage`).toHaveText(title);
    const description = page.locator(`app-dynamic-home-section:has([id="${key}-title"]) .head .desc`);
    await expect(description, `${key} description must never be blank`).not.toHaveText(/^\s*$/);
  }

  // Customers see calm per-section retry states, not a raw quota/payment alert.
  await expect(page.locator(".home-shell-error")).toHaveCount(0);
  await expect(page.getByText(/Supabase/i)).toHaveCount(0);
});

test("WhatsApp FAB hides only when showWhatsapp is explicitly false; Feedback remains", async ({ page }) => {
  await simulateQuotaOutage(page, { show_whatsapp: false, show_feedback: true, show_phone: true, show_legal_links: true, newsletter_enabled: false });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const footer = page.locator("app-customer-footer-v70");
  await expect(footer.getByRole("button", { name: "Geri Bildirim Gönder", exact: true })).toBeVisible();
  await page.waitForTimeout(900);
  await expect(page.locator('a[data-chrome="whatsapp-fab"]')).toHaveCount(0);
  await expect(footer.locator("a.contact-pill.whatsapp")).toHaveCount(0);
});

test("fresh admin copy replaces built-in defaults in place when the database recovers", async ({ page }) => {
  let recovered = false;
  await page.route(/\/rest\/v1\//, async (route: Route) => {
    const url = route.request().url();
    if (recovered && /\/rest\/v1\/homepage_sections\?/.test(url)) {
      await fulfillSupabase(route, 200, JSON.stringify([{ section_key: "rental_featured", title: "Yeni Sezon Kiralık Araçlar", section_type: "VEHICLES", is_enabled: true, sort_order: 10, max_items: 5, settings: { category: "RENTAL", description: "Yönetim panelinden gelen güncel açıklama." } }]));
      return;
    }
    if (recovered && /\/rest\/v1\/homepage_placements\?/.test(url)) {
      await fulfillSupabase(route, 200, "[]");
      return;
    }
    await fulfillSupabase(route, 402, QUOTA_BODY);
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const heading = page.locator('[id="rental_featured-title"]');
  await expect(heading).toHaveText("Kiralık Araçlar");

  recovered = true;
  await page.locator('app-dynamic-home-section:has([id="rental_featured-title"])').getByRole("button", { name: /yeniden yükle/i }).first().click();
  await expect(heading).toHaveText("Yeni Sezon Kiralık Araçlar");
  await expect(page.locator('app-dynamic-home-section:has([id="rental_featured-title"]) .head .desc')).toHaveText("Yönetim panelinden gelen güncel açıklama.");
});
