# Hot weather safety + home activity modes

Two related upgrades to the recommendation engine and Today screen: add sun/UV protection guidance for warm outdoor weather, and split Home mode into Playing vs Sleeping with hot-room logic.

## 1. Weather: add UV index

**`src/lib/weather.ts`**
- Extend Open-Meteo `current` query with `uv_index`.
- Add `uvIndex?: number` to `Weather` type (undefined when API omits it).

## 2. Wardrobe catalog: add sun/sleep items

**`src/lib/wardrobe-catalog.ts`**
- Extend `WardrobeSlug` union with: `sun_hat`, `sleep_sack_light`, `sleep_sack_warm`, `swaddle`.
- Add `sun_hat` tile to the Accessories step.
- Add a small "Sleep" step (or extend Base) with sleep sacks + swaddle tiles.
- Keep `QUICK_SETUP_OWNED` unchanged.

## 3. Recommendation engine

**`src/lib/recommend.ts`**

New input fields:
- `homeActivity?: "playing" | "sleeping"` (used when `situation === "home"`).
- `ageMonths?: number | null` (needed for sun-safety copy + swaddle rules).
- `uvIndex?: number`.

New output field:
- `safetyAdvice: string[]` (rendered as its own "Weather safety" / "Safety advice" section). Existing `notes` stays for transport-specific tips; safety advice is the new dedicated bucket for sun + hot-room messages.
- Add optional `sleepAccessories: Accessory[]` (only populated for sleep).

### Sun hat + sun safety (walk mode)
- If `effective >= 18` and situation is `walk`: consider `sun_hat` — owned → push into `accessories` (rendered under Baby clothing accessories as today) and skip the normal `thin_hat` at that temp band; missing → push into `missingHelpfulItems`.
- If outdoor `feelsLikeC >= 22` (warm enough to matter) OR `uvIndex >= 3`:
  - `ageMonths != null && ageMonths < 6`: push shade-first advice (three lines from spec).
  - Else: push sun-hat + shade + SPF 30+ advice.
- UV bands (only when `uvIndex` defined): 3–5 / 6–7 / 8+ add the corresponding line to `safetyAdvice`.
- If UV undefined, fall back to temperature-only trigger above.

### Home mode: activity + hot-room
- When `homeActivity === "sleeping"`, replace daytime layer logic with sleep-specific bands (using `roomTempC`, ignoring outdoor temp):
  - 18–20°C: `pajamas` + `sleep_sack_warm` (fallback to `sleep_sack_light`, else `pajamas` only).
  - 21–23°C: `pajamas` + `sleep_sack_light` (fallback: pajamas only).
  - 24–26°C: `short_sleeve_bodysuit`, no sleep sack.
  - ≥27°C: diaper only (no clothing rows; safety advice explains).
  - Newborn (`ageMonths != null && ageMonths < 4`) and owns `swaddle`: offer swaddle instead of sleep sack in the 18–23°C bands.
  - Missing sleep sack/swaddle → push to `missingHelpfulItems`, don't change today's outfit warmth.
- When `homeActivity === "playing"` (default), keep current daytime layering but apply hot-room overrides:
  - `roomTempC >= 28`: diaper only.
  - `roomTempC >= 26`: short-sleeve bodysuit only (or diaper only if `>= 27`).
  - `roomTempC >= 24`: base + optional light bottom; strip mid/outer.
- Add safety advice for warm rooms (≥26°C): "The room is very warm. Avoid extra blankets. Check baby's neck/chest for overheating."

### Reason text
- Home sleeping: "Room is ~X°C — sleep clothing chosen for that range."
- Home hot room: "Room is very warm — reduce layers to prevent overheating."
- Walk sun/UV lines added to reason only if a sun hat is used; otherwise they live in `safetyAdvice`.

## 4. Today screen

**`src/routes/_authenticated/today.tsx`**
- Add `homeActivity` state (default `"playing"`). When `situation === "home"`, render a Playing / Sleeping toggle above the room-temp slider.
- Pass `homeActivity`, `ageMonths`, and `weatherQ.data?.uvIndex` into `recommend()`.
- Rendering order inside the recommendation card:
  1. Baby clothing (existing block; empty when diaper-only — show a single "Diaper only" row instead).
  2. Accessories (existing).
  3. Sleep accessories (new, only when sleeping and non-empty).
  4. Transport extras (existing).
  5. Weather safety / Safety advice (new — renders `safetyAdvice` with ☀️ / 🌡️ prefixes as returned).
  6. Suggested for next time (existing).
- Diaper-only handling: recommend returns an empty `babyClothing` plus a synthetic row `{ slot: "base", slug: "diaper_only", label: "Diaper only" }` (special-cased in Row rendering — not a real wardrobe slug, so ownership check is skipped).

## 5. Out of scope
- No schema changes; feedback insert keeps the same shape (recommendation JSON is a superset).
- No new onboarding steps beyond the extra wardrobe tiles.
- No push notifications, no history for safety advice.

## Acceptance
- Warm walk (≥18°C) recommends a sun hat from wardrobe or as a suggestion.
- Babies <6 months get shade-first advice with no sunscreen line; ≥6 months get SPF 30+ line.
- UV bands render matching messages when Open-Meteo returns UV; missing UV falls back to temp-only trigger.
- Home mode asks Playing vs Sleeping; sleeping uses pajamas/sleep sacks, playing uses daytime clothes.
- Hot rooms strip layers (short-sleeve at ≥26°C, diaper only at ≥28°C) with safety advice.
- Missing sleep sacks/sun hats go to "Suggested for next time" without warming up today's outfit.
