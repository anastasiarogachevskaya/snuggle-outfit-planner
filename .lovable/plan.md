# Try Layerly — guest mode (no registration)

Let anyone get a real outfit recommendation in two taps: pick baby's age, allow (or skip) location. Accounts are only asked for when saving is involved.

## Flow

```text
/            Landing: [ Try Layerly ]  (primary)
             "Already have an account? Sign in"  (secondary)
   |
/try         "How old is your baby?" — 5 tap options, Continue
   |
/try/location  Use my location  /  Choose a city manually  /  Skip for now
   |
/try/today   Full recommendation screen (Home/Walk/Car, Play/Sleep,
             transport, duration, weather, explanation)
```

Signed-in users hitting `/` still go straight to `/today`. Guests who land on `/try/today` without a guest profile are sent back to `/try`.

## Guest profile

Stored in `localStorage` (`layerly:guest`), no database writes:
- name `Baby`, warmth preference `3`
- date of birth derived from the chosen age band (midpoint of the range)
- location: coords + label, when granted or chosen
- default wardrobe: short/long-sleeve bodysuit, pants, sweater, cotton socks, thin hat, warm hat, fleece overall, winter overall, stroller, blanket, pajamas. Nothing specialized (no footmuff, rain cover, babywearing cover, wool layers, balaclava, rain overall).
- Home room temperature is remembered per guest, same as for signed-in users.
- "1+ years" is shown but disabled with a "Coming soon" tag.

## Registration prompts

A shared sheet with the copy from the brief and the buttons **Create account** / **Maybe later**, triggered only when a guest tries to:
- edit the wardrobe
- rate a recommendation
- edit the baby profile

"Create account" goes to `/auth`; on successful sign-up the guest's age, location and default wardrobe are used to seed the new baby profile so nothing is retyped. "Maybe later" just closes the sheet and leaves the recommendation usable.

## Guest limits

No saved wardrobe, profile, history, feedback or cross-device sync. Everything else works identically.

## Technical notes

- Extract the Today screen body from `src/routes/_authenticated/today.tsx` into a shared `src/components/today-screen.tsx` that takes baby data, owned wardrobe set and callbacks (`onFeedback`, profile/wardrobe links) as props. The authenticated route keeps its Supabase queries; the guest route feeds the same component from localStorage. No change to `src/lib/recommend/*`.
- New public routes: `src/routes/try.tsx` (layout `<Outlet />`), `try.index.tsx` (age), `try.location.tsx`, `try.today.tsx`, each with its own `head()` metadata (age/location steps `noindex`).
- New `src/lib/guest-profile.ts`: read/write/clear guest state, age-band → dob mapping, default wardrobe slug list, and a `useGuestProfile()` hook that is hydration-safe (read in `useEffect`).
- Location reuses the existing `src/lib/location-service.ts` (Capacitor on native, browser geolocation on web); permission is requested only on tap, with the existing denied/timeout fallbacks plus manual city entry.
- New `src/components/save-prompt-sheet.tsx` for the three registration prompts.
- After sign-up, `src/routes/auth-callback.tsx` / the post-auth path seeds the new baby from the stored guest profile, then clears `layerly:guest`.
- `src/routes/index.tsx` rewritten to the new launch screen; existing authenticated routes, RLS, MCP tools and iOS wrapper untouched.
