# Auto-recommend transport extras & age-aware transport

## Scope
Move rain cover / footmuff / blanket / babywearing cover from manual toggles into the recommendation engine. Hide Pram for babies > 6 months. Split output into three groups.

## 1. `src/lib/recommend.ts`

Remove the boolean inputs `rainCoverUsed`, `footmuffUsed`, `blanketUsed`, `babywearingCoverUsed` from `RecommendInput`. Add optional `isRaining?: boolean` (from weather).

New output shape:
```ts
type Recommendation = {
  babyClothing: Layer[];        // was `layers`
  transportExtras: Accessory[]; // owned extras actually used
  missingHelpfulItems: Accessory[]; // suggested-for-next-time
  reason: string;
  notes: string[];
  effectiveTempC: number;
};
```

New extras decision flow (walk only), run BEFORE clothing thresholds so warmth adjustments apply only for owned items:

- Pram / sitting-stroller:
  - If `isRaining`: consider `rain_cover`. If owned → include in `transportExtras`, apply +2°C. If not owned → push to `missingHelpfulItems`, no warmth adjustment.
  - If `effective < 10`: consider `footmuff`. Owned → include, +2°C. Missing → suggest, no adjustment.
  - If still `effective < 16` after footmuff decision (or no footmuff owned and cold): consider `blanket`. Owned → include, +1°C. Missing → suggest.
- Carrier:
  - Base carrier +3°C always.
  - If `effective < 8`: consider `babywearing_cover`. Owned → include, +2°C. Missing → suggest.
  - If `effective < 12`: consider `blanket`. Owned → include, +1°C. Missing → suggest.
- Car + long trip + cold: keep existing blanket note logic under `transportExtras` if owned; suggest otherwise.

Clothing thresholds (base / bottom / mid / outer / hat / socks / mittens) stay as today but now use `effective` after only owned-extra adjustments — so missing extras naturally lead to warmer clothing.

Reason text:
- Mention only extras actually used ("Rain cover keeps it warmer and reduces airflow, so outfit is lighter." / "Footmuff adds warmth, so outfit adjusted lighter." / carrier + cover phrasing).
- If a helpful extra is missing, add note: "No footmuff — outfit adjusted warmer to compensate."

Safety notes (existing) triggered only when the extra is actually included.

## 2. `src/routes/_authenticated/today.tsx`

- Remove the `covers` state and the entire "Any extra cover?" block.
- Remove passing cover booleans into `recommend()`.
- Compute baby age from `baby.birthdate` (months). Build transport options list:
  - `pram` only if age ≤ 6 months (default only if age < 4 months, otherwise `sitting-stroller` is default).
  - `sitting-stroller` always.
  - `carrier` always.
- On baby load, if current `transportMode` is invalid for age, set to `sitting-stroller`.
- Pass `isRaining` derived from `weatherQ.data.condition` (simple check for rain/showers/drizzle) to `recommend()`.

Render three sections in the recommendation card:
1. **Baby clothing** — `rec.babyClothing` (same Row component).
2. **Transport extras** — `rec.transportExtras` (only shown if non-empty).
3. **Suggested for next time** — `rec.missingHelpfulItems` (muted styling, links to `/wardrobe`).

Update the "layers count → headline" mapping to use `babyClothing.length`.

Remove the old `missing` badge (its role is now split between the three groups); wardrobe-item mismatches for clothing itself still shown via `dim` + "Not in your wardrobe" hint on each row.

## 3. Weather

`src/lib/weather.ts` already returns a `condition` string; derive `isRaining` in `today.tsx` via a small helper (`/rain|drizzle|shower/i`). No API change needed.

## Out of scope
- No schema changes.
- No changes to onboarding wardrobe wizard.
- No changes to home/car UI beyond what the new output shape requires.

## Acceptance
- Walk screen shows only Transport + Duration.
- Owned rain cover on rainy walk appears under Transport extras and lightens outfit; missing rain cover appears under Suggested for next time and outfit stays warmer.
- Same for footmuff / blanket / babywearing cover.
- Pram hidden for babies > 6 months; Stroller available at 0+.
- Reason text references only extras actually used and calls out compensation when a helpful item is missing.
