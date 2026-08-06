import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OG_IMAGE, SITE_URL } from "@/lib/seo";

const TITLE = "Layerly – Baby Outfit Recommendations Based on Weather";
const DESCRIPTION =
  "Layerly helps parents decide what their baby should wear based on today's weather, your baby's age, and the clothes you already own.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/today", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-6 py-10 font-sans">
        <header className="mb-14 flex items-center justify-between">
          <span className="font-serif text-lg font-semibold">Layerly</span>
          <Link to="/auth" className="text-sm font-medium text-primary">
            Sign in
          </Link>
        </header>

        <main>
          <section className="mb-10">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-primary/70">
              For the daily "what do I put on baby?"
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-tight text-ink">
              What should my baby
              <br />
              <span className="italic">wear today?</span>
            </h1>
            <p className="mt-5 leading-relaxed text-ink/70">
              Layerly turns today's weather into a simple, layered outfit for your baby — using the clothes you already own.
            </p>
          </section>

          <section aria-label="Example recommendation" className="mb-8 rounded-[32px] border border-black/5 bg-surface p-6 shadow-sm">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary/60">
              Today &middot; feels like 9°
            </p>
            <h2 className="mb-3 font-serif text-2xl font-semibold">Go with layers.</h2>
            <ul className="space-y-2 text-sm text-ink/80">
              <li>· Long-sleeve bodysuit</li>
              <li>· Ribbed leggings</li>
              <li>· Fleece overall</li>
              <li>· Wool hat &amp; warm socks</li>
            </ul>
          </section>

          <Link
            to="/try"
            className="block w-full rounded-2xl bg-primary py-4 text-center font-medium text-primary-foreground shadow-md shadow-primary/20"
          >
            Try Layerly — no account needed
          </Link>
          <p className="mt-3 text-center text-xs text-ink/50">
            Takes 20 seconds. Nothing is saved until you want it to be.
          </p>
          <Link
            to="/auth"
            className="mt-6 block w-full rounded-2xl border border-primary/25 py-3.5 text-center text-sm font-medium text-primary"
          >
            I already have an account
          </Link>

          <p className="mt-10 text-center text-xs leading-relaxed text-ink/50">
            No ads. No tracking. Uses the clothes you already own.
          </p>
        </main>

        <footer className="mt-16 border-t border-black/5 pt-6">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
            <Link to="/try">Try Layerly</Link>
            <Link to="/auth">Sign in</Link>
            <Link to="/guide/baby-layering">Layering guide</Link>
            <Link to="/guide/stroller-walks">Stroller guide</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/ios">iOS</Link>
            <Link to="/android">Android</Link>
            <Link to="/web-app">Web app</Link>
          </nav>
          <p className="mt-6 text-xs text-ink/40">Weather from Open-Meteo. No ads, no tracking.</p>
        </footer>
      </div>
    </div>
  );
}
