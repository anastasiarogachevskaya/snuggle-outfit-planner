import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OG_IMAGE, SITE_URL } from "@/lib/seo";

const TITLE = "Layerly – Baby Outfit Recommendations Based on Weather";
const DESCRIPTION =
  "Layerly helps parents decide what their baby should wear based on today's weather, your baby's age, and the clothes you already own.";

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
    ],
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
          <section className="mb-12">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-primary/70">
              For the daily "what do I put on baby?"
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-tight text-ink">
              What should my baby
              <br />
              <span className="italic">wear today?</span>
            </h1>
            <p className="mt-5 leading-relaxed text-ink/70">
              Layerly helps parents decide what their baby should wear based on today's weather, your baby's age, and
              the clothes you already own. One glance in the morning, baby dressed right.
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

          <section className="mt-16">
            <h2 className="font-serif text-2xl font-semibold text-ink">How Layerly works</h2>
            <ol className="mt-5 space-y-5">
              <li>
                <h3 className="font-medium text-ink">1. Layerly reads today's weather</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/70">
                  Temperature, feels-like, wind, rain and UV index for your location, from Open-Meteo. Share GPS or type
                  your city — both work.
                </p>
              </li>
              <li>
                <h3 className="font-medium text-ink">2. It weighs your baby's age and the situation</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/70">
                  A six-week-old lying still in a pram needs more warmth than a toddler walking. Layerly factors in age,
                  whether you are at home, on a walk or in the car, the transport you use, and how long you will be out.
                </p>
              </li>
              <li>
                <h3 className="font-medium text-ink">3. You get one outfit from your own wardrobe</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/70">
                  Base layer, bottoms, mid layer, outer layer and accessories — only items you have ticked as owned, plus
                  a plain-language explanation of why.
                </p>
              </li>
            </ol>
          </section>

          <section className="mt-14">
            <h2 className="font-serif text-2xl font-semibold text-ink">Why Layerly</h2>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-ink/70">
              <li>
                <strong className="font-medium text-ink">No more guessing.</strong> Overdressing and underdressing are
                both uncomfortable for a baby. Layerly gives a specific answer instead of a temperature number.
              </li>
              <li>
                <strong className="font-medium text-ink">Uses clothes you already own.</strong> Nothing to buy. The
                wardrobe checklist is the whole setup.
              </li>
              <li>
                <strong className="font-medium text-ink">It learns from you.</strong> Rate how comfortable your baby was
                and Layerly nudges future recommendations warmer or cooler for your child.
              </li>
              <li>
                <strong className="font-medium text-ink">No ads, no tracking.</strong> Weather comes from the free
                Open-Meteo service. Your data stays yours and can be exported or deleted at any time.
              </li>
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="font-serif text-2xl font-semibold text-ink">Features</h2>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-ink/70">
              <li>
                <strong className="font-medium text-ink">Home, walk and car modes</strong> — with room temperature for
                indoors and duration for outdoors.
              </li>
              <li>
                <strong className="font-medium text-ink">Sleep guidance with TOG sleep sacks</strong> — Layerly picks
                the best sack you own for the room temperature and adjusts pyjamas underneath.
              </li>
              <li>
                <strong className="font-medium text-ink">Stroller, pram and carrier extras</strong> — footmuffs, rain
                covers and blankets are suggested only when the weather and your transport call for them.
              </li>
              <li>
                <strong className="font-medium text-ink">Hot weather and sun safety</strong> — UV warnings, sun hats,
                shade reminders and lighter layers when it counts.
              </li>
              <li>
                <strong className="font-medium text-ink">Comfort feedback</strong> — one tap after an outing personalises
                future outfits.
              </li>
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="font-serif text-2xl font-semibold text-ink">Who is it for?</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink/70">
              <li>· New parents who want a second opinion before heading out the door.</li>
              <li>· Daycare mornings when there is no time to think about layers.</li>
              <li>· Daily stroller and pram walks in changeable weather.</li>
              <li>· Grandparents and babysitters dressing a baby that is not theirs.</li>
              <li>· Travelling to a different climate with a limited suitcase wardrobe.</li>
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="font-serif text-2xl font-semibold text-ink">Guides</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link to="/guide/baby-layering" className="font-medium text-primary underline underline-offset-4">
                  How to dress a baby for the weather: a layering guide
                </Link>
              </li>
              <li>
                <Link to="/guide/stroller-walks" className="font-medium text-primary underline underline-offset-4">
                  Stroller clothing guide: pram, stroller and carrier walks
                </Link>
              </li>
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="font-serif text-2xl font-semibold text-ink">Frequently asked questions</h2>
            <div className="mt-5 space-y-6">
              {FAQ.map((item) => (
                <div key={item.q}>
                  <h3 className="font-medium text-ink">{item.q}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="mt-16 border-t border-black/5 pt-6">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
            <Link to="/try">Try Layerly</Link>
            <Link to="/auth">Sign in</Link>
            <Link to="/guide/baby-layering">Layering guide</Link>
            <Link to="/guide/stroller-walks">Stroller guide</Link>
            <Link to="/ios">iOS app</Link>
            <Link to="/android">Android</Link>
            <Link to="/web-app">Web app</Link>
          </nav>
          <p className="mt-6 text-xs text-ink/40">Weather from Open-Meteo. No ads, no tracking.</p>
        </footer>
      </div>
    </div>
  );
}
