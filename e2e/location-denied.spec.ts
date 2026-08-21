import { test, expect } from "@playwright/test";
import { denyGeolocation, stubOpenMeteo } from "./fixtures";

/**
 * Guest ("Try Layerly") flow with location permission denied.
 * Runs on both the iPhone-sized iOS webview project and desktop.
 */
async function startGuestFlow(page: import("@playwright/test").Page) {
  await page.goto("/try");
  await page.getByRole("button", { name: /0\s*[–-]|month|year/i }).first().click();
  await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible();
}

test.describe("location permission denied", () => {
  test("stops showing “Locating…” and offers manual city search", async ({ page }, testInfo) => {
    await denyGeolocation(page, { native: testInfo.project.name === "ios-webview" });
    await stubOpenMeteo(page);
    await startGuestFlow(page);

    const gps = page.getByRole("button", { name: /Use my location|Locating/ });
    await gps.click();

    // The busy label must clear on its own, well inside the 12s watchdog.
    await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible({
      timeout: 14_000,
    });
    await expect(page.getByText("Locating…")).toHaveCount(0);

    // Manual fallback appears and stays usable.
    await expect(page.getByText(/search for your city instead/i)).toBeVisible();
    await page.getByPlaceholder("Start typing a city").fill("Helsin");
    await page.getByRole("option", { name: /Helsinki/ }).first().click();

    // Recommendation screen renders with the stubbed weather.
    await expect(page.getByText("Today's activity")).toBeVisible();
    await expect(page.getByText("8°")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  test("clears “Locating…” when reverse geocoding exceeds its abort window", async ({ page }) => {
    // Location succeeds, but the reverse-geocode call stalls past the 6s abort.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (ok: (p: unknown) => void) =>
            ok({ coords: { latitude: 60.17, longitude: 24.94, accuracy: 40 } }),
          watchPosition: () => 0,
          clearWatch: () => {},
        },
      });
    });
    await stubOpenMeteo(page, { stallReverseGeocode: true });
    await startGuestFlow(page);

    await page.getByRole("button", { name: "Use my location" }).click();

    // Falls back to no city label but still advances to the recommendation.
    await expect(page.getByText("Today's activity")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Locating…")).toHaveCount(0);
  });

  test("recommendation screen renders when geolocation is unavailable entirely", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
    });
    await stubOpenMeteo(page, { tempC: 18 });
    await startGuestFlow(page);

    await page.getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible({
      timeout: 16_000,
    });

    await page.getByPlaceholder("Start typing a city").fill("Helsin");
    await page.getByRole("option", { name: /Helsinki/ }).first().click();

    await expect(page.getByText("Today's activity")).toBeVisible();
    await expect(page.getByText("18°")).toBeVisible();
  });
});
