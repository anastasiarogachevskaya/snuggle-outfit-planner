import {
  isNativeApp,
  isIOSApp,
  getPlatform,
  isGeolocationPluginAvailable,
} from "@/lib/platform";
import { recordLocationEvent, timeStep, type LocationDiagStep } from "@/lib/location-diagnostics";
// Static import: this used to be a runtime `import("@capacitor/geolocation")`,
// but that chunk isn't in any page's modulepreload list, and inside the iOS
// WKWebView (loaded via server.url) that lazy dynamic import never resolved —
// not even a rejection, just a permanent hang until the watchdog fired. A
// static import ships the plugin in the page's own bundle instead of relying
// on a runtime fetch+evaluate that WKWebView wasn't completing.
import { Geolocation } from "@capacitor/geolocation";

export type LocationFailureStatus =
  | "permission-denied"
  | "permission-restricted"
  | "permission-not-determined"
  | "location-disabled"
  | "timeout"
  | "unavailable"
  | "plugin-unavailable"
  | "error";

export type LocationResult =
  | { status: "success"; latitude: number; longitude: number; accuracy?: number }
  | { status: LocationFailureStatus; message?: string };

export type LocationPermission = "granted" | "denied" | "prompt" | "unknown";

/** Plugin-level timeout handed to Geolocation/navigator. */
const TIMEOUT_MS = 10000;
/**
 * Hard watchdog. The iOS Capacitor plugin can leave its promise pending forever
 * when CoreLocation never calls back (Location Services off at the OS level,
 * or a permission dialog dismissed by the system), so we never trust its own
 * timeout alone.
 */
const WATCHDOG_MS = 12000;
/** Weather only needs coarse coordinates; allow a few minutes of cache. */
const MAX_AGE_MS = 5 * 60 * 1000;

let inFlight: Promise<LocationResult> | null = null;

/**
 * Diagnostics are on in dev, and can be switched on for a TestFlight/App Store
 * build by running `localStorage.setItem("layerly:location-debug", "1")` in a
 * Safari Web Inspector session attached to the device. Coordinates are never
 * logged, in any mode.
 */
function debugEnabled(): boolean {
  // Native builds load the production web bundle, so keep diagnostics on there
  // too — they are the only way to see the plugin path in the Xcode console.
  if (import.meta.env.DEV || isNativeApp()) return true;
  try {
    return globalThis.localStorage?.getItem("layerly:location-debug") === "1";
  } catch {
    return false;
  }
}

function devLog(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  recordLocationEvent("note", `${scope}: ${message}`, { ok: false });
  if (debugEnabled()) {
    console.warn(`[location] ${scope}: ${message}`);
  }
}

/** Diagnostic line. Never includes coordinates. */
function devInfo(message: string, step: LocationDiagStep = "note") {
  recordLocationEvent(step, message);
  if (debugEnabled()) console.info(`[location] ${message}`);
}


/** Resolves to `fallback` if `promise` hasn't settled in `ms`. */
function withWatchdog(promise: Promise<LocationResult>, ms: number): Promise<LocationResult> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      devInfo("Location request failed: watchdog-timeout");
      resolve({ status: "timeout" });
    }, ms);
    promise.then(
      (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        devLog("watchdog rejected", err);
        resolve({ status: "error" });
      },
    );
  });
}

/** Friendly copy for a failed location attempt. */
export function locationErrorMessage(status: LocationFailureStatus): string {
  switch (status) {
    case "permission-denied":
      return isIOSApp()
        ? "Location access is off. Enable it in iPhone Settings or choose a location manually."
        : "Location access is off. Choose a location manually, or enable location access in your browser.";
    case "permission-restricted":
      return "Location access is restricted on this device (for example by Screen Time or a device policy). Choose a location manually.";
    case "permission-not-determined":
      return "Location permission hasn't been granted yet. Try again, or choose a location manually.";
    case "location-disabled":
      return "Location Services are turned off for this device. Turn them on in Settings, or choose a location manually.";
    case "timeout":
      return "Finding your location took too long. Try again, or choose a location manually.";
    case "unavailable":
      return "Your location isn't available right now. Choose a location manually.";
    case "plugin-unavailable":
      return "Location isn't available in this build of the app. Choose a location manually.";
    default:
      return "Couldn't get your location. Choose a location manually.";
  }
}

/** True when iOS will not show the system prompt again — offer Settings instead. */
export function shouldOfferAppSettings(status: LocationFailureStatus): boolean {
  return (
    status === "permission-denied" ||
    status === "permission-restricted" ||
    status === "location-disabled"
  );
}

/** Current permission state, without ever showing a prompt. */
export async function checkLocationPermission(): Promise<LocationPermission> {
  try {
    if (isNativeApp()) {
      const res = await Geolocation.checkPermissions();
      const state = res.location ?? res.coarseLocation;
      if (state === "granted") return "granted";
      if (state === "denied") return "denied";
      return "prompt";
    }
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      const res = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      return res.state === "granted" ? "granted" : res.state === "denied" ? "denied" : "prompt";
    }
  } catch (err) {
    devLog("checkPermission", err);
  }
  return "unknown";
}

