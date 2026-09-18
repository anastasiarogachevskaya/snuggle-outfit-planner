# Layerly roadmap

## Done

- [x] Expand the blog for tablet and desktop with illustrated editorial preview cards
- [x] Local-first iPhone setup: baby details, location, wardrobe, and local profile
- [x] Polish local baby profile fields and add a confirmed local-profile reset
- [x] Google sign-in: re-enable the screen when the in-app browser is dismissed (iOS)
- [x] Auth email webhook builds lazily; LOVABLE_API_KEY resolves at runtime (webhook now returns 401 on unsigned test, not a crash)
- [x] Apple + Google providers confirmed enabled in Cloud auth

## Open (needs the user)

- [ ] Real-iPhone TestFlight walkthrough of Continue with Apple / Continue with Google
- [ ] Confirm Apple native client ID `online.layerly.app` in Cloud → Users → Auth settings → Apple
- [ ] Create an **iOS** OAuth client in Google Cloud Console (bundle ID `online.layerly.app`)
      and replace the two `REPLACE_WITH_*` placeholders in
      `ios-app/capacitor.config.ts` + the reversed-client-ID URL scheme in
      `ios-app/ios/App/App/Info.plist`, then `bun run prepare:ios`
