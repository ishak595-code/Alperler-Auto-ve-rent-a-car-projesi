import { expect, test } from "@playwright/test";

async function frameSettled(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function overlayState(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const dialog = document.getElementById("feedback-dialog");
    const rect = dialog?.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      dialogX: rect?.x ?? null,
      dialogY: rect?.y ?? null,
      dialogWidth: rect?.width ?? null,
      dialogHeight: rect?.height ?? null,
      bodyPosition: document.body.style.position,
      bodyOverflow: document.body.style.overflow,
      modalFlag: document.documentElement.dataset["feedbackModalOpen"] || "",
      overflowFree: document.documentElement.scrollWidth <= window.innerWidth + 2,
      activeInsideDialog: Boolean(dialog && document.activeElement && dialog.contains(document.activeElement)),
    };
  });
}

test("V234 feedback opens as a stable full-screen managed modal and restores the page", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  const feedbackButton = page.locator("app-customer-footer-v70 button").filter({ hasText: /geri bildirim/i }).first();
  await expect(feedbackButton).toBeVisible();
  await feedbackButton.scrollIntoViewIfNeeded();
  await frameSettled(page);
  const beforeOpenScrollY = await page.evaluate(() => window.scrollY);

  await feedbackButton.click();
  const dialog = page.locator("#feedback-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("role", "dialog");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await frameSettled(page);

  const first = await overlayState(page);
  await page.waitForTimeout(180);
  await frameSettled(page);
  const second = await overlayState(page);

  expect(first.dialogX).not.toBeNull();
  expect(first.dialogY).not.toBeNull();
  expect(first.dialogWidth).not.toBeNull();
  expect(first.dialogHeight).not.toBeNull();
  expect(Math.abs(first.dialogX ?? 0)).toBeLessThanOrEqual(1);
  expect(Math.abs(first.dialogY ?? 0)).toBeLessThanOrEqual(1);
  expect(first.dialogWidth ?? 0).toBeGreaterThanOrEqual(first.viewportWidth - 1);
  expect(first.dialogHeight ?? 0).toBeGreaterThanOrEqual(first.viewportHeight - 1);
  expect(second.dialogWidth).toBe(first.dialogWidth);
  expect(second.dialogHeight).toBe(first.dialogHeight);
  expect(second.bodyPosition).toBe("fixed");
  expect(second.bodyOverflow).toBe("hidden");
  expect(second.modalFlag).toBe("true");
  expect(second.overflowFree).toBe(true);
  expect(second.activeInsideDialog).toBe(true);

  await page.keyboard.press("Tab");
  expect((await overlayState(page)).activeInsideDialog).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await frameSettled(page);
  const afterEscapeScrollY = await page.evaluate(() => window.scrollY);
  expect(Math.abs(afterEscapeScrollY - beforeOpenScrollY)).toBeLessThanOrEqual(2);
  await expect(feedbackButton).toBeFocused();

  await feedbackButton.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /geri bildirimi kapat/i }).click();
  await expect(dialog).toBeHidden();
  await frameSettled(page);

  const finalState = await page.evaluate(() => ({
    position: document.body.style.position,
    overflow: document.body.style.overflow,
    modalFlag: document.documentElement.dataset["feedbackModalOpen"] || "",
    overflowFree: document.documentElement.scrollWidth <= window.innerWidth + 2,
  }));
  expect(finalState.position).not.toBe("fixed");
  expect(finalState.modalFlag).toBe("");
  expect(finalState.overflowFree).toBe(true);
});
