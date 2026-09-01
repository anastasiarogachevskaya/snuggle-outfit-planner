#!/bin/sh
set -e

# Xcode Cloud checks out a fresh clone: ios-app/node_modules,
# ios-app/ios/App/Pods, ios-app/www, and the cap-sync-generated
# ios/App/App/{config.xml,public,capacitor.config.json} are all gitignored
# and don't exist yet, so the Xcode project has file references pointing at
# nothing. This installs just enough to regenerate them.
#
# Deliberately NOT running the full `prepare:ios`/web-build pipeline here:
# the app loads the live website at runtime (server.url in
# capacitor.config.ts), so it doesn't need a real local web build, and that
# build needs Supabase/Lovable secrets that aren't configured as Xcode Cloud
# environment variables. `cap sync ios` just needs *some* folder to copy as
# webDir — its contents are irrelevant in server.url mode — so a placeholder
# index.html is enough, and `cap sync` runs `pod install` itself.

export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

cd "$CI_PRIMARY_REPOSITORY_PATH/ios-app"
bun install

mkdir -p www
echo "<!doctype html><title>Layerly</title>" > www/index.html

bunx cap sync ios
