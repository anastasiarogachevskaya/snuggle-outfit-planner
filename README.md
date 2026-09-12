# Layerly

**What should my baby wear today?**

Layerly turns today's weather into a specific, layer-by-layer outfit for your baby — built from the clothes you actually own, not a generic chart. Tell it your baby's age and situation (home, walk, or car), and it reads the weather and tells you exactly what to put on.

🌐 [layerly.online](https://layerly.online) · 🍎 iOS app (currently in App Store review)

[![CI](https://github.com/anastasiarogachevskaya/snuggle-outfit-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/anastasiarogachevskaya/snuggle-outfit-planner/actions/workflows/ci.yml)

---

## What it does

- **Reads real weather** — temperature, wind, rain, and UV index from Open-Meteo for the parent's actual location (GPS or a typed city).
- **Knows the situation, not just the temperature** — a 60-minute stroller walk, a quick car ride, and a nap at home all call for different layers at the same outdoor temperature.
- **Only recommends what you own** — a wardrobe checklist means Layerly never tells you to grab a fleece overall you don't have, and names the actual item when it substitutes one for another.
- **Warns when weather shifts mid-walk** — if the forecast warms up enough by the time a walk ends to change what baby should be wearing, Layerly says so and names exactly what to take off.
- **Learns your baby** — a quick "too cold / just right / too warm" rating after the fact fine-tunes future recommendations for that specific baby.
- **Sleep guidance** — TOG-rated sleep sack suggestions matched to room temperature, not just a generic age chart.
- **Privacy-first** — no ads, no tracking, no third-party analytics. Sign in with Apple, Google, or email.
- **No account required to try it** — the guest flow at `/try` gives a full recommendation with a realistic sample wardrobe in under 20 seconds.

## Tech stack

- **[TanStack Start](https://tanstack.com/start)** (React 19, SSR) + **[TanStack Router](https://tanstack.com/router)**
- **Tailwind CSS v4** with a custom design system (Fraunces serif + Outfit sans, warm canvas/sage palette)
- **[Supabase](https://supabase.com)** (via Lovable Cloud) — Postgres, Auth (Apple/Google/email), row-level security
- **[Capacitor](https://capacitorjs.com)** — wraps this same web app as a native iOS shell (`ios-app/`); no separate native codebase
- **Bun** — package manager and test runner
- **Playwright** — end-to-end tests; **bun:test** — unit tests
- **[React Email](https://react.email)** — auth email templates (signup, magic link, recovery, invite, email change, reauthentication)

## Project structure

```
.
├── src/
│   ├── routes/              # File-based routes (TanStack Router) — pages, API routes, webhooks
│   │   └── _authenticated/  # Today screen, baby profile, wardrobe, account & data
│   ├── lib/
│   │   ├── recommend/       # The recommendation engine — layer picking, temperature bands, wardrobe mapping
│   │   ├── email-templates/ # React Email templates + shared brand tokens
│   │   └── weather.ts       # Open-Meteo integration, incl. hourly forecast lookups
│   ├── components/          # UI components (shadcn/radix-based)
│   └── integrations/        # Supabase client, auth middleware
├── supabase/
│   └── migrations/          # Postgres schema (babies, wardrobe_items, feedback) with RLS
├── ios-app/                 # Capacitor iOS wrapper — see ios-app/README.md
└── e2e/                     # Playwright end-to-end tests
```

## The recommendation engine

The core logic lives in [`src/lib/recommend/`](src/lib/recommend). It works in two stages:

1. **Pick layer *kinds***, not items — `pick-outdoor.ts` / `pick-home.ts` / `pick-sleep.ts` decide things like "mid: fleece, outer: none" from an effective temperature (adjusted for transport, walk duration, age, and situation), using temperature bands defined in `temperature.ts`.
2. **Map kinds to real wardrobe items** — `map-wardrobe.ts` turns "mid: fleece" into "your fleece overall," falling back to substitutes (a sweater instead, or a jacket + snow pants standing in for a winter overall) only when the exact item isn't owned, and always naming the real substitution.

This split is why the engine can reason about "the outfit for now vs. the outfit for when this walk ends" — it just runs the same pipeline twice at two temperatures and diffs the result.

## Getting started

**Prerequisites:** [Bun](https://bun.sh), a Supabase project (or use the one connected via Lovable Cloud).

```bash
bun install
bun run dev
```

`.env` is already committed with working Supabase values (the anon/publishable key — safe to expose client-side by design). No setup needed for local dev.

### Environment variables

| Variable | Used for |
| --- | --- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (client-side) |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, **not** in `.env` — used for account deletion (`src/lib/account.functions.ts`); configured in Lovable Cloud |
| `LOVABLE_API_KEY` | Server-only — auth email webhook (`src/routes/lovable/email/auth/webhook.ts`); configured in Lovable Cloud |

### Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run preview` | Preview a production build locally |
| `bun run test` | Unit tests (`bun:test`) |
| `bun run test:e2e` | End-to-end tests (Playwright) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun run format` | Prettier, write mode |
| `bun run check:capacitor` | Verifies root and `ios-app/` Capacitor packages share one major version |

## iOS app

`ios-app/` is a thin Capacitor wrapper — it loads the live site (`https://layerly.online`) inside a native shell rather than shipping its own bundle, so a web deploy reaches iOS users instantly with no App Store release needed for most changes. Native code is only touched for things a web deploy genuinely can't do: Sign in with Apple/Google, geolocation permissions, haptics, deep links.

See [`ios-app/README.md`](ios-app/README.md) for native setup, signing, and the location-permission test checklist.

## Deployment

The web app deploys automatically on push to `main` via Lovable Cloud. This repo pushes directly to `main` — no pull request workflow.

## Testing philosophy

The recommendation engine is the part of this app that most needs to be *correct*, not just "looks right" — a wrong layer recommendation is the actual product failing, not a cosmetic bug. It has the heaviest unit test coverage in the repo (`src/lib/recommend/__tests__/`), covering temperature-band edges, wardrobe substitution rules, and situation-specific safety behavior (e.g. never recommending a bulky outer layer under a car-seat harness).
