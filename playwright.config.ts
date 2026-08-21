import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env["E2E_PORT"] ?? 8080);
const baseURL = process.env["E2E_BASE_URL"] ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    // Geolocation permission is never granted: every project simulates a
    // device where location access is denied.
    permissions: [],
    trace: "on-first-retry",
  },
  projects: [
    {
      // Mirrors the Capacitor iOS build: the same web app inside an iPhone-sized
      // mobile webview with iOS Safari's user agent. Rendered by Chromium so CI
      // only needs one browser download.
      name: "ios-webview",
      use: {
        ...devices["Desktop Chrome"],
        viewport: devices["iPhone 13"].viewport,
        userAgent: devices["iPhone 13"].userAgent,
        deviceScaleFactor: devices["iPhone 13"].deviceScaleFactor,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env["E2E_BASE_URL"]
    ? undefined
    : {
        command: `bun run dev --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
