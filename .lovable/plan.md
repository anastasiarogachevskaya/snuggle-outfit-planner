Replace the Walk activity icon with a Nordic-minimal outdoor/nature icon.

## Proposed icon directions
Choose one SVG concept for the Walk activity card:

1. **Simple tree** — rounded evergreen / lollipop tree with a short trunk and 2–3 soft tiers.
2. **Tree + path** — a small tree plus a gentle curved path line to suggest "going outside".
3. **Tree + sun** — a small tree with a tiny radiating sun, keeping the outdoor idea readable.

All options stay within the existing icon system: 24×24 viewBox, 1.75px stroke, `currentColor`, rounded caps/joins, no fill.

## Implementation
1. **Update `src/components/icons/index.tsx`** — replace the `WalkIcon` SVG with the chosen outdoor icon. Keep the same component signature (`IconProps`) so the existing `today.tsx` import and sizing work unchanged.
2. **Visual check** — verify the icon renders clearly inside the activity selector cards at both selected (dark green) and unselected (muted/white) states.
3. **Build check** — run `bun run build` to confirm no TypeScript/JSX errors from the SVG path changes.

No other files need to change; the activity label stays "Walk" unless you also want to rename it to "Outside" or "Outdoors".

Which icon direction do you prefer — 1, 2, or 3?