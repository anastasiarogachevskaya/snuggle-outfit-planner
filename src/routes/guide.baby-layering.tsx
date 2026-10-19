import { createFileRoute, Link } from "@tanstack/react-router";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

const TITLE = "How to Dress a Baby in Cold Weather: °C & °F Guide | Layerly";
const DESCRIPTION =
  "Baby clothing examples for 10°C (50°F), 16°C (61°F) and freezing weather, with stroller layers, safe car-seat clothing and tips to avoid overheating.";

export const Route = createFileRoute("/guide/baby-layering")({
  head: () => {
    const base = pageMeta({
      title: TITLE,
      description: DESCRIPTION,
      path: "/guide/baby-layering",
      type: "article",
    });
    return {
      ...base,
      // This guide has no cover image; don't attach the shared app screenshot.
      meta: base.meta.filter((tag) =>
        !("property" in tag && tag.property === "og:image") &&
        !("name" in tag && tag.name === "twitter:image"),
      ),
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

const EXAMPLES = [
  {
    range: "16°C / about 61°F — a mild walk",
    outfit: "A long-sleeve bodysuit, regular pants and a light cardigan are a useful starting point for a baby sitting in a stroller. Cotton socks and a thin outdoor hat may be useful in cooler or breezy conditions.",
    check: "A sheltered, sunny walk can feel different from an exposed one. Keep the cardigan easy to remove rather than adding winter gear just because it is autumn.",
  },
  {
    range: "10°C / 50°F — a cool walk",
    outfit: "Start with long sleeves and pants, then choose an adjustable mid layer such as a cardigan or fleece according to wind, shelter and the stroller's insulation. Have a suitable wind-resistant outer layer available for exposed conditions.",
    check: "A blanket or footmuff adds warmth too. Count it as part of the outfit, not as a free extra on top of every clothing layer.",
  },
  {
    range: "5°C / 41°F — approaching freezing",
    outfit: "Long sleeves, warmer bottoms and a fleece or wool mid layer can be a starting point. Add protection for exposed feet and hands and a warm hat. Wind or a lower feels-like reading can make an insulated overall more useful.",
    check: "If you switch to a warm winter overall, reassess the mid layer. A thick overall plus fleece plus an insulated footmuff can be too much for some babies.",
  },
  {
    range: "+1°C / about 34°F — around freezing",
    outfit: "For a sheltered stroller walk, everyday long sleeves and pants under a winter overall can be a starting point, with socks, a warm hat and mittens. A bulky fleece underneath is not automatically necessary.",
    check: "Overalls and footmuffs vary widely in insulation. This example is not a promise that every baby will be comfortable in the same clothes; check your baby and adjust.",
  },
  {
    range: "−5°C to −10°C / 23°F to 14°F — colder sub-zero weather",
    outfit: "As it gets colder, a fleece or wool mid layer and warmer bottoms may be needed under the winter overall. Wool leggings are warmer than thin cotton leggings; the fabric and thickness matter more than the name. Protect ears, hands and feet.",
    check: "Layerly adds a mid layer below an adjusted −5°C, not at a universal outdoor thermometer threshold. Wind, walk length, age and transport can shift the suggestion. A footmuff's warmth still needs to be considered.",
  },
  {
    range: "Below −15°C / below 5°F — very cold conditions",
    outfit: "Do not assume another layer makes a long outing safe. Consider postponing a non-essential walk, especially in strong wind, and be ready to return indoors sooner. Keep baby's face visible and airways unobstructed.",
    check: "Watch exposed cheeks and nose as well as overall comfort. There is no single safe walk duration for all babies and conditions; seek individual advice for newborns, premature babies or babies with health concerns.",
  },
];

function LayeringGuide() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-6 py-10 font-sans">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link to="/" className="font-serif text-lg font-semibold">Layerly</Link>
          <Button asChild variant="link"><Link to="/try">Try Layerly</Link></Button>
        </header>

        <main className="text-ink">
          <h1 className="font-serif text-3xl font-semibold leading-tight">
            How to dress a baby in cold weather
          </h1>
          <p className="mt-4 leading-relaxed text-ink/80">
            Start with comfortable everyday clothes, add warmth for the conditions, and choose
            layers you can remove. A winter overall or insulated footmuff already provides a lot
            of warmth: near freezing, your baby does not automatically need a thick fleece
            underneath as well.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            These are starting examples for awake outdoor outings, not medical temperature rules
            or sleep outfits. Your baby's age, the clothing's thickness, wind, shelter and time
            outside all matter. Updated 19 October 2026.
          </p>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold">Build an outfit, not a pile of layers</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/80">
              <li><strong className="font-medium text-ink">Base:</strong> a comfortable bodysuit or top. Cotton can still be suitable near freezing when warm outerwear does the insulating; wool is an option, not a requirement for every cold day.</li>
              <li><strong className="font-medium text-ink">Bottoms:</strong> regular pants, thin leggings or warmer wool leggings. Thin cotton leggings usually add less warmth than thicker pants.</li>
              <li><strong className="font-medium text-ink">Mid:</strong> a cardigan, fleece or wool layer when extra insulation is needed. It does not have to be present under every winter overall.</li>
              <li><strong className="font-medium text-ink">Outer:</strong> a jacket or insulated overall suited to the conditions. A footmuff adds warmth around the baby, but does not protect every exposed area or replace a suitable rain cover.</li>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-ink/80">
              The American Academy of Pediatrics suggests one more clothing layer than a
              comfortably dressed adult as a general rule for young babies. Use that as a starting
              point, then account for the overall, footmuff and your baby's comfort — not as a
              reason to keep adding layers. <a href="#sources" className="text-primary underline underline-offset-4">Sources below</a> explain the general safety guidance; they do not endorse Layerly's temperature examples.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold">Baby clothing examples in Celsius and Fahrenheit</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              Look at both the temperature and the feels-like reading. Wind and wet conditions
              affect exposure, but a weather reading cannot measure the warmth inside your
              stroller. These examples are for walks, not clothes to wear under a car-seat harness.
            </p>
            <div className="mt-5 divide-y divide-border border-y border-border">
              {EXAMPLES.map((example) => (
                <article key={example.range} className="py-5">
                  <h3 className="font-medium">{example.range}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/80">{example.outfit}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink/70"><strong className="font-medium text-ink">What to check:</strong> {example.check}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold">Stroller warmth and moving indoors</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              A baby sitting still is not warming up by walking alongside you. But an insulated
              stroller, footmuff and winter overall can also trap substantial warmth. In a carrier,
              your body contributes warmth too — the same outfit will not suit every situation.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              When you enter a heated shop or return home, remove the outdoor hat and open or
              remove the overall and footmuff as appropriate. Do not wait for your baby to sweat.
              Keep the face visible and do not drape blankets over the stroller opening.
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              <Link to="/guide/stroller-walks" className="text-primary underline underline-offset-4">More about dressing for stroller walks</Link>
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold">Car trips: thin warmth under the harness</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              A winter overall or bulky coat must not go underneath a car-seat harness. Thick
              padding can compress in a crash and leave the harness too loose. Use thin, snug
              layers instead, and follow your seat manufacturer's fitting instructions.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              In cold conditions, long sleeves, warmer bottoms and a thin, well-fitting fleece
              can provide warmth without relying on a padded overall under the straps. Buckle
              and tighten the harness first, then put a blanket over it, keeping the face clear.
              Never put a blanket or unapproved insert beneath the baby or between the baby and
              the harness. Remove extra warmth as the car heats up.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold">Check your baby, not just the forecast</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              Feel the chest or back of the neck. Hands and feet can feel cooler and are not a
              reliable guide to overall warmth. Hot or sweaty skin is a reason to remove a layer;
              if the chest feels cool, return somewhere warm and reassess. Check again when the
              weather changes or you move indoors.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              More time outside does not always mean a different outfit: the current layers may
              already provide the warmth needed. Comfort checks still matter. If your baby seems
              unwell, unusually sleepy or difficult to wake, seek urgent medical advice rather
              than relying on a clothing suggestion.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold">Indoors and sleep are different</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              Dress for the room temperature indoors, not the outdoor forecast. Remove winter
              outerwear and hats. For sleep, follow safe-sleep advice and the sleeping bag
              manufacturer's room-temperature and clothing chart; TOG alone does not determine
              the whole outfit. The Lullaby Trust recommends a room temperature of 16–20°C
              (about 61–68°F), with light bedding or a suitable, well-fitting baby sleeping bag.
              Keep baby's head uncovered and avoid overheating.
            </p>
          </section>

          <section id="sources" className="mt-10 scroll-mt-6 border-t border-border pt-8">
            <h2 className="font-serif text-2xl font-semibold">Sources and safety guidance</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              General guidance from pediatric and safer-sleep organizations. The outfit examples
              above are Layerly's practical starting points, not medically reviewed prescriptions.
            </p>
            <ul className="mt-4 space-y-4 text-sm leading-relaxed text-ink/80">
              <li><a href="https://www.healthychildren.org/English/ages-stages/baby/diapers-clothing/Pages/Dressing-Your-Newborn.aspx" className="text-primary underline underline-offset-4">American Academy of Pediatrics: Dressing Your Newborn</a> — general layering and extra care for premature babies.</li>
              <li><a href="https://www.healthychildren.org/English/safety-prevention/on-the-go/Pages/winter-car-seat-safety-tips.aspx" className="text-primary underline underline-offset-4">American Academy of Pediatrics: Winter Car Seat Safety Tips</a> — thin layers, no bulky coats under the harness, and blankets over the straps.</li>
              <li><a href="https://www.nhs.uk/best-start-in-life/baby/baby-basics/caring-for-your-baby/how-to-dress-a-newborn/" className="text-primary underline underline-offset-4">NHS: How to dress a newborn baby</a> — removing hats and extra clothing indoors or in a warm vehicle.</li>
              <li><a href="https://www.lullabytrust.org.uk/wp-content/uploads/2025/02/Temperature-factsheet.pdf" className="text-primary underline underline-offset-4">The Lullaby Trust: Temperature factsheet</a> — overheating checks and safer sleep at 16–20°C.</li>
              <li><a href="https://www.healthychildren.org/English/safety-prevention/at-play/Pages/Cold-Weather-Safety.aspx" className="text-primary underline underline-offset-4">American Academy of Pediatrics: Cold Weather Safety for Children</a> — thin layers, protecting exposed skin and recognizing cold-related risks.</li>
            </ul>
          </section>

          <section className="mt-12 border-t border-border pt-8">
            <h2 className="font-serif text-xl font-semibold">Find a starting outfit with Layerly</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              Choose Home, Walk or Car, add the clothes you own, and get a suggestion using the
              weather, your baby's age and your plans. Layerly is a clothing planning tool, not
              medical advice or a guarantee of comfort. Check your baby and adjust as you go.
            </p>
            <Button asChild size="lg" className="mt-5 h-auto min-h-11 w-full whitespace-normal text-center">
              <Link to="/try">Try Layerly — no account needed</Link>
            </Button>
          </section>
        </main>
        <SiteFooter className="mt-14" />
      </div>
    </div>
  );
}
