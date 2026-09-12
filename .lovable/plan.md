# Layerly: what I'd improve next

I went through the code and the live data. Three things stand out — one is a real gap between what the app promises and what it does.

## 1. Comfort feedback is collected but never used (highest value)

14 comfort ratings are stored, and the save prompt tells guests an account will "personalize future recommendations". But nothing in the recommendation code reads past feedback — I searched the whole engine and there is no personalization value anywhere. Today's suggestion for a baby who was rated "too cold" three times is identical to everyone else's.

Fix: turn stored ratings into a small per-baby warmth adjustment.

- Load that baby's recent ratings when the daily screen opens.
- Nudge the effective temperature used by the engine: consistent "too cold" makes it dress warmer, consistent "too warm" makes it dress lighter.
- Cap the adjustment (about 2.5 degrees either way) and only apply it after two or three consistent ratings, so one odd day cannot swing it.
- Show a short line on screen ("Adjusted slightly warmer based on your feedback") so it's visible, not magic.

## 2. Guests see a recommendation and then stop

Last 14 days: 78 people picked an age, 49 saw a recommendation — and zero rated it, zero tapped "create account". Every guest leaves at the result screen. Signed-in use is almost nil too: 1 daily-screen open in 14 days against 28 baby profiles.

Fix on the guest result screen:

- Make the comfort rating the obvious next step rather than a quiet row.
- Show what's missing from the plan in a concrete way and tie the account offer to keeping it.
- Bring back people who already signed up: nothing currently reminds them the app exists in the morning.

## 3. Smaller cleanups

- The daily screen is one 625-line file mixing weather, activity choices, the outfit result and feedback; splitting it makes future changes safer.
- The homepage and guest flow describe the app but never show a finished outfit — a sample result would sell it faster.
- Two iOS items still open from the roadmap: the real-iPhone Apple/Google sign-in walkthrough, and confirming the Apple client ID in the backend.

## Suggested order

1. Feedback-driven personalization (makes the product's core claim true).
2. Guest result screen conversion.
3. Re-engagement for existing accounts.
4. Code split and homepage sample.

## Technical notes

- New helper reads `feedback` rows per baby (last ~10, weighted recent-first) through an authenticated server function, returns an offset in degrees C.
- Offset is applied to `effectiveTempC` inputs in `src/lib/recommend.ts` / `recommend/temperature.ts`, not inside individual pickers, so all situations inherit it.
- Guests have no stored history, so the offset is zero for them — no change to `/try` behaviour.
- Unit tests alongside the existing `src/lib/recommend/__tests__` cover: no feedback, mixed feedback, and clamping at the cap.
