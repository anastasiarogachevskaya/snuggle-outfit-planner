# Fix unclickable iOS app and align it with the web app

## What I verified first

- The live site at `https://layerly.online` responds 200 and already serves the **current** landing page (same title "Layerly – Baby Outfit Recommendations Based on Weather" and the same "no account needed" CTA as `src/routes/index.tsx`). So production is not stale.
- There is **no HTML splash/loading overlay** anywhere in the app. The only full-screen fixed layers are the save-prompt sheet and shadcn dialog/sheet overlays, all of which only mount when opened.
- `PlatformDebugBadge` is already `pointer-events-none` and only renders when `VITE_SHOW_PLATFORM_DEBUG=true`.
- The native CSS blocks in `src/styles.css` (`.native-app`, `.native-ios`, `.keyboard-open`) contain **no** `pointer-events`, `touch-action`, `user-select`, `position: fixed` or `z-index` rules. `keyboard-open` only zeroes the bottom safe-area and hides `[data-native-bottom-bar]`.
- `SplashScreen.hide()` is called from `initNativeLifecycle()` in `src/lib/native-lifecycle.ts`, guarded by `isNativeApp()`.
- The generated `ios/` Xcode project is **not** in this repository (only `ios-app/` config and scripts), so I cannot read the effective `ios/App/App/capacitor.config.json` that the simulator actually uses.

So the CSS/overlay theories in the task are ruled out in the web code. The remaining and most likely cause is **what the simulator loads**, not the styling.

## Leading hypothesis (to be confirmed, not assumed)

`ios-app/capacitor.config.ts` sets `server.url = https://layerly.online` but also `webDir: '../dist/client'`. Layerly is server-rendered, so that directory has no usable `index.html`. If the synced `ios/App/App/capacitor.config.json` lost or never had the `server` block (e.g. synced once from the `.local` config, or synced before the server URL was added), the WebView falls back to bundled assets: an old or incomplete `index.html` with broken/missing JS. That produces exactly both symptoms — an **older-looking landing screen** and **nothing clickable**, because React never hydrates.

Step 1 of the work is to confirm this rather than act on it.

## Plan

### 1. Make the loaded source unambiguous and self-reporting
- Add a small `src/lib/build-info.ts` that exposes the runtime source (`window.location.origin` vs `capacitor://` / `file://` scheme) and a build id from a Vite-defined constant.
- Log once at startup in dev/native: `Layerly iOS source: https://layerly.online` or `Layerly iOS source: bundled`.
- This immediately answers Part 4 and Part 6 in the simulator console.

### 2. Confirm the blocked-tap cause
- With the indicator above, check in the simulator whether the WebView is on the remote origin or `capacitor://localhost`.
- If bundled: the cause is confirmed as stale/non-hydrating bundled assets, and the fix is the config work in step 3 — no CSS change needed.
- If remote: run an `elementFromPoint` probe over the CTA to identify the intercepting node before changing anything. No global `pointer-events: auto` workaround.

### 3. Single, unambiguous iOS source
- Make `ios-app/capacitor.config.ts` the only production config: keep `server.url = https://layerly.online`, and point `webDir` at a directory that always exists so `cap sync` is valid.
- Update `ios-app/scripts/prepare-ios.mjs` to fail loudly (not warn) when the synced `ios/App/App/capacitor.config.json` does not contain the expected `server.url`, so a silent fallback to bundled assets can never happen again.
- Document in `ios-app/README.md`: production = live web, local = explicit opt-in by copying `capacitor.config.local.ts`, and that local mode requires a prerendered build.

### 4. Dev-only build indicator (Part 7)
- Extend the existing `PlatformDebugBadge` (it already exists and is pointer-events-none) to show `iOS • production web • <build id>` or `iOS • bundled • <build id>`.
- Keep it behind `import.meta.env.DEV || VITE_SHOW_PLATFORM_DEBUG`, so it never ships in App Store / production builds.

### 5. Safety check on `keyboard-open`
- `resyncKeyboardState()` already clears the class on resume; add the same clear once at native startup so a class can never survive a cold launch.

### 6. Verification
- `bun run build`, `bun run prepare:ios`, and the existing test suite.
- Simulator pass over: Log in, Sign up, Forgot password, email/password fields and focus, password visibility toggle, primary CTA, footer links, and after login the Home / Walk / Car selector.

## Explicitly out of scope

No changes to recommendation logic, weather, wardrobe, database, landing design or copy, app icon, or haptics. No separate native landing/auth screens are created — iOS keeps rendering the same TanStack routes as the web.

## Deliverables reported at the end

Cause of blocked taps, the exact element/rule or config responsible, the fix, whether iOS loads `layerly.online` or bundled assets, why the screens differed, files changed, and simulator confirmation.
