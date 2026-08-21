import type { Page } from "@playwright/test";

/**
 * Deny geolocation at the browser level and make the Capacitor plugin (used by
 * the iOS build) report a denied permission too, so both code paths in
 * src/lib/location-service.ts exercise the same failure.
 */
export async function denyGeolocation(page: Page, opts: { native?: boolean } = {}) {
  await page.addInitScript(
    ({ native }) => {
      const denied = {
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: "User denied Geolocation",
      };
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (_ok: unknown, fail?: (e: unknown) => void) => fail?.(denied),
          watchPosition: () => 0,
          clearWatch: () => {},
        },
      });
      if (native) {
        // Minimal Capacitor bridge stub: native platform, geolocation denied.
        (window as unknown as Record<string, unknown>)["Capacitor"] = {
          platform: "ios",
          isNativePlatform: () => true,
          isPluginAvailable: () => true,
          getPlatform: () => "ios",
          convertFileSrc: (s: string) => s,
          Plugins: {
            Geolocation: {
              checkPermissions: async () => ({ location: "denied" }),
              requestPermissions: async () => ({ location: "denied" }),
              getCurrentPosition: () => new Promise(() => {}),
            },
          },
        };
      }
    },
    { native: opts.native ?? false },
  );
}

/** Deterministic city search + weather responses; geocoding reverse lookups stall. */
export async function stubOpenMeteo(
  page: Page,
  opts: { stallReverseGeocode?: boolean; tempC?: number } = {},
) {
  const tempC = opts.tempC ?? 8;

  await page.route("**/geocoding-api.open-meteo.com/v1/reverse**", async (route) => {
    if (opts.stallReverseGeocode) {
      // Never respond: the client-side 6s abort must kick in.
      await new Promise((r) => setTimeout(r, 30_000));
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [{ name: "Helsinki", country: "Finland" }] }),
    });
  });

  await page.route("**/geocoding-api.open-meteo.com/v1/search**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            id: 658225,
            name: "Helsinki",
            country: "Finland",
            admin1: "Uusimaa",
            latitude: 60.17,
            longitude: 24.94,
          },
        ],
      }),
    }),
  );

  await page.route("**/api.open-meteo.com/v1/forecast**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        current: {
          temperature_2m: tempC,
          apparent_temperature: tempC - 2,
          wind_speed_10m: 12,
          weather_code: 3,
          uv_index: 1,
        },
      }),
    }),
  );
}
