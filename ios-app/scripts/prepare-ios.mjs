#!/usr/bin/env node
// Prepares everything Capacitor needs, without generating the native project.
//   1. installs root web deps if missing
//   2. builds the root Layerly web app
//   3. detects the generated static output directory (from the build manifest)
//   4. runs `cap sync ios` only when ios/ already exists
//   5. installs the Layerly AppIcon asset catalog into the native project
//   6. verifies the synced native config still points at the intended source
import { existsSync, mkdirSync, readdirSync, rmSync, copyFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { detectWebOutputDir, webRoot } from "./detect-web-output.mjs";


const here = path.dirname(fileURLToPath(import.meta.url));
const iosApp = path.resolve(here, "..");

function run(cmd, args, cwd) {
  console.log(`\n> ${cmd} ${args.join(" ")}  (${cwd})`);
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const pm = existsSync(path.join(webRoot, "bun.lock")) ? "bun" : "npm";

if (!existsSync(path.join(webRoot, "node_modules"))) {
  run(pm, ["install"], webRoot);
} else {
  console.log("Root web dependencies already installed — skipping install.");
}

run(pm, ["run", "build"], webRoot);

const clientDist = detectWebOutputDir();

if (!clientDist) {
  console.error("\n✖ Could not find the generated static web output.");
  console.error("  Looked at the build manifest (.output/nitro.json, dist/nitro.json)");
  console.error("  and the fallbacks .output/public, dist/client, dist.");
  console.error("  Run the root build manually and re-run `bun run prepare:ios`.");
  process.exit(1);
}
console.log(`\n✔ Web assets ready at ${clientDist}`);

// The Capacitor config files are plain static ESM (no runtime imports), so we
// read the declared values out of the source here instead of importing them.
const rootConfigPath = path.join(iosApp, "capacitor.config.ts");
const rootConfigSource = readFileSync(rootConfigPath, "utf8");
const configuredWebDir = rootConfigSource.match(/webDir:\s*'([^']+)'/)?.[1] ?? "";
const configuredServerUrl = rootConfigSource.match(/url:\s*'([^']+)'/)?.[1] ?? null;
const expectedWebDir = path.relative(iosApp, clientDist).split(path.sep).join("/");
if (configuredWebDir !== expectedWebDir) {
  console.error(
    `\n✖ capacitor.config.ts webDir is "${configuredWebDir}" but the build output is "${expectedWebDir}".` +
      `\n  Update webDir in capacitor.config.ts and capacitor.config.local.ts and re-run.`,
  );
  process.exit(1);
}

console.log(
  configuredServerUrl
    ? `\n✔ Layerly iOS source: ${configuredServerUrl} (live web app)`
    : "\n✔ Layerly iOS source: bundled (local static assets)",
);

// The synced native config is what the simulator/device actually obeys. If the
// server block is missing there, the WebView silently falls back to bundled
// assets — which for this SSR app means stale, non-hydrating (unclickable) HTML.
function verifySyncedConfig() {
  const nativeConfigPath = path.join(iosApp, "ios", "App", "App", "capacitor.config.json");
  if (!existsSync(nativeConfigPath)) {
    console.error("\n✖ ios/App/App/capacitor.config.json is missing after sync.");
    process.exit(1);
  }
  const native = JSON.parse(readFileSync(nativeConfigPath, "utf8"));
  const nativeUrl = native?.server?.url ?? null;
  if (configuredServerUrl !== nativeUrl) {
    console.error(
      `\n✖ Synced native config does not match capacitor.config.ts.` +
        `\n  expected server.url: ${configuredServerUrl ?? "(none, bundled mode)"}` +
        `\n  found in ios/App/App/capacitor.config.json: ${nativeUrl ?? "(none — the app will load bundled assets)"}` +
        `\n  Re-run \`npx cap sync ios\` from ios-app/ and make sure the correct config file is in place.`,
    );
    process.exit(1);
  }
  console.log(
    nativeUrl
      ? `✔ Native project confirmed to load ${nativeUrl}`
      : "✔ Native project confirmed to load bundled assets",
  );
}

function installAppIcons() {
  const source = path.join(iosApp, "resources", "AppIcon.appiconset");
  const target = path.join(iosApp, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
  if (!existsSync(source)) {
    console.warn("⚠ resources/AppIcon.appiconset missing — skipping icon install.");
    return;
  }
  // Wipe the Capacitor placeholder icon completely, then copy ours in.
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const file of readdirSync(source)) {
    copyFileSync(path.join(source, file), path.join(target, file));
  }
  console.log(`✔ Layerly AppIcon installed (${readdirSync(target).length} files) — no Capacitor placeholder left.`);
}

if (existsSync(path.join(iosApp, "ios"))) {
  run("npx", ["cap", "sync", "ios"], iosApp);
  verifySyncedConfig();
  installAppIcons();
  console.log("\n✔ Native iOS project synced. Next: bun run open:ios");

} else {
  console.log(
    [
      "",
      "ℹ No native iOS platform found (ios-app/ios is missing).",
      "  On a Mac with Xcode + CocoaPods installed, run:",
      "",
      "    cd ios-app && npx cap add ios",
      "    bun run sync:ios",
      "    bun run open:ios",
      "",
    ].join("\n"),
  );
}
