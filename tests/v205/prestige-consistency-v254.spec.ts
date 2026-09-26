import { expect, test } from "../helpers/fixtures";

/**
 * V254 prestige consistency:
 * - homepage sections (built-in defaults and legacy light themes) render dark with ivory text,
 * - buttons/CTAs are sentence case (Turkish strings carry the rule, no CSS capitalisation),
 * - the empty date button centres "Tarihi seç" and choosing a date keeps the exact box size.
 */

test.use({ serviceWorkers: "block" });

const luminance = (rgb: string): number => {
  const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

test("V254 homepage sections and page chrome stay on the dark prestige palette", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const sections = page.locator("app-dynamic-home-section section.section");
  await expect(sections.first()).toBeAttached({ timeout: 20_000 });
  const rows = await sections.evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    const h2 = node.querySelector("h2");
    return { cls: node.className, bgColor: style.backgroundColor, bgImage: style.backgroundImage, ink: h2 ? getComputedStyle(h2).color : style.color };
  }));
  expect(rows.length).toBeGreaterThan(3);
  for (const row of rows) {
    // A light (white/cream/slate) block would show up as an opaque light background colour.
    const opaque = !/rgba\(0, 0, 0, 0\)|transparent/.test(row.bgColor);
    if (opaque) expect(luminance(row.bgColor), `${row.cls} background must be dark`).toBeLessThan(0.05);
    else expect(row.bgImage, `${row.cls} must paint a dark gradient`).toContain("gradient");
    expect(luminance(row.ink), `${row.cls} heading must be light ivory`).toBeGreaterThan(0.6);
  }
  const shellBg = await page.evaluate(() => {
    const root = document.querySelector(".layout-root");
    return root ? getComputedStyle(root).backgroundColor : "rgb(0, 0, 0)";
  });
  expect(luminance(shellBg)).toBeLessThan(0.05);
});

test("V254 buttons use sentence case in Turkish without CSS capitalisation", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const footer = page.locator("app-customer-footer-v70");
  await expect(footer.getByRole("button", { name: "Geri bildirim gönder", exact: true })).toBeAttached({ timeout: 20_000 });
  const offenders = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("button, a.primary, a.retry-button, .actions a")) {
      const style = getComputedStyle(el);
      if (style.textTransform === "capitalize") out.push(`capitalize: ${el.textContent?.trim()}`);
      if (style.textTransform === "uppercase") continue;
      // Material icon ligatures ("refresh", "arrow_forward") are glyph names, not copy.
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("mat-icon, .material-icons, svg").forEach((icon) => icon.remove());
      const text = (clone.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 60) continue;
      const words = text.split(" ").filter((w) => /^\p{L}/u.test(w));
      const bad = words.slice(1).filter((w) => /^\p{Lu}\p{Ll}/u.test(w) && !/^(Alperler|WhatsApp|Google|Facebook|Yüksekova|Hakkari|Rent|Car|KVKK)$/.test(w.replace(/[’'].*$/, "")));
      if (bad.length) out.push(text);
    }
    return out;
  });
  expect(offenders, "Title Case buttons found").toEqual([]);
});

test("V254 empty date button centres its label and keeps its size when a date is chosen", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const trigger = page.locator("app-home-v71 .when-variant.is-active app-accessible-native-date button.date-surface").first();
  await expect(trigger).toBeVisible();
  await trigger.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const geometry = () => trigger.evaluate((button) => {
    const box = button.getBoundingClientRect();
    const strong = button.querySelector("strong")!.getBoundingClientRect();
    return { height: box.height, width: box.width, offset: strong.top + strong.height / 2 - (box.top + box.height / 2) };
  });
  const empty = await geometry();
  expect(Math.abs(empty.offset), "Tarihi seç must be vertically centred").toBeLessThanOrEqual(1.5);
  await trigger.click();
  const dialog = page.locator("dialog.calendar-dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger.locator("small")).not.toHaveText(/^\s*$/);
  await page.waitForTimeout(300);
  const picked = await geometry();
  expect(Math.abs(picked.height - empty.height)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(picked.width - empty.width)).toBeLessThanOrEqual(0.5);
});
