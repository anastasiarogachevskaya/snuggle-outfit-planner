# Layerly iOS (Capacitor wrapper)

Capacitor wrapper for Layerly. It wraps the **existing web app in the repository root** — there is no second web app inside this folder.

## Structure

```
ios-app/
├── capacitor.config.ts             # Production: loads https://layerly.online
├── capacitor.config.local.ts       # Local bundled mode: bundles ios-app/www
├── tsconfig.json                   # CommonJS/node settings so the Capacitor CLI can read the TS config
├── package.json
├── scripts/detect-web-output.mjs   # Reads the build manifest to find static assets
├── scripts/prepare-ios.mjs         # build web + detect output + conditional cap sync
└── .github/workflows/build-ios.yml
```

Both config files are plain static ESM (`import type` + `export default`) with no
runtime imports, so the Capacitor CLI can transpile them without `exports is not
defined` errors. Keep them free of `require()`, `module.exports` and computed values.

The root `bun run build` uses TanStack Start + Nitro. The static client assets
currently land in `dist/client` (older Nitro versions emitted `.output/public`).
`bun run prepare:ios` reads the Nitro build manifest (`publicDir`, fallbacks
`.output/public`, `dist/client`, `dist`) and mirrors whatever it finds into
`ios-app/www`, the stable staging folder `webDir` points to. That way the config
never breaks when the build tool moves its output. Because Layerly is
server-rendered the output has **no `index.html`**, so the script also writes a
tiny bootstrap `www/index.html` that redirects the WebView to `server.url` — a
blank green launch screen (bundled fallback with nothing to render) is therefore
impossible. It **fails** if the output cannot be found, or if the synced
`ios/App/App/capacitor.config.json` does not match the `server.url` declared here.

For development builds, `prepare:ios` injects DEBUG-only WKWebView load
diagnostics into the generated `AppDelegate.swift`
(`scripts/install-navigation-diagnostics.mjs`). They are **observation only** —
public API (`CAPBridgeViewController` / `bridge.webView`), KVO on
`url` / `isLoading` / `estimatedProgress`, and one read-only
`evaluateJavaScript` probe. Capacitor's own `WKNavigationDelegate` is never
replaced, and no Capacitor-internal type is touched.

Xcode prints, all prefixed `[Layerly Diagnostics]`:

- `Layerly native start URL: …` (from `bridge.config.serverURL`)
- navigation started / loading began / navigation completed, with the actual
  WebView URL (query strings and fragments stripped, so no tokens are logged)
- `webView isHidden / alpha / frame / window` plus any visible native view
  stacked above the WebView
- `page state {readyState, href, textLength, childCount, bodyBackground,
  bodyVisibility, bodyOpacity, rootChildren}`

Read it like this:

| Console shows | Root cause |
| --- | --- |
| no `navigation completed`, JS/NSError reported | the URL never loaded (DNS/TLS/navigation policy) |
| completed but `textLength: 0` | HTML loaded, React never hydrated |
| completed, text present, but a view is stacked above / `isHidden` / `alpha 0` | a native or web layer is covering the page |

If nothing completes within five seconds, a DEBUG-only fallback screen shows the
reason. All of this is excluded from Release/App Store builds by `#if DEBUG`.

No `ios/` folder is committed — you generate it on a Mac.


## Which source does the app load?

There is exactly one answer at any time, and the app reports it itself.
In dev/native builds a small badge and a console line show it:

```
Layerly ios source: https://layerly.online (build f25075e)
```

or `... source: bundled ...` when running from bundled assets. If it says
`bundled` while `capacitor.config.ts` declares a `server.url`, the native project
is out of sync — re-run `bun run prepare:ios`, which now fails on that mismatch.




## Prerequisites (Mac)

- macOS with **Xcode** (App Store) and its command line tools: `xcode-select --install`
- **CocoaPods**: `sudo gem install cocoapods` (or `brew install cocoapods`)
- **Bun**: `curl -fsSL https://bun.sh/install | bash`
- An Apple Developer account for signing

`npx cap add ios` will fail without Xcode and CocoaPods installed.

## First local setup

```bash
cd ios-app
bun install
bun run build:web
npx cap add ios
bun run sync:ios
bun run open:ios
```

