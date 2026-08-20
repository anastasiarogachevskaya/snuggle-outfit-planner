// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

/**
 * These tests guard the "Locating…" busy state: every path through
 * getCurrentLocation() must settle, so callers can always clear their spinner.
 */

type PermState = "granted" | "denied" | "prompt" | "prompt-with-rationale";

let nativePlatform = true;
let checkPermissions: () => Promise<{ location: PermState }>;
let requestPermissions: () => Promise<{ location: PermState }>;
let getCurrentPosition: (opts?: unknown) => Promise<{
  coords: { latitude: number; longitude: number; accuracy: number };
}>;

const platformMock = {
  isNativeApp: () => nativePlatform,
  isWebApp: () => !nativePlatform,
  isIOSApp: () => nativePlatform,
  getPlatform: () => (nativePlatform ? "ios" : "web"),
  getPlatformLabel: () => (nativePlatform ? "iOS app" : "Web"),
};
// mock.module is process-wide in bun and other suites mock this module too, so
// re-register ours in beforeEach to stay independent of test file order.
mock.module("@/lib/platform", () => platformMock);

mock.module("@capacitor/geolocation", () => ({
  Geolocation: {
    checkPermissions: () => checkPermissions(),
    requestPermissions: () => requestPermissions(),
    getCurrentPosition: (opts?: unknown) => getCurrentPosition(opts),
  },
}));

const { getCurrentLocation, locationErrorMessage } = await import("../location-service");

const never = () => new Promise<never>(() => {});

beforeEach(() => {
  mock.module("@/lib/platform", () => platformMock);
  nativePlatform = true;
  checkPermissions = async () => ({ location: "granted" });
  requestPermissions = async () => ({ location: "granted" });
  getCurrentPosition = async () => ({
    coords: { latitude: 60.17, longitude: 24.94, accuracy: 50 },
  });
});

describe("getCurrentLocation — native", () => {
  it("resolves with coordinates when permission is granted", async () => {
    const res = await getCurrentLocation();
    expect(res.status).toBe("success");
  });

  it("settles with permission-denied when the user denies the prompt", async () => {
    checkPermissions = async () => ({ location: "prompt" });
    requestPermissions = async () => ({ location: "denied" });
    getCurrentPosition = never;

    const res = await getCurrentLocation();
    expect(res.status).toBe("permission-denied");
    expect(locationErrorMessage("permission-denied")).toContain("Location access is off");
  });

  it("settles with permission-denied when already denied, without prompting", async () => {
    let asked = false;
    checkPermissions = async () => ({ location: "denied" });
    requestPermissions = async () => {
      asked = true;
      return { location: "denied" as PermState };
    };
    getCurrentPosition = never;

    const res = await getCurrentLocation();
    expect(res.status).toBe("permission-denied");
    expect(asked).toBe(false);
  });

  it("settles with permission-not-determined when the prompt is dismissed", async () => {
    checkPermissions = async () => ({ location: "prompt" });
    requestPermissions = async () => ({ location: "prompt" });
    getCurrentPosition = never;

    const res = await getCurrentLocation();
    expect(res.status).toBe("permission-not-determined");
  });

  it("settles with location-disabled when OS location services are off", async () => {
    getCurrentPosition = async () => {
      throw new Error("Location services are not enabled");
    };

    const res = await getCurrentLocation();
    expect(res.status).toBe("location-disabled");
  });

  it("settles with timeout when the plugin reports a timeout", async () => {
    getCurrentPosition = async () => {
      throw new Error("Location request timed out.");
    };

    const res = await getCurrentLocation();
    expect(res.status).toBe("timeout");
  });

  it("settles with error on an unrecognised native failure", async () => {
    getCurrentPosition = async () => {
      throw new Error("kCLErrorDomain error 0");
    };

    const res = await getCurrentLocation();
    expect(res.status).toBe("error");
  });
});

describe("getCurrentLocation — watchdog", () => {
  const realSetTimeout = globalThis.setTimeout;

  afterEach(() => {
    globalThis.setTimeout = realSetTimeout;
  });

  /** Fire the watchdog immediately instead of waiting 12 real seconds. */
  function fastTimers() {
    globalThis.setTimeout = ((fn: () => void) =>
      realSetTimeout(fn, 0)) as unknown as typeof setTimeout;
  }

  it("resolves with timeout when the native plugin never calls back", async () => {
    getCurrentPosition = never;
    fastTimers();

    const res = await getCurrentLocation();
    expect(res.status).toBe("timeout");
  });

  it("resolves with timeout when permission checks hang", async () => {
    checkPermissions = never;
    fastTimers();

    const res = await getCurrentLocation();
    expect(res.status).toBe("timeout");
  });

  it("resolves with timeout when the browser never calls back", async () => {
    nativePlatform = false;
    // @ts-expect-error minimal navigator stub
    globalThis.navigator = { geolocation: { getCurrentPosition: () => {} } };
    fastTimers();

    const res = await getCurrentLocation();
    expect(res.status).toBe("timeout");
  });

  it("clears the in-flight request so a later call can succeed", async () => {
    getCurrentPosition = never;
    fastTimers();
    expect((await getCurrentLocation()).status).toBe("timeout");

    globalThis.setTimeout = realSetTimeout;
    getCurrentPosition = async () => ({
      coords: { latitude: 1, longitude: 2, accuracy: 10 },
    });
    expect((await getCurrentLocation()).status).toBe("success");
  });
});

describe("getCurrentLocation — browser", () => {
  beforeEach(() => {
    nativePlatform = false;
  });

  it("settles with permission-denied when the browser rejects", async () => {
    // @ts-expect-error minimal navigator stub
    globalThis.navigator = {
      geolocation: {
        getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) =>
          fail({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 }),
      },
    };

    const res = await getCurrentLocation();
    expect(res.status).toBe("permission-denied");
  });

  it("settles with timeout when the browser reports a timeout", async () => {
    // @ts-expect-error minimal navigator stub
    globalThis.navigator = {
      geolocation: {
        getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) =>
          fail({ code: 3, PERMISSION_DENIED: 1, TIMEOUT: 3 }),
      },
    };

    const res = await getCurrentLocation();
    expect(res.status).toBe("timeout");
  });

  it("settles with unavailable when geolocation is missing", async () => {
    // @ts-expect-error minimal navigator stub
    globalThis.navigator = {};

    const res = await getCurrentLocation();
    expect(res.status).toBe("unavailable");
  });
});
