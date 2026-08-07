# Shared help links across the app

Right now the "How it works", "FAQ", and guide links only exist on the landing page. Everyone else — guests using Try Layerly and signed-in parents on the Today screen — has no way to reach them.

## What changes

1. **One shared footer component** with the same set of links (Home, How it works, FAQ, Layering guide, Stroller guide, iOS, Android, Web app) plus the "Weather from Open-Meteo. No ads, no tracking." line.

2. **Show it on the app screens too:**
   - Today screen (guest and signed-in): keep the existing three-way action row (Wardrobe / Baby profile / secondary action) exactly as it is, and add the shared link footer underneath it.
   - Try Layerly screen: add the shared footer at the bottom.
   - Baby profile, Wardrobe, and Account screens: add the shared footer at the bottom.
   - Auth screen: add a compact version (How it works, FAQ only).

3. **Replace the duplicated footers** on the landing, FAQ, How it works, guide, and platform pages with the shared component so all pages stay in sync.

Styling stays exactly as today: small muted text, thin top divider, wrapping link row, mobile-first `max-w-md`.

## Technical notes

- New `src/components/site-footer.tsx` exporting `SiteFooter` with an optional `variant="compact"` prop; links use TanStack `<Link to=...>`.
- `src/components/today-screen.tsx` renders `<SiteFooter />` after the existing action row, so both `/try` and `/today` get it with one edit.
- Existing per-route `<footer>` blocks in `index.tsx`, `faq.tsx`, `how-it-works.tsx`, `guide.*.tsx`, `ios.tsx`, `android.tsx`, `web-app.tsx` are swapped for `<SiteFooter />`.
- No routing, data, or SEO metadata changes.
