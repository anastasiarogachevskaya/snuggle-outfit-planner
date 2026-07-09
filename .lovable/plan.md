## Baby Dressing App — MVP Plan

Mobile-first app that answers "What should my baby wear right now?" using baby profile + live weather (Open-Meteo) + wardrobe + situation. Built in the "Soft Nordic Minimal" direction (canvas #FAF9F6, sage primary #7D8F69, clay accent #D48C70, Fraunces serif + Outfit sans).

### Stack

- TanStack Start + Tailwind v4 (existing template)
- Lovable Cloud (auth + Postgres) — email/password + Google sign-in
- Open-Meteo (no API key) via a server function
- Fonts via `@fontsource/fraunces` + `@fontsource/outfit`

### Auth & data model

- Email/password + Google + Apple. One profile per user (parent).
- Tables (all with GRANTs + RLS scoped to `auth.uid()`):
  - `profiles` — id (FK auth.users), display_name, created_at
  - `babies` — id, user_id, name, dob, temperature_pref (1–5), location_label, latitude, longitude
  - `wardrobe_items` — id, baby_id, slug (from a fixed catalog), owned bool
  - `feedback` — id, baby_id, situation, temp_c, feels_like_c, recommendation jsonb, rating ('comfortable'|'cold'|'warm'), created_at
- Trigger auto-creates `profiles` row on signup.

### Routes

```
/                     landing / marketing (public) — hero + CTA to /auth
/auth                 sign in / sign up (public)
/_authenticated/
  today               HOME — recommendation screen (default after login)
  baby                baby profile (name, dob, temp pref, location)
  wardrobe            checklist of owned items
```

### Today screen (hero)

Mirrors the chosen prototype exactly:

1. Header: location label + baby avatar/initial
2. Weather block: big serif temp, condition, feels-like (from Open-Meteo current + hourly)
3. White recommendation card: "Go with layers." + short reason + stacked layer list (base / mid / outer / accessories) — each row shows item name and a small "TOP/BTM/OUT" chip
4. Situation selector: Home / Walk / Car (sage-filled active state)
5. Contextual extras appear when relevant:
  - Home → room temperature slider
  - Walk → stroller/carrier toggle + duration (15 / 30 / 60+)
  - Car → trip duration
6. Feedback row: Too Cold / Just Right / Too Warm — one tap writes to `feedback`

### Recommendation engine (client-side, deterministic)

Pure function `recommend({ feelsLikeC, tempPref, situation, extras, ownedItems })`:

- Compute effective temp: `feelsLikeC - (tempPref - 3) * 1.5` (higher pref = feels colder to baby → dress warmer)
- Situation adjustment: Home uses room temp instead of outdoor; Car subtracts a small factor; Walk uses outdoor.
- Map effective temp to layer bands (>24, 20–24, 16–20, 12–16, 8–12, 4–8, <4°C) → base/mid/outer/hat/socks/mittens/blanket/footmuff picks.
- Filter picks to items the user owns; if a needed item is missing, flag it with a subtle "you don't own this yet" hint.
- Return `{ layers: [...], accessories: [...], reason: "Feels like 4°C with moderate wind." }`.

### Weather

- `getWeather.functions.ts` server fn: fetches Open-Meteo `current` + `hourly` for baby's lat/lon, returns `{ tempC, feelsLikeC, windKph, condition }`. Cached in TanStack Query (5-min stale).
- Location: GPS via `navigator.geolocation` on first setup, saved to `babies` row; user can edit.

### Onboarding

After first sign-in, if no baby row: guided 3-step setup (name+dob → temperature preference slider → location via GPS or search) → wardrobe checklist (pre-checked common items, uncheck what you don't own).

### Design system (styles.css)

Replace tokens with the chosen palette in oklch, add `--font-serif`/`--font-sans`, install @fontsource packages, keep shadcn semantic tokens intact.

### Out of scope (backlog)

Multiple babies, learning from feedback, custom items, sizes, notifications, additional contexts (sleep/daycare/etc.), UV/humidity, AI photo check, sharing.

### Technical notes

- Server fns in `src/lib/*.functions.ts`, protected ones under `_authenticated` loaders only.
- Public landing at `/` gets its own head() metadata; `__root.tsx` title updated from "Lovable App" to real app name (proposed: "Layer — What to dress baby in").
- Weekly weather planning, notifications, and analytics deferred.