## Problem

The `ios-app/` folder was added to `.gitignore` last turn. Lovable's file state is backed by git, so anything gitignored isn't tracked and effectively vanishes from the project — that's why you can't find it. Confirmed just now: `ls ios-app/` returns "No such file or directory", and `.gitignore` still contains `ios-app/`.

## Fix

Recreate the scaffold and keep it tracked in the web repo as a plain subfolder. You extract it manually into a new repo when you're ready — the two-repo split happens at push time, not in Lovable.

## Changes

1. **`.gitignore`** — remove the `ios-app/` entry (and its comment) so the folder is tracked.
2. **Recreate `ios-app/` scaffold** (same contents as before):
   - `ios-app/README.md` — setup guide: how to copy this folder into a new GitHub repo, add the web repo as a git submodule at `web/`, run `npx cap add ios`, open in Xcode.
   - `ios-app/package.json` — Capacitor 7.x core + CLI + iOS + plugins (`app`, `geolocation`, `preferences`, `splash-screen`, `status-bar`, `@capacitor-community/apple-sign-in`).
   - `ios-app/capacitor.config.ts` — production config: `appId: online.layerly.app`, `server.url: https://www.layerly.online`.
   - `ios-app/capacitor.config.local.ts` — local dev config: `webDir: web/dist`, no `server.url`.
   - `ios-app/.gitignore` — for the future standalone repo: ignore `node_modules/`, `ios/App/Pods/`, `ios/App/build/`, `web/dist/`, `web/node_modules/`.
   - `ios-app/web/README.md` — placeholder explaining that `web/` becomes a git submodule pointing at the Lovable-synced web repo.
   - `ios-app/.github/workflows/build-ios.yml` — CI stub: checkout with submodules, build web, `npx cap sync ios`, archive, TestFlight upload placeholder.

## What you do after

1. Download the codebase (or copy `ios-app/` out of the Lovable file tree).
2. Create a new empty GitHub repo, push the contents of `ios-app/` to it.
3. In that new repo: `git submodule add <web-repo-url> web`, then `cd ios-app && bun install && cd web && bun install && bun run build && cd .. && npx cap add ios`.
4. Open `ios/App/App.xcworkspace` in Xcode.

## Out of scope

No changes to the web app itself — the wrapper loads `https://www.layerly.online` and needs no web-side edits.
