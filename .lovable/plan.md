# TOG-based sleep sack recommendations

Replace the two vague "light / warm" sleep sacks with four TOG-rated items and make the sleep engine choose sleepwear based on the sleep sack the parent actually owns.

## Wardrobe changes

`src/lib/wardrobe-catalog.ts`
- Replace `sleep_sack_light` and `sleep_sack_warm` with:
  - `sleep_sack_05` — Sleep sack (0.5 TOG)
  - `sleep_sack_10` — Sleep sack (1.0 TOG)
  - `sleep_sack_25` — Sleep sack (2.5 TOG)
  - `sleep_sack_35` — Sleep sack (3.5 TOG)
- Update the Sleep onboarding step and `WardrobeSlug` union. `swaddle` stays.
- Migrate any existing rows in `wardrobe_items` (Lovable Cloud): map `sleep_sack_light` → `sleep_sack_10`, `sleep_sack_warm` → `sleep_sack_25`. Old rows for the removed slugs get deleted after migration.

`src/components/icons/index.tsx`
- Add icon entries for the four new slugs (reuse moon/bed style; drop the two old ones).

## New engine module

`src/lib/recommend/pick-sleep.ts`
- Export `TOG_ITEMS`: ordered list `[{slug, tog: 0.5|1.0|2.5|3.5, label}]`.
- `idealTogFor(roomTempC)` → number | null using the spec:
  - ≥27 → null (no sack)
  - 24–26 → 0.5
  - 20–23 → 1.0
  - 16–19 → 2.5
  - <16 → 3.5
- `chooseSleepSack(roomTempC, owned)` → `{ chosen: {slug,tog}|null, ideal: number|null, ownedIdeal: boolean, suggestion: {slug,tog}|null }`
  - If ideal is null: `chosen = null`.
  - Else if owned includes ideal TOG: use it.
  - Else pick the owned sack whose TOG is numerically closest to ideal (ties → warmer).
  - `suggestion` = the ideal-TOG sack when not owned (for "Suggested for next time").
- `sleepwearForDelta(roomTempC, chosenTog, idealTog)` → `BaseKind` selecting pajamas warmth based on how far chosen TOG is from ideal:
  - No sack + hot → `diaper_only` / `short_sleeve` per current thresholds.
  - Chosen ≈ ideal → normal pajamas for band (light pajamas 21–23, pajamas <21, short-sleeve 24+).
  - Chosen warmer than ideal → step down (e.g. `short_sleeve` or `sleeveless`).
  - Chosen cooler than ideal → step up (`pajamas` with note; add socks="wool" when very cold).
- Return a short `explanation` string matching the examples ("Using your 2.5 TOG sleep sack, so lighter sleepwear is recommended underneath.", "A 1.0 TOG sleep sack would be ideal for this room temperature.", etc.).

## Wire into pickHome

`src/lib/recommend/pick-home.ts`
- In the `homeActivity === "sleeping"` branch, replace the current cascade with a call to the new sleep module. Keep the existing very-hot safety advice (≥27) and warm-room advice (≥24) but drive base layer + sleep sack + missingSleep from `chooseSleepSack` + `sleepwearForDelta`.
- Newborn swaddle branch keeps priority when `ageMonths < 4` and `owned.has("swaddle")` — swaddle replaces the sack; still show the ideal-TOG sack under `missingSleep` only if not owned AND no swaddle used? No — swaddle-first babies don't need a sack suggestion. Keep suggestion suppressed when swaddle is used.
- Populate `reason` with room temp; append the sleep-sack explanation to `notes` (or set as a dedicated field surfaced through the existing `notes` array to avoid UI changes).

## Public types

`src/lib/recommend.ts` — no shape changes. `sleepAccessories` continues to carry the chosen sack; `missingHelpfulItems` carries the ideal-TOG suggestion when not owned. The Today screen already renders both under "Sleep accessories" and "Suggested for next time".

## Tests

`src/lib/recommend/__tests__/recommend.test.ts`
- Add cases: 21°C room + owns 1.0 → pajamas + 1.0 sack; 21°C + owns only 2.5 → short-sleeve + 2.5 sack + note; 17°C + owns only 1.0 → warm pajamas + 1.0 sack + wool socks; 21°C + owns no sack → pajamas + suggestion for 1.0 TOG under missing; 28°C + any → diaper only, no sack.

## Data migration

Single Lovable Cloud migration:
- `UPDATE public.wardrobe_items SET slug = 'sleep_sack_10' WHERE slug = 'sleep_sack_light';`
- `UPDATE public.wardrobe_items SET slug = 'sleep_sack_25' WHERE slug = 'sleep_sack_warm';`
- No schema changes; slug is free-form text.

## Acceptance mapping

- Sleep sacks represented by TOG values ✓ (four slugs).
- Multiple TOG sleep sacks can be owned ✓ (independent checklist items).
- Best available TOG chosen ✓ (`chooseSleepSack`).
- Pajamas adapt to chosen TOG ✓ (`sleepwearForDelta`).
- Missing ideal TOG appears under "Suggested for next time" ✓ (via `missingHelpfulItems`).
- Sleep explanation states why lighter/warmer sleepwear is used ✓ (returned string appended to notes).
