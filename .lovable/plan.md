# Recommendation Engine Refactor

Refactor `src/lib/recommend.ts` for maintainability and better warm-weather accuracy. Keep the same public API (`recommend(input): Recommendation`) so `today.tsx` and other callers don't change.

## 1. Centralize temperature constants

New file `src/lib/recommend/temperature.ts`:

```ts
export const TEMP = {
  VERY_HOT: 28, HOT: 24, WARM: 20, MILD: 15,
  COOL: 10, COLD: 5, FREEZING: 0,
} as const;

export type Band = "very_hot" | "hot" | "warm" | "mild" | "cool" | "cold" | "freezing";
export function bandFor(tC: number): Band { /* uses TEMP */ }
```

All threshold comparisons in the engine reference `TEMP.*` or `bandFor()` — no bare numbers.

## 2. Layer-based internal model

New file `src/lib/recommend/layers.ts`:

```ts
export type LayerNeed = { base: BaseKind; bottom?: BottomKind; mid?: MidKind; outer?: OuterKind };
type BaseKind = "sleeveless" | "short_sleeve" | "long_sleeve" | "pajamas" | "diaper_only";
type BottomKind = "shorts" | "pants" | "leggings";
type MidKind = "sweater" | "fleece";
type OuterKind = "winter_overall";
```

Pipeline becomes:
1. `computeEffectiveTemp(input)` — situation/transport/pref adjustments
2. `pickLayers(effective, context)` — pure function returning `LayerNeed`
3. `pickAccessories(effective, context)` — hat/socks/mittens by band
4. `mapToWardrobe(layers, accessories, owned)` — turns kinds into `Layer[]`/`Accessory[]`, records missing

Home and outdoor share the mapping step; only the picking step differs. Extract `recommendHome` similarly into a pure `pickHome(context)` returning the same intermediate shape.

## 3. Warm-weather corrections

Revised outdoor bands (effective temp):

| Band | Base | Bottom | Mid | Outer | Socks | Hat |
|---|---|---|---|---|---|---|
| ≥26 (very hot) | sleeveless | shorts (or none) | — | — | none | sun hat |
| 22–25 (hot) | short_sleeve | shorts | — | — | none | sun hat |
| 18–21 (warm) | short_sleeve | light pants | — | — | none (cotton if <20) | sun hat if UV≥3 |
| 15–17 (mild) | long_sleeve | pants | — | — | cotton | thin |
| 10–14 (cool) | long_sleeve | pants | sweater | — | cotton | thin |
| 5–9 (cold) | long_sleeve | leggings | fleece | — | wool | warm |
| 0–4 | long_sleeve | leggings | fleece | winter overall | wool | warm + mittens |
| <0 (freezing) | long_sleeve | leggings | fleece | winter overall | wool | warm + mittens + balaclava if owned |

Key change: 18–26°C drops the mid layer, prefers short-sleeve + shorts, and drops socks unless cool.

## 4. Transport re-tuning (validated warm + cold)

- Pram: +1°C (protected)
- Sitting stroller: −1°C (exposed)
- Carrier: +3°C (body heat)
- Above `TEMP.WARM`, cap the carrier bump at +1 to avoid overheating and add a note about hydration/shade instead of extra layers.
- Extras (footmuff/blanket/rain_cover/babywearing_cover) only considered when effective < `TEMP.MILD`.

## 5. Duration influence

Add `durationFactor` (walk only):
- ≥60 min AND effective < `TEMP.COOL`: −1°C (dress warmer)
- ≥60 min AND effective ≥ `TEMP.HOT`: +1°C (dress lighter) + safety note about breaks/shade/water
- <15 min: no adjustment beyond current
- Car: existing 30-min blanket rule kept, referenced against `TEMP.MILD`.

## 6. Age groups

`ageGroup(ageMonths)` → `"0-3" | "3-6" | "6-12" | "12+"`:
- 0–3 mo: −0.5°C (less movement, harder to regulate)
- 3–6 mo: 0
- 6–12 mo: +0.5°C (more movement)
- 12+ mo: +1°C

Applied once in `computeEffectiveTemp`. Existing under-6-months sun advice preserved. Pram hidden >6 mo unchanged.

## 7. Insulation-ready structure

`layers.ts` exports `LAYER_WARMTH: Record<Kind, number>` (unused today, populated with rough clo-like values). Not wired into decisions yet, but placed so a future `sumWarmth(layers) vs target(effective)` swap-in is mechanical.

## 8. Test cases

Add `src/lib/recommend/__tests__/recommend.test.ts` (vitest) covering the four scenarios in the brief plus regressions:
- Summer walk 22°C, UV 5, pram, 30 min → short_sleeve base, shorts, sun hat, no socks, no mid.
- Spring walk 12°C, pram → long_sleeve, pants, sweater, thin hat.
- Winter walk −5°C, windy, pram → long_sleeve, fleece, winter overall, warm hat, mittens, footmuff extra.
- Home sleeping 21°C → pajamas + light sleep sack.
- Long walk 90 min at 24°C → adds warm-weather safety note, no extra layers.
- Carrier at 22°C → not warmer than stroller equivalent.

Run `bunx vitest run` to verify.

## Files touched

- New: `src/lib/recommend/temperature.ts`, `src/lib/recommend/layers.ts`, `src/lib/recommend/pick-outdoor.ts`, `src/lib/recommend/pick-home.ts`, `src/lib/recommend/map-wardrobe.ts`, `src/lib/recommend/__tests__/recommend.test.ts`.
- Rewritten: `src/lib/recommend.ts` becomes a thin composition + re-export keeping the current exported types/signature.
- No UI or DB changes. `today.tsx`, `wardrobe-catalog.ts`, and Supabase schemas untouched.

## Out of scope

- Full insulation/clo model (structure only, no behavior change).
- New wardrobe items beyond existing catalog.
- New user-facing controls.
