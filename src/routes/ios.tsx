import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";

const TITLE = "Layerly for iPhone — Baby Outfit App for iOS | Layerly";
const DESCRIPTION =
  "Layerly on iPhone: add it to your Home Screen today, or use the native iOS app built with Capacitor. Weather-based baby outfit recommendations offline-friendly and ad-free.";

export const Route = createFileRoute("/ios")({
  head: () => pageMeta({ title: TITLE, description: DESCRIPTION, path: "/ios" }),
  component: IosPage,
});

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
          <h1 className="font-serif text-3xl font-semibold leading-tight text-ink">Layerly for iPhone</h1>
          <p className="mt-4 leading-relaxed text-ink/70">
            Layerly is designed mobile-first, so it already looks and behaves like an app on iPhone. The native iOS
            build is in preparation; until it reaches the App Store you can install Layerly straight from Safari in a
            few seconds.
          </p>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Add Layerly to your Home Screen</h2>
            <ol className="mt-4 space-y-2 text-sm leading-relaxed text-ink/70">
              <li>1. Open layerly.online in Safari on your iPhone.</li>
              <li>2. Tap the Share button in the toolbar.</li>
              <li>3. Choose "Add to Home Screen", then tap Add.</li>
            </ol>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              Layerly then opens full screen with its own icon, no browser bars, and respects the iPhone safe areas and
              notch.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">What you get on iOS</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/70">
              <li>· Native location permission for accurate local weather, or a manual city picker.</li>
              <li>· Full-screen standalone layout with safe-area and keyboard handling.</li>
              <li>· Sign in with Apple, Google or email.</li>
              <li>· The same recommendation engine as the web app, including sleep and TOG sleep sacks.</li>
            </ul>
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

        <footer className="mt-14 border-t border-black/5 pt-6">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
            <Link to="/">Home</Link>
            <Link to="/android">Android</Link>
            <Link to="/web-app">Web app</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
