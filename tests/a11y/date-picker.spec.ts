import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Alperler accessible calendar", () => {
  test("Tarihi seç is one named button and the owned calendar preserves focus", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const component = page.locator("app-accessible-native-date").first();
    await expect(component).toBeVisible();

    const trigger = component.locator("button.date-surface");
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await expect(trigger).toHaveAttribute("aria-label", /Tarihi seç/i);
    await expect(trigger.locator("strong")).toHaveText("Tarihi seç");
    await expect(component.locator('input[type="date"]')).toHaveCount(0);

    await trigger.focus();
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");

    const dialog = page.locator(".calendar-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("role", "dialog");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(page.getByRole("button", { name: "Takvimi kapat" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Önceki ay" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sonraki ay" })).toBeVisible();

    const activeDay = dialog.locator('button.calendar-day[tabindex="0"]:not([disabled])');
    await expect(activeDay).toHaveCount(1);
    await expect(activeDay).toBeFocused();
    const firstDate = await activeDay.getAttribute("data-date");
    await activeDay.press("ArrowRight");
    const focusedDay = page.locator("button.calendar-day:focus");
    await expect(focusedDay).toBeVisible();
    const focusedDate = await focusedDay.getAttribute("data-date");
    expect(focusedDate).not.toBe(firstDate);

    const unlabeledDays = await dialog.locator("button.calendar-day").evaluateAll((buttons) =>
      buttons.filter((button) => !(button.getAttribute("aria-label") || "").trim()).length,
    );
    expect(unlabeledDays).toBe(0);

    const dayCellsWithoutButtons = await dialog.locator('[role="gridcell"]').evaluateAll((cells) =>
      cells.filter((cell) => !cell.querySelector("button.calendar-day")).length,
    );
    expect(dayCellsWithoutButtons).toBe(0);

    const a11y = await new AxeBuilder({ page })
      .include(".calendar-dialog")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(a11y.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("date trigger remains named after selection", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const component = page.locator("app-accessible-native-date").first();
    const trigger = component.locator("button.date-surface");
    await trigger.click();

    const dialog = page.locator(".calendar-dialog");
    const enabledDay = dialog.locator("button.calendar-day:not([disabled])").first();
    const spokenDate = await enabledDay.getAttribute("aria-label");
    expect(spokenDate).toBeTruthy();
    await enabledDay.click();

    await expect(dialog).toBeHidden();
    await expect(trigger).toHaveAttribute("aria-label", /tarihi değiştir/i);
    await expect(trigger.locator("strong")).toHaveText("Tarihi seç");
    await expect(trigger.locator("small")).not.toHaveText("");
  });
});
