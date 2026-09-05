import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";
import { SiteFooter } from "@/components/site-footer";

const TITLE = "Privacy Policy — Layerly";
const DESCRIPTION =
  "What Layerly collects, why, and how to delete it: baby profile, wardrobe, comfort feedback, and location used only to fetch the weather.";
const LAST_UPDATED = "September 5, 2026";

export const Route = createFileRoute("/privacy")({
  head: () => pageMeta({ title: TITLE, description: DESCRIPTION, path: "/privacy" }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-6 py-10 font-sans">
        <header className="mb-10 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold text-ink">
            Layerly
          </Link>
          <Link to="/try" className="text-sm font-medium text-primary">
            Try Layerly
          </Link>
        </header>

        <main className="space-y-8 text-sm leading-relaxed text-ink/80">
          <div>
            <h1 className="mb-2 font-serif text-3xl font-semibold leading-tight text-ink">
              Privacy Policy
            </h1>
            <p className="text-xs text-ink/50">Last updated {LAST_UPDATED}</p>
          </div>

          <p>
            Layerly recommends baby outfits from the weather, your baby's age, and the clothes you
            own. This page explains what we collect to do that, and nothing more — there are no
            ads and no tracking.
          </p>

          <section>
            <h2 className="mb-2 font-medium text-ink">What we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Account info:</strong> your email address, or your name and email if you
                sign in with Apple or Google. We never see your Apple or Google password.
              </li>
              <li>
                <strong>Baby profile:</strong> a name (or nickname) and date of birth, used to
                judge how warm or cool an outfit should be.
              </li>
              <li>
                <strong>Wardrobe:</strong> which clothing items you've told us you own, so we only
                recommend things you actually have.
              </li>
              <li>
                <strong>Comfort feedback:</strong> whether an outfit felt right afterward, used to
                fine-tune future recommendations for your baby.
              </li>
              <li>
                <strong>Location:</strong> your city or GPS coordinates, sent to our weather
                provider (Open-Meteo) to read the current temperature and conditions. We store your
                last-used location so we don't have to ask every time.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-ink">What we don't do</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>We don't run ads or ad tracking of any kind.</li>
              <li>We don't sell or share your data with third parties for marketing.</li>
              <li>We don't use your data to train third-party AI models.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-ink">Who else sees it</h2>
            <p>
              Your data is stored with our backend provider (Supabase). Weather lookups go to
              Open-Meteo, and turning coordinates into a place name goes to BigDataCloud — both
              receive only the coordinates needed for that one request, never your account
              details.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-ink">Your choices</h2>
            <p>
              From your account page you can reset your baby's comfort history or delete your
              baby's profile and wardrobe entirely. To delete your account itself, email us at the
              address below and we'll remove it.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-ink">Children's privacy</h2>
            <p>
              Layerly is a tool for parents and caregivers, not for children. We don't knowingly
              collect information directly from children; the baby's date of birth is entered by
              the parent to size clothing recommendations.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-medium text-ink">Contact</h2>
            <p>
              Questions about this policy or your data? Email{" "}
              <a href="mailto:hello@layerly.online" className="text-primary">
                hello@layerly.online
              </a>
              .
            </p>
          </section>
        </main>

        <SiteFooter className="mt-16" />
      </div>
    </div>
  );
}
