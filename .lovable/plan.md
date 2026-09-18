# Layerly blog

A public blog at `/blog` where each release gets its own post. Posts are written in code (you ask, I write), so there is no editor screen and nothing new in the database. Each post is a real page with its own title, description and social preview, so search engines can index it.

## Pages

- `/blog` — post list, newest first: title, date, one-line summary.
- `/blog/<slug>` — the post itself: title, date, body, a link back to the list, and a "Try Layerly" call to action at the end.
- Both pages use the existing sage/clay style, `max-w-md` mobile-first layout, and the shared footer.
- "Blog" is added to the shared footer links and to the sitemap (each post included with its publish date).

## Retroactive posts I'd write

Dated from the project history, ~300–400 words each, written as "what changed and why", with no invented numbers or dates beyond what the project record shows.

1. **3 Aug — Try Layerly without an account.** Why the first screen shouldn't ask for an email: pick an age band, share a location, get a full outfit.
2. **4 Aug — Type your city, get the weather.** Live city suggestions for parents who don't want to share GPS.
3. **5 Aug — Layerly goes public: what should my baby wear today?** The launch post: the problem (over- and under-dressing), how the recommendation is built from weather, age, situation and your own wardrobe. Also the first guides — layering by temperature, and stroller walks.
4. **6–7 Aug — A clearer front page and help on every screen.** The rewritten landing page plus How it works, FAQ and guides reachable from everywhere.
5. **9 Aug — Testing the advice behind the advice.** Regression tests over the temperature bands, so a change to one band can't quietly break another.
6. **11 Aug — Layerly on the iPhone.** The native app: full-screen layout, safe areas, real location permission prompts.
7. **24 Aug — Fixing "Locating…" that never finished.** The GPS watchdog, a diagnostics screen, and forcing a fresh fix instead of a stale one.
8. **1 Sep — Sign-in that actually works on a phone.** Apple and Google sign-in done natively, plus fixed confirmation emails.
9. **12 Sep — Knowing where parents get stuck (without tracking them).** What Layerly measures, what it deliberately doesn't (no ads, no third-party trackers, no IP or fingerprinting), 90-day deletion and the privacy page.
10. **15 Sep — Set up on the iPhone without an email or password.** The local-first setup: baby, location, wardrobe stored on the device; create an account later and everything, including comfort ratings, comes across.
11. **17 Sep — "Layer up": build your own outfit.** The renamed, restyled button for checking or composing an outfit yourself.

If a post feels too thin or too internal (5 and 7 are the candidates), say so and I'll merge or drop it.

## Technical notes

- `src/lib/blog.ts` holds the post list: slug, title, date, summary, and body as structured sections (heading + paragraphs) so the styling stays consistent.
- `src/routes/blog.index.tsx` and `src/routes/blog.$slug.tsx`; the post route throws `notFound()` for an unknown slug and renders a not-found page.
- Metadata via the existing `pageMeta` helper, `og:type: "article"`, plus `BlogPosting` JSON-LD on each post and `breadcrumbLd` (Home → Blog → post).
- `PUBLIC_ROUTES` in `src/lib/seo.ts` gains `/blog` and every post path, so `sitemap.xml` picks them up.
- `SiteFooter` gains a Blog link; the iOS build keeps it (no third-party platform references involved).
- No database, no backend changes, no analytics events.
