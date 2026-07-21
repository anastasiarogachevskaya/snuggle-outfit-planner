## What the logs actually say

The Xcode messages you pasted are **warnings, not errors** — the build succeeded:

- `WKProcessPool deprecated` — comes from Capacitor's Cordova compatibility layer. Harmless; will be fixed in a future Capacitor release. Ignore.
- `[CP] Embed Pods Frameworks / Copy XCFrameworks will run every build` — CocoaPods housekeeping warning. Harmless.

So the real problem is the **black screen at runtime**, not the build.

## Likely causes of the black screen (live-site wrapper)

In order of likelihood:

1. **`capacitor.config.ts` still points at `web/dist` (local mode)**, so the WebView has nothing to load. We need it back on the production config with `server.url = https://www.layerly.online`.
2. **App Transport Security / network** — simulator can't reach the live site (rare, but possible on a restricted network).
3. **JS runtime error on first paint** — the site loads but a client-side error blanks the screen. Only relevant once #1 is confirmed correct.

## Diagnosis plan (you run, share output)

From `~/Projects/Layerly-iOS-app`:

```bash
# 1. Confirm which config Capacitor is actually using
cat capacitor.config.ts
```

Expected: a `server: { url: 'https://www.layerly.online', cleartext: false }` block. If instead you see `webDir: 'web/dist'` and no `server.url`, that is the cause.

If it's wrong, restore the production config:

```bash
# Overwrite capacitor.config.ts with the production version tracked in the repo
git checkout -- capacitor.config.ts   # if it's committed
# OR, if git can't restore it, copy the production template that ships in this Lovable repo:
# (see ios-app/capacitor.config.ts in the web repo)

npx cap sync ios
# In Xcode: Product → Clean Build Folder, then Run again
```

## Inspect the WebView to see the real error

While the black screen is showing in the simulator, open **Safari on your Mac → Develop → Simulator → Layerly** (enable Develop menu in Safari > Settings > Advanced first). That gives you the WebView's console and network tab. Share:

- Any red console errors
- Whether `https://www.layerly.online` loaded (200) or failed
- The current URL shown in the WebView

## After diagnosis

- If it's config: fix as above.
- If it's a network/ATS issue: I'll add the right `NSAppTransportSecurity` exceptions to `Info.plist`.
- If it's a JS error on the live site inside the WebView: I'll fix it in the web app.

## What I need from you

1. Paste the output of `cat capacitor.config.ts`.
2. Paste any errors from Safari → Develop → Simulator → Layerly (console + failing network requests).

Once I see those, I'll issue the concrete fix.