import { useEffect, useState } from "react";
import { getBuildLabel } from "@/lib/build-info";
import { isNativeApp, isPlatformDebugEnabled } from "@/lib/platform";

/**
 * Development-only build indicator, e.g. "iOS • production web • f25075e".
 * Shown in dev builds inside the native app, or whenever
 * VITE_SHOW_PLATFORM_DEBUG=true. Never rendered in production web/App Store
 * builds. Non-interactive so it can never block navigation or buttons.
 */
export function PlatformDebugBadge() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const enabled = isPlatformDebugEnabled() || (import.meta.env.DEV && isNativeApp());
    if (!enabled) return;
    setLabel(getBuildLabel());
  }, []);

  if (!label) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-2 left-2 z-[9999] rounded-full border border-black/10 bg-surface/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-ink/70 shadow-sm"
    >
      {label}
    </div>
  );
}
