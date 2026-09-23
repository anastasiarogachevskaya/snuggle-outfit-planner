import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { readGuestProfile } from "@/lib/guest-profile";
import {
  getLaunchSnapshot,
  isLaunchDiagEnabled,
  NATIVE_SPLASH_TIMEOUT_MS,
  now,
  setLaunchDiagEnabled,
  subscribeLaunch,
} from "@/lib/launch-diagnostics";
import { isNativeApp } from "@/lib/platform";

/** TEMPORARY: launch diagnostics panel. Remove once the launch bug is fixed. */
export function LaunchDiagnosticsOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [tick, setTick] = useState(0);
  const [session, setSession] = useState("checking…");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const snap = useSyncExternalStore(subscribeLaunch, getLaunchSnapshot, getLaunchSnapshot);

  useEffect(() => setEnabled(isLaunchDiagEnabled()), []);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((t) => t + 1), 100);
    void supabase.auth.getSession().then(({ data }) =>
      setSession(data.session ? `signed in (${data.session.user.email ?? "no email"})` : "none"),
    );
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;
  void tick;

  const profile = readGuestProfile();
  const profileState = profile
    ? `local: ${profile.name}, setup ${profile.setupComplete ? "complete" : `incomplete (step ${profile.onboardingStep ?? "?"})`}`
    : "no local profile";
  const t = now();
  const hold = document.documentElement.getAttribute("data-app-boot") ?? "released";
  const timeoutLeft = Math.max(0, NATIVE_SPLASH_TIMEOUT_MS - t);
  const splash = snap.splashHiddenAt
    ? `hidden at ${snap.splashHiddenAt}ms`
    : snap.splashHideScheduledAt
      ? `hiding in ${Math.max(0, snap.splashHideScheduledAt + 700 - t)}ms`
      : `auto-hide in ${(timeoutLeft / 1000).toFixed(1)}s`;

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-2 top-[calc(env(safe-area-inset-top)+8px)] z-[10000] rounded-full bg-ink px-3 py-1 text-[10px] text-canvas"
      >
        Launch diag
      </button>
    );

  return (
    <div className="fixed inset-x-2 top-[calc(env(safe-area-inset-top)+8px)] z-[10000] max-h-[60vh] overflow-auto rounded-2xl bg-ink/95 p-3 font-mono text-[10px] leading-relaxed text-canvas shadow-lg">
      <div className="mb-1 flex justify-between">
        <strong>Launch diagnostics (temporary)</strong>
        <span className="space-x-3">
          <button onClick={() => setOpen(false)}>hide</button>
          <button
            onClick={() => {
              setLaunchDiagEnabled(false);
              setEnabled(false);
            }}
          >
            off
          </button>
        </span>
      </div>
      <div>native: {String(isNativeApp())} · uptime {t}ms</div>
      <div>current path: {pathname}</div>
      <div>resolved destination: {snap.destination ?? "not resolved"}</div>
      <div>boot hold: {hold}</div>
      <div>profile: {profileState}</div>
      <div>session: {session}</div>
      <div>splash: {splash}</div>
      <ol className="mt-2 border-t border-canvas/20 pt-1">
        {snap.events.map((e, i) => (
          <li key={i}>
            {e.at}ms · {e.message}
          </li>
        ))}
      </ol>
    </div>
  );
}
