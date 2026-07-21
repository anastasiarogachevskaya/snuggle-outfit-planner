## What the build output tells us

The web build succeeded, but it's a TanStack Start SSR build:
- Client assets → `web/.output/public/assets/*`
- SSR server (Nitro worker) → `web/.output/server/`
- **No standalone `index.html`** — the initial HTML is rendered at request time by the server worker.

There is no `web/dist/` because TanStack Start doesn't produce one. Even if we point Capacitor at `web/.output/public`, there's no `index.html` to load, and the client bundle expects the SSR server for the first render, hydration, and every `createServerFn` call (auth, Supabase auth token attachment, email routes, etc.).

## This means option A isn't viable as-is

True offline bundling would require converting the Layerly web app from SSR to a client-only SPA, or introducing a second build target that pre-renders every route to static HTML. Either is a significant refactor of the web app (auth flows, loaders, and email/webhook routes all assume the server side exists) and would degrade the web app's SEO and initial-load story.

## Recommendation: switch to option B (live-site wrapper)

The production `capacitor.config.ts` already points at `https://www.layerly.online`. Using it means:
- The iOS app loads the deployed web app over the network.
- All SSR, server functions, and auth callbacks keep working exactly as they do in Safari.
- Web deploys ship instantly to the iOS app with no App Store release.
- Downside: the app needs network on cold launch (no true offline mode).

Steps for you to run in `~/Layerly-iOS-app`:

```bash
# Your current capacitor.config.ts is already the .local (bundled) version
# because you copied it earlier. Restore the production config from git:
git checkout capacitor.config.ts

# Confirm it points at https://www.layerly.online and webDir is unused
cat capacitor.config.ts

# Re-sync (webDir is ignored when server.url is set, so no web/dist needed)
npx cap sync ios
npx cap open ios
```

If `git checkout capacitor.config.ts` doesn't restore it (e.g. the committed version was already the local one), I'll edit `ios-app/capacitor.config.ts` on the Lovable side so you can pull it fresh.

## If you want true offline later

That's a separate project: convert the web app to also emit a client-only SPA build (a second Vite config targeting static output, with loaders adapted or gated). Worth doing only if App Store review requires offline functionality or you want the app to work without connectivity. Not needed for a first TestFlight.

## What I need from you

Confirm you want to go with **option B (live-site wrapper)**. If yes, run the three commands above and share the result. If `git checkout` doesn't work, tell me and I'll refresh `ios-app/capacitor.config.ts` in this repo so you can copy it over.
