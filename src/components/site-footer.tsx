import { Link } from "@tanstack/react-router";
import { isNativeApp } from "@/lib/platform";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/faq", label: "FAQ" },
  { to: "/guide/baby-layering", label: "Layering guide" },
  { to: "/guide/stroller-walks", label: "Stroller guide" },
  { to: "/ios", label: "iOS" },
  { to: "/android", label: "Android" },
  { to: "/web-app", label: "Web app" },
  { to: "/privacy", label: "Privacy" },
] as const;

const COMPACT = ["/how-it-works", "/faq"] as const;

export function SiteFooter({
  variant = "full",
  className = "mt-16",
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  let links = variant === "compact" ? LINKS.filter((l) => (COMPACT as readonly string[]).includes(l.to)) : LINKS;
  // Apple guideline 2.3.10: no third-party platform references reachable from
  // inside the iOS app. The web/Android pages themselves stay live for
  // browser and Android visitors — only the native build's footer drops the
  // link into them.
  if (isNativeApp()) links = links.filter((l) => l.to !== "/android");

  return (
    <footer className={`${className} border-t border-black/5 pt-6`}>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
        {links.map((l) => (
          <Link key={l.to} to={l.to}>
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="mt-6 text-xs text-ink/40">Weather from Open-Meteo. No ads, no tracking.</p>
    </footer>
  );
}
