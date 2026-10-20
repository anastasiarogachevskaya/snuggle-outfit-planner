import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { SiteFooter } from "@/components/site-footer";
import { getWeatherGuide, WEATHER_GUIDES } from "@/lib/weather-guides";

export const Route = createFileRoute("/guide/$weather")({
  loader: ({ params }) => {
    const guide = getWeatherGuide(params.weather);
    if (!guide) throw notFound();
    return guide;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const g = loaderData;
    const path = `/guide/${g.slug}`;
    const title = `How to Dress a Baby for ${g.f}°F Weather (${g.c}°C) | Layerly`;
    const description = `What a baby should wear at ${g.f} degrees: stroller outfit, car seat layers and what to check. ${g.summary}`;
    return {
      ...pageMeta({ title, description, path, type: "article" }),
      scripts: [
        breadcrumbLd([
          { name: "Layerly", path: "/" },
          { name: `${g.f}°F weather`, path },
        ]),
      ],
    };
  },
  component: WeatherGuidePage,
});

function WeatherGuidePage() {
  const g = Route.useLoaderData();
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
            How to dress a baby for {g.f}°F weather
          </h1>
          <p className="mt-4 leading-relaxed text-ink/70">
            {g.f}°F is about {g.c}°C. {g.summary}
          </p>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Stroller walk</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/70">
              {g.stroller.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
          <section className="mt-8">
            <h2 className="font-serif text-2xl font-semibold text-ink">Car seat</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">{g.car}</p>
          </section>
          <section className="mt-8">
            <h2 className="font-serif text-2xl font-semibold text-ink">What to check</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">{g.check}</p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-xl font-semibold text-ink">Other temperatures</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {WEATHER_GUIDES.filter((o) => o.slug !== g.slug).map((o) => (
                <Link
                  key={o.slug}
                  to="/guide/$weather"
                  params={{ weather: o.slug }}
                  className="rounded-full border border-ink/10 bg-surface px-4 py-2 text-sm text-ink"
                >
                  {o.f}°F
                </Link>
              ))}
              <Link
                to="/guide/baby-layering"
                className="rounded-full border border-ink/10 bg-surface px-4 py-2 text-sm text-ink"
              >
                Full layering guide
              </Link>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-xl font-semibold text-ink">Sources</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink/70">
              <li>
                <a className="text-primary underline underline-offset-4" target="_blank" rel="noopener noreferrer" href="https://www.healthychildren.org/English/safety-prevention/at-play/Pages/Cold-Weather-Safety.aspx">
                  American Academy of Pediatrics — Cold weather safety
                </a>
              </li>
              <li>
                <a className="text-primary underline underline-offset-4" target="_blank" rel="noopener noreferrer" href="https://www.healthychildren.org/English/safety-prevention/on-the-go/Pages/winter-car-seat-safety-tips.aspx">
                  American Academy of Pediatrics — Winter car seat safety tips
                </a>
              </li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink/50">
              General information, not medical advice. The outfits are starting points from
              Layerly's own rules; the sources cover general safety, not these exact outfits.
            </p>
          </section>

          <section className="mt-12 rounded-[28px] border border-black/5 bg-surface p-6">
            <h2 className="font-serif text-xl font-semibold text-ink">Get an outfit for right now</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              Layerly reads your local weather and suggests layers from the clothes you own.
            </p>
            <Link
              to="/try"
              className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              Try Layerly — no account needed
            </Link>
          </section>
        </main>
        <SiteFooter className="mt-16" />
      </div>
    </div>
  );
}
