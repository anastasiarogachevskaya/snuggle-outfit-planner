
## What's happening

Two separate issues in your terminal output:

1. **`npm error Missing script: "build"`** — Your `web/` folder currently only contains the placeholder `README.md` from the scaffold. The actual Layerly web repo was never added as a submodule, so there's no `package.json` with a `build` script inside `web/`.
2. **`ios platform has not been added yet`** — The Xcode project (`ios/` folder) doesn't exist in your local repo. It needs to be generated once with `npx cap add ios`.

## Fix (run from `~/Layerly-iOS-app`)

### Step 1 — Replace the placeholder `web/` with the real submodule

```bash
# remove the placeholder folder that shipped with the scaffold
rm -rf web

# add your Lovable-synced web repo as a submodule
git submodule add https://github.com/<your-username>/<your-web-repo>.git web
git submodule update --init --recursive
```

Replace `<your-username>/<your-web-repo>` with the GitHub repo Lovable syncs this project to. After this, `web/package.json` will exist and `npm run build` inside `web/` will work.

### Step 2 — Build the web bundle

```bash
cd web
npm install
npm run build
cd ..
```

### Step 3 — Switch to local config and add the iOS platform

```bash
cp capacitor.config.local.ts capacitor.config.ts
npx cap add ios
npx cap sync ios
npx cap open ios
```

`npx cap add ios` is the one-time step that creates `ios/App/App.xcodeproj`. After that, `sync` and `open` will work on every subsequent build.

## Alternative — skip the submodule entirely

If you only want the wrapper to load the live site at `https://www.layerly.online` (no offline bundle), you don't need the `web/` submodule at all. Just:

```bash
rm -rf web
# keep the default production capacitor.config.ts (do NOT copy the .local one)
npx cap add ios
npx cap sync ios
npx cap open ios
```

## What I need from you before continuing

Tell me which path you want:

- **A.** Bundled/offline builds → I'll update `ios-app/README.md` with the exact `git submodule add` command once you share your web repo's GitHub URL.
- **B.** Live-site-only wrapper → I'll simplify the scaffold: drop the `web/` folder and `capacitor.config.local.ts`, and clean up the README so this confusion doesn't happen again.
