import { useEffect, useState } from "react";
import { getPlatformLabel, isPlatformDebugEnabled } from "@/lib/platform";

/**
 * Optional debug indicator. Hidden unless VITE_SHOW_PLATFORM_DEBUG=true.
 * Non-interactive so it can never block navigation or buttons.
 */
export function PlatformDebugBadge() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isPlatformDebugEnabled()) return;
    setLabel(getPlatformLabel());
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
