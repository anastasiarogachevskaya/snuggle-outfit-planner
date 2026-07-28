import { isIOSApp, isNativeApp } from "@/lib/platform";

/**
 * Native-only UI setup (status bar + keyboard).
 * No-ops on the web, never throws if a plugin is missing.
 */

let initialized = false;
let cleanup: (() => void) | null = null;

const KEYBOARD_CLASS = "keyboard-open";

async function setupStatusBar() {
  if (!isIOSApp()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light }); // Light = dark content on light bg
    await StatusBar.show();
  } catch (error) {
    console.warn("StatusBar unavailable", error);
  }
}

async function setupKeyboard() {
  if (!isNativeApp()) return;
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    const root = document.documentElement;

    const showHandle = await Keyboard.addListener("keyboardWillShow", () => {
      root.classList.add(KEYBOARD_CLASS);
    });
    const hideHandle = await Keyboard.addListener("keyboardWillHide", () => {
      root.classList.remove(KEYBOARD_CLASS);
    });

    cleanup = () => {
      root.classList.remove(KEYBOARD_CLASS);
      void showHandle.remove();
      void hideHandle.remove();
    };
  } catch (error) {
    console.warn("Keyboard plugin unavailable", error);
  }
}

/** Idempotent: safe to call on every mount / during HMR. */
export function initializeNativeUI(): void {
  if (initialized) return;
  if (typeof document === "undefined") return;
  if (!isNativeApp()) return;
  initialized = true;

  void setupStatusBar();
  void setupKeyboard();
}

/** Removes keyboard listeners (used by HMR disposal). */
export function teardownNativeUI(): void {
  cleanup?.();
  cleanup = null;
  initialized = false;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => teardownNativeUI());
}
