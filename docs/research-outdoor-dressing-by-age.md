# Research: how outdoor/walking dressing should differ by age

Follow-up to `docs/research-sleep-dressing-by-age.md`, prompted by the same
observation: `pickOutdoor()`'s only age awareness is `ageAdjustmentC()`, a
±0.5–1°C nudge to the effective temperature. Measured empirically (probe
script scanning every integer `feelsLikeC` from -10 to 30°C, comparing a
1-month-old against an 18-month-old), that nudge changes the actual clothing
picked only ~17% of the time (7 of 41 temperatures), always in a narrow 1–2°C
window at a band edge. This documents what real guidance says the difference
should actually be.

## Finding 1: "one extra layer than an adult" is the standard rule — and it is explicitly NOT age-graded

Every source checked gives the same layering rule of thumb for babies from
newborn through toddlerhood: dress them in one more layer than an adult would
wear in the same conditions. No source scales this by age in degrees.

**Conclusion**: this matches what the engine already does. `ageAdjustmentC`'s
small size isn't a bug — there is no bigger number to reach for. Unlike sleep
(where a continuous adjustment was actively unsupported), here a _small_
continuous adjustment is roughly consistent with the guidance; it just isn't
where the real age-driven risk lives (see Finding 2).

## Finding 2: the real age difference is exposure duration and immobility, not clothing weight

Newborns under ~2 months are advised to cap outdoor time at 10–15 minutes in
cold weather, and to skip outdoor trips entirely below freezing. The reason
given is specific: at this age they are carried or seated in a stroller,
generating no body heat of their own, unlike a walking toddler. A mobile
toddler is a fundamentally different thermal situation than a stationary
newborn — this is a monitoring/duration rule, not a "wear N more layers"
rule.

**Implemented**: `pickOutdoor()`'s `buildSafety()` now adds a duration-based
safety note for babies under 2 months when it's cold or below freezing,
independent of the clothing picked.

## Finding 3: frostbite/extremity risk is elevated for babies vs. adults generally, not scaled month-by-month

Babies' higher surface-area-to-mass ratio and immature thermoregulation put
them at greater frostbite risk on the nose, ears, cheeks, fingers, and toes
than adults — but sources describe this as a baby-vs-adult gap, not a
newborn-vs-toddler gradient with a specific degree value attached.

**Not implemented**: no age-specific change — the engine's existing
mittens/hat thresholds (`TEMP.COLD` for mittens, `bandFor` for hat weight)
already apply uniformly to "baby", which matches the guidance's own
granularity.

## Finding 4: for heat, mobile toddlers overheat faster than adults — already handled

Toddlers generate and retain heat more efficiently and need lighter clothing
plus shade breaks, not warmer clothing, during activity. This is the same
shape of finding as the sleep-side "0–6 months is elevated overheating risk"
note, just for outdoor heat instead of nighttime.

**Not implemented**: the engine's existing hot-weather branches (shade/sun
advice, lighter layers above `TEMP.HOT`) already reflect this; no
age-specific carve-out was found in the guidance beyond what's there.

## What deliberately did NOT change

- `ageAdjustmentC` / `ageGroup` in `temperature.ts` — the small, non-age-graded
  layering difference these encode is consistent with the "one extra layer,
  same for all ages" rule; there's no evidence base for a larger degree shift.
- `pickLayers()`'s band-to-clothing mapping — untouched, per Finding 1.
- Mittens/hat/frostbite-related accessory thresholds — per Finding 3, no
  age-specific value was found in the guidance to differentiate them by.

## Sources

- [How to Dress a Baby in Winter, According to a Pediatrician — Fatherly](https://www.fatherly.com/parenting/how-to-dress-baby-cold-weather-winter-layering)
- [How to keep your newborn baby warm in winter weather — Riley Children's Health](https://www.rileychildrens.org/connections/how-to-keep-your-newborn-baby-warm-in-winter-weather)
- [How cold is _too cold_ for a baby to go outside? — Motherly](https://www.mother.ly/baby/baby-health/how-cold-is-too-cold-for-a-baby-to-go-outside/)
- [Cold Weather Safety for Children: Preventing Frostbite & Hypothermia — HealthyChildren.org (AAP)](https://www.healthychildren.org/English/safety-prevention/at-play/Pages/Cold-Weather-Safety.aspx)
- [Cold Weather Tips for Babies and Toddlers — Happiest Baby](https://www.happiestbaby.com/blogs/baby/cold-weather-babies-toddlers)
- [Kids and Heat — Children's Primary Care Medical Group](https://www.cpcmg.net/kids-and-heat/)

## Code touched

- `src/lib/recommend/pick-outdoor.ts` — `buildSafety()` adds a cold-exposure
  duration note for babies under 2 months (skip outdoor trips below freezing,
  cap at 10–15 minutes in cold weather).
