import { isNativeApp } from "@/lib/platform";

/**
 * Subtle native haptics (iOS/Android via Capacitor).
 *
 * Every helper is fire-and-forget and no-ops on the web, so a missing plugin
 * or a failing call can never block or break the real action.
 */

type Runner = (haptics: typeof import("@capacitor/haptics")) => Promise<unknown>;

function fire(run: Runner): void {
  if (!isNativeApp()) return;
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
  fire(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }));
}

/** Selection change: segmented choices, toggles, steppers. */
export function selectionHaptic(): void {
  fire(({ Haptics }) => Haptics.selectionChanged());
}

/** Success notification: saved profile, saved wardrobe, feedback sent. */
export function successHaptic(): void {
  fire(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success }));
}

/** Warning notification: failed save, invalid action, permission failure. */
export function warningHaptic(): void {
  fire(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Warning }));
}
