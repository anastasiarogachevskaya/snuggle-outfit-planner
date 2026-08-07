import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { SiteFooter } from "@/components/site-footer";

const TITLE = "How Layerly Works — Baby Outfit Recommendations Based on Weather";
const DESCRIPTION =
  "Layerly reads the weather, your baby's age, and the clothes you own, then suggests a complete outfit for home, walks, or sleep in seconds.";

const STEPS = [
  {
    title: "Add your baby",
    body: "Enter your baby's date of birth. Layerly uses age to judge how warm or cool an outfit should be — a newborn needs more layers than a crawling 10-month-old.",
  },
  {
    title: "Set a location",
    body: "Allow GPS or type a city. Layerly fetches the current temperature, wind, rain, and UV index from Open-Meteo so every recommendation matches the actual weather outside.",
  },
  {
    title: "Tick the clothes you own",
    body: "Go through the wardrobe checklist: base layers, bottoms, mid layers, outer layers, sleep sacks, accessories, and transport extras. Layerly only recommends items you actually have.",
  },
  {
    title: "Pick a situation",
    body: "Choose Home, Walk, or Car, then add details: room temperature, pram, stroller, or baby carrier, and how long you'll be out. Each setting changes the outfit.",
  },
  {
    title: "Get a ready-to-wear outfit",
    body: "Layerly returns a complete layer-by-layer recommendation with a short explanation, plus transport extras and safety notes for heat, sun, or cold.",
  },
  {
    title: "Rate comfort to improve suggestions",
    body: "After a nap or walk, mark whether your baby was comfortable. Layerly learns your baby's preferences and fine-tunes future recommendations without overcorrecting.",
  },
];

export const Route = createFileRoute("/how-it-works")({
  head: () => {
    const base = pageMeta({ title: TITLE, description: DESCRIPTION, path: "/how-it-works" });
    return {
      ...base,
      scripts: [
        breadcrumbLd([
          { name: "Layerly", path: "/" },
          { name: "How it works", path: "/how-it-works" },
        ]),
      ],
    };
  },
  component: HowItWorks,
});

function HowItWorks() {
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

        <main>
          <h1 className="mb-4 font-serif text-3xl font-semibold leading-tight text-ink">How Layerly works</h1>
          <p className="mb-10 leading-relaxed text-ink/70">
            From weather to wardrobe in a few simple steps. No guessing, no generic charts.
          </p>

          <section className="space-y-8">
            {STEPS.map((step, i) => (
              <article key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-medium text-ink">{step.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">{step.body}</p>
                </div>
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

        <SiteFooter className="mt-16" />
      </div>
    </div>
  );
}
