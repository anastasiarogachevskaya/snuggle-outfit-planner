Apply the selected "Sage garden" color direction to the activity selector cards.

1. Update design tokens in `src/styles.css`:
   - Change `--activity` to a soft sage green (matches the selected card's light sage background, e.g. `#E8EFED` / `oklch(0.94 0.015 160)`).
   - Change `--activity-foreground` to a muted sage green for text on the selected background (e.g. `#4A675F` / `oklch(0.55 0.04 165)`).
   - Keep the existing `--primary` sage green for other UI elements; only the activity selector selected state changes.

2. Update `src/routes/_authenticated/today.tsx`:
   - Keep the existing three-card layout, emoji icons, labels, and descriptions.
   - For the selected card: apply `bg-activity` light sage background, `text-activity-foreground` dark sage text, and a subtle sage-tinted border.
   - For unselected cards: use a clean white/light surface background, soft border, and neutral text so the selected sage card stands out.
   - Adjust the shadow treatment to match the calm, soft aesthetic of the chosen direction.

3. Verify the build passes and the preview reflects the change on `/today`.
