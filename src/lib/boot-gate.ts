/**
 * Boot gate for the native app.
 *
 * Inside the iOS shell the WebView loads the live site, so the server always
 * sends the marketing landing page — even for a parent who already has a local
 * profile or an account. A tiny blocking script in <head> hides the page while
 * the app decides where to go, so the landing page never flashes. This module
 * releases that hold once the destination is known.
 */
import { logLaunch, markSplashHidden, markSplashScheduled } from "@/lib/launch-diagnostics";

export const BOOT_ATTR = "data-app-boot";

/** Inline script injected in <head>; runs before the body paints. */
export const BOOT_GATE_SCRIPT = `(function(){try{var c=window.Capacitor;var n=!!(c&&typeof c.isNativePlatform==='function'&&c.isNativePlatform());if(n&&window.location.pathname==='/'){document.documentElement.setAttribute('${BOOT_ATTR}','hold');}}catch(e){}})();`;

/** Reveals the page again. Safe to call repeatedly and on the server. */
let splashTimer: ReturnType<typeof setTimeout> | null = null;

export function releaseBootHold(): void {
  if (typeof document === "undefined") return;
  logLaunch(`boot hold released on ${window.location.pathname}`);
  document.documentElement.removeAttribute(BOOT_ATTR);
  scheduleSplashHide();
}

/**
 * Keeps the native launch screen up a little longer so the destination screen
 * (Today, setup, landing) has fully painted underneath before it fades away.
 * Native config still auto-hides after 8s as a safety net.
 */
function scheduleSplashHide(): void {
  const c = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!c?.isNativePlatform?.()) return;
  if (splashTimer) clearTimeout(splashTimer);
  markSplashScheduled();
  splashTimer = setTimeout(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        try {
          const { SplashScreen } = await import("@capacitor/splash-screen");
          await SplashScreen.hide({ fadeOutDuration: 250 });
          markSplashHidden(true);
        } catch {
          markSplashHidden(false);
        }
      }),
    );
  }, 700);
}
