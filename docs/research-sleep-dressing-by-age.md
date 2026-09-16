# Research: how baby sleep dressing should differ by age

Prompted by a review of `src/lib/recommend/pick-sleep.ts`, which had no age
awareness at all — a newborn and a 12-month-old in the same room got
identical sleepwear. This documents what the underlying guidance actually
says, and what changed in the engine as a result.

## Finding 1: TOG-by-room-temperature is explicitly NOT age-dependent

Every source checked — The Lullaby Trust, HALO, ergopouch — keys the
standard TOG chart to **room temperature alone**:

| Room temperature  | TOG                 | Layer                                           |
| ----------------- | ------------------- | ----------------------------------------------- |
| ≥24°C (75°F+)     | 0.5–1.0             | Light — short-sleeve bodysuit alone above ~24°C |
| 20–24°C (68–75°F) | 1.0–2.5             | Standard sleepwear + sack                       |
| 16–20°C (61–68°F) | 2.5–3.5             | Warmer sleepwear + sack                         |
| <16°C             | 3.5+ or extra layer | Never double up sleep bags                      |

The Lullaby Trust is explicit that this advice is the same for all babies —
a 4-month-old and a 22-month-old in the same room need the same TOG. **This
means the fix is not "add a continuous age-based degree shift" the way the
outdoor-walking logic does it** — there's no evidence base for that shape of
adjustment here.

## Finding 2: newborns under 1 month are the one real exception — and the adjustment goes the _unintuitive_ direction

The Lullaby Trust's specific newborn guidance: for babies under 1 month,
**start a layer lighter** than the chart suggests and add a thin layer
rather than jumping to a high TOG. This is the opposite of the instinct to
bundle a newborn more — it's driven by overheating being the dominant risk
for this age, combined with newborns being unable to remove a layer or
signal distress the way an older baby might.

**Implemented**: `pickSleep()` now takes `ageMonths` and steps the computed
base layer one notch lighter (`pajamas` → `pajamas_light` → `short_sleeve` →
`sleeveless`) for babies under 1 month, on both the TOG-sack path and the
swaddle path. The ideal TOG value itself is untouched, per Finding 1.

## Finding 3: swaddling is a hard developmental cutoff, not a temperature variable

AAP / HealthyChildren.org: stop swaddling at the **first sign of rolling**,
which can start as early as 2 months and typically happens by 2–4 months.
Once a baby can roll onto their front while swaddled, they can't free their
arms to reposition — a real suffocation risk, not a comfort issue.

**Implemented**: the swaddle-eligibility cutoff moved from `< 4` months to
`< 3` months (a default, sitting toward the earlier end of "2 to 4 months"
rather than the late end), and the engine now always attaches a safety note
whenever a swaddle is actually recommended: _"Stop swaddling the moment baby
shows any sign of rolling over — even before this age."_ No age cutoff can
know whether a specific baby has started rolling, so the note is
unconditional whenever swaddling is suggested at all.

## Finding 4: overheating vulnerability during sleep isn't simply "younger = more fragile"

A peer-reviewed review (PMC) found infants **2–3 months old may be more
heat-stress-vulnerable than younger newborns**, and a documented SIDS/
temperature correlation spans **3–12 months**, with days above 29°C showing
~2.8× the risk of 20°C days. The practical takeaway isn't a fine-grained
age curve — it's that the whole **0–6 month window** is elevated-risk,
consistent with the general SIDS age profile, and shouldn't be treated as a
smooth gradient from birth.

**Implemented**: a dedicated safety note now fires for `ageMonths < 6`
regardless of room temperature (as long as the room isn't already flagged as
very hot, where a stronger warning already exists): _"Under 6 months is the
highest-risk age for overheating during sleep — check baby's neck or chest
regularly, even if the room feels comfortable."_ This is additive to, not a
replacement for, the existing temperature-triggered overheating advice.

## Finding 5: sleep sacks have no age floor or ceiling

Sleep sacks (non-swaddling, free arm movement) are safe from birth and the
AAP places no upper age limit — many families use them through toddlerhood.
Sizing by weight/age is a product-fit question, not a warmth-by-age one.

**Not implemented**: no change needed here — `pickSleep()` already treats
sleep-sack eligibility as available at any age.

## What deliberately did NOT change

- The ideal TOG value for a given room temperature — no source supports
  making this age-dependent.
- Sleep-sack availability by age — no floor or ceiling exists in the
  guidance.
- The outdoor-walking age adjustment in `temperature.ts` (`ageAdjustmentC`)
  — out of scope for this pass; sleep and outdoor dressing are governed by
  different guidance and shouldn't be conflated.

## Sources

- [How to dress your baby for sleep — The Lullaby Trust](https://www.lullabytrust.org.uk/baby-safety/baby-product-information/dress-your-baby-for-sleep/)
- [TOG Chart & Rating: What is a TOG Value, Exactly? — HALO](https://www.halosleep.com/blogs/halo/tog-chart)
- [What is a TOG rating? — ergopouch](https://www.ergopouch.com/pages/what-to-wear-guide)
- [Swaddling: Is it Safe for Your Baby? — HealthyChildren.org (AAP)](https://www.healthychildren.org/English/ages-stages/baby/diapers-clothing/Pages/Swaddling-Is-it-Safe.aspx)
- [When to Stop Swaddling Your Baby — Happiest Baby](https://www.happiestbaby.com/blogs/baby/when-to-stop-swaddling-your-baby)
- [Sleep Sacks: When to use, when to stop, sizing by age — Huckleberry](https://huckleberrycare.com/blog/sleep-sacks-why-when-how-long-to-use-and-sizing-tips-by-age)
- [Hyperthermia and Heat Stress as Risk Factors for SIDS: A Narrative Review — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9051231/)

## Code touched

- `src/lib/recommend/pick-sleep.ts` — `pickSleep()` takes `ageMonths`, adds
  `stepBaseDown()` (exported for reuse), newborn-under-1-month adjustment.
- `src/lib/recommend/pick-home.ts` — swaddle cutoff `< 4` → `< 3` months,
  "stop on rolling" safety note, newborn adjustment applied to the swaddle
  path too, under-6-months overheating note.
- `src/lib/recommend/__tests__/recommend.test.ts` — 7 new tests covering all
  of the above.
