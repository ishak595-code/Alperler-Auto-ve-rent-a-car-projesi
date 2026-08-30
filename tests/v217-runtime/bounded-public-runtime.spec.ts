import { expect, test, type Page, type Request } from "@playwright/test";

const LEGACY_FULL_CATALOG_PATHS = new Set([
  "/rest/v1/vehicles",
  "/rest/v1/tours",
  "/rest/v1/blog_posts",
  "/rest/v1/campaigns",
  "/rest/v1/catalog_media",
]);

interface ObservedRequest {
  method: string;
  path: string;
  url: string;
}

function observeRequests(page: Page): ObservedRequest[] {
  const requests: ObservedRequest[] = [];
  page.on("request", (request: Request) => {
    try {
      const url = new URL(request.url());
      requests.push({ method: request.method(), path: url.pathname, url: request.url() });
    } catch {
      // Ignore data/blob and other non-HTTP browser URLs.
    }
  });
  return requests;
}

async function openRoute(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 25_000 });
}

async function waitForRequest(
  requests: ObservedRequest[],
  predicate: (request: ObservedRequest) => boolean,
  message: string,
): Promise<void> {
  await expect.poll(
    () => requests.some(predicate),
    { timeout: 12_000, intervals: [100, 200, 350, 500, 750], message },
  ).toBeTruthy();
}

async function observeLateStartup(page: Page): Promise<void> {
  // Realtime keeps an intentional long-lived connection open, so networkidle is
  // the wrong readiness primitive. A short post-owner window still catches the
  // global coordinator's immediate startup work without waiting on WebSockets.
  await page.waitForTimeout(2_000);
}

test("customer homepage never hydrates legacy full catalog endpoints", async ({ page }) => {
  const requests = observeRequests(page);
  await openRoute(page, "/");
  await waitForRequest(
    requests,
    (request) => request.method === "GET" && [
      "/rest/v1/public_vehicle_catalog_v217",
      "/rest/v1/public_tour_catalog_v217",
      "/rest/v1/public_blog_catalog_v217",
      "/rest/v1/public_campaign_catalog_v217",
    ].includes(request.path),
    "Homepage did not reach a bounded V217 content owner",
  );
  await observeLateStartup(page);

  const regressions = requests.filter((request) => LEGACY_FULL_CATALOG_PATHS.has(request.path));
  expect(
    regressions,
    `Legacy full-catalog requests detected on customer homepage:\n${regressions.map((request) => `${request.method} ${request.url}`).join("\n")}`,
  ).toEqual([]);

  const boundedReads = requests.filter((request) =>
    request.method === "GET" &&
    [
      "/rest/v1/public_vehicle_catalog_v217",
      "/rest/v1/public_tour_catalog_v217",
      "/rest/v1/public_blog_catalog_v217",
      "/rest/v1/public_campaign_catalog_v217",
    ].includes(request.path),
  );
  expect(boundedReads.length, "Homepage should render public content through bounded V217 owners").toBeGreaterThan(0);
});

test("campaign route reads bounded V217 campaign view, never public base table", async ({ page }) => {
  const requests = observeRequests(page);
  await openRoute(page, "/campaigns");
  await waitForRequest(
    requests,
    (request) => request.method === "GET" && request.path === "/rest/v1/public_campaign_catalog_v217",
    "Campaign page did not call the bounded V217 campaign view",
  );
  await observeLateStartup(page);

  const publicViewGets = requests.filter((request) => request.method === "GET" && request.path === "/rest/v1/public_campaign_catalog_v217");
  expect(publicViewGets.length, "Campaign page did not call the bounded V217 campaign view").toBeGreaterThan(0);

  const listRequest = publicViewGets.find((request) => new URL(request.url).searchParams.get("limit") === "48");
  expect(listRequest, "Campaign page must enforce the 48-row public list bound").toBeTruthy();

  const baseTableReads = requests.filter((request) => request.method === "GET" && request.path === "/rest/v1/campaigns");
  expect(
    baseTableReads,
    `Public campaign page regressed to base-table reads:\n${baseTableReads.map((request) => request.url).join("\n")}`,
  ).toEqual([]);
});

test("FAQ route is bounded read-only and accordion state never writes", async ({ page }) => {
  const requests = observeRequests(page);
  await openRoute(page, "/faq");
  await waitForRequest(
    requests,
    (request) => request.method === "GET" && request.path === "/rest/v1/faqs",
    "FAQ page did not issue its bounded public read",
  );

  await expect(page.getByRole("heading", { name: "Sıkça Sorulan Sorular" })).toBeVisible();

  const faqGets = requests.filter((request) => request.method === "GET" && request.path === "/rest/v1/faqs");
  expect(
    faqGets.some((request) => new URL(request.url).searchParams.get("limit") === "100"),
    "FAQ public read must enforce limit=100",
  ).toBeTruthy();

  const questionButtons = page.locator("article button[aria-controls^='faq-answer-']");
  if (await questionButtons.count()) {
    const first = questionButtons.first();
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(350);
  }

  const mutations = requests.filter((request) =>
    request.path === "/rest/v1/faqs" && ["POST", "PATCH", "DELETE"].includes(request.method),
  );
  expect(
    mutations,
    `FAQ accordion produced a database mutation:\n${mutations.map((request) => `${request.method} ${request.url}`).join("\n")}`,
  ).toEqual([]);
});
