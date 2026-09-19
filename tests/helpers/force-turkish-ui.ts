import type { BrowserContext, Page } from "@playwright/test";

/** Matches UiService localStorage key (src/services/ui.service.ts). */
export const ALPERLER_LANGUAGE_STORAGE_KEY = "alperler-language";

/** Suite default: pin UI to Turkish so TR-hardcoded assertions stay stable under CI navigator.languages → EN. */
export const FORCE_TURKISH_UI_VALUE = "TR";

/**
 * Installs an init script that sets alperler-language=TR before any page script runs.
 * Call on Page or BrowserContext before the first navigation.
 */
export async function forceTurkishUi(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: ALPERLER_LANGUAGE_STORAGE_KEY, value: FORCE_TURKISH_UI_VALUE },
  );
}

/** Context-level variant so every page/popup in the context inherits TR before first navigation. */
export async function forceTurkishUiOnContext(context: BrowserContext): Promise<void> {
  await context.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: ALPERLER_LANGUAGE_STORAGE_KEY, value: FORCE_TURKISH_UI_VALUE },
  );
}
