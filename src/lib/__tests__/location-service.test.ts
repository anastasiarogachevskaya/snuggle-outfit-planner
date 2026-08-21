// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

/**
 * These tests guard the "Locating…" busy state: every path through
 * getCurrentLocation() must settle, so callers can always clear their spinner.
 */

type PermState = "granted" | "denied" | "prompt" | "prompt-with-rationale";

let nativePlatform = true;
let pluginAvailable = true;
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
  isGeolocationPluginAvailable: () => nativePlatform && pluginAvailable,
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

/** Replace navigator with a minimal geolocation stub. */
function stubNavigator(geolocation?: Partial<Geolocation>) {
  Object.defineProperty(globalThis, "navigator", {
    value: geolocation ? { geolocation } : {},
    configurable: true,
    writable: true,
  });
}

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
    stubNavigator({ getCurrentPosition: () => {} });
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
    stubNavigator({
      getCurrentPosition: (_ok, fail) =>
        fail?.({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 } as GeolocationPositionError),
    });

    const res = await getCurrentLocation();
    expect(res.status).toBe("permission-denied");
  });

  it("settles with timeout when the browser reports a timeout", async () => {
    stubNavigator({
      getCurrentPosition: (_ok, fail) =>
        fail?.({ code: 3, PERMISSION_DENIED: 1, TIMEOUT: 3 } as GeolocationPositionError),
    });

    const res = await getCurrentLocation();
    expect(res.status).toBe("timeout");
  });

  it("settles with unavailable when geolocation is missing", async () => {
    stubNavigator();

    const res = await getCurrentLocation();
    expect(res.status).toBe("unavailable");
  });
});

/**
 * The hard budget: no call may take longer than the native watchdog (12s).
 * Failure paths must settle far sooner than that.
 */
const WATCHDOG_BUDGET_MS = 12000;

async function timed(): Promise<{ status: string; elapsed: number }> {
  const started = Date.now();
  const res = await getCurrentLocation();
  return { status: res.status, elapsed: Date.now() - started };
}

describe("getCurrentLocation — watchdog budget", () => {
  it("settles permission-denied well within the watchdog budget", async () => {
    checkPermissions = async () => ({ location: "denied" });
    getCurrentPosition = never;

    const { status, elapsed } = await timed();
    expect(status).toBe("permission-denied");
    expect(elapsed).toBeLessThanOrEqual(WATCHDOG_BUDGET_MS);
    expect(elapsed).toBeLessThan(1000);
  });

  it("settles location-disabled (OS location services off) within the budget", async () => {
    checkPermissions = async () => ({ location: "granted" });
    getCurrentPosition = async () => {
      throw new Error("Location services are not enabled");
    };

    const { status, elapsed } = await timed();
    expect(status).toBe("location-disabled");
    expect(elapsed).toBeLessThanOrEqual(WATCHDOG_BUDGET_MS);
    expect(elapsed).toBeLessThan(1000);
  });

  it("settles a plugin timeout within the budget", async () => {
    getCurrentPosition = async () => {
      throw new Error("Position request timed out");
    };

    const { status, elapsed } = await timed();
    expect(status).toBe("timeout");
    expect(elapsed).toBeLessThanOrEqual(WATCHDOG_BUDGET_MS);
    expect(elapsed).toBeLessThan(1000);
  });

  it("caps a hung native plugin at the watchdog budget", async () => {
    getCurrentPosition = never;
    checkPermissions = async () => ({ location: "granted" });

    const { status, elapsed } = await timed();
    expect(status).toBe("timeout");
    expect(elapsed).toBeLessThanOrEqual(WATCHDOG_BUDGET_MS + 1500);
  }, 20000);

  it("caps a hung browser request at the watchdog budget", async () => {
    nativePlatform = false;
    stubNavigator({ getCurrentPosition: () => {} });

    const { status, elapsed } = await timed();
    expect(status).toBe("timeout");
    expect(elapsed).toBeLessThanOrEqual(WATCHDOG_BUDGET_MS + 1500);
  }, 20000);
});
