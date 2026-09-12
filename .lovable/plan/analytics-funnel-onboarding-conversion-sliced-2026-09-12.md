# Analytics funnel + onboarding conversion (sliced)

## Goal
Measure where people drop off between landing and a saved wardrobe, then act on it. Built in slices so each one is shippable on its own.

## Current state (verified)
- `/onboarding/wardrobe` already offers Quick setup, Detailed setup, and Skip for now.
- No event tracking of any kind exists in the app.
- No admin or role concept exists — every signed-in user is just a parent.
- Tables today: `profiles`, `babies`, `wardrobe_items`, `feedback`.
- Last 30 days: 128 visitors, 104 views on `/`, 40 on `/auth`, 35 on `/today`, 22 on `/try`, 22 on `/baby`. Mostly Finland, mostly mobile. Traffic is small, so early percentages will be noisy — build now because it's cheap, don't over-read the first weeks.

---

## Slice 1 — Event storage and the tracking helper

New `app_events` table:
- `id`, `created_at`
- `name` (text, the event name)
- `user_id` (uuid, nullable — guests have none)
- `session_id` (text, a random id kept in the browser so a guest's steps can be stitched together)
- `props` (jsonb, small metadata only, no personal data)
- `platform` (text: `web` or `ios`)

Access rules:
- Insert allowed for both signed-out and signed-in visitors, because the funnel starts before sign-up.
- Reading is not granted to `anon` or `authenticated` at all — reports are read server-side only.
- Abuse guard: the helper caps `props` to a small size and drops anything oversized, and a database check constrains `name` to a known list. Given current traffic this is enough; no rate limiting service.

Client helper `logEvent(name, props?)`:
- Fire-and-forget, never blocks or breaks the UI if it fails.
- Adds session id and platform automatically.
- No-ops during server rendering.

Deliverable: table exists, helper exists, one smoke event fires from the landing page.

---

## Slice 2 — Instrument the funnel

Call sites, using routes that already exist:

Landing (`/`)
- `landing_viewed`, `landing_try_clicked`, `landing_signin_clicked`

Guest flow (`/try`)
- `try_age_selected` (props: age band)
- `try_location_set` (props: `gps` or `city`)
- `try_recommendation_viewed`
- `try_feedback_submitted` (props: rating)
- `try_create_account_clicked`

Auth (`/auth`) — recorded per path, not generically
- `auth_signin_attempt` / `auth_signup_attempt` with props `{ method: "email" | "google" | "apple", surface: "web" | "native" }`
- `auth_cancelled` (native browser dismissed)
- `auth_failed` (props: method, surface — error type only, never the message)
- `auth_succeeded` (props: method, surface)

Onboarding (`/onboarding/wardrobe`)
- `wardrobe_chooser_viewed`
- `wardrobe_mode_chosen` (props: quick / detailed / skip)
- `wardrobe_step_viewed` (props: step number) for the detailed flow
- `wardrobe_saved` (props: item count, mode)

Signed-in app
- `today_viewed`, `today_feedback_submitted`

Deliverable: every step above emits an event in both the web and iOS builds.

---

## Slice 3 — Owner-only funnel report

A report page that only the app owner can open.

Authorization: gated on a single owner user id held as a server-side setting, checked inside the server function that returns the report — not just "signed in". No roles table, no RBAC; this is a one-person dashboard.

The page shows, for a chosen date range:
- Counts at each funnel step and the percentage that carried over from the previous step.
- The biggest drop-off, called out plainly.
- Sign-in breakdown by method and surface (native Apple / native Google / web / email), including cancels and failures.
- Wardrobe outcome split: quick vs detailed vs skipped, and completion rate for the detailed flow.

Anyone who is not the owner gets a plain "not found" — no hint the page exists.

Deliverable: one page answering "where do people drop off?" without an external analytics vendor.

---

## Slice 4 — Smart defaults for Quick setup

Preselect wardrobe items based on the baby's age instead of one fixed list:
- Newborn / young infant: bodysuits, sleepsuits, sleep sacks, swaddle, thin hat, socks.
- Older infant: adds leggings, mid layers, outerwear, booties.
- Toddler: adds proper outerwear, boots, mittens, rain gear.

Quick setup becomes genuinely one tap for most people. Cheap and sensible regardless of what the funnel later shows.

Deliverable: age-aware preselection, with the existing tap-to-adjust behaviour unchanged.

---

## Deliberately not doing yet
- Progress indicator / "save and finish later" in the 6-step detailed flow.
- "Auto-fill basics" empty state on Today.

Both are real UX work but speculative until the funnel shows detailed-setup abandonment is actually the problem. Revisit once Slice 3 has data.

Also out of scope: external analytics vendors, push notifications, localization.

---

## Technical notes
- Table created via migration with grants and row-level security set in the same migration; insert policy open to `anon` and `authenticated`, no select policy for either.
- Event name validated by a database check constraint against the known list, so unexpected names are rejected at the source.
- `logEvent` writes through the browser client and swallows all errors.
- The report reads through a privileged server function; the owner check happens inside the handler before any query runs.
- Owner id supplied as a server-side environment value so it isn't baked into client code.

## Success criteria
- Events land reliably for every listed step on web and iOS.
- The report names the biggest drop-off step and breaks sign-ins down by method and surface.
- Quick setup preselects sensibly for a newborn, an older infant, and a toddler.
