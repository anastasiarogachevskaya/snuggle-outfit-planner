# Point Capacitor at the real build output (`.output/public`)

The root build emits static web assets to `.output/public`, but the Capacitor configs still declare `../dist/client`, so `prepare:ios` stops with a webDir mismatch error before it can sync.

## Changes

### 1. `ios-app/capacitor.config.ts`
- `webDir: '../dist/client'` -> `webDir: '../.output/public'`
- Update the explanatory comment to name the correct directory.
- `server.url: 'https://layerly.online'` and everything else (plugins, iOS block, allowNavigation) stays exactly as-is.

### 2. `ios-app/capacitor.config.local.ts`
- Same `webDir` change; comment already mentions `../.output/public`, keep it consistent.
- No other keys touched.

### 3. `ios-app/README.md`
- Update the three places describing the web output location and the local-mode bundle path so the docs match reality.

### 4. `ios-app/scripts/prepare-ios.mjs`
- No functional change needed: it already detects the output from the Nitro manifest with `.output/public` first in the fallback list, and compares it against the declared `webDir`. Its error message legitimately lists `dist/client` as a *fallback candidate*, so that mention stays.

## Intentionally remaining `dist/client` references

- The fallback list in `scripts/detect-web-output.mjs` and the matching error text in `prepare-ios.mjs` — those are historical fallbacks for other build shapes, not a claim about the current output.

## Verification

- `bun run build` at the root, confirm `.output/public` exists.
- `cd ios-app && bun run prepare:ios` — expect: dependency check passes, root build runs, output detected at `.output/public`, no webDir mismatch. `cap sync ios` only runs if the native `ios/` folder exists locally (it is not committed here), so in this environment the script will end with the "run `npx cap add ios`" notice instead; the sync step is confirmed on your Mac.

## Out of scope

No changes to `server.url`, auth, routes, recommendation logic, native UI, splash, haptics, app icon, or the Vite/TanStack build config.
