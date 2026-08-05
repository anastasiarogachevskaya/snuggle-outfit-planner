import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

const TITLE = "How to Dress a Baby for the Weather — Layering Guide | Layerly";
const DESCRIPTION =
  "A temperature-by-temperature baby layering guide: what to put on your baby from -10°C to 30°C, indoors and outdoors, plus hats, socks and sleep sacks.";

export const Route = createFileRoute("/guide/baby-layering")({
  head: () => {
    const base = pageMeta({ title: TITLE, description: DESCRIPTION, path: "/guide/baby-layering", type: "article" });
    return {
      ...base,
      scripts: [
        breadcrumbLd([
          { name: "Layerly", path: "/" },
          { name: "Baby layering guide", path: "/guide/baby-layering" },
        ]),
      ],
    };
  },
  component: LayeringGuide,
});

const BANDS = [
  {
    range: "25°C and above",
    outdoor: "One light layer only: a short-sleeve bodysuit or a loose cotton romper. Add a wide-brim sun hat and stay in the shade when the UV index is 3 or higher.",
    indoor: "Short-sleeve bodysuit, or just a nappy and a light bodysuit in a very warm room. No socks.",
  },
  {
    range: "22–24°C",
    outdoor: "Short-sleeve bodysuit with light cotton bottoms, plus a sun hat in bright weather.",
    indoor: "Short-sleeve bodysuit and light bottoms. Barefoot is fine.",
  },
  {
    range: "18–21°C",
    outdoor: "Long-sleeve bodysuit, cotton bottoms, cotton socks and a thin hat. Outdoors nearly always feels cooler than the same temperature indoors, especially in a pram where the baby is not moving.",
    indoor: "Long-sleeve bodysuit and bottoms. No socks needed in a normal insulated home.",
  },
  {
    range: "14–17°C",
    outdoor: "Long-sleeve bodysuit, bottoms, a light mid layer such as a cardigan or fleece, cotton socks and a thin hat.",
    indoor: "Long-sleeve bodysuit, bottoms and cotton socks; add a cardigan below about 16°C.",
  },
  {
    range: "8–13°C",
    outdoor: "Long-sleeve base layer, warm bottoms, a fleece or wool mid layer, a light jacket or pramsuit, a warm hat and warm socks.",
    indoor: "Long-sleeve bodysuit, warm bottoms, a mid layer and warm socks.",
  },
  {
    range: "0–7°C",
    outdoor: "Thermal or wool base layer, warm bottoms, a fleece mid layer, a padded overall or footmuff, a wool hat, mittens and wool socks.",
    indoor: "Normal indoor layers — heat the room rather than adding outdoor gear.",
  },
  {
    range: "Below 0°C",
    outdoor: "Wool base layer, fleece mid layer, insulated overall or a footmuff in the pram, wool hat covering the ears, mittens and wool socks. Keep outings short and check hands, ears and the back of the neck.",
    indoor: "Normal indoor layers.",
  },
];

export default function noop() {}

function LayeringGuide() {
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
            How to dress a baby for the weather
          </h1>
          <p className="mt-4 leading-relaxed text-ink/70">
            Babies cannot regulate their temperature the way adults can, and they cannot tell you when they are too warm
            or too cold. Layering solves this: several thin layers trap air, are easy to add or remove, and adapt as you
            move between a cold street and a heated shop.
          </p>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">The four layers</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/70">
              <li>
                <strong className="font-medium text-ink">Base layer</strong> — a bodysuit against the skin. Cotton in
                mild weather, wool or merino when it is cold.
              </li>
              <li>
                <strong className="font-medium text-ink">Bottoms</strong> — leggings, trousers or the lower half of an
                all-in-one.
              </li>
              <li>
                <strong className="font-medium text-ink">Mid layer</strong> — a cardigan, fleece or wool overall that
                holds warmth. Added from roughly 17°C downwards.
              </li>
              <li>
                <strong className="font-medium text-ink">Outer layer</strong> — a jacket, pramsuit or footmuff that
                blocks wind and rain.
              </li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Temperature guide</h2>
            <div className="mt-5 space-y-6">
              {BANDS.map((band) => (
                <article key={band.range}>
                  <h3 className="font-medium text-ink">{band.range}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">
                    <span className="font-medium text-ink/80">Outdoors:</span> {band.outdoor}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">
                    <span className="font-medium text-ink/80">Indoors:</span> {band.indoor}
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-ink/60">
              Use the feels-like temperature rather than the raw reading — wind and rain make a real difference,
              especially for a baby sitting still in a pram.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Hats, socks and mittens</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              Babies lose a lot of heat through the head, so a thin hat outdoors from about 18°C downwards is sensible,
              and a wool hat below 10°C. In bright weather swap it for a sun hat. Socks matter outdoors from roughly
              20°C downwards, but indoors most babies are comfortable barefoot above 17°C. Mittens come out below
              freezing, or earlier in wind.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Sleep and sleep sacks</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              For sleep, work from room temperature and the TOG rating of the sleep sack. As a rough guide: 0.5 TOG
              above 24°C, 1.0 TOG at 20–24°C, 2.5 TOG at 16–20°C and 3.5 TOG below 16°C, with pyjamas underneath
              adjusted to match. Loose blankets are not recommended for young babies, and socks are not part of a normal
              sleep outfit — warmth should come from the sack and the room.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">How to check if your baby is comfortable</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              Feel the back of the neck or the chest, not the hands or feet — those are normally cooler. Skin that is
              warm and dry means the outfit is right. Sweaty or clammy means one layer too many; cool at the chest means
              one layer too few.
            </p>
          </section>

          <section className="mt-12 rounded-[28px] border border-black/5 bg-surface p-6">
            <h2 className="font-serif text-xl font-semibold text-ink">Let Layerly do the maths</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              Layerly applies these rules automatically using today's weather, your baby's age and the clothes you own.
            </p>
            <Link
              to="/try"
              className="mt-4 block w-full rounded-2xl bg-primary py-3.5 text-center font-medium text-primary-foreground"
            >
              Try Layerly — no account needed
            </Link>
          </section>
        </main>

        <footer className="mt-14 border-t border-black/5 pt-6">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
            <Link to="/">Home</Link>
            <Link to="/guide/stroller-walks">Stroller guide</Link>
            <Link to="/web-app">Web app</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
