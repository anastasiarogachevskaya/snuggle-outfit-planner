import { Capacitor } from "@capacitor/core";

export type AppPlatform = "web" | "ios" | "android";

/** Capacitor is bundle-safe, but guard anyway so SSR / missing plugins never throw. */
function safeCapacitor<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** True when running inside a Capacitor native shell (iOS/Android). */
export function isNativeApp(): boolean {
  return safeCapacitor(() => Capacitor.isNativePlatform() === true, false);
}

/** Raw platform reported by Capacitor: "web" | "ios" | "android". */
export function getPlatform(): AppPlatform {
  const platform = safeCapacitor(() => Capacitor.getPlatform(), "web");
  return platform === "ios" || platform === "android" ? platform : "web";
}

/** True only inside the Capacitor iOS app. */
export function isIOSApp(): boolean {
  return isNativeApp() && getPlatform() === "ios";
}

/** True when running as a normal website (any browser, including mobile Safari). */
export function isWebApp(): boolean {
  return !isNativeApp();
}

/**
 * True when the native Geolocation plugin is actually registered in the
 * running native shell.
 *
 * This matters because Capacitor silently falls back to its *web*
 * implementation (`navigator.geolocation`) when a plugin is missing from the
 * native build. Inside WKWebView that fallback never shows the iOS permission
 * dialog and can hang forever, so we check availability and fail loudly
 * instead.
 */
export function isGeolocationPluginAvailable(): boolean {
  if (!isNativeApp()) return false;
  return safeCapacitor(() => Capacitor.isPluginAvailable("Geolocation") === true, false);
}


/** Human label used by the optional debug indicator. */
export function getPlatformLabel(): string {
  if (isIOSApp()) return "iOS app";
  if (isNativeApp()) return `${getPlatform()} app`;
  return "Web";
}

/** Whether the optional debug indicator is enabled via VITE_SHOW_PLATFORM_DEBUG. */
export function isPlatformDebugEnabled(): boolean {
  return import.meta.env.VITE_SHOW_PLATFORM_DEBUG === "true";
}

let initialized = false;

/**
 * Applies `native-app` / `native-ios` classes to <html> when running inside
 * Capacitor. Safe to call multiple times; no-ops on the server.
 */
export function initPlatform(): void {
  if (initialized) return;
  if (typeof document === "undefined") return;
  initialized = true;

  const platform = getPlatform();

  if (isNativeApp()) {
    document.documentElement.classList.add("native-app");
    document.documentElement.classList.add(`native-${platform}`);
  }

  if (import.meta.env.DEV) {
    console.info(`Layerly platform: ${platform}`);
  }
}

