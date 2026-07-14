## Reorder Today screen

Rework `src/routes/_authenticated/today.tsx` so activity context comes before the outfit result.

### New section order
1. Header (location + avatar) — unchanged
2. Compact weather summary
3. Today's activity (renamed from "Where are you headed?")
4. Activity details (Home / Walk / Car — only relevant controls)
5. Today's recommendation (hero card)
6. How is baby feeling? (feedback)
7. Footer nav — unchanged

### Changes

**Weather (compact)**
- Shrink from `text-6xl` italic temperature to a single-line row: e.g. `18° · Feels like 17° · Mostly clear`.
- Use `text-2xl` for the temp, muted body text for condition/feels-like. Keep it as a small block, not a hero.

**Today's activity**
- Move the current Situation grid + Situation extras block up, directly under the weather.
- Rename the section label "Where are you headed?" → "Today's activity".
- Keep the existing Home (Play/Sleep + room temp slider), Walk (transport + duration), Car (duration) conditionals as they are — they already show only relevant controls.

**Recommendation (hero)**
- Move the existing recommendation `<section>` to sit AFTER the activity details.
- Keep it as the visually dominant card (rounded-[32px], large serif headline, full contents: baby clothing, transport extras, sleep accessories, weather safety, suggested for next time).
- No logic changes — `useMemo` already recomputes on activity/detail changes, so it updates immediately.

**Feedback**
- Stays directly below the recommendation (already the case after reorder).

### Out of scope (not requested, skipping)
- Collapsing selected activity into a "Walk • Stroller • 30 min" summary chip with expand/edit — the task lists it as "consider", and it adds new state/UI. Happy to add in a follow-up if you want it.

### Files touched
- `src/routes/_authenticated/today.tsx` — reorder JSX sections, compact weather markup, rename label. No changes to recommendation logic, queries, or other routes.
