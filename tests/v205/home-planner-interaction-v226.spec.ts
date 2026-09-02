import { expect, test } from "@playwright/test";

async function frameSettled(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function pageState(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const planner = document.querySelector<HTMLElement>("app-home-v71 .planner");
    const rect = planner?.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      plannerTop: rect?.top ?? null,
      overflowFree: document.documentElement.scrollWidth <= window.innerWidth + 2,
    };
  });
}

async function expectNoResidualJank(page: import("@playwright/test").Page): Promise<void> {
  await frameSettled(page);
  const first = await pageState(page);
  await page.waitForTimeout(180);
  await frameSettled(page);
  const second = await pageState(page);

  expect(first.plannerTop).not.toBeNull();
  expect(second.plannerTop).not.toBeNull();
  expect(first.overflowFree).toBe(true);
  expect(second.overflowFree).toBe(true);
  expect(Math.abs(second.scrollY - first.scrollY)).toBeLessThanOrEqual(2);
  expect(Math.abs((second.plannerTop ?? 0) - (first.plannerTop ?? 0))).toBeLessThanOrEqual(2);
}

test("V226 quick planner settles after touch interactions and routes with the chosen date", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const planner = page.locator("app-home-v71 .planner");
  const service = planner.locator('select[name="homeService"]');
  const action = planner.locator("button.planner-action");

  await expect(planner).toBeVisible();
  await expect(service).toBeVisible();
  await expect(action).toBeVisible();

  // Let the intentional hero entrance transition finish before measuring
  // interaction-induced movement. The regression target is residual jank,
  // not the designed first-paint animation.
  await page.waitForTimeout(900);
  await expectNoResidualJank(page);

  await service.scrollIntoViewIfNeeded();
  await service.selectOption("tour");
  await expectNoResidualJank(page);

  // Playwright may legitimately scroll a short landscape viewport to make
  // the target clickable. Settle that scroll before the validation click so
  // it cannot be misclassified as application jitter.
  await action.scrollIntoViewIfNeeded();
  await frameSettled(page);
  await action.click();
  await expect(planner.locator('[role="alert"]')).toBeVisible();
  await expect(planner.locator('[role="alert"]')).toContainText(/tarih/i);
  await expectNoResidualJank(page);

  const dateTrigger = planner.locator("app-accessible-native-date button.date-surface");
  await expect(dateTrigger).toBeVisible();
  await dateTrigger.scrollIntoViewIfNeeded();
  await frameSettled(page);
  await dateTrigger.click();

  const dialog = page.locator("dialog.calendar-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expectNoResidualJank(page);

  await dialog.getByRole("button", { name: "Bugün", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(dateTrigger).toHaveAttribute("aria-label", /tarihi değiştir/i);
  await expect(planner.locator(".planner-summary")).toContainText(/Tur/i);
  await expectNoResidualJank(page);

  await action.scrollIntoViewIfNeeded();
  await frameSettled(page);
  await action.click();
  await expect(page).toHaveURL(/\/tours\?start=\d{4}-\d{2}-\d{2}/);
  await expect(page.locator("app-not-found")).toHaveCount(0);
  expect((await pageState(page)).overflowFree).toBe(true);
});