In Xcode: select the **App** target → Signing & Capabilities → set your Apple Developer Team and Bundle Identifier `online.layerly.app`. Add the **Sign in with Apple** capability.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run check:capacitor` | Validates that root + ios-app Capacitor packages share one major version |
| `bun run build:web` | Builds the root Layerly web app (static output detected from the build manifest) |
| `bun run sync:ios` | `cap sync ios` (requires `ios/` to exist) |
| `bun run open:ios` | Opens the Xcode workspace |
| `bun run prepare:ios` | Runs the Capacitor version check, installs root deps if needed, builds the web app, detects the static output from the build manifest, then runs `cap sync ios` only if `ios/` exists — otherwise prints the `npx cap add ios` instruction |

During the current navigation diagnostic, production `allowNavigation` is
intentionally limited to `layerly.online` and `*.layerly.online`. OAuth and
other external hosts therefore open outside the WebView instead of being
allowlisted as in-app navigation.


## Dependency rules & troubleshooting

**Capacitor majors must stay aligned.** The repository is pinned to **Capacitor 7** in both
the root `package.json` and `ios-app/package.json`. Never bump only one side to 8 — run
`bun run check:capacitor` (root or here) after any dependency change; it fails with a clear
message if `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, or a plugin drifts.

**Build error:**

```
pagePrerenderOptionsSchema.optional(...).prefault is not a function
```

This is **not** a TanStack bug. It means an incompatible Zod version was hoisted over the one
TanStack Start expects (`.prefault()` only exists on the newer Zod schema API). Fix it by
installing the committed `package.json` + `bun.lock` versions — Zod is an explicit root
dependency (`^3.25.76`) so resolution is deterministic. Do **not** randomly upgrade the
TanStack packages to work around it.

**Clean-install verification:**

```bash
rm -rf node_modules ios-app/node_modules
bun install
cd ios-app && bun install && cd ..
bun run build
bun run check:capacitor
```

This never requires deleting the native `ios/` directory.


## Two config modes

- **Default (`capacitor.config.ts`)** — loads the live site from `https://layerly.online`. Web deploys ship instantly; no App Store release needed for content changes. iOS renders the exact same TanStack routes/components as the website — there is **no separate native landing, login or onboarding screen**.
- **Local (`capacitor.config.local.ts`)** — bundles the staged static output (`ios-app/www`) into the app. Because Layerly is server-rendered, this mode requires a prerendered/static build to have an `index.html`; without one the WebView shows stale, non-hydrating markup (buttons appear but nothing is clickable). Use it only for deliberate offline experiments.

Switch by copying whichever config over `capacitor.config.ts` before `bun run sync:ios`. Never switch implicitly — `prepare:ios` verifies the synced native config matches.


## Deep links

The app registers the `layerly://` custom scheme. `@capacitor/app`'s `appUrlOpen` listener forwards incoming URLs to the web view so `/auth-callback` can consume tokens from magic links and OAuth redirects.

Universal Links for `https://www.layerly.online/auth-callback` also work once you host `apple-app-site-association` on the web domain.

## CI

`.github/workflows/build-ios.yml` is a stub: build the root web app, `npx cap add ios`, `cap sync ios`, archive, upload to TestFlight. Fill in the App Store Connect API key secrets before enabling.

## Location permission (required after `npx cap add ios`)

Layerly uses foreground location only, to look up local weather. The native project is not
committed here, so after generating it add this key to `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Layerly uses your location to check the local weather and recommend suitable clothing for your baby.</string>
```

Do **not** add `NSLocationAlwaysUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`,
or the `location` background mode — Layerly never tracks location in the background.

The permission prompt only appears when the user taps **Use my current location** on the baby
profile screen; nothing is requested at launch. `@capacitor/geolocation` is installed here and is
picked up automatically by `bun run sync:ios`.


## App icon

Master artwork: `ios-app/resources/AppIcon-master-1024.png` (1024x1024, opaque,
square, no rounded corners) — generated from the PWA icon `public/icon-512.png`,
so the website, PWA and iOS app all share one piece of artwork.

