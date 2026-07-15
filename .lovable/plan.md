## Goal
Turn the feedback prompt into a rich data-collection surface that stores full recommendation context for future learning — without changing recommendation logic yet.

## 1. Database (migration)
Extend `public.feedback` with columns to capture full context. Keep existing rows valid (all new columns nullable):
- `baby_age_months` int
- `activity` text (mirrors `situation`, kept for clarity; keep existing `situation` too)
- `home_activity` text ('playing' | 'sleeping')
- `transport_mode` text ('pram' | 'sitting-stroller' | 'carrier')
- `duration_min` int
- `room_temp_c` double precision
- `weather_condition` text
- `uv_index` double precision
- `wind_kph` double precision
- `temperature_pref` int (baby's warmth pref at time of feedback)
- `recommended_clothing` jsonb (subset of recommendation)
- `recommended_transport_extras` jsonb
- `feedback_details` jsonb (reserved for future follow-ups: `{ areas: ['head','body','legs','feet','not_sure'] }`)

Existing `rating` column keeps values `comfortable | cold | warm`. Existing `recommendation` jsonb stays as full snapshot.

RLS/GRANTs unchanged (already scoped by baby ownership).

## 2. UI changes in `src/routes/_authenticated/today.tsx`
- Rename section heading from "How is {name} feeling?" to **"How was today's outfit?"** with subcopy "Your feedback helps Layerly learn what works for {name}."
- Keep the three buttons: 🥶 Too cold · 😊 Just right · 🥵 Too warm.
- On submit, insert into `feedback` with all new context fields populated from current state (`baby`, `weather`, `rec`, `situation`, `homeActivity`, `transportMode`, `duration`, `roomTemp`).
- Replace the generic toast with an inline confirmation card below the buttons that shows for ~4 seconds then fades:
  - Just right → "😊 Thanks! We'll remember this recommendation worked well."
  - Too cold → "🥶 Thanks! We'll make future recommendations slightly warmer."
  - Too warm → "🥵 Thanks! We'll make future recommendations slightly lighter."
- Disable buttons while the mutation is in flight; on error, keep current toast.error behavior.

## 3. No recommendation-logic changes
`src/lib/recommend.ts` is untouched. Personalization / auto-tuning is deferred; the schema is shaped to support it later (per-baby aggregates on `rating` × `feels_like_c` × `temperature_pref` × `activity`).

## 4. Future-ready (not implemented now)
- `feedback_details` jsonb leaves room for the "What felt too warm/cold?" follow-up (head/body/legs/feet/not_sure).
- All fields needed for analytics (accuracy %, failure temp bands, warmth-pref suggestions) are captured on every submission.

## Acceptance
- Every feedback tap writes a row with full context (verifiable via a quick DB read).
- Section reads "How was today's outfit?".
- Inline rating-specific confirmation appears then auto-dismisses.
- No visible change to recommendations.