/** Explicitly ask for foreground ("when in use") permission. User-initiated only. */
export async function requestLocationPermission(): Promise<LocationPermission> {
  if (!isNativeApp()) {
    // Browsers only prompt as part of a position request.
    return checkLocationPermission();
  }
  try {
    const res = await Geolocation.requestPermissions({ permissions: ["location"] });
    const state = res.location ?? res.coarseLocation;
    return state === "granted" ? "granted" : state === "denied" ? "denied" : "prompt";
  } catch (err) {
    devLog("requestPermission", err);
    return "unknown";
  }
}

function mapBrowserError(err: GeolocationPositionError): LocationResult {
  if (err.code === err.PERMISSION_DENIED) return { status: "permission-denied" };
  if (err.code === err.TIMEOUT) return { status: "timeout" };
  return { status: "unavailable" };
}

/**
 * The iOS plugin reports precise, stable error codes
 * (`OS-PLUG-GLOC-000X`) — prefer them over string matching so we never collapse
 * "restricted" or "services disabled" into a generic failure.
 */
function mapNativeError(err: unknown): LocationResult {
  const code = String((err as { code?: unknown } | null)?.code ?? "");
  if (code.includes("GLOC-0003")) return { status: "permission-denied" };
  if (code.includes("GLOC-0008")) return { status: "permission-restricted" };
  if (code.includes("GLOC-0007")) return { status: "location-disabled" };
  if (code.includes("GLOC-0002")) return { status: "unavailable" };

  const message = err instanceof Error ? err.message : String(err ?? "");
  const lower = message.toLowerCase();
  if (lower.includes("restricted")) return { status: "permission-restricted" };
  if (lower.includes("denied") || lower.includes("not authorized")) {
    return { status: "permission-denied" };
  }
  if (lower.includes("disabled") || lower.includes("location services")) {
    return { status: "location-disabled" };
  }
  if (lower.includes("timeout") || lower.includes("timed out")) return { status: "timeout" };
  if (lower.includes("unavailable") || lower.includes("unable")) return { status: "unavailable" };
  return { status: "error" };
}

async function getNativeLocation(force: boolean): Promise<LocationResult> {
  try {
    devInfo(`Capacitor native: ${isNativeApp()}`, "entry");
    devInfo(`Platform: ${getPlatform()}`, "entry");

    // Geolocation is imported statically (see top of file) specifically so
    // the plugin is registered with the bridge well before this check runs —
    // a runtime dynamic import of this module never resolved inside the iOS
    // WKWebView and hung until the watchdog fired.
    const registered = isGeolocationPluginAvailable();
    recordLocationEvent("plugin", `Geolocation plugin registered: ${registered ? "yes" : "no"}`, {
      ok: registered,
      patch: { pluginRegistered: registered },
    });
    if (!registered) {
      // Never silently fall back to navigator.geolocation here: inside
      // WKWebView it does not raise the iOS permission dialog.
      devInfo("Geolocation plugin registered: no — aborting (no browser fallback on native)");
      return { status: "plugin-unavailable" };
    }

    const before = await timeStep(
      "checkPermissions",
      "Geolocation.checkPermissions()",
      () => Geolocation.checkPermissions(),
      (res) => JSON.stringify(res),
    );
    recordLocationEvent("checkPermissions", `Permission before: ${JSON.stringify(before)}`, {
      patch: { lastPermissionBefore: JSON.stringify(before) },
    });

    let state: string | undefined = before.location ?? before.coarseLocation;
    const undetermined =
      before.location === "prompt" ||
      before.location === "prompt-with-rationale" ||
      before.coarseLocation === "prompt" ||
      before.coarseLocation === "prompt-with-rationale";

    recordLocationEvent(
      "requestPermissions",
      `requestPermissions called: ${undetermined ? "yes" : "no"}`,
      { patch: { lastRequestPermissionsCalled: undetermined } },
    );
    if (undetermined) {
      // Only path that can raise the native iOS dialog. Never called at launch.
      const asked = await timeStep(
        "requestPermissions",
        "Geolocation.requestPermissions()",
        () => Geolocation.requestPermissions({ permissions: ["location"] }),
        (res) => JSON.stringify(res),
      );
      recordLocationEvent("requestPermissions", `Permission after: ${JSON.stringify(asked)}`, {
        patch: { lastPermissionAfter: JSON.stringify(asked) },
      });
      state = asked.location ?? asked.coarseLocation;
    } else {
      recordLocationEvent(
        "requestPermissions",
        `Permission after: ${state} (unchanged, no prompt possible)`,
        { patch: { lastPermissionAfter: String(state) } },
      );
    }

    if (state !== "granted") {
      // iOS reports both "denied" and "restricted" as denied here; the precise
      // reason, when it matters, comes back on the getCurrentPosition error.
      recordLocationEvent("getCurrentPosition", `getCurrentPosition called: no (permission ${state})`, {
        patch: { lastGetCurrentPositionOutcome: `not called (permission ${state})` },
      });
      return { status: state === "denied" ? "permission-denied" : "permission-not-determined" };
    }

    const pos = await timeStep(
      "getCurrentPosition",
      `Geolocation.getCurrentPosition({ maximumAge: ${force ? 0 : MAX_AGE_MS} })`,
      () =>
        Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: TIMEOUT_MS,
          // A forced request must never be answered from the plugin cache.
          maximumAge: force ? 0 : MAX_AGE_MS,
        }),
      () => "position received",
    );
    recordLocationEvent("getCurrentPosition", "Location request succeeded", {
      ok: true,
      patch: { lastGetCurrentPositionOutcome: "success" },
    });
    return {
      status: "success",
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch (err) {
    devLog("native getCurrentPosition", err);
    const mapped = mapNativeError(err);
    recordLocationEvent("getCurrentPosition", `Location request failed: ${mapped.status}`, {
      ok: false,
      patch: { lastGetCurrentPositionOutcome: mapped.status },
    });
    return mapped;
  }
}

