import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";
import { SiteFooter } from "@/components/site-footer";
import { logEvent } from "@/lib/analytics";

const APP_STORE_URL = "https://apps.apple.com/app/layerly-baby-outfit-planner/id6806378380";

const TITLE = "Layerly for iPhone — Baby Outfit Planner App | Layerly";
const DESCRIPTION =
  "Layerly on iPhone: turn today's weather into a simple layered outfit for your baby, using clothes you already own. Download Layerly from the App Store.";

export const Route = createFileRoute("/ios")({
  head: () => pageMeta({ title: TITLE, description: DESCRIPTION, path: "/ios" }),
  component: IosPage,
});

function AppStoreBadge() {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => logEvent("ios_page_get_app_clicked")}
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
        <span className="block whitespace-nowrap text-lg font-semibold leading-none">App Store</span>
      </span>
    </a>
  );
}

function IosPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-6 py-10 font-sans">
        <header className="mb-10 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold">
            Layerly
          </Link>
          <Link to="/try" className="text-sm font-medium text-primary">
            Try Layerly
          </Link>
        </header>

        <main>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-ink">
            Layerly for iPhone
          </h1>
          <p className="mt-4 leading-relaxed text-ink/70">
            Layerly is on the App Store. It turns today's weather into a simple layered outfit for
            your baby, using clothes you already own — no ads, no tracking.
          </p>

          <div className="mt-6">
            <AppStoreBadge />
          </div>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">What you get on iOS</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/70">
              <li>
                · Native location permission for accurate local weather, or a manual city picker.
              </li>
              <li>· Full-screen standalone layout with safe-area and keyboard handling.</li>
              <li>· Sign in with Apple, Google or email.</li>
              <li>
                · The same recommendation engine as the web app, including sleep and TOG sleep
                sacks.
              </li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">
              Or add Layerly to your Home Screen
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70">
              You can also use Layerly straight from Safari, without installing anything:
            </p>
            <ol className="mt-4 space-y-2 text-sm leading-relaxed text-ink/70">
              <li>1. Open layerly.online in Safari on your iPhone.</li>
              <li>2. Tap the Share button in the toolbar.</li>
              <li>3. Choose "Add to Home Screen", then tap Add.</li>
            </ol>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              Layerly then opens full screen with its own icon, no browser bars, and respects the
              iPhone safe areas and notch.
            </p>
          </section>

          <section className="mt-12 rounded-[28px] border border-black/5 bg-surface p-6">
            <h2 className="font-serif text-xl font-semibold text-ink">Try it first</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              No account needed — pick an age, share a location, get today's outfit.
            </p>
            <Link
              to="/try"
              className="mt-4 block w-full rounded-2xl bg-primary py-3.5 text-center font-medium text-primary-foreground"
            >
              Try Layerly
            </Link>
          </section>
        </main>

        <SiteFooter className="mt-14" />
      </div>
    </div>
  );
}
