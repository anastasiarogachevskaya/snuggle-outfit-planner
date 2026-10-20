import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { SiteFooter } from "@/components/site-footer";

const TITLE = "Stroller Clothing Guide: Dressing Baby for Pram and Carrier Walks | Layerly";
const DESCRIPTION =
  "How to dress your baby for pram, stroller and carrier walks — footmuff layering, avoiding overheating in warm shops, rain covers and wind chill.";

export const Route = createFileRoute("/guide/stroller-walks")({
  head: () => {
    const base = pageMeta({
      title: TITLE,
      description: DESCRIPTION,
      path: "/guide/stroller-walks",
      type: "article",
    });
    return {
      ...base,
      scripts: [
        breadcrumbLd([
          { name: "Layerly", path: "/" },
          { name: "Stroller clothing guide", path: "/guide/stroller-walks" },
        ]),
      ],
    };
  },
  component: StrollerGuide,
});

function StrollerGuide() {
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
            Stroller clothing guide
          </h1>
          <p className="mt-4 leading-relaxed text-ink/70">
            The same temperature calls for different clothing depending on how your baby travels. A
            baby lying still in a pram generates almost no heat, while a baby worn in a carrier
            shares your body warmth. Here is how to adjust.
          </p>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Pram</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              In a lie-flat pram the baby lies still, so they make less of their own heat than a
              baby who is moving or being carried. Dress one layer warmer than you would indoors
              at the same temperature, and use a footmuff or pram bag below roughly 10°C. A pram is
              typically used until around six months.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Stroller</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              An upright stroller exposes the baby to more wind, so windproof outer layers matter
              more than extra bulk. A blanket over the legs plus a warm hat usually beats an
              oversized snowsuit that restricts the harness. Keep the harness snug against the body,
              with bulky layers on top rather than underneath.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Baby carrier</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              In a carrier your body acts as a layer, so a carried baby needs roughly one layer less
              than the same baby in a pram. Skip thick snowsuits, which stop the carrier fitting
              correctly; instead use a base layer, a mid layer, warm socks and a hat, and put your
              own coat over both of you. Check that the face stays clear and the airway is open.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Rain, wind and sun</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/70">
              <li>
                <strong className="font-medium text-ink">Rain cover</strong> — keeps the baby dry
                and adds a couple of degrees of warmth by blocking wind, so remove a layer
                underneath and ventilate once you are inside.
              </li>
              <li>
                <strong className="font-medium text-ink">Wind</strong> — use the feels-like
                temperature. A 10°C day with strong wind can feel closer to 5°C for a baby who is
                not moving.
              </li>
              <li>
                <strong className="font-medium text-ink">Sun</strong> — use the canopy, a wide-brim
                hat and light, long-sleeved cotton when the UV index is 3 or higher. Never drape a
                blanket over the pram to make shade; it traps heat.
              </li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">How long you are out</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              A ten-minute walk to the shop and a two-hour nap walk are different problems. For
              short outings, dress for comfort indoors and add one outer layer. For long outings,
              add a spare layer you can put on when the baby settles and stops moving, and check the
              neck and chest halfway through.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">
              From cold street to warm shop
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              A baby dressed for −5°C (23°F) outside is overdressed in a 21°C (70°F) shop, café or
              bus within minutes. The NHS advises removing hats and extra clothing as soon as you
              are indoors or in a warm car, bus or train, even if it means waking your baby.
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/70">
              <li>
                <strong className="font-medium text-ink">Quick stop (a few minutes)</strong> — take
                off the hat, open the footmuff or fold back the blanket, and unzip the overall at the
                chest.
              </li>
              <li>
                <strong className="font-medium text-ink">Longer stay</strong> — take the winter
                overall off, or lift baby out of the footmuff. Put them back on just before you go
                outside again.
              </li>
              <li>
                <strong className="font-medium text-ink">Rain cover</strong> — take it off indoors.
                It traps warm air around the baby.
              </li>
              <li>
                <strong className="font-medium text-ink">Check, don't guess</strong> — feel the back
                of the neck or the chest. Hands and feet are usually cooler, which is normal. Hot,
                damp or sweaty skin means remove a layer.
              </li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">
              Footmuffs and which layers to skip
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              A footmuff or pram bag is a warm outer layer in its own right. When you use one, you
              usually don't need every warm layer underneath as well. Too many layers under a
              footmuff is a common way babies end up sweaty on winter walks.
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/70">
              <li>
                <strong className="font-medium text-ink">Around 0 to +4°C (32–39°F)</strong> — a
                long-sleeve bodysuit, trousers, socks, a warm hat, mittens and a winter overall
                inside the footmuff are usually enough. Skip the fleece underneath.
              </li>
              <li>
                <strong className="font-medium text-ink">About −5°C (23°F) and colder</strong> — add
                a fleece or wool layer and warmer bottoms under the overall, and keep the footmuff
                zipped up.
              </li>
              <li>
                <strong className="font-medium text-ink">Mild days</strong> — choose either the
                footmuff or a thick overall, not both. A light jacket inside a footmuff is often
                plenty around +5 to +10°C (41–50°F).
              </li>
              <li>
                <strong className="font-medium text-ink">Car seat</strong> — never use a footmuff or
                thick overall under the car-seat harness. Buckle baby in thin layers and lay a
                blanket over the straps.
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              These are starting points, not rules. Every baby and every footmuff is different, so
              check the neck after the first 15–20 minutes and adjust.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold text-ink">Sources</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink/70">
              <li>
                <a
                  className="text-primary underline underline-offset-4"
                  href="https://www.healthychildren.org/English/ages-stages/baby/diapers-clothing/Pages/Dressing-Your-Newborn.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  American Academy of Pediatrics (HealthyChildren.org) — Dressing your newborn
                </a>
              </li>
              <li>
                <a
                  className="text-primary underline underline-offset-4"
                  href="https://www.healthychildren.org/English/safety-prevention/on-the-go/Pages/winter-car-seat-safety-tips.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  American Academy of Pediatrics — Winter car seat safety tips
                </a>
              </li>
              <li>
                <a
                  className="text-primary underline underline-offset-4"
                  href="https://www.nhs.uk/best-start-in-life/baby/baby-basics/caring-for-your-baby/how-to-dress-a-newborn/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  NHS — How to dress a newborn baby
                </a>
              </li>
              <li>
                <a
                  className="text-primary underline underline-offset-4"
                  href="https://www.lullabytrust.org.uk/baby-safety/safer-sleep-information/room-temperature/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  The Lullaby Trust — How to check if your baby is too hot
                </a>
              </li>
              <li>
                <a
                  className="text-primary underline underline-offset-4"
                  href="https://www.lullabytrust.org.uk/baby-safety/travel-and-weather/cold-weather/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  The Lullaby Trust — Cold weather
                </a>
              </li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink/50">
              This guide is general information, not medical advice. If your baby seems unwell, ask
              your health visitor or doctor.
            </p>
          </section>

          <section className="mt-12 rounded-[28px] border border-black/5 bg-surface p-6">
            <h2 className="font-serif text-xl font-semibold text-ink">
              Get an outfit for today's walk
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              Pick pram, stroller or carrier and a duration, and Layerly adjusts the layers and
              extras for you.
            </p>
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
