# Fix insights page styling

## Changes
- Clamp funnel percentages to the card width so later steps can never overflow when their counts exceed the first step.
- Replace the page’s raw range buttons with the existing button component and semantic border colors.
- Keep labels and counts constrained within the mobile layout.

## Validation
- Check the insights page at phone and desktop widths.
- Confirm the latest app build completes without errors.
