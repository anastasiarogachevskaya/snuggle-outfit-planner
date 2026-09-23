/**
 * TEMPORARY launch diagnostics. Records what the app decided during launch so
 * we can see why the wrong page shows under the splash. Enable with
 * ?launchdiag=1 (persists) and disable with ?launchdiag=0.
 */
export const LAUNCH_DIAG_KEY = "layerly:launchdiag";
export const NATIVE_SPLASH_TIMEOUT_MS = 8000;

export type LaunchEvent = { at: number; message: string };
type State = {
  destination: string | null;
  splashHideScheduledAt: number | null;
  splashHiddenAt: number | null;
  events: LaunchEvent[];
};

const state: State = {
  destination: null,
  splashHideScheduledAt: null,
  splashHiddenAt: null,
  events: [],
};
const listeners = new Set<() => void>();
let snapshot: State = { ...state, events: [] };

function emit() {
  snapshot = { ...state, events: [...state.events] };
  listeners.forEach((l) => l());
}

export function now(): number {
  return typeof performance !== "undefined" ? Math.round(performance.now()) : 0;
}

export function logLaunch(message: string) {
  if (typeof window === "undefined") return;
  state.events.push({ at: now(), message });
  emit();
}

export function setLaunchDestination(dest: string) {
  state.destination = dest;
  logLaunch(`destination → ${dest}`);
}

export function markSplashScheduled() {
  state.splashHideScheduledAt = now();
  logLaunch("splash hide scheduled (+700ms)");
}

export function markSplashHidden(ok: boolean) {
  state.splashHiddenAt = now();
  logLaunch(ok ? "splash hidden" : "splash hide failed / plugin missing");
}

export function subscribeLaunch(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function getLaunchSnapshot() {
  return snapshot;
}

export function isLaunchDiagEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const p = new URLSearchParams(window.location.search).get("launchdiag");
    if (p === "1") window.localStorage.setItem(LAUNCH_DIAG_KEY, "1");
    if (p === "0") window.localStorage.removeItem(LAUNCH_DIAG_KEY);
    return window.localStorage.getItem(LAUNCH_DIAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLaunchDiagEnabled(on: boolean) {
  try {
    if (on) window.localStorage.setItem(LAUNCH_DIAG_KEY, "1");
    else window.localStorage.removeItem(LAUNCH_DIAG_KEY);
  } catch {
    /* ignore */
  }
}
