# web/ — git submodule placeholder

This directory becomes a git submodule pointing at the Layerly web repo (the one Lovable syncs).

After extracting `ios-app/` into its own repo, delete this README and run:

```bash
git submodule add git@github.com:you/layerly-web.git web
git commit -m "Add web submodule"
```

To pull the latest web code later:

```bash
git submodule update --remote web
git add web && git commit -m "Bump web submodule"
```

The Capacitor config expects the built site at `web/dist`. Run `cd web && bun install && bun run build` before `npx cap sync ios`.
