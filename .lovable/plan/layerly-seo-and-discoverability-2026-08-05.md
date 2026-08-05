# Layerly SEO and discoverability

Metadata already exists on every public route (title, description, canonical, og/twitter). The real gaps are: crawlers see an almost-empty landing page, there is no sitemap or robots.txt, no structured data, and no content pages to rank for the target searches.

## 1. Make the landing page crawlable (highest impact)

Today the landing page renders an empty screen until a browser-only session check finishes, so search engines see almost nothing. Fix: render the full marketing page immediately for everyone, and redirect signed-in visitors only after hydration.

## 2. Landing page content

Rewrite `/` as a real marketing page with visible HTML text, mobile-first and in the existing sage/clay style:

- Hero with one H1: "What should my baby wear today?" plus the Layerly promise
- Sample recommendation card (kept)
- How Layerly works — 3 steps (weather, baby age, your wardrobe)
- Why Layerly — no overdressing/underdressing, uses clothes you own, no ads or tracking
- Features — home/walk/car situations, sleep and TOG sleep sacks, stroller/carrier extras, UV and rain safety, feedback learning
- Who is it for — new parents, daycare mornings, stroller walks, travel
- FAQ — 6 questions (what should my baby wear today, how it works, location use, no-account use, own wardrobe, TOG sleep sacks)
- Footer with links to Try, Sign in, platform pages, support link

Titles/descriptions updated to the requested wording: "Layerly – Baby Outfit Recommendations Based on Weather".

## 3. New content pages

Public, indexable, each with its own metadata, H1 and real text:

- `/guide/baby-layering` — layering guide by temperature band (targets "baby layering guide", "how to dress baby for weather")
- `/guide/stroller-walks` — dressing for pram, stroller and carrier walks (targets "stroller clothing guide")
- `/ios`, `/android`, `/web-app` — app availability pages (iOS via TestFlight/App Store status, Android as web app, web app install instructions)

Guide content is written from the app's own recommendation rules so it stays truthful.

## 4. Structured data

- `SoftwareApplication` JSON-LD in the root (name, description, category, operating systems, URL, logo, offers: free)
- `FAQPage` JSON-LD on the landing page matching the visible FAQ
- `BreadcrumbList` on guide pages

## 5. Sitemap and robots

- `src/routes/sitemap[.]xml.ts` server route listing all public pages (`/`, `/try`, `/auth`, guides, platform pages); auth-only and noindex routes excluded
- `public/robots.txt` allowing all crawlers and referencing `https://layerly.online/sitemap.xml`

## 6. Icons and manifest

- Add `favicon.ico`, `mask-icon.svg` and Android icon links; keep existing PNG icons and apple-touch-icon
- Manifest: keep name/short name/theme color, add the icon set and a `purpose: "any"` entry alongside maskable

## 7. Semantic HTML and accessibility

Convert the new and existing public pages to `header` / `main` / `section` / `footer`, exactly one H1 per page, descriptive link text, alt text on any images, and correct heading order — targeting Lighthouse SEO 100 and Accessibility 100.

## 8. Social sharing

Keep the existing og:image on leaf routes; verify each new page carries title, description, og:image and twitter card.

## Technical notes

- Routes use TanStack `head()`; canonical stays on leaf routes only, `og:image` never on `__root`
- Sitemap uses the server-route pattern (no static file, no Vite sitemap plugin)
- No backend or recommendation-engine changes
- Verification: build, then check `/sitemap.xml`, `/robots.txt`, and rendered HTML of `/` in the preview to confirm the marketing copy is in the server-rendered source

## Out of scope

Ranking itself takes time after indexing. Submitting the sitemap in Google Search Console is a manual step I'll walk you through once this ships.
