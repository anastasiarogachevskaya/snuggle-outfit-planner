/**
 * Boot gate for the native app.
 *
 * Inside the iOS shell the WebView loads the live site, so the server always
 * sends the marketing landing page — even for a parent who already has a local
 * profile or an account. A tiny blocking script in <head> hides the page while
 * the app decides where to go, so the landing page never flashes. This module
 * releases that hold once the destination is known.
 */
export const BOOT_ATTR = "data-app-boot";

/** Inline script injected in <head>; runs before the body paints. */
export const BOOT_GATE_SCRIPT = `(function(){try{var c=window.Capacitor;var n=!!(c&&typeof c.isNativePlatform==='function'&&c.isNativePlatform());if(n&&window.location.pathname==='/'){document.documentElement.setAttribute('${BOOT_ATTR}','hold');}}catch(e){}})();`;

/** Reveals the page again. Safe to call repeatedly and on the server. */
export function releaseBootHold(): void {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute(BOOT_ATTR);
}
