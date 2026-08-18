import { supabase } from "@/integrations/supabase/client";
import { NATIVE_SCHEME } from "@/lib/auth-urls";

/**
 * Handling of `layerly://auth/...` deep links.
 *
 * The iOS app renders the live website inside a WKWebView, so an incoming
 * custom-scheme URL is never loaded by the web view itself: Capacitor hands us
 * the raw URL and we must consume it with the official Supabase session APIs.
 *
 * Nothing here persists or logs tokens — `setSession`, `exchangeCodeForSession`
 * and `verifyOtp` own all credential storage.
 */

export type AuthDeepLinkKind = "callback" | "reset";

export type AuthDeepLinkResult =
  | { status: "ignored" }
  | { status: "duplicate" }
  | { status: "success"; kind: AuthDeepLinkKind }
  | { status: "error"; kind: AuthDeepLinkKind; message: string };

const EXPIRED_MESSAGE =
  "This link has expired or is no longer valid. Please request a new one.";

type ParsedAuthLink = {
  kind: AuthDeepLinkKind;
  params: URLSearchParams;
  /** Stable identity of the link, used to never process the same one twice. */
  key: string;
};

function mergeParams(url: URL): URLSearchParams {
  const params = new URLSearchParams(url.search);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (hash) {
    new URLSearchParams(hash).forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }
  return params;
}

export function parseAuthDeepLink(rawUrl: string): ParsedAuthLink | null {
  if (!rawUrl || !rawUrl.toLowerCase().startsWith(NATIVE_SCHEME)) return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  // layerly://auth/callback  →  host "auth", pathname "/callback"
  const route = `${url.host}${url.pathname}`.replace(/\/+$/, "").toLowerCase();

  let kind: AuthDeepLinkKind;
  if (route === "auth/callback") kind = "callback";
  else if (route === "auth/reset-password") kind = "reset";
  else return null;

  const params = mergeParams(url);
  const key =
    params.get("code") ??
    params.get("access_token") ??
    params.get("token_hash") ??
    params.get("error_code") ??
    `${route}:${url.search}${url.hash}`;

  return { kind, params, key: `${kind}:${key}` };
}

const processedKeys = new Set<string>();
let inFlight: Promise<AuthDeepLinkResult> | null = null;

/**
 * Consumes an auth deep link exactly once (cold-start launch URL and
 * `appUrlOpen` may both deliver the same URL).
 */
export async function processAuthDeepLink(rawUrl: string): Promise<AuthDeepLinkResult> {
  const parsed = parseAuthDeepLink(rawUrl);
  if (!parsed) return { status: "ignored" };
  if (processedKeys.has(parsed.key)) return { status: "duplicate" };

  // A second delivery while the first exchange is still running must not run.
  processedKeys.add(parsed.key);
  if (inFlight) {
    await inFlight.catch(() => undefined);
    return { status: "duplicate" };
  }

  const run = consume(parsed);
  inFlight = run;
  try {
    return await run;
  } finally {
    inFlight = null;
  }
}

async function consume(parsed: ParsedAuthLink): Promise<AuthDeepLinkResult> {
  const { kind, params } = parsed;

  const fail = (): AuthDeepLinkResult => ({ status: "error", kind, message: EXPIRED_MESSAGE });

  if (params.get("error") || params.get("error_code")) return fail();

  try {
    const code = params.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return error ? fail() : { status: "success", kind };
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return error ? fail() : { status: "success", kind };
    }

    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as "signup" | "recovery" | "email" | "magiclink" | "invite",
        token_hash: tokenHash,
      });
      return error ? fail() : { status: "success", kind };
    }
  } catch {
    return fail();
  }

  // Missing required parameters.
  return fail();
}

/** Test/HMR helper — forgets which links were already consumed. */
export function resetAuthDeepLinkState() {
  processedKeys.clear();
  inFlight = null;
}

export { EXPIRED_MESSAGE as AUTH_LINK_EXPIRED_MESSAGE };
