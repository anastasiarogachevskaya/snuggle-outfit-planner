import { isNativeApp } from "@/lib/platform";

/**
 * Subtle native haptics (iOS/Android via Capacitor).
 *
 * Every helper is fire-and-forget and no-ops on the web, so a missing plugin
 * or a failing call can never block or break the real action.
 *
 * A tiny per-type rate limiter prevents rapid repeated taps from stacking
 * duplicate haptics for the same action.
 */

const MIN_INTERVAL_MS = 100;
const lastFired = new Map<string, number>();

type Runner = (haptics: typeof import("@capacitor/haptics")) => Promise<unknown>;

function fire(key: string, run: Runner): void {
  if (!isNativeApp()) return;

  const now = Date.now();
  const previous = lastFired.get(key);
  if (previous != null && now - previous < MIN_INTERVAL_MS) return;
  lastFired.set(key, now);

  void (async () => {
    try {
      const mod = await import("@capacitor/haptics");
      await run(mod);
    } catch (error) {
      if (import.meta.env.DEV) console.info("Haptics unavailable", error);
    }
  })();
}

/** Light tap: primary buttons, opening sheets, starting a refresh. */
export function lightHaptic(): void {
  fire("light", ({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }));
}

/** Selection change: segmented choices, toggles, steppers. */
export function selectionHaptic(): void {
  fire("selection", ({ Haptics }) => Haptics.selectionChanged());
}

/** Success notification: saved profile, saved wardrobe, feedback sent. */
export function successHaptic(): void {
  fire("success", ({ Haptics, NotificationType }) =>
    Haptics.notification({ type: NotificationType.Success }),
  );
}

/** Warning notification: failed save, invalid action, permission failure. */
export function warningHaptic(): void {
  fire("warning", ({ Haptics, NotificationType }) =>
    Haptics.notification({ type: NotificationType.Warning }),
  );
}
