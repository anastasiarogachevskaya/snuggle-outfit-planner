## What's wrong

The public routes render cleanly at 393px (no horizontal scroll confirmed via Playwright). The real mobile issue is **iOS Safari auto-zooming when a form field is focused**, because our inputs use `text-sm` (14px) and iOS zooms whenever an input's font-size is under 16px. Once zoomed in, iOS doesn't zoom back out, which reads as "the page zoomed and won't reset."

Affected inputs:
- `src/routes/auth.tsx` — email + password (`text-sm`)
- `src/routes/_authenticated/baby.tsx` — name, date, location (`.input` uses `.875rem`)
- Any future `<input>/<select>/<textarea>` in the app

Viewport meta is already correct (`width=device-width, initial-scale=1`, no `maximum-scale` — we keep it that way for accessibility; fixing font-size is the right remedy).

## Changes

**1. `src/styles.css` — global safety net**

Add one base rule so every form control renders at ≥16px on mobile (scoped to `max-width: 640px` so desktop keeps compact 14px look):

```css
@layer base {
  html, body { overflow-x: hidden; }         /* prevent any stray horizontal scroll */
  @media (max-width: 640px) {
    input, select, textarea { font-size: 16px; }
  }
}
```

**2. No component changes required** — the global rule covers `auth.tsx`, `baby.tsx`, and every future input without touching individual class strings. Range inputs (temperature slider) are unaffected visually.

## Verification

- Playwright at 393×698 already shows `scrollWidth === clientWidth` on `/`, `/auth`. After the change, re-run and confirm still no overflow.
- Manually: focusing the email field on iOS should no longer trigger the zoom-in animation.

## Not changing

- Viewport meta (`maximum-scale` / `user-scalable=no` would break accessibility).
- Any layout, spacing, or component structure — the audit shows current `max-w-md` + `px-6` + `flex-wrap`/grid patterns are already mobile-safe.
