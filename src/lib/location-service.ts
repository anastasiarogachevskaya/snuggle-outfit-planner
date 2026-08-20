import { isNativeApp, isIOSApp, getPlatform } from "@/lib/platform";

export type LocationFailureStatus =
  | "permission-denied"
  | "permission-not-determined"
  | "location-disabled"
  | "timeout"
  | "unavailable"
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

function devLog(scope: string, err: unknown) {
  if (import.meta.env.DEV) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[location] ${scope}: ${message}`);
  }
}

/** Development-only, never includes coordinates. */
function devInfo(message: string) {
  if (import.meta.env.DEV) console.info(`[location] ${message}`);
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
        ? "Location access is off. Choose a location manually, or enable location access in iPhone Settings."
        : "Location access is off. Choose a location manually, or enable location access in your browser.";
    case "permission-not-determined":
      return "Location permission hasn't been granted yet. Try again, or choose a location manually.";
    case "location-disabled":
      return "Location services are turned off. Choose a location manually.";
    case "timeout":
      return "Finding your location took too long. Try again, or choose a location manually.";
    case "unavailable":
      return "Your location isn't available right now. Choose a location manually.";
    default:
      return "Couldn't get your location. Choose a location manually.";
  }
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

function mapNativeError(err: unknown): LocationResult {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const lower = message.toLowerCase();
  if (lower.includes("denied") || lower.includes("not authorized")) return { status: "permission-denied" };
  if (lower.includes("disabled") || lower.includes("location services")) return { status: "location-disabled" };
  if (lower.includes("timeout") || lower.includes("timed out")) return { status: "timeout" };
  if (lower.includes("unavailable") || lower.includes("unable")) return { status: "unavailable" };
  return { status: "error" };
}

async function getNativeLocation(): Promise<LocationResult> {
  try {
    const Geolocation = await nativeGeolocation();
    const perm = await Geolocation.checkPermissions();
    let state = perm.location ?? perm.coarseLocation;
    if (state === "prompt" || state === "prompt-with-rationale") {
      const asked = await Geolocation.requestPermissions({ permissions: ["location"] });
      state = asked.location ?? asked.coarseLocation;
    }
    if (state !== "granted") {
      return { status: state === "denied" ? "permission-denied" : "permission-not-determined" };
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: TIMEOUT_MS,
      maximumAge: MAX_AGE_MS,
    });
    return {
      status: "success",
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch (err) {
    devLog("native getCurrentPosition", err);
    return mapNativeError(err);
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
 * Concurrent calls share one in-flight request.
 */
export function getCurrentLocation(): Promise<LocationResult> {
  if (inFlight) return inFlight;
  const run = (isNativeApp() ? getNativeLocation() : getBrowserLocation()).finally(() => {
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
