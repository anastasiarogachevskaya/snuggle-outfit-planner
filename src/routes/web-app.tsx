import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";
import { SiteFooter } from "@/components/site-footer";

const TITLE = "Layerly Web App — Baby Clothing Calculator in Your Browser | Layerly";
const DESCRIPTION =
  "Layerly is a free web app that works in any browser: enter your baby's age and wardrobe, and get a weather-based outfit for home, walks and the car.";

export const Route = createFileRoute("/web-app")({
  head: () => pageMeta({ title: TITLE, description: DESCRIPTION, path: "/web-app" }),
  component: WebAppPage,
});

function WebAppPage() {
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
          <h1 className="font-serif text-3xl font-semibold leading-tight text-ink">Layerly web app</h1>
          <p className="mt-4 leading-relaxed text-ink/70">
            Layerly works in any modern browser on phone, tablet or desktop. Nothing to install, no store account, and
            the same baby clothing calculator everywhere you sign in.
          </p>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">How to start</h2>
            <ol className="mt-4 space-y-2 text-sm leading-relaxed text-ink/70">
              <li>1. Open Layerly and tap "Try Layerly" — no registration needed.</li>
              <li>2. Pick your baby's age band and allow location, or type your city.</li>
              <li>3. Read today's outfit and tick off the clothes you own to make it exact.</li>
              <li>4. Create an account when you want to save the profile and wardrobe.</li>
            </ol>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">What the web app includes</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/70">
              <li>· Live weather, feels-like temperature, rain and UV index from Open-Meteo.</li>
              <li>· Home, walk and car situations with room temperature, transport and duration.</li>
              <li>· A wardrobe checklist so recommendations only use clothes you own.</li>
              <li>· Sleep recommendations built around sleep sack TOG ratings.</li>
              <li>· Data export and account deletion whenever you want.</li>
            </ul>
          </section>

          <section className="mt-12 rounded-[28px] border border-black/5 bg-surface p-6">
            <h2 className="font-serif text-xl font-semibold text-ink">Open Layerly now</h2>
            <Link
              to="/try"
              className="mt-4 block w-full rounded-2xl bg-primary py-3.5 text-center font-medium text-primary-foreground"
            >
              Try Layerly — no account needed
            </Link>
          </section>
        </main>

        <SiteFooter className="mt-14" />
      </div>
    </div>
  );
}
