import {
  isNativeApp,
  isIOSApp,
  getPlatform,
  isGeolocationPluginAvailable,
} from "@/lib/platform";

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
  if (import.meta.env.DEV) return true;
  try {
    return globalThis.localStorage?.getItem("layerly:location-debug") === "1";
  } catch {
    return false;
  }
}

function devLog(scope: string, err: unknown) {
  if (debugEnabled()) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[location] ${scope}: ${message}`);
  }
}

/** Diagnostic line. Never includes coordinates. */
function devInfo(message: string) {
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

async function nativeGeolocation() {
  const mod = await import("@capacitor/geolocation");
  return mod.Geolocation;
}

/** Current permission state, without ever showing a prompt. */
export async function checkLocationPermission(): Promise<LocationPermission> {
  try {
    if (isNativeApp()) {
      const Geolocation = await nativeGeolocation();
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
    const Geolocation = await nativeGeolocation();
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

async function getNativeLocation(): Promise<LocationResult> {
  try {
    devInfo(`Capacitor native: ${isNativeApp()}`);
    devInfo(`Platform: ${getPlatform()}`);

    if (!isGeolocationPluginAvailable()) {
      // Never silently fall back to navigator.geolocation here: inside
      // WKWebView it does not raise the iOS permission dialog.
      devInfo("Geolocation plugin registered: no — aborting (no browser fallback on native)");
      return { status: "plugin-unavailable" };
    }
    devInfo("Geolocation plugin registered: yes");

    const Geolocation = await nativeGeolocation();

    const before = await Geolocation.checkPermissions();
    devInfo(`Permission before: ${JSON.stringify(before)}`);

    let state: string | undefined = before.location ?? before.coarseLocation;
    const undetermined =
      before.location === "prompt" ||
      before.location === "prompt-with-rationale" ||
      before.coarseLocation === "prompt" ||
      before.coarseLocation === "prompt-with-rationale";

    devInfo(`requestPermissions called: ${undetermined ? "yes" : "no"}`);
    if (undetermined) {
      // Only path that can raise the native iOS dialog. Never called at launch.
      const asked = await Geolocation.requestPermissions({ permissions: ["location"] });
      devInfo(`Permission after: ${JSON.stringify(asked)}`);
      state = asked.location ?? asked.coarseLocation;
    } else {
      devInfo(`Permission after: ${state} (unchanged, no prompt possible)`);
    }

    if (state !== "granted") {
      // iOS reports both "denied" and "restricted" as denied here; the precise
      // reason, when it matters, comes back on the getCurrentPosition error.
      devInfo(`getCurrentPosition called: no (permission ${state})`);
      return { status: state === "denied" ? "permission-denied" : "permission-not-determined" };
    }

    devInfo("getCurrentPosition called: yes");
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: TIMEOUT_MS,
      maximumAge: MAX_AGE_MS,
    });
    devInfo("Location request succeeded");
    return {
      status: "success",
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch (err) {
    devLog("native getCurrentPosition", err);
    const mapped = mapNativeError(err);
    devInfo(`Location request failed: ${mapped.status}`);
    return mapped;
  }
}

function getBrowserLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ status: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          status: "success",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        devLog("browser getCurrentPosition", err);
        resolve(mapBrowserError(err));
      },
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: MAX_AGE_MS },
    );
  });
}

/**
 * Single, user-initiated current-position request. No watching, no history.
 * Concurrent calls share one in-flight request, and every call is guaranteed
 * to settle: a watchdog resolves to a timeout state if the platform never
 * calls back.
 */
export function getCurrentLocation(): Promise<LocationResult> {
  if (inFlight) return inFlight;
  const native = isNativeApp();
  const run = withWatchdog(
    native ? getNativeLocation() : getBrowserLocation(),
    native ? WATCHDOG_MS : TIMEOUT_MS + 2000,
  ).finally(() => {
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
