# Compare footmuff and blanket in Layer up

## What changes

- Add a **Footmuff vs blanket** comparison directly above the transport-extra choices in **Layer up**.
- Show two equal-width panels on larger screens and a compact two-column layout on iPhone so both options remain easy to compare.
- Each panel shows:
  - the extra being compared;
  - the remaining warmth gap, such as **0.3 short** or **No gap**;
  - the clothing layers Layerly would still add or remove with that option;
  - the resulting verdict: **Too light**, **Just right**, or **Too warm**.
- Base both sides on the outfit currently selected in the picker. Every clothing change refreshes the comparison immediately.
- Highlight the option currently switched on, while keeping the comparison informational; tapping a comparison panel will select that transport extra and deselect the other.
- Use plain garment names and a compact `+ Add` / `− Remove` list. If no layer changes are needed, show **No layer changes**.

## Behaviour

- Compare two temporary copies of the current outfit: one with a blanket and one with a footmuff.
- Keep any other selected transport extras unchanged, but make blanket and footmuff mutually exclusive for this comparison.
- Use the existing warmth values and comparison rules, so the displayed verdict and layer changes match the live verdict above.
- Show the comparison only when both options make sense for the current trip; do not show it for Home, carrier, or car recommendations.
- Keep missing hats, socks, and mittens visible in each side’s layer-change list.

## Technical details

- Add a small comparison result helper in `src/lib/recommend/warmth.ts` that returns the existing `compareOutfits` result plus an absolute remaining warmth gap for a supplied transport extra.
- Add focused tests proving that the footmuff produces a smaller gap and fewer added layers than the blanket for the same selected outfit, and that the displayed result follows the verdict tolerance.
- Render a focused comparison component inside `src/components/today-screen/check-outfit-panel.tsx`, reusing Layerly’s existing surface, sage, clay, ink, and verdict styling.
- Verify the comparison at the current iPhone width and a tablet width, including long garment names, live updates, selection state, and no horizontal overflow.
