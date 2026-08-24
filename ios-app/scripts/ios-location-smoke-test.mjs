#!/usr/bin/env node
/**
 * iOS location smoke test.
 *
 * Streams the running Simulator/device log, waits for you to tap
 * "Use my current location" in the app, and asserts that the Capacitor
 * Geolocation bridge calls actually happen.
 *
 * Usage (macOS, with the app running in the iOS Simulator):
 *
 *   node ios-app/scripts/ios-location-smoke-test.mjs            # 90s window
 *   node ios-app/scripts/ios-location-smoke-test.mjs --seconds 180
 *
 * For a physical device, keep Xcode's console open instead and follow the
 * checklist in ios-app/README.md — `log stream` only attaches to the Simulator.
 */
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const seconds = Number(args[args.indexOf("--seconds") + 1]) || 90;

/** Each expectation is [id, matcher, description]. */
const EXPECTATIONS = [
  ["entry", /getCurrentLocation entered/i, "getCurrentLocation() called from the UI"],
  ["override", /force override applied/i, "forced live GPS request (cache ignored)"],
  ["import", /import @capacitor\/geolocation/i, "Geolocation plugin module imported"],
  ["registered", /Geolocation plugin registered: yes/i, "plugin registered with the bridge"],
  [
    "check",
    /To Native -> Geolocation checkPermissions|Geolocation\.checkPermissions\(\)/i,
    "checkPermissions reached native",
  ],
  [
    "position",
    /To Native -> Geolocation getCurrentPosition|Geolocation\.getCurrentPosition\(/i,
    "getCurrentPosition reached native",
  ],
  ["outcome", /outcome: (success|permission-|location-disabled|timeout|unavailable)/i, "flow settled with an outcome"],
];

const seen = new Set();

console.log(`Streaming iOS Simulator logs for ${seconds}s.`);
console.log('Now tap "Use my current location" in the app…\n');

const child = spawn(
  "xcrun",
  [
    "simctl",
    "spawn",
    "booted",
    "log",
    "stream",
    "--style",
    "compact",
    "--predicate",
    'eventMessage CONTAINS "location" OR eventMessage CONTAINS "Geolocation"',
  ],
  { stdio: ["ignore", "pipe", "inherit"] },
);

child.on("error", (err) => {
  console.error(`Could not start log stream: ${err.message}`);
  console.error("Run this on macOS with Xcode installed and a booted Simulator.");
  process.exit(2);
});

child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  for (const line of chunk.split("\n")) {
    if (!line.trim()) continue;
    for (const [id, matcher, description] of EXPECTATIONS) {
      if (!seen.has(id) && matcher.test(line)) {
        seen.add(id);
        console.log(`  ✓ ${description}`);
      }
    }
  }
  if (seen.size === EXPECTATIONS.length) finish();
});

const timer = setTimeout(finish, seconds * 1000);

let finished = false;
function finish() {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  child.kill();

  const missing = EXPECTATIONS.filter(([id]) => !seen.has(id));
  console.log("");
  if (missing.length === 0) {
    console.log("PASS — the native Capacitor Geolocation path was exercised end to end.");
    process.exit(0);
  }
  console.log("FAIL — these steps never appeared in the logs:");
  for (const [, , description] of missing) console.log(`  ✗ ${description}`);
  console.log("\nOpen /diagnostics in the app for the in-app event log.");
  process.exit(1);
}
