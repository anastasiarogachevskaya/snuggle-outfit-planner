# Layer up: a real outfit picker with a live weather check

Today, "Layer up" is a list of chips plus a "Check outfit" button that gives one verdict line. The new version turns it into a picker that reacts as you choose: every tap updates a live verdict against today's weather.

## What changes for a parent

- Open **Layer up** and see today's temperature, feels-like and wind right at the top of the panel.
- A **live verdict card** sits under it: while nothing is picked it invites you to start; as soon as you choose your first garment it shows "Too light", "Just right" or "Too warm" with one short line of reasoning (wind, how long you're out, baby's age).
- Pick one item per layer — bodysuit, sleepsuit/romper, bottoms, mid layer, outer layer, hat, socks — from horizontally scrolling chip rows showing only clothes you own.
- Accessories (hat, mittens, snow pants) and transport extras (footmuff, rain cover) become clear two-column toggle cards.
- The verdict updates instantly on every tap, with a gentle transition — no button to press.
- Layers that need changing are still marked directly: the chip to drop is outlined in clay, the one to add is outlined in sage.
- A closing **"Done"** action returns to the recommendation.

## Visual direction

Following the selected prototype, inside the existing Layer up card:

- Weather row at the top: large temperature, small "Feels like · wind" line in clay.
- Rounded sage verdict card with a soft shadow, a small "Live" pulse dot, verdict headline and one supporting sentence. Card colour shifts with the verdict — sage for just right, a cool tone for too light, clay for too warm.
- Slot labels: tiny uppercase, wide-tracked, clay.
- Chips: generous rounded pills, white with a light border; selected chips get a sage border, sage text and a subtle shadow.
- Toggle cards: white rounded tiles with a small switch, sage-tinted when on.
- All colours come from the existing Layerly tokens (sage, clay, canvas, ink) — no new palette.

## Technical notes

- Scope is `src/components/today-screen/check-outfit-panel.tsx`; the warmth model in `src/lib/recommend/warmth.ts` and the recommendation engine stay unchanged.
- Replace the `result` state + `checkOutfit` handler with a `useMemo` over `compareOutfits(idealOutfitFrom(rec), actual)`, gated on "has the parent picked anything yet" so an empty outfit doesn't read as "too cold".
- Pass the weather (temp, feels-like, wind, condition) into `CheckOutfitPanel` from `today-screen/index.tsx`, which already holds `weatherQ.data`.
- Fire a haptic only when the verdict *changes* (success on entering "just right", warning on leaving it), tracked with a previous-verdict ref, so continuous picking doesn't buzz on every tap.
- Verdict transitions use CSS transitions with a `prefers-reduced-motion` fallback.
- Slot rows switch to horizontal scroll with hidden scrollbars; keep `aria-pressed` on chips and add an `aria-live="polite"` region on the verdict text.
- Existing tests for `warmth.ts` keep passing; verify at 393px and on a tablet width with Playwright.
