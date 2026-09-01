#!/bin/sh
set -e

# Xcode Cloud checks out a fresh clone of the repo: node_modules/ and Pods/
# are both gitignored (correctly — they're not source), so nothing here
# exists yet. This installs JS dependencies and runs CocoaPods before the
# archive step needs Pods-App.release.xcconfig.

export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

cd "$CI_PRIMARY_REPOSITORY_PATH"
bun install

cd ios-app
bun install
bun run prepare:ios
