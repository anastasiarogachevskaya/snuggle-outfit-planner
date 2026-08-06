import { createFileRoute, Link } from "@tanstack/react-router";
import { OG_IMAGE, SITE_URL, breadcrumbLd } from "@/lib/seo";

const TITLE = "Frequently Asked Questions — Layerly";
const DESCRIPTION =
  "Answers to common questions about Layerly: how it works, location use, wardrobes, sleep sacks, and what to do without an account.";

const FAQ = [
  {
    q: "What should my baby wear today?",
    a: "It depends on the temperature where you are, how old your baby is, and what you are doing — sleeping in a 21°C room needs a very different outfit than a 45-minute stroller walk at 8°C. Layerly reads today's weather for your location and turns it into a specific layer-by-layer outfit: base layer, bottoms, mid layer, outer layer, and accessories like a hat or socks.",
  },
  {
    q: "How does Layerly work?",
    a: "You tell Layerly your baby's date of birth and tick off the clothes you actually own. Layerly then fetches the current weather and UV index from Open-Meteo, adjusts for the situation you pick (home, walk, or car), the transport you use, and how long you will be out, and recommends one outfit from your own wardrobe with a short explanation of why.",
  },
  {
    q: "Does Layerly use my location?",
    a: "Only if you allow it. Layerly asks for GPS access when you tap the location button, and you can always type a city name instead. The location is used to fetch weather and nothing else.",
  },
  {
    q: "Can I use Layerly without creating an account?",
    a: "Yes. Tap \"Try Layerly\" on the home screen, pick your baby's age band, share a location or city, and you get a full recommendation with a realistic default wardrobe. Nothing is saved until you decide to create an account.",
  },
  {
    q: "Does Layerly work with my own wardrobe?",
    a: "That is the point. Layerly only recommends items you have ticked in your wardrobe checklist, so you never get told to use a fleece overall you do not own. You can update the wardrobe any time as your baby grows or the season changes.",
  },
  {
    q: "Does Layerly handle sleep and sleep sacks?",
    a: "Yes. For sleep, Layerly works from room temperature and the TOG rating of the sleep sacks you own — 0.5, 1.0, 2.5 or 3.5 — picks the closest suitable sack, and adjusts the pyjamas underneath so the total warmth matches the room.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/faq` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/faq` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "FAQ", path: "/faq" },
      ]),
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-6 py-10 font-sans">
        <header className="mb-10 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold text-ink">
            Layerly
          </Link>
          <nav aria-label="Top" className="flex items-center gap-4 text-sm">
            <Link to="/how-it-works" className="font-medium text-ink/70">
              How it works
            </Link>
            <Link to="/try" className="font-medium text-primary">
              Try Layerly
            </Link>
          </nav>
        </header>

        <main>
          <h1 className="mb-4 font-serif text-3xl font-semibold leading-tight text-ink">Frequently asked questions</h1>
          <p className="mb-10 leading-relaxed text-ink/70">
            Quick answers about how Layerly decides what your baby should wear.
          </p>

          <section className="space-y-8">
            {FAQ.map((item) => (
              <article key={item.q}>
                <h2 className="font-medium text-ink">{item.q}</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink/70">{item.a}</p>
              </article>
            ))}
          </section>

          <div className="mt-12">
            <Link
              to="/try"
              className="block w-full rounded-2xl bg-primary py-4 text-center font-medium text-primary-foreground shadow-md shadow-primary/20"
            >
              Try Layerly — no account needed
            </Link>
            <Link
              to="/auth"
              className="mt-4 block w-full rounded-2xl border border-primary/25 py-3.5 text-center text-sm font-medium text-primary"
            >
              I already have an account
            </Link>
          </div>
        </main>

        <footer className="mt-16 border-t border-black/5 pt-6">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
            <Link to="/">Home</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/try">Try Layerly</Link>
            <Link to="/auth">Sign in</Link>
            <Link to="/guide/baby-layering">Layering guide</Link>
            <Link to="/guide/stroller-walks">Stroller guide</Link>
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
