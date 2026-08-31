import { expect, test } from "@playwright/test";

test("admin payment settings route exists and preserves the secure return target", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "android-phone", "One canonical secure-route smoke pass is sufficient.");

  await page.goto("/admin/payments", { waitUntil: "domcontentloaded" });
  await expect(page.locator("app-not-found")).toHaveCount(0);
  await expect(page.locator("app-admin-login-v218")).toHaveCount(1);

  const redirected = new URL(page.url());
  expect(redirected.pathname).toBe("/admin/login");
  expect(redirected.searchParams.get("returnUrl")).toBe("/admin/payments");
  await expect(page.getByRole("heading", { name: "Admin Paneli" })).toBeVisible();
});
