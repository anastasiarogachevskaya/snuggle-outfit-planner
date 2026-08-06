# Landing page: strip the explanation and sell the idea

## Goal

Turn `/` into a confident, single-purpose landing page that sells the value of Layerly in one glance and points visitors straight to "Try it" or "Sign in". Move all the "how it works" / "features" / FAQ content to dedicated guide pages so it still ranks, but the landing page is no longer a wall of text.

## Why

The current landing page tries to explain everything (How it works, Why, Features, Who is it for, FAQ, Guides). It reads like a product manual rather than a first impression. The user wants the landing page to be minimal and persuasive, with the details living in the existing guide pages.

## What to do

### 1. Strip the landing page to one screen

Replace the current `src/routes/index.tsx` content with a compact marketing screen:

- Header: Layerly wordmark + "Sign in" link
- Hero: one H1 "What should my baby wear today?" and a one-line promise
- A single example recommendation card (kept, but cleaner)
- Primary CTA: "Try Layerly — no account needed"
- Secondary CTA: "I already have an account"
- One short trust line, e.g. "No ads. No tracking. Uses the clothes you already own."
- Minimal footer: Try, Sign in, Guides (Layering, Stroller), iOS, Android, Web app

Remove from the landing page:
- How Layerly works
- Why Layerly
- Features
- Who is it for
- FAQ
- Guide list

### 2. Move FAQ content to a dedicated /faq page

Create `src/routes/faq.tsx` using the same FAQ array currently in `src/routes/index.tsx`. Give it its own SEO metadata, H1, semantic sections, and `FAQPage` JSON-LD. Add it to the sitemap.

### 3. Keep the guides

`/guide/baby-layering` and `/guide/stroller-walks` stay as-is. Optionally add a short "How Layerly works" section to `/guide/baby-layering` since it already targets users looking for how to dress a baby for weather.

### 4. Preserve SEO

- Keep unique title, description, canonical, og/twitter tags on `/`
- Keep the `SoftwareApplication` JSON-LD in `__root`
- Move the `FAQPage` JSON-LD from `/` to `/faq`
- Add `/faq` to `PUBLIC_ROUTES` in `src/lib/seo.ts` and the sitemap route

### 5. Visual style

Keep the existing Soft Nordic Minimal palette and typography (Fraunces + Outfit, sage/clay, rounded corners). No new color system. Just cleaner spacing, larger hero, and fewer sections.

### 6. Post-login redirect

Keep the existing `useEffect` that redirects signed-in users to `/today`. The marketing page remains server-renderable for crawlers.

## Out of scope

- No new backend changes
- No recommendation engine changes
- No new app platform content
- No color/brand redesign beyond the existing palette
- No animation beyond what already exists in the codebase

## Verification

- Build passes
- `/` source HTML contains the hero text and CTA, but no FAQ section
- `/faq` source HTML contains the full FAQ and JSON-LD
- Sitemap includes `/faq`
- Lighthouse SEO still scores 100 for both pages
