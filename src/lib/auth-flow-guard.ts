/**
 * Records that *this app* started an auth flow, so an incoming
 * `layerly://auth/...` deep link can be checked against it.
 *
 * `layerly://` is a custom URL scheme, which iOS lets any web page or app
 * trigger. Without this, a drive-by link carrying an attacker's own
 * access/refresh tokens would be handed straight to `setSession()` and the
 * victim's app would silently adopt the attacker's account — after which the
 * parent types their baby's name, birth date and home location into it.
 *
 * PKCE (`code`) links protect themselves: the verifier is local, so a
 * stranger's code cannot be exchanged. Bearer tokens and OTP hashes carry no
 * such proof, so those two paths require a flow this app actually began.
 */

const KEY = "layerly:auth-flow";

/** Email links stay valid for a while, so the window has to be generous. */
const EMAIL_TTL_MS = 24 * 60 * 60 * 1000;
/** A browser OAuth round trip happens in the foreground, in seconds. */
const OAUTH_TTL_MS = 15 * 60 * 1000;

type PendingFlow = {
  kind: "email" | "oauth";
  /** Known for email flows only — the address the user typed. */
  email?: string;
  startedAt: number;
};

/**
 * Mirrors the stored record. Without this, a browser that refuses
 * localStorage (Safari private mode, storage disabled) would fail every
 * pending-flow check and block legitimate sign-ins — the guard degrades to
 * "survives while the page lives" instead of locking the user out.
 */
let inMemory: PendingFlow | null = null;

function fresh(flow: PendingFlow | null): PendingFlow | null {
  if (!flow || (flow.kind !== "email" && flow.kind !== "oauth")) return null;
  const ttl = flow.kind === "email" ? EMAIL_TTL_MS : OAUTH_TTL_MS;
  if (!Number.isFinite(flow.startedAt) || Date.now() - flow.startedAt > ttl) return null;
  return flow;
}

function read(): PendingFlow | null {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    if (raw) {
      const stored = fresh(JSON.parse(raw) as PendingFlow);
      if (stored) return stored;
      clearAuthFlow();
      return null;
    }
  } catch {
    /* fall through to the in-memory copy */
  }
  const mem = fresh(inMemory);
  if (!mem) inMemory = null;
  return mem;
}

function write(flow: PendingFlow): void {
  inMemory = flow;
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(flow));
  } catch {
    /* in-memory copy above is the fallback */
  }
}

/** Call when sending a confirmation, magic-link or password-reset email. */
export function markEmailAuthFlow(email: string): void {
  write({ kind: "email", email: email.trim().toLowerCase(), startedAt: Date.now() });
}

/** Call when opening the system browser for an OAuth provider. */
export function markOAuthFlow(): void {
  write({ kind: "oauth", startedAt: Date.now() });
}

export function clearAuthFlow(): void {
  inMemory = null;
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Whether a deep link carrying raw credentials should be honoured at all. */
export function hasPendingAuthFlow(): boolean {
  return read() !== null;
}

/**
 * For email flows we know which address the user asked for, so the session
 * that comes back must belong to it. Returns true when there is nothing to
 * check against (OAuth), since the TTL is the only guard available there.
 */
export function sessionMatchesPendingFlow(sessionEmail: string | null | undefined): boolean {
  const flow = read();
  if (!flow) return false;
  if (!flow.email) return true;
  return (sessionEmail ?? "").trim().toLowerCase() === flow.email;
}
