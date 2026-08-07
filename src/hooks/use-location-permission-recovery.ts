import { useEffect } from "react";
import { onAppResume } from "@/lib/native-lifecycle";
import { checkLocationPermission } from "@/lib/location-service";

/**
 * Clears a stale "location denied" state after the user grants access in
 * iPhone Settings and returns to the app.
 *
 * Only re-checks the permission (never requests it), and only while a denied
 * state is actually being shown. No-ops on the web.
 */
export function useLocationPermissionRecovery(active: boolean, onGranted: () => void) {
  useEffect(() => {
    if (!active) return;
    return onAppResume(() => {
      void checkLocationPermission().then((state) => {
        if (state === "granted") onGranted();
      });
    });
  }, [active, onGranted]);
}
