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

function expectStable(before: { scrollY: number; plannerTop: number | null }, after: { scrollY: number; plannerTop: number | null }) {
  expect(after.plannerTop).not.toBeNull();
  expect(before.plannerTop).not.toBeNull();
  expect(Math.abs(after.scrollY - before.scrollY)).toBeLessThanOrEqual(2);
  expect(Math.abs((after.plannerTop ?? 0) - (before.plannerTop ?? 0))).toBeLessThanOrEqual(2);
}

test("V226 quick planner stays position-stable through touch selection and routes with the chosen date", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const planner = page.locator("app-home-v71 .planner");
  const service = planner.locator('select[name="homeService"]');
  const action = planner.locator("button.planner-action");

  await expect(planner).toBeVisible();
  await expect(service).toBeVisible();
  await expect(action).toBeVisible();
  await frameSettled(page);

  const initial = await pageState(page);
  expect(initial.overflowFree).toBe(true);

  await service.selectOption("tour");
  await frameSettled(page);
  const afterService = await pageState(page);
  expect(afterService.overflowFree).toBe(true);
  expectStable(initial, afterService);

  await action.click();
  await expect(planner.locator('[role="alert"]')).toBeVisible();
  await expect(planner.locator('[role="alert"]')).toContainText(/tarih/i);
  await frameSettled(page);
  const afterValidation = await pageState(page);
  expect(afterValidation.overflowFree).toBe(true);
  expectStable(afterService, afterValidation);

  const dateTrigger = planner.locator("app-accessible-native-date button.date-surface");
  await expect(dateTrigger).toBeVisible();
  await dateTrigger.click();

  const dialog = page.locator("dialog.calendar-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await frameSettled(page);
  const whileDialogOpen = await pageState(page);
  expect(whileDialogOpen.overflowFree).toBe(true);
  expectStable(afterValidation, whileDialogOpen);

  await dialog.getByRole("button", { name: "Bugün" }).click();
  await expect(dialog).toBeHidden();
  await expect(dateTrigger).toHaveAttribute("aria-label", /tarihi değiştir/i);
  await expect(planner.locator(".planner-summary")).toContainText(/Tur/i);
  await frameSettled(page);

  const afterDate = await pageState(page);
  expect(afterDate.overflowFree).toBe(true);
  expectStable(afterValidation, afterDate);

  await action.click();
  await expect(page).toHaveURL(/\/tours\?start=\d{4}-\d{2}-\d{2}/);
  await expect(page.locator("app-not-found")).toHaveCount(0);
  expect((await pageState(page)).overflowFree).toBe(true);
});
