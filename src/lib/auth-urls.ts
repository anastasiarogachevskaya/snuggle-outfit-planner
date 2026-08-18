import { isNativeApp } from "@/lib/platform";

/**
 * Where Supabase should send the user back to after an auth email / OAuth
 * consent.
 *
 * Native (Capacitor) builds use the registered `layerly://` custom scheme so
 * iOS can launch the installed app. The website keeps using its own HTTPS
 * origin exactly as before.
 */

export const NATIVE_SCHEME = "layerly://";
export const NATIVE_AUTH_CALLBACK_URL = "layerly://auth/callback";
export const NATIVE_PASSWORD_RESET_URL = "layerly://auth/reset-password";

function webOrigin(): string {
  if (typeof window === "undefined") return "https://layerly.online";
  return window.location.origin;
}

/** Redirect target for sign-up confirmation, magic links, and OAuth. */
export function authCallbackUrl(): string {
  return isNativeApp() ? NATIVE_AUTH_CALLBACK_URL : `${webOrigin()}/auth-callback`;
}

/** Redirect target for "forgot password" emails. */
export function passwordResetUrl(): string {
  return isNativeApp() ? NATIVE_PASSWORD_RESET_URL : `${webOrigin()}/reset-password`;
}
