# Local-first setup on iPhone — no email, no password

Anyone who installs the app gets a full setup on the device: baby name, date of birth, location, and wardrobe. No sign-up asked for. Everything is kept on the iPhone until they choose to create an account.

## Setup flow (iPhone only)

```text
Get Started
   |
1. Baby        name + date of birth (same date picker as on the website)
   |
2. Location    use my location  /  search a city  /  skip
   |
3. Wardrobe    Quick setup  /  Detailed setup  /  Skip for now
   |
Today          full recommendation, ready to use
```

Returning users skip straight to Today. Anyone part-way through resumes at the step they left off. The website keeps its current quick "age band" trial — nothing there changes.

## Baby step

Name field plus the same calendar date picker used on the signed-in profile page, so the age is exact instead of a rough band. A baby older than a year is accepted; the recommendation still uses the same rules as today.

## Wardrobe step

Both options from the website:

- Quick setup: one screen, common items already ticked, tap to adjust.
- Detailed setup: the same six category screens with the progress bar.
- Skip for now: a sensible starter set is used and can be edited any time.

## Profile page

The local profile page keeps the same links as the signed-in one: Baby profile, Wardrobe, and one new entry — **Create an account**. That page explains in one short paragraph that an account backs the data up and makes it available on other devices, with a Create account button. Nothing else on it.

Creating an account carries over the name, birthday, location and wardrobe automatically, then clears the local copy — same as the existing hand-over does today.

## What stays local

Baby profile, wardrobe, room temperature and comfort ratings live only on the iPhone. Deleting the app removes them. This is spelled out under the setup steps and on the Create an account page.

## Technical notes

- `src/lib/guest-profile.ts`: add an `onboardingStep` marker and an explicit `dob` set by the picker; keep `ageBand` optional for the web trial and existing stored profiles. Wardrobe stays the stored `WardrobeSlug[]`.
- `src/routes/try.tsx`: when `isIOSApp()` is true, replace the age-band step with a baby step (name + shadcn date picker, `pointer-events-auto` on the calendar) and insert a wardrobe step before Today. The web branch is untouched.
- Extract the quick/detailed wardrobe UI out of `src/routes/_authenticated/onboarding.wardrobe.tsx` into a shared component that takes `owned` + `onSave`, so the local flow and the signed-in onboarding stay identical; the authenticated route keeps its Supabase write.
- Add a local "Create an account" screen in the same local step machine as `LocalProfile`/`LocalWardrobe`, reachable from the local profile page; its button navigates to `/auth`.
- The existing guest→account seeding in `src/routes/_authenticated/today.tsx` already reads name, dob, location and wardrobe, so no change is needed there.
- Analytics: log the new local setup steps through the existing `logEvent` so the funnel on `/insights` shows iPhone setup drop-off.
