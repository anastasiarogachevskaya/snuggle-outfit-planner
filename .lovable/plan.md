Add a "Support Layerly" support row to the Baby Profile screen.

Changes:
- Add a `HeartIcon` SVG to `src/components/icons/index.tsx` in the existing Nordic-minimal style (24x24, 1.75 stroke, rounded caps).
- Update `src/routes/_authenticated/baby.tsx` to insert a new `SupportLayerly` row directly below the Settings row.
- The row will reuse the existing `NavCard` pattern (same spacing, typography, circular icon background, chevron) and link to `https://buymeacoffee.com/nastasija` using a standard `<a>` with `target="_blank"` and `rel="noopener noreferrer"` so it opens in the system browser.
- The row will be optional, non-intrusive, and appear only after a baby profile exists (same condition as the Wardrobe/Settings rows).

Acceptance criteria:
- "Support Layerly" appears directly below "Settings".
- The row visually matches the existing Wardrobe and Settings rows.
- Tapping it opens `https://buymeacoffee.com/nastasija` in the system browser.
- No donation prompts or popups are shown automatically.
- Supporting remains completely optional.