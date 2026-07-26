export const AUTH_NEXT_STORAGE_KEY = "layer.auth.next";

export type AuthNextPath = "/today" | "/baby" | "/onboarding/wardrobe" | "/wardrobe" | "/account";

const DEFAULT_NEXT: AuthNextPath = "/today";

const ALLOWED_NEXT_PATHS: AuthNextPath[] = [
  "/today",
  "/baby",
  "/onboarding/wardrobe",
  "/wardrobe",
  "/account",
];

export function sanitizeAuthNext(value: string | null | undefined): AuthNextPath {
  if (!value) return DEFAULT_NEXT;

  let path = value;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return DEFAULT_NEXT;
    path = parsed.pathname;
  } catch {
    path = value.split("?")[0].split("#")[0];
  }

  return ALLOWED_NEXT_PATHS.includes(path as AuthNextPath) ? (path as AuthNextPath) : DEFAULT_NEXT;
}

export function storeAuthNext(value: string | null | undefined) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_NEXT_STORAGE_KEY, sanitizeAuthNext(value));
}

export function getStoredAuthNext(): AuthNextPath {
  if (typeof window === "undefined") return DEFAULT_NEXT;
  return sanitizeAuthNext(window.sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY));
}

export function clearStoredAuthNext() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
}
const AUTH_RETURN_URL_KEY = "layer.auth.returnUrl";

// A same-origin relative URL (path + query) to return to after sign-in.
// Used for flows outside the fixed allow-list, e.g. the OAuth consent screen.
export function storeAuthReturnUrl(value: string) {
  if (typeof window === "undefined") return;
  if (!value.startsWith("/") || value.startsWith("//")) return;
  window.sessionStorage.setItem(AUTH_RETURN_URL_KEY, value);
}

export function takeAuthReturnUrl(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(AUTH_RETURN_URL_KEY);
  window.sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
