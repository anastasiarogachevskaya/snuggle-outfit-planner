# Analytics funnel + onboarding conversion improvements

## Goal
Answer two questions from the user:
1. What else can be done to improve first-time user conversion?
2. How can we review analytics to see where users drop off?

## Current state
- The onboarding wardrobe route already offers Quick setup, Detailed setup, and Skip for now.
- Lovable project analytics shows pageviews, sources, and devices, but **does not track in-page events or funnel steps**.
- The top pages in the last 30 days are `/` (104 views), `/auth` (40), `/today` (35), `/try` (22), and `/baby` (22). Most traffic is from Finland on mobile.
- Without event-level data, drop-off points are guesses.

## Plan

### 1. Add lightweight, privacy-first event tracking
Create a small `events` table in the backend and a `logEvent()` helper in the web app.

Tracked events (funnel):
- `landing_try_clicked`, `landing_signin_clicked`
- `try_age_selected`, `try_location_granted`, `try_recommendation_viewed`, `try_feedback_submitted`
- `auth_started`, `auth_oauth_clicked`, `auth_email_submitted`, `auth_success`
- `onboarding_wardrobe_started`, `wardrobe_quick_chosen`, `wardrobe_detailed_chosen`, `wardrobe_skipped`, `wardrobe_saved`
- `wardrobe_step_viewed` (with step number) for the detailed 6-step flow
- `today_viewed`, `feedback_submitted`

Privacy:
- No third-party trackers.
- Events stored in the project's own database.
- Optional `user_id` only when the user is signed in; guests emit anonymous events.
- No PII in event metadata.

### 2. Build a simple funnel report
Add a protected admin/overview page (or a server function) that reads the events table and shows:
- Step-by-step conversion from landing → try/auth → baby profile → wardrobe completion → today/feedback.
- Drop-off percentage between each step.
- Mobile vs desktop split if useful.

This answers "how to see where users drop off" without needing an external analytics vendor.

### 3. Optimize onboarding conversion
Based on the data and existing UX, test or implement:

A. **Smart defaults for Quick setup**
   - Preselect wardrobe items based on the baby's age band (newborns get bodysuits/sleep sacks; toddlers get outerwear etc.).
   - This makes "Quick setup" truly one tap.

B. **Reduce perceived friction in Detailed setup**
   - Show a compact progress indicator and estimated time remaining.
   - Allow "Save these and finish later" on any step instead of only at the end.

C. **Re-engage users who skip wardrobe**
   - On the Today screen, show a friendly empty-state prompt if the wardrobe is bare, with a one-tap "Auto-fill basics" option.

D. **Demonstrate value before asking for wardrobe**
   - The `/try` guest flow already does this. Consider redirecting signed-up users through a short "See your first recommendation" screen before wardrobe setup.

## Out of scope for this plan
- External analytics vendors (Plausible, PostHog, etc.) — can be added later if the built-in funnel is not enough.
- Push notifications and localization — valuable, but separate from funnel measurement.

## Success criteria
- Events are recorded reliably for the listed funnel steps.
- The funnel report shows conversion percentages and the biggest drop-off step.
- At least one onboarding improvement (smart defaults or save-later) is shipped and measured against the baseline.
