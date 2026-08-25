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
] as const;

const COMPACT = ["/how-it-works", "/faq"] as const;

export function SiteFooter({
  variant = "full",
  className = "mt-16",
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  const links = variant === "compact" ? LINKS.filter((l) => (COMPACT as readonly string[]).includes(l.to)) : LINKS;

  return (
    <footer className={`${className} border-t border-black/5 pt-6`}>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
        {links.map((l) => (
          <Link key={l.to} to={l.to}>
            {l.label}
          </Link>
        ))}
        {/* TEMPORARY: native-only entry point for the /diagnostics page while
            debugging the missing location-permission dialog. Remove once resolved. */}
        {isNativeApp() && (
          <Link to="/diagnostics" className="text-primary">
            Diagnostics
          </Link>
        )}
      </nav>
      <p className="mt-6 text-xs text-ink/40">Weather from Open-Meteo. No ads, no tracking.</p>
    </footer>
  );
}
