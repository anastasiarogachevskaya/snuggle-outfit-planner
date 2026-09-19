# Show all transport extras in Layer up

## Why it looks limited today

In Layer up, the transport extras row only lists items that today's weather rules picked *and* that you already own. Everything else is hidden, so the row often shows one tile or nothing at all.

## What changes

Layer up will show two groups of transport extras:

- **Recommended today** — the same tiles as now, highlighted, with the add/remove hints they already have.
- **Other options** — the remaining extras that make sense for the chosen way of getting around, shown in a quieter, greyed-out style. You can still tap them on or off when building an outfit.

Which extras belong to each way of getting around:

- Pram / stroller: rain cover, footmuff, blanket
- Baby carrier: babywearing cover, blanket
- Car: blanket, car seat blanket

Items you don't own yet appear in the quieter group too, marked as not in your wardrobe, so you can see what would help without it looking like a recommendation.

Verdict behaviour stays the same: only extras Layerly actually recommends for today count towards "missing" advice. Choosing an extra from the quieter group never triggers a "remove this" warning.

## Technical notes

- New helper in `src/lib/recommend.ts` (or a small module next to it) listing candidate transport extras per `situation` + `transportMode`, reusing the existing `WardrobeSlug` labels from `src/lib/wardrobe-catalog.ts`.
- `Recommendation` gains `optionalTransportExtras: Accessory[]` = candidates minus the ones already in `transportExtras`, each flagged `owned: boolean`.
- `src/components/today-screen/check-outfit-panel.tsx` renders the extras section as recommended tiles followed by the optional tiles using the existing muted tile styling; keep tiles compact and consistent with the other Layer up rows.
- `compareOutfits` in `src/lib/recommend/warmth.ts` is unchanged — `missingTransportExtras` still derives only from the ideal outfit.
- Add unit tests covering the candidate list per transport mode and that optional extras never produce adjustments.
