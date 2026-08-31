import { isNativeApp } from "@/lib/platform";
import { logAppSource } from "@/lib/build-info";
import { applyStatusBar, resyncKeyboardState } from "@/lib/native-ui";
import { preloadNativeSocialAuth } from "@/lib/native-social-auth";


/**
 * Native app lifecycle (background / foreground / cold launch / deep links).
 *
 * Registered exactly once during startup. No-ops on the web, so normal
 * website behaviour is unchanged.
 */

type ResumeListener = () => void;
type DeepLinkHandler = (url: string) => void;

const resumeListeners = new Set<ResumeListener>();

let initialized = false;
let cleanup: (() => void) | null = null;
let deepLinkHandler: DeepLinkHandler | null = null;
let lastHandledUrl: string | null = null;

function devLog(message: string) {
  if (import.meta.env.DEV) console.info(`Layerly app state: ${message}`);
}

/**
 * Subscribe to "app came back to the foreground" (native only).
 * Returns an unsubscribe function.
 */
export function onAppResume(listener: ResumeListener): () => void {
  resumeListeners.add(listener);
  return () => {
    resumeListeners.delete(listener);
  };
}

/** Registers the handler used for cold- and warm-launch deep links. */
export function setDeepLinkHandler(handler: DeepLinkHandler | null): void {
  deepLinkHandler = handler;
}

function handleDeepLink(url: string | null | undefined) {
  if (!url) return;
  if (url === lastHandledUrl) return; // never process the same link twice
  lastHandledUrl = url;
  devLog("deep link received");
  deepLinkHandler?.(url);
}

function notifyResume() {
  for (const listener of resumeListeners) {
    try {
      listener();
    } catch (error) {
      if (import.meta.env.DEV) console.warn("Layerly resume listener failed", error);
    }
  }
}

async function register() {
  try {
    const { App } = await import("@capacitor/app");

    const stateHandle = await App.addListener("appStateChange", ({ isActive }) => {
      devLog(isActive ? "active" : "background");
      if (!isActive) return;

      // Restore native chrome; never reload the app or reset the route.
      void applyStatusBar();
      resyncKeyboardState();
      notifyResume();
    });

    const urlHandle = await App.addListener("appUrlOpen", ({ url }) => handleDeepLink(url));

    // Cold launch: process the launch URL once (if any).
    try {
      const launch = await App.getLaunchUrl();
      handleDeepLink(launch?.url);
    } catch {
      /* no launch url */
    }

    cleanup = () => {
      void stateHandle.remove();
      void urlHandle.remove();
    };
  } catch (error) {
    if (import.meta.env.DEV) console.warn("App plugin unavailable", error);
  }
}

async function hideSplash() {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* splash plugin not installed */
  }
}

/** Idempotent: safe under React StrictMode and HMR. */
export function initNativeLifecycle(): void {
  if (initialized) return;
  if (typeof document === "undefined") return;
  logAppSource();
  if (!isNativeApp()) return;
  initialized = true;

  // A cold launch must never start with a stale keyboard class.
  document.documentElement.classList.remove("keyboard-open");

  void register();
  void hideSplash();
  preloadNativeSocialAuth();
}


/** Removes native listeners (HMR disposal / tests). */
export function teardownNativeLifecycle(): void {
  cleanup?.();
  cleanup = null;
  initialized = false;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => teardownNativeLifecycle());
}
