import { test as base, expect } from "@playwright/test";
import { forceTurkishUiOnContext } from "./force-turkish-ui";

/**
 * Suite-wide Playwright fixtures: every browser context gets alperler-language=TR
 * via addInitScript before first navigation. Import { test, expect } from here
 * instead of @playwright/test so device/CI jobs keep Turkish UI contracts.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await forceTurkishUiOnContext(context);
    await use(context);
  },
});

export { expect };
