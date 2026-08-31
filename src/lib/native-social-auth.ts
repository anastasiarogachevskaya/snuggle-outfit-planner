import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, getPlatform } from "@/lib/platform";
import { NATIVE_AUTH_CALLBACK_URL } from "@/lib/auth-urls";

/**
 * These two Capacitor packages must stay dynamically imported, not static:
 * their ESM builds re-export `./definitions` without a `.js` extension,
 * which Node's strict ESM resolver rejects outright — a static top-level
 * import breaks server-side rendering for every page (this module is
 * imported by __root.tsx), not just the native app.
 *
 * That reintroduces the risk fixed for geolocation in location-service.ts:
 * a runtime import() of a Capacitor plugin never resolves inside the iOS
 * WKWebView (server.url mode) unless the chunk was already preloaded. So
 * instead of importing lazily right when the user taps a button, we warm
 * these two chunks eagerly during native startup (see
 * preloadNativeSocialAuth, called from native-lifecycle.ts in the same
 * early burst that already works for the App/SplashScreen plugins) and
 * just await the same cached promise here.
 */
let appleSignInModule: Promise<typeof import("@capacitor-community/apple-sign-in")> | null = null;
let browserModule: Promise<typeof import("@capacitor/browser")> | null = null;

function loadAppleSignIn() {
  appleSignInModule ??= import("@capacitor-community/apple-sign-in");
  return appleSignInModule;
}

function loadBrowser() {
  browserModule ??= import("@capacitor/browser");
  return browserModule;
}

/** Warms both plugin chunks early so the later real call resolves instantly. */
export function preloadNativeSocialAuth(): void {
  if (!isNativeApp()) return;
  void loadAppleSignIn();
  void loadBrowser();
}

/**
 * Native (Capacitor/iOS) social sign-in.
 *
 * Web keeps using the Lovable OAuth helper untouched — nothing in this module
 * runs in a browser. Tokens are never logged or stored by hand: Supabase owns
 * the session.
 */

export type NativeSocialResult =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "pending" } // browser opened; the deep link finishes the job
  | { status: "error"; message: string };

/** iOS bundle identifier, also the Apple "client id" for native sign-in. */
export const APPLE_NATIVE_CLIENT_ID = "online.layerly.app";

function log(message: string) {
  if (import.meta.env.DEV) console.info(`[Auth] ${message}`);
}

export function logAuthAttempt(provider: "apple" | "google", native: boolean) {
  log(`platform: ${getPlatform() === "web" ? "web" : getPlatform()}`);
  log(`provider: ${provider}`);
  log(`native flow: ${native ? "yes" : "no"}`);
  if (native) log(`OAuth redirect: ${NATIVE_AUTH_CALLBACK_URL}`);
}

/** Cryptographically secure raw nonce (URL-safe). */
function createRawNonce(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function isCancellation(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return (
    message.includes("cancel") ||
    message.includes("1001") || // ASAuthorizationError.canceled
    message.includes("popup_closed")
  );
}

/** Native Sign in with Apple via ASAuthorization + Supabase ID-token exchange. */
export async function signInWithAppleNative(): Promise<NativeSocialResult> {
  if (!isNativeApp()) return { status: "error", message: "Native Apple sign-in is iOS only." };

  try {
    const { SignInWithApple } = await loadAppleSignIn();

    const rawNonce = createRawNonce();
    const hashedNonce = await sha256Hex(rawNonce);

    const result = await SignInWithApple.authorize({
      clientId: APPLE_NATIVE_CLIENT_ID,
      redirectURI: NATIVE_AUTH_CALLBACK_URL,
      scopes: "email name",
      state: rawNonce.slice(0, 16),
      nonce: hashedNonce,
    });

    const identityToken = result?.response?.identityToken;
    log(`Apple credential received: ${identityToken ? "yes" : "no"}`);
    if (!identityToken) {
      return { status: "error", message: "Apple did not return a credential. Please try again." };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: identityToken,
      nonce: rawNonce,
    });

    if (error) {
      log("session established: no");
      return { status: "error", message: error.message };
    }
    log("session established: yes");

    // Apple only sends the name on the very first consent — keep it if we
    // don't already have one.
    const givenName = result.response.givenName ?? "";
    const familyName = result.response.familyName ?? "";
    const fullName = `${givenName} ${familyName}`.trim();
    const existingName = (data.user?.user_metadata as Record<string, unknown> | undefined)?.[
      "full_name"
    ];
    if (fullName && !existingName) {
      try {
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      } catch {
        /* name is a nicety, never fail sign-in over it */
      }
    }

    return { status: "success" };
  } catch (error) {
    if (isCancellation(error)) return { status: "cancelled" };
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Apple sign-in failed.",
    };
  }
}

/**
 * Native Google sign-in: Supabase mints the OAuth URL, the system browser
 * handles it, and `layerly://auth/callback` comes back to
 * `src/lib/native-auth-link.ts`.
 */
export async function signInWithGoogleNative(): Promise<NativeSocialResult> {
  if (!isNativeApp()) return { status: "error", message: "Native Google sign-in is iOS only." };

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: NATIVE_AUTH_CALLBACK_URL,
        skipBrowserRedirect: true,
      },
    });

    if (error) return { status: "error", message: error.message };
    if (!data?.url) return { status: "error", message: "Could not start Google sign-in." };

    const { Browser } = await loadBrowser();
    await Browser.open({ url: data.url, presentationStyle: "popover" });
    return { status: "pending" };
  } catch (error) {
    if (isCancellation(error)) return { status: "cancelled" };
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Google sign-in failed.",
    };
  }
}

/** Dismisses the in-app browser after the deep link returns. Never throws. */
export async function closeAuthBrowser(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Browser } = await loadBrowser();
    await Browser.close();
  } catch {
    /* closing is best-effort; the session is already established */
  }
}
