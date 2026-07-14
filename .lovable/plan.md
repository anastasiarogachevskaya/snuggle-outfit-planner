## Plan: Make the activity section look better

### Goal
Redesign the activity selector (Home / Walk / Car) on the Today screen so it feels more intentional, warm, and tactile, while keeping the rest of the screen unchanged.

### Locked design choices
- **Palette**: Warm Clay — terracotta/sand accents against the existing Soft Nordic cream/canvas base.
- **Typography**: Elegant serif — the "Today's activity" label stays in Fraunces (`font-serif`), card labels in Outfit (`font-sans`).
- **Layout**: Three cards — Home, Walk, and Car as three equal cards with icon + label.

### Changes

**1. Activity selector as three cards**
- Replace the current three plain grid buttons with three card buttons.
- Each card shows:
  - Top: emoji icon (🏠, 🚶, 🚗)
  - Middle: label (Home / Walk / Car)
  - Optional: one-line descriptor (Indoors / Outside / In the car)
- Selected card:
  - Warm clay background using a semantic token (reuse existing `--accent` or add a new terracotta token).
  - White/primary-foreground text.
  - Soft elevated shadow.
  - `rounded-2xl`.
- Unselected card:
  - Surface background, subtle border, muted ink text.
  - Hover: light canvas tint.

**2. Section label and spacing**
- Keep "Today's activity" as a small uppercase serif label.
- Add more breathing room below the label so the cards sit cleanly.
- Leave the compact weather summary above it untouched.

**3. Activity details block**
- Keep the existing Home / Walk / Car conditional controls.
- Ensure the details block reads as a child of the selected activity by tightening its top margin and keeping its rounded surface card style.

**4. Tokens**
- Add any new warm-clay color to `src/styles.css` as a semantic token if the existing `--accent` is too light/saturated.
- No hardcoded hex values in the component; everything references CSS variables.

### Files touched
- `src/routes/_authenticated/today.tsx` — activity selector markup and selected states.
- `src/styles.css` — only if a new semantic token is needed.

### Out of scope
- Recommendation logic, weather fetching, feedback, or other routes stay as-is.
- No new state or interactions beyond the existing `situation` selector.
