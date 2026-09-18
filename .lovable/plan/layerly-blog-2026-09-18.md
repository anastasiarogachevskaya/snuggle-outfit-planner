# Layerly blog

A public blog at `/blog` where each release gets its own post. Posts are written in code (you ask, I write), so there is no editor screen and nothing new in the database. Each post is a real page with its own title, description and social preview, so search engines can index it.

## Pages

- `/blog` — post list, newest first: title, date, one-line summary.
- `/blog/<slug>` — the post itself: title, date, body, a link back to the list, and a "Try Layerly" call to action at the end.
- Both pages use the existing sage/clay style, `max-w-md` mobile-first layout, and the shared footer.
- "Blog" is added to the shared footer links and to the sitemap (each post included with its publish date).

## Retroactive posts I'd write

Each post is a product milestone told from a parent's point of view — what became possible and why it matters — not a changelog. ~300–400 words each, no invented numbers.

1. **3 Aug — Layerly is live: what should my baby wear today?** The launch post. The daily guesswork of over- and under-dressing, and the idea behind Layerly: today's weather plus your baby's age plus the clothes you actually own, turned into one clear outfit.
2. **5 Aug — Try it before you sign up.** You can get a full recommendation without an account or an email — pick an age, share a location or type a city, and see the outfit.
3. **7 Aug — Dressing guides for real situations.** The layering guide by temperature and the stroller-walk guide, plus plain answers to the questions parents kept asking.
4. **11 Aug — Your wardrobe, not a catalogue.** Layerly only suggests clothes you have ticked as owned, so the outfit is one you can actually put on.
5. **24 Aug — Advice that arrives before you leave.** Getting the weather fast and reliably, so the morning answer is there in seconds instead of spinning.
6. **1 Sep — One tap to sign in.** Continue with Apple or Google, so nothing stands between you and your baby's profile.
7. **12 Sep — Private by design.** No ads, no third-party trackers, no selling data — what Layerly stores, why, and how long it keeps it.
8. **15 Sep — Layerly is on the App Store.** The iPhone app launch: made for one-handed use on the way out the door, and you can set it up with no email and no password — baby, location and wardrobe live on your phone, and move with you if you create an account later.
9. **17 Sep — Build your own outfit.** Layer up lets you put together what your baby is actually wearing and see whether it suits today.


Tell me if any milestone is missing, or if you'd rather merge a couple so the blog reads as fewer, bigger moments.


## Technical notes

- `src/lib/blog.ts` holds the post list: slug, title, date, summary, and body as structured sections (heading + paragraphs) so the styling stays consistent.
- `src/routes/blog.index.tsx` and `src/routes/blog.$slug.tsx`; the post route throws `notFound()` for an unknown slug and renders a not-found page.
- Metadata via the existing `pageMeta` helper, `og:type: "article"`, plus `BlogPosting` JSON-LD on each post and `breadcrumbLd` (Home → Blog → post).
- `PUBLIC_ROUTES` in `src/lib/seo.ts` gains `/blog` and every post path, so `sitemap.xml` picks them up.
- `SiteFooter` gains a Blog link; the iOS build keeps it (no third-party platform references involved).
- No database, no backend changes, no analytics events.
