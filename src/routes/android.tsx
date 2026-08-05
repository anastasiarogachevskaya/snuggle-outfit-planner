import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";

const TITLE = "Layerly for Android — Baby Outfit App | Layerly";
const DESCRIPTION =
  "Use Layerly on Android by installing it from Chrome in two taps. Weather-based baby outfit recommendations using the clothes you already own — no ads, no tracking.";

export const Route = createFileRoute("/android")({
  head: () => pageMeta({ title: TITLE, description: DESCRIPTION, path: "/android" }),
  component: AndroidPage,
});

function AndroidPage() {
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
          <h1 className="font-serif text-3xl font-semibold leading-tight text-ink">Layerly for Android</h1>
          <p className="mt-4 leading-relaxed text-ink/70">
            Layerly runs as an installable web app on Android. There is nothing to download from a store — Chrome
            installs it directly, and it updates itself.
          </p>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Install Layerly</h2>
            <ol className="mt-4 space-y-2 text-sm leading-relaxed text-ink/70">
              <li>1. Open layerly.online in Chrome on your Android phone.</li>
              <li>2. Tap the menu (three dots) in the top right.</li>
              <li>3. Choose "Install app" or "Add to Home screen".</li>
            </ol>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              Layerly then appears in your app drawer with its own icon and opens full screen.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">What you get on Android</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/70">
              <li>· Location-based weather, or type your city instead.</li>
              <li>· Home, walk and car recommendations with transport and duration.</li>
              <li>· Sleep guidance based on room temperature and sleep sack TOG.</li>
              <li>· Comfort feedback that personalises future outfits for your baby.</li>
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
            <Link to="/ios">iOS app</Link>
            <Link to="/web-app">Web app</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
