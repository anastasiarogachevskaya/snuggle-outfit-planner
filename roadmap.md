# Layerly roadmap

## Done

- [x] Expand the blog for tablet and desktop with illustrated editorial preview cards
- [x] Local-first iPhone setup: baby details, location, wardrobe, and local profile
- [x] Polish local baby profile fields and add a confirmed local-profile reset
- [x] Google sign-in: re-enable the screen when the in-app browser is dismissed (iOS)
- [x] Auth email webhook builds lazily; LOVABLE_API_KEY resolves at runtime (webhook now returns 401 on unsigned test, not a crash)
- [x] Apple + Google providers confirmed enabled in Cloud auth

## Open

- [x] Administrator outfit feedback inbox and AI grouping into reviewable fixes; signed-in save, live AI review, saved results, resolution and phone layout verified

- [x] US: °F synced to account, US dates on blog, AAP sources, 30–60°F guides, US privacy note

- [x] US adaptation: country-neutral App Store link, familiar clothing wording, and 1°F room-temperature steps
- [x] Update baby-layering guide with cold-weather examples, Celsius/Fahrenheit, verified safety sources, and browser checks
- [x] Make temperature preference readable and include it in iPhone and web profile setup
- [x] Clarify clothing warmth and examples in setup, Profile wardrobe, and Layer up
- [x] Balance the two-column wardrobe setup cards and move longer guidance below the grid

- [x] T09 Outfits use only owned and available clothes (phone-kept, signed-in, checker, bottoms comparison, assistant)
- [x] T09A Availability controls follow the rollout switch; tips say "marked outgrown/temporarily unavailable" for set-aside items
- [x] T10 Shared outing context (movement, activity, ground, transport) carried through every recommendation path; outfits unchanged
- [x] T11 Shared clothing-needs model (roles, body coverage, separate transport) with exact compatibility adapters; outfits unchanged
- [x] T12 Toddler everyday tops follow clothing style and easy toilet access (gated)
- [x] T13 Thermal underlayers alongside everyday and outer bottoms (gated)
- [x] T13A Bottoms comparison follows the same wool-leggings eligibility as outfit selection
- [x] T14 Footwear selection for walking, active and mixed outdoor outings (gated)
- [x] T14A Owned footwear with unconfirmed or not-waterproof protection stays owned while its waterproofing gap stays visible
- [x] T15 Wearable rain protection (rain overall or jacket + rain pants) for toddler walking, active and mixed outings (gated)
- [x] T15A No rain shell stacked over warm outerwear (winter overall, jacket, rain / snow pants) while compatibility is unassessed; added shell warmth is unknown, not zero
- [x] T16 Walking clothing never lightened by a stroller/carrier offset on stated walking/active/mixed toddler outings; riding extras kept separate
- [x] T17 Toddler outing controls on Today (movement, transport incl. none, activity, ground); footwear, rain layers and open protection shown separately
- [x] T17A Availability edits verified through Wardrobe Details (phone + desktop); walk answers now kept for the session when leaving Today
- [x] T18 Duration presets and custom whole minutes, session retention, copy correction, tests and phone/desktop verification
- [x] T19 Exact full-outing forecast intervals, explicit coverage/gaps, Today + assistant integration; deterministic phone/desktop checks and full suites pass
- [ ] T19 Verification remainder: standalone explicit typecheck and production build (manual builds/typechecks unavailable in this managed environment; automatic preview checks pass)
- [ ] Walking/riding policy (not scheduled): whether a mixed outing's walking outfit is warm enough for sitting in an exposed stroller, or too warm when carried
- [ ] Before public toddler release: rain shells in the outfit check and Layer up, a policy for shell warmth and for layering a shell over warm outerwear, and a browser check once movement can be chosen on Today (T17)
- [ ] Rain policy (not scheduled): whether snowy ground needs waterproof legs, and whether a warm jacket or winter overall may be added just for rain
- [ ] Before public toddler release: footwear warmth rules, footwear in the outfit check, and footwear in Layer up (plus a browser check once movement can be chosen on Today)
- [ ] Footwear policy (not scheduled): when footwear must be insulated, and whether stated-waterproof shoes should beat unconfirmed rain boots
- [ ] Thermal activation (not scheduled): needs explicit "thermals needed" rules, validated thermal warmth values (current 0 is a placeholder), and Layer up thermal controls with end-to-end checks
- [ ] T28 Live signed-in browser check of Wardrobe Details and availability on Today (needs a dedicated test account)

## Open (needs the user)

- [ ] Real-iPhone TestFlight walkthrough of Continue with Apple / Continue with Google
- [ ] Confirm Apple native client ID `online.layerly.app` in Cloud → Users → Auth settings → Apple
- [ ] Create an **iOS** OAuth client in Google Cloud Console (bundle ID `online.layerly.app`)
      and replace the two `REPLACE_WITH_*` placeholders in
      `ios-app/capacitor.config.ts` + the reversed-client-ID URL scheme in
      `ios-app/ios/App/App/Info.plist`, then `bun run prepare:ios`
