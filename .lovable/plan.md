## Current state

- `npx cap add ios` succeeded — `ios/App/App.xcworkspace` exists and Xcode is open.
- `npx cap sync ios` failed with `Could not find the web assets directory: ./web/dist` because the web submodule hasn't been built yet.
- Your `capacitor.config.ts` has `webDir: 'web/dist'`, so Capacitor expects a built bundle there.

## Fix — build the web submodule, then re-sync

Run from your iOS repo root (`~/Layerly-iOS-app`):

```bash
cd web
npm install
npm run build
cd ..
npx cap sync ios
```

After `npm run build` completes, `web/dist/index.html` will exist and `cap sync` will copy it into the iOS project.

## If `npm run build` fails inside `web/`

The Layerly web app is a TanStack Start SSR app. `npm run build` produces a server build, not a static `dist/` folder — so `web/dist` may not appear even after a successful build. If that happens, we have two options:

- **A. Switch to the live-site config** — copy `capacitor.config.ts` back to the production version (loads `https://www.layerly.online`), no `web/dist` needed. Simpler, but the app requires network on first load.
- **B. Add a static client-only build script** to the web repo that outputs to `web/dist` for Capacitor bundling. More work; needed only if you want true offline support.

## What I need from you

Run the four commands above and share the output. Based on whether `web/dist/index.html` gets created, I'll either confirm you're done or propose the exact change for option A or B.

No code changes needed from me right now — this is a local build step on your machine.
