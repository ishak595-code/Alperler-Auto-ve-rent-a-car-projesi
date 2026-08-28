import { defineConfig } from "@playwright/test";

const baseUse = {
  baseURL: "http://127.0.0.1:4175",
  trace: "retain-on-failure" as const,
  screenshot: "only-on-failure" as const,
  video: "retain-on-failure" as const,
};

export default defineConfig({
  testDir: "./tests/v205",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  timeout: 75_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  projects: [
    {
      name: "android-phone",
      use: {
        ...baseUse,
        browserName: "chromium",
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
        userAgent: "Mozilla/5.0 (Linux; Android 16; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
      },
    },
    {
      name: "iphone-webkit",
      use: {
        ...baseUse,
        browserName: "webkit",
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
      },
    },
    {
      name: "android-landscape-phone",
      use: {
        ...baseUse,
        browserName: "chromium",
        viewport: { width: 844, height: 390 },
        deviceScaleFactor: 2.5,
        isMobile: true,
        hasTouch: true,
        userAgent: "Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
      },
    },
    {
      name: "ipad-mini-webkit",
      use: {
        ...baseUse,
        browserName: "webkit",
        viewport: { width: 744, height: 1133 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
      },
    },
    {
      name: "android-tablet",
      use: {
        ...baseUse,
        browserName: "chromium",
        viewport: { width: 800, height: 1280 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop-chromium",
      use: {
        ...baseUse,
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      },
    },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    timeout: 150_000,
  },
});
