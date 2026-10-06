import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OG_IMAGE, SITE_URL } from "@/lib/seo";
import { SiteFooter } from "@/components/site-footer";
import { ClothingIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { logEvent } from "@/lib/analytics";
import { isIOSApp } from "@/lib/platform";
import { readGuestProfile } from "@/lib/guest-profile";
import { releaseBootHold } from "@/lib/boot-gate";
import { logLaunch, setLaunchDestination } from "@/lib/launch-diagnostics";

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
  const [iosApp, setIOSApp] = useState(false);

  useEffect(() => {
    const ios = isIOSApp();
    setIOSApp(ios);
    // On the phone the on-device profile is the account: once setup has been
    // started, relaunching the app must land straight back in it instead of
    // showing the marketing page and a "Get Started" tap.
    logLaunch(`landing mounted (ios=${ios}, localProfile=${!!readGuestProfile()})`);
    if (ios && readGuestProfile()) {
      setLaunchDestination("/try (local profile)");
      navigate({ to: "/try", replace: true });
      return;
    }

    let cancelled = false;
    // Never leave the page hidden if the session check hangs (offline launch).
    const fallback = setTimeout(() => {
      if (cancelled) return;
      logLaunch("session check timed out; showing landing");
      releaseBootHold();
    }, 4000);
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        clearTimeout(fallback);
        logLaunch(`session resolved: ${data.session ? "yes" : "no"}`);
        if (data.session) {
          setLaunchDestination("/today (session)");
          navigate({ to: "/today", replace: true });
          return;
        }
        setLaunchDestination("/ (landing)");
        releaseBootHold();
      })
      .catch(() => {
        if (cancelled) return;
        clearTimeout(fallback);
        setLaunchDestination("/ (landing, session error)");
        releaseBootHold();
      });
    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, [navigate]);

  useEffect(() => {
    logEvent("landing_viewed");
  }, []);

  return (
    <div className="min-h-screen bg-landing-canvas font-landing-body text-landing-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8 sm:py-8">
        <Link to="/" className="font-landing-heading text-xl font-semibold text-landing-ink sm:text-2xl">
          Layerly
        </Link>
        <nav aria-label="Top" className="flex items-center gap-5 text-sm sm:gap-8">
          <Link
            to="/how-it-works"
            className="hidden font-medium text-landing-ink/65 transition-colors hover:text-landing-ink sm:block"
          >
            How it works
          </Link>
          <Link
            to="/blog"
            className="hidden font-medium text-landing-ink/65 transition-colors hover:text-landing-ink sm:block"
          >
            Blog
          </Link>
          <Link
            to="/auth"
            onClick={() => logEvent("landing_signin_clicked", { placement: "header" })}
            className="font-semibold text-landing-ink underline decoration-landing-sage/50 underline-offset-4 transition-colors hover:text-primary"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:min-h-[700px] lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.7fr)] lg:gap-20 lg:py-16">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
          <p className="mb-5 text-xs font-semibold uppercase text-primary">
            Weather-aware baby outfits
          </p>
          <h1 className="font-landing-heading text-5xl font-semibold leading-[1.05] text-landing-ink sm:text-6xl lg:text-7xl">
            What should my baby <span className="font-normal text-primary">wear today?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-landing-ink/70 lg:mx-0 lg:text-xl">
            Layerly turns the local forecast into a clear, layered outfit using the clothes you
            already own.
          </p>

          <div className="mx-auto mt-9 flex max-w-sm flex-col gap-4 lg:mx-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-14 rounded-lg px-8 text-base font-semibold shadow-lg shadow-primary/15">
                <Link to="/try" onClick={() => logEvent("landing_try_clicked")}>
                  {iosApp ? "Get started" : "Try Layerly — no account needed"}
                </Link>
              </Button>
              {!iosApp && (
                <Link
                  to="/ios"
                  onClick={() => logEvent("landing_get_app_clicked")}
                  aria-label="Download Layerly on the App Store"
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-landing-ink px-5 text-landing-canvas transition-opacity hover:opacity-90"
                >
                  <svg viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" className="size-6 shrink-0">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 35.1-17.5 20.2-27.8 45.1-25.6 73.1 26.1 2 49.9-11.4 69.5-35.7z" />
                  </svg>
                  <span className="whitespace-nowrap text-left leading-tight">
                    <span className="block whitespace-nowrap text-[10px] font-medium uppercase tracking-wide opacity-80">
                      Download on the
                    </span>
                    <span className="block whitespace-nowrap text-lg font-semibold leading-none">
                      App Store
                    </span>
                  </span>
                </Link>
              )}
            </div>
            <p className="text-sm text-landing-ink/50">
              {iosApp
                ? "Your data stays on this device until you choose to sync."
                : "Set up in a minute. No account required."}
            </p>
          </div>
        </div>

        <section aria-label="Layerly outfit preview" className="mx-auto w-full max-w-[340px]">
          <div className="rounded-[42px] bg-landing-ink p-2.5 shadow-2xl shadow-landing-ink/20">
            <div className="relative min-h-[610px] overflow-hidden rounded-[34px] bg-landing-canvas px-5 pb-7 pt-12">
              <div className="absolute left-1/2 top-3 h-5 w-20 -translate-x-1/2 rounded-full bg-landing-ink" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-primary">Helsinki · Now</p>
                  <h2 className="mt-1 font-landing-heading text-2xl font-semibold leading-tight">
                    Perfect for layers
                  </h2>
                </div>
                <div className="text-right">
                  <p className="font-landing-heading text-3xl font-medium">12°</p>
                  <p className="text-[10px] uppercase text-landing-ink/45">Overcast</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 text-[11px] font-semibold uppercase text-landing-ink/45">Outfit layers</p>
                <div className="space-y-3">
                  <PreviewLayer slug="long_sleeve_bodysuit" label="Base" name="Long-sleeve bodysuit" />
                  <PreviewLayer slug="pants" label="Bottom" name="Cotton trousers" />
                  <PreviewLayer slug="cardigan" label="Mid layer" name="Knitted cardigan" />
                  <PreviewLayer slug="jacket" label="Outer layer" name="Light jacket" emphasis />
                </div>
              </div>

              <div className="mt-5 rounded-lg bg-landing-clay/15 p-4 text-sm leading-relaxed text-landing-ink/65">
                <span className="font-semibold text-landing-ink">Before you go:</span> Add cotton socks and a thin hat.
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="mx-auto w-full max-w-6xl px-5 pb-10 sm:px-8">
        <SiteFooter variant="landing" className="mt-10 lg:mt-16" />
      </div>
    </div>
  );
}

function PreviewLayer({
  slug,
  label,
  name,
  emphasis = false,
}: {
  slug: "long_sleeve_bodysuit" | "pants" | "cardigan" | "jacket";
  label: string;
  name: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex min-h-16 items-center gap-3 rounded-lg border p-3.5 shadow-sm ${
        emphasis
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-landing-ink"
      }`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-md ${
          emphasis ? "bg-primary-foreground/15" : "bg-landing-sage/15 text-primary"
        }`}
      >
        <ClothingIcon slug={slug} size={21} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[10px] font-semibold uppercase ${emphasis ? "opacity-75" : "text-primary"}`}>
          {label}
        </span>
        <span className="block truncate text-sm font-medium">{name}</span>
      </span>
    </div>
  );
}
