#!/bin/sh
set -e

# Xcode Cloud checks out a fresh clone: ios-app/node_modules and
# ios-app/ios/App/Pods (both gitignored, correctly) don't exist yet, so the
# Xcode project's Pods-App.release.xcconfig reference has nothing to point
# at. This installs just enough to run `pod install`.
#
# Deliberately NOT running the full `prepare:ios`/web-build pipeline here:
# the app loads the live website at runtime (server.url in
# capacitor.config.ts), so it doesn't need a local web build, and that build
# needs Supabase/Lovable secrets that aren't configured as Xcode Cloud
# environment variables.

export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

cd "$CI_PRIMARY_REPOSITORY_PATH/ios-app"
bun install

cd ios/App
pod install