function getBrowserLocation(force: boolean): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      recordLocationEvent("plugin", "navigator.geolocation unavailable", {
        ok: false,
        patch: { pluginRegistered: false },
      });
      resolve({ status: "unavailable" });
      return;
    }
    const started = Date.now();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        recordLocationEvent("getCurrentPosition", "browser getCurrentPosition → success", {
          ok: true,
          durationMs: Date.now() - started,
          patch: { lastGetCurrentPositionOutcome: "success" },
        });
        resolve({
          status: "success",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        devLog("browser getCurrentPosition", err);
        const mapped = mapBrowserError(err);
        recordLocationEvent("getCurrentPosition", `browser getCurrentPosition → ${mapped.status}`, {
          ok: false,
          durationMs: Date.now() - started,
          patch: { lastGetCurrentPositionOutcome: mapped.status },
        });
        resolve(mapped);
      },
      {
        enableHighAccuracy: false,
        timeout: TIMEOUT_MS,
        maximumAge: force ? 0 : MAX_AGE_MS,
      },
    );
  });
}

export type GetCurrentLocationOptions = {
  /**
   * Forces a live GPS read: never reuses an in-flight request and never accepts
   * a cached position. Use for explicit "Use my current location" taps.
   */
  force?: boolean;
};

/**
 * Single, user-initiated current-position request. No watching, no history.
 * Concurrent calls share one in-flight request (unless forced), and every call
 * is guaranteed to settle: a watchdog resolves to a timeout state if the
 * platform never calls back.
 */
export function getCurrentLocation(options: GetCurrentLocationOptions = {}): Promise<LocationResult> {
  const force = options.force === true;
  if (inFlight && !force) {
    devInfo("request already in flight — reusing it");
    return inFlight;
  }
  if (inFlight && force) {
    recordLocationEvent(
      "override",
      "force override applied: ignoring in-flight/cached location, starting a fresh GPS request",
    );
    if (debugEnabled()) {
      console.info("[location] force override applied — starting a fresh GPS request");
    }
  } else if (force) {
    recordLocationEvent(
      "override",
      "force override applied: live GPS request (cached position not used)",
    );
  }

  const native = isNativeApp();
  const started = Date.now();
  recordLocationEvent("entry", `getCurrentLocation entered — isNativeApp=${native}, force=${force}`, {
    patch: {
      nativePathUsed: native,
      lastRunAt: started,
      lastOutcome: null,
      lastDurationMs: null,
    },
  });
  devInfo(native ? "calling native location service" : "calling browser geolocation");

  const run = withWatchdog(
    native ? getNativeLocation(force) : getBrowserLocation(force),
    native ? WATCHDOG_MS : TIMEOUT_MS + 2000,
  )
    .then((res) => {
      recordLocationEvent("outcome", `outcome: ${res.status}`, {
        ok: res.status === "success",
        durationMs: Date.now() - started,
        patch: { lastOutcome: res.status, lastDurationMs: Date.now() - started },
      });
      return res;
    })
    .finally(() => {
      inFlight = null;
    });
  inFlight = run;
  return run;
}


/** True when a "Open Settings" affordance makes sense (native app, already denied). */
export function canOpenAppSettings(): boolean {
  return isNativeApp();
}

/** Opens the app's iOS settings page. No-op on web. */
export async function openAppSettings(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { App } = await import("@capacitor/app");
    await (App as unknown as { openSettings?: () => Promise<void> }).openSettings?.();
  } catch (err) {
    devLog("openSettings", err);
  }
}