The Xcode asset catalog is committed at
`ios-app/resources/AppIcon.appiconset` (25 catalog entries / 19 PNGs covering
20, 29, 40, 50, 57, 58, 60, 72, 76, 80, 87, 100, 114, 120, 144, 152, 167, 180
and 1024 px for iPhone, iPad and the App Store marketing icon).

`bun run prepare:ios` copies it over
`ios/App/App/Assets.xcassets/AppIcon.appiconset` after `cap sync`, replacing the
Capacitor placeholder. To regenerate the sizes after changing the master (macOS
only, uses the built-in `sips`):

```bash
cd ios-app && bun run icons:ios
```

## Real-device location permission test (clean install)

Run this on a physical iPhone after every change to the location flow.

1. Delete Layerly from the iPhone (removes the stored permission decision).
2. Build and install again from Xcode (`bun run prepare:ios`, then `bun run open:ios`).
3. Open Layerly.
4. **Confirm there is NO location prompt at launch.** Layerly never asks on launch.
5. Tap **Use my current location** (guest flow at `/try`, or Baby profile).
6. Confirm iOS shows the native "Allow Layerly to use your location?" dialog.
7. Tap **Allow While Using App**.
8. Confirm the real location resolves and today's weather loads.

Then test denial:

1. Delete and reinstall again.
2. Tap **Use my current location**, then **Don't Allow**.
3. Confirm the message "Location access is off. Enable it in iPhone Settings or
   choose a location manually." appears with **Open Settings** and manual city
   search, and that tapping the button again does not re-prompt (iOS will not
   show the dialog a second time).
4. Enable location in iPhone Settings, return to the app, and confirm the denied
   state clears on resume.

### Diagnostics

In a debug build, or in any build after running
`localStorage.setItem("layerly:location-debug", "1")` from Safari Web Inspector,
tapping the button logs:

```
[location] Capacitor native: true
[location] Platform: ios
[location] Geolocation plugin registered: yes
[location] Permission before: {"location":"prompt","coarseLocation":"prompt"}
[location] requestPermissions called: yes
[location] Permission after: {"location":"granted","coarseLocation":"granted"}
[location] getCurrentPosition called: yes
[location] Location request succeeded
```

Coordinates are never logged.

### In-app Diagnostics screen

Open **`/diagnostics`** in the app (web or native). It shows, without any
console attached:

- runtime / Capacitor platform / native shell
- which geolocation path was used (native Capacitor plugin vs browser)
- whether the plugin registered with the bridge
- last `checkPermissions` result, whether `requestPermissions` was called, and
  the resulting permission state
- last `getCurrentPosition` outcome, final outcome and total duration
- a timestamped event log with per-step timings, plus **Copy log**

Every entry is also mirrored to the console, so Xcode shows the same trace.
Coordinates are never recorded or displayed.

### iOS location smoke test (Simulator)

```bash
node ios-app/scripts/ios-location-smoke-test.mjs --seconds 120
```

It streams the booted Simulator log and passes only when all of these appear
after you tap **Use my current location**: `getCurrentLocation entered`,
`force override applied`, `import @capacitor/geolocation`,
`Geolocation plugin registered: yes`, a native `checkPermissions` call, a native
`getCurrentPosition` call, and a final `outcome:` line.

### Manual smoke-test checklist (physical iPhone)

1. Delete the app, reinstall from Xcode, open Xcode's console (filter: `location`).
2. Launch the app — confirm **no** location prompt and no Geolocation logs at launch.
3. Open `/diagnostics`, tap **Run location test** (or tap **Use my current location**).
4. Xcode shows `To Native -> Geolocation checkPermissions` and, when undetermined,
   `To Native -> Geolocation requestPermissions`.
5. The iOS permission dialog appears; tap **Allow While Using App**.
6. Xcode shows `To Native -> Geolocation getCurrentPosition` and `outcome: success`.
7. `/diagnostics` shows path = native Capacitor plugin, plugin registered = true,
   and a non-empty duration.
8. Tap the button again with a location already saved — confirm a
   `force override applied` line and a fresh `getCurrentPosition` call
   (the saved location must never short-circuit the request).
9. Deny the permission on a clean install and confirm the outcome is
   `permission-denied` and the spinner clears.

