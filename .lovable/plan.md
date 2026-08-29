# LaunchScreen verification, guardrails, and test hooks

## What I can and cannot do

Three of the four items are doable here. The TestFlight cold-launch test is not: this environment has no macOS, no Xcode, no simulator, and no device, so a real TestFlight run has to be done by you. I'll give you an exact checklist for it instead.

## 1. Launch screen preview renders (small / standard / large)

Render the launch screen composition offscreen at three iPhone point sizes and save PNGs so branding and centering can be eyeballed:

- Small: iPhone SE (3rd gen) — 375 x 667
- Standard: iPhone 15 — 393 x 852
- Large: iPhone 15 Pro Max — 430 x 932

Each render reproduces the storyboard exactly: `#A8B894` fill, `LaunchLogo` at a fixed 160x160 box, `scaleAspectFit`, centered on both axes. Output goes to `/mnt/documents/` and is attached in chat.

Note: these are faithful reconstructions of the storyboard constraints, not Xcode screenshots — Interface Builder cannot run here.

## 2. Accessibility identifier on the logo

Add `accessibilityIdentifier = "LaunchLogo"` to the `UIImageView` in `LaunchScreen.storyboard` via the standard `<accessibility>` child element, keeping the image non-interactive. This makes it targetable from XCUITest and screenshot tooling.

## 3. CI guardrail for launch assets

New script `ios-app/scripts/check-launch-assets.mjs` that fails with a non-zero exit when any of these hold:

- `LaunchScreen.storyboard` references an image named `Splash` (or any name under a `Splash.imageset`)
- `Splash.imageset` reappears in the asset catalog
- `LaunchLogo.imageset/Contents.json` is missing, or any filename it declares (1x/2x/3x) is absent on disk
- the storyboard does not reference `LaunchLogo`
- the storyboard root view background is not `#A8B894`
- the logo image view is missing `accessibilityIdentifier="LaunchLogo"`

Wired in as:
- `check:launch-assets` script in `ios-app/package.json`
- a step in `ios-app/.github/workflows/build-ios.yml`, placed before `cap sync`, so a broken launch screen fails fast

## 4. TestFlight cold-launch checklist (for you to run)

1. Archive in Xcode, upload, install the build from TestFlight.
2. Force-quit the app, wait ~10s, then cold launch while screen-recording.
3. Step through the recording frame by frame and confirm: first frame is sage `#A8B894` with the white Layerly mark, no blue Capacitor logo at any point, and no white frame between launch screen and WebView.
4. Repeat once in airplane mode — the splash should fall back to auto-hide after 8s and reveal the WebView error state rather than hanging.

Report back what the recording shows and I'll adjust if anything flashes.

## Technical notes

- Files touched: `ios-app/ios/App/App/Base.lproj/LaunchScreen.storyboard` (accessibility identifier only), new `ios-app/scripts/check-launch-assets.mjs`, `ios-app/package.json`, `ios-app/.github/workflows/build-ios.yml`.
- No changes to app icon, auth, location, recommendation logic, routes, the website, or TestFlight configuration.
