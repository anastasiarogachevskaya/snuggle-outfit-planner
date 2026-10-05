import { Link } from "@tanstack/react-router";
import { isNativeApp } from "@/lib/platform";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/faq", label: "FAQ" },
  { to: "/blog", label: "Blog" },
  { to: "/guide/baby-layering", label: "Layering guide" },
  { to: "/guide/stroller-walks", label: "Stroller guide" },

  { to: "/ios", label: "iOS" },
  { to: "/android", label: "Android" },
  { to: "/web-app", label: "Web app" },
  { to: "/privacy", label: "Privacy" },
] as const;

const COMPACT = ["/how-it-works", "/faq"] as const;

const LANDING_GROUPS = [
  {
    label: "Explore",
    links: LINKS.filter((link) => ["/how-it-works", "/faq", "/blog"].includes(link.to)),
  },
  {
    label: "Guides",
    links: LINKS.filter((link) =>
      ["/guide/baby-layering", "/guide/stroller-walks"].includes(link.to),
    ),
  },
  {
    label: "Layerly",
    links: LINKS.filter((link) => ["/ios", "/android", "/web-app", "/privacy"].includes(link.to)),
  },
] as const;

export function SiteFooter({
  variant = "full",
  className = "mt-16",
}: {
  variant?: "full" | "compact" | "landing";
  className?: string;
}) {
  let links =
    variant === "compact"
      ? LINKS.filter((l) => (COMPACT as readonly string[]).includes(l.to))
      : LINKS;
  // Apple guideline 2.3.10: no third-party platform references reachable from
  // inside the iOS app. The /ios and /android pages themselves stay live for
  // browser visitors — only the native build's footer drops both links,
  // keeping just "Web app" as the cross-platform option.
  if (isNativeApp()) links = links.filter((l) => l.to !== "/android" && l.to !== "/ios");

  if (variant === "landing") {
    return (
      <footer className={`${className} border-t border-border pt-10`}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-3">
          {LANDING_GROUPS.map((group) => {
            const groupLinks = group.links.filter((link) => links.some((item) => item.to === link.to));
            if (groupLinks.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="mb-3 text-xs font-semibold uppercase text-ink/45">{group.label}</p>
                <nav aria-label={group.label} className="flex flex-col gap-2.5 text-sm text-ink/65">
                  {groupLinks.map((link) => (
                    <Link key={link.to} to={link.to} className="transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-5 text-xs text-ink/40 sm:flex-row sm:items-center sm:justify-between">
          <p>Weather from Open-Meteo.</p>
          <p>No ads. No tracking.</p>
        </div>
      </footer>
    );
  }

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